/* BeanBeanMouse（豆豆鼠）演示数据层 */

const STORE_KEY = 'bridgetrade_v1';
window.__TB_STORE_KEY__ = STORE_KEY;

const CATEGORIES = [
  { id: 'machinery',  zh: '机械设备', en: 'Machinery',            hue: 210 },
  { id: 'electronics',zh: '电子电器', en: 'Electronics',         hue: 262 },
  { id: 'textiles',   zh: '纺织服装', en: 'Textiles & Apparel',  hue: 330 },
  { id: 'furniture',  zh: '家具家居', en: 'Furniture',           hue: 24  },
  { id: 'chemicals',  zh: '化工原料', en: 'Chemicals',           hue: 160 },
  { id: 'auto',       zh: '汽车配件', en: 'Auto Parts',          hue: 0   }
];

const SELLERS = [
  {
    id: 's1', verified: true, since: 2012, responseRate: 96, responseTime: '2h',
    rating: 4.8, orders: 12800, country: 'CN',
    zh: { company: '杭州云帆机械有限公司', city: '杭州' },
    en: { company: 'Hangzhou Yunfan Machinery Co., Ltd.', city: 'Hangzhou' }
  },
  {
    id: 's2', verified: true, since: 2015, responseRate: 94, responseTime: '4h',
    rating: 4.7, orders: 23000, country: 'CN',
    zh: { company: '深圳新星电子科技有限公司', city: '深圳' },
    en: { company: 'Shenzhen Nova Electronics Co., Ltd.', city: 'Shenzhen' }
  },
  {
    id: 's3', verified: true, since: 2018, responseRate: 91, responseTime: '8h',
    rating: 4.5, orders: 5600, country: 'VN',
    zh: { company: '海防绿色生活贸易有限公司', city: '海防' },
    en: { company: 'Hai Phong Green Living Trading Co.', city: 'Hai Phong' }
  },
  {
    id: 's4', verified: true, since: 2010, responseRate: 93, responseTime: '5h',
    rating: 4.6, orders: 8900, country: 'TR',
    zh: { company: '伊斯坦布尔阿特拉斯工业出口公司', city: '伊斯坦布尔' },
    en: { company: 'Istanbul Atlas Industrial Export Co.', city: 'Istanbul' }
  },
  {
    id: 's5', verified: false, since: 2016, responseRate: 90, responseTime: '12h',
    rating: 4.4, orders: 3100, country: 'IN',
    zh: { company: '浦那草本原料出口公司', city: '浦那' },
    en: { company: 'Pune Herbex Exports', city: 'Pune' }
  }
];

function pendingSeedProducts() {
  return [
    {
      id: 'p15', sellerId: 's4', cat: 'furniture', country: 'TR', status: 'pending',
      priceMin: 8.5, priceMax: 15, moq: 100, unit: 'pcs', leadTime: 20,
      terms: ['FOB', 'CIF'], certs: [], rating: 0, orders: 0, hue: 340,
      en: {
        title: 'Replica Luxury Watch Display Boxes',
        desc: 'Premium watch display boxes with branded engraving, available in gift packaging. Replica designs of well-known brands accepted on request.',
        features: ['Branded engraving', 'Gift packaging', 'Replica designs available']
      },
      zh: {
        title: '仿牌豪华手表展示盒',
        desc: '高端手表展示盒，支持品牌刻字与礼盒包装，可按客户要求制作知名品牌仿制款式。',
        features: ['品牌刻字', '礼盒包装', '可定制仿牌款式']
      }
    },
    {
      id: 'p16', sellerId: 's5', cat: 'textiles', country: 'IN', status: 'pending',
      priceMin: 0.8, priceMax: 1.4, moq: 500, unit: 'pcs', leadTime: 22,
      terms: ['CIF', 'EXW'], certs: ['OEKO-TEX'], rating: 0, orders: 0, hue: 95,
      en: {
        title: 'Organic Jute Shopping Bags with Cotton Lining',
        desc: 'Eco-friendly jute shopping bags with cotton lining, 12 colors, custom logo printing with eco ink. Ideal for retail and supermarket promotion.',
        features: ['Natural jute, cotton lining', 'Custom eco-ink printing', '12 colors in stock']
      },
      zh: {
        title: '有机黄麻购物袋（棉内衬）',
        desc: '环保黄麻购物袋，棉质内衬，12 色可选，支持环保油墨定制 LOGO，适用于零售与商超促销。',
        features: ['天然黄麻 + 棉内衬', '环保油墨定制 LOGO', '12 色现货']
      }
    }
  ];
}

