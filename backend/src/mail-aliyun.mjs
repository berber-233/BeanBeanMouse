/* 国内邮件通道：阿里云邮件推送（DirectMail）HTTP API。
 *
 * 为什么走这条路：
 *   - Cloudflare 的 Email Sending 需要外币订阅，国内银行卡用不了；
 *   - 阿里云邮件推送用支付宝/对公账户即可开通，且是纯 HTTP API，
 *     不依赖 SMTP 端口，Workers / Pages Functions 里能直接调。
 * 需要配置（Cloudflare 环境变量 / Secret）：
 *   MAIL_TRANSPORT=aliyun
 *   ALIYUN_DM_ACCESS_KEY_ID / ALIYUN_DM_ACCESS_KEY_SECRET
 *   ALIYUN_DM_ACCOUNT     发信地址，例如 no-reply@beanbeanmouse.com
 *   ALIYUN_DM_FROM_ALIAS  发件人显示名（可选）
 *   ALIYUN_DM_REGION      默认 cn-hangzhou
 *
 * 签名算法为阿里云 RPC 风格 Signature V1（HMAC-SHA1），实现只依赖 WebCrypto，
 * 因此 Node 与 Workers 共用同一份代码。
 */

const API_VERSION = '2015-11-23';

/* 阿里云要求的 percentEncode：在 encodeURIComponent 基础上再处理 + * ~ */
export function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

export function canonicalQuery(params) {
  return Object.keys(params).sort().map(k => percentEncode(k) + '=' + percentEncode(params[k])).join('&');
}

export async function rpcSignature({ method = 'POST', params, accessKeySecret }) {
  const stringToSign = method.toUpperCase() + '&' + percentEncode('/') + '&' + percentEncode(canonicalQuery(params));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(accessKeySecret + '&'),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(stringToSign));
  /* base64 编码（Workers/Node 都有 btoa；Node 里就把它转成标准 base64） */
  let binary = '';
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function isAliyunMailConfigured(env = {}) {
  return !!(env.ALIYUN_DM_ACCESS_KEY_ID && env.ALIYUN_DM_ACCESS_KEY_SECRET && env.ALIYUN_DM_ACCOUNT);
}

/* 发一封信；返回 { ok, requestId }，失败抛错（错误里带阿里云的 Code/Message） */
export async function sendViaAliyun(env, { to, subject, body, html }) {
  if (!isAliyunMailConfigured(env)) {
    throw new Error('阿里云邮件推送未配置（需要 ALIYUN_DM_ACCESS_KEY_ID / SECRET / ACCOUNT）');
  }
  const region = env.ALIYUN_DM_REGION || 'cn-hangzhou';
  const params = {
    Action: 'SingleSendMail',
    Version: API_VERSION,
    Format: 'JSON',
    AccessKeyId: env.ALIYUN_DM_ACCESS_KEY_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    RegionId: region,
    AccountName: env.ALIYUN_DM_ACCOUNT,
    AddressType: '1',
    ReplyToAddress: 'false',
    ToAddress: to,
    Subject: subject || 'BeanBeanMouse',
    TextBody: body || (html ? String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '')
  };
  if (html) params.HtmlBody = html;
  if (env.ALIYUN_DM_FROM_ALIAS) params.FromAlias = env.ALIYUN_DM_FROM_ALIAS;
  if (env.ALIYUN_DM_REPLY_TO) {
    params.ReplyToAddress = 'true';
    params.ReplyTo = env.ALIYUN_DM_REPLY_TO;
  }

  params.Signature = await rpcSignature({ params, accessKeySecret: env.ALIYUN_DM_ACCESS_KEY_SECRET });

  /* 接入点：官方文档里既出现过 dm.aliyuncs.com，也有按区域的 dm.<region>.aliyuncs.com。
   * 不赌哪一个，按顺序试，连不上就换下一个（只对网络层失败重试，服务端返回的错误照实抛出）。 */
  const endpoints = env.ALIYUN_DM_ENDPOINT
    ? [env.ALIYUN_DM_ENDPOINT]
    : ['https://dm.aliyuncs.com/', 'https://dm.' + region + '.aliyuncs.com/'];
  let res = null;
  let lastErr = null;
  for (const url of endpoints) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: canonicalQuery(params)
      });
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      res = null;
    }
  }
  if (!res) {
    throw new Error('ALIYUN_DM_UNREACHABLE: 两个接入点都连不上（' + endpoints.join(' , ') + '）：' + (lastErr && lastErr.message));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.Code && data.Code !== 'OK')) {
    throw new Error('ALIYUN_DM_' + (data.Code || res.status) + ': ' + (data.Message || '发送失败') + aliasHint(data));
  }
  return { ok: true, requestId: data.RequestId || '' };
}

/* 把阿里云的错误码翻译成"下一步该干什么"：这些坑我们踩过一次就别再翻文档了 */
function aliasHint(data) {
  const code = String((data && data.Code) || '');
  const msg = String((data && data.Message) || '');
  const rid = data && data.RequestId ? '（RequestId ' + data.RequestId + '）' : '';
  if (code === 'Forbidden' || /not authorized/i.test(msg)) {
    return ' → 这是 RAM 权限问题：请在阿里云"访问控制 RAM"里给这个子账号挂上 AliyunDirectMailFullAccess（或 dm:* 策略）后重试' + rid;
  }
  if (/not verified|unverified|domain/i.test(msg + code)) {
    return ' → 发信域名或发信地址还没验证通过：回到"邮件推送控制台 → 发信域名"确认已显示"已验证"' + rid;
  }
  if (/InvalidMailAddress|AccountName/i.test(msg + code)) {
    return ' → 发信地址写错或未创建：应为 no-reply@<已验证的发信域名>' + rid;
  }
  if (/Throttl|limit|quota/i.test(msg + code)) {
    return ' → 触发限流或额度用尽（免费 2000 封、每天最多 200 封）' + rid;
  }
  return rid;
}
