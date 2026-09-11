/* 邮件发送 Worker：持有 Cloudflare Email Service 的 send_email 绑定，
 * 供 Pages Functions 通过 service binding 调用。
 *
 * 只做一件事：校验入参 → 调 env.EMAIL.send()。发送域名白名单在 wrangler.jsonc 里配置，
 * 避免这个内网服务被当作任意发信跳板。 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ ok: false, code: 'INVALID_JSON', message: '请求体不是合法 JSON' }, 400);
    }

    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.text || '');
    const html = String(body.html || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return json({ ok: false, code: 'E_VALIDATION_ERROR', message: '收件地址不合法' }, 400);
    }
    if (!subject) {
      return json({ ok: false, code: 'E_FIELD_MISSING', message: 'subject 必填' }, 400);
    }
    if (!text && !html) {
      return json({ ok: false, code: 'E_FIELD_MISSING', message: 'text 或 html 至少提供一个' }, 400);
    }

    const fromEmail = env.MAIL_FROM || 'no-reply@beanbeanmouse.com';
    const allowed = String(env.ALLOWED_FROM_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length && !allowed.some(d => fromEmail.endsWith('@' + d))) {
      return json({ ok: false, code: 'E_SENDER_NOT_VERIFIED', message: '发件域名不在白名单：' + fromEmail }, 400);
    }

    try {
      const res = await env.EMAIL.send({
        to,
        from: { email: fromEmail, name: env.MAIL_FROM_NAME || 'BeanBeanMouse' },
        subject,
        text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        html: html || undefined
      });
      return json({ ok: true, messageId: res && res.messageId });
    } catch (e) {
      /* 绑定抛出的错误带 .code（E_* 系列），原样回传给调用方便于排障 */
      return json({ ok: false, code: (e && e.code) || 'E_INTERNAL_SERVER_ERROR', message: (e && e.message) || String(e) }, 502);
    }
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
