# 外贸实操深度模块说明（v0.1）

> 2026-08-21 随版本 0.1 上线。本文记录「出口准备 / 单据中心 / 物流落地 / 合规中心 / 售后纠纷」
> 五个模块的设计与落地位置，供前端维护、后端补端点和后续迭代使用。

> 2026-08-23 追加 v0.2 模块说明（品类 / 搜索推荐 / 附件导出 / 身份名片 / 建议收集），见第 8–12 节。

## 1. 出口准备（Export Readiness）

- 页面：`#/export`（公开指南）；卖家工作台 `#/dashboard/export`（交互清单）。
- 数据：`data.js` → `EXPORT_READINESS_ITEMS`（7 项：海关备案、收汇账户、退税备案、
  出口许可证、法检商检、原产地证申领、危险品资质[按品类]）。
- 状态：`state.exportReadiness[sellerId][itemId]`（含 `itemId + ':ts'` 时间戳）。
- 接口：`api.exports.getReadiness / setItem / reset`（mock，http 分支预留）。
- 就绪度：核心项完成比例，≥80% 高 / ≥50% 中 / 其余低；发布产品页与卖家工作台同步提示。

## 2. 单据中心（Document Center）

- 位置：每张订单卡片内「单据中心」。
- 单证：商业发票（CI）、装箱单（PL）、原产地证（CO，参考）、提单（BL，参考）；
  与既有报价单 / 形式发票 / 合同草案 / 存证报告共用 `.doc` 打印样式，支持打印 / 另存 PDF。
- 一致性检查：`api.documents.consistencyOf` 校验品名、HS 编码、数量、唛头 → `pass / warn`。
- 状态：`state.orderDocs[orderId] = { generated: {CI: ts, ...}, consistency, checkedAt }`；
  每次生成自动写入订单存证链（`document_generated`）。

## 3. 物流落地（Logistics）

- 页面：`#/logistics`（指南 + 目的港费用 + 运费估算器）。
- 数据：`LOGISTICS_MODES`（海/空/陆/快递）、`CONTAINER_TYPES`（LCL/20GP/40GP/40HQ）、
  `PORT_CHARGES`（汉堡/鹿特丹/纽约/洛杉矶/迪拜/新加坡示例费用）。
- 发货单新增字段：`containerType`、`vessel`、`billNo`、`freightTerms`、`telexRelease`，
  物流卡片与提单参考件读取并展示。
- 接口：`api.logistics.estimate({mode, weight, volume, container, origin, destination})`
  返回演示运费区间（正式以承运人报价为准）。

## 4. 合规中心（Compliance）

- 页面：`#/compliance`（出口管制 / 制裁名单 / 贸易救济 / 产品环保法规 + 文本演示筛查）。
- 数据：`COMPLIANCE_RULES`、`SANCTION_KEYWORDS`（演示关键词，正式版接权威名单 API）。
- 筛查：`api.compliance.screen(text)`；产品详情与管理员审核展示 `productScreenFlags(p)` 命中项。
- 边界：演示结果仅作参考，正式出口需按 HS 编码、最终用途与目的国法规人工复核。

## 5. 售后与纠纷（After-sales & Disputes）

- 页面：`#/disputes`（买卖双方 / 管理员按角色查看）；管理后台 `#/dashboard/aftersales`（纠纷仲裁）。
- 流程：买家申请售后 / 发起纠纷 → 卖家回复（接受 / 拒绝并说明）→ 管理员裁决（支持买家 / 卖家 / 双方协商）。
- 状态：`new → responded → arbitrating → resolved / closed`；直接发起纠纷时进入 `arbitrating`。
- 数据：`state.afterSales[]`；关键节点写入订单存证链
  （`after_sales_create / after_sales_reply / dispute_open / after_sales_ruling`）。

## 6. 测试与版本

- `test/api-smoke.cjs`：25 项（新增 9 项覆盖新服务）。
- `test/verify.cjs`：201 项（新增出口/物流/合规/单据/售后纠纷/版本/移动端断言）。
- 后端 `backend/test/api.test.mjs`：107 项无回归（本次未改后端）。
- 版本：页脚 v0.1（演示），`package.json` 0.1.0。

## 7. 待办

- 支付 / 收汇（缺口 3）：按项目节奏在完成度 ~98% 后单独打磨，沿用
  `docs/payments-compliance-roadmap.md`。
- 后端补端点：exports / documents / after-sales / compliance / logistics 当前为前端 mock，
  接入真实后端时同步更新 `docs/openapi.yaml` 与 `docs/er-diagram.md`。

## 8. 品类与搜索推荐（v0.2）

- 品类：`CATEGORIES` 扩至 10 类（新增 sports / gifts / hardware / pet，含子类与 HS 参考），
  示例商品 p17–p24；首页「品类速览」横向滚动条 + 6 大热门行业卡片。
- 搜索：`renderProducts` 顶部搜索栏（datalist 联想）；精确过滤保留原逻辑。
- 相关推荐：`productRelevance` 对品名/描述/子类/品类/供应商做分词加权；
  无精确结果时 `relatedProducts` 取 Top 8 展示「相关推荐」区块（零命中不展示）。

## 9. 对话导出与附件（v0.2）

- 附件：`pendingFiles`（询盘 / 报价两套暂存）→ 提交写入 `inquiry.attachments` /
  `inquiry.replyAttachments`；允许图片（JPG/PNG/GIF/WebP）与 ZIP/RAR/7Z，单个 ≤4MB，
  内容以 dataURL 存 localStorage（演示；正式版接对象存储）。
- 导出：`exportConversation(inquiryId, format)` 生成 TXT 或 HTML（HTML 内嵌图片）并触发下载。
- 权限：买卖双方在其询盘列表均可查看附件与导出对话。

## 10. 身份与名片（v0.2）

- 注册：`accountType`（individual / company）+ `jobTitle` + `bizName`，存入用户与公司资料。
- 资料：`api.profile.get/save`，`state.profiles[userId]` 覆盖式合并；资料完整度按 7 项计算。
- 名片：`user.businessCard`（dataURL + name）；`openInquiryModal` 可选择「随询盘发送名片」，
  询盘记录写入 `buyerType / jobTitle / card / cardName`，卖家列表展示身份徽标与「查看名片」。
- 水印：对方查看 / 下载名片时 `watermarkImage` 在 Canvas 上叠加斜纹轻水印
  （含持卡人姓名，白色 14–24% 透明度 + 阴影），本人预览保持原图。

## 11. 建议收集（v0.2）

- 页面：`#/feedback`（公开提交，类型 / 内容 / 联系方式）；`api.suggestions` mock 服务。
- 管理：管理后台「优化建议」标签，状态流转 new → seen → done。

## 12. 测试与版本（v0.2）

- `test/api-smoke.cjs`：31 项；`test/verify.cjs`：228 项；后端 107 项；零页面报错。
- 版本：页脚与 `package.json` 0.2.0。

## 13. 名片模板（v0.2 追加）

- 预设：`CARD_TEMPLATES`（classic-gold / luxe-ink / minimal-white / modern-blue / oriental-ink），
  个人中心「名片模板」区展示 5 套 + 自定义。
- 生成：`renderCardTemplate(tplId, profileFields)` 用 Canvas 按模板绘制 1050×600 名片
  （含金色渐变、印章、网格等细节），`api.profile.save` 落库为 `businessCard`；
  对方查看 / 下载仍走 `watermarkImage` 水印流程。
- 自定义：沿用「上传自己的名片图片」路径（Logo / 配色 / 字体 / 排版自由）。
- 选型图：`screenshots/business-card-templates.png`（5 套 + 自定义预览）。
