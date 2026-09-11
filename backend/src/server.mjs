/* Node 入口：把 node:http 的请求适配成 app.mjs 的 handle() 约定。
 *
 * 路由与业务逻辑都在 app.mjs（与 Cloudflare Pages Functions 共用同一份代码），
 * 这里只负责：加载 .env、注入 node:sqlite / 本地磁盘 / SMTP 三套平台实现、
 * 收集请求体、以及保留原来的 /ws WebSocket 升级（Workers 侧后续用 Durable Objects）。
 */
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import './env.mjs';
import { all, get, run } from './db.mjs';
import { setStore } from './store.mjs';
import { createApp } from './app.mjs';
import { configureStorage, setStorageImpl } from './storage.mjs';
import { makeNodeStorage } from './storage-node.mjs';
import { configureMailer } from './mailer.mjs';
import { sendSmtp } from './smtp.mjs';
import { handleWsUpgrade, wsBroadcast } from './ws.mjs';

/* ---- 平台实现注入 ---- */
setStore({ get, run, all });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
configureStorage({ maxFileSize: process.env.MAX_FILE_SIZE, uploadDir });
setStorageImpl(makeNodeStorage(uploadDir));

const MAIL_TRANSPORT = process.env.MAIL_TRANSPORT || 'mock';
configureMailer({
  name: MAIL_TRANSPORT,
  custom: MAIL_TRANSPORT === 'smtp'
    ? async ({ to, subject, body }) => {
        const host = process.env.SMTP_HOST;
        if (!host) throw new Error('SMTP_HOST 未配置');
        await sendSmtp({
          host,
          port: Number(process.env.SMTP_PORT || 587),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          secure: process.env.SMTP_SECURE === '1',
          from: process.env.MAIL_FROM || 'no-reply@beanbeanmouse.local',
          to, subject, body
        });
      }
    : undefined
});

const app = createApp({ env: { ...process.env }, deps: { wsBroadcast } });

/* ---- 请求适配：把原始体预置给 app 读取 ---- */
function collect(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      chunks.push(c);
      size += c.length;
      if (size > MAX_UPLOAD * 2) { req.destroy(); reject(new Error('BODY_TOO_LARGE')); }
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const MAX_UPLOAD = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);

export function startServer(port = Number(process.env.PORT || 8787)) {
  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://localhost');
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const buf = await collect(req);
        req.__rawBuf = buf;
        req.__rawText = buf.toString('utf8');
      } else {
        req.__rawBuf = Buffer.alloc(0);
        req.__rawText = '';
      }
      await app.handle({
        method: req.method,
        pathname: u.pathname,
        query: u.searchParams,
        req,
        res
      });
    } catch (e) {
      if (e && e.message === 'BODY_TOO_LARGE') {
        if (!res.headersSent) res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'FILE_TOO_LARGE', message: '请求体过大' }));
      }
      console.error(e);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'INTERNAL', message: '服务器内部错误' }));
    }
  });

  /* WebSocket 升级（Node 专用；Workers 侧后续用 Durable Objects 实现） */
  server.on('upgrade', (req, socket, head) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/ws') handleWsUpgrade(req, socket, head).catch(() => socket.destroy());
    else socket.destroy();
  });

  return new Promise(resolve => {
    server.listen(port, () => {
      startNewsAutoRefresh();
      resolve(server);
    });
  });
}

/* 资讯 RSS 定时刷新只在 Node 长期进程里跑；Workers 侧改用 Cron Triggers */
function startNewsAutoRefresh() {
  const enabled = process.env.NODE_ENV !== 'test' && String(process.env.NEWS_AUTO_REFRESH || '1') !== '0';
  if (!enabled) return;
  const interval = Math.max(60 * 1000, Number(process.env.NEWS_AUTO_REFRESH_MS) || 6 * 3600 * 1000);
  const t = setInterval(async () => {
    try {
      const r = await app.refreshNewsFeeds(null);
      console.log('[news.auto] added=' + r.added + ' failed=' + r.failed);
    } catch (e) {
      console.error('[news.auto] ' + e.message);
    }
  }, interval);
  if (t.unref) t.unref();
}

/* 直接运行时启动 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer();
  console.log('BeanBeanMouse API 已启动: http://127.0.0.1:' + server.address().port);
}
