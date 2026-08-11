/* WebSocket 消息测试：连接 /ws -> 加入会话 -> 发送消息 -> 广播回执 + REST 持久化校验 */
process.env.DB_PATH = ':memory:';

const { startServer } = await import('../src/server.mjs');
const server = await startServer(0);
const port = server.address().port;
const base = 'http://127.0.0.1:' + port;
const wsBase = 'ws://127.0.0.1:' + port;

const results = [];
const check = (name, ok) => results.push([name, !!ok]);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const loginRes = await fetch(base + '/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'seller@demo.com', password: 'seller123' })
});
const { token } = await loginRes.json();
check('login for ws test', !!token);

/* 未授权握手应被拒绝 */
{
  const bad = new WebSocket(wsBase + '/ws');
  let rejected = false;
  await new Promise(resolve => {
    bad.onerror = () => { rejected = true; resolve(); };
    bad.onopen = () => resolve();
    setTimeout(resolve, 1500);
  });
  check('ws rejects unauthenticated', rejected === true);
  try { bad.close(); } catch (e) { /* ignore */ }
}

/* 正常握手 + 消息广播 + 持久化 */
{
  const ws = new WebSocket(wsBase + '/ws?token=' + token);
  const received = [];
  ws.onmessage = e => received.push(JSON.parse(e.data));
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  check('ws handshake ok', ws.readyState === WebSocket.OPEN);

  ws.send(JSON.stringify({ type: 'join', conversationId: 'conv-test' }));
  ws.send(JSON.stringify({ type: 'message', conversationId: 'conv-test', text: 'hello via ws' }));

  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && !received.some(m => m.type === 'message')) await sleep(50);
  const got = received.find(m => m.type === 'message');
  check('ws broadcast received', !!got && got.text === 'hello via ws' && got.conversationId === 'conv-test');

  const msgs = await fetch(base + '/conversations/conv-test/messages', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => r.json());
  check('ws message persisted via REST', msgs.some(m => m.content === 'hello via ws'));
  ws.close();
}

console.log(results.map(([n, ok]) => (ok ? 'PASS' : 'FAIL') + ' | ' + n).join('\n'));
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed === 0 ? 'ALL WS TESTS PASSED' : failed + ' CHECKS FAILED');

server.close();
process.exit(failed === 0 ? 0 : 1);
