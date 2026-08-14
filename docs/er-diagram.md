# BeanBeanMouse（豆豆鼠）数据库 ER 图（阶段 0 · 第一版）

> 说明：以下为第一版核心表设计。`orders` / `payments` 属第二阶段（交易闭环），
> 先列出以预留扩展。字段仅保留关键项，实际建表时再补充索引与约束。

```mermaid
erDiagram
  USERS ||--o{ COMPANIES : "认证为"
  USERS ||--o{ PRODUCTS : "发布"
  USERS ||--o{ INQUIRIES : "发起"
  USERS ||--o{ MESSAGES : "发送"
  USERS ||--o{ NOTIFICATIONS : "接收"
  USERS ||--o{ AUDIT_LOGS : "操作留痕"
  COMPANIES ||--o{ PRODUCTS : "供应"
  PRODUCTS ||--o{ PRODUCT_TRANSLATIONS : "多语言"
  PRODUCTS ||--o{ INQUIRIES : "收到"
  PRODUCTS ||--o{ ANTI_FAKE_CODES : "签发防伪码"
  PRODUCTS ||--o{ FILES : "图片与证书"
  INQUIRIES ||--o| QUOTES : "获得报价"
  INQUIRIES ||--o| CONVERSATIONS : "建立会话"
  CONVERSATIONS ||--o{ MESSAGES : "包含消息"
  NEWS_SOURCES ||--o{ NEWS_ITEMS : "收录"
  ORDERS ||--o{ PAYMENTS : "支付流水"

  USERS {
    uuid id PK
    string email UK
    string password_hash
    string role "buyer / seller / admin"
    string name
    string status "active / frozen"
    boolean email_verified
    timestamp created_at
  }
  COMPANIES {
    uuid id PK
    uuid user_id FK
    string name
    string country
    string city
    string license_no
    uuid license_file_id FK
    string status "pending / approved / rejected"
    timestamp verified_at
  }
  PRODUCTS {
    uuid id PK
    uuid seller_id FK
    uuid company_id FK
    string category
    string hs_code
    string country
    numeric price_min
    numeric price_max
    int moq
    string unit
    int lead_time
    json terms
    json certs
    string src_lang
    string status "draft / pending / on / off / rejected"
    string reject_reason
    timestamp created_at
    timestamp updated_at
  }
  PRODUCT_TRANSLATIONS {
    uuid id PK
    uuid product_id FK
    string lang
    string title
    text description
    json features
    timestamp updated_at
  }
  INQUIRIES {
    uuid id PK
    uuid product_id FK
    uuid buyer_id FK
    int qty
    string unit
    string payment_term
    text message
    string status "new / handled / quoted"
    timestamp created_at
  }
  QUOTES {
    uuid id PK
    uuid inquiry_id FK
    numeric price
    string incoterm
    string payment_term
    int validity_days
    int lead_time
    text note
    timestamp created_at
  }
  CONVERSATIONS {
    uuid id PK
    uuid inquiry_id FK
    uuid buyer_id FK
    uuid seller_id FK
    timestamp created_at
  }
  MESSAGES {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id FK
    text content
    json translated_cache
    timestamp read_at
    timestamp created_at
  }
  ANTI_FAKE_CODES {
    uuid id PK
    uuid product_id FK
    string code UK
    string batch_no
    string status "active / void"
    timestamp issued_at
    timestamp last_verified_at
    int verify_count
  }
  NEWS_SOURCES {
    uuid id PK
    string name
    string url
    string region
    string category
    boolean enabled
  }
  NEWS_ITEMS {
    uuid id PK
    uuid source_id FK
    string region
    string category
    json title
    json summary
    string url
    date published_at
    string status
  }
  AUDIT_LOGS {
    uuid id PK
    uuid actor_id FK
    string action
    string target_type
    string target_id
    text detail
    timestamp created_at
  }
  NOTIFICATIONS {
    uuid id PK
    uuid user_id FK
    string type
    string title
    text body
    timestamp read_at
    timestamp created_at
  }
  FILES {
    uuid id PK
    uuid owner_id FK
    string bucket_key
    string mime
    int size
    string status
    timestamp created_at
  }
  ORDERS {
    uuid id PK
    uuid inquiry_id FK
    uuid buyer_id FK
    uuid seller_id FK
    string status
    numeric total
    string currency
    timestamp created_at
  }
  PAYMENTS {
    uuid id PK
    uuid order_id FK
    string method
    string status
    numeric amount
    string external_ref
    timestamp created_at
  }
```

## 关键约束

- `USERS.email`、`PRODUCT_TRANSLATIONS(product_id, lang)`、`ANTI_FAKE_CODES.code` 唯一；
- 产品文本放 `PRODUCT_TRANSLATIONS`（源语言 + 平台整理的中英文 + 机器翻译缓存），
  产品主表只保留结构化字段（价格、MOQ、HS 编码等）；
- 审核状态机：`draft → pending → on / rejected`，管理员操作写入 `AUDIT_LOGS`；
- 防伪码由服务端签发（唯一、可作废、记录查询次数与时间）。

## 增补：订单闭环 / 存证 / 物流（2026-08-14）

```mermaid
erDiagram
  ORDERS ||--o{ TIPS : "打赏"
  ORDERS ||--o{ EVIDENCE_RECORDS : "存证链"
  ORDERS ||--o{ SHIPMENTS : "物流单"
  SHIPMENTS ||--o{ SHIPMENT_EVENTS : "轨迹事件"
  ORDERS ||--o{ PAYMENTS : "支付流水"
  USERS ||--o{ TIPS : "打赏/被打赏"

  TIPS {
    uuid id PK
    uuid order_id FK
    uuid from_user_id FK
    uuid to_user_id FK
    numeric amount
    string currency
    text note
    string status "active / cancelled"
    timestamp created_at
    timestamp cancelled_at
  }
  EVIDENCE_RECORDS {
    uuid id PK
    uuid order_id FK
    uuid actor_id FK
    string kind "order_create / receipt_confirmed / tip_create / tip_cancel / shipment_create / shipment_event / manual"
    string ref_id
    json snapshot
    string content_hash
    string prev_hash
    int chain_index
    timestamp created_at
  }
  SHIPMENTS {
    uuid id PK
    uuid order_id FK
    string carrier
    string tracking_no
    string status "processing / packed / shipped / in_transit / customs / out_for_delivery / delivered / exception"
    string origin
    string destination
    string current_location
    timestamp etd
    timestamp eta
    text remark
    uuid created_by FK
    timestamp created_at
    timestamp updated_at
  }
  SHIPMENT_EVENTS {
    uuid id PK
    uuid shipment_id FK
    string status
    string location
    text note
    timestamp event_time
    uuid created_by FK
    timestamp created_at
  }
```

要点：

- `EVIDENCE_RECORDS` 按 `(order_id, chain_index)` 形成哈希链，`prev_hash` 指向前一条，可整体重放验证；
- `SHIPMENTS` 与 `SHIPMENT_EVENTS` 支撑买卖双方共享的实时物流时间线；
- `TIPS` 仅交易达成后可打赏，双方可见、未结算前可取消，并自动存证。
