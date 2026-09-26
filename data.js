/* BeanBeanMouse（豆豆鼠）演示数据层 */

const STORE_KEY = 'bridgetrade_v1';
window.__TB_STORE_KEY__ = STORE_KEY;
/* 演示数据结构版本：改动演示数据后往上加，老访客的本地缓存会自动重建，
 * 避免他们一直看到过期目录（例如旧的非宠物商品）。 */
const DATA_VERSION = 'pet0.2';
/* Cloudflare Turnstile 的 Site Key（公开值，可安全出现在前端）。
 * 密匙是 TURNSTILE_SECRET，只存在服务端（Pages 的环境变量），不在代码里。 */
window.__TURNSTILE_KEY__ = '0x4AAAAAAE-xhSkuY8DmaRWz';

const CATEGORIES = [
  { id: 'pet', zh: '宠物用品', en: 'Pet Supplies', hue: 32, subs: [
    { id: 'pet-hamster', zh: '仓鼠与小宠', en: 'Hamsters & Small Pets', hs: '9403, 3924, 4421' },
    { id: 'pet-cat', zh: '猫用品', en: 'Cat Supplies', hs: '3924, 9403, 4818' },
    { id: 'pet-dog-small', zh: '小型犬用品', en: 'Small Dog Supplies', hs: '4201, 9503' },
    { id: 'pet-dog-large', zh: '大型犬用品', en: 'Large Dog Supplies', hs: '4201, 9503, 6307' },
    { id: 'pet-food', zh: '宠物食品与零食', en: 'Pet Food & Treats', hs: '2309, 0511' },
    { id: 'pet-grooming', zh: '美容与清洁', en: 'Grooming & Hygiene', hs: '3307, 9615' },
    { id: 'pet-toys', zh: '玩具与训练', en: 'Toys & Training', hs: '9503, 4201' },
    { id: 'pet-travel', zh: '出行与智能用品', en: 'Travel & Smart Gear', hs: '4202, 8517' }
  ]}
];

const SELLERS = [
  {
    id: 'bbm', verified: true, since: 2019, responseRate: 99, responseTime: '2h',
    rating: 4.9, orders: 26800, country: 'CN',
    zh: { company: '豆豆鼠宠物用品（自营出口）', city: '杭州' },
    en: { company: 'BeanBeanMouse Pet Supplies (Direct Export)', city: 'Hangzhou' }
  },
  {
    /* 供应商合作申请（演示用）：用于后台资质审核流程，不参与商品归属 */
    id: 'partner-demo', verified: false, since: 2024, responseRate: 92, responseTime: '6h',
    rating: 0, orders: 0, country: 'CN',
    zh: { company: '宁波毛豆宠物用品有限公司（合作申请中）', city: '宁波' },
    en: { company: 'Ningbo Maodou Pet Products Co. (application pending)', city: 'Ningbo' }
  }
];

function pendingSeedProducts() {
  return [
    {
      id: 'p15', sellerId: 'bbm', cat: 'pet', sub: 'pet-cat', country: 'CN', status: 'pending',
      priceMin: 28, priceMax: 45, moq: 100, unit: 'pcs', leadTime: 22,
      terms: ['FOB', 'CIF'], certs: ['CE', 'RoHS'], rating: 0, orders: 0, hue: 32,
      pets: ['cat'], petSize: 'medium', material: 'ABS + 硅胶',
      en: {
        title: 'Smart Self-Cleaning Cat Litter Box 6L',
        desc: 'Automatic self-cleaning litter box with 6L waste drawer, weight sensing, app tracking and odour seal. Suitable for cats 3.5-8kg.',
        features: ['Auto self-cleaning', 'Weight sensing + app', 'Odour-sealed drawer', 'For cats 3.5-8kg']
      },
      zh: {
        title: '智能自动清理猫砂盆 6L',
        desc: '自动清理猫砂盆，6L 集便盒，带重量感应与 App 记录，密封除臭；适用 3.5-8kg 猫咪。',
        features: ['自动清理', '重量感应 + App', '密封除臭集便盒', '适用 3.5-8kg']
      }
    },
    {
      id: 'p16', sellerId: 'bbm', cat: 'pet', sub: 'pet-cat', country: 'CN', status: 'pending',
      priceMin: 9.5, priceMax: 16, moq: 300, unit: 'pcs', leadTime: 20,
      terms: ['CIF', 'EXW'], certs: ['OEKO-TEX'], rating: 0, orders: 0, hue: 30,
      pets: ['cat', 'dog-small'], petSize: 'medium', material: '短绒面料 + 海绵',
      en: {
        title: 'Replica Branded Pet Bed (compliance test fixture)',
        desc: 'Plush pet bed with removable cushion, 3 sizes. Listing contains replica branded wording on purpose so the compliance screening has a case to catch.',
        features: ['Removable cushion', '3 sizes', 'Non-slip base']
      },
      zh: {
        title: '仿牌宠物窝（合规审核演示用）',
        desc: '短绒宠物窝，含可拆洗内垫，三种尺寸，底部防滑。标题故意保留"仿牌"字样，用于演示合规筛查拦截。',
        features: ['可拆洗内垫', '三种尺寸', '底部防滑']
      }
    }
  ];
}

const PRODUCTS = [
  {
    id: 'p23', sellerId: 'bbm', cat: 'pet', country: 'CN', hot: true,
    sub: 'pet-cat',
    priceMin: 24, priceMax: 39, moq: 200, unit: 'pcs', leadTime: 15,
    terms: ['FOB', 'CIF'], certs: ['CE', 'RoHS'], rating: 4.7, orders: 8200, hue: 285,
    en: {
      title: 'Pet Automatic Feeder 4L WiFi',
      desc: 'WiFi smart pet feeder with 4L capacity, scheduled portions, voice recording for feeding calls and low-food alert. Works with App for remote control.',
      features: ['4L sealed bin', 'Schedule & portions', 'Voice recording call', 'Low-food alert']
    },
    zh: {
      title: '宠物自动喂食器 4L WiFi',
      desc: 'WiFi 智能宠物喂食器，4L 密封粮桶，定时定量出粮，支持录音呼唤进食与余粮不足提醒，App 远程控制。',
      features: ['4L 密封粮桶', '定时定量', '录音呼唤', '余粮提醒']
    }
  },
  {
    id: 'p24', sellerId: 'bbm', cat: 'pet', country: 'TR',
    sub: 'pet-cat',
    priceMin: 12, priceMax: 18, moq: 150, unit: 'pcs', leadTime: 24,
    terms: ['FOB', 'CIF'], certs: ['OEKO-TEX'], rating: 4.5, orders: 2100, hue: 275,
    en: {
      title: 'Cat Scratcher House with Tunnel',
      desc: 'Corrugated cardboard cat scratcher house with tunnel and toy ball, 60x30x30cm. Eco-friendly and recyclable, perfect for scratching and sleeping.',
      features: ['Corrugated eco cardboard', 'Built-in tunnel & ball', '60x30x30cm', 'Recyclable']
    },
    zh: {
      title: '猫抓板窝（带隧道）',
      desc: '瓦楞纸猫抓板窝，自带隧道与逗猫球，60×30×30cm，环保可回收，可抓可睡，保护家具。',
      features: ['环保瓦楞纸', '内置隧道+球', '60×30×30cm', '可回收']
    }
  },
  {
    id: 'p25', sellerId: 'bbm', cat: 'pet', country: 'VN', sub: 'pet-hamster', featured: true, hot: true,
    priceMin: 8.5, priceMax: 15, moq: 100, unit: 'set', leadTime: 20,
    terms: ['FOB', 'CIF'], certs: ['EN71', 'ISO9001'], rating: 4.7, orders: 5600, hue: 282,
    en: {
      title: '2-Story Hamster Cage with Wheel & Water Bottle',
      desc: 'Compact 2-story hamster cage with deep anti-escape base, silent running wheel, hideout, feeding bowl and water bottle. Easy to clean, ideal for Syrian and dwarf hamsters.',
      features: ['2-story + anti-escape base', 'Silent running wheel', 'Hideout & bowl included', 'Easy clean tray']
    },
    zh: {
      title: '双层仓鼠笼（含跑轮与水壶）',
      desc: '双层紧凑仓鼠笼，防逃深底盘，静音跑轮，含躲避屋、食盆与水壶，易清洁，适合熊类与侏儒仓鼠。',
      features: ['双层 + 防逃底盘', '静音跑轮', '含躲避屋与食盆', '易清洁托盘']
    }
  },
  {
    id: 'p26', sellerId: 'bbm', cat: 'pet', country: 'IN', sub: 'pet-hamster',
    priceMin: 1.2, priceMax: 2.4, moq: 500, unit: 'bag', leadTime: 15,
    terms: ['FOB', 'CIF'], certs: ['OEKO-TEX'], rating: 4.5, orders: 9800, hue: 290,
    en: {
      title: 'Natural Paper Hamster Bedding 10L',
      desc: 'Soft dust-free paper bedding for hamsters and small pets, 10L expanded bag. Safe for burrowing, low dust and highly absorbent.',
      features: ['Dust-free & soft', '10L expanded volume', 'Safe for burrowing', 'Highly absorbent']
    },
    zh: {
      title: '仓鼠纸棉垫材 10L',
      desc: '柔软无尘纸棉垫材，10L 膨胀包装，适合仓鼠与小宠打洞筑巢，低粉尘、高吸水。',
      features: ['无尘柔软', '10L 膨胀量', '适合打洞筑巢', '高吸水']
    }
  },
  {
    id: 'p27', sellerId: 'bbm', cat: 'pet', country: 'TR', sub: 'pet-cat', featured: true,
    priceMin: 6.8, priceMax: 11, moq: 200, unit: 'set', leadTime: 22,
    terms: ['FOB', 'CIF'], certs: ['REACH'], rating: 4.6, orders: 7300, hue: 268,
    en: {
      title: 'Cat Litter Box with Scoop & Mat Set',
      desc: 'Large corner cat litter box with high splash guard, matching scoop and anti-track mat. BPA-free PP, smooth surface for easy cleaning.',
      features: ['High splash guard', 'Scoop & anti-track mat', 'BPA-free PP', 'Easy-clean corners']
    },
    zh: {
      title: '猫砂盆套装（含猫砂铲与防带砂垫）',
      desc: '大号直角猫砂盆，高防溅挡边，配套猫砂铲与防带砂垫，BPA 免费 PP 材质，易清洁。',
      features: ['高防溅挡边', '含铲与防带砂垫', 'BPA 免费 PP', '易清洁']
    }
  },
  {
    id: 'p28', sellerId: 'bbm', cat: 'pet', country: 'CN', sub: 'pet-cat', featured: true,
    priceMin: 13, priceMax: 21, moq: 150, unit: 'pcs', leadTime: 15,
    terms: ['FOB', 'CIF'], certs: ['CE', 'FDA', 'RoHS'], rating: 4.7, orders: 6100, hue: 200,
    en: {
      title: 'Cat Water Fountain 2L Silent Pump',
      desc: '2L pet water fountain with ultra-quiet submersible pump, triple filtration and wide bowl. Food-safe ABS with low-water reminder.',
      features: ['Ultra-quiet pump', 'Triple filtration', '2L food-safe bowl', 'Low-water reminder']
    },
    zh: {
      title: '猫咪饮水机 2L 静音水泵',
      desc: '2L 宠物饮水机，超静音潜水泵，三重过滤与大宽碗设计，食品级 ABS，缺水提醒。',
      features: ['超静音水泵', '三重过滤', '2L 食品级宽碗', '缺水提醒']
    }
  },
  {
    id: 'p29', sellerId: 'bbm', cat: 'pet', country: 'VN', sub: 'pet-dog-small', hot: true,
    priceMin: 3.6, priceMax: 6.5, moq: 300, unit: 'set', leadTime: 18,
    terms: ['FOB', 'CIF'], certs: ['OEKO-TEX'], rating: 4.6, orders: 8800, hue: 220,
    en: {
      title: 'Small Dog No-Pull Harness & Leash Set',
      desc: 'Soft breathable no-pull harness for small dogs (2-8kg) with adjustable straps, quick-release buckles and matching leash. Reflective stitching for night walks.',
      features: ['For dogs 2–8kg', 'No-pull & breathable', 'Reflective stitching', 'Matching leash']
    },
    zh: {
      title: '小型犬防爆冲胸背带牵引套装',
      desc: '柔软透气防爆冲胸背带，适用 2–8kg 小型犬，可调织带与快拆扣，配牵引绳，反光走线夜行更安全。',
      features: ['适用 2–8kg', '防爆冲透气', '反光走线', '配套牵引绳']
    }
  },
  {
    id: 'p30', sellerId: 'bbm', cat: 'pet', country: 'TR', sub: 'pet-dog-large', featured: true,
    priceMin: 9.8, priceMax: 16, moq: 150, unit: 'set', leadTime: 24,
    terms: ['FOB', 'CIF'], certs: ['OEKO-TEX'], rating: 4.8, orders: 4700, hue: 240,
    en: {
      title: 'Large Dog Harness & Leash for Golden Retriever / Border Collie',
      desc: 'Heavy-duty padded harness for large breeds (20-45kg) such as Golden Retriever and Border Collie. Two leash rings, soft neoprene padding and strong metal buckles.',
      features: ['For large breeds 20–45kg', 'Neoprene padded chest', 'Two leash rings', 'Metal quick-release buckles']
    },
    zh: {
      title: '大型犬胸背带牵引套装（金毛/边牧适用）',
      desc: '加厚衬垫大型犬胸背带，适用 20–45kg 金毛、边牧等，双牵引环设计，柔软氯丁橡胶内衬，金属快拆扣。',
      features: ['适用大型犬 20–45kg', '氯丁橡胶胸垫', '双牵引环', '金属快拆扣']
    }
  },
  {
    id: 'p31', sellerId: 'bbm', cat: 'pet', country: 'IN', sub: 'pet-dog-large', hot: true,
    priceMin: 2.8, priceMax: 5.2, moq: 300, unit: 'pcs', leadTime: 16,
    terms: ['FOB', 'CIF'], certs: ['EN71'], rating: 4.5, orders: 11900, hue: 255,
    en: {
      title: 'Durable Dog Chew Bone for Aggressive Chewers',
      desc: 'Extra-tough nylon chew bone designed for large breeds (Golden Retriever, Lab, Border Collie). Helps clean teeth and lasts longer for aggressive chewers.',
      features: ['Extra-tough nylon', 'For large breeds', 'Teeth-cleaning ridges', 'Long-lasting']
    },
    zh: {
      title: '大型犬耐咬磨牙骨',
      desc: '超强尼龙磨牙骨，专为金毛、拉布拉多、边牧等大型犬设计，帮助清洁牙齿，适合强力啃咬型狗狗。',
      features: ['超强尼龙', '适合大型犬', '洁齿纹路', '持久耐咬']
    }
  },
  {
    id: 'p32', sellerId: 'bbm', cat: 'pet', country: 'VN', sub: 'pet-grooming',
    priceMin: 2.2, priceMax: 4.0, moq: 400, unit: 'pcs', leadTime: 15,
    terms: ['FOB', 'CIF'], certs: ['OEKO-TEX'], rating: 4.4, orders: 6600, hue: 300,
    en: {
      title: 'Double-Sided Pet Grooming Brush (Slicker & Pin)',
      desc: '2-in-1 grooming brush with stainless steel slicker side and rounded pin side. Suitable for cats and dogs including long-haired breeds; removes loose undercoat gently.',
      features: ['Slicker + pin sides', 'Stainless steel pins', 'Gentle rounded tips', 'Cats & dogs']
    },
    zh: {
      title: '宠物双面美容梳（针梳+除毛）',
      desc: '二合一宠物美容梳，不锈钢针梳面与圆头梳面，适合猫与长毛犬种，温和去除浮毛，减少打结。',
      features: ['针梳+除毛双面', '不锈钢针', '圆头防伤', '猫犬通用']
    }
  }
].concat(pendingSeedProducts());

