# 外贸实操深度模块说明（v0.1）

> 2026-08-21 随版本 0.1 上线。本文记录「出口准备 / 单据中心 / 物流落地 / 合规中心 / 售后纠纷」
> 五个模块的设计与落地位置，供前端维护、后端补端点和后续迭代使用。

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
