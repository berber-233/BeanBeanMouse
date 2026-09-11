# AI 演示商品图生成包（可选，B 方案）

> 用途：在供货商上传真实照片前，为演示/种子商品生成“写实电商主图”，
> 提升页面观感。仅用于演示与占位，不得冒充真实商品照对外承诺。

## 为什么现在不能直接生成

- 本会话内置 image_gen 工具不可用；备选 CLI 通道需要 `OPENAI_API_KEY`，且需你明确启用。
- 当前环境未检测到该 Key。启用步骤（不要把 Key 粘贴到对话里）：
  1. 在 https://platform.openai.com/api-keys 创建 API Key；
  2. 本机设置环境变量 `OPENAI_API_KEY`；
  3. 回复“用 CLI 生成”，我会按 imagegen 技能规范批量执行并接好页面。

## 接入方式（先生成后即用）

1. 每款商品图片放到 `assets/products/<商品id>/`，命名 `1.png / 2.png …`。
2. 运行 `node scripts/sync-product-images.mjs`，自动生成 `product-image-map.js`。
3. 页面（卡片/画廊/推荐/卖家主页）自动优先显示这些图；无图回退占位图。

## 每款商品提示词基线

统一规范：

```text
Use case: product-mockup
Asset type: B2B 电商商品主图（白/浅灰背景）
Style/medium: 写实商品摄影，电商目录风
Composition/framing: 主体居中占画面 60–75%，留少量负空间
Lighting/mood: 柔和棚拍，清晰无重影
Constraints: 无文字、无 Logo、无水印；避免可辨识品牌；中文环境可不含人物
```

按商品替换 Primary request 即可：

- p23 宠物自动喂食器 4L：白色+香槟色智能喂食器，正面略侧视角
- p24 瓦楞纸猫抓板窝（带隧道与球）
- p25 双层仓鼠笼：透明/白色笼体、静音跑轮、水壶
- p26 仓鼠纸棉垫材：展开的柔软纸棉 + 袋装参考
- p27 猫砂盆套装：高挡边猫砂盆 + 猫砂铲 + 防带砂垫
- p28 猫咪饮水机 2L：静音水泵、透明储水舱
- p29 小型犬防爆冲胸背带牵引套装（2–8kg）
- p30 大型犬胸背带牵引套装（金毛/边牧体型，加厚衬垫）
- p31 大型犬耐咬尼龙磨牙骨
- p32 宠物双面美容梳（针梳+除毛）

建议每款生成 1 张主图；细节图后续按需补。

## 验收

- 文件产出后：主体清晰、无文字/Logo、无品牌徽标、光线统一。
- 跑 `node scripts/sync-product-images.mjs`，再刷新各产品详情确认已替换。
