const prisma = require('../src/models/prismaClient');
require('dotenv').config();

async function setupDatabase() {
  console.log('🔌 Connecting to database via Prisma...\n');
  try {
    const existingServices = await prisma.service.count();
    if (existingServices > 0) {
      console.log(`⚠️  ${existingServices} services already exist. Skipping seed.`);
      console.log('✅ Database setup complete!\n');
      return;
    }

    console.log('📄 Seeding default services...\n');

    const defaultServices = [
      { name: 'GST Registration', description: 'GST registration and compliance', is_active: true },
      { name: 'GST Returns (Monthly / Quarterly)', description: 'GST return filing', is_active: true },
      { name: 'Income Tax Filing', description: 'ITR filing and tax compliance', is_active: true },
      { name: 'Company / LLP Registration', description: 'Company and LLP registration', is_active: true },
      { name: 'PF & ESI Compliance', description: 'Provident Fund and ESIC compliance', is_active: true },
      { name: 'ROC Filings', description: 'Registrar of Companies filings', is_active: true },
      { name: 'Bookkeeping', description: 'Monthly bookkeeping services', is_active: true },
      { name: 'Tax Consultation', description: 'Tax planning and consultation', is_active: true },
      { name: 'Audit Support', description: 'Audit preparation and support', is_active: true },
      { name: 'Compliance Services', description: 'Regulatory compliance services', is_active: true }
    ];

    await prisma.service.createMany({ data: defaultServices });

    console.log(`✅ Created ${defaultServices.length} services:`);
    defaultServices.forEach(service => console.log(`   - ${service.name}`));
    console.log('\n✅ Database setup complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Connection closed\n');
  }
}

setupDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
