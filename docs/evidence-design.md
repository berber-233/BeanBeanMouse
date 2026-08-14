# 第三方存证设计（Evidence / 存证）

## 目标

为交易双方提供可审计、防篡改的流程证据：关键业务节点自动落证，双方可随时查看并验证哈希链完整性，减少“口头约定”引发的争议。

## 数据模型

### evidence_records（存证记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT/UUID | 主键 |
| order_id | FK orders | 所属订单 |
| actor_id | FK users | 操作人（可空 = 系统） |
| kind | TEXT | 事件类型（见下） |
| ref_id | TEXT | 关联对象 ID（订单/打赏/物流单等） |
| snapshot | JSON | 事件快照（金额、状态、位置等） |
| content_hash | TEXT | 当前记录哈希 |
| prev_hash | TEXT | 上一条记录哈希（链） |
| chain_index | INTEGER | 链内序号（从 0 开始） |
| created_at | INTEGER | 落证时间 |

### 哈希链算法

```
content_hash = SHA-256( prev_hash + "|" + chain_index + "|" + JSON.stringify(payload) )
payload = { kind, refId, snapshot, actorId, at }
首条记录 prev_hash = "GENESIS"
```

验证时按 order 重放整条链，任一记录被篡改都会导致该记录及其后所有记录的哈希不匹配。

### 自动落证事件

- `order_create` 订单创建（金额、币种、询盘）
- `receipt_confirmed` 买家确认签收（交易达成）
- `tip_create` / `tip_cancel` 小费打赏与取消
- `shipment_create` / `shipment_event` 物流单创建与物流状态更新
- `manual` 用户手动保存快照

## API

- `POST /evidence` — 保存快照（订单双方或管理员）
- `GET /evidence?orderId=` — 列出订单存证 + 整链验证结果
- `POST /evidence/:id/verify` — 验证整条链完整性

## 正式版增强（路线图）

- 对接第三方公证/区块链存证服务（如联合信任、蚂蚁链、以太坊锚定），把 `content_hash` 定期上链；
- 支持证据文件（聊天记录、验货报告、提单扫描件）的原文加密存储；
- 管理员可下载订单存证报告（含时间戳、哈希、验证二维码）。

## 安全说明

- 快照中不得保存明文密码、支付令牌等敏感信息；
- 访问控制：仅订单买卖双方与管理员可读；
- 正式上线时建议对存证接口做频率限制与审计。