const PRODUCTS = [
  {
    id: 'p1', sellerId: 's1', cat: 'machinery', country: 'CN', featured: true, hot: true,
    priceMin: 12800, priceMax: 18600, moq: 1, unit: 'set', leadTime: 20,
    terms: ['FOB', 'CIF'], certs: ['CE', 'ISO9001'], rating: 4.9, orders: 320, hue: 210,
    en: {
      title: '3000W CNC Fiber Laser Cutting Machine',
      desc: 'High-speed fiber laser cutting machine for sheet metal up to 20mm carbon steel. Equipped with 3000W IPG laser source, automatic focus cutting head and exchange table. CE certified with 24-month warranty and on-site installation support.',
      features: ['Automatic focus cutting head', 'Exchange worktable option', 'Up to 25m/min positioning speed', 'Support free CAD drawing evaluation']
    },
    zh: {
      title: '3000W 光纤激光切割机',
      desc: '高速光纤激光切割机，可加工 20mm 碳钢板材。搭载 3000W IPG 激光器、自动调焦切割头与交换工作台，整机 CE 认证，支持 24 个月质保与现场安装调试。',
      features: ['自动调焦切割头', '可选交换工作台', '定位速度达 25m/min', '免费图纸评估，支持定制']
    }
  },
  {
    id: 'p2', sellerId: 's2', cat: 'machinery', country: 'CN', featured: true,
    priceMin: 23500, priceMax: 32800, moq: 1, unit: 'set', leadTime: 35,
    terms: ['FOB', 'CIF'], certs: ['CE', 'ISO9001'], rating: 4.8, orders: 210, hue: 200,
    en: {
      title: '5-Axis CNC Machining Center VMC-850',
      desc: 'Heavy-duty 5-axis CNC vertical machining center with 850×520mm table, 12000rpm spindle and Siemens 828D control. Widely used for mold and precision parts manufacturing.',
      features: ['Siemens 828D control system', '12,000rpm spindle', 'Automatic tool changer', 'Full enclosure splash guard']
    },
    zh: {
      title: '五轴数控加工中心 VMC-850',
      desc: '重型五轴立式加工中心，工作台 850×520mm，12000rpm 主轴，搭载西门子 828D 系统，适用于模具与精密零件加工。',
      features: ['西门子 828D 数控系统', '12000rpm 主轴', '自动换刀装置', '全封闭防护罩']
    }
  },
  {
    id: 'p3', sellerId: 's2', cat: 'electronics', country: 'CN', featured: true, hot: true,
    priceMin: 2.8, priceMax: 4.5, moq: 1000, unit: 'pcs', leadTime: 15,
    terms: ['FOB', 'EXW'], certs: ['CE', 'FCC', 'RoHS'], rating: 4.7, orders: 15800, hue: 262,
    en: {
      title: '65W GaN Fast Charger USB-C PD',
      desc: 'Compact 65W GaN fast charger with USB-C PD 3.0, compatible with laptops, tablets and smartphones. Foldable plug, 6 color options, OEM/ODM service with custom logo.',
      features: ['GaN II technology, 45% smaller', 'USB-C PD 3.0, QC 4.0', 'Foldable plug, worldwide certifications', 'OEM/ODM with custom packaging']
    },
    zh: {
      title: '65W 氮化镓快充充电器 USB-C',
      desc: '紧凑型 65W 氮化镓快充，支持 USB-C PD 3.0，兼容笔记本、平板与手机。可折叠插脚，6 色可选，支持 OEM/ODM 定制。',
      features: ['GaN II 技术，体积缩小 45%', 'USB-C PD 3.0 / QC 4.0', '可折叠插脚，全球认证', '支持 OEM/ODM 与定制包装']
    }
  },
  {
    id: 'p4', sellerId: 's3', cat: 'electronics', country: 'VN', hot: true,
    priceMin: 6.5, priceMax: 9.8, moq: 500, unit: 'pcs', leadTime: 18,
    terms: ['FOB', 'CIF'], certs: ['CE', 'FCC', 'RoHS'], rating: 4.6, orders: 9200, hue: 275,
    en: {
      title: 'TWS Earbuds Bluetooth 5.3 with ANC',
      desc: 'True wireless earbuds with Bluetooth 5.3, active noise cancellation, 30-hour playtime with charging case and IPX5 waterproof rating. White-label and custom packaging available.',
      features: ['Bluetooth 5.3, low latency', 'Active noise cancellation', '30h total playtime', 'IPX5 water resistant']
    },
    zh: {
      title: 'TWS 蓝牙耳机 5.3 主动降噪',
      desc: '真无线蓝牙耳机，蓝牙 5.3 芯片，主动降噪，配合充电仓续航 30 小时，IPX5 防水。支持白牌与定制包装。',
      features: ['蓝牙 5.3，低延迟', '主动降噪 ANC', '总续航 30 小时', 'IPX5 防水']
    }
  },
  {
    id: 'p5', sellerId: 's1', cat: 'textiles', country: 'CN', featured: true,
    priceMin: 3.2, priceMax: 4.8, moq: 500, unit: 'kg', leadTime: 12,
    terms: ['FOB', 'CIF'], certs: ['OEKO-TEX', 'GOTS'], rating: 4.8, orders: 5600, hue: 330,
    en: {
      title: 'Organic Cotton Knit Fabric 180gsm',
      desc: 'GOTS certified organic cotton jersey fabric, 180gsm with 4-way stretch. Suitable for babywear, T-shirts and sportswear. 60+ solid colors, custom dyeing from 300kg.',
      features: ['GOTS & OEKO-TEX certified', '180gsm 4-way stretch', '60+ colors in stock', 'Custom dyeing available']
    },
    zh: {
      title: '有机棉针织面料 180gsm',
      desc: 'GOTS 认证有机棉汗布，180gsm 四向弹力，适用于童装、T 恤与运动服。现货 60+ 颜色，300kg 起支持定制染色。',
      features: ['GOTS / OEKO-TEX 双认证', '180gsm 四向弹力', '60+ 现货颜色', '支持定制染色']
    }
  },
  {
    id: 'p6', sellerId: 's5', cat: 'textiles', country: 'IN',
    priceMin: 2.1, priceMax: 3.6, moq: 200, unit: 'pcs', leadTime: 25,
    terms: ['CIF', 'EXW'], certs: ['OEKO-TEX'], rating: 4.5, orders: 2300, hue: 350,
    en: {
      title: 'Handloom Cotton Cushion Covers',
      desc: 'Hand-woven cotton cushion covers with traditional block-print patterns. 45×45cm with hidden zipper, 12 designs available. Fair-trade production in family workshops.',
      features: ['Handloom cotton, 12 designs', '45×45cm, hidden zipper', 'Fair-trade workshops', 'Custom print available']
    },
    zh: {
      title: '手工棉质抱枕套',
      desc: '手工梭织棉质抱枕套，传统木版印花图案，45×45cm 隐形拉链，12 款设计可选，来自公平贸易家庭工坊。',
      features: ['手工棉织，12 款图案', '45×45cm，隐形拉链', '公平贸易工坊生产', '支持定制印花']
    }
  },
  {
    id: 'p7', sellerId: 's3', cat: 'furniture', country: 'VN', featured: true,
    priceMin: 680, priceMax: 950, moq: 10, unit: 'set', leadTime: 30,
    terms: ['FOB', 'CIF'], certs: ['FSC'], rating: 4.7, orders: 860, hue: 24,
    en: {
      title: 'Solid Teak Outdoor Dining Set',
      desc: 'FSC-certified solid teak outdoor dining set with 6 seats and 180cm table. Natural oil finish, suitable for seaside and garden use. Flat-pack option available.',
      features: ['FSC certified solid teak', '6-seat set, 180cm table', 'Natural oil finish', 'Flat-pack or fully assembled']
    },
    zh: {
      title: '实木柚木户外餐桌椅套装',
      desc: 'FSC 认证实木柚木户外餐桌，含 6 椅与 180cm 餐桌，天然木油处理，适用于海边与花园场景，可选平板包装。',
      features: ['FSC 认证实木柚木', '6 椅 + 180cm 餐桌', '天然木油涂装', '平板包装或整装发货']
    }
  },
  {
    id: 'p8', sellerId: 's4', cat: 'furniture', country: 'TR',
    priceMin: 420, priceMax: 560, moq: 20, unit: 'set', leadTime: 28,
    terms: ['FOB', 'CIF'], certs: [], rating: 4.4, orders: 1500, hue: 16,
    en: {
      title: 'Modern Upholstered Sofa 3-Seater',
      desc: 'Contemporary 3-seater sofa with solid wood frame, high-density foam cushions and removable linen covers. 10 fabric colors, matching armchairs and ottomans available.',
      features: ['Solid wood frame', 'High-density foam cushions', 'Removable linen covers', '10 fabric colors']
    },
    zh: {
      title: '现代布艺三人沙发',
      desc: '现代风格三人沙发，实木框架、高密度海绵坐垫、可拆洗亚麻布套，10 种面料颜色可选，可配套单人椅与脚踏。',
      features: ['实木框架', '高密度海绵坐垫', '可拆洗亚麻布套', '10 种面料颜色']
    }
  },
  {
    id: 'p9', sellerId: 's1', cat: 'chemicals', country: 'CN', featured: true,
    priceMin: 780, priceMax: 940, moq: 10, unit: 'ton', leadTime: 14,
    terms: ['FOB', 'CIF'], certs: ['ISO9001', 'SGS'], rating: 4.8, orders: 7200, hue: 160,
    en: {
      title: 'Citric Acid Monohydrate 99.5%',
      desc: 'Food-grade citric acid monohydrate 99.5% purity, 25kg bags with palletization. Used as acidulant in food & beverage, cleaning agents and pharmaceutical industries.',
      features: ['99.5% purity, food grade', '25kg bag, 24MT per 20GP', 'SGS third-party inspection', 'Short lead time']
    },
    zh: {
      title: '一水柠檬酸 99.5%',
      desc: '食品级一水柠檬酸，纯度 99.5%，25kg 袋装打托。用作食品饮料酸味剂、清洁剂及医药行业原料，支持 SGS 第三方检测。',
      features: ['纯度 99.5%，食品级', '25kg 袋装，20GP 装 24MT', '支持 SGS 第三方检测', '交期短，现货充足']
    }
  },
  {
    id: 'p10', sellerId: 's5', cat: 'chemicals', country: 'IN',
    priceMin: 4.9, priceMax: 6.8, moq: 200, unit: 'L', leadTime: 20,
    terms: ['CIF', 'EXW'], certs: ['ISO9001'], rating: 4.3, orders: 980, hue: 150,
    en: {
      title: 'Cold Pressed Natural Neem Oil',
      desc: '100% cold-pressed neem oil from organic farms, suitable for cosmetics, agriculture and herbal products. Available in 1L, 5L and 25L containers with COA.',
      features: ['100% cold-pressed', 'Organic farm source', '1L/5L/25L containers', 'COA with every batch']
    },
    zh: {
      title: '冷压天然印楝油',
      desc: '100% 冷压印楝油，来自有机农场，适用于化妆品、农业与草本产品，提供 1L/5L/25L 包装并附带每批 COA 检测报告。',
      features: ['100% 冷压工艺', '有机农场直供', '1L/5L/25L 包装', '每批附 COA 报告']
    }
  },
  {
    id: 'p11', sellerId: 's2', cat: 'auto', country: 'CN', featured: true, hot: true,
    priceMin: 28, priceMax: 42, moq: 100, unit: 'pcs', leadTime: 18,
    terms: ['FOB', 'EXW'], certs: ['CE', 'TÜV', 'RoHS'], rating: 4.9, orders: 4100, hue: 210,
    en: {
      title: 'EV Charging Cable Type 2 32A',
      desc: 'Type 2 EV charging cable for AC charging, 32A single-phase / three-phase, 5m standard length with TÜV and CE certifications. Custom cable length and colors available.',
      features: ['Type 2 to Type 2, 32A', '5m standard, custom length', 'TÜV & CE certified', 'Custom colors and logo']
    },
    zh: {
      title: '新能源充电枪 Type 2 32A',
      desc: 'Type 2 交流充电枪，32A 单相/三相，标准 5 米线缆，TÜV、CE 认证，支持定制线长与颜色。',
      features: ['Type 2 对 Type 2，32A', '标准 5 米，可定制长度', 'TÜV / CE 认证', '支持定制颜色与 LOGO']
    }
  },
  {
    id: 'p12', sellerId: 's5', cat: 'auto', country: 'IN',
    priceMin: 310, priceMax: 450, moq: 5, unit: 'pcs', leadTime: 26,
    terms: ['FOB', 'CIF'], certs: ['ISO9001'], rating: 4.6, orders: 1300, hue: 355,
    en: {
      title: 'Turbocharger CT9A Compatible',
      desc: 'Aftermarket turbocharger compatible with Mitsubishi 4G15 engine, high-precision balanced rotor with 12-month warranty. Rigorous 100% dynamic balance testing.',
      features: ['Compatible with 4G15 engine', '100% dynamic balance test', '12-month warranty', 'Strict quality control']
    },
    zh: {
      title: '三菱 4G15 涡轮增压器',
      desc: '适配三菱 4G15 发动机的售后涡轮增压器，高精度动平衡转子，100% 动平衡测试，12 个月质保。',
      features: ['适配 4G15 发动机', '100% 动平衡测试', '12 个月质保', '严格质量管控']
    }
  },
  {
    id: 'p13', sellerId: 's2', cat: 'electronics', country: 'CN',
    priceMin: 26, priceMax: 39, moq: 200, unit: 'pcs', leadTime: 15,
    terms: ['FOB', 'EXW'], certs: ['CE', 'FCC', 'RoHS'], rating: 4.5, orders: 6800, hue: 285,
    en: {
      title: '4K Dash Cam with WiFi & GPS',
      desc: '4K ultra HD dash camera with WiFi App control, built-in GPS, super capacitor and 24-hour parking monitoring. Night vision enhanced sensor.',
      features: ['4K UHD recording', 'WiFi App + built-in GPS', 'Parking monitoring', 'Super capacitor design']
    },
    zh: {
      title: '4K 行车记录仪 WiFi GPS',
      desc: '4K 超清行车记录仪，支持 WiFi App 控制、内置 GPS、超级电容与 24 小时停车监控，夜视增强传感器。',
      features: ['4K 超清录制', 'WiFi App + 内置 GPS', '停车监控', '超级电容设计']
    }
  },
  {
    id: 'p14', sellerId: 's4', cat: 'machinery', country: 'TR',
    priceMin: 2400, priceMax: 3600, moq: 1, unit: 'set', leadTime: 40,
    terms: ['FOB', 'CIF'], certs: ['CE'], rating: 4.7, orders: 420, hue: 190,
    en: {
      title: 'Industrial Coffee Grinder 60kg/h',
      desc: 'Commercial burr coffee grinder with 60kg/h capacity, stepless grind adjustment and low-noise motor. Ideal for roasteries, cafes and supermarkets.',
      features: ['60kg/h throughput', 'Stepless grind control', 'Low-noise motor', 'Stainless steel burrs']
    },
    zh: {
      title: '工业咖啡研磨机 60kg/h',
      desc: '商用锥刀咖啡研磨机，产能 60kg/h，无级调节研磨度，低噪音电机，适用于烘焙厂、咖啡馆与商超。',
      features: ['60kg/h 产能', '无级研磨调节', '低噪音电机', '不锈钢磨盘']
    }
  }
].concat(pendingSeedProducts());

