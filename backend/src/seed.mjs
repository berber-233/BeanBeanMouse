import { randomUUID } from './platform.mjs';
import { all, run } from './store.mjs';
import { hashPassword } from './auth.mjs';

/* 与前端保持一致的产品防伪码生成算法（正式版由服务端签发） */
export function antiFakeCode(id, sellerId, enTitle) {
  let s = 0;
  const seed = id + ':' + sellerId + ':' + (enTitle || '');
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 97;
  return 'TB-' + String(id).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + String(s).padStart(2, '0');
}

export async function seedIfEmpty() {
  const row = (await all('SELECT COUNT(*) AS c FROM users'))[0];
  if (row && row.c > 0) return false;

  const now = Date.now();
  const adminId = 'u-admin', sellerId = 'u-seller', buyerId = 'u-buyer', frozenId = 'u-frozen';

  await run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    adminId, 'admin@demo.com', await hashPassword('admin123'), 'admin', '平台管理员', 'active', 1, now
  );
  await run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    sellerId, 'seller@demo.com', await hashPassword('seller123'), 'seller', '王经理', 'active', 1, now
  );
  await run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    buyerId, 'buyer@demo.com', await hashPassword('buyer123'), 'buyer', 'Thomas Müller', 'active', 1, now
  );
  await run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    frozenId, 'tanaka@tokyo-trading.jp', await hashPassword('frozen123'), 'buyer', '田中一郎', 'frozen', 1, now
  );

  const c1 = randomUUID();
  await run(
    'INSERT INTO companies (id, user_id, name, country, city, license_no, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
    c1, sellerId, '杭州云帆机械有限公司', 'CN', '杭州', 'LIC-2026-001', 'approved', now
  );

  const products = [
    {
      id: 'p1', sellerId, companyId: c1, category: 'pet', sub: 'pet-hamster', hsCode: '9403.90', country: 'CN',
      priceMin: 4.2, priceMax: 6.8, moq: 300, unit: 'pcs', leadTime: 18, terms: ['FOB', 'CIF'], certs: ['CE'],
      srcLang: 'zh', status: 'on',
      en: { title: '3-Tier Hamster Cage with Tube Set', description: 'Three-level hamster cage with transparent tubes, exercise wheel, water bottle and hideout. Tool-free assembly, 9mm wire spacing for small pets.', features: ['3 levels + tubes', 'Includes wheel & bottle', '9mm wire spacing', 'Tool-free assembly'] },
      zh: { title: '三层仓鼠笼 含管道套装', description: '三层结构仓鼠笼，配透明连接管道、跑轮、饮水瓶与躲藏屋，免工具组装，钢丝间距 9mm 适配小宠。', features: ['三层结构+管道', '含跑轮与饮水瓶', '钢丝间距 9mm', '免工具组装'] }
    },
    {
      id: 'p2', sellerId, companyId: c1, category: 'pet', sub: 'pet-cat', hsCode: '3924.90', country: 'CN',
      priceMin: 7.5, priceMax: 11.5, moq: 300, unit: 'pcs', leadTime: 22, terms: ['FOB', 'EXW'], certs: ['CE', 'RoHS'],
      srcLang: 'en', status: 'on',
      en: { title: 'Automatic Pet Water Fountain 2.5L', description: 'Quiet pump under 40dB, 2.5L capacity, triple filtration with replaceable cotton, visible water level and low-water shut-off.', features: ['Under 40dB pump', '2.5L capacity', 'Triple filtration', 'Dry-run protection'] },
      zh: { title: '宠物自动饮水机 2.5L', description: '静音水泵低于 40 分贝，2.5L 容量，三重过滤含可换棉芯，水位可视并带缺水断电保护。', features: ['低于 40 分贝', '2.5L 容量', '三重过滤', '缺水保护'] }
    },
    {
      id: 'p3', sellerId, companyId: c1, category: 'pet', sub: 'pet-hamster', hsCode: '6307.90', country: 'CN',
      priceMin: 9.5, priceMax: 16, moq: 300, unit: 'pcs', leadTime: 20, terms: ['CIF', 'EXW'], certs: ['OEKO-TEX'],
      srcLang: 'zh', status: 'pending',
      en: { title: 'Replica Branded Pet Bed (compliance test fixture)', description: 'Plush pet bed with removable cushion, 3 sizes. Listing keeps replica wording on purpose so compliance screening has a case to catch.', features: ['Removable cushion', '3 sizes', 'Non-slip base'] },
      zh: { title: '仿牌宠物窝（合规审核演示用）', description: '短绒宠物窝，含可拆洗内垫，三种尺寸，底部防滑。标题故意保留“仿牌”字样，用于演示合规筛查拦截。', features: ['可拆洗内垫', '三种尺寸', '底部防滑'] }
    }
  ];

  for (const p of products) {
    await run(
      'INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      p.id, p.sellerId, p.companyId, p.category, p.sub || '', p.hsCode, p.country, p.priceMin, p.priceMax, p.moq, p.unit, p.leadTime,
      JSON.stringify(p.terms), JSON.stringify(p.certs), p.srcLang, p.status, now, now
    );
    for (const lang of ['en', 'zh']) {
      await run(
        'INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
        randomUUID(), p.id, lang, p[lang].title, p[lang].description, JSON.stringify(p[lang].features), now
      );
    }
    await run(
      'INSERT INTO anti_fake_codes (id, product_id, code, batch_no, status, issued_at, verify_count) VALUES (?,?,?,?,?,?,?)',
      randomUUID(), p.id, antiFakeCode(p.id, p.sellerId, p.en.title), 'B2026-001', 'active', now, 0
    );
  }

  const src1 = randomUUID(), src2 = randomUUID();
  await run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)', src1, '中国海关总署', 'https://www.customs.gov.cn', 'CN', 'logistics', 1);
  await run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)', src2, '欧盟委员会税务与海关', 'https://taxation-customs.ec.europa.eu', 'EU', 'compliance', 1);
  await run(
    'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    'n1', src1, 'CN', 'logistics', '海关推广跨境电商退货便利化', 'Customs improves cross-border e-commerce returns', '退运商品可跨关区退回。', 'Returned goods can cross customs districts.', 'https://www.customs.gov.cn', '2026-08-01', 'published'
  );
  await run(
    'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    'n2', src2, 'EU', 'compliance', '欧盟 CBAM 进入正式实施阶段', 'EU CBAM enters definitive phase', '进口商须注册授权申报人。', 'Importers must register as authorized declarants.', 'https://taxation-customs.ec.europa.eu', '2026-08-02', 'published'
  );

  await run(
    'INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?,?)',
    randomUUID(), adminId, 'system.seed', 'database', 'seed', '初始化演示数据', now
  );
  return true;
}