const DEMO_USERS = {
  seller: { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', sellerId: 'bbm', accountType: 'company', jobTitle: '外贸经理', company: '豆豆鼠宠物用品（自营出口）' },
  buyer:  { id: 'u-buyer',  role: 'buyer',  name: 'Thomas Müller', email: 'buyer@demo.com', buyerCompany: 'Müller GmbH', buyerCountry: 'DE', accountType: 'company', jobTitle: 'Purchasing Manager' },
  admin:  { id: 'u-admin',  role: 'admin',  name: '平台管理员', email: 'admin@demo.com', accountType: 'company', jobTitle: '平台运营' }
};

const UNITS = ['set', 'pcs', 'kg', 'ton', 'L'];
const CERT_LIST = ['CE', 'FCC', 'RoHS', 'ISO9001', 'SGS', 'OEKO-TEX', 'GOTS', 'FSC', 'TÜV'];
const TERM_LIST = ['FOB', 'CIF', 'EXW', 'DDP'];
const HS_BY_CAT = { machinery: '8456.11', electronics: '8504.40', textiles: '5208.12', furniture: '9403.60', chemicals: '2918.14', auto: '8504.50', sports: '9506.91', gifts: '9208.10', hardware: '8467.29', pet: '9503.00' };
const FX_RATES = { date: '2026-08-10', USD_CNY: 7.25, USD_EUR: 0.92, USD_JPY: 152, USD_GBP: 0.79 };
const PAYMENT_TERMS = [
  { zh: 'T/T（电汇）', en: 'T/T (bank transfer)' },
  { zh: 'L/C（信用证）', en: 'L/C (letter of credit)' },
  { zh: 'D/P（付款交单）', en: 'D/P (documents against payment)' },
  { zh: '30/70 定金+发货前付清', en: '30/70 deposit + balance before shipment' },
  { zh: 'O/A（赊销）', en: 'O/A (open account)' }
];
/* ---------- pet0.2：宠物自营站数据整理（由 work/pet-data-patch.mjs 生成） ---------- */
const PLATFORM_SELLER_ID = 'bbm';

/* 结构化宠物属性：按细分给老商品补默认值（新商品自带覆盖） */
const PET_ATTR_BY_SUB = {
  'pet-hamster': { pets: ['hamster', 'small-pet'], petSize: 'small' },
  'pet-cat': { pets: ['cat'], petSize: 'medium' },
  'pet-dog-small': { pets: ['dog-small'], petSize: 'small' },
  'pet-dog-large': { pets: ['dog-large'], petSize: 'large' },
  'pet-food': { pets: ['cat', 'dog-small', 'dog-large'], petSize: 'medium' },
  'pet-grooming': { pets: ['cat', 'dog-small', 'dog-large'], petSize: 'medium' },
  'pet-toys': { pets: ['cat', 'dog-small', 'dog-large'], petSize: 'medium' },
  'pet-travel': { pets: ['cat', 'dog-small'], petSize: 'medium' }
};

/* 只保留宠物商品，并统一归到平台自营主体 */
for (let i = PRODUCTS.length - 1; i >= 0; i--) {
  const p = PRODUCTS[i];
  if (p.cat !== 'pet') { PRODUCTS.splice(i, 1); continue; }
  p.sellerId = PLATFORM_SELLER_ID;
  const attr = PET_ATTR_BY_SUB[p.sub] || { pets: ['cat'], petSize: 'medium' };
  if (!p.pets) p.pets = attr.pets;
  if (!p.petSize) p.petSize = attr.petSize;
  if (!p.material) p.material = zhMaterialBySub(p.sub);
}

function zhMaterialBySub(sub) {
  return ({
    'pet-hamster': '环保塑料',
    'pet-cat': '实木 / 塑料',
    'pet-dog-small': '尼龙 / 网布',
    'pet-dog-large': '尼龙 / 橡胶',
    'pet-food': '食品级原料',
    'pet-grooming': 'ABS / 硅胶',
    'pet-toys': '食品级 TPR',
    'pet-travel': 'PC / ABS'
  })[sub] || '复合材料';
}

const PET_EXTRA = [
 {
  "id": "p33",
  "sub": "pet-hamster",
  "min": 4.2,
  "max": 6.8,
  "moq": 300,
  "lead": 18,
  "certs": [
   "CE"
  ],
  "hue": 34,
  "rating": 4.6,
  "orders": 3200,
  "pets": [
   "hamster",
   "small-pet"
  ],
  "size": "small",
  "material": "ABS + 金属网",
  "en": {
   "title": "3-Tier Hamster Cage with Tube Set",
   "desc": "Three-level hamster cage with transparent tubes, exercise wheel, water bottle and hideout. Tool-free assembly, wire spacing 9mm for small pets.",
   "features": [
    "3 levels + tubes",
    "Includes wheel & bottle",
    "9mm wire spacing",
    "Tool-free assembly"
   ]
  },
  "zh": {
   "title": "三层仓鼠笼 含管道套装",
   "desc": "三层结构仓鼠笼，配透明连接管道、跑轮、饮水瓶与躲藏屋，免工具组装，钢丝间距 9mm 适配小宠。",
   "features": [
    "三层结构+管道",
    "含跑轮与饮水瓶",
    "钢丝间距 9mm",
    "免工具组装"
   ]
  }
 },
 {
  "id": "p34",
  "sub": "pet-hamster",
  "min": 2.8,
  "max": 4.5,
  "moq": 500,
  "lead": 20,
  "certs": [
   "CE"
  ],
  "hue": 36,
  "rating": 4.5,
  "orders": 5100,
  "pets": [
   "hamster"
  ],
  "size": "small",
  "material": "PP",
  "en": {
   "title": "Silent Hamster Exercise Wheel 21cm",
   "desc": "Silent-bearing exercise wheel, 21cm diameter, stand or cage-mount, non-slip running surface. Under 30dB at normal running speed.",
   "features": [
    "Silent bearing",
    "21cm diameter",
    "Two mounting ways",
    "Non-slip surface"
   ]
  },
  "zh": {
   "title": "仓鼠静音跑轮 21cm",
   "desc": "静音轴承跑轮，直径 21cm，可立式也可挂笼，防滑跑面，正常奔跑噪音低于 30 分贝。",
   "features": [
    "静音轴承",
    "直径 21cm",
    "两种安装方式",
    "防滑跑面"
   ]
  }
 },
 {
  "id": "p35",
  "sub": "pet-hamster",
  "min": 3.5,
  "max": 5.2,
  "moq": 400,
  "lead": 15,
  "certs": [
   "ISO9001"
  ],
  "hue": 38,
  "rating": 4.4,
  "orders": 2400,
  "pets": [
   "hamster",
   "small-pet"
  ],
  "size": "small",
  "material": "木屑",
  "en": {
   "title": "Dust-Free Small Pet Bedding 10L",
   "desc": "Screened aspen bedding, dust-extracted twice, super absorbent and odour controlling. Safe for hamsters, guinea pigs and rabbits.",
   "features": [
    "Double dust-extracted",
    "High absorbency",
    "Odour control",
    "10L compressed bag"
   ]
  },
  "zh": {
   "title": "小宠无尘垫料 10L",
   "desc": "双层筛分杨木垫料，除尘率高于 99%，吸水量大且抑制异味，仓鼠、豚鼠、兔子通用。",
   "features": [
    "双层除尘",
    "高吸水量",
    "抑制异味",
    "10L 压缩装"
   ]
  }
 },
 {
  "id": "p36",
  "sub": "pet-cat",
  "min": 18,
  "max": 32,
  "moq": 100,
  "lead": 25,
  "certs": [
   "CE",
   "FSC"
  ],
  "hue": 30,
  "rating": 4.8,
  "orders": 6800,
  "pets": [
   "cat"
  ],
  "size": "medium",
  "material": "实木 + 剑麻",
  "en": {
   "title": "Multi-Level Cat Tree 150cm with Sisal Posts",
   "desc": "Floor-to-ceiling cat tree, 150cm, solid wood frame, sisal-wrapped posts, two condos and a hammock. Anti-tip strap included.",
   "features": [
    "150cm, 5 levels",
    "Sisal scratching posts",
    "2 condos + hammock",
    "Anti-tip strap"
   ]
  },
  "zh": {
   "title": "多层猫爬架 150cm 剑麻款",
   "desc": "150cm 多层猫爬架，实木框架，立柱缠剑麻耐抓，含两个猫窝与一个吊床，附防倾倒固定带。",
   "features": [
    "150cm 五层",
    "剑麻耐抓立柱",
    "两窝一吊床",
    "防倾倒固定带"
   ]
  }
 },
 {
  "id": "p37",
  "sub": "pet-cat",
  "min": 1.6,
  "max": 2.6,
  "moq": 1000,
  "lead": 18,
  "certs": [
   "ISO9001"
  ],
  "hue": 28,
  "rating": 4.7,
  "orders": 15200,
  "pets": [
   "cat"
  ],
  "size": "medium",
  "material": "豆腐渣",
  "en": {
   "title": "Tofu Cat Litter Flushable 6L",
   "desc": "Plant-based tofu litter, dust-free, flushable and clumping fast. Light vanilla scent, safe if licked by cats.",
   "features": [
    "Flushable",
    "Low dust",
    "Fast clumping",
    "Plant based"
   ]
  },
  "zh": {
   "title": "豆腐猫砂 可冲厕 6L",
   "desc": "植物基豆腐猫砂，低粉尘、可冲厕、结团快，淡香草味，猫咪误食不担心。",
   "features": [
    "可冲厕",
    "低粉尘",
    "快速结团",
    "植物基"
   ]
  }
 },
 {
  "id": "p38",
  "sub": "pet-cat",
  "min": 7.5,
  "max": 11.5,
  "moq": 300,
  "lead": 22,
  "certs": [
   "CE",
   "RoHS"
  ],
  "hue": 26,
  "rating": 4.6,
  "orders": 4300,
  "pets": [
   "cat",
   "dog-small"
  ],
  "size": "medium",
  "material": "ABS + 304 不锈钢",
  "en": {
   "title": "Automatic Pet Water Fountain 2.5L",
   "desc": "Quiet pump under 40dB, 2.5L capacity, triple filtration with replaceable cotton, visible water level and low-water shut-off.",
   "features": [
    "Under 40dB pump",
    "2.5L capacity",
    "Triple filtration",
    "Dry-run protection"
   ]
  },
  "zh": {
   "title": "宠物自动饮水机 2.5L",
   "desc": "静音水泵低于 40 分贝，2.5L 容量，三重过滤含可换棉芯，水位可视并带缺水断电保护。",
   "features": [
    "低于 40 分贝",
    "2.5L 容量",
    "三重过滤",
    "缺水保护"
   ]
  }
 },
 {
  "id": "p39",
  "sub": "pet-dog-small",
  "min": 3.2,
  "max": 5.4,
  "moq": 500,
  "lead": 20,
  "certs": [
   "CE"
  ],
  "hue": 24,
  "rating": 4.7,
  "orders": 9100,
  "pets": [
   "dog-small"
  ],
  "size": "small",
  "material": "尼龙 + 网布",
  "en": {
   "title": "Small Dog Harness with Reflective Trim",
   "desc": "Step-in harness for small breeds, padded mesh chest, reflective piping for night walks, four adjustable points, sizes XS–M.",
   "features": [
    "Step-in design",
    "Reflective piping",
    "4-point adjustable",
    "XS / S / M"
   ]
  },
  "zh": {
   "title": "小型犬胸背带 反光可调",
   "desc": "小型犬免套头胸背带，胸口网布加厚减压，侧边反光条夜间可见，四处可调，尺码 XS–M。",
   "features": [
    "免套头穿脱",
    "反光条设计",
    "四处可调",
    "XS/S/M 三码"
   ]
  }
 },
 {
  "id": "p40",
  "sub": "pet-dog-small",
  "min": 4.5,
  "max": 7.2,
  "moq": 400,
  "lead": 25,
  "certs": [
   "CE"
  ],
  "hue": 22,
  "rating": 4.5,
  "orders": 3600,
  "pets": [
   "dog-small",
   "dog-large"
  ],
  "size": "small",
  "material": "PU + 摇粒绒",
  "en": {
   "title": "Waterproof Dog Raincoat with Reflective Stripe",
   "desc": "PU-coated raincoat, taped seams, fleece lining, hood with elastic, harness opening. Available in 5 sizes with reflective back stripe.",
   "features": [
    "Waterproof PU shell",
    "Warm fleece lining",
    "Harness opening",
    "5 sizes"
   ]
  },
  "zh": {
   "title": "宠物雨衣 防水反光条",
   "desc": "PU 涂层防水雨衣，接缝压胶，内里摇粒绒保暖，带帽子与牵引开孔，背面反光条，5 个尺码。",
   "features": [
    "PU 防水面料",
    "摇粒绒内里",
    "牵引绳开孔",
    "5 个尺码"
   ]
  }
 },
 {
  "id": "p41",
  "sub": "pet-dog-large",
  "min": 6.8,
  "max": 10.5,
  "moq": 300,
  "lead": 22,
  "certs": [
   "CE"
  ],
  "hue": 20,
  "rating": 4.8,
  "orders": 7200,
  "pets": [
   "dog-large"
  ],
  "size": "large",
  "material": "尼龙 + 减压棉",
  "en": {
   "title": "Heavy-Duty Dog Harness for Large Breeds",
   "desc": "Padded harness for 30–60kg dogs, weight-spreading chest plate, metal D-ring, neoprene lining, tested to 400kg pull.",
   "features": [
    "For 30–60kg dogs",
    "Metal D-ring",
    "Neoprene padding",
    "400kg pull tested"
   ]
  },
  "zh": {
   "title": "大型犬加厚减压胸背带",
   "desc": "面向 30–60kg 大型犬，胸板分散拉力，配金属 D 环与氯丁橡胶内衬，通过 400kg 拉力测试。",
   "features": [
    "适用 30–60kg",
    "金属 D 环",
    "氯丁橡胶内衬",
    "400kg 拉力测试"
   ]
  }
 },
 {
  "id": "p42",
  "sub": "pet-dog-large",
  "min": 2.9,
  "max": 4.8,
  "moq": 600,
  "lead": 18,
  "certs": [
   "CE"
  ],
  "hue": 18,
  "rating": 4.6,
  "orders": 11400,
  "pets": [
   "dog-large"
  ],
  "size": "large",
  "material": "天然橡胶",
  "en": {
   "title": "Indestructible Natural Rubber Chew Toy",
   "desc": "Solid natural rubber chew toy for aggressive chewers, treat-stuffable, vanilla scented, dishwasher safe. Three sizes.",
   "features": [
    "For aggressive chewers",
    "Treat stuffing hole",
    "Food-grade rubber",
    "3 sizes"
   ]
  },
  "zh": {
   "title": "大型犬耐咬橡胶玩具",
   "desc": "天然实心橡胶材质，适合撕咬力强的犬种，中空可塞零食，香草味，可机洗，三个尺码。",
   "features": [
    "耐撕咬设计",
    "可塞零食",
    "食品级橡胶",
    "三个尺码"
   ]
  }
 },
 {
  "id": "p43",
  "sub": "pet-dog-large",
  "min": 3.6,
  "max": 5.8,
  "moq": 400,
  "lead": 20,
  "certs": [
   "CE"
  ],
  "hue": 16,
  "rating": 4.5,
  "orders": 4800,
  "pets": [
   "dog-large",
   "cat"
  ],
  "size": "large",
  "material": "304 不锈钢 + 硅胶",
  "en": {
   "title": "Collapsible Double Dog Bowl with Silicone Base",
   "desc": "Two stainless steel bowls in a folding silicone base, non-slip feet, carry strap. Ideal for travel, hiking and camping.",
   "features": [
    "Collapsible design",
    "Non-slip silicone base",
    "Two 400ml bowls",
    "Carry strap"
   ]
  },
  "zh": {
   "title": "折叠双碗 不锈钢+硅胶底座",
   "desc": "硅胶折叠底座内嵌两个 304 不锈钢碗，底部防滑，带提手，适合出行、徒步与露营。",
   "features": [
    "可折叠收纳",
    "硅胶防滑底",
    "双碗各 400ml",
    "便携提手"
   ]
  }
 },
 {
  "id": "p44",
  "sub": "pet-food",
  "min": 3.8,
  "max": 6.2,
  "moq": 500,
  "lead": 30,
  "certs": [
   "HACCP",
   "ISO22000"
  ],
  "hue": 40,
  "rating": 4.8,
  "orders": 13600,
  "pets": [
   "cat",
   "dog-small",
   "dog-large"
  ],
  "size": "medium",
  "material": "冻干鸡肉",
  "en": {
   "title": "Freeze-Dried Chicken Training Treats",
   "desc": "Single-ingredient freeze-dried chicken breast, no additives or grains. High protein, easy to break, 100g resealable pouch.",
   "features": [
    "Single ingredient",
    "No grain or additives",
    "Easy to break",
    "100g pouch"
   ]
  },
  "zh": {
   "title": "冻干鸡胸肉训练零食",
   "desc": "单一原料冻干鸡胸肉，无添加剂无谷物，高蛋白易掰小块，适合训练奖励，100g 自封袋装。",
   "features": [
    "单一原料",
    "无谷物添加",
    "易掰小块",
    "100g 自封袋"
   ]
  }
 },
 {
  "id": "p45",
  "sub": "pet-food",
  "min": 1.5,
  "max": 2.4,
  "moq": 2000,
  "lead": 28,
  "certs": [
   "HACCP"
  ],
  "hue": 42,
  "rating": 4.7,
  "orders": 18700,
  "pets": [
   "cat"
  ],
  "size": "medium",
  "material": "湿粮罐装",
  "en": {
   "title": "Grain-Free Cat Wet Food Can 85g",
   "desc": "Grain-free wet food with 70% meat content, no artificial colours, taurine added. Six flavours, 85g cans, 24 cans per carton.",
   "features": [
    "70% meat content",
    "Grain free",
    "Taurine added",
    "6 flavours"
   ]
  },
  "zh": {
   "title": "无谷猫用主食罐 85g",
   "desc": "无谷配方湿粮，肉含量 70%，无人工色素，添加牛磺酸，六种口味，85g 罐装，每箱 24 罐。",
   "features": [
    "肉含量 70%",
    "无谷配方",
    "添加牛磺酸",
    "六种口味"
   ]
  }
 },
 {
  "id": "p46",
  "sub": "pet-food",
  "min": 2.2,
  "max": 3.6,
  "moq": 800,
  "lead": 25,
  "certs": [
   "HACCP"
  ],
  "hue": 44,
  "rating": 4.5,
  "orders": 7600,
  "pets": [
   "dog-small",
   "dog-large"
  ],
  "size": "medium",
  "material": "洁牙棒",
  "en": {
   "title": "Dental Chew Sticks with Mint for Dogs",
   "desc": "Textured dental chew sticks with mint and chlorophyll, reduces plaque and tartar, no rawhide. Sizes for small and large dogs.",
   "features": [
    "Mint + chlorophyll",
    "No rawhide",
    "Tartar reducing",
    "Small / large sizes"
   ]
  },
  "zh": {
   "title": "犬用薄荷洁牙棒",
   "desc": "带纹理洁牙棒，添加薄荷与叶绿素，帮助减少牙菌斑与牙结石，不含生皮，分小型犬与大型犬两种尺寸。",
   "features": [
    "薄荷+叶绿素",
    "不含生皮",
    "减少牙结石",
    "双尺寸可选"
   ]
  }
 },
 {
  "id": "p47",
  "sub": "pet-grooming",
  "min": 8.5,
  "max": 13.5,
  "moq": 200,
  "lead": 25,
  "certs": [
   "CE",
   "RoHS"
  ],
  "hue": 46,
  "rating": 4.6,
  "orders": 3900,
  "pets": [
   "cat",
   "dog-small",
   "dog-large"
  ],
  "size": "medium",
  "material": "ABS + 陶瓷刀头",
  "en": {
   "title": "Low-Noise Pet Clipper Kit with Ceramic Blade",
   "desc": "Cordless clipper under 50dB, ceramic blade stays cool, 4 guide combs, 2-hour runtime, USB-C charging, for cats and dogs.",
   "features": [
    "Under 50dB",
    "Ceramic blade",
    "4 guide combs",
    "USB-C, 2h runtime"
   ]
  },
  "zh": {
   "title": "宠物静音电推剪 陶瓷刀头",
   "desc": "无线推剪噪音低于 50 分贝，陶瓷刀头不易发烫，含 4 个限位梳，续航 2 小时，USB-C 充电，猫犬通用。",
   "features": [
    "低于 50 分贝",
    "陶瓷刀头",
    "4 个限位梳",
    "USB-C 续航 2h"
   ]
  }
 },
 {
  "id": "p48",
  "sub": "pet-grooming",
  "min": 3.1,
  "max": 5.2,
  "moq": 500,
  "lead": 20,
  "certs": [
   "OEKO-TEX"
  ],
  "hue": 48,
  "rating": 4.7,
  "orders": 8800,
  "pets": [
   "cat",
   "dog-small",
   "dog-large"
  ],
  "size": "medium",
  "material": "超细纤维",
  "en": {
   "title": "Microfibre Pet Drying Towel 80x40cm",
   "desc": "Ultra-absorbent microfibre towel, absorbs 6x its weight, machine washable, with hand pockets for drying large dogs.",
   "features": [
    "Absorbs 6x weight",
    "Hand pockets",
    "Machine washable",
    "80x40cm"
   ]
  },
  "zh": {
   "title": "宠物吸水毛巾 80x40cm",
   "desc": "超细纤维吸水毛巾，可吸自重 6 倍水分，两侧带手插袋便于擦干大型犬，可机洗反复使用。",
   "features": [
    "吸水自重 6 倍",
    "两侧手插袋",
    "可机洗",
    "80x40cm"
   ]
  }
 },
 {
  "id": "p49",
  "sub": "pet-grooming",
  "min": 1.8,
  "max": 3.2,
  "moq": 800,
  "lead": 18,
  "certs": [
   "CE"
  ],
  "hue": 50,
  "rating": 4.5,
  "orders": 10500,
  "pets": [
   "cat",
   "dog-small"
  ],
  "size": "small",
  "material": "硅胶",
  "en": {
   "title": "Silicone Pet Bath Brush with Shampoo Dispenser",
   "desc": "Soft silicone massage brush with built-in shampoo bottle, 2.5mm rounded bristles, gentle on skin, easy to clean.",
   "features": [
    "Built-in dispenser",
    "2.5mm soft bristles",
    "Massage & clean",
    "Easy to rinse"
   ]
  },
  "zh": {
   "title": "硅胶洗澡刷 带沐浴露仓",
   "desc": "软硅胶按摩洗澡刷，内置沐浴露仓，2.5mm 圆头刷毛不伤皮肤，边洗边按摩，易冲洗。",
   "features": [
    "内置沐浴仓",
    "2.5mm 软刷毛",
    "按摩清洁二合一",
    "易冲洗"
   ]
  }
 },
 {
  "id": "p50",
  "sub": "pet-toys",
  "min": 1.2,
  "max": 2.2,
  "moq": 1000,
  "lead": 18,
  "certs": [
   "CE"
  ],
  "hue": 52,
  "rating": 4.6,
  "orders": 16800,
  "pets": [
   "cat"
  ],
  "size": "small",
  "material": "羽毛 + 木质杆",
  "en": {
   "title": "Interactive Cat Wand Toy Set with 5 Replacements",
   "desc": "Retractable wand with five interchangeable heads (feather, bell, ribbon, mouse, fish), natural wood handle, no sharp edges.",
   "features": [
    "5 replaceable heads",
    "Retractable wand",
    "Natural wood handle",
    "Safe bell"
   ]
  },
  "zh": {
   "title": "逗猫棒套装 含 5 个替换头",
   "desc": "可伸缩逗猫棒，配羽毛、铃铛、丝带、老鼠、鱼形五个替换头，木质手柄无毛刺，收纳方便。",
   "features": [
    "5 个替换头",
    "可伸缩杆身",
    "木质把手",
    "安全铃铛"
   ]
  }
 },
 {
  "id": "p51",
  "sub": "pet-toys",
  "min": 2.4,
  "max": 3.9,
  "moq": 600,
  "lead": 20,
  "certs": [
   "CE"
  ],
  "hue": 54,
  "rating": 4.7,
  "orders": 9200,
  "pets": [
   "cat",
   "dog-small",
   "dog-large"
  ],
  "size": "medium",
  "material": "食品级 TPR",
  "en": {
   "title": "Treat Dispensing Puzzle Ball",
   "desc": "Adjustable-difficulty treat ball, food-grade TPR, dishwasher safe, slows eating and relieves boredom. Two sizes.",
   "features": [
    "Adjustable difficulty",
    "Food-grade TPR",
    "Dishwasher safe",
    "Slows eating"
   ]
  },
  "zh": {
   "title": "漏食益智球",
   "desc": "可调难度漏食球，食品级 TPR 材质，可洗碗机清洗，减缓进食速度、缓解无聊，两个尺码。",
   "features": [
    "难度可调",
    "食品级 TPR",
    "可机洗",
    "减缓进食"
   ]
  }
 },
 {
  "id": "p52",
  "sub": "pet-travel",
  "min": 14,
  "max": 24,
  "moq": 200,
  "lead": 25,
  "certs": [
   "IATA",
   "CE"
  ],
  "hue": 56,
  "rating": 4.7,
  "orders": 3400,
  "pets": [
   "cat",
   "dog-small"
  ],
  "size": "medium",
  "material": "PP + 金属门",
  "en": {
   "title": "IATA-Approved Airline Pet Carrier",
   "desc": "IATA-compliant pet crate with steel door, ventilation on four sides, spring latches and tie-down points for airline travel.",
   "features": [
    "IATA compliant",
    "4-side ventilation",
    "Steel door + latch",
    "Tie-down points"
   ]
  },
  "zh": {
   "title": "IATA 认证宠物航空箱",
   "desc": "符合 IATA 运输标准，金属门配弹簧锁扣，四面通风，底部固定孔位，可托运。",
   "features": [
    "IATA 标准",
    "四面通风",
    "金属门+锁扣",
    "底部固定孔"
   ]
  }
 },
 {
  "id": "p53",
  "sub": "pet-travel",
  "min": 9.5,
  "max": 15.5,
  "moq": 300,
  "lead": 22,
  "certs": [
   "CE"
  ],
  "hue": 58,
  "rating": 4.6,
  "orders": 5600,
  "pets": [
   "cat",
   "dog-small"
  ],
  "size": "small",
  "material": "PC + 透气网",
  "en": {
   "title": "Space Capsule Pet Backpack 360° Ventilated",
   "desc": "Transparent capsule backpack with breathable mesh panels, padded straps, removable mat and internal safety leash.",
   "features": [
    "360° ventilation",
    "Padded shoulder straps",
    "Removable mat",
    "Internal safety leash"
   ]
  },
  "zh": {
   "title": "太空舱宠物背包 全透气",
   "desc": "透明太空舱背包，侧面大面积透气网，肩带加厚减压，内垫可拆洗，内置安全挂钩。",
   "features": [
    "四面透气",
    "加厚肩带",
    "内垫可拆洗",
    "内置安全挂钩"
   ]
  }
 },
 {
  "id": "p54",
  "sub": "pet-travel",
  "min": 11.5,
  "max": 18.5,
  "moq": 200,
  "lead": 28,
  "certs": [
   "CE",
   "RoHS"
  ],
  "hue": 60,
  "rating": 4.5,
  "orders": 2700,
  "pets": [
   "cat",
   "dog-small",
   "dog-large"
  ],
  "size": "medium",
  "material": "ABS + 电子模块",
  "en": {
   "title": "Smart Pet Feeder 6L with App Control",
   "desc": "6L WiFi feeder, 1–10 meals per day with portion control, voice recording, dual power (adapter + battery backup), BPA-free bin.",
   "features": [
    "6L sealed bin",
    "App scheduling",
    "Voice recording",
    "Battery backup"
   ]
  },
  "zh": {
   "title": "智能宠物喂食器 6L WiFi",
   "desc": "6L 密封粮桶，App 定时定量（每日 1–10 餐），支持录音呼唤，适配器+电池双供电，粮桶 BPA-free。",
   "features": [
    "6L 密封粮桶",
    "App 定时定量",
    "录音呼唤",
    "断电电池续航"
   ]
  }
 }
];

for (const p of PET_EXTRA) {
  PRODUCTS.push({
    id: p.id, sellerId: PLATFORM_SELLER_ID, cat: 'pet', country: 'CN', sub: p.sub,
    priceMin: p.min, priceMax: p.max, moq: p.moq, unit: 'pcs', leadTime: p.lead,
    terms: ['FOB', 'CIF', 'EXW'], certs: p.certs, rating: p.rating, orders: p.orders, hue: p.hue,
    pets: p.pets, petSize: p.size, material: p.material,
    en: p.en, zh: p.zh
  });
}

/* 宠物属性 → 展示标签 */
const PET_LABELS = {
  'hamster': { zh: '仓鼠', en: 'Hamster' },
  'small-pet': { zh: '小宠', en: 'Small pet' },
  'cat': { zh: '猫', en: 'Cat' },
  'dog-small': { zh: '小型犬', en: 'Small dog' },
  'dog-large': { zh: '大型犬', en: 'Large dog' }
};
const PET_SIZE_LABELS = {
  'small': { zh: '小型', en: 'Small' },
  'medium': { zh: '中型', en: 'Medium' },
  'large': { zh: '大型', en: 'Large' }
};
function petLabel(code) { return PET_LABELS[code] || { zh: code, en: code }; }
function petSizeLabel(code) { return PET_SIZE_LABELS[code] || { zh: code, en: code }; }

const INCOTERMS = [
  { code: 'EXW', zh: '工厂交货：买方负责从工厂提货后的全部运输与费用', en: 'Ex Works: buyer arranges all transport after pickup at seller premises' },
  { code: 'FOB', zh: '装运港船上交货：卖方承担货物装船前的费用与风险', en: 'Free On Board: seller covers costs and risk until goods are on board' },
  { code: 'CIF', zh: '成本+保险费+运费：卖方承担至目的港的运费与保险费', en: 'Cost, Insurance & Freight: seller covers freight and insurance to destination port' },
  { code: 'DDP', zh: '完税后交货：卖方承担运输、保险及进口清关与税费', en: 'Delivered Duty Paid: seller bears transport, insurance and import duties' }
];

const MARKET_COMPLIANCE = {
  CN: {
    zh: '中国（出口）', en: 'China (export)',
    items: ['出口许可证检查（2026 年 43 类管制商品）', '出口管制属性申报（禁限管制识别码）', 'HS 编码与报关单如实申报']
  },
  EU: {
    zh: '欧盟', en: 'EU',
    items: ['CE 标志（适用产品）', 'RoHS / REACH 化学品合规', 'CBAM 申报（钢、铝、水泥、化肥、氢、电力）', '包装与 WEEE 指令', '进口商 EORI 注册']
  },
  US: {
    zh: '美国', en: 'US',
    items: ['FCC（电子射频产品）', 'UL / ETL（安规认证）', 'FDA（食品接触、医疗器械、化妆品）', 'CPSC（消费品安全）', 'Section 301 关税税率核实', '小额包裹 de minimis 新规']
  },
  JP: {
    zh: '日本', en: 'Japan',
    items: ['PSE（电气用品安全法）', 'JIS / 食品卫生法（适用产品）', '受管制商品进口许可']
  },
  ASIA: {
    zh: '亚太·RCEP', en: 'Asia · RCEP',
    items: ['RCEP 原产地证书（享关税减让）', '目的国认证（各成员不同）', '原产地规则核查']
  },
  AU: {
    zh: '澳大利亚', en: 'Australia',
    items: ['RCM（电气产品）', 'ACMA 合规', '生物安全进口条件']
  }
};

const MARKETS_BY_PRODUCT = {
  p1: ['CN', 'EU', 'US'], p2: ['CN', 'ASIA'], p3: ['EU', 'US'], p4: ['EU', 'ASIA'],
  p5: ['US', 'EU'], p6: ['EU', 'US'], p7: ['EU', 'AU'], p8: ['US', 'EU'],
  p9: ['ASIA', 'US'], p10: ['EU', 'US'], p11: ['EU', 'US'], p12: ['ASIA'],
  p13: ['EU', 'US'], p14: ['EU'], p15: ['EU'], p16: ['EU', 'US'],
  p17: ['EU', 'US', 'ASIA'], p18: ['EU', 'US'], p19: ['EU', 'US'], p20: ['US', 'EU'],
  p21: ['EU', 'US', 'ASIA'], p22: ['US', 'EU'], p23: ['EU', 'US', 'ASIA'], p24: ['EU', 'US'],
  p25: ['EU', 'US', 'ASIA'], p26: ['EU', 'US'], p27: ['EU', 'US'], p28: ['EU', 'US', 'ASIA'],
  p29: ['EU', 'US', 'ASIA'], p30: ['EU', 'US'], p31: ['EU', 'US'], p32: ['EU', 'US', 'ASIA']
};

/* pet0.2：新增概念商品补默认目标市场（宠物用品主销欧美与亚洲） */
for (const _p of PRODUCTS) {
  if (!MARKETS_BY_PRODUCT[_p.id]) MARKETS_BY_PRODUCT[_p.id] = ['EU', 'US', 'ASIA'];
}

/* 演示用中英短语翻译库（正式版接入 AI 翻译服务） */
const TRANSLATION_DICT = [
  ['您好', 'Hello'], ['你好', 'Hi'], ['感谢', 'Thank you'], ['谢谢', 'Thanks'], ['麻烦', 'Please'],
  ['我对', 'We are interested in'], ['很感兴趣', 'very interested in'], ['感兴趣', 'interested in'],
  ['请报价', 'please quote'], ['报价', 'quotation'], ['询盘', 'inquiry'], ['回复', 'reply'],
  ['最佳价格', 'best price'], ['请告知', 'please inform'], ['请确认', 'please confirm'],
  ['全套', 'full set of'], ['单据', 'documents'], ['装箱单', 'packing list'], ['提单', 'bill of lading (B/L)'],
  ['原产地证', 'certificate of origin'], ['欢迎', 'welcome'], ['进一步', 'further'], ['沟通', 'discussion'],
  ['预计', 'estimated'], ['如需', 'if needed'], ['收到', 'receive'], ['发货前', 'before shipment'],
  ['先寄样', 'samples first'], ['寄样', 'send samples'], ['贵司', 'your company'], ['期待', 'look forward to'],
  ['请查收', 'please find attached'], ['随附', 'attached'], ['含', 'including'], ['确认后', 'after confirmation'],
  ['数量', 'quantity'], ['单价', 'unit price'], ['价格', 'price'], ['金额', 'amount'],
  ['总价', 'total amount'], ['发货', 'shipment'], ['交期', 'lead time'], ['交货期', 'delivery time'],
  ['样品', 'sample'], ['认证', 'certification'], ['证书', 'certificate'], ['检测报告', 'test report'],
  ['支付', 'payment'], ['包装', 'packaging'], ['发票', 'invoice'], ['订单', 'order'],
  ['优惠', 'discount'], ['折扣', 'discount'], ['美元', 'USD'], ['人民币', 'CNY'], ['欧元', 'EUR'],
  ['请问', 'Could you please'], ['尽快', 'as soon as possible'], ['希望', 'we hope'],
  ['工厂', 'factory'], ['港口', 'port'], ['运费', 'freight'], ['保险', 'insurance'],
  ['合同', 'contract'], ['定金', 'deposit'], ['尾款', 'balance'], ['信用证', 'letter of credit (L/C)'],
  ['质量', 'quality'], ['规格', 'specification'], ['定制', 'customized'], ['原产地', 'origin'],
  ['有效期', 'validity'], ['包含', 'including'], ['需要', 'need'], ['可以', 'can'],
  ['请确认', 'please confirm'], ['到货', 'arrival'], ['目的港', 'destination port'], ['装运港', 'loading port'],
  ['MOQ', 'minimum order quantity'], ['起订量', 'MOQ'], ['数量', 'quantity'],
  ['carbon border', '碳边境'], ['tariff', '关税'], ['duty', '关税'], ['customs', '海关'],
  ['compliance', '合规'], ['certification', '认证'], ['shipment', '发货'], ['payment', '支付'],
  ['price', '价格'], ['quantity', '数量'], ['sample', '样品'], ['invoice', '发票'],
  ['quotation', '报价'], ['inquiry', '询盘'], ['delivery', '交货'], ['warehouse', '仓库'],
  ['order', '订单'], ['discount', '折扣'], ['quality', '质量'], ['factory', '工厂'],
  ['best price', '最优价格'], ['please inform', '请告知'], ['please confirm', '请确认'],
  ['packing list', '装箱单'], ['certificate of origin', '原产地证'], ['welcome', '欢迎'],
  ['further', '进一步'], ['discussion', '沟通'], ['estimated', '预计'], ['if needed', '如需'],
  ['look forward to', '期待'], ['attached', '随附'], ['including', '包含'], ['before shipment', '发货前']
];

const NEWS_CATS = [
  { id: 'all', zh: '全部', en: 'All' },
  { id: 'policy', zh: '政策法规', en: 'Policies' },
  { id: 'tariff', zh: '关税', en: 'Tariffs' },
  { id: 'compliance', zh: '合规申报', en: 'Compliance' },
  { id: 'ecommerce', zh: '跨境电商', en: 'Cross-border e-commerce' },
  { id: 'logistics', zh: '物流通关', en: 'Logistics & customs' },
  { id: 'macro', zh: '宏观数据', en: 'Macro & data' }
];

const NEWS_REGIONS = [
  { id: 'CN', zh: '中国', en: 'China' },
  { id: 'EU', zh: '欧盟', en: 'EU' },
  { id: 'US', zh: '美国', en: 'US' },
  { id: 'ASIA', zh: '亚太·RCEP', en: 'Asia · RCEP' },
  { id: 'GLOBAL', zh: '全球', en: 'Global' }
];

const NEWS_ITEMS = [
  {
    id: 'n1', date: '2026-08-08', region: 'CN', cat: 'policy', highlight: false,
    source: '中国商务部', sourceUrl: 'http://www.mofcom.gov.cn/cms_files/filemanager/policySummary/viewcore_f7a611068b084ac9b14080a1d3d742db.html',
    zh: { title: '出口许可证管理货物目录（2026年）施行', summary: '自2026年1月1日起，43种出口货物实行许可证管理，涵盖小麦、玉米、大米、原油、新车等；商务部、海关总署2024年第65号公告同时废止。' },
    en: { title: 'China’s 2026 export licensing catalogue takes effect', summary: 'From 1 Jan 2026, 43 export categories (wheat, corn, rice, crude oil, new vehicles, etc.) require export licences; the 2024 No.65 announcement is repealed.' }
  },
  {
    id: 'n2', date: '2026-06-16', region: 'CN', cat: 'compliance', highlight: false,
    source: '贸法通（海关公告解读）', sourceUrl: 'https://www.ctils.com/articles/26606',
    zh: { title: '出口管制申报新规：报关单新增“禁限管制识别码”', summary: '海关总署2026年第40、77、78号公告，在出口报关单中新增“禁限管制识别码”与“禁限管制申报要素”，要求企业按商品敏感程度如实申报管制属性。' },
    en: { title: 'New export-control declaration rules: “prohibited/restricted control code” added', summary: 'GACC announcements No.40/77/78 (2026) add a control-attribute identification code and declaration elements to export customs forms.' }
  },
  {
    id: 'n3', date: '2026-05-13', region: 'CN', cat: 'ecommerce', highlight: false,
    source: '财政部·海关总署·税务总局', sourceUrl: 'https://policy.mofcom.gov.cn/claw/clawContent.shtml?id=104934',
    zh: { title: '跨境电商出口退运税收优惠：6个月内退运免征进口税', summary: '2026年1月1日至2027年12月31日，1210/9610/9710/9810项下出口商品（不含食品）因滞销、退货6个月内原状退运进境，免征进口关税、进口环节增值税和消费税，已缴出口关税退还。' },
    en: { title: 'Tax relief for cross-border e-commerce returns: 6-month window', summary: 'Goods exported under customs codes 1210/9610/9710/9810 (non-food) and returned in original condition within 6 months are exempt from import duties, VAT and consumption tax through 2027.' }
  },
  {
    id: 'n4', date: '2026-05-13', region: 'CN', cat: 'logistics', highlight: false,
    source: '海关总署', sourceUrl: 'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2026/art_3db24e4b76784738a17196c585795546.html',
    zh: { title: '海关推广跨境电商零售出口跨关区退货（9610）', summary: '海关总署公告2026年第24号：9610模式下零售出口退货商品可跨关区退回，退回商品仅允许退至开展该业务的海关监管作业场所。' },
    en: { title: 'GACC extends cross-district returns for 9610 retail exports', summary: 'Announcement 2026 No.24 allows 9610 cross-border retail export returns across customs districts, back to the original supervised site.' }
  },
  {
    id: 'n5', date: '2026-06-30', region: 'EU', cat: 'compliance', highlight: true,
    source: '欧盟委员会（税务与海关）', sourceUrl: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    zh: { title: '欧盟碳边境调节机制（CBAM）进入正式实施阶段', summary: '2026年1月起CBAM进入正式期，覆盖钢铁、铝、水泥、化肥、氢与电力。进口商须注册为授权CBAM申报人；2026进口年的首份年度申报应于2027年9月30日前提交，碳证书自2027年2月起可购买。' },
    en: { title: 'EU CBAM enters its definitive phase', summary: 'Since Jan 2026 CBAM covers steel, aluminium, cement, fertilisers, hydrogen and electricity. Importers must register as authorized declarants; the first annual declaration for 2026 imports is due by 30 Sep 2027.' }
  },
  {
    id: 'n6', date: '2026-06-25', region: 'ASIA', cat: 'tariff', highlight: true,
    source: '河南省人民政府网', sourceUrl: 'https://www.henan.gov.cn/2026/06-26/3369202.html',
    zh: { title: 'RCEP 关税进一步下调，原产地证书红利扩大', summary: '2026年2月1日起RCEP在电子、汽车零部件、纺织等领域进一步降税；企业凭RCEP原产地证书可享关税减让（如铝箔出口关税降至5.2%），未来十年仍将逐年下调。' },
    en: { title: 'RCEP tariff cuts deepen; origin certificates deliver savings', summary: 'From 1 Feb 2026 RCEP tariff reductions deepened in electronics, auto parts and textiles. Preferential rates (e.g., aluminium foil at 5.2%) will keep falling over the next decade.' }
  },
  {
    id: 'n7', date: '2026-08-03', region: 'US', cat: 'tariff', highlight: true,
    source: 'World Ports 报道', sourceUrl: 'https://www.worldports.org/china-low-value-package-tariff-exemption-ends-but-questions-remain-over-us-collections/',
    zh: { title: '美国对华关税与小额包裹新规持续影响出口', summary: 'Section 301 对华关税维持（部分品类7.5%–145%+）；中国小额包裹免税（de minimis）已取消，其他国家和地区免税额由800美元降至50美元，低值包裹出口需如实申报关税。' },
    en: { title: 'US tariffs and the end of China’s de minimis exemption', summary: 'Section 301 tariffs on China remain (7.5%–145%+ by category); the duty-free de minimis exemption for low-value Chinese shipments is suspended, and the threshold for other countries fell from US$800 to US$50.' }
  },
  {
    id: 'n8', date: '2026-03-19', region: 'GLOBAL', cat: 'macro', highlight: false,
    source: '世贸组织（报告）', sourceUrl: 'https://en.gmw.cn/2026-03/20/content_38659238.htm',
    zh: { title: 'WTO：2026年全球货物贸易增速预计放缓至1.9%', summary: '世贸组织《全球贸易展望与统计》预计，2026年全球货物贸易量增长1.9%（2025年为4.6%），2027年回升至2.6%；中东局势等不确定性构成下行压力。' },
    en: { title: 'WTO: global goods trade growth to slow to 1.9% in 2026', summary: 'The WTO Global Trade Outlook projects merchandise trade volume growth of 1.9% in 2026 (down from 4.6% in 2025), recovering to 2.6% in 2027.' }
  },
  {
    id: 'n9', date: '2026-02-10', region: 'EU', cat: 'tariff', highlight: false,
    source: '路透社 Factbox', sourceUrl: 'https://ca.finance.yahoo.com/news/factbox-eu-tariffs-imports-china-115318183.html',
    zh: { title: '欧盟对中国产电动汽车加征关税 7.8%–35.3%', summary: '2026年2月欧盟委员会批准对中国产电动汽车加征额外关税（在10%基础汽车关税之上，各厂商7.8%–35.3%），具体税率视是否配合调查而定。' },
    en: { title: 'EU confirms tariffs of 7.8%–35.3% on China-built EVs', summary: 'In Feb 2026 the Commission approved additional duties on Chinese-built EVs, on top of the standard 10% car duty, with rates varying by manufacturer.' }
  },
  {
    id: 'n10', date: '2026-07-22', region: 'CN', cat: 'ecommerce', highlight: false,
    source: '中国网', sourceUrl: 'http://news.china.com.cn/2026-07/22/content_118612204.html',
    zh: { title: '海关总署：为跨境电商“量身定制”监管方案', summary: '“十五五”期间海关将推进通关提速、物流畅通、规范管理：优化退货与海外仓退运，支持公路运输“一次申报、一证到底、一车直达”，并探索关企数据直联与风险前置拦截。' },
    en: { title: 'GACC to tailor supervision for cross-border e-commerce', summary: 'For the 15th Five-Year period, customs will speed up clearance and returns via overseas warehouses, support “one declaration, one pass” road exports and explore customs–platform data sharing.' }
  }
];

const SOURCE_DIRECTORY = [
  { name: '中国海关总署', url: 'https://www.customs.gov.cn', note: { zh: '关税、HS编码、进出口监管公告', en: 'Tariffs, HS codes, import/export notices' } },
  { name: '中国商务部', url: 'https://www.mofcom.gov.cn', note: { zh: '外贸政策、许可证目录、贸易救济', en: 'Trade policy, licensing catalogues, trade remedies' } },
  { name: '中国国际贸易促进委员会', url: 'https://www.ccpit.org', note: { zh: '原产地证书、商事认证', en: 'Certificates of origin, commercial certification' } },
  { name: '中国出口信用保险公司', url: 'https://www.sinosure.com.cn', note: { zh: '国别风险、出口信用保险', en: 'Country risk, export credit insurance' } },
  { name: '世贸组织 WTO', url: 'https://www.wto.org', note: { zh: '贸易规则、争端解决与统计', en: 'Trade rules, disputes and statistics' } },
  { name: '欧盟委员会税务与海关', url: 'https://taxation-customs.ec.europa.eu', note: { zh: '欧盟关税、CBAM、进口要求', en: 'EU tariffs, CBAM, import requirements' } },
  { name: '美国贸易代表办公室 USTR', url: 'https://ustr.gov', note: { zh: 'Section 301/232 调查与关税', en: 'Section 301/232 investigations and tariffs' } },
  { name: '美国海关与边境保护局 CBP', url: 'https://www.cbp.gov', note: { zh: '进口程序、de minimis、合规', en: 'Entry process, de minimis, compliance' } },
  { name: '国际贸易中心 ITC · Market Access Map', url: 'https://www.macmap.org', note: { zh: '全球关税与市场准入查询', en: 'Global tariffs and market access queries' } },
  { name: '联合国商品贸易统计 UN Comtrade', url: 'https://comtradeplus.un.org', note: { zh: '双边贸易数据', en: 'Bilateral trade data' } }
];

const COUNTRY_NAMES = {
  CN: { zh: '中国', en: 'China' },
  VN: { zh: '越南', en: 'Vietnam' },
  TR: { zh: '土耳其', en: 'Turkey' },
  IN: { zh: '印度', en: 'India' },
  DE: { zh: '德国', en: 'Germany' },
  ES: { zh: '西班牙', en: 'Spain' },
  JP: { zh: '日本', en: 'Japan' },
  AE: { zh: '阿联酋', en: 'UAE' }
};

function buildUsers(now) {
  return [
    { id: 'u-admin', role: 'admin', name: '平台管理员', email: 'admin@demo.com', company: '豆豆鼠运营部', country: 'CN', accountType: 'company', jobTitle: '平台运营', joinedAt: now - 864e5 * 220, status: 'active' },
    { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', company: '豆豆鼠宠物用品（自营出口）', country: 'CN', sellerId: 'bbm', accountType: 'company', jobTitle: '外贸经理', joinedAt: now - 864e5 * 180, status: 'active' },
    { id: 'u-buyer', role: 'buyer', name: 'Thomas Müller', email: 'buyer@demo.com', company: 'Müller GmbH', country: 'DE', accountType: 'company', jobTitle: 'Purchasing Manager', joinedAt: now - 864e5 * 90, status: 'active' },
    { id: 'u4', role: 'seller', name: '李工', email: 'lee@nova-sz.cn', company: '宁波毛豆宠物用品有限公司', country: 'CN', sellerId: 'bbm', accountType: 'company', jobTitle: '销售总监', joinedAt: now - 864e5 * 150, status: 'active' },
    { id: 'u5', role: 'seller', name: 'Nguyen Van An', email: 'vanan@greenliving.vn', company: 'Hai Phong Green Living', country: 'VN', sellerId: 'bbm', accountType: 'company', jobTitle: 'Export Manager', joinedAt: now - 864e5 * 60, status: 'active' },
    { id: 'u6', role: 'buyer', name: 'Maria Garcia', email: 'maria@iberia-sourcing.es', company: 'Iberia Sourcing', country: 'ES', accountType: 'individual', jobTitle: '店主', joinedAt: now - 864e5 * 40, status: 'active' },
    { id: 'u7', role: 'buyer', name: '田中一郎', email: 'tanaka@tokyo-trading.jp', company: 'Tokyo Trading', country: 'JP', accountType: 'company', jobTitle: '采购课长', joinedAt: now - 864e5 * 25, status: 'active' },
    { id: 'u8', role: 'buyer', name: 'Ahmed Al Farsi', email: 'ahmed@gulf-imports.ae', company: 'Gulf Imports', country: 'AE', accountType: 'company', jobTitle: 'Buyer', joinedAt: now - 864e5 * 8, status: 'active' }
  ];
}

function buildCompanies() {
  return SELLERS.map(s => ({
    sellerId: s.id,
    status: s.verified ? 'approved' : 'pending',
    docs: s.verified ? ['营业执照', 'ISO9001 证书', '产品检测报告'] : ['营业执照（待核验）']
  }));
}

function buildLogs(now) {
  return [
    { id: 'l1', ts: now - 3600e3 * 26, actor: '平台管理员', action: '企业认证通过', target: '宁波毛豆宠物用品有限公司', detail: '营业执照与产品检测报告核验无误' },
    { id: 'l2', ts: now - 3600e3 * 4, actor: '王经理', action: '发布产品', target: '三层仓鼠笼 含管道套装', detail: '提交平台审核' }
  ];
}


/* 清关/报关参考：买卖双方常用文件 + 当地官方来源（正式版可接入实时更新） */
const CUSTOMS_REF = [
  {
    code: 'US', flag: 'US', zh: '美国', en: 'United States', note: '货物到港前完成 ISF 申报；关注 FDA/EPA 等机构对特定商品的准入要求。',
    docs: [
      { zh: '商业发票（Commercial Invoice）', en: 'Commercial Invoice' },
      { zh: '装箱单（Packing List）', en: 'Packing List' },
      { zh: '提单 / 空运单（B/L or AWB）', en: 'Bill of Lading / Air Waybill' },
      { zh: '进口报关单（Entry Summary / CBP Form 3461）', en: 'Entry Summary (CBP 3461)' },
      { zh: '原产地证 / 特定认证（FDA、EPA、DOT 等按品类）', en: 'Certificate of Origin / FDA, EPA, DOT as applicable' }
    ],
    sources: [
      { name: 'U.S. Customs and Border Protection', url: 'https://www.cbp.gov/trade', region: 'US' },
      { name: 'U.S. International Trade Commission (HTS)', url: 'https://hts.usitc.gov/', region: 'US' },
      { name: 'Trade.gov', url: 'https://www.trade.gov/', region: 'US' }
    ]
  },
  {
    code: 'EU', flag: 'EU', zh: '欧盟（德国示例）', en: 'European Union (DE example)', note: '统一海关联盟，货物进入任一成员国即进入欧盟单一市场；CE 标记与增值税（VAT/OSS）需合规。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '欧盟统一报关单（SAD）', en: 'Single Administrative Document (SAD)' },
      { zh: '原产地证（如享受关税优惠）', en: 'Certificate of Origin (for preferential duty)' },
      { zh: 'CE 声明 / 特定产品合规文件', en: 'CE Declaration / product compliance files' }
    ],
    sources: [
      { name: 'EU Taxation and Customs Union', url: 'https://taxation-customs.ec.europa.eu/', region: 'EU' },
      { name: 'Access2Markets', url: 'https://trade.ec.europa.eu/access-to-markets/', region: 'EU' },
      { name: 'German Customs (Zoll)', url: 'https://www.zoll.de/', region: 'EU' }
    ]
  },
  {
    code: 'GB', flag: 'GB', zh: '英国', en: 'United Kingdom', note: '脱欧后使用独立关税制度；GB 海关申报（CDS）与 UKCA/CE 标记要求并存至特定时限。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '英国海关申报（CDS）', en: 'UK Customs Declaration (CDS)' },
      { zh: '原产地证 / 准入认证（UKCA 等）', en: 'Certificate of Origin / UKCA as applicable' }
    ],
    sources: [
      { name: 'GOV.UK - Import goods into UK', url: 'https://www.gov.uk/import-goods-into-uk', region: 'GB' },
      { name: 'UK Trade Tariff', url: 'https://www.trade-tariff.service.gov.uk/', region: 'GB' }
    ]
  },
  {
    code: 'CN', flag: 'CN', zh: '中国', en: 'China', note: '出口报关需如实申报 HS 编码与成交方式；退税与收汇合规（外汇管理局）需同步关注。',
    docs: [
      { zh: '出口报关单（海关申报）', en: 'Export Customs Declaration' },
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '报关委托书 / 代理报关协议', en: 'Customs Broker Authorization' },
      { zh: '原产地证（一般/优惠）', en: 'Certificate of Origin' },
      { zh: '商检/许可证（按品类，如食品、化工、医疗器械）', en: 'Inspection / License (per category)' }
    ],
    sources: [
      { name: '中国海关总署', url: 'http://www.customs.gov.cn/', region: 'CN' },
      { name: '海关 HS 编码查询（中国电子口岸）', url: 'https://www.chinaport.gov.cn/', region: 'CN' }
    ]
  },
  {
    code: 'JP', flag: 'JP', zh: '日本', en: 'Japan', note: '通关由日本海关（税関）负责；食品/药品/化妆品需厚生劳动省准入。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '进口申报书（Import Declaration）', en: 'Import Declaration (NACCS)' },
      { zh: '原产地证 / 特定品类许可（PSE、食品等）', en: 'Certificate of Origin / permits as applicable' }
    ],
    sources: [
      { name: 'Japan Customs', url: 'https://www.customs.go.jp/english/', region: 'JP' },
      { name: 'NACCS（电子通关）', url: 'https://www.naccs.jp/', region: 'JP' }
    ]
  },
  {
    code: 'KR', flag: 'KR', zh: '韩国', en: 'Korea', note: 'Korea Customs 电子通关（UNI-PASS）；KC 认证按品类要求。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '进口申报（UNI-PASS）', en: 'Import Declaration (UNI-PASS)' },
      { zh: 'KC 认证 / 原产地证（按品类）', en: 'KC certification / CO as applicable' }
    ],
    sources: [
      { name: 'Korea Customs Service', url: 'https://www.customs.go.kr/', region: 'KR' },
      { name: 'UNI-PASS', url: 'https://unipass.customs.go.kr/', region: 'KR' }
    ]
  },
  {
    code: 'IN', flag: 'IN', zh: '印度', en: 'India', note: 'BIS 认证与强制标签要求较多；关税与 GST 需在报关时申报。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '进口报关单（BOE）', en: 'Bill of Entry (BOE)' },
      { zh: 'BIS 认证 / 原产地证（按品类）', en: 'BIS certification / CO as applicable' }
    ],
    sources: [
      { name: 'CBIC (Indian Customs)', url: 'https://www.cbic.gov.in/', region: 'IN' },
      { name: 'BIS (Bureau of Indian Standards)', url: 'https://www.bis.gov.in/', region: 'IN' }
    ]
  },
  {
    code: 'VN', flag: 'VN', zh: '越南', en: 'Vietnam', note: 'VAN 电子通关；纺织/电子等品类关注原产地规则与 C/O 表格。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '进口报关单（VAN）', en: 'Import Declaration (VAN)' },
      { zh: '原产地证（C/O）', en: 'Certificate of Origin' }
    ],
    sources: [
      { name: 'Vietnam Customs', url: 'https://www.customs.gov.vn/', region: 'VN' },
      { name: 'VNACCS/VCIS', url: 'https://www.vnaccs.vn/', region: 'VN' }
    ]
  },
  {
    code: 'AE', flag: 'AE', zh: '阿联酋', en: 'UAE', note: '迪拜等酋长国为转口枢纽；清关文件要求严格，需注意 EORI/进口代码与禁运清单。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '进口报关（Dubai Customs / Federal）', en: 'Import Declaration (Dubai/Federal Customs)' },
      { zh: '原产地证 / 特定品类认证（SFDA、ECAS 等）', en: 'CO / SFDA, ECAS as applicable' }
    ],
    sources: [
      { name: 'Dubai Customs', url: 'https://www.dubai-customs.gov.ae/', region: 'AE' },
      { name: 'Federal Customs Authority UAE', url: 'https://www.fca.gov.ae/', region: 'AE' }
    ]
  },
  {
    code: 'BR', flag: 'BR', zh: '巴西', en: 'Brazil', note: '清关流程较复杂（Siscomex），部分品类需 ANVISA/INMETRO 许可；关税与 ICMS 税种较多。',
    docs: [
      { zh: '商业发票与装箱单', en: 'Commercial Invoice & Packing List' },
      { zh: '提单 / 空运单', en: 'B/L or AWB' },
      { zh: '进口报关（Siscomex / DI）', en: 'Import Declaration (Siscomex / DI)' },
      { zh: 'ANVISA / INMETRO 许可（按品类）', en: 'ANVISA / INMETRO permits as applicable' }
    ],
    sources: [
      { name: 'Receita Federal (Brazil Customs)', url: 'https://www.gov.br/receitafederal/', region: 'BR' },
      { name: 'Siscomex', url: 'https://www.siscomex.gov.br/', region: 'BR' }
    ]
  }
];

