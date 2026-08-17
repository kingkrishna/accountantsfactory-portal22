const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Setting up default users...');

    // 1. Admin setup
    const adminEmail = 'admin@accountantsfactory.com';
    const adminPassword = 'Admin@123!';
    const adminHash = await bcrypt.hash(adminPassword, 10);

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: { password_hash: adminHash, role: 'admin', status: 'active' },
        create: { email: adminEmail, password_hash: adminHash, role: 'admin', status: 'active' }
    });
    console.log('✔ Admin user updated/created');

    // 2. Employee setup
    const employeeEmail = 'employee@accountantsfactory.com';
    const employeePassword = 'Employee@123!';
    const employeeHash = await bcrypt.hash(employeePassword, 10);

    await prisma.user.upsert({
        where: { email: employeeEmail },
        update: { password_hash: employeeHash, role: 'employee', status: 'active' },
        create: { email: employeeEmail, password_hash: employeeHash, role: 'employee', status: 'active' }
    });
    console.log('✔ Employee user updated/created');

    console.log('Done.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
