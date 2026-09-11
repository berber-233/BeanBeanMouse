/* Cloudflare Pages Functions 入口：/api/* → 与 Node 后端共用的 app.mjs
 *
 * 同一份路由/业务逻辑跑在两个平台：
 *   Node    → backend/src/server.mjs（node:http + node:sqlite + 本地磁盘）
 *   Workers → 本文件（Fetch API + D1 + R2）
 * 差异只在注入的适配器，业务代码零分叉。
 */
import { createApp } from '../../backend/src/app.mjs';
import { setStore } from '../../backend/src/store.mjs';
import { makeD1Store } from '../../backend/src/db-d1.mjs';
import { configureStorage, setStorageImpl } from '../../backend/src/storage.mjs';
import { makeR2Storage, makeDisabledStorage } from '../../backend/src/storage-r2.mjs';
import { configureMailer } from '../../backend/src/mailer.mjs';

/* 同一个 isolate 内 env 是稳定的，应用实例只建一次 */
let appPromise = null;

function getApp(env) {
  if (!appPromise) {
    appPromise = Promise.resolve().then(() => {
      if (env.DB) setStore(makeD1Store(env.DB));
      configureStorage({ maxFileSize: env.MAX_FILE_SIZE });
      setStorageImpl(env.FILES ? makeR2Storage(env.FILES) : makeDisabledStorage());
      configureMailer({ name: env.MAIL_TRANSPORT || 'mock', custom: mailTransport(env) });
      return createApp({ env, deps: {} });
    });
  }
  return appPromise;
}

/* 邮件：Workers 里不跑 SMTP。优先用 Cloudflare Email Service 的 send_email 绑定
 * （需要先给域名开通 Email Sending，见 docs/deploy-backend.md），
 * 也可退回自建 HTTP 邮件服务（MAIL_TRANSPORT=http）。 */
function mailTransport(env) {
  const mode = env.MAIL_TRANSPORT || 'mock';
  const from = { email: env.MAIL_FROM || 'no-reply@beanbeanmouse.com', name: '豆豆鼠 BeanBeanMouse' };

  /* service：调用 workers/mailer（它持有 Pages 不支持的 send_email 绑定） */
  if (mode === 'service') {
    return async ({ to, subject, body, html }) => {
      if (!env.MAILER || typeof env.MAILER.fetch !== 'function') {
        throw new Error('MAILER service binding 不可用（需先 deploy workers/mailer）');
      }
      const r = await env.MAILER.fetch('https://mailer/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text: body || '', html: html || '' })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error((j.code || 'MAIL_FAILED') + ': ' + (j.message || r.status));
    };
  }

  if (mode === 'http') {
    return async ({ to, subject, body, html }) => {
      if (!env.MAIL_API_URL || !env.MAIL_API_KEY) throw new Error('MAIL_API_URL / MAIL_API_KEY 未配置');
      const r = await fetch(env.MAIL_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.MAIL_API_KEY },
        body: JSON.stringify({ from: from.email, to, subject, text: body, html })
      });
      if (!r.ok) throw new Error('MAIL_HTTP_' + r.status);
    };
  }

  return undefined;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const app = await getApp(env);

  const url = new URL(request.url);
  const segs = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);

  const headers = {};
  for (const [k, v] of request.headers) headers[k.toLowerCase()] = v;

  /* 请求体只读一次，两种读取方式共用同一份缓存 */
  let bodyPromise = null;
  const bodyBuffer = () => (bodyPromise || (bodyPromise = request.arrayBuffer().then(b => new Uint8Array(b))));

  const req = {
    method: request.method,
    headers,
    socket: {
      remoteAddress: request.headers.get('CF-Connecting-IP')
        || (headers['x-forwarded-for'] || '').split(',')[0].trim()
        || 'unknown'
    },
    arrayBuffer: bodyBuffer,
    text: () => bodyBuffer().then(b => new TextDecoder().decode(b))
  };

  /* 响应适配：app 通过 writeHead/end 写响应，这里转成标准 Response */
  const res = {
    status: 200,
    headers: {},
    body: '',
    headersSent: false,
    writeHead(status, extra) {
      this.status = status;
      if (extra) for (const [k, v] of Object.entries(extra)) this.headers[k] = String(v);
      this.headersSent = true;
    },
    end(body) {
      if (body !== undefined) this.body = body;
      this.headersSent = true;
    }
  };

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  await app.handle({
    method: request.method,
    pathname: '/' + segs.join('/'),
    query: url.searchParams,
    req: hasBody ? req : { ...req, text: async () => '', arrayBuffer: async () => new Uint8Array(0) },
    res
  });

  const out = res.body;
  if (out instanceof Uint8Array || out instanceof ArrayBuffer) {
    return new Response(out, { status: res.status, headers: res.headers });
  }
  return new Response(typeof out === 'string' ? out : String(out || ''), {
    status: res.status,
    headers: res.headers
  });
}