/* 出口准备：资质与前置手续（正式办理以主管部门最新规定为准） */
const EXPORT_READINESS_ITEMS = [
  {
    id: 'customs-reg', optional: false,
    zh: {
      name: '进出口经营权 / 海关备案',
      what: '具备对外贸易经营者资格，并在海关办理报关单位注册登记（2026 年起由备案改为登记管理）。',
      who: '商务主管部门 / 海关',
      when: '首次出口前；未登记无法自行报关',
      tip: '没有进出口权可委托有资质的外贸公司或报关行代理出口，但责任划分与退税归属要提前书面约定。'
    },
    en: {
      name: 'Import & export rights / customs registration',
      what: 'Hold foreign-trade operator qualification and register as a customs declaration entity (registration management since 2026).',
      who: 'Trade authorities / Customs',
      when: 'Before the first export; required to self-declare',
      tip: 'You can export through a licensed trading company or broker, but agree on liability and tax-rebate ownership in writing.'
    }
  },
  {
    id: 'fx-account', optional: false,
    zh: {
      name: '出口收汇与外汇账户',
      what: '开立外汇结算账户并完成贸易外汇收支企业名录登记，出口收汇须如实申报。',
      who: '银行 + 外汇局',
      when: '首笔收汇前',
      tip: '个人账户收汇是外贸高发风险，务必使用公司对公账户，并留存合同与单据备查。'
    },
    en: {
      name: 'Export receipts & FX settlement account',
      what: 'Open a foreign-exchange settlement account and complete trade FX filing with the exchange authority; report all export receipts truthfully.',
      who: 'Bank + exchange authority',
      when: 'Before the first receipt',
      tip: 'Receiving payment into a personal account is a top export risk. Always use the company account and keep the contract and documents on file.'
    }
  },
  {
    id: 'tax-rebate', optional: false,
    zh: {
      name: '出口退税备案',
      what: '在电子税务局办理出口退（免）税备案，出口后按规定申报退税并留存单证。',
      who: '税务机关（电子税务局）',
      when: '首次申报退税前',
      tip: '退税申报需要发票、报关单、收汇记录等单证链，从开票环节就要保持一致。'
    },
    en: {
      name: 'Export VAT rebate filing',
      what: 'File the export tax-rebate registration with the e-tax authority and keep a complete document chain for each claim.',
      who: 'Tax authority (e-tax portal)',
      when: 'Before the first rebate claim',
      tip: 'Rebates require a consistent chain of invoice, customs declaration and receipt records — align them from the invoicing stage.'
    }
  },
  {
    id: 'export-license', optional: false,
    zh: {
      name: '出口许可证（法定许可商品）',
      what: '属于《出口许可证管理货物目录》（2026 年 43 类）的商品，须先取得出口许可证再申报出口。',
      who: '商务部发证机关（委托省级商务部门）',
      when: '签约 / 报关前；先确认商品是否在目录内',
      tip: '许可证不可转让，品名、数量、目的国必须与报关单一致；两用物项另行办理出口许可。'
    },
    en: {
      name: 'Export licence (controlled goods)',
      what: 'Goods on the export licensing catalogue (43 categories in 2026) require a licence before declaration.',
      who: 'Ministry of Commerce licensing office',
      when: 'Before signing / declaration; check the catalogue first',
      tip: 'Licences are non-transferable and must match the declaration exactly. Dual-use goods need a separate export licence.'
    }
  },
  {
    id: 'inspection', optional: false,
    zh: {
      name: '法定检验 / 商检（出口法检）',
      what: '列入法检目录的商品，出口前向海关申报检验，取得合格电子底账后再报关。',
      who: '海关（原商检职能）',
      when: '出口申报时，先报检后报关',
      tip: '法检目录按 HS 编码确定，同一编码不同用途可能不同，务必先核实。'
    },
    en: {
      name: 'Statutory inspection (export CIQ)',
      what: 'Goods on the statutory inspection catalogue must be inspected by customs before export; obtain the qualified electronic record first.',
      who: 'Customs (ex-CIQ function)',
      when: 'Inspect before declaration at export time',
      tip: 'The catalogue is HS-based and can vary by intended use — verify before you ship.'
    }
  },
  {
    id: 'co-qualification', optional: false,
    zh: {
      name: '原产地证书申领资格',
      what: '在贸促会或海关完成原产地证申领登记，可申请一般原产地证（CO）、普惠制 FORMA、RCEP 等优惠证书。',
      who: '贸促会（CCPIT）/ 海关',
      when: '发货前申请；进口国要求或享关税优惠时必备',
      tip: 'RCEP 优惠税率需要原产地证书 + 原产地规则核算，别错过降税红利。'
    },
    en: {
      name: 'Certificate of Origin qualification',
      what: 'Register with CCPIT or customs to issue CO, GSP Form A or RCEP preferential certificates.',
      who: 'CCPIT / Customs',
      when: 'Apply before shipment; required for preferential duty or by the importer',
      tip: 'RCEP savings need the certificate plus an origin-rule calculation — don’t miss the tariff benefit.'
    }
  },
  {
    id: 'dangerous-goods', optional: true,
    zh: {
      name: '危险品 / 特殊货物资质（按品类）',
      what: '化学品、锂电池、气雾剂等危险品出口需危险特性分类鉴定、MSDS、UN 包装标记与危包证。',
      who: '检验机构 + 海关',
      when: '订舱前确认；船公司 / 航司拒收未申报危品',
      tip: '未如实申报危险品会面临高额罚款与承运人责任，绝不能隐瞒。'
    },
    en: {
      name: 'Dangerous goods qualification (category-based)',
      what: 'Chemicals, lithium batteries and aerosols need classification, MSDS, UN packaging marks and a dangerous-goods certificate.',
      who: 'Inspection bodies + Customs',
      when: 'Confirm before booking; carriers refuse undeclared DG',
      tip: 'Undeclared dangerous goods lead to heavy fines and carrier liability — never hide them.'
    }
  }
];

