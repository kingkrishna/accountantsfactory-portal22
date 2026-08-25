const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Testing Prisma Client connection...");
    try {
        await prisma.$connect();
        console.log("✅ Prisma Client connected successfully!");
        const count = await prisma.user.count();
        console.log("User count:", count);
    } catch (err) {
        console.error("❌ Prisma Client failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
