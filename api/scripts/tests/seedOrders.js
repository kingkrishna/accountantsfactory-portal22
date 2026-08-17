const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        // Get some clients and services
        const clients = await p.user.findMany({ where: { role: 'client', status: 'active' }, take: 10, select: { id: true, email: true } });
        const services = await p.service.findMany({ where: { is_active: true }, select: { id: true, name: true } });
        const employees = await p.user.findMany({ where: { role: 'employee' }, take: 3, select: { id: true, email: true } });

        console.log(`Found: ${clients.length} clients, ${services.length} services, ${employees.length} employees`);

        if (clients.length === 0 || services.length === 0) {
            console.log('No clients or services found. Cannot seed orders.');
            return;
        }

        // Create 15 sample service orders with different statuses
        const statuses = ['pending', 'in_progress', 'completed'];
        const periods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'FY 2023-24', 'FY 2024-25', 'Jan 2024', 'Feb 2024', 'Mar 2024'];

        const orders = [];
        for (let i = 0; i < 15; i++) {
            const client = clients[i % clients.length];
            const service = services[i % services.length];
            const status = statuses[i % statuses.length];
            const period = periods[i % periods.length];
            const employee = employees.length > 0 ? employees[i % employees.length] : null;

            orders.push({
                user_id: client.id,
                service_id: service.id,
                period: period,
                status: status,
                employee_id: (status !== 'pending' && employee) ? employee.id : null,
            });
        }

        let created = 0;
        for (const order of orders) {
            await p.serviceOrder.create({ data: order });
            created++;
        }

        console.log(`\n✅ Created ${created} service orders!`);

        // Show summary
        const total = await p.serviceOrder.count();
        const pending = await p.serviceOrder.count({ where: { status: 'pending' } });
        const inProgress = await p.serviceOrder.count({ where: { status: 'in_progress' } });
        const completed = await p.serviceOrder.count({ where: { status: 'completed' } });

        console.log(`\nOrder Summary:`);
        console.log(`  Total: ${total}`);
        console.log(`  Pending: ${pending}`);
        console.log(`  In Progress: ${inProgress}`);
        console.log(`  Completed: ${completed}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await p.$disconnect();
    }
})();