/* 物流指南：运输方式对比 */
const LOGISTICS_MODES = [
  {
    id: 'sea',
    zh: { name: '海运（整柜/拼箱）', speed: '15–40 天', cost: '低（大宗首选）', bestFor: '整柜、大宗货、交期宽松' },
    en: { name: 'Sea (FCL/LCL)', speed: '15–40 days', cost: 'Low (best for bulk)', bestFor: 'Full-container loads, large orders, flexible lead time' }
  },
  {
    id: 'air',
    zh: { name: '空运', speed: '3–7 天', cost: '高（按重量/体积）', bestFor: '高价值、紧急补货' },
    en: { name: 'Air', speed: '3–7 days', cost: 'High (by weight/volume)', bestFor: 'High value, urgent replenishment' }
  },
  {
    id: 'land',
    zh: { name: '陆运（中欧班列/跨境卡车）', speed: '10–20 天', cost: '中', bestFor: '欧洲方向，兼顾时效与成本' },
    en: { name: 'Land (China-Europe rail / cross-border truck)', speed: '10–20 days', cost: 'Medium', bestFor: 'Europe routes balancing speed and cost' }
  },
  {
    id: 'courier',
    zh: { name: '国际快递', speed: '2–5 天', cost: '最高（小件）', bestFor: '样品、小包裹、门到门' },
    en: { name: 'Courier', speed: '2–5 days', cost: 'Highest (small parcels)', bestFor: 'Samples, small parcels, door-to-door' }
  }
];

const CONTAINER_TYPES = [
  { id: 'LCL', zh: '拼箱（不足整柜）', en: 'LCL (less than container load)' },
  { id: '20GP', zh: '20 尺整柜（约 28 CBM）', en: '20ft FCL (~28 CBM)' },
  { id: '40GP', zh: '40 尺整柜（约 58 CBM）', en: '40ft FCL (~58 CBM)' },
  { id: '40HQ', zh: '40 尺高柜（约 68 CBM）', en: '40ft HQ (~68 CBM)' }
];

/* 目的港费用参考（示例，正式以承运人/代理报价为准） */
const PORT_CHARGES = [
  {
    code: 'Hamburg', flag: 'DE', zh: '汉堡', en: 'Hamburg',
    note: '欧洲主流基本港，DTHC 与清关费以德国当地行情为参考。',
    items: [
      ['DTHC', 'EUR 95–130 / 柜'],
      ['文件费', 'EUR 35–60'],
      ['清关代理费', 'EUR 90–180'],
      ['查验费（如发生）', 'EUR 80–200'],
      ['超期仓储费', 'EUR 1–3 / CBM / 天']
    ]
  },
  {
    code: 'Rotterdam', flag: 'NL', zh: '鹿特丹', en: 'Rotterdam',
    note: '欧洲第一大港，中欧班列与海运均可衔接。',
    items: [
      ['DTHC', 'EUR 90–125 / 柜'],
      ['文件费', 'EUR 30–55'],
      ['清关代理费', 'EUR 85–170'],
      ['查验费（如发生）', 'EUR 75–190'],
      ['超期仓储费', 'EUR 1–2.5 / CBM / 天']
    ]
  },
  {
    code: 'New York', flag: 'US', zh: '纽约', en: 'New York',
    note: '美东基本港；注意 ISF 申报与 CBP 查验。',
    items: [
      ['DTHC', 'USD 100–160 / 柜'],
      ['文件费', 'USD 45–75'],
      ['清关代理费', 'USD 120–220'],
      ['ISF 申报', 'USD 25–45'],
      ['查验费（如发生）', 'USD 90–260']
    ]
  },
  {
    code: 'Los Angeles', flag: 'US', zh: '洛杉矶', en: 'Los Angeles',
    note: '美西门户港，电商与快消品常用。',
    items: [
      ['DTHC', 'USD 105–170 / 柜'],
      ['文件费', 'USD 40–70'],
      ['清关代理费', 'USD 110–210'],
      ['ISF 申报', 'USD 25–45'],
      ['查验费（如发生）', 'USD 95–280']
    ]
  },
  {
    code: 'Dubai', flag: 'AE', zh: '迪拜', en: 'Dubai',
    note: '中东转口枢纽，转口贸易注意原产地证与再出口申报。',
    items: [
      ['DTHC / 港口杂费', 'AED 350–600 / 柜'],
      ['文件费', 'AED 100–180'],
      ['清关代理费', 'AED 300–700'],
      ['查验费（如发生）', 'AED 250–800'],
      ['仓储费（免费期后）', 'AED 25–60 / 天']
    ]
  },
  {
    code: 'Singapore', flag: 'SG', zh: '新加坡', en: 'Singapore',
    note: '亚太中转枢纽，清关效率高，转口贸易活跃。',
    items: [
      ['DTHC', 'SGD 90–140 / 柜'],
      ['文件费', 'SGD 30–55'],
      ['清关代理费', 'SGD 60–120'],
      ['查验费（如发生）', 'SGD 60–180'],
      ['仓储费（免费期后）', 'SGD 1–2.5 / CBM / 天']
    ]
  }
];

/* 合规中心：管制与合规清单（演示参考） */
const COMPLIANCE_RULES = [
  {
    id: 'export-control', icon: '🛃',
    zh: { name: '出口管制与两用物项', items: [
      '中国《出口管制法》与两用物项出口管制清单',
      '美国 EAR（出口管理条例）与实体清单',
      '欧盟两用物项条例（EU 2021/821）',
      '联合国安理会禁运决议',
      '报关单“禁限管制识别码”如实申报'
    ] },
    en: { name: 'Export control & dual-use items', items: [
      'China Export Control Law and dual-use list',
      'US EAR and Entity List',
      'EU Dual-use Regulation (EU 2021/821)',
      'UN Security Council embargo resolutions',
      'Truthful control-code declaration on export forms'
    ] }
  },
  {
    id: 'sanctions', icon: '🚫',
    zh: { name: '制裁与名单筛查', items: [
      'OFAC SDN（特别指定国民名单）',
      '美国商务部实体清单（Entity List）',
      '欧盟 / 英国制裁名单',
      '中国《反外国制裁法》相关措施',
      '交易对手、最终收货人与最终用途核查'
    ] },
    en: { name: 'Sanctions & list screening', items: [
      'OFAC SDN list',
      'US Entity List',
      'EU / UK sanctions lists',
      'China Anti-Foreign Sanctions Law measures',
      'Screening of counterparty, end-user and end-use'
    ] }
  },
  {
    id: 'trade-remedies', icon: '⚖️',
    zh: { name: '贸易救济（反倾销 / 反补贴 / 关税）', items: [
      '美国 Section 301 对华关税（按 HTS 核实）',
      '欧盟对华反倾销 / 反补贴税（如电动汽车、铝材等）',
      '印度 BIS 认证与关税壁垒',
      '目的国海关对低申报价格的审查风险'
    ] },
    en: { name: 'Trade remedies (ADD/CVD/tariffs)', items: [
      'US Section 301 tariffs on China (verify by HTS)',
      'EU ADD/CVD duties (EVs, aluminium, etc.)',
      'India BIS certification and tariff barriers',
      'Risk of low-valuation review by destination customs'
    ] }
  },
  {
    id: 'product-rules', icon: '🧪',
    zh: { name: '产品合规与环保法规', items: [
      '欧盟 CE / RoHS / REACH / WEEE',
      '美国 FCC / UL / FDA / CPSC',
      '日本 PSE / 食品卫生法',
      '化学物质注册（欧盟 REACH、美国 TSCA）',
      '包装与塑料税（部分国家）',
      'CBAM 碳边境调节（钢铝水泥化肥氢电）'
    ] },
    en: { name: 'Product & environmental rules', items: [
      'EU CE / RoHS / REACH / WEEE',
      'US FCC / UL / FDA / CPSC',
      'Japan PSE / Food Sanitation Law',
      'Chemical registration (EU REACH, US TSCA)',
      'Packaging and plastics taxes (select countries)',
      'CBAM for steel, aluminium, cement, fertiliser, hydrogen, electricity'
    ] }
  }
];

/* 演示用出口管制/制裁关键词（正式版接入权威名单 API） */
const SANCTION_KEYWORDS = [
  'military', 'defense', 'defence', 'missile', 'nuclear', 'chemical weapon', 'bioweapon',
  'drone', 'night vision', 'radar', 'explosive', 'arms', 'ammunition', 'military-grade',
  '军事', '导弹', '核武器', '生化武器', '无人机', '夜视', '雷达', '炸药', '弹药', '武器级', '军警'
];

/* 售后与纠纷：问题类型 */
const AFTER_SALES_TYPES = [
  { id: 'quality', zh: '质量问题', en: 'Quality issue' },
  { id: 'quantity', zh: '数量短缺', en: 'Quantity shortage' },
  { id: 'damage', zh: '运输破损', en: 'Shipping damage' },
  { id: 'other', zh: '其他', en: 'Other' }
];

/* 名片模板（供客户选择；自定义 = 上传自己的名片图片） */
const CARD_TEMPLATES = [
  { id: 'classic-gold', zh: '经典暖金', en: 'Classic Gold', swatch: 'linear-gradient(135deg,#FFF6E0,#FBEBC9)' },
  { id: 'luxe-ink', zh: '低调奢华', en: 'Luxe Ink', swatch: 'linear-gradient(135deg,#20242E,#14171E)' },
  { id: 'minimal-white', zh: '简约留白', en: 'Minimal White', swatch: 'linear-gradient(135deg,#FFFFFF,#F2F2F2)' },
  { id: 'modern-blue', zh: '现代科技', en: 'Modern Tech', swatch: 'linear-gradient(135deg,#123060,#0A1730)' },
  { id: 'oriental-ink', zh: '东方雅韵', en: 'Oriental Ink', swatch: 'linear-gradient(135deg,#F7F1E3,#EAE0C8)' }
];

