import { randomUUID } from 'node:crypto';
import { all, run } from './db.mjs';
import { hashPassword } from './auth.mjs';

/* 与前端保持一致的产品防伪码生成算法（正式版由服务端签发） */
export function antiFakeCode(id, sellerId, enTitle) {
  let s = 0;
  const seed = id + ':' + sellerId + ':' + (enTitle || '');
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 97;
  return 'TB-' + String(id).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + String(s).padStart(2, '0');
}

export function seedIfEmpty() {
  const row = all('SELECT COUNT(*) AS c FROM users')[0];
  if (row && row.c > 0) return false;

  const now = Date.now();
  const adminId = 'u-admin', sellerId = 'u-seller', buyerId = 'u-buyer', frozenId = 'u-frozen';

  run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    adminId, 'admin@demo.com', hashPassword('admin123'), 'admin', '平台管理员', 'active', 1, now
  );
  run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    sellerId, 'seller@demo.com', hashPassword('seller123'), 'seller', '王经理', 'active', 1, now
  );
  run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    buyerId, 'buyer@demo.com', hashPassword('buyer123'), 'buyer', 'Thomas Müller', 'active', 1, now
  );
  run(
    'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    frozenId, 'tanaka@tokyo-trading.jp', hashPassword('frozen123'), 'buyer', '田中一郎', 'frozen', 1, now
  );

  const c1 = randomUUID();
  run(
    'INSERT INTO companies (id, user_id, name, country, city, license_no, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
    c1, sellerId, '杭州云帆机械有限公司', 'CN', '杭州', 'LIC-2026-001', 'approved', now
  );

  const products = [
    {
      id: 'p1', sellerId, companyId: c1, category: 'machinery', sub: 'laser', hsCode: '8456.11', country: 'CN',
      priceMin: 12800, priceMax: 16800, moq: 1, unit: 'set', leadTime: 30, terms: ['FOB', 'CIF'], certs: ['CE'],
      srcLang: 'zh', status: 'on',
      en: { title: '3000W Fiber Laser Cutting Machine', description: 'CNC fiber laser cutter with exchange table, 3kW, suitable for sheet metal cutting.', features: ['3kW fiber laser', 'Exchange table', 'CE certified'] },
      zh: { title: '3000W 光纤激光切割机', description: '数控光纤激光切割机，含交换工作台，3kW，适用于钣金切割。', features: ['3kW 光纤激光', '交换工作台', 'CE 认证'] }
    },
    {
      id: 'p2', sellerId, companyId: c1, category: 'electronics', sub: 'ev-charging', hsCode: '8504.40', country: 'CN',
      priceMin: 3.2, priceMax: 4.8, moq: 1000, unit: 'pcs', leadTime: 15, terms: ['FOB', 'EXW'], certs: ['CE', 'RoHS'],
      srcLang: 'en', status: 'on',
      en: { title: 'GaN Fast Charger 65W USB-C', description: '65W GaN fast charger with USB-C PD3.0, compact design, CE & RoHS.', features: ['65W GaN', 'USB-C PD3.0', 'CE & RoHS'] },
      zh: { title: '65W 氮化镓快充充电器', description: '65W 氮化镓快充充电器，USB-C PD3.0，小巧便携，CE/RoHS 认证。', features: ['65W 氮化镓', 'USB-C PD3.0', 'CE/RoHS'] }
    },
    {
      id: 'p3', sellerId, companyId: c1, category: 'textiles', sub: 'fabric', hsCode: '5208.11', country: 'CN',
      priceMin: 2.8, priceMax: 3.6, moq: 500, unit: 'kg', leadTime: 20, terms: ['FOB'], certs: ['GOTS'],
      srcLang: 'zh', status: 'pending',
      en: { title: 'Organic Cotton Jersey Fabric', description: 'GOTS organic cotton jersey, 180gsm, natural dye options.', features: ['GOTS certified', '180gsm', 'Natural dyes'] },
      zh: { title: '有机棉针织面料', description: 'GOTS 有机棉针织面料，180gsm，可选天然染色。', features: ['GOTS 认证', '180gsm', '天然染色'] }
    }
  ];

  for (const p of products) {
    run(
      'INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      p.id, p.sellerId, p.companyId, p.category, p.sub || '', p.hsCode, p.country, p.priceMin, p.priceMax, p.moq, p.unit, p.leadTime,
      JSON.stringify(p.terms), JSON.stringify(p.certs), p.srcLang, p.status, now, now
    );
    for (const lang of ['en', 'zh']) {
      run(
        'INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
        randomUUID(), p.id, lang, p[lang].title, p[lang].description, JSON.stringify(p[lang].features), now
      );
    }
    run(
      'INSERT INTO anti_fake_codes (id, product_id, code, batch_no, status, issued_at, verify_count) VALUES (?,?,?,?,?,?,?)',
      randomUUID(), p.id, antiFakeCode(p.id, p.sellerId, p.en.title), 'B2026-001', 'active', now, 0
    );
  }

  const src1 = randomUUID(), src2 = randomUUID();
  run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)', src1, '中国海关总署', 'https://www.customs.gov.cn', 'CN', 'logistics', 1);
  run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)', src2, '欧盟委员会税务与海关', 'https://taxation-customs.ec.europa.eu', 'EU', 'compliance', 1);
  run(
    'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    'n1', src1, 'CN', 'logistics', '海关推广跨境电商退货便利化', 'Customs improves cross-border e-commerce returns', '退运商品可跨关区退回。', 'Returned goods can cross customs districts.', 'https://www.customs.gov.cn', '2026-08-01', 'published'
  );
  run(
    'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    'n2', src2, 'EU', 'compliance', '欧盟 CBAM 进入正式实施阶段', 'EU CBAM enters definitive phase', '进口商须注册授权申报人。', 'Importers must register as authorized declarants.', 'https://taxation-customs.ec.europa.eu', '2026-08-02', 'published'
  );

  run(
    'INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?,?)',
    randomUUID(), adminId, 'system.seed', 'database', 'seed', '初始化演示数据', now
  );
  return true;
}