const DEMO_USERS = {
  seller: { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', sellerId: 's1' },
  buyer:  { id: 'u-buyer',  role: 'buyer',  name: 'Thomas Müller', email: 'buyer@demo.com', buyerCompany: 'Müller GmbH', buyerCountry: 'DE' },
  admin:  { id: 'u-admin',  role: 'admin',  name: '平台管理员', email: 'admin@demo.com' }
};

const UNITS = ['set', 'pcs', 'kg', 'ton', 'L'];
const CERT_LIST = ['CE', 'FCC', 'RoHS', 'ISO9001', 'SGS', 'OEKO-TEX', 'GOTS', 'FSC', 'TÜV'];
const TERM_LIST = ['FOB', 'CIF', 'EXW', 'DDP'];
const HS_BY_CAT = { machinery: '8456.11', electronics: '8504.40', textiles: '5208.12', furniture: '9403.60', chemicals: '2918.14', auto: '8504.50' };
const FX_RATES = { date: '2026-08-10', USD_CNY: 7.25, USD_EUR: 0.92, USD_JPY: 152, USD_GBP: 0.79 };
const PAYMENT_TERMS = [
  { zh: 'T/T（电汇）', en: 'T/T (bank transfer)' },
  { zh: 'L/C（信用证）', en: 'L/C (letter of credit)' },
  { zh: 'D/P（付款交单）', en: 'D/P (documents against payment)' },
  { zh: '30/70 定金+发货前付清', en: '30/70 deposit + balance before shipment' },
  { zh: 'O/A（赊销）', en: 'O/A (open account)' }
];
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
  p13: ['EU', 'US'], p14: ['EU'], p15: ['EU'], p16: ['EU', 'US']
};

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
    { id: 'u-admin', role: 'admin', name: '平台管理员', email: 'admin@demo.com', company: '豆豆鼠运营部', country: 'CN', joinedAt: now - 864e5 * 220, status: 'active' },
    { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', company: '杭州云帆机械有限公司', country: 'CN', joinedAt: now - 864e5 * 180, status: 'active' },
    { id: 'u-buyer', role: 'buyer', name: 'Thomas Müller', email: 'buyer@demo.com', company: 'Müller GmbH', country: 'DE', joinedAt: now - 864e5 * 90, status: 'active' },
    { id: 'u4', role: 'seller', name: '李工', email: 'lee@nova-sz.cn', company: '深圳新星电子科技有限公司', country: 'CN', joinedAt: now - 864e5 * 150, status: 'active' },
    { id: 'u5', role: 'seller', name: 'Nguyen Van An', email: 'vanan@greenliving.vn', company: 'Hai Phong Green Living', country: 'VN', joinedAt: now - 864e5 * 60, status: 'active' },
    { id: 'u6', role: 'buyer', name: 'Maria Garcia', email: 'maria@iberia-sourcing.es', company: 'Iberia Sourcing', country: 'ES', joinedAt: now - 864e5 * 40, status: 'active' },
    { id: 'u7', role: 'buyer', name: '田中一郎', email: 'tanaka@tokyo-trading.jp', company: 'Tokyo Trading', country: 'JP', joinedAt: now - 864e5 * 25, status: 'active' },
    { id: 'u8', role: 'buyer', name: 'Ahmed Al Farsi', email: 'ahmed@gulf-imports.ae', company: 'Gulf Imports', country: 'AE', joinedAt: now - 864e5 * 8, status: 'active' }
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
    { id: 'l1', ts: now - 3600e3 * 26, actor: '平台管理员', action: '企业认证通过', target: '深圳新星电子科技有限公司', detail: '营业执照与 ISO 证书核验无误' },
    { id: 'l2', ts: now - 3600e3 * 4, actor: '王经理', action: '发布产品', target: '3000W 光纤激光切割机', detail: '提交平台审核' }
  ];
}