const I18N = {
  zh: {
    home: '首页', marketplace: '产品市场', dashboard: '工作台', login: '登录', logout: '退出登录',
    heroTitle: '连接全球买家与优质供应商',
    heroSub: '一站式发布产品、精准筛选、快速询盘，让每一笔跨国生意更简单。',
    heroPilot: '首发垂直 · 宠物用品（仓鼠 · 猫与小型犬 · 大型犬）',
    searchPlaceholder: '搜索产品，例如：仓鼠笼、猫爬架、大型犬胸背带…',
  popular: '热门搜索：',
    categoriesTitle: '热门品类', featuredTitle: '精选产品', viewAll: '查看全部',
    howTitle: '三步完成一笔跨国生意', howStep1Title: '供应商发布产品', howStep1Desc: '填写产品规格、价格与认证信息，一键上架。',
    howStep2Title: '买家搜索筛选', howStep2Desc: '按品类、价格、起订量、产地精准筛选。',
    howStep3Title: '询盘沟通报价', howStep3Desc: '买家发起询盘，供应商快速回复报价，平台全程保护联系方式。',
    trustTitle: '平台保障', trust1Title: '企业认证', trust1Desc: '供应商营业执照与资质核验，杜绝虚假信息。',
    trust2Title: '询盘直达', trust2Desc: '站内询盘 + 邮件双通道通知，时差不再是障碍。',
    trust3Title: '多语言支持', trust3Desc: '中英双语界面与产品信息，服务全球买家。',
    sellerCtaTitle: '成为供应商，免费入驻', sellerCtaDesc: '发布产品立即获得全球买家询盘，按效果付费，前期零成本。', sellerCtaBtn: '进入卖家工作台',
    footerTagline: '宠物用品自营出口 · 豆豆鼠 BeanBeanMouse（演示版）', rights: '© 2026 BeanBeanMouse 演示原型 · 仅用于设计演示',
    resultsCount: '个结果', filters: '筛选', category: '品类', priceRange: '价格区间 (USD)', minPrice: '最低价', maxPrice: '最高价',
    moq: '最小起订量', origin: '产地', certs: '认证', clearFilters: '清除筛选', sort: '排序',
    sortRecommended: '综合推荐', sortNewest: '最新上架', sortPriceAsc: '价格从低到高', sortPriceDesc: '价格从高到低',
    noResults: '未找到匹配的产品', noResultsHint: '试试调整筛选条件或更换关键词', searchResultsFor: '“{kw}”的搜索结果',
    moqLabel: '起订量', verified: '自营 · 已核验', hot: '热销', new: '新品', sendInquiry: '向豆豆鼠询问', viewDetail: '查看详情',
    priceRangeLabel: '价格区间', leadTime: '交货周期', terms: '贸易术语', originLabel: '产地', seller: '供应商', statusPill: '状态',
    responseRate: '回复率', responseTime: '平均响应', since: '成立年份', orders: '累计订单', unitLabel: '单位',
    productDetail: '产品详情', features: '产品特性', aboutSeller: '关于供应商', days: '天',
    favorite: '收藏', favorited: '已收藏', inquiryTitle: '向豆豆鼠询问', quantity: '订购数量', message: '询盘内容',
    messagePlaceholder: '请填写您需要的数量、目标价格、包装要求等，供应商将尽快回复您。',
    contactName: '联系人', contactEmail: '邮箱', companyName: '公司名称', countryLabel: '国家/地区',
    send: '发送询盘', cancel: '取消', close: '关闭', required: '请填写必填项', invalidEmail: '邮箱格式不正确',
    inquirySuccessTitle: '询盘已发送', inquirySuccessDesc: '供应商已收到您的询盘，将通过站内消息和邮件尽快回复。您可以在“我的询盘”中查看进展。',
    viewMyInquiries: '查看我的询盘', continueBrowsing: '继续浏览',
    overview: '总览', productManage: '产品管理', publish: '发布产品', inquiryManage: '询盘管理',
    statLive: '在售产品', statInquiries: '本月询盘', statPending: '待处理询盘', statRate: '平均回复率',
    recentInquiries: '最新询盘', newProduct: '发布新品', edit: '编辑', delete: '删除',
    onShelf: '上架', offShelf: '下架', onShelfLabel: '已上架', offShelfLabel: '已下架', deleteConfirm: '确定删除该产品吗？此操作不可恢复。',
    noProducts: '还没有产品，点击右上角发布第一个产品吧', saveProduct: '保存产品', updateProduct: '更新产品',
    cancelEdit: '取消编辑', chooseImage: '图片配色', previewLabel: '预览',
    titleEn: '产品标题（英文，买家可见）', titleZh: '产品标题（中文）', descEn: '产品描述（英文）', descZh: '产品描述（中文）',
    leadTimeField: '交货周期（天）', termsField: '贸易术语', moqField: '最小起订量', unitField: '单位', countryField: '产地',
    priceMinField: '最低价 (USD)', priceMaxField: '最高价 (USD)', categoryField: '品类', certsField: '认证',
    inquiryFrom: '询盘来自', reply: '回复', replied: '已回复', markHandled: '标记已处理', noInquiries: '暂无询盘',
    replyPlaceholder: '输入您的回复（买家可在“我的询盘”中看到）…', sendReply: '发送回复',
    myInquiries: '我的询盘', myFavorites: '我的收藏', noInquiriesYet: '还没有发送过询盘', noFavoritesYet: '还没有收藏产品',
    sentAt: '发送于', statusNew: '待回复', statusReplied: '供应商已回复', sellerReply: '供应商回复',
    loginTitle: '体验登录', loginDesc: '这是一个演示原型，选择角色即可体验完整流程，无需注册。',
    loginOrDemo: '或使用演示身份快速体验', loginFailed: '登录失败',
  loginTag: '宠物用品自营出口', loginTrust1: '企业实名审核', loginTrust2: '25+ 语言实时沟通', loginTrust3: '防伪与存证',
    asBuyer: '以买家身份体验', asSeller: '以卖家身份体验', asGuest: '游客浏览',
    asAdmin: '以平台管理员身份体验', adminDesc: '审核产品、认证企业、管理用户、查看平台数据',
    loginNote: '提示：所有数据仅保存在您本地浏览器中，刷新不丢失。',
    adminPanel: '平台管理后台', adminOverview: '数据看板', productReview: '产品审核', companyVerify: '企业认证', userManage: '用户管理', auditLog: '操作日志',
    statUsers: '注册用户', statPendingProducts: '待审核产品',
    inqByCategory: '询盘按品类分布', inqByCountry: '询盘按国家分布', latestActivity: '最新动态',
    reviewHint: '审核依据：违禁品清单、知识产权侵权、认证真实性',
    approve: '通过', reject: '驳回', rejectReason: '请输入驳回原因（将通知卖家）',
    riskHints: '合规检查', noRisk: '未发现明显风险', riskKeyword: '疑似违规词：{kw}', riskNoCert: '未提供产品认证',
    reviewPassed: '产品已通过审核并上架', reviewRejected: '产品已驳回',
    pendingLabel: '待审核', rejectedLabel: '已驳回',
    pendingVerify: '待认证', verifiedLabel: '已认证', rejectedVerify: '已驳回',
    verifyCompany: '通过认证', rejectVerify: '驳回认证', docsLabel: '资质材料',
    freeze: '冻结', unfreeze: '解冻', userFrozen: '账号已冻结', userUnfrozen: '账号已解冻',
    frozenBlocked: '该账号已被平台冻结，请联系管理员',
    companyApproved: '企业认证已通过', companyRejected: '企业认证已驳回',
    logActor: '操作人', logAction: '操作', logTarget: '对象', logTime: '时间', logDetail: '详情', logsEmpty: '暂无操作记录',
    legalNote: '演示占位：正式上线时这里将展示完整条款与投诉举报入口',
    userAgreement: '用户协议', privacyPolicy: '隐私政策', reportAbuse: '违规举报',
    productSubmitted: '产品已提交审核，通过后将自动上架',
    adminRoleTag: '平台', roleCol: '角色', companyCol: '公司', countryCol: '国家/地区', joinedCol: '注册时间',
    activeStatus: '正常', frozenStatus: '已冻结', sellerRoleLabel: '卖家', buyerRoleLabel: '买家',
    noPending: '暂无待审核产品', noCompanies: '暂无待认证企业', noUsers: '暂无用户',
    registerTab: '注册', loginTab: '登录', regTitle: '创建账号', regName: '姓名', regEmail: '邮箱',
  regPassword: '密码（至少8位，含字母和数字）', regRole: '注册身份', regRoleBuyer: '客户（我要买）', regRoleSeller: '商家（供货 / 托管合作）',
  supDocTitle: '合作需要的资质材料',
  supDocNote: '提交后我们会在 3 个工作日内完成审核；通过后洽谈供货或托管合作（选品、包装、出口与售后由我们负责）。',
  supDoc1: '营业执照或工厂登记证明',
  supDoc2: '产品检测报告（CE / FCC / RoHS / 食品接触材料等）',
  supDoc3: '商标注册证或品牌授权文件（如涉及）',
  supDoc4: '生产许可或行业资质（食品、饲料类必需）',
  supDoc5: '工厂 / 车间实拍照片与产能说明',
  supDoc6: '出口报关与结算主体信息',
    regCompanyName: '公司/工厂名称（需真实可查证）', regCountry: '所在国家/地区', regCity: '城市（选填）',
    regRegNo: '工商注册号/统一社会信用代码', regLicenseNo: '营业执照编号（选填）', regCompanyWebsite: '公司官网（选填）',
    regContact: '联系人/联系电话', regScope: '主营业务范围', regSubmit: '注册', regNote: '注册后需验证邮箱；卖家还需公司/工厂资料通过平台审核后才能发布产品。',
    registerOk: '注册成功，请查收邮箱完成验证（演示环境已自动模拟验证）', verifyEmailTitle: '邮箱验证', verifyEmailOk: '邮箱验证成功，请登录',
    emailExists: '该邮箱已被注册', botDetected: '检测到异常注册行为',
    companyPending: '企业认证审核中', companyApproved: '企业已认证 ✓', companyRejected: '企业认证未通过', companyApply: '提交企业资料',
    companyResubmit: '重新提交', companyReason: '驳回原因', companyTip: '为保障买家权益，平台仅允许真实可查证的公司/工厂通过认证后发布产品。',
    myOrders: '我的订单', orders: '订单', noOrders: '暂无订单', orderTotal: '订单金额', orderStatusCreated: '待确认签收',
    orderStatusComplete: '交易达成', orderStatusCancelled: '已取消', confirmReceipt: '确认签收（交易达成）', dealDone: '🎉 交易达成！感谢双方信任',
    tipTitle: '给小费表达感谢', tipHint: '自愿打赏，双方可见，不强制；未结算前可取消', tipAmount: '金额（USD）', tipNote: '留言（选填）',
    tipSend: '发送小费', tipCancel: '取消打赏', tipList: '小费记录', tipCancelled: '（已取消）', tipReceived: '收到打赏',
    tipSkip: '跳过，不用了', tipLater: '以后再说', tipSkipped: '好的，之后仍可在订单中打赏',
    tipCallout: '交易达成，感谢双方信任！如愿意，可以给另一方发个小费表示感谢（完全自愿，不强制）。',
    tipViewBtn: '查看 / 发送小费', tipDismissBtn: '跳过，不再提示', tipDismissed: '已跳过，之后仍可在订单中打赏',
    shipmentTitle: '货物实时跟进', shipmentNoShipment: '暂无物流信息', shipmentCreate: '创建物流单', shipmentCarrier: '承运商',
    shipmentTrackingNo: '运单号', shipmentOrigin: '发货地', shipmentDestination: '目的地', shipmentEta: '预计到达', shipmentRemark: '备注（选填）',
    shipmentMode: '运输方式', modeLand: '陆运（马车镖局）', modeSea: '海运（三帆船）', modeAir: '空运（空艇）',
    escortTitle: '豆豆鼠镖局 · 押运中', phaseStart: '开始', phaseTransit: '运输', phaseEnd: '结束',
    shipmentCreateBtn: '创建并通知买家', shipmentAddEvent: '更新物流状态', shipmentCurrent: '当前位置', shipmentEvent: '物流事件',
    shipmentNotePh: '例如：已装船，提单已出具', shipmentLocPh: '例如：宁波港', shipmentEventAdded: '物流状态已更新',
    shpProcessing: '处理中', shpPacked: '已打包', shpShipped: '已发货', shpInTransit: '运输中', shpCustoms: '清关中',
    shpOutForDelivery: '派送中', shpDelivered: '已签收', shpException: '异常',
    evidenceTitle: '流程存证（第三方保存）', evidenceHint: '关键节点自动保存，哈希链防篡改，双方可验证',
    evidenceChainValid: '存证链完整 · 未篡改', evidenceChainBroken: '存证链异常，请警惕！', evidenceSave: '保存当前快照',
    evidenceVerify: '验证链完整性', evidenceEmpty: '暂无存证记录', evidenceHash: '哈希', evidenceVerifiedAt: '存证时间',
    evidencePrint: '打印存证报告', evidencePrintHint: '报告含订单信息、存证列表与链完整性结论，可打印或另存为 PDF。',
    evReportTitle: 'BeanBeanMouse 流程存证报告', evReportSub: '第三方保存 · 哈希链防篡改 · 双方可验证', evReportNo: '报告编号',
    evReportSealed: '存证链完整 · 未发现篡改', evReportBroken: '存证链异常，请立即联系平台客服！',
    evReportNote: '本报告由平台依据订单存证链自动生成，仅供双方核对与纠纷举证参考，不构成法律意见。',
    evOrderCreate: '订单创建', evReceiptConfirmed: '买家确认签收', evTipCreate: '小费打赏', evTipCancel: '打赏取消',
    evShipmentCreate: '物流单创建', evShipmentEvent: '物流更新', evManual: '手动快照',
    evContractCustody: '合同保管', evInsuranceCreate: '投保', evAfterSalesCreate: '售后申请',
    evAfterSalesReply: '售后回复', evAfterSalesRuling: '平台裁决', evDisputeOpen: '纠纷发起', evDocGenerated: '单证生成',
    tipAlready: '已打赏', tipAgain: '感谢支持！你已打赏，可再次表达感谢或取消。', tipBtnAgain: '再次打赏',
    navCustoms: '清关参考', customsTitle: '清关 / 报关参考', customsSub: '按目的国查看进出口所需单证与官方来源，减少清关延误与罚款',
    customsPick: '选择目的地国家/地区', customsDocs: '常用单证', customsSources: '官方来源', customsNote: '注意事项',
    customsDisclaimer: '以上为通用参考，实际请以目的国海关最新规定为准；正式上线将接入实时政策。',
    navRecruit: '招商入驻', recruitTitle: '招商入驻：连接全球优质供应商', recruitSub: '面向工厂与贸易公司开放入驻，平台按外贸细分品类精准招商并扶持新店推广',
    recruitCta: '立即申请入驻', promoTitle: '推广管理', promoSub: '提交推广位申请，审核通过后展示在首页精选与搜索推荐',
    promoApply: '申请推广', promoDays: '推广天数', promoBudget: '预算档位', promoSubmit: '提交申请',
    promoPending: '审核中', promoApproved: '已通过', promoRejected: '未通过', promoAdmin: '推广审核', promoBadge: '推广',
    promoNote: '演示功能：正式版将接入结算与投放系统。',
    errRequired: '此项为必填', errEmail: '邮箱格式不正确', errNumber: '请输入有效数字', errPositive: '请输入大于 0 的数字',
    errPriceMax: '最高价不能低于最低价', errPick: '请选择此项', errPassword: '密码至少 8 位且含字母和数字',
    subcatField: '外贸子分类（含 HS 参考）', hsRef: 'HS 参考', subcatHint: '子分类帮助买家精准匹配，也是平台招商参考', allSubs: '全部分类',
    partyBuyer: '买家', partySeller: '卖家', party: '交易双方',
    navGuide: '贸易流程参考', guideTitle: '国际贸易流程规范参考', guideSub: '从询盘到售后的一站式流程、术语与风险提示',
    guideDisclaimer: '本指南为通用参考，不构成法律意见；正式交易请以双方签署的合同及当地最新法规为准。',
    reviewChecklist: '审核依据', resubmitHint: '被驳回的产品可编辑后重新提交审核。',
    categoryRequestBtn: '没找到想要的品类？告诉我们', categoryRequestTitle: '提交品类需求', catName: '想要的品类', catDesc: '详细需求（选填）',
    catMarkets: '目标市场（逗号分隔，选填）', catSubmit: '提交需求', catSubmitted: '需求已记录，平台会视情况邀请相应供应商入驻',
    catStatusNew: '待处理', catStatusInvited: '已邀请供应商', catStatusDone: '已完成', catRequests: '品类需求', catNote: '处理备注',
    companiesReview: '企业认证审核', approve: '通过', reject: '驳回', rejectReasonPh: '驳回原因（必填）',
    newsUpdated: '实时更新', updatedAgo: '更新于',
    navNews: '贸易资讯', newsTitle: '贸易资讯', newsSub: '聚合权威贸易媒体与官方信息，按你关注的地域推送，每条附可查询来源',
    policyBrief: '政策速览', newsCatFilter: '资讯分类', newsRegionFilter: '关注地域',
    newsRegionHint: '勾选地域后，资讯将按地域聚合显示（正式上线支持邮件与推送订阅）',
    viewSource: '查看原文', sourceLabel: '来源', sourceDirectory: '权威信息源', sourceDirectorySub: '查证与深度查询，请访问以下官方渠道',
    newsDisclaimer: '演示说明：以下条目为基于公开报道整理的演示内容，正式上线将接入官方信息源实时推送；每条均附可查询来源。',
    noNews: '当前筛选条件下暂无资讯', newsSyncedAt: '最近同步', newsRefresh: '刷新信息',
    newsRefreshed: '已与官方信息源同步（演示模拟）',
    newsIntegration: '正式版接入说明：由服务端定时抓取官方站点/RSS（海关总署、商务部、WTO、欧盟税务与海关、USTR 等），经 AI 摘要与翻译后推送至用户关注地域。',
    fxReference: '参考汇率', fxNote: '演示用参考中间价，实际成交以银行牌价为准',
    hsCode: '海关编码（HS Code）', hsHint: '用于关税查询与清关申报', noHsCode: '未填写',
    payment: '支付方式', paymentHint: '期望支付方式', incotermsLegend: '贸易术语说明（Incoterms® 2020）',
    quoteTitle: '报价单', quotePrice: '单价（USD）', quoteIncoterm: '贸易术语', quotePayment: '支付方式',
    quoteValidity: '报价有效期（天）', quoteLeadTime: '交货期（天）', quoteNote: '报价备注', sendQuote: '发送报价',
    quoteSent: '报价已发送', quotedStatus: '已报价', quoteBlock: '供应商报价', complianceTip: '清关提示',
    complianceTipText: '出货前请确认目的国的进口认证、标签与关税要求；大宗订单建议约定第三方验货与贸易保障条款。',
    docReference: '单证格式参考', docStandardNote: '参考国际贸易通行格式（美国商务部 trade.gov 等）：',
    docQuotation: '报价单（Quotation）', docProforma: '形式发票（Proforma Invoice）',
    docQuotationFields: '报价编号 / 报价日期 / 有效期\n买卖双方名称与地址\n产品明细（HS 编码、品名、规格）\n数量、单价、总价\n贸易术语（Incoterms）\n支付方式\n交货期\n运输与保险\n备注条款与签名盖章',
    docProformaFields: '形式发票即按发票格式出具的报价，通常无需有效期\n发票编号 / 日期\n买卖双方名称与地址\n产品明细（HS 编码、品名、规格、数量、单价、总价）\n贸易术语与支付方式\n交货期与运输方式\n用于清关、预付款及后续订单确认',
    printQuotation: '打印报价单', printProforma: '打印形式发票', printNow: '打印 / 导出 PDF',
    printHint: '选择「打印」后，在打印对话框中选择「另存为 PDF」即可导出文件。',
    docNo: '单证编号', docDate: '日期', docValidUntil: '有效期至', docSeller: '卖方', docBuyer: '买方',
    docItem: '序号', docDesc: '品名及规格', docQty: '数量', docUnitPrice: '单价（USD）', docAmount: '金额（USD）',
    docTotal: '预计合计', docCurrency: '币种：USD', docInsurance: '运输与保险：按 Incoterms 条款由相应方承担',
    docDisclaimer: '本单证为平台演示格式，正式交易以双方签署的销售合同 / 采购订单为准。',
    docSellerSign: '卖方（公司盖章）', docBuyerSign: '买方（签署）',
    marketsField: '目标市场', complianceTitle: '目标市场合规清单', complianceHint: '选择产品拟出口的目标市场，平台将提示常见认证与合规要求',
    complianceEmpty: '未选择目标市场，无法提供合规清单', complianceRef: '清单为常见要求汇总，正式出口前请以目的国主管机构最新规定为准。',
    translateLabel: '实时翻译 · 仅供参考', translateToggle: '译', translatedFrom: '原文',
    translateNote: '机器翻译结果仅供参考，不构成要约或承诺；正式沟通请以原文为准。',
    translating: '翻译中…', transOffline: '离线词典', transService: '第三方机器翻译服务',
    otherLang: '其他', chooseLang: '选择语言', langAuto: '跟随浏览器语言（推荐）',
    langNote: '界面文案未完全覆盖的语言暂以英文显示；实时翻译支持 20+ 种语言。',
    sourceLang: '原文', srcLangField: '产品语言（发布语言）', srcLangAuto: '自动（按卖家地区）',
    firstVisitTitle: '欢迎来到豆豆鼠！', firstVisitDesc: '选择您的语言，即可用当地语言浏览产品与资讯。',
    gotIt: '知道了', translateRef: '译文参考',
    fakeTitle: '防伪验证', fakeCheck: '防伪查询', fakeCode: '防伪码', fakeEnter: '请输入防伪码，验证产品真伪',
    fakePlaceholder: '如 BBM-1-42', fakeVerify: '验证', fakeHint: '示例防伪码可在产品详情页“验证真伪”中查看',
    fakeNotFound: '未找到该防伪码，请核对后重试', fakeGenuine: '正品 · 已验证',
    fakeOkTitle: '验证通过 · 正品', fakeInfo: '该防伪码对应平台已备案产品，产品信息与认证供应商一致，可放心联系交易。',
    fakeProduct: '产品', fakeSeller: '认证供应商', fakeIssued: '平台签发', fakeVerifiedAt: '验证时间',
    fakeScan: '扫码验真（演示）', fakeScanNote: '正式版将接入权威验真服务与区块链存证。',
    fakeSiteTitle: '官方平台认证', fakeSiteDesc: '本网站为豆豆鼠（BeanBeanMouse）官方平台。请认准官方域名与平台验真码，谨防仿冒钓鱼网站。',
    fakeDomain: '官方域名',
    fakeSiteCode: '平台验真码', verifySite: '验证本站真伪',
    needLogin: '请先登录后使用工作台', welcomeBack: '欢迎回来', guestName: '游客',
    buyerCenter: '买家中台', sellerCenter: '卖家工作台', youAre: '当前身份：',
    myFavShort: '收藏', inquirySent: '询盘已发送', productSaved: '产品已保存', productDeleted: '产品已删除',
    productOn: '产品已上架', productOff: '产品已下架', inquiryMarked: '询盘已标记为已处理', replySent: '回复已发送',
    priceFrom: '起', perUnit: '/{unit}', totalProducts: '产品', featuredProducts: '精选产品',
    allCategories: '全部品类', allCountries: '全部产地', anyMoq: '不限', allCerts: '全部',
    quickActions: '快捷操作', publishedProducts: '在售产品', totalInquiries: '累计询盘', thisMonthInquiries: '本月询盘',
    copy: '复制成功', languageName: 'EN', brand: 'BeanBeanMouse',
    navInsurance: '运输保险', navContracts: '合同与保管',
    trialNotice: '本平台目前处于试验阶段（Beta），部分功能与数据仍在完善中；若您有合作意向，请联系',
    trialDismiss: '知道了', partnerContact: '商务合作',
    insuranceTitle: '运输保险', insuranceBuy: '购买保险', insuranceActive: '保障生效中', insuranceCancelled: '保单已取消',
    insuranceCancel: '取消保单', insurancePartnersNote: '当前为平台试点保障，第三方保险公司合作接入中；投保即表示同意保险条款与免责说明。',
    insNotEligible: '当前订单状态不支持投保', insProviderLabel: '承保方', insTierLabel: '保障档位', insPremiumLabel: '保费',
    insTierBasic: '基础保障', insTierStandard: '标准保障', insTierPremium: '尊享保障',
    insCoverageLabel: '保障范围', insSelectTier: '请选择保障档位',
    insurancePageTitle: '第三方运输保险', insurancePageSub: '为跨境订单提供运输风险保障；平台试点计划已上线，更多合作保险商即将接入。',
    insurancePageNote: '理赔与合规说明：本服务为试点框架，最终承保与理赔条款以签署的保险单为准；正式接入合作保险商后将展示其牌照与备案信息。',
    contractsTitle: '合同草案参考与平台保管', contractsSub: '基于订单信息生成国际货物买卖合同草案（仅供参考），双方确认后可下载 PDF，并可申请平台免费保管 30 天。',
    contractSelectOrder: '选择订单', contractNoOrders: '暂无可用订单，请先创建订单。', contractGenerate: '生成合同草案',
    contractDraftLabel: '合同草案（可自行修改后再保管）', contractDownloadPdf: '下载 PDF（打印）', contractCustody: '申请 30 天平台保管',
    contractCustodyDone: '已申请平台保管', contractExpiresAt: '保管到期', contractHash: '合同哈希',
    contractWarnings: '双方注意（草案漏洞与风险提示）', contractWarningTitle: '以下事项建议在正式签署前书面确认，缺失可能带来履约风险：',
    contractWarn1: '付款节点与单据：建议明确信用证（L/C）或电汇（T/T）的具体节点、银行信息与单据要求（如提单、发票、装箱单）。',
    contractWarn2: '质量验收标准：建议约定样品封样、AQL 抽检标准或第三方检验机构（如 SGS/BV），避免仅凭“合格”产生争议。',
    contractWarn3: '出口管制与合规：请核对商品是否属于出口管制/两用物项，并确认目的国进口许可与标签要求。',
    contractWarn4: '争议解决：跨境执行依赖仲裁地选择，建议书面约定仲裁机构（如 HKIAC/SIAC/CIETAC）与适用法律。',
    contractWarn5: '货损与保险：请与运输保险联动，明确货损责任边界与索赔时限，避免理赔争议。',
    contractSignBlock: '双方签署', contractSignParty: '卖方（盖章/签字）：', contractSignParty2: '买方（盖章/签字）：',
    contractPrintHint: '选择“另存为 PDF”可生成电子版合同；双方各留一份。', contractNeedLogin: '请先登录后再使用合同服务。',
    contractSelectHint: '请选择一笔订单后生成草案。', contractCustodyRecords: '我的保管记录',
    custodyActiveLabel: '保管中', custodyExpiredLabel: '已到期', contractDraftNotice: '本草案由平台自动生成，仅供参考，不构成法律意见；正式签署前请双方律师/法务审核。',
    contractDate: '日期', contractNo: '合同编号', contractId: '订单号', contractQty: '数量', contractUnitPrice: '单价',
    contractTotal: '总金额', contractIncoterm: '贸易术语', contractDelivery: '交货期', contractPayment: '付款方式',
    contractInspection: '检验', contractForceMajeure: '不可抗力', contractDispute: '争议解决', contractTitle2: '国际货物买卖合同草案'
    ,
    navExport: '出口准备', navLogistics: '物流指南', navCompliance: '合规中心', navDisputes: '售后纠纷',
    footerTools: '贸易工具',
  sfEyebrow: '宠物用品自营出口 · 从工厂到海外买家',
  sfTitle: '把好用的宠物用品，送到全世界的毛孩子家里',
  sfSub: '自有供应链，支持整柜出口与一件代发；猫、狗、仓鼠与小宠全线覆盖，可做 OEM/ODM 定制，从打样到清关我们全程跟进。',
  sfArtAlt: '趴在桌边的豆豆鼠',
  sfArtNote: '豆豆鼠 · 你的宠物用品出口搭档',
  sfCtaShop: '看看商品',
  sfCtaVideo: '客户实拍视频',
  sfCtaAsk: '直接问我',
  trustOem: 'OEM / ODM 定制',
  trustShip: '7–15 天出货',
  trustInspect: '出货前验货',
  trustAfter: '售后 30 天响应',
  videoWallTitle: '客户实拍视频墙',
  videoWallDesc: '来自客户使用我们产品后回传的实拍视频，精选后展示。看真实使用效果，比看参数更有用。',
  videoWallMore: '看全部视频',
  videoNoticeTitle: '关于视频来源',
  videoNoticeDesc: '视频由客户投稿并授权我们展示，仅用于产品使用效果参考，不构成产品性能承诺。转载请联系我们。',
  videoSubmit: '我也想投稿',
  promiseTitle: '我们怎么把货交到你手上',
  promise1T: '先打样再量产',
  promise1D: '确认样品与包装后再排产，样品费在批量订单中可抵扣。',
  promise2T: '出货前验货',
  promise2D: '提供出货前检验照片与视频，第三方验货可代为安排。',
  promise3T: '单证齐全',
  promise3D: '商业发票、装箱单、产地证、提单等按目的国要求准备。',
  promise4T: '问题可追溯',
  promise4D: '订单过程留痕，出现货损或争议时按约定流程处理。',
  aboutTitle: '关于我们',
  aboutArtAlt: '豆豆鼠吉祥物',
  aboutP1: '豆豆鼠 BeanBeanMouse 做宠物用品的自营出口：猫、狗、仓鼠与小宠的笼具、用品、食品与智能设备。我们自己做选品、验货与出口单证，把中间环节压到最少。',
  aboutP2: '我们也接受供应商的合作与托管：你负责生产，我们负责选品、包装、出口与售后，风险和库存由我们承担，收益按约定分成。',
  aboutTeaserTitle: '我们是谁',
  aboutTeaserDesc: '自营出口 + 供应商托管合作，做宠物用品这一件事。',
  aboutMore: '了解我们',
  aboutContactTitle: '联系方式',
  aboutPending: '待补充',
  aboutContactEmail: '邮箱',
  aboutContactWechat: '微信',
  aboutContactPhone: '电话',
  aboutContactAddress: '地址',
  aboutContactNote: '微信 / 电话 / 地址待补充，当前可先通过邮箱联系，我们 1 个工作日内回复。',
  askCtaTitle: '有想找的宠物用品？',
  askCtaDesc: '告诉我们品类、数量与目的国，我们 1 个工作日内给到报价与方案。',
  askCtaBtn: '发起询问',
  petsLabel: '适用宠物',
  petSizeLabel: '适用体型',
  materialLabel: '材质',
  versionLabel: '版本 pet0.2（演示）',
  demoNote: '演示版本说明：站内商品图片、价格、企业与订单等均为示例数据，正式上线前会替换为真实信息；请勿据此下单或对外引用。',
  askTitle: '向豆豆鼠询问', askQ1: '你家养的是什么宠物？', askQ2: '想找哪一类用品？', askQ3: '数量、目的国和联系方式',
  askCountry: '目的国 / 收货地', askCountryPh: '例如：德国 · 汉堡', askNote: '还想补充什么？', askNotePh: '例如：需要印我们的 logo，包装要英文',
  askPet: '宠物', askNext: '下一步', askBack: '上一步', askSubmit: '发送询问', askSummary: '你的需求',
  askNeedPick: '请先选一项', askNeedContact: '请填写姓名和有效的邮箱', askDone: '已发送，我们会在 1 个工作日内回复', askFailed: '发送失败',
  demoTag: '示例',
  reviewAccounts: '待审核账号', reviewAccountsNote: '新注册账号默认等待审核；通过后可登录，拒绝后无法登录。', reviewNeedBackend: '（演示模式：连接真实后端后可在此审核账号）', pendingUnit: '个待处理', reviewApprove: '通过', reviewReject: '拒绝', reviewEmpty: '暂无待审核账号', reviewLoadFail: '加载失败：', reviewApproved: '已通过', reviewRejected: '已拒绝', loading: '加载中…',
  verifyTitle: '邮箱验证', verifyChecking: '正在验证，请稍候…', verifyOk: '验证成功！你的邮箱已确认，现在可以登录了。',
  verifyFail: '验证失败：链接可能已失效或被使用过，可以在下面重新发送一封。', verifyNoToken: '链接里没有验证信息，可能是复制时被截断了。',
  gotoLogin: '去登录', resendVerify: '重新发送验证邮件', resendSent: '如该邮箱已注册且未验证，邮件已重新发送',
  aboutPending: '待补充',
  fitTitle: '宠物适配', fitNote: '适配信息由平台标注，下单前建议与我们确认；不同体型与年龄的宠物需求会有差异。',
  demoTagNote: '演示数据：该商品的图片与价格均为示例，正式上线前会替换为真实信息。',
    exportTitle: '出口准备：资质与前置手续', exportSub: '出口不是“下单就发货”。先备齐经营资质、收汇、退税、许可证与商检手续，才能顺利报关、收汇与退税。',
    exportChecklistTitle: '出口资质清单', exportChecklistSub: '逐项核对你的出口资质；正式办理以主管部门最新规定为准。',
    exportWhat: '是什么', exportWho: '办理机构', exportWhen: '何时需要', exportTip: '提示',
    exportReadinessScore: '出口就绪度', exportReadyHigh: '就绪度高，可以放心接单与发布', exportReadyMid: '建议补齐剩余项后再接大额订单',
    exportReadyLow: '资质缺口较多，建议先补齐再发布/接单', exportMarkDone: '标记完成', exportMarkUndone: '撤销',
    exportOptional: '（按品类）', exportNoLoginHint: '登录卖家账号后，可在本站内维护并跟踪你的出口资质清单。',
    exportLoginBtn: '以卖家身份体验', exportGuideNote: '本清单为通用参考，不构成法律意见；请以商务、海关、税务及外汇主管部门最新规定为准。',
    exportProductHint: '发布产品时，平台会结合品类提示对应的出口资质要求。',
    logisticsTitle: '物流与订舱指南', logisticsSub: '从运输方式、拼箱整柜、目的港费用到电放提单，掌握订舱与发运的实操要点。',
    logisticsModeTitle: '运输方式怎么选', logisticsModeNote: '选型依据：货值、体积重量、交期、目的国与成本预算。',
    logisticsContainerTitle: '拼箱与整柜', logisticsContainerNote: '不足整柜选拼箱（LCL），按 CBM 计费并分摊目的港费用；货量接近整柜时直接订整柜更划算。',
    logisticsCostTitle: '目的港费用参考', logisticsCostNote: '清关时最常见的费用项，正式以承运人与目的港代理报价为准。',
    logisticsPortPick: '选择目的港', logisticsTelexTitle: '电放提单（Telex Release）',
    logisticsTelexNote: '发货后卖家把全套正本单据交回承运人，承运人以电子方式放货给收货人，无需等待纸质提单寄达，可避免压港费。只建议与可信买家配合，并明确货款收讫再电放。',
    logisticsEstimateTitle: '运费估算器（演示）', logisticsEstimateHint: '输入货量与目的港，快速得到各运输方式的参考运费区间。',
    logisticsFieldMode: '运输方式', logisticsFieldWeight: '重量（kg）', logisticsFieldVolume: '体积（CBM）',
    logisticsFieldContainer: '柜型 / 拼箱', logisticsFieldOrigin: '起运地', logisticsFieldDestination: '目的港',
    logisticsEstimateBtn: '开始估算', logisticsEstimateResult: '估算结果', logisticsEstimateNote: '仅作演示参考，以承运人实际报价为准。',
    logisticsSpeed: '时效', logisticsCost: '成本', logisticsBestFor: '适合场景',
    shpContainer: '柜型 / 拼箱', shpPortLoading: '装运港', shpPortDischarge: '目的港', shpVessel: '船名 / 航次', shpBillNo: '提单号',
    shpTelex: '电放提单', shpFreightTerms: '运费支付', freightPrepaid: '预付', freightCollect: '到付',
    shpCostEstimate: '费用估算（参考）', shpCostHint: '仅供参考，以承运人报价为准',
    modeCourier: '快递', shpBooking: '订舱', shpDeclaration: '报关', shpLoadOnBoard: '装船', shpDeparture: '开航', shpArrival: '到港', shpClearance: '清关', shpDelivery: '派送',
    complianceTitle: '合规中心', complianceSub: '出口管制、制裁名单、反倾销与产品环保法规——发布前先筛查，避免货到海关被扣。',
    complianceControlTitle: '出口管制与制裁筛查', complianceControlNote: '正式版接入权威名单 API 并自动按 HS 编码/品类核对；当前为演示关键词筛查。',
    complianceListTitle: '重点管制与合规清单', complianceScreenTitle: '产品合规筛查（演示）',
    complianceScreenHint: '输入产品名称或描述，或选择下方示例产品，点击“开始筛查”。',
    complianceScreenBtn: '开始筛查', complianceResultTitle: '筛查结果', complianceClear: '未命中明显管制 / 制裁关键词',
    complianceHits: '命中关注项（仅演示，需人工复核）', complianceDemoProduct: '示例产品',
    complianceDisclaimer: '筛查结果仅作演示参考，不构成合规结论；正式出口前请结合 HS 编码、最终用途与目的国法规做人工复核。',
    compliancePanelTitle: '出口合规筛查', compliancePanelNote: '发布后平台按品名与描述做管制/制裁关键词筛查（演示）。',
    compliancePassLabel: '未命中风险', complianceFlagLabel: '关注项', complianceMarketTitle: '目标市场合规',
    complianceScreenDemo: '演示筛查', adminScreenLabel: '出口管制筛查',
    viewSellerPage: '供应商主页', sellerTrustTitle: '平台核验与信任',
    sellerCertsTitle: '认证与证书', sellerMarketsTitle: '目标市场',
    sellerProductsTitle: '在售商品', sellerContact: '联系供应商',
    sellerTrustNote: '展示信息基于平台企业认证与商品资料，供决策参考；正式合作请另行尽调。',
    sellerPageNote: '演示页：认证与证书来自演示企业资料。',
    disputesTitle: '售后与纠纷中心', disputesSub: '订单交付后的质量异议、退换货与平台仲裁都在这里处理，全程自动纳入订单存证链。',
    afterSalesTitle: '售后与纠纷', afterSalesCreate: '申请售后', afterSalesOpen: '发起纠纷',
    afterSalesTypeLabel: '问题类型', afterSalesDescLabel: '问题描述', afterSalesResolution: '期望解决方案',
    afterSalesSubmit: '提交申请', afterSalesTypes: '问题类型',
    afterSalesNew: '待处理', afterSalesResponded: '卖家已回复', afterSalesArbitrating: '平台仲裁中', afterSalesResolved: '已解决', afterSalesClosed: '已关闭',
    afterSalesRespond: '回复买家', afterSalesAccept: '接受诉求', afterSalesReject: '拒绝并说明', afterSalesArbitrate: '平台裁决',
    afterSalesArbitrateTip: '管理员可查看订单存证链后裁决：支持买家 / 支持卖家 / 双方协商。',
    arbitrateBuyer: '支持买家', arbitrateSeller: '支持卖家', arbitrateCompromise: '双方协商',
    afterSalesRuling: '裁决结果', afterSalesEmpty: '暂无售后 / 纠纷记录', afterSalesNote: '售后与纠纷的关键节点会自动写入订单存证链，双方与平台均可核验。',
    afterSalesCaseNo: '案件编号', afterSalesOrder: '关联订单', afterSalesAppliedAt: '申请时间', afterSalesBy: '申请人',
    afterSalesEvidence: '查看存证', afterSalesNeedLogin: '请先登录，售后与纠纷与你的订单关联。',
    docCenter: '单据中心', docCenterSub: '按订单生成商业发票、装箱单、原产地证与提单参考件；单证信息必须一致，否则影响清关。',
    docGenerate: '生成', docGenerated: '已生成', docCI: '商业发票', docPL: '装箱单', docCO: '原产地证（参考）', docBL: '提单（参考件）',
    docConsistency: '单证一致性检查', docConsistencyCheck: '重新核对', docConsistencyPass: '通过：品名、HS 编码、数量、唛头信息一致',
    docConsistencyWarn: '需补充：单据信息不完整', docConsistencyFail: '不一致：请修正商品信息后重新生成',
    docMarks: '唛头', docCartons: '箱数', docGrossWeight: '毛重', docNetWeight: '净重',
    docConsignee: '收货人', docNotify: '通知方', docVessel: '船名 / 航次', docBillNo: '提单号',
    docOriginClaim: '原产地声明', docIssue: '签发', docCheckHint: '三单一致（发票、箱单、提单）是清关的基本要求。',
    docBLHint: '参考件用于演示单据流；真实提单由承运人签发，信息以承运人出具为准。',
    docCOHint: '参考件用于演示；正式原产地证请向贸促会或海关申领。',
    docPIHint: '形式发票已支持打印，商业发票为正式结算与清关单据。',
    prodImgLabel: '真实商品图（可多选）', prodImgHint: '建议 800×800 以上实拍图，JPEG/PNG，最多 8 张',
    imgRemove: '移除图片', imgDefaultName: '图片', imgMax: '最多上传 8 张商品图',
    exportTab: '出口资质', exportTabHint: '维护你的出口资质清单，平台会在发布产品时提示缺口。',
    adminAfterSales: '纠纷仲裁', adminAfterSalesHint: '仲裁前可查看订单存证链与双方沟通记录。',
    adminExportReady: '出口就绪度', asPanelTitle: '售后与纠纷', asApplyBtn: '申请售后', asDisputeBtn: '发起纠纷',
    asRelatedOrder: '关联订单', asStatusCol: '状态', asMyCases: '我的售后 / 纠纷',
    roleSeller: '卖家', roleBuyer: '买家', signedIn: '已登录：', signedOut: '已退出登录',
    heroDealsHint: '今日交易成功案例 · 实时滚动（预留）', download: '下载', yes: '是', no: '否',
    asBuyerDesc: '搜索产品、筛选对比、发送询盘并跟踪供应商回复',
    asSellerDesc: '发布产品、管理询盘、回复买家报价',
    switchRole: '切换角色', yourReply: '您的回复：',
    messagesTab: '消息', messagesEmpty: '暂无会话，从询盘开始沟通吧', chatPlaceholder: '输入消息…', chatSend: '发送',
    chatRead: '已读', chatAutoReply: '已收到您的消息，我们会尽快回复。',
    exportCsv: '导出 CSV',
    notificationsTitle: '通知', notificationsEmpty: '暂无通知', markAllRead: '全部已读', unreadLabel: '条未读',
    notifNewInquiry: '收到新询盘', notifNewQuote: '收到新报价', notifAfterSales: '售后 / 纠纷进展', notifFeedback: '建议处理结果',
    searchBtn: '搜索', searchSuggestTitle: '热门搜索', searchBarPlaceholder: '搜索产品 / 品类 / HS 编码，例如：折叠椅、螺丝刀…',
    catStripTitle: '品类速览', catStripSub: '轻扫查看全部品类', viewAllCats: '查看全部',
    relatedTitle: '相关推荐', relatedSub: '没有找到完全匹配的商品，为你推荐以下相关商品',
    subFilter: '细分 / 适用宠物', allSubs: '全部细分',
    profileTab: '个人信息', profileTitle: '个人信息与名片', profileSub: '完善资料会显示在询盘与订单中，帮助对方更快信任你。',
    businessCard: '名片',
    cardWatermarkNote: '对方展示与下载的名片带轻量水印，防止被冒用。',
    profileCompleteness: '资料完整度', profileSave: '保存资料', profileSaved: '资料已保存',
    accountTypeLabel: '主体类型', accountTypeIndividual: '个体户 / 个人', accountTypeCompany: '公司代表',
    jobTitle: '职务 / 头衔', profileContact: '联系方式', profileBio: '简介 / 业务范围',
    cardUploadBtn: '上传名片', cardReplaceBtn: '更换名片', cardRemoveBtn: '移除名片', cardUploadHint: '支持 JPG / PNG，单个不超过 4MB',
    cardPreviewLabel: '我的名片', cardNoCard: '尚未上传名片', cardAttachHint: '发送询盘时可选择附上名片，让对方直接认识你。',
    cardTemplatesTitle: '名片模板（可选）', cardTemplatesSub: '选择一套模板，用你的资料一键生成名片；也可上传自己的图片。',
    cardTemplateApply: '生成', cardTemplateApplied: '已生成模板名片', cardCustomTitle: '自定义',
    cardCustomHint: '上传你自己的名片图片，即可自定义 Logo、配色与排版。',
    cardCustomizeTitle: '自定义设置', cardAccentColor: '主色', cardFont: '姓名字体',
    cardFontKai: '楷体（东方韵）', cardFontSerif: '衬线（优雅）', cardFontSans: '无衬线（现代）',
    cardLogoUpload: '上传 Logo（可选）', cardApplyCustom: '用自定义设置生成', customCardApplied: '已应用自定义设置生成名片',
    cardFlip: '翻转', cardDragHint: '拖拽可旋转 · 点击翻转查看背面',
    storageFull: '本地存储空间不足，请删除部分附件或旧数据后重试',
    payTitle: 'PayPal 支付（演示）', payProvider: '支付', payFirstChannel: '首发通道',
    payWith: '用 PayPal 支付', payDone: '支付成功（演示，未产生真实扣款）',
    payPending: '待支付', payPaid: '已支付（演示）',
    payNote: '演示环境：不会产生真实扣款。正式收款需接入 PayPal 商户与平台合规配置。',
    identityLabel: '询盘身份', identityPublic: '身份对卖家可见', identityHidden: '匿名询盘（不显示身份）',
    sendCard: '随询盘发送名片', viewCard: '查看名片', downloadCard: '下载名片', cardSentTag: '已附名片',
    attachLabel: '附件（图片 / 压缩包）', attachHint: '支持 JPG / PNG / GIF / WebP 图片与 ZIP / RAR / 7Z 压缩包，单个不超过 4MB',
    attachPick: '选择文件', attachList: '已选附件', attachRemove: '移除', attachSizeTooBig: '单个附件不能超过 4MB',
    attachTotalTooBig: '附件总量不能超过 2.5MB，请精简后重试',
    attachTypeNotAllowed: '仅支持图片与 ZIP / RAR / 7Z 压缩包', attachmentCount: '个附件', attachmentLabel: '附件',
    exportConv: '导出对话', exportTxt: '导出 TXT', exportHtml: '导出 HTML（含图片）', exportConvHint: '导出询盘往来记录与附件清单，便于归档与留证。',
    regAccountType: '主体类型 *', regIndividual: '个体户 / 个人', regCompany: '公司代表', regBizName: '经营者 / 字号', regJobTitle: '职务（如：采购经理）',
    regRoleHint: '客户用于采购与询价；商家用于供货或托管合作申请，需提交资质材料由我们审核。',
    feedbackTitle: '优化建议收集', feedbackSub: '页面、功能、内容或体验上的任何建议都可以告诉我们，运营团队会定期整理并回复。',
    feedbackType: '建议类型', feedbackTypePage: '页面 / 视觉', feedbackTypeFeature: '功能', feedbackTypeContent: '内容 / 信息', feedbackTypeUx: '体验 / 流程', feedbackTypeOther: '其他',
    feedbackContent: '建议内容 *', feedbackContact: '联系方式（可选）', feedbackSubmit: '提交建议', feedbackThanks: '感谢你的建议',
    feedbackThanksDesc: '我们已经收到，运营团队会定期整理并纳入优化清单。', feedbackPrivacy: '除你主动填写的联系方式外，我们不会收集其他个人信息。',
    navFeedback: '建议反馈', adminFeedback: '优化建议', feedbackNew: '新建议', feedbackSeen: '已读', feedbackDone: '已采纳',
    feedbackStatus: '状态', feedbackMarkSeen: '标记已读', feedbackMarkDone: '标记已采纳', feedbackEmpty: '暂无建议',
    feedbackMarkSeenDone: '已标记'
  },
  en: {
    home: 'Home', marketplace: 'Products', dashboard: 'Dashboard', login: 'Sign in', logout: 'Sign out',
    heroTitle: 'Connecting Global Buyers with Trusted Suppliers',
    heroSub: 'Publish products, filter precisely and send inquiries — one platform for simpler cross-border trade.',
    heroPilot: 'Pilot vertical · Pet Supplies (Hamsters · Cats & Small Dogs · Large Dogs)',
    searchPlaceholder: 'Search products, e.g. hamster cage, cat tree, dog harness…',
  popular: 'Popular:',
    categoriesTitle: 'Top Categories', featuredTitle: 'Featured Products', viewAll: 'View all',
    howTitle: 'Close a cross-border deal in 3 steps', howStep1Title: 'Suppliers publish', howStep1Desc: 'Add specs, pricing and certifications, then go live.',
    howStep2Title: 'Buyers search & filter', howStep2Desc: 'Filter by category, price, MOQ and origin.',
    howStep3Title: 'Inquire & quote', howStep3Desc: 'Buyers send inquiries; suppliers reply fast. Contacts stay protected.',
    trustTitle: 'Platform protection', trust1Title: 'Verified companies', trust1Desc: 'Business licenses verified to block fake suppliers.',
    trust2Title: 'Inquiry delivery', trust2Desc: 'In-app + email notifications bridge time zones.',
    trust3Title: 'Multilingual', trust3Desc: 'Bilingual UI and product data serve global buyers.',
    sellerCtaTitle: 'Become a supplier — free to join', sellerCtaDesc: 'Get inquiries from global buyers with zero upfront cost.', sellerCtaBtn: 'Open seller dashboard',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse demo prototype · For design demonstration only',
    resultsCount: 'results', filters: 'Filters', category: 'Category', priceRange: 'Price range (USD)', minPrice: 'Min', maxPrice: 'Max',
    moq: 'Min. order', origin: 'Origin', certs: 'Certifications', clearFilters: 'Clear filters', sort: 'Sort',
    sortRecommended: 'Recommended', sortNewest: 'Newest', sortPriceAsc: 'Price low → high', sortPriceDesc: 'Price high → low',
    noResults: 'No matching products', noResultsHint: 'Try adjusting filters or keywords', searchResultsFor: 'Results for “{kw}”',
    moqLabel: 'MOQ', verified: 'Direct from us', hot: 'Hot', new: 'New', sendInquiry: 'Ask BeanBeanMouse', viewDetail: 'View details',
    priceRangeLabel: 'Price range', leadTime: 'Lead time', terms: 'Trade terms', originLabel: 'Origin', seller: 'Supplier', statusPill: 'Status',
    responseRate: 'Response rate', responseTime: 'Avg. response', since: 'Since', orders: 'Total orders', unitLabel: 'Unit',
    productDetail: 'Product details', features: 'Key features', aboutSeller: 'About the supplier', days: 'days',
    favorite: 'Favorite', favorited: 'Favorited', inquiryTitle: 'Ask BeanBeanMouse', quantity: 'Order quantity', message: 'Inquiry message',
    messagePlaceholder: 'Tell the supplier your quantity, target price, packaging requirements, etc.',
    contactName: 'Contact name', contactEmail: 'Email', companyName: 'Company', countryLabel: 'Country',
    send: 'Send inquiry', cancel: 'Cancel', close: 'Close', required: 'Please fill in required fields', invalidEmail: 'Invalid email format',
    inquirySuccessTitle: 'Inquiry sent', inquirySuccessDesc: 'The supplier has received your inquiry and will reply via message and email. Track it under “My inquiries”.',
    viewMyInquiries: 'View my inquiries', continueBrowsing: 'Keep browsing',
    overview: 'Overview', productManage: 'Products', publish: 'Publish', inquiryManage: 'Inquiries',
    statLive: 'Live products', statInquiries: 'Inquiries (month)', statPending: 'Pending replies', statRate: 'Avg. response rate',
    recentInquiries: 'Recent inquiries', newProduct: 'New product', edit: 'Edit', delete: 'Delete',
    onShelf: 'Go live', offShelf: 'Unlist', onShelfLabel: 'Live', offShelfLabel: 'Unlisted', deleteConfirm: 'Delete this product? This cannot be undone.',
    noProducts: 'No products yet — publish your first one now', saveProduct: 'Save product', updateProduct: 'Update product',
    cancelEdit: 'Cancel edit', chooseImage: 'Image palette', previewLabel: 'Preview',
    titleEn: 'Title (English, shown to buyers)', titleZh: 'Title (Chinese)', descEn: 'Description (English)', descZh: 'Description (Chinese)',
    leadTimeField: 'Lead time (days)', termsField: 'Trade terms', moqField: 'Min. order qty', unitField: 'Unit', countryField: 'Origin',
    priceMinField: 'Min price (USD)', priceMaxField: 'Max price (USD)', categoryField: 'Category', certsField: 'Certifications',
    inquiryFrom: 'Inquiry from', reply: 'Reply', replied: 'Replied', markHandled: 'Mark handled', noInquiries: 'No inquiries yet',
    replyPlaceholder: 'Type your reply (the buyer will see it under “My inquiries”)…', sendReply: 'Send reply',
    myInquiries: 'My inquiries', myFavorites: 'My favorites', noInquiriesYet: 'No inquiries sent yet', noFavoritesYet: 'No favorites yet',
    sentAt: 'Sent at', statusNew: 'Awaiting reply', statusReplied: 'Supplier replied', sellerReply: 'Supplier reply',
    loginTitle: 'Try the demo', loginDesc: 'This is a prototype. Pick a role to experience the full flow — no registration needed.',
    loginOrDemo: 'Or try a demo role', loginFailed: 'Sign-in failed',
  loginTag: 'Pet supplies, exported direct', loginTrust1: 'Verified companies', loginTrust2: '25+ languages, real-time', loginTrust3: 'Anti-counterfeit & evidence',
    asBuyer: 'Continue as buyer', asSeller: 'Continue as seller', asGuest: 'Browse as guest',
    asAdmin: 'Continue as platform admin', adminDesc: 'Review products, verify companies, manage users and view platform data',
    loginNote: 'Note: all data is stored locally in your browser and survives refresh.',
    adminPanel: 'Admin Console', adminOverview: 'Overview', productReview: 'Product review', companyVerify: 'Company verification', userManage: 'Users', auditLog: 'Audit log',
    statUsers: 'Registered users', statPendingProducts: 'Pending products',
    inqByCategory: 'Inquiries by category', inqByCountry: 'Inquiries by country', latestActivity: 'Recent activity',
    reviewHint: 'Review basis: prohibited items, IP infringement, certificate authenticity',
    approve: 'Approve', reject: 'Reject', rejectReason: 'Enter a reject reason (notified to the seller)',
    riskHints: 'Compliance check', noRisk: 'No obvious risks', riskKeyword: 'Possible prohibited keyword: {kw}', riskNoCert: 'No certifications provided',
    reviewPassed: 'Product approved and now live', reviewRejected: 'Product rejected',
    pendingLabel: 'Pending', rejectedLabel: 'Rejected',
    pendingVerify: 'Pending verification', verifiedLabel: 'Verified', rejectedVerify: 'Rejected',
    verifyCompany: 'Approve company', rejectVerify: 'Reject company', docsLabel: 'Documents',
    freeze: 'Freeze', unfreeze: 'Unfreeze', userFrozen: 'Account frozen', userUnfrozen: 'Account unfrozen',
    frozenBlocked: 'This account has been frozen by the platform. Please contact the administrator.',
    companyApproved: 'Company verified', companyRejected: 'Company certification rejected',
    logActor: 'Actor', logAction: 'Action', logTarget: 'Target', logTime: 'Time', logDetail: 'Detail', logsEmpty: 'No audit records yet',
    legalNote: 'Demo placeholder: full legal terms and abuse reporting will be linked here in production',
    userAgreement: 'Terms of Service', privacyPolicy: 'Privacy Policy', reportAbuse: 'Report Abuse',
    productSubmitted: 'Product submitted for review; it goes live after approval',
    adminRoleTag: 'Admin', roleCol: 'Role', companyCol: 'Company', countryCol: 'Country', joinedCol: 'Joined',
    activeStatus: 'Active', frozenStatus: 'Frozen', sellerRoleLabel: 'Seller', buyerRoleLabel: 'Buyer',
    noPending: 'No pending products', noCompanies: 'No pending companies', noUsers: 'No users',
    registerTab: 'Sign up', loginTab: 'Log in', regTitle: 'Create account', regName: 'Name', regEmail: 'Email',
  regPassword: 'Password (min 8 chars, letters + numbers)', regRole: 'Register as', regRoleBuyer: 'Client (I want to buy)', regRoleSeller: 'Supplier (supply / managed partnership)',
  supDocTitle: 'Documents we require',
  supDocNote: 'We review within 3 business days. Approved partners discuss supply or a managed partnership — we handle selection, packaging, export and after-sales.',
  supDoc1: 'Business licence or factory registration',
  supDoc2: 'Test reports (CE / FCC / RoHS / food-contact materials etc.)',
  supDoc3: 'Trademark registration or brand authorisation (if applicable)',
  supDoc4: 'Production licence or industry permit (required for food & feed)',
  supDoc5: 'Factory / workshop photos and capacity statement',
  supDoc6: 'Export declaration and settlement entity details',
    regCompanyName: 'Company / factory name (must be real & verifiable)', regCountry: 'Country / region', regCity: 'City (optional)',
    regRegNo: 'Business registration number', regLicenseNo: 'License number (optional)', regCompanyWebsite: 'Company website (optional)',
    regContact: 'Contact person / phone', regScope: 'Main business scope', regSubmit: 'Sign up', regNote: 'Verify your email after sign-up; sellers must pass company/factory verification before publishing.',
    registerOk: 'Registered! Check your inbox to verify (demo auto-verifies)', verifyEmailTitle: 'Email verification', verifyEmailOk: 'Email verified — please log in',
    emailExists: 'This email is already registered', botDetected: 'Suspicious sign-up detected',
    companyPending: 'Verification in review', companyApproved: 'Company verified ✓', companyRejected: 'Verification rejected', companyApply: 'Submit company info',
    companyResubmit: 'Re-submit', companyReason: 'Reason', companyTip: 'To protect buyers, only real and verifiable companies/factories can publish after review.',
    myOrders: 'My orders', orders: 'Orders', noOrders: 'No orders yet', orderTotal: 'Order total', orderStatusCreated: 'Awaiting receipt confirmation',
    orderStatusComplete: 'Deal completed', orderStatusCancelled: 'Cancelled', confirmReceipt: 'Confirm receipt (complete deal)', dealDone: '🎉 Deal completed! Thank you for the trust',
    tipTitle: 'Send a tip', tipHint: 'Optional, visible to both parties, cancellable before settlement', tipAmount: 'Amount (USD)', tipNote: 'Message (optional)',
    tipSend: 'Send tip', tipCancel: 'Cancel tip', tipList: 'Tips', tipCancelled: '(cancelled)', tipReceived: 'Tip received',
    categoryRequestBtn: "Can't find a category? Tell us", categoryRequestTitle: 'Request a category', catName: 'Category you need', catDesc: 'Details (optional)',
    catMarkets: 'Target markets (comma separated, optional)', catSubmit: 'Submit request', catSubmitted: 'Request recorded — we may invite suppliers for this category',
    catStatusNew: 'Open', catStatusInvited: 'Suppliers invited', catStatusDone: 'Done', catRequests: 'Category requests', catNote: 'Note',
    companiesReview: 'Company verification', approve: 'Approve', reject: 'Reject', rejectReasonPh: 'Rejection reason (required)',
    newsUpdated: 'Live', updatedAgo: 'updated',
    navNews: 'Trade News', newsTitle: 'Trade News', newsSub: 'Official and authoritative trade information, aggregated and pushed by your regions — every item links to its source',
    policyBrief: 'Policy brief', newsCatFilter: 'Category', newsRegionFilter: 'Regions you follow',
    newsRegionHint: 'Select regions to aggregate news (email and push subscription supported in production)',
    viewSource: 'View source', sourceLabel: 'Source', sourceDirectory: 'Official sources', sourceDirectorySub: 'For verification and deeper research, visit these official channels',
    newsDisclaimer: 'Demo notice: items are summaries based on public reporting; production will pull live official feeds. Every item links to a verifiable source.',
    noNews: 'No news matches the current filters', newsSyncedAt: 'Last synced', newsRefresh: 'Refresh',
    newsRefreshed: 'Synced with official sources (demo simulation)',
    newsIntegration: 'Production integration: a server-side aggregator polls official sites/RSS (GACC, MOFCOM, WTO, EU Taxation & Customs, USTR, etc.) with AI summarization and translation.',
    fxReference: 'Reference FX rates', fxNote: 'Demo reference mid-rates; actual rates per bank quote',
    hsCode: 'HS Code', hsHint: 'For tariff lookup and customs declaration', noHsCode: 'Not provided',
    payment: 'Payment terms', paymentHint: 'Preferred payment terms', incotermsLegend: 'Trade terms guide (Incoterms® 2020)',
    quoteTitle: 'Quotation', quotePrice: 'Unit price (USD)', quoteIncoterm: 'Incoterm', quotePayment: 'Payment terms',
    quoteValidity: 'Validity (days)', quoteLeadTime: 'Lead time (days)', quoteNote: 'Quote notes', sendQuote: 'Send quotation',
    quoteSent: 'Quotation sent', quotedStatus: 'Quoted', quoteBlock: 'Supplier quotation', complianceTip: 'Customs tip',
    complianceTipText: 'Before shipping, confirm the destination country\'s import certification, labelling and duty requirements; for large orders, consider third-party inspection and trade-assurance terms.',
    docReference: 'Document format reference', docStandardNote: 'Based on internationally accepted formats (U.S. Dept. of Commerce, trade.gov, etc.):',
    docQuotation: 'Quotation', docProforma: 'Proforma Invoice',
    docQuotationFields: 'Quotation no. / date / validity\nSeller and buyer names and addresses\nItem details (HS code, description, specification)\nQuantity, unit price, extended total\nIncoterms\nPayment terms\nDelivery time\nShipping & insurance\nRemarks, signature and stamp',
    docProformaFields: 'A pro forma invoice is a quotation in invoice format; usually no validity\nInvoice no. / date\nSeller and buyer names and addresses\nItem details (HS code, description, quantity, unit price, amount)\nIncoterms and payment terms\nDelivery time and shipping method\nFor customs clearance, advance payment and order confirmation',
    printQuotation: 'Print quotation', printProforma: 'Print proforma invoice', printNow: 'Print / Export PDF',
    printHint: 'Choose “Print”, then select “Save as PDF” in the dialog to export the file.',
    docNo: 'Document No.', docDate: 'Date', docValidUntil: 'Valid until', docSeller: 'Seller', docBuyer: 'Buyer',
    docItem: 'No.', docDesc: 'Description & spec', docQty: 'Qty', docUnitPrice: 'Unit price (USD)', docAmount: 'Amount (USD)',
    docTotal: 'Estimated total', docCurrency: 'Currency: USD', docInsurance: 'Shipping & insurance: borne by the relevant party per Incoterms',
    docDisclaimer: 'This document is a demo format; the signed sales contract / PO prevails.',
    docSellerSign: 'Seller (company stamp)', docBuyerSign: 'Buyer (signature)',
    marketsField: 'Target markets', complianceTitle: 'Target market compliance checklist', complianceHint: 'Select your target export markets to see common certification and compliance requirements',
    complianceEmpty: 'No target market selected', complianceRef: 'Summary of common requirements — always confirm with the destination authority before export.',
    translateLabel: 'Real-time translation · for reference only', translateToggle: 'TR', translatedFrom: 'Original',
    translateNote: 'Machine translation is for reference only and is not an offer or commitment. The original text prevails in formal communication.',
    translating: 'Translating…', transOffline: 'offline dictionary', transService: 'third-party machine translation',
    otherLang: 'Other', chooseLang: 'Choose language', langAuto: 'Use browser language (recommended)',
    langNote: 'Languages without full UI coverage fall back to English; live translation supports 20+ languages.',
    sourceLang: 'Original text', srcLangField: 'Product language (source)', srcLangAuto: 'Auto (by seller region)',
    firstVisitTitle: 'Welcome to BeanBeanMouse!', firstVisitDesc: 'Choose your language to browse products and news in your local language.',
    gotIt: 'Got it', translateRef: 'Translation',
    fakeTitle: 'Anti-counterfeit verification', fakeCheck: 'Verify product', fakeCode: 'Anti-counterfeit code', fakeEnter: 'Enter the anti-counterfeit code to verify the product',
    fakePlaceholder: 'e.g. BBM-1-42', fakeVerify: 'Verify', fakeHint: 'Sample codes are shown in “Verify” on each product page',
    fakeNotFound: 'Code not found. Please check and try again.', fakeGenuine: 'Genuine · Verified',
    fakeOkTitle: 'Verification passed · Genuine', fakeInfo: 'This code matches a registered product on the platform and its certified supplier. Safe to contact.',
    fakeProduct: 'Product', fakeSeller: 'Certified supplier', fakeIssued: 'Issued by platform', fakeVerifiedAt: 'Verified at',
    fakeScan: 'Scan to verify (demo)', fakeScanNote: 'The release version will integrate authoritative verification services and blockchain records.',
    fakeSiteTitle: 'Official platform certification', fakeSiteDesc: 'This is the official BeanBeanMouse platform. Check the official domain and platform code to avoid phishing sites.',
    fakeDomain: 'Official domain',
    fakeSiteCode: 'Platform verification code', verifySite: 'Verify this site',
    needLogin: 'Please sign in to use the dashboard', welcomeBack: 'Welcome back', guestName: 'Guest',
    buyerCenter: 'Buyer center', sellerCenter: 'Seller dashboard', youAre: 'Current role: ',
    myFavShort: 'Favorites', inquirySent: 'Inquiry sent', productSaved: 'Product saved', productDeleted: 'Product deleted',
    productOn: 'Product is live', productOff: 'Product is unlisted', inquiryMarked: 'Inquiry marked as handled', replySent: 'Reply sent',
    priceFrom: 'From', perUnit: '/{unit}', totalProducts: 'products', featuredProducts: 'featured products',
    allCategories: 'All categories', allCountries: 'All origins', anyMoq: 'Any', allCerts: 'All',
    quickActions: 'Quick actions', publishedProducts: 'Live products', totalInquiries: 'Total inquiries', thisMonthInquiries: 'Inquiries this month',
    copy: 'Copied', languageName: '中文', brand: 'BeanBeanMouse'
    ,tipSkip: 'Skip', tipLater: 'Maybe later', tipSkipped: 'No problem - you can send a tip anytime from the order.',
    tipCallout: 'Deal complete - thank you for trusting BeanBeanMouse! If you wish, you can send a small voluntary tip to the other party. No obligation at all.',
    tipViewBtn: 'View / send tip', tipDismissBtn: 'Skip', tipDismissed: 'Noted. You can still send a tip from the order anytime.',
    shipmentTitle: 'Live cargo tracking', shipmentNoShipment: 'No shipment yet', shipmentCreate: 'Create shipment',
    shipmentCarrier: 'Carrier', shipmentTrackingNo: 'Tracking no.', shipmentOrigin: 'Origin', shipmentDestination: 'Destination',
    shipmentEta: 'ETA', shipmentRemark: 'Remark (optional)', shipmentCreateBtn: 'Create & notify buyer',
    shipmentMode: 'Transport mode', modeLand: 'Land (horse cart)', modeSea: 'Sea (sailing ship)', modeAir: 'Air (airship)',
    escortTitle: 'BeanBeanMouse Courier · Escorting', phaseStart: 'Start', phaseTransit: 'In transit', phaseEnd: 'Done',
    shipmentAddEvent: 'Update tracking', shipmentCurrent: 'Current location', shipmentEvent: 'Tracking events',
    shipmentNotePh: 'e.g. Loaded on vessel, B/L issued', shipmentLocPh: 'e.g. Ningbo Port', shipmentEventAdded: 'Tracking updated',
    shpProcessing: 'Processing', shpPacked: 'Packed', shpShipped: 'Shipped', shpInTransit: 'In transit', shpCustoms: 'Customs',
    shpOutForDelivery: 'Out for delivery', shpDelivered: 'Delivered', shpException: 'Exception',
    evidenceTitle: 'Process evidence (third-party custody)', evidenceHint: 'Key events are sealed automatically; hash chain protects against tampering and is verifiable by both parties',
    evidenceChainValid: 'Evidence chain intact · not tampered', evidenceChainBroken: 'Evidence chain anomaly - be alert!', evidenceSave: 'Save snapshot',
    evidenceVerify: 'Verify chain', evidenceEmpty: 'No evidence records yet', evidenceHash: 'Hash', evidenceVerifiedAt: 'Sealed at',
    evidencePrint: 'Print evidence report', evidencePrintHint: 'The report includes order info, the evidence list and chain integrity; print or save as PDF.',
    evReportTitle: 'BeanBeanMouse Process Evidence Report', evReportSub: 'Third-party custody · tamper-proof hash chain · verifiable by both parties', evReportNo: 'Report no.',
    evReportSealed: 'Evidence chain intact · no tampering found', evReportBroken: 'Evidence chain anomaly - contact platform support now!',
    evReportNote: 'This report is auto-generated from the order evidence chain for verification and dispute reference only; it is not legal advice.',
    evOrderCreate: 'Order created', evReceiptConfirmed: 'Buyer confirmed receipt', evTipCreate: 'Tip sent', evTipCancel: 'Tip cancelled',
    evShipmentCreate: 'Shipment created', evShipmentEvent: 'Tracking update', evManual: 'Manual snapshot',
    evContractCustody: 'Contract custody', evInsuranceCreate: 'Insurance purchased', evAfterSalesCreate: 'After-sales request',
    evAfterSalesReply: 'After-sales reply', evAfterSalesRuling: 'Platform ruling', evDisputeOpen: 'Dispute opened', evDocGenerated: 'Document generated',
    tipAlready: 'Tipped', tipAgain: 'Thank you! You already sent a tip - you may send another or cancel it.', tipBtnAgain: 'Tip again',
    navCustoms: 'Customs guide', customsTitle: 'Customs & clearance reference', customsSub: 'Per-country import/export document checklists and official sources to avoid delays and penalties',
    customsPick: 'Select destination country/region', customsDocs: 'Common documents', customsSources: 'Official sources', customsNote: 'Notes',
    customsDisclaimer: 'General reference only - always follow the latest local customs rules. Live policy updates will be added.',
    navRecruit: 'Sell with us', recruitTitle: 'Recruit: connect global suppliers', recruitSub: 'Open to factories and trading companies; we recruit by foreign-trade category and help new stores grow',
    recruitCta: 'Apply now', promoTitle: 'Promotion', promoSub: 'Submit a listing-boost request; approved products appear in homepage features and search',
    promoApply: 'Request boost', promoDays: 'Days', promoBudget: 'Budget tier', promoSubmit: 'Submit',
    promoPending: 'Pending', promoApproved: 'Approved', promoRejected: 'Rejected', promoAdmin: 'Promotion review', promoBadge: 'Promoted',
    promoNote: 'Demo feature - billing and ad delivery will be added.',
    errRequired: 'This field is required', errEmail: 'Invalid email', errNumber: 'Enter a valid number', errPositive: 'Must be greater than 0',
    errPriceMax: 'Max price must be >= min price', errPick: 'Please select', errPassword: 'Password needs 8+ chars with letters and numbers',
    subcatField: 'Subcategory (HS reference)', hsRef: 'HS reference', subcatHint: 'Subcategories improve matching and inform recruiting', allSubs: 'All subcategories',
    partyBuyer: 'Buyer', partySeller: 'Seller', party: 'Parties',
    navGuide: 'Trade process guide', guideTitle: 'International trade process reference', guideSub: 'A step-by-step guide from inquiry to after-sales, with terms and risk alerts',
    guideDisclaimer: 'This guide is general reference only and not legal advice. Formal transactions are governed by the signed contract and the latest local regulations.',
    reviewChecklist: 'Review checklist', resubmitHint: 'Rejected products can be edited and resubmitted for review.',
    navInsurance: 'Insurance', navContracts: 'Contracts & Custody',
    trialNotice: 'This platform is currently in trial (Beta). Features and data are still being polished. For partnership inquiries, contact',
    trialDismiss: 'Got it', partnerContact: 'Partnership',
    insuranceTitle: 'Shipping insurance', insuranceBuy: 'Buy insurance', insuranceActive: 'Coverage active', insuranceCancelled: 'Policy cancelled',
    insuranceCancel: 'Cancel policy', insurancePartnersNote: 'This is the platform pilot plan; third-party insurer partnerships are being onboarded. Buying means you accept the policy terms and disclaimers.',
    insNotEligible: 'Insurance is not available for this order status', insProviderLabel: 'Provider', insTierLabel: 'Tier', insPremiumLabel: 'Premium',
    insTierBasic: 'Basic', insTierStandard: 'Standard', insTierPremium: 'Premium',
    insCoverageLabel: 'Coverage', insSelectTier: 'Select a tier',
    insurancePageTitle: 'Third-party shipping insurance', insurancePageSub: 'Protect cross-border orders in transit. The platform pilot plan is live; more partner insurers are coming.',
    insurancePageNote: 'Claims & compliance: this is a pilot framework. Final underwriting and claims terms follow the signed policy. Licensed partner insurers will show their registration info once onboarded.',
    contractsTitle: 'Contract draft reference & custody', contractsSub: 'Generate an international sale of goods contract draft from your order (reference only). Both parties can download the PDF and request 30-day free custody by the platform.',
    contractSelectOrder: 'Select order', contractNoOrders: 'No eligible orders yet. Please create an order first.', contractGenerate: 'Generate draft',
    contractDraftLabel: 'Contract draft (editable before custody)', contractDownloadPdf: 'Download PDF (print)', contractCustody: 'Request 30-day custody',
    contractCustodyDone: 'Custody requested', contractExpiresAt: 'Custody expires', contractHash: 'Contract hash',
    contractWarnings: 'Attention to both parties (draft gaps & risks)', contractWarningTitle: 'Confirm these points in writing before signing to avoid performance risks:',
    contractWarn1: 'Payment milestones & documents: specify L/C or T/T milestones, bank details and documents (B/L, invoice, packing list).',
    contractWarn2: 'Quality acceptance: define sealed samples, AQL sampling or a third-party inspector (e.g. SGS/BV) to avoid disputes over "acceptable quality".',
    contractWarn3: 'Export control & compliance: check dual-use/export-control classification, destination import permits and labelling.',
    contractWarn4: 'Dispute resolution: cross-border enforcement depends on the seat; agree in writing on an arbitral institution (e.g. HKIAC/SIAC/CIETAC) and governing law.',
    contractWarn5: 'Damage & insurance: align with shipping insurance, clarify liability boundaries and claim deadlines.',
    contractSignBlock: 'Signatures', contractSignParty: 'Seller (stamp/sign):', contractSignParty2: 'Buyer (stamp/sign):',
    contractPrintHint: 'Choose "Save as PDF" to export the electronic contract. Keep one copy for each party.', contractNeedLogin: 'Please sign in to use the contract service.',
    contractSelectHint: 'Select an order to generate the draft.', contractCustodyRecords: 'My custody records',
    custodyActiveLabel: 'In custody', custodyExpiredLabel: 'Expired', contractDraftNotice: 'This draft is auto-generated for reference only and is not legal advice. Have both parties legal counsel review before signing.',
    contractDate: 'Date', contractNo: 'Contract No.', contractId: 'Order ID', contractQty: 'Quantity', contractUnitPrice: 'Unit price',
    contractTotal: 'Total', contractIncoterm: 'Incoterm', contractDelivery: 'Delivery', contractPayment: 'Payment',
    contractInspection: 'Inspection', contractForceMajeure: 'Force majeure', contractDispute: 'Dispute resolution', contractTitle2: 'Draft International Sale of Goods Contract'
    ,
    navExport: 'Export Readiness', navLogistics: 'Logistics Guide', navCompliance: 'Compliance Center', navDisputes: 'After-sales & Disputes',
    footerTools: 'Trade tools',
  sfEyebrow: 'Pet supplies, exported direct from our own supply chain',
  sfTitle: 'Pet gear that actually works, shipped to pet parents worldwide',
  sfSub: 'Full-container and dropship friendly. Cats, dogs, hamsters and small pets — with OEM/ODM customisation and support from sampling to customs clearance.',
  sfArtAlt: 'BeanBeanMouse resting on a desk',
  sfArtNote: 'BeanBeanMouse · your pet supplies export partner',
  sfCtaShop: 'Browse products',
  sfCtaVideo: 'Customer videos',
  sfCtaAsk: 'Ask us directly',
  trustOem: 'OEM / ODM',
  trustShip: 'Ships in 7–15 days',
  trustInspect: 'Pre-shipment inspection',
  trustAfter: '30-day after-sales response',
  videoWallTitle: 'Videos from our customers',
  videoWallDesc: 'Real footage sent back by customers using our products, curated by us. Real use beats spec sheets.',
  videoWallMore: 'See all videos',
  videoNoticeTitle: 'About these videos',
  videoNoticeDesc: 'Videos are submitted and licensed by customers for reference only and are not a performance guarantee. Contact us before reposting.',
  videoSubmit: 'Submit your video',
  promiseTitle: 'How your order reaches you',
  promise1T: 'Sample before mass production',
  promise1D: 'We confirm samples and packaging before production. Sample cost is deductible from bulk orders.',
  promise2T: 'Pre-shipment inspection',
  promise2D: 'Inspection photos and video before dispatch; third-party inspection can be arranged.',
  promise3T: 'Complete documentation',
  promise3D: 'Invoice, packing list, certificate of origin and B/L prepared to your destination requirements.',
  promise4T: 'Traceable after-sales',
  promise4D: 'Every order is logged, so damage or disputes follow an agreed process.',
  aboutTitle: 'About us',
  aboutArtAlt: 'BeanBeanMouse mascot',
  aboutP1: 'BeanBeanMouse exports pet supplies directly: cages, daily gear, food and smart devices for cats, dogs, hamsters and small pets. We handle sourcing, inspection and export documents ourselves, cutting out the middle layer.',
  aboutP2: 'We also partner with suppliers on a managed basis: you manufacture, we handle selection, packaging, export and after-sales. We carry the risk and inventory, and share the margin as agreed.',
  aboutTeaserTitle: 'Who we are',
  aboutTeaserDesc: 'Direct export plus managed supplier partnerships — focused on pet supplies only.',
  aboutMore: 'More about us',
  aboutContactTitle: 'Contact',
  aboutPending: 'To be added',
  aboutContactEmail: 'Email',
  aboutContactWechat: 'WeChat',
  aboutContactPhone: 'Phone',
  aboutContactAddress: 'Address',
  aboutContactNote: 'WeChat, phone and address will be added later. Email works today — we reply within one business day.',
  askCtaTitle: 'Looking for a specific pet product?',
  askCtaDesc: 'Tell us the category, quantity and destination country. You get a quote and plan within one business day.',
  askCtaBtn: 'Start an enquiry',
  petsLabel: 'Suitable for',
  petSizeLabel: 'Pet size',
  materialLabel: 'Material',
  versionLabel: 'Version pet0.2 (demo)',
  demoNote: 'Demo build: product images, prices, company profiles and orders on this site are sample data and will be replaced before launch. Do not place orders or cite them.',
  askTitle: 'Ask BeanBeanMouse', askQ1: 'Which pet do you have?', askQ2: 'What kind of products are you looking for?', askQ3: 'Quantity, destination and contact',
  askCountry: 'Destination', askCountryPh: 'e.g. Hamburg, Germany', askNote: 'Anything else?', askNotePh: 'e.g. need our logo printed, English packaging',
  askPet: 'Pet', askNext: 'Next', askBack: 'Back', askSubmit: 'Send enquiry', askSummary: 'Your request',
  askNeedPick: 'Please pick one', askNeedContact: 'Please fill in your name and a valid email', askDone: 'Sent — we reply within one business day', askFailed: 'Send failed',
  demoTag: 'Sample',
  reviewAccounts: 'Accounts pending review', reviewAccountsNote: 'New registrations wait for approval. Approved accounts can sign in; rejected ones cannot.', reviewNeedBackend: '(Demo mode: connect the real backend to review accounts here.)', pendingUnit: 'pending', reviewApprove: 'Approve', reviewReject: 'Reject', reviewEmpty: 'No accounts waiting', reviewLoadFail: 'Load failed: ', reviewApproved: 'Approved', reviewRejected: 'Rejected', loading: 'Loading…',
  verifyTitle: 'Email verification', verifyChecking: 'Verifying, please wait…', verifyOk: 'Verified! Your email is confirmed — you can sign in now.',
  verifyFail: 'Verification failed: the link may have expired or been used. You can resend below.', verifyNoToken: 'No verification token in the link — it may have been truncated when copied.',
  gotoLogin: 'Sign in', resendVerify: 'Resend verification email', resendSent: 'If that email is registered and unverified, the mail has been resent',
  aboutPending: 'To be added',
  fitTitle: 'Suitable for', fitNote: 'Fit information is provided by us. Please confirm before ordering — needs differ by pet size and age.',
  demoTagNote: 'Sample data: this product image and price are placeholders and will be replaced before launch.',
    exportTitle: 'Export Readiness: Qualifications & Formalities', exportSub: 'Exporting is not just "ship after order". Prepare your trading rights, FX receipts, tax rebate, licences and inspection before you can clear customs and get paid.',
    exportChecklistTitle: 'Export qualification checklist', exportChecklistSub: 'Review each item; always follow the latest rules of the competent authorities.',
    exportWhat: 'What it is', exportWho: 'Issuing body', exportWhen: 'When needed', exportTip: 'Tip',
    exportReadinessScore: 'Export readiness', exportReadyHigh: 'High readiness — good to take orders and publish', exportReadyMid: 'Complete the remaining items before taking large orders',
    exportReadyLow: 'Too many gaps — complete qualifications before publishing', exportMarkDone: 'Mark done', exportMarkUndone: 'Undo',
    exportOptional: '(category-based)', exportNoLoginHint: 'Sign in as a seller to maintain your own export readiness checklist.',
    exportLoginBtn: 'Try as seller', exportGuideNote: 'This checklist is general reference only and not legal advice; follow the latest rules of trade, customs, tax and FX authorities.',
    exportProductHint: 'When publishing, the platform suggests export requirements by category.',
    logisticsTitle: 'Logistics & Booking Guide', logisticsSub: 'From transport modes, LCL/FCL and destination charges to telex release — master the practical side of booking and shipping.',
    logisticsModeTitle: 'Choosing a transport mode', logisticsModeNote: 'Base the choice on value, weight/volume, lead time, destination and budget.',
    logisticsContainerTitle: 'LCL vs FCL', logisticsContainerNote: 'Use LCL when below a full container (billed by CBM, destination costs shared); near a full load, book FCL for better economics.',
    logisticsCostTitle: 'Destination charges reference', logisticsCostNote: 'The most common clearance fees; final figures follow the carrier and destination agent quotation.',
    logisticsPortPick: 'Select destination port', logisticsTelexTitle: 'Telex Release',
    logisticsTelexNote: 'After shipment the seller returns the original documents to the carrier, who releases the cargo electronically — no waiting for paper B/Ls and no port demurrage. Use only with trusted buyers and confirm payment before release.',
    logisticsEstimateTitle: 'Freight estimator (demo)', logisticsEstimateHint: 'Enter cargo details and destination to get indicative freight ranges per mode.',
    logisticsFieldMode: 'Transport mode', logisticsFieldWeight: 'Weight (kg)', logisticsFieldVolume: 'Volume (CBM)',
    logisticsFieldContainer: 'Container / LCL', logisticsFieldOrigin: 'Origin', logisticsFieldDestination: 'Destination port',
    logisticsEstimateBtn: 'Estimate', logisticsEstimateResult: 'Estimate result', logisticsEstimateNote: 'Demo only; the carrier quotation prevails.',
    logisticsSpeed: 'Lead time', logisticsCost: 'Cost', logisticsBestFor: 'Best for',
    shpContainer: 'Container / LCL', shpPortLoading: 'Port of loading', shpPortDischarge: 'Port of discharge', shpVessel: 'Vessel / Voyage', shpBillNo: 'B/L no.',
    shpTelex: 'Telex release', shpFreightTerms: 'Freight terms', freightPrepaid: 'Prepaid', freightCollect: 'Collect',
    shpCostEstimate: 'Cost estimate (reference)', shpCostHint: 'For reference only; carrier quotation prevails',
    modeCourier: 'Courier', shpBooking: 'Booking', shpDeclaration: 'Customs declaration', shpLoadOnBoard: 'Loaded on board', shpDeparture: 'Departure', shpArrival: 'Arrival', shpClearance: 'Customs clearance', shpDelivery: 'Delivery',
    complianceTitle: 'Compliance Center', complianceSub: 'Export control, sanctions, anti-dumping and product environmental rules — screen before you publish so goods are not held at customs.',
    complianceControlTitle: 'Export control & sanctions screening', complianceControlNote: 'Production will connect to authoritative list APIs keyed by HS code/category; the current version is a demo keyword screen.',
    complianceListTitle: 'Key restrictions & compliance list', complianceScreenTitle: 'Product screening (demo)',
    complianceScreenHint: 'Type a product name/description or pick a demo product below, then run the screening.',
    complianceScreenBtn: 'Run screening', complianceResultTitle: 'Screening result', complianceClear: 'No obvious control / sanctions keyword matches',
    complianceHits: 'Flags found (demo only — verify manually)', complianceDemoProduct: 'Demo products',
    complianceDisclaimer: 'Screening results are demo reference only and not a compliance conclusion. Verify by HS code, end use and destination regulations before exporting.',
    compliancePanelTitle: 'Export compliance screening', compliancePanelNote: 'After publishing, the platform screens title & description against control/sanctions keywords (demo).',
    compliancePassLabel: 'No flags', complianceFlagLabel: 'Flags', complianceMarketTitle: 'Target market compliance',
    complianceScreenDemo: 'Demo screening', adminScreenLabel: 'Export-control screening',
    viewSellerPage: 'Supplier profile', sellerTrustTitle: 'Verification & trust',
    sellerCertsTitle: 'Certificates', sellerMarketsTitle: 'Target markets',
    sellerProductsTitle: 'Products for sale', sellerContact: 'Contact supplier',
    sellerTrustNote: 'Shown info is based on platform verification and product data; perform your own due diligence before a formal deal.',
    sellerPageNote: 'Demo page: verification and certificates come from demo company data.',
    disputesTitle: 'After-sales & Disputes Center', disputesSub: 'Quality claims, returns and platform arbitration after delivery are handled here; every milestone is sealed into the order evidence chain.',
    afterSalesTitle: 'After-sales & disputes', afterSalesCreate: 'Request after-sales', afterSalesOpen: 'Open dispute',
    afterSalesTypeLabel: 'Issue type', afterSalesDescLabel: 'Description', afterSalesResolution: 'Expected resolution',
    afterSalesSubmit: 'Submit request', afterSalesTypes: 'Issue types',
    afterSalesNew: 'Pending', afterSalesResponded: 'Seller replied', afterSalesArbitrating: 'Platform arbitrating', afterSalesResolved: 'Resolved', afterSalesClosed: 'Closed',
    afterSalesRespond: 'Reply to buyer', afterSalesAccept: 'Accept request', afterSalesReject: 'Reject with reason', afterSalesArbitrate: 'Platform ruling',
    afterSalesArbitrateTip: 'Admins may review the order evidence chain before ruling: for buyer / for seller / compromise.',
    arbitrateBuyer: 'In favor of buyer', arbitrateSeller: 'In favor of seller', arbitrateCompromise: 'Compromise',
    afterSalesRuling: 'Ruling', afterSalesEmpty: 'No after-sales / dispute records', afterSalesNote: 'Key after-sales milestones are sealed into the order evidence chain, verifiable by both parties and the platform.',
    afterSalesCaseNo: 'Case no.', afterSalesOrder: 'Related order', afterSalesAppliedAt: 'Applied at', afterSalesBy: 'Filed by',
    afterSalesEvidence: 'View evidence', afterSalesNeedLogin: 'Please sign in — after-sales and disputes are linked to your orders.',
    docCenter: 'Document center', docCenterSub: 'Generate commercial invoice, packing list, certificate of origin and B/L reference per order. Consistent documents are the basis for smooth clearance.',
    docGenerate: 'Generate', docGenerated: 'Generated', docCI: 'Commercial Invoice', docPL: 'Packing List', docCO: 'Certificate of Origin (reference)', docBL: 'Bill of Lading (reference)',
    docConsistency: 'Document consistency check', docConsistencyCheck: 'Re-check', docConsistencyPass: 'Pass: item name, HS code, quantity and shipping marks are consistent',
    docConsistencyWarn: 'Attention: document info incomplete', docConsistencyFail: 'Inconsistent: correct the product info and regenerate',
    docMarks: 'Shipping marks', docCartons: 'Cartons', docGrossWeight: 'Gross weight', docNetWeight: 'Net weight',
    docConsignee: 'Consignee', docNotify: 'Notify party', docVessel: 'Vessel / Voyage', docBillNo: 'B/L no.',
    docOriginClaim: 'Origin claim', docIssue: 'Issued by', docCheckHint: 'Three-way consistency (invoice, packing list, B/L) is a clearance basic.',
    docBLHint: 'Reference only; the real B/L is issued by the carrier and its terms prevail.',
    docCOHint: 'Reference only; apply for the official CO from CCPIT or customs.',
    docPIHint: 'Proforma invoices are printable; the commercial invoice is the settlement and clearance document.',
    prodImgLabel: 'Real product images (multi-select)', prodImgHint: 'Actual photos recommended, 800×800+, JPEG/PNG, up to 8',
    imgRemove: 'Remove image', imgDefaultName: 'Image', imgMax: 'Up to 8 product images',
    exportTab: 'Export readiness', exportTabHint: 'Maintain your export qualification checklist; the platform flags gaps when you publish.',
    adminAfterSales: 'Dispute arbitration', adminAfterSalesHint: 'Review the order evidence chain and party communication before ruling.',
    adminExportReady: 'Export readiness', asPanelTitle: 'After-sales & disputes', asApplyBtn: 'Request after-sales', asDisputeBtn: 'Open dispute',
    asRelatedOrder: 'Related order', asStatusCol: 'Status', asMyCases: 'My after-sales & disputes',
    roleSeller: 'Seller', roleBuyer: 'Buyer', signedIn: 'Signed in: ', signedOut: 'Signed out',
    heroDealsHint: 'Today\'s closed deals · live ticker (reserved)', download: 'Download', yes: 'Yes', no: 'No',
    asBuyerDesc: 'Search products, filter, send inquiries and track supplier replies',
    asSellerDesc: 'Publish products, manage inquiries and reply to buyers',
    switchRole: 'Switch role', yourReply: 'Your reply: ',
    messagesTab: 'Messages', messagesEmpty: 'No conversations yet — start from an inquiry', chatPlaceholder: 'Type a message…', chatSend: 'Send',
    chatRead: 'Read', chatAutoReply: 'Thanks for your message — we will reply shortly.',
    exportCsv: 'Export CSV',
    notificationsTitle: 'Notifications', notificationsEmpty: 'No notifications', markAllRead: 'Mark all read', unreadLabel: 'unread',
    notifNewInquiry: 'New inquiry received', notifNewQuote: 'New quotation received', notifAfterSales: 'After-sales / dispute update', notifFeedback: 'Suggestion status update',
    searchBtn: 'Search', searchSuggestTitle: 'Popular searches', searchBarPlaceholder: 'Search products / categories / HS codes, e.g. chair, screwdriver…',
    catStripTitle: 'Categories', catStripSub: 'Swipe to browse all industries', viewAllCats: 'View all',
    relatedTitle: 'Related products', relatedSub: 'No exact matches found. Here are related products you may like:',
    subFilter: 'Subcategory / pet type', allSubs: 'All',
    profileTab: 'My profile', profileTitle: 'Profile & business card', profileSub: 'A complete profile builds trust in inquiries and orders.',
    businessCard: 'Business card',
    cardWatermarkNote: 'Cards shown and downloaded by the other party carry a subtle anti-misuse watermark.',
    profileCompleteness: 'Profile completeness', profileSave: 'Save profile', profileSaved: 'Profile saved',
    accountTypeLabel: 'Account type', accountTypeIndividual: 'Individual / Sole proprietor', accountTypeCompany: 'Company representative',
    jobTitle: 'Job title', profileContact: 'Contact', profileBio: 'Bio / business scope',
    cardUploadBtn: 'Upload business card', cardReplaceBtn: 'Replace card', cardRemoveBtn: 'Remove card', cardUploadHint: 'JPG / PNG, up to 4MB',
    cardPreviewLabel: 'My business card', cardNoCard: 'No business card yet', cardAttachHint: 'You can attach your card to inquiries so the other party knows you instantly.',
    cardTemplatesTitle: 'Card templates (optional)', cardTemplatesSub: 'Pick a template and generate your card from your profile, or upload your own image.',
    cardTemplateApply: 'Generate', cardTemplateApplied: 'Template card generated', cardCustomTitle: 'Custom',
    cardCustomHint: 'Upload your own card image for a fully custom logo, colors and layout.',
    cardCustomizeTitle: 'Customize', cardAccentColor: 'Accent color', cardFont: 'Name font',
    cardFontKai: 'Kaiti (oriental)', cardFontSerif: 'Serif (elegant)', cardFontSans: 'Sans (modern)',
    cardLogoUpload: 'Upload logo (optional)', cardApplyCustom: 'Generate with custom settings', customCardApplied: 'Custom card generated',
    cardFlip: 'Flip', cardDragHint: 'Drag to rotate · click to flip and view the back',
    storageFull: 'Local storage is full — remove some attachments or old data and retry',
    payTitle: 'PayPal Payment (demo)', payProvider: 'Payment', payFirstChannel: 'First channel',
    payWith: 'Pay with PayPal', payDone: 'Payment succeeded (demo — no real charge)',
    payPending: 'Pending', payPaid: 'Paid (demo)',
    payNote: 'Demo only: no real charge occurs. Live collection requires PayPal merchant onboarding and compliance setup.',
    identityLabel: 'Inquiry identity', identityPublic: 'Identity visible to seller', identityHidden: 'Anonymous inquiry (identity hidden)',
    sendCard: 'Attach business card', viewCard: 'View card', downloadCard: 'Download card', cardSentTag: 'Card attached',
    attachLabel: 'Attachments (images / archives)', attachHint: 'JPG / PNG / GIF / WebP images or ZIP / RAR / 7Z archives, up to 4MB each',
    attachPick: 'Choose files', attachList: 'Selected files', attachRemove: 'Remove', attachSizeTooBig: 'Each file must be under 4MB',
    attachTotalTooBig: 'Total attachments cannot exceed 2.5MB — please trim and retry',
    attachTypeNotAllowed: 'Only images and ZIP / RAR / 7Z archives are allowed', attachmentCount: 'attachments', attachmentLabel: 'Attachment',
    exportConv: 'Export conversation', exportTxt: 'Export TXT', exportHtml: 'Export HTML (with images)', exportConvHint: 'Export inquiry thread and attachment list for your records.',
    regAccountType: 'Account type *', regIndividual: 'Individual / Sole proprietor', regCompany: 'Company representative', regBizName: 'Business name', regJobTitle: 'Job title (e.g. Purchasing Manager)',
    regRoleHint: 'Clients register to buy and request quotes. Suppliers apply for supply or a managed partnership and must submit qualification documents for review.',
    feedbackTitle: 'Feedback & suggestions', feedbackSub: 'Tell us about pages, features, content or experience — our team reviews and responds periodically.',
    feedbackType: 'Suggestion type', feedbackTypePage: 'Page / visual', feedbackTypeFeature: 'Feature', feedbackTypeContent: 'Content / info', feedbackTypeUx: 'Experience / flow', feedbackTypeOther: 'Other',
    feedbackContent: 'Your suggestion *', feedbackContact: 'Contact (optional)', feedbackSubmit: 'Submit', feedbackThanks: 'Thank you!',
    feedbackThanksDesc: 'Your suggestion is received and will be reviewed by our operations team.', feedbackPrivacy: 'We only collect the contact you voluntarily provide.',
    navFeedback: 'Feedback', adminFeedback: 'Suggestions', feedbackNew: 'New', feedbackSeen: 'Seen', feedbackDone: 'Adopted',
    feedbackStatus: 'Status', feedbackMarkSeen: 'Mark seen', feedbackMarkDone: 'Mark adopted', feedbackEmpty: 'No suggestions yet',
    feedbackMarkSeenDone: 'Marked'
  }
};

