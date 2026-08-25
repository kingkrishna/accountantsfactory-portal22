const prisma = require('../src/models/prismaClient');
require('dotenv').config();

async function fixEmployeeRole() {
    const updated = await prisma.user.update({
        where: { email: 'employee@accountantsfactory.com' },
        data: { role: 'employee' }
    });
    console.log('✅ Updated role to employee for:', updated.email);
    await prisma.$disconnect();
}

fixEmployeeRole().catch(console.error);
