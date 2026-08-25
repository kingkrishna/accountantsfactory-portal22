const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        // Check services
        const services = await p.service.findMany({
            where: { is_active: true },
            select: { id: true, name: true, is_active: true }
        });
        console.log('Active services:', services.length);
        services.forEach(s => console.log(`  - ${s.name} (active: ${s.is_active})`));

        // Check all services regardless of status
        const allServices = await p.service.findMany();
        console.log('\nAll services:', allServices.length);
        allServices.forEach(s => console.log(`  - ${s.name} (active: ${s.is_active})`));

        // Check first client's orders
        const firstClient = await p.user.findFirst({ where: { email: 'dilips519@gmail.com' } });
        if (firstClient) {
            console.log('\nClient:', firstClient.email, 'id:', firstClient.id);
            const orders = await p.serviceOrder.findMany({
                where: { user_id: firstClient.id },
                include: { service: { select: { name: true } } }
            });
            console.log('Orders for this client:', orders.length);
            orders.forEach(o => console.log(`  - ${o.service.name} | ${o.period} | ${o.status}`));
        }

        // Check which clients have orders
        const clientsWithOrders = await p.serviceOrder.findMany({
            select: { user: { select: { email: true } } },
            distinct: ['user_id']
        });
        console.log('\nClients with orders:', clientsWithOrders.map(o => o.user.email));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await p.$disconnect();
    }
})();
