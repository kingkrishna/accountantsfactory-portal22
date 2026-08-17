const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { email: true, role: true, status: true }
    });
    const employeeUser = await prisma.user.findFirst({
        where: { role: 'employee' },
        select: { email: true, role: true, status: true }
    });
    fs.writeFileSync('out.json', JSON.stringify({ admin: adminUser, emp: employeeUser }, null, 2));
}
main().finally(() => prisma.$disconnect());
