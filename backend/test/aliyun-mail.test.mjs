/* 阿里云邮件推送通道测试：
 *  1) 签名实现与"按官方文档独立写一遍"的参考实现逐字节一致；
 *  2) 请求体参数齐全、能正确抛出发送失败。不联网。 */
import crypto from 'node:crypto';
import { percentEncode, canonicalQuery, rpcSignature, isAliyunMailConfigured, sendViaAliyun } from '../src/mail-aliyun.mjs';

const results = [];
const check = (name, ok, extra) => results.push([name, !!ok, extra || '']);

/* 参考实现：node:crypto + 文档里的 percentEncode 规则 */
function referenceSignature(params, secret, method = 'POST') {
  const enc = s => encodeURIComponent(String(s)).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const cqs = Object.keys(params).sort().map(k => enc(k) + '=' + enc(params[k])).join('&');
  const stringToSign = method + '&' + enc('/') + '&' + enc(cqs);
  return crypto.createHmac('sha1', secret + '&').update(stringToSign).digest('base64');
}

const params = {
  Action: 'SingleSendMail',
  Version: '2015-11-23',
  Format: 'JSON',
  AccessKeyId: 'test-key-id',
  SignatureMethod: 'HMAC-SHA1',
  SignatureVersion: '1.0',
  SignatureNonce: 'fixed-nonce-123',
  Timestamp: '2026-09-27T00:00:00Z',
  AccountName: 'no-reply@beanbeanmouse.com',
  AddressType: '1',
  ReplyToAddress: 'false',
  ToAddress: 'buyer@example.cn',
  Subject: '豆豆鼠 测试邮件',
  TextBody: 'hello & welcome ~ test*'
};
const secret = 'test-secret';

check('percentEncode：空格→%20、*→%2A、~ 保留', percentEncode('a b') === 'a%20b' && percentEncode('a*b~c') === 'a%2Ab~c');
check('percentEncode：加号按字面转义', percentEncode('a+b') === 'a%2Bb');
/* 真实邮件模板里有 <!doctype> 和 'Segoe UI'，这四个字符不编码就会签名不匹配 */
check('percentEncode：! \' ( ) 必须编码', percentEncode('a!b') === 'a%21b' && percentEncode("a'b") === 'a%27b'
  && percentEncode('a(b)') === 'a%28b%29');
check('percentEncode：一段 HTML 片段', percentEncode('<!doctype html>') === '%3C%21doctype%20html%3E');
check('canonicalQuery 按 key 排序', canonicalQuery({ b: '2', a: '1' }) === 'a=1&b=2');

const sig = await rpcSignature({ params, accessKeySecret: secret });
check('签名与参考实现一致', sig === referenceSignature(params, secret), sig);

check('未配置时判定为未就绪', isAliyunMailConfigured({}) === false);
check('三项凭据齐全时判定为就绪', isAliyunMailConfigured({ ALIYUN_DM_ACCESS_KEY_ID: 'a', ALIYUN_DM_ACCESS_KEY_SECRET: 'b', ALIYUN_DM_ACCOUNT: 'c' }) === true);

/* 用假 fetch 验证请求体与失败处理 */
const realFetch = globalThis.fetch;
let captured = null;
globalThis.fetch = async (url, init) => {
  captured = { url, init };
  return new Response(JSON.stringify({ RequestId: 'req-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const okSend = await sendViaAliyun(
  { ALIYUN_DM_ACCESS_KEY_ID: 'id', ALIYUN_DM_ACCESS_KEY_SECRET: 'sec', ALIYUN_DM_ACCOUNT: 'no-reply@beanbeanmouse.com', ALIYUN_DM_REGION: 'cn-hangzhou' },
  { to: 'buyer@example.cn', subject: '主题', body: '正文' }
);
const bodyParams = new URLSearchParams(captured.init.body);
check('默认用官方主接入点 dm.aliyuncs.com', captured.url.indexOf('dm.aliyuncs.com') >= 0, captured.url);
check('参数含 ToAddress / Subject / Signature', bodyParams.get('ToAddress') === 'buyer@example.cn' && bodyParams.get('Subject') === '主题' && !!bodyParams.get('Signature'));
check('返回 requestId', okSend.ok && okSend.requestId === 'req-1');

const expectSig = referenceSignature(
  Object.fromEntries([...bodyParams.entries()].filter(([k]) => k !== 'Signature')), 'sec'
);
check('实际签名与参数自洽', bodyParams.get('Signature') === expectSig);

globalThis.fetch = async () => new Response(JSON.stringify({ Code: 'InvalidMailAddress', Message: '收件地址不合法' }), { status: 400 });
let threw = '';
try { await sendViaAliyun({ ALIYUN_DM_ACCESS_KEY_ID: 'id', ALIYUN_DM_ACCESS_KEY_SECRET: 'sec', ALIYUN_DM_ACCOUNT: 'a@b.com' }, { to: 'x', subject: 's', body: 'b' }); }
catch (e) { threw = e.message; }
check('发送失败会抛出带错误码的异常', threw.indexOf('ALIYUN_DM_InvalidMailAddress') === 0, threw);

/* 主接入点连不上时，自动回退到区域接入点 */
let tried = [];
globalThis.fetch = async (url) => {
  tried.push(url);
  if (tried.length === 1) throw new Error('getaddrinfo ENOTFOUND dm.aliyuncs.com');
  return new Response(JSON.stringify({ RequestId: 'req-2' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const fallback = await sendViaAliyun(
  { ALIYUN_DM_ACCESS_KEY_ID: 'id', ALIYUN_DM_ACCESS_KEY_SECRET: 'sec', ALIYUN_DM_ACCOUNT: 'a@b.com', ALIYUN_DM_REGION: 'ap-southeast-1' },
  { to: 'x@y.com', subject: 's', body: 'b' }
);
check('主接入点连不上会回退到区域接入点', fallback.ok && tried.length === 2 && tried[1].indexOf('dm.ap-southeast-1.aliyuncs.com') >= 0, tried.join(' | '));

/* 两个都连不上时给出可读错误 */
globalThis.fetch = async () => { throw new Error('ENOTFOUND'); };
let hardErr = '';
try { await sendViaAliyun({ ALIYUN_DM_ACCESS_KEY_ID: 'id', ALIYUN_DM_ACCESS_KEY_SECRET: 'sec', ALIYUN_DM_ACCOUNT: 'a@b.com' }, { to: 'x@y.com', subject: 's', body: 'b' }); }
catch (e) { hardErr = e.message; }
check('两个接入点都失败时报错清楚', hardErr.indexOf('ALIYUN_DM_UNREACHABLE') === 0, hardErr);
globalThis.fetch = realFetch;

const failed = results.filter(r => !r[1]);
for (const [n, ok, extra] of results) console.log((ok ? 'PASS' : 'FAIL') + ' | ' + n + (ok || !extra ? '' : '  → ' + extra));
console.log(failed.length ? ('FAILED ' + failed.length + '/' + results.length) : ('ALL PASSED (' + results.length + ')'));
process.exit(failed.length ? 1 : 0);