const I18N = {
  zh: {
    home: '首页', marketplace: '产品市场', dashboard: '工作台', login: '登录', logout: '退出登录',
    heroTitle: '连接全球买家与优质供应商',
    heroSub: '一站式发布产品、精准筛选、快速询盘，让每一笔跨国生意更简单。',
    searchPlaceholder: '搜索产品，例如：激光切割机、充电器、面料…',
    popular: '热门搜索：', statsSuppliers: '认证供应商', statsProducts: '在售产品', statsCountries: '覆盖国家', statsResponse: '平均询盘回复率',
    categoriesTitle: '热门行业', featuredTitle: '精选产品', viewAll: '查看全部',
    howTitle: '三步完成一笔跨国生意', howStep1Title: '供应商发布产品', howStep1Desc: '填写产品规格、价格与认证信息，一键上架。',
    howStep2Title: '买家搜索筛选', howStep2Desc: '按行业、价格、起订量、产地精准筛选。',
    howStep3Title: '询盘沟通报价', howStep3Desc: '买家发起询盘，供应商快速回复报价，平台全程保护联系方式。',
    trustTitle: '平台保障', trust1Title: '企业认证', trust1Desc: '供应商营业执照与资质核验，杜绝虚假信息。',
    trust2Title: '询盘直达', trust2Desc: '站内询盘 + 邮件双通道通知，时差不再是障碍。',
    trust3Title: '多语言支持', trust3Desc: '中英双语界面与产品信息，服务全球买家。',
    sellerCtaTitle: '成为供应商，免费入驻', sellerCtaDesc: '发布产品立即获得全球买家询盘，按效果付费，前期零成本。', sellerCtaBtn: '进入卖家工作台',
    footerTagline: '连接全球买家与优质供应商的 B2B 贸易平台（演示原型）', rights: '© 2026 BeanBeanMouse 演示原型 · 仅用于设计演示',
    resultsCount: '个结果', filters: '筛选', category: '行业分类', priceRange: '价格区间 (USD)', minPrice: '最低价', maxPrice: '最高价',
    moq: '最小起订量', origin: '产地', certs: '认证', clearFilters: '清除筛选', sort: '排序',
    sortRecommended: '综合推荐', sortNewest: '最新上架', sortPriceAsc: '价格从低到高', sortPriceDesc: '价格从高到低',
    noResults: '未找到匹配的产品', noResultsHint: '试试调整筛选条件或更换关键词', searchResultsFor: '“{kw}”的搜索结果',
    moqLabel: '起订量', verified: '认证供应商', hot: '热销', new: '新品', sendInquiry: '发送询盘', viewDetail: '查看详情',
    priceRangeLabel: '价格区间', leadTime: '交货周期', terms: '贸易术语', originLabel: '产地', seller: '供应商', statusPill: '状态',
    responseRate: '回复率', responseTime: '平均响应', since: '成立年份', orders: '累计订单', unitLabel: '单位',
    productDetail: '产品详情', features: '产品特性', aboutSeller: '关于供应商', days: '天',
    favorite: '收藏', favorited: '已收藏', inquiryTitle: '发送询盘', quantity: '订购数量', message: '询盘内容',
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
    priceMinField: '最低价 (USD)', priceMaxField: '最高价 (USD)', categoryField: '行业分类', certsField: '认证',
    inquiryFrom: '询盘来自', reply: '回复', replied: '已回复', markHandled: '标记已处理', noInquiries: '暂无询盘',
    replyPlaceholder: '输入您的回复（买家可在“我的询盘”中看到）…', sendReply: '发送回复',
    myInquiries: '我的询盘', myFavorites: '我的收藏', noInquiriesYet: '还没有发送过询盘', noFavoritesYet: '还没有收藏产品',
    sentAt: '发送于', statusNew: '待回复', statusReplied: '供应商已回复', sellerReply: '供应商回复',
    loginTitle: '体验登录', loginDesc: '这是一个演示原型，选择角色即可体验完整流程，无需注册。',
    asBuyer: '以买家身份体验', asSeller: '以卖家身份体验', asGuest: '游客浏览',
    asAdmin: '以平台管理员身份体验', adminDesc: '审核产品、认证企业、管理用户、查看平台数据',
    loginNote: '提示：所有数据仅保存在您本地浏览器中，刷新不丢失。',
    adminPanel: '平台管理后台', adminOverview: '数据看板', productReview: '产品审核', companyVerify: '企业认证', userManage: '用户管理', auditLog: '操作日志',
    statUsers: '注册用户', statPendingProducts: '待审核产品',
    inqByCategory: '询盘按行业分布', inqByCountry: '询盘按国家分布', latestActivity: '最新动态',
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
    allCategories: '全部行业', allCountries: '全部产地', anyMoq: '不限', allCerts: '全部',
    quickActions: '快捷操作', publishedProducts: '在售产品', totalInquiries: '累计询盘', thisMonthInquiries: '本月询盘',
    copy: '复制成功', languageName: 'EN', brand: 'BeanBeanMouse'
  },
  en: {
    home: 'Home', marketplace: 'Products', dashboard: 'Dashboard', login: 'Sign in', logout: 'Sign out',
    heroTitle: 'Connecting Global Buyers with Trusted Suppliers',
    heroSub: 'Publish products, filter precisely and send inquiries — one platform for simpler cross-border trade.',
    searchPlaceholder: 'Search products, e.g. laser cutter, charger, fabric…',
    popular: 'Popular:', statsSuppliers: 'Verified suppliers', statsProducts: 'Live products', statsCountries: 'Countries served', statsResponse: 'Avg. inquiry response rate',
    categoriesTitle: 'Top Categories', featuredTitle: 'Featured Products', viewAll: 'View all',
    howTitle: 'Close a cross-border deal in 3 steps', howStep1Title: 'Suppliers publish', howStep1Desc: 'Add specs, pricing and certifications, then go live.',
    howStep2Title: 'Buyers search & filter', howStep2Desc: 'Filter by category, price, MOQ and origin.',
    howStep3Title: 'Inquire & quote', howStep3Desc: 'Buyers send inquiries; suppliers reply fast. Contacts stay protected.',
    trustTitle: 'Platform protection', trust1Title: 'Verified companies', trust1Desc: 'Business licenses verified to block fake suppliers.',
    trust2Title: 'Inquiry delivery', trust2Desc: 'In-app + email notifications bridge time zones.',
    trust3Title: 'Multilingual', trust3Desc: 'Bilingual UI and product data serve global buyers.',
    sellerCtaTitle: 'Become a supplier — free to join', sellerCtaDesc: 'Get inquiries from global buyers with zero upfront cost.', sellerCtaBtn: 'Open seller dashboard',
    footerTagline: 'A B2B trade platform connecting global buyers and trusted suppliers (demo prototype)', rights: '© 2026 BeanBeanMouse demo prototype · For design demonstration only',
    resultsCount: 'results', filters: 'Filters', category: 'Category', priceRange: 'Price range (USD)', minPrice: 'Min', maxPrice: 'Max',
    moq: 'Min. order', origin: 'Origin', certs: 'Certifications', clearFilters: 'Clear filters', sort: 'Sort',
    sortRecommended: 'Recommended', sortNewest: 'Newest', sortPriceAsc: 'Price low → high', sortPriceDesc: 'Price high → low',
    noResults: 'No matching products', noResultsHint: 'Try adjusting filters or keywords', searchResultsFor: 'Results for “{kw}”',
    moqLabel: 'MOQ', verified: 'Verified supplier', hot: 'Hot', new: 'New', sendInquiry: 'Send inquiry', viewDetail: 'View details',
    priceRangeLabel: 'Price range', leadTime: 'Lead time', terms: 'Trade terms', originLabel: 'Origin', seller: 'Supplier', statusPill: 'Status',
    responseRate: 'Response rate', responseTime: 'Avg. response', since: 'Since', orders: 'Total orders', unitLabel: 'Unit',
    productDetail: 'Product details', features: 'Key features', aboutSeller: 'About the supplier', days: 'days',
    favorite: 'Favorite', favorited: 'Favorited', inquiryTitle: 'Send an inquiry', quantity: 'Order quantity', message: 'Inquiry message',
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
    footerTagline: '世界中のバイヤーと信頼できるサプライヤーをつなぐB2B貿易プラットフォーム（デモ版）', rights: '© 2026 BeanBeanMouse デモ版・デザイン確認用'
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
    footerTagline: '전 세계 바이어와 신뢰할 수 있는 공급업체를 연결하는 B2B 무역 플랫폼(데모)', rights: '© 2026 BeanBeanMouse 데모 · 디자인 확인용'
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
    footerTagline: 'Plataforma B2B que conecta compradores globales con proveedores confiables (demo)', rights: '© 2026 BeanBeanMouse demo · solo para diseño'
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
    footerTagline: 'Plateforme B2B reliant acheteurs mondiaux et fournisseurs de confiance (démo)', rights: '© 2026 BeanBeanMouse démo · démonstration de design'
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
    footerTagline: 'B2B-Plattform, die globale Käufer und vertrauenswürdige Lieferanten verbindet (Demo)', rights: '© 2026 BeanBeanMouse Demo · nur zur Designprüfung'
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
    footerTagline: 'Plataforma B2B que conecta compradores globais e fornecedores confiáveis (demonstração)', rights: '© 2026 BeanBeanMouse demo · apenas para design'
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
    footerTagline: 'B2B-платформа, соединяющая покупателей и проверенных поставщиков (демо)', rights: '© 2026 BeanBeanMouse демо · только для дизайна'
  }
});

