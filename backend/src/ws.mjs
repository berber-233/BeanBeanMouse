/* 极简 WebSocket 服务端（RFC6455）：握手 + 帧编解码 + 会话广播
 * 无需第三方依赖；生产环境建议替换为成熟库（ws/Socket.IO） */
import { createHash, randomUUID } from 'node:crypto';
import { get, run } from './db.mjs';
import { verifyToken } from './auth.mjs';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Map(); // socket -> { userId, conversationId }

function acceptKey(key) {
  return createHash('sha1').update(key + WS_GUID).digest('base64');
}

function encodeFrame(opcode, payload) {
  const buf = Buffer.from(payload);
  const len = buf.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.from([0x80 | opcode, 126, (len >> 8) & 0xff, len & 0xff]);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, buf]);
}

function decodeClientFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < 4) return null;
    len = buf.readUInt16BE(2);
    off = 4;
  } else if (len === 127) {
    if (buf.length < 10) return null;
    len = Number(buf.readBigUInt64BE(2));
    off = 10;
  }
  const masked = (buf[1] & 0x80) !== 0;
  if (masked) {
    if (buf.length < off + 4 + len) return null;
    const mask = buf.slice(off, off + 4);
    const payload = Buffer.alloc(len);
    for (let i = 0; i < len; i++) payload[i] = buf[off + 4 + i] ^ mask[i % 4];
    return { opcode, payload, consumed: off + 4 + len };
  }
  if (buf.length < off + len) return null;
  return { opcode, payload: buf.slice(off, off + len), consumed: off + len };
}

export function handleWsUpgrade(req, socket, head) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const token = new URL(req.url, 'http://x').searchParams.get('token') || '';
  const payload = verifyToken(token);
  if (!payload || !payload.uid) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + acceptKey(key) + '\r\n\r\n'
  );

  let buffer = Buffer.alloc(0);
  const meta = { userId: payload.uid, conversationId: '' };
  clients.set(socket, meta);

  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const frame = decodeClientFrame(buffer);
      if (!frame) break;
      buffer = buffer.slice(frame.consumed);
      handleFrame(socket, meta, frame);
    }
  });
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
}

function handleFrame(socket, meta, frame) {
  if (frame.opcode === 0x8) { clients.delete(socket); socket.end(); return; }
  if (frame.opcode === 0x9) { socket.write(encodeFrame(0xA, Buffer.alloc(0))); return; }
  if (frame.opcode !== 0x1) return;
  let msg;
  try { msg = JSON.parse(frame.payload.toString('utf8')); } catch (e) { return; }
  if (msg.type === 'join' && msg.conversationId) {
    meta.conversationId = String(msg.conversationId);
    return;
  }
  if (msg.type === 'message' && msg.conversationId && msg.text) {
    const convId = String(msg.conversationId);
    if (!get('SELECT id FROM conversations WHERE id = ?', convId)) {
      run('INSERT INTO conversations (id, buyer_id, seller_id, created_at) VALUES (?,?,?,?)', convId, meta.userId, meta.userId, Date.now());
    }
    const id = randomUUID();
    run(
      'INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?,?,?,?,?)',
      id, convId, meta.userId, String(msg.text), Date.now()
    );
    const out = JSON.stringify({ type: 'message', id, conversationId: convId, senderId: meta.userId, text: String(msg.text), createdAt: Date.now() });
    for (const [s, m] of clients) {
      if (s !== socket && m.conversationId === convId) {
        s.write(encodeFrame(0x1, out));
      }
    }
    socket.write(encodeFrame(0x1, out)); // 回执给发送者
  }
}
