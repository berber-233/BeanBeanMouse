# 搜索引擎收录提交（第 10 项）

> 站点为 SPA（hash 路由），搜索引擎可收录的只有静态入口页。收录收益有限，
> 但品牌词与首页展示仍然值得提交。

## 已具备

- `robots.txt` 允许抓取并声明 `Sitemap`
- `sitemap.xml`（首页，含 lastmod/changefreq/priority）
- `index.html` 提供 description / canonical / OG / twitter meta
- `404.html`、`.nojekyll`、`.well-known`（如需）

## 建议补齐

1. 每季度或大版本更新后运行 `node scripts/gen-sitemap.mjs` 重新生成 `sitemap.xml`
   （脚本会把静态页面 + 上架产品详情页写入，产品页需在服务端渲染或至少提供可抓取版本）。
2. 上线后为「产品详情」增加预渲染（SSR/预渲染）或静态化，否则搜索引擎看不到产品页内容。

## 提交流程

### Google Search Console（推荐最先做）
1. 访问 https://search.google.com/search-console ，添加资源 `beanbeanmouse.com`。
2. DNS 验证：在 Cloudflare 加 TXT 记录（或 HTML 文件验证）。
3. 提交 Sitemap：`https://beanbeanmouse.com/sitemap.xml`。
4. 用「网址检查」提交首页，请求编入索引。

### Bing Webmaster
1. 访问 https://www.bing.com/webmasters ，可用 Google 账号一键导入。
2. 验证域名后提交同一 sitemap。
3. Bing 会顺带同步给 Yahoo 等。

### 百度站长平台
1. 访问 https://ziyuan.baidu.com ，添加站点 `beanbeanmouse.com`。
2. 验证（文件验证或 DNS）。
3. 提交 sitemap 与首页；百度对 JS 渲染支持一般，建议提供静态版本。

## 注意事项

- 每次提交后 3–7 天再看收录；不要频繁改 robots.txt 导致抓取波动。
- 确保 `sitemap.xml` 的 `lastmod` 与实际发版一致（脚本会生成当前日期）。
