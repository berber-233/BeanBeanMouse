/* 邮件模板：纯字符串拼装（Node 与 Workers 共用，不依赖任何模板引擎）。
 * 表格布局 + 内联样式是邮件客户端的通用做法（Gmail/Outlook 对 <style> 支持不一致）。 */

const BRAND = {
  name: '豆豆鼠 BeanBeanMouse',
  site: 'https://beanbeanmouse.com',
  gold: '#b58a3c',
  ink: '#1f2430',
  muted: '#6b7280',
  line: '#e8e3d8',
  bg: '#f6f3ec'
};

export function emailLayout({ title, intro, cta, note, footer }) {
  const ctaHtml = cta
    ? '<tr><td style="padding:8px 32px 28px">'
      + '<a href="' + cta.url + '" style="display:inline-block;background:' + BRAND.gold
      + ';color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:8px">'
      + cta.label + '</a></td></tr>'
      + '<tr><td style="padding:0 32px 24px;word-break:break-all;font-size:12px;line-height:1.7;color:' + BRAND.muted + '">'
      + '按钮无法点击时，请复制以下链接到浏览器打开：<br><span style="color:' + BRAND.ink + '">' + cta.url + '</span></td></tr>'
    : '';
  const noteHtml = note
    ? '<tr><td style="padding:0 32px 24px;font-size:13px;line-height:1.8;color:' + BRAND.muted + '">' + note + '</td></tr>'
    : '';
  return '<!doctype html><html><body style="margin:0;padding:24px 12px;background:' + BRAND.bg
    + ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'PingFang SC\',\'Microsoft YaHei\',sans-serif">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid ' + BRAND.line + '">'
    + '<tr><td style="padding:26px 32px 6px;font-size:17px;font-weight:700;color:' + BRAND.ink + ';letter-spacing:.2px">'
    + BRAND.name + '</td></tr>'
    + '<tr><td style="padding:6px 32px 18px;font-size:19px;font-weight:700;color:' + BRAND.ink + '">' + title + '</td></tr>'
    + '<tr><td style="padding:0 32px 20px;font-size:14px;line-height:1.9;color:' + BRAND.ink + '">' + intro + '</td></tr>'
    + ctaHtml + noteHtml
    + '<tr><td style="padding:16px 32px 24px;border-top:1px solid ' + BRAND.line + ';font-size:12px;line-height:1.7;color:' + BRAND.muted + '">'
    + (footer || '')
    + '<br>' + BRAND.name + ' · <a href="' + BRAND.site + '" style="color:' + BRAND.gold + ';text-decoration:none">' + BRAND.site.replace('https://', '') + '</a>'
    + '</td></tr></table></body></html>';
}

export function verifyEmailContent({ link }) {
  return {
    subject: '[豆豆鼠] 请验证您的邮箱',
    html: emailLayout({
      title: '验证您的邮箱',
      intro: '感谢注册豆豆鼠 BeanBeanMouse。完成邮箱验证后即可登录、发布询盘与对接供应商。链接 24 小时内有效。',
      cta: { label: '完成邮箱验证', url: link },
      note: '为保障账号安全，未验证邮箱的账号无法登录。',
      footer: '如果这不是您本人的操作，请忽略本邮件。'
    })
  };
}
