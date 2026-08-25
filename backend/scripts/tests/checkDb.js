const prisma = require('./src/models/prismaClient');
require('dotenv').config();

async function main() {
    const totalUsers = await prisma.user.count();
    const clients = await prisma.user.count({ where: { role: 'client' } });
    const employees = await prisma.user.count({ where: { role: 'employee' } });
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    const services = await prisma.service.count();
    const orders = await prisma.serviceOrder.count();

    console.log('=== DATABASE STATUS ===');
    console.log('Total users:', totalUsers);
    console.log('  - Admins:   ', admins);
    console.log('  - Employees:', employees);
    console.log('  - Clients:  ', clients);
    console.log('Services:', services);
    console.log('Service Orders:', orders);

    // Show first 5 clients
    const sampleClients = await prisma.user.findMany({
        where: { role: 'client' },
        take: 5,
        select: { id: true, email: true, status: true }
    });
    console.log('\nSample clients:', JSON.stringify(sampleClients, null, 2));

    await prisma.$disconnect();
}

main().catch(console.error);