const DEFAULT_STATE = {
  products: PRODUCTS.map(p => ({ ...p, hsCode: p.hsCode || HS_BY_CAT[p.cat] || '', markets: p.markets || MARKETS_BY_PRODUCT[p.id] || [] })),
  inquiries: [],
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
  return {
    products: PRODUCTS.map(p => ({ ...p, hsCode: p.hsCode || HS_BY_CAT[p.cat] || '', markets: p.markets || MARKETS_BY_PRODUCT[p.id] || [] })),
    inquiries: [
      {
        id: 'i1', productId: 'p1', sellerId: 's1', buyerId: 'u-buyer',
        name: 'Thomas Müller', email: 'thomas.mueller@muller-gmbh.de', company: 'Müller GmbH', country: 'DE',
        qty: 2, unit: 'set', message: 'Hello, we need 2 units of the 3000W laser cutter with exchange table. Could you quote CIF Hamburg including installation training?', createdAt: now - 1000 * 60 * 60 * 5, status: 'new', reply: ''
      },
      {
        id: 'i2', productId: 'p3', sellerId: 's2', buyerId: 'u-buyer',
        name: 'Thomas Müller', email: 'thomas.mueller@muller-gmbh.de', company: 'Müller GmbH', country: 'DE',
        qty: 5000, unit: 'pcs', message: 'Please quote for 5,000 pcs with custom logo packaging. What is the price for the 2-color option?', createdAt: now - 1000 * 60 * 60 * 30, status: 'handled', reply: 'Hi Thomas, thanks for your inquiry. Price for 5,000 pcs with custom logo is USD 3.2/pc FOB Shenzhen. Lead time 15 days. We will send the packaging mockup tomorrow.'
      },
      {
        id: 'i3', productId: 'p5', sellerId: 's1', buyerId: 'u-buyer',
        name: 'Sarah Johnson', email: 'sarah.j@greenloom.com', company: 'GreenLoom Textiles', country: 'US',
        qty: 1000, unit: 'kg', message: 'Hi, we are sourcing GOTS organic cotton jersey for our kids line. Do you have light blue in stock? Please quote CIF New York for 1,000 kg.', createdAt: now - 1000 * 60 * 60 * 52, status: 'new', reply: ''
      }
    ],
    favorites: ['p3', 'p7'],
    user: null,
    lang: 'en',
    firstVisit: true,
    users: buildUsers(now),
    companies: buildCompanies(),
    logs: buildLogs(now),
    newsRegions: ['CN', 'GLOBAL'],
    newsSyncedAt: now
  };
}
