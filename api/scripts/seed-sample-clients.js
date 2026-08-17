/**
 * Sample Test Data for Phase 2 Client Portal
 * 
 * Run this script to seed 5 sample clients with company profiles,
 * compliance configs, and filing records for offline testing.
 * 
 * Usage: node scripts/seed-sample-clients.js
 */

const db = require('../src/models/prismaClient');

const SAMPLE_CLIENTS = [
  {
    email: 'client1@testfactory.com',
    name: 'Ramesh Kumar',
    company: {
      company_name: 'Kumar Enterprises Pvt Ltd',
      pan_number: 'AABCK1234F',
      company_category: 'Private Limited',
      group_code: 'FACT00001',
      franchise_code: ''
    },
    services: {
      GST: { applicable: true, registered: true, reg_number: '36AABCK1234F1Z5' },
      INCOME_TAX: { applicable: true, registered: true, reg_number: 'AABCK1234F' },
      MCA: { applicable: true, registered: true, reg_number: 'U74999TS2020PTC123456' },
      PT: { applicable: true, registered: true, reg_number: 'PT-TS-00456' },
      PF: { applicable: true, registered: true, reg_number: 'APHYD1234567000' },
      ESI: { applicable: true, registered: true, reg_number: '52001234560001' }
    },
    filings: [
      { service_type: 'GST', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'Jun-2025', due_date: '2025-07-20', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'INCOME_TAX', financial_year: '2025-26', period: 'Annual', due_date: '2026-07-31', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'MCA', financial_year: '2025-26', period: 'AOC-4', due_date: '2025-10-30', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'PT', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-15', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'PT', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-15', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'PT', financial_year: '2025-26', period: 'Jun-2025', due_date: '2025-07-15', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'PF', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-15', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'PF', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-15', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'ESI', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-15', filing_status: 'completed', payment_status: 'completed' },
    ]
  },
  {
    email: 'client2@testfactory.com',
    name: 'Priya Sharma',
    company: {
      company_name: 'Priya Sharma (Individual)',
      pan_number: 'BGHPS5678K',
      company_category: 'Individual',
      group_code: 'FACT00002',
      franchise_code: ''
    },
    services: {
      GST: { applicable: true, registered: true, reg_number: '36BGHPS5678K1Z3' },
      INCOME_TAX: { applicable: true, registered: true, reg_number: 'BGHPS5678K' },
      MCA: { applicable: false },
      PT: { applicable: false },
      PF: { applicable: false },
      ESI: { applicable: false }
    },
    filings: [
      { service_type: 'GST', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-20', filing_status: 'nil_filed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'Jun-2025', due_date: '2025-07-20', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'INCOME_TAX', financial_year: '2025-26', period: 'Annual', due_date: '2026-07-31', filing_status: 'pending', payment_status: 'pending' },
    ]
  },
  {
    email: 'client3@testfactory.com',
    name: 'Suresh Reddy',
    company: {
      company_name: 'Reddy & Associates LLP',
      pan_number: 'AAFR2345M',
      company_category: 'LLP',
      group_code: 'FACT00003',
      franchise_code: ''
    },
    services: {
      GST: { applicable: true, registered: true, reg_number: '36AAFR2345M1Z8' },
      INCOME_TAX: { applicable: true, registered: true, reg_number: 'AAFR2345M' },
      MCA: { applicable: true, registered: true, reg_number: 'AAR-1234' },
      PT: { applicable: true, registered: true, reg_number: 'PT-TS-00789' },
      PF: { applicable: false },
      ESI: { applicable: false }
    },
    filings: [
      { service_type: 'GST', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-20', filing_status: 'completed', payment_status: 'pending' },
      { service_type: 'INCOME_TAX', financial_year: '2025-26', period: 'Annual', due_date: '2026-09-30', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'MCA', financial_year: '2025-26', period: 'Form 8', due_date: '2025-10-30', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'PT', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-15', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'PT', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-15', filing_status: 'pending', payment_status: 'pending' },
    ]
  },
  {
    email: 'client4@testfactory.com',
    name: 'Lakshmi Foods',
    company: {
      company_name: 'Lakshmi Foods Partnership',
      pan_number: 'AALFL9012N',
      company_category: 'Partnership',
      group_code: 'FACT00004',
      franchise_code: 'AF0001'
    },
    services: {
      GST: { applicable: true, registered: true, reg_number: '36AALFL9012N1Z1' },
      INCOME_TAX: { applicable: true, registered: true, reg_number: 'AALFL9012N' },
      MCA: { applicable: false },
      PT: { applicable: true, registered: false },
      PF: { applicable: true, registered: true, reg_number: 'APHYD9876543000' },
      ESI: { applicable: true, registered: true, reg_number: '52009876540001' }
    },
    filings: [
      { service_type: 'GST', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-20', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'PF', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-15', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'PF', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-15', filing_status: 'completed', payment_status: 'pending' },
      { service_type: 'ESI', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-15', filing_status: 'completed', payment_status: 'completed' },
    ]
  },
  {
    email: 'client5@testfactory.com',
    name: 'Vijay Tech Solutions',
    company: {
      company_name: 'Vijay Tech Solutions OPC Pvt Ltd',
      pan_number: 'AABCV3456P',
      company_category: 'OPC',
      group_code: 'FACT00005',
      franchise_code: ''
    },
    services: {
      GST: { applicable: true, registered: true, reg_number: '36AABCV3456P1Z7' },
      INCOME_TAX: { applicable: true, registered: true, reg_number: 'AABCV3456P' },
      MCA: { applicable: true, registered: true, reg_number: 'U72200TS2024OPC789012' },
      PT: { applicable: false },
      PF: { applicable: false },
      ESI: { applicable: false }
    },
    filings: [
      { service_type: 'GST', financial_year: '2025-26', period: 'Apr-2025', due_date: '2025-05-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'May-2025', due_date: '2025-06-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'GST', financial_year: '2025-26', period: 'Jun-2025', due_date: '2025-07-20', filing_status: 'completed', payment_status: 'completed' },
      { service_type: 'INCOME_TAX', financial_year: '2025-26', period: 'Annual', due_date: '2026-07-31', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'MCA', financial_year: '2025-26', period: 'AOC-4', due_date: '2025-10-30', filing_status: 'pending', payment_status: 'pending' },
      { service_type: 'MCA', financial_year: '2025-26', period: 'MGT-7A', due_date: '2025-12-30', filing_status: 'pending', payment_status: 'pending' },
    ]
  }
];

async function seedSampleClients() {
  const bcrypt = require('bcryptjs');
  console.log('\\n=== Seeding 5 Sample Clients for Phase 2 Testing ===\\n');

  for (const sample of SAMPLE_CLIENTS) {
    try {
      console.log(`\\n--- Processing: ${sample.name} (${sample.email}) ---`);

      // 1. Create user (client)
      const existingUsers = await db.user.findMany({ where: { email: sample.email } });
      let user;
      if (existingUsers.length > 0) {
        user = existingUsers[0];
        console.log(`  User already exists (id: ${user.id})`);
      } else {
        const hash = await bcrypt.hash('Test@1234', 10);
        user = await db.user.create({
          data: {
            email: sample.email,
            password_hash: hash,
            role: 'client',
            status: 'active',
            name: sample.name,
            must_change_password: false
          }
        });
        console.log(`  Created user (id: ${user.id})`);
      }

      // 2. Create company profile
      const existingProfiles = await db.companyProfile.findMany({ where: { user_id: user.id } });
      if (existingProfiles.length === 0) {
        await db.companyProfile.create({
          data: { user_id: user.id, ...sample.company }
        });
        console.log('  Created company profile');
      } else {
        console.log('  Company profile already exists');
      }

      // 3. Create compliance configs
      for (const [serviceType, cfg] of Object.entries(sample.services)) {
        const existing = await db.complianceConfig.findMany({
          where: { user_id: user.id, service_type: serviceType }
        });
        if (existing.length === 0) {
          await db.complianceConfig.create({
            data: {
              user_id: user.id,
              service_type: serviceType,
              is_applicable: cfg.applicable,
              is_registered: cfg.registered || false,
              registration_number: cfg.reg_number || ''
            }
          });
        }
      }
      console.log('  Created compliance configs');

      // 4. Create filing records
      for (const filing of sample.filings) {
        await db.complianceFiling.create({
          data: {
            user_id: user.id,
            service_type: filing.service_type,
            financial_year: filing.financial_year,
            period: filing.period,
            due_date: filing.due_date ? new Date(filing.due_date).getTime() : null,
            filing_status: filing.filing_status,
            filing_date: filing.filing_status === 'completed' ? Date.now() : null,
            payment_status: filing.payment_status,
            payment_date: filing.payment_status === 'completed' ? Date.now() : null,
            notes: ''
          }
        });
      }
      console.log(`  Created ${sample.filings.length} filing records`);

    } catch (err) {
      console.error(`  ERROR for ${sample.email}:`, err.message);
    }
  }

  console.log('\\n=== Seeding Complete ===');
  console.log('\\nTest login credentials:');
  SAMPLE_CLIENTS.forEach(c => {
    console.log(`  ${c.email} / Test@1234 — ${c.name} (${c.company.company_category})`);
  });
  console.log('\\nService coverage:');
  console.log('  client1 — ALL 6 services (Pvt Ltd)');
  console.log('  client2 — GST + IT only (Individual)');
  console.log('  client3 — GST + IT + MCA + PT (LLP)');
  console.log('  client4 — GST + IT + PT + PF + ESI (Partnership, Franchise AF0001)');
  console.log('  client5 — GST + IT + MCA (OPC)');
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  seedSampleClients()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedSampleClients, SAMPLE_CLIENTS };
