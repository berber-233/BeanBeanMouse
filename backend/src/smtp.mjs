/* 零依赖 SMTP 客户端：EHLO -> STARTTLS(可选) -> AUTH PLAIN -> MAIL/RCPT/DATA -> QUIT */
import { connect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

export function sendSmtp({ host, port = 587, user, pass, from, to, subject, body, secure = false, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    let socket = null;
    let buffer = '';
    let stage = 'greet';
    let tlsDone = false;
    const timer = setTimeout(() => fail(new Error('SMTP 连接超时')), timeoutMs);

    function fail(err) {
      clearTimeout(timer);
      try { socket && socket.destroy(); } catch (e) { /* ignore */ }
      reject(err);
    }
    function done() {
      clearTimeout(timer);
      try { socket.end(); } catch (e) { /* ignore */ }
      resolve({ ok: true });
    }

    function lineHandler(line) {
      const code = parseInt(line.slice(0, 3), 10);
      if (!code) return fail(new Error('SMTP 响应异常: ' + line));
      if (stage === 'greet') {
        if (code !== 220) return fail(new Error('SMTP 220 失败: ' + line));
        stage = 'ehlo';
        socket.write('EHLO beanbeandragon.local\r\n');
      } else if (stage === 'ehlo') {
        if (code === 250) {
          if (line[3] === '-') return; // 多行 250 续行，等待最后一行
          const upper = line.toUpperCase();
          if (!tlsDone && !secure && upper.includes('STARTTLS')) {
            stage = 'starttls';
            socket.write('STARTTLS\r\n');
            return;
          }
          stage = user ? 'auth' : 'from';
          if (stage === 'auth') socket.write('AUTH PLAIN ' + b64('\0' + user + '\0' + pass) + '\r\n');
          else socket.write('MAIL FROM:<' + from + '>\r\n');
        } else {
          return fail(new Error('SMTP EHLO 失败: ' + line));
        }
      } else if (stage === 'starttls') {
        if (code !== 220) return fail(new Error('SMTP STARTTLS 失败: ' + line));
        tlsDone = true;
        socket.removeAllListeners('data');
        socket = tlsConnect({ socket, servername: host });
        socket.on('error', fail);
        socket.on('data', onData);
        stage = 'ehlo';
        buffer = '';
        socket.write('EHLO beanbeandragon.local\r\n');
      } else if (stage === 'auth') {
        if (code !== 235) return fail(new Error('SMTP AUTH 失败: ' + line));
        stage = 'from';
        socket.write('MAIL FROM:<' + from + '>\r\n');
      } else if (stage === 'from') {
        if (code !== 250) return fail(new Error('SMTP MAIL FROM 失败: ' + line));
        stage = 'rcpt';
        socket.write('RCPT TO:<' + to + '>\r\n');
      } else if (stage === 'rcpt') {
        if (code !== 250) return fail(new Error('SMTP RCPT TO 失败: ' + line));
        stage = 'data';
        socket.write('DATA\r\n');
      } else if (stage === 'data') {
        if (code !== 354) return fail(new Error('SMTP DATA 失败: ' + line));
        stage = 'dot';
        const msg = 'From: <' + from + '>\r\n'
          + 'To: <' + to + '>\r\n'
          + 'Subject: ' + subject + '\r\n'
          + 'MIME-Version: 1.0\r\n'
          + 'Content-Type: text/plain; charset=utf-8\r\n'
          + 'Content-Transfer-Encoding: 8bit\r\n\r\n'
          + body + '\r\n.\r\n';
        socket.write(msg);
      } else if (stage === 'dot') {
        if (code !== 250) return fail(new Error('SMTP DATA 结束失败: ' + line));
        stage = 'quit';
        socket.write('QUIT\r\n');
      } else if (stage === 'quit') {
        done();
      }
    }

    function onData(chunk) {
      buffer += chunk.toString('utf8');
      for (;;) {
        const idx = buffer.indexOf('\r\n');
        if (idx === -1) break;
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        lineHandler(line);
      }
    }

    socket = secure ? tlsConnect({ host, port }) : connect({ host, port });
    socket.on('error', fail);
    socket.on('data', onData);
  });
}