const LANG_META = [
  { code: 'zh', label: '中文', local: '中文', flag: 'CN' },
  { code: 'en', label: 'English', local: 'English', flag: 'US' },
  { code: 'ja', label: '日本語', local: '日本語', flag: 'JP' },
  { code: 'ko', label: '한국어', local: '한국어', flag: 'KR' },
  { code: 'es', label: 'Español', local: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', local: 'Français', flag: 'FR' },
  { code: 'de', label: 'Deutsch', local: 'Deutsch', flag: 'DE' },
  { code: 'pt', label: 'Português', local: 'Português', flag: 'PT' },
  { code: 'ru', label: 'Русский', local: 'Русский', flag: 'RU' },
  { code: 'ar', label: 'العربية', local: 'العربية', flag: 'SA' },
  { code: 'hi', label: 'हिन्दी', local: 'हिन्दी', flag: 'IN' },
  { code: 'id', label: 'Bahasa Indonesia', local: 'Bahasa Indonesia', flag: 'ID' },
  { code: 'th', label: 'ไทย', local: 'ไทย', flag: 'TH' },
  { code: 'vi', label: 'Tiếng Việt', local: 'Tiếng Việt', flag: 'VN' },
  { code: 'tr', label: 'Türkçe', local: 'Türkçe', flag: 'TR' },
  { code: 'it', label: 'Italiano', local: 'Italiano', flag: 'IT' },
  { code: 'nl', label: 'Nederlands', local: 'Nederlands', flag: 'NL' },
  { code: 'pl', label: 'Polski', local: 'Polski', flag: 'PL' },
  { code: 'uk', label: 'Українська', local: 'Українська', flag: 'UA' },
  { code: 'sv', label: 'Svenska', local: 'Svenska', flag: 'SE' },
  { code: 'cs', label: 'Čeština', local: 'Čeština', flag: 'CZ' },
  { code: 'el', label: 'Ελληνικά', local: 'Ελληνικά', flag: 'GR' },
  { code: 'fa', label: 'فارسی', local: 'فارسی', flag: 'IR' },
  { code: 'ms', label: 'Bahasa Melayu', local: 'Bahasa Melayu', flag: 'MY' },
  { code: 'fil', label: 'Filipino', local: 'Filipino', flag: 'PH' }
];

/* 部分语言演示翻译：未覆盖的文案回退到英文（正式版接入专业翻译服务） */
Object.assign(I18N, {
  ja: {
    videoWallTitle: '動画', aboutTitle: '会社概要', aboutMore: '詳しく見る', videoWallMore: 'すべて見る',
    home: 'ホーム', marketplace: '製品市場', navNews: '貿易情報', dashboard: 'ダッシュボード',
    login: 'ログイン', logout: 'ログアウト', otherLang: '他の言語',
    heroTitle: '世界中のバイヤーと信頼できるサプライヤーをつなぐ',
    heroSub: '製品の掲載・絞り込み検索・見積依頼をワンストップで。',
    searchPlaceholder: '製品を検索（例：レーザー切断機、充電器、生地…）', popular: '人気検索：',
    categoriesTitle: '主要カテゴリー', featuredTitle: '注目製品', viewAll: 'すべて見る',
    sellerCtaTitle: 'サプライヤー登録（無料）', sellerCtaDesc: '世界中のバイヤーからの見積依頼を無料で受信。', sellerCtaBtn: 'サプライヤー向けダッシュボード',
    sendInquiry: '見積依頼を送信', moqLabel: '最小注文数量', verified: '認証済みサプライヤー',
    favorite: 'お気に入り', favorited: 'お気に入り済み', filters: 'フィルター', clearFilters: 'フィルターをクリア',
    noResults: '該当する製品が見つかりません', noResultsHint: '条件を変えてお試しください',
    footerTagline: 'Pet supplies exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse デモ版・デザイン確認用'
  },
  ko: {
    home: '홈', marketplace: '제품 시장', navNews: '무역 정보', dashboard: '대시보드',
    login: '로그인', logout: '로그아웃', otherLang: '다른 언어',
    heroTitle: '전 세계 바이어와 신뢰할 수 있는 공급업체를 연결합니다',
    heroSub: '제품 등록, 정밀 검색, 견적 문의를 한 곳에서 처리하세요.',
    searchPlaceholder: '제품 검색 (예: 레이저 커터, 충전기, 원단…)', popular: '인기 검색:',
    categoriesTitle: '주요 카테고리', featuredTitle: '추천 제품', viewAll: '모두 보기',
    sellerCtaTitle: '공급업체 무료 등록', sellerCtaDesc: '전 세계 바이어의 견적 문의를 무료로 받아보세요.', sellerCtaBtn: '공급업체 대시보드 열기',
    sendInquiry: '견적 문의 보내기', moqLabel: '최소 주문량', verified: '인증된 공급업체',
    favorite: '즐겨찾기', favorited: '즐겨찾기됨', filters: '필터', clearFilters: '필터 지우기',
    noResults: '일치하는 제품이 없습니다', noResultsHint: '조건을 조정해 보세요',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse 데모 · 디자인 확인용'
  },
  es: {
    home: 'Inicio', marketplace: 'Mercado', navNews: 'Noticias', dashboard: 'Panel',
    login: 'Iniciar sesión', logout: 'Cerrar sesión', otherLang: 'Otro',
    heroTitle: 'Conectamos compradores globales con proveedores confiables',
    heroSub: 'Publica productos, filtra con precisión y solicita cotizaciones en un solo lugar.',
    searchPlaceholder: 'Buscar productos (p. ej., cortadora láser, cargador, tela…)', popular: 'Popular:',
    categoriesTitle: 'Categorías principales', featuredTitle: 'Productos destacados', viewAll: 'Ver todo',
    sellerCtaTitle: 'Regístrate como proveedor gratis', sellerCtaDesc: 'Recibe consultas de compradores globales sin costo inicial.', sellerCtaBtn: 'Abrir panel de proveedor',
    sendInquiry: 'Enviar consulta', moqLabel: 'Cantidad mínima', verified: 'Proveedor verificado',
    favorite: 'Favorito', favorited: 'Favorito añadido', filters: 'Filtros', clearFilters: 'Limpiar filtros',
    noResults: 'No se encontraron productos', noResultsHint: 'Ajusta los filtros e inténtalo de nuevo',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse demo · solo para diseño'
  },
  fr: {
    home: 'Accueil', marketplace: 'Marché', navNews: 'Actualités', dashboard: 'Tableau de bord',
    login: 'Connexion', logout: 'Déconnexion', otherLang: 'Autre',
    heroTitle: 'Connectons acheteurs mondiaux et fournisseurs de confiance',
    heroSub: 'Publiez des produits, filtrez et demandez des devis en un seul endroit.',
    searchPlaceholder: 'Rechercher des produits (ex. : découpe laser, chargeur, tissu…)', popular: 'Populaire :',
    categoriesTitle: 'Catégories principales', featuredTitle: 'Produits en vedette', viewAll: 'Tout voir',
    sellerCtaTitle: 'Devenir fournisseur gratuitement', sellerCtaDesc: 'Recevez des demandes d’acheteurs mondiaux sans frais initiaux.', sellerCtaBtn: 'Ouvrir le tableau de bord fournisseur',
    sendInquiry: 'Envoyer une demande', moqLabel: 'Quantité minimale', verified: 'Fournisseur vérifié',
    favorite: 'Favori', favorited: 'Déjà favori', filters: 'Filtres', clearFilters: 'Effacer les filtres',
    noResults: 'Aucun produit trouvé', noResultsHint: 'Essayez d’ajuster les filtres',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse démo · démonstration de design'
  },
  de: {
    home: 'Startseite', marketplace: 'Marktplatz', navNews: 'Handelsnachrichten', dashboard: 'Dashboard',
    login: 'Anmelden', logout: 'Abmelden', otherLang: 'Andere',
    heroTitle: 'Verbinden Sie globale Käufer mit vertrauenswürdigen Lieferanten',
    heroSub: 'Produkte veröffentlichen, filtern und Angebote anfordern – alles an einem Ort.',
    searchPlaceholder: 'Produkte suchen (z. B. Laserschneider, Ladegerät, Stoff…)', popular: 'Beliebt:',
    categoriesTitle: 'Top-Kategorien', featuredTitle: 'Empfohlene Produkte', viewAll: 'Alle ansehen',
    sellerCtaTitle: 'Kostenlos als Lieferant registrieren', sellerCtaDesc: 'Erhalten Sie Anfragen globaler Käufer ohne Vorabkosten.', sellerCtaBtn: 'Lieferanten-Dashboard öffnen',
    sendInquiry: 'Anfrage senden', moqLabel: 'Mindestbestellmenge', verified: 'Verifizierter Lieferant',
    favorite: 'Favorit', favorited: 'Als Favorit gespeichert', filters: 'Filter', clearFilters: 'Filter zurücksetzen',
    noResults: 'Keine passenden Produkte', noResultsHint: 'Passen Sie die Filter an',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse Demo · nur zur Designprüfung'
  },
  pt: {
    home: 'Início', marketplace: 'Mercado', navNews: 'Notícias', dashboard: 'Painel',
    login: 'Entrar', logout: 'Sair', otherLang: 'Outro',
    heroTitle: 'Conectamos compradores globais a fornecedores confiáveis',
    heroSub: 'Publique produtos, filtre e solicite cotações em um só lugar.',
    searchPlaceholder: 'Pesquisar produtos (ex.: cortadora a laser, carregador, tecido…)', popular: 'Popular:',
    categoriesTitle: 'Categorias principais', featuredTitle: 'Produtos em destaque', viewAll: 'Ver tudo',
    sellerCtaTitle: 'Cadastre-se como fornecedor grátis', sellerCtaDesc: 'Receba consultas de compradores globais sem custo inicial.', sellerCtaBtn: 'Abrir painel do fornecedor',
    sendInquiry: 'Enviar consulta', moqLabel: 'Quantidade mínima', verified: 'Fornecedor verificado',
    favorite: 'Favorito', favorited: 'Favoritado', filters: 'Filtros', clearFilters: 'Limpar filtros',
    noResults: 'Nenhum produto encontrado', noResultsHint: 'Ajuste os filtros e tente novamente',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse demo · apenas para design'
  },
  ru: {
    home: 'Главная', marketplace: 'Рынок', navNews: 'Новости', dashboard: 'Панель',
    login: 'Войти', logout: 'Выйти', otherLang: 'Другой',
    heroTitle: 'Соединяем покупателей по всему миру с проверенными поставщиками',
    heroSub: 'Публикуйте товары, фильтруйте и запрашивайте котировки в одном месте.',
    searchPlaceholder: 'Поиск товаров (напр., лазерный резак, зарядное устройство, ткань…)', popular: 'Популярное:',
    categoriesTitle: 'Основные категории', featuredTitle: 'Рекомендуемые товары', viewAll: 'Смотреть все',
    sellerCtaTitle: 'Стать поставщиком бесплатно', sellerCtaDesc: 'Получайте запросы покупателей со всего мира без начальных затрат.', sellerCtaBtn: 'Открыть панель поставщика',
    sendInquiry: 'Отправить запрос', moqLabel: 'Мин. объём заказа', verified: 'Проверенный поставщик',
    favorite: 'Избранное', favorited: 'В избранном', filters: 'Фильтры', clearFilters: 'Сбросить фильтры',
    noResults: 'Товары не найдены', noResultsHint: 'Измените условия фильтра',
    footerTagline: 'Pet supplies, exported direct — BeanBeanMouse (demo)', rights: '© 2026 BeanBeanMouse демо · только для дизайна'
  }
});

const DEFAULT_STATE = {
  products: PRODUCTS.map(p => ({ ...p, hsCode: p.hsCode || HS_BY_CAT[p.cat] || '', markets: p.markets || MARKETS_BY_PRODUCT[p.id] || [] })),
  inquiries: [],
  orders: [],
  tips: [],
  categoryRequests: [],
  favorites: [],
  user: null,
  lang: 'en',
  firstVisit: true,
  users: buildUsers(Date.now()),
  companies: buildCompanies(),
  logs: [],
  newsRegions: ['CN', 'GLOBAL'],
  newsSyncedAt: Date.now()
};

function seedDemoData() {
  const now = Date.now();
  function seedHash(str) {
    let h = 0;
    for (const ch of String(str || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h.toString(16).padStart(8, '0');
  }
  function seedEvidence(orderId, kind, refId, snapshot, prevHash, chainIndex, createdAt) {
    const contentHash = seedHash(prevHash + '|' + chainIndex + '|' + kind + '|' + JSON.stringify(snapshot));
    return { id: 'ev' + orderId + '-' + chainIndex, orderId, actorId: 'u-buyer', kind, refId, snapshot, prevHash, contentHash, chainIndex, createdAt };
  }
  const ev1 = seedEvidence('o1', 'order_create', 'o1', { total: 13500, currency: 'USD', inquiryId: 'i1' }, 'GENESIS', 0, now - 26 * 864e5);
  const ev2 = seedEvidence('o1', 'receipt_confirmed', 'o1', { status: 'complete' }, ev1.contentHash, 1, now - 4 * 864e5);
  const ev3 = seedEvidence('o1', 'tip_create', 't1', { amount: 25, currency: 'USD', note: 'Great service!' }, ev2.contentHash, 2, now - 3 * 864e5);
  const ev4 = seedEvidence('o1', 'shipment_create', 'sh1', { carrier: 'COSCO', trackingNo: 'COSU8823167' }, ev3.contentHash, 3, now - 20 * 864e5);
  const ev5 = seedEvidence('o1', 'shipment_event', 'sh1', { status: 'in_transit', location: 'Singapore Port', note: 'Vessel transiting Singapore' }, ev4.contentHash, 4, now - 2 * 864e5);
  return {
    products: PRODUCTS.map(p => ({ ...p, hsCode: p.hsCode || HS_BY_CAT[p.cat] || '', markets: p.markets || MARKETS_BY_PRODUCT[p.id] || [] })),
    inquiries: [
      {
        id: 'i1', productId: 'p1', sellerId: 'bbm', buyerId: 'u-buyer',
        name: 'Thomas Müller', email: 'thomas.mueller@muller-gmbh.de', company: 'Müller GmbH', country: 'DE',
        qty: 2, unit: 'set', message: 'Hi, we need 300 units of the 3-tier hamster cage with tube set. Could you quote CIF Hamburg including insurance?', createdAt: now - 1000 * 60 * 60 * 5, status: 'new', reply: ''
      },
      {
        id: 'i2', productId: 'p3', sellerId: 'bbm', buyerId: 'u-buyer',
        name: 'Thomas Müller', email: 'thomas.mueller@muller-gmbh.de', company: 'Müller GmbH', country: 'DE',
        qty: 5000, unit: 'pcs', message: 'Please quote for 5,000 pcs with custom logo packaging. What is the price for the 2-color option?', createdAt: now - 1000 * 60 * 60 * 30, status: 'handled', reply: 'Hi Thomas, thanks for your inquiry. Price for 5,000 pcs with custom logo is USD 3.2/pc FOB Shenzhen. Lead time 15 days. We will send the packaging mockup tomorrow.'
      },
      {
        id: 'i3', productId: 'p5', sellerId: 'bbm', buyerId: 'u-buyer',
        name: 'Sarah Johnson', email: 'sarah.j@greenloom.com', company: 'GreenLoom Textiles', country: 'US',
        qty: 1000, unit: 'kg', message: 'Hi, we are sourcing GOTS organic cotton jersey for our kids line. Do you have light blue in stock? Please quote CIF New York for 1,000 kg.', createdAt: now - 1000 * 60 * 60 * 52, status: 'new', reply: ''
      }
    ],
    orders: [
      {
        id: 'o1', inquiryId: 'i1', productId: 'p1', buyerId: 'u-buyer', sellerId: 'bbm',
        status: 'complete', total: 13500, currency: 'USD', quantity: 2, unit: 'set',
        shippingMarks: 'BBM / NINGBO→HAMBURG / C/NO.1-2',
        createdAt: now - 26 * 864e5, receiptConfirmedAt: now - 4 * 864e5,
        tips: [
          { id: 't1', orderId: 'o1', fromUserId: 'u-buyer', toUserId: 's1', amount: 25, currency: 'USD', note: 'Great service!', status: 'active', createdAt: now - 3 * 864e5, cancelledAt: null }
        ]
      }
    ],
    tips: [],
    shipments: [
      {
        id: 'sh1', orderId: 'o1', carrier: 'COSCO', trackingNo: 'COSU8823167',
        mode: 'sea', status: 'in_transit', origin: 'Ningbo, CN', destination: 'Hamburg, DE',
        currentLocation: 'Singapore Port', eta: now + 22 * 864e5, remark: '',
        createdAt: now - 20 * 864e5, updatedAt: now - 2 * 864e5,
        events: [
          { id: 'se1', status: 'processing', location: 'Ningbo, CN', note: 'Shipment created', eventTime: now - 20 * 864e5 },
          { id: 'se2', status: 'packed', location: 'Ningbo, CN', note: 'Goods packed & container loaded', eventTime: now - 19 * 864e5 },
          { id: 'se3', status: 'shipped', location: 'Ningbo Port', note: 'Loaded on vessel, B/L issued', eventTime: now - 18 * 864e5 },
          { id: 'se4', status: 'in_transit', location: 'Singapore Port', note: 'Vessel transiting Singapore', eventTime: now - 2 * 864e5 }
        ]
      }
    ],
    evidence: [ev1, ev2, ev3, ev4, ev5],
    categoryRequests: [],
    favorites: ['p3', 'p7'],
    user: null,
    lang: 'en',
    firstVisit: true,
    tipDismissed: {},
    users: buildUsers(now),
    companies: buildCompanies(),
    logs: buildLogs(now),
    newsRegions: ['CN', 'GLOBAL'],
    newsSyncedAt: now
  };
}
