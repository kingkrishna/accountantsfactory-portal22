const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAdmin() {
    try {
        const adminExists = await prisma.user.findUnique({
            where: { email: 'admin@accountantsfactory.com' }
        });

        if (!adminExists) {
            await prisma.user.create({
                data: {
                    email: 'admin@accountantsfactory.com',
                    password_hash: 'temporarily_unhashed',
                    role: 'admin',
                    status: 'active'
                }
            });
            console.log("✅ Admin specifically created inside MongoDB using Prisma!");
        } else {
            console.log("✅ Admin already exists in MongoDB!");
        }

        // Test count
        const cnt = await prisma.user.count();
        console.log(`Current users in DB: ${cnt}`);
    } catch (err) {
        console.error("❌ " + err.message);
    } finally {
        await prisma.$disconnect();
    }
}
addAdmin();
