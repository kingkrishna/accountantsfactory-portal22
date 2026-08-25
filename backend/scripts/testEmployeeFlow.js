const prisma = require('../src/models/prismaClient');
const bcrypt = require('bcryptjs');

async function testEmployeeFlow() {
    console.log('Testing Employee Flow...');
    try {
        // 1. Create a dummy service
        const service = await prisma.service.findFirst() || await prisma.service.create({
            data: { name: 'Test Service', description: 'Testing' }
        });

        // 2. Create a client
        const clientEmail = 'client_test_emp@example.com';
        let client = await prisma.user.findUnique({ where: { email: clientEmail } });
        if (!client) {
            client = await prisma.user.create({
                data: {
                    email: clientEmail,
                    password_hash: await bcrypt.hash('Pass123!', 10),
                    role: 'client'
                }
            });
        }

        // 3. Create a service order
        const order = await prisma.serviceOrder.create({
            data: {
                user_id: client.id,
                service_id: service.id,
                status: 'pending'
            }
        });

        // 4. Create an employee
        const empEmail = 'employee_test@example.com';
        let employee = await prisma.user.findUnique({ where: { email: empEmail } });
        if (!employee) {
            employee = await prisma.user.create({
                data: {
                    email: empEmail,
                    password_hash: await bcrypt.hash('Pass123!', 10),
                    role: 'employee'
                }
            });
        }

        console.log(`✅ Employee Created: ${employee.email}`);

        // 5. Assign employee to order (Admin action simulation)
        await prisma.serviceOrder.update({
            where: { id: order.id },
            data: { employee_id: employee.id }
        });

        console.log(`✅ Order ${order.id} assigned to ${employee.email}`);

        // 6. Employee submits an EOD update
        const update = await prisma.workUpdate.create({
            data: {
                service_order_id: order.id,
                employee_id: employee.id,
                status: 'ongoing',
                comments: 'Started working on the documents.'
            }
        });

        // Also simulate mapping status
        await prisma.serviceOrder.update({
            where: { id: order.id },
            data: { status: 'in_progress' }
        });

        console.log(`✅ EOD Update logged: ${update.status} - ${update.comments}`);

        // 7. Verify Employee Dashboard
        const dashboard = await prisma.serviceOrder.findMany({
            where: { employee_id: employee.id },
            include: {
                workUpdates: { orderBy: { date: 'desc' }, take: 1 }
            }
        });

        if (dashboard.length > 0 && dashboard[0].workUpdates.length > 0) {
            console.log(`✅ Dashboard fetches assigned orders with latest status successfully!`);
        } else {
            throw new Error('Dashboard verification failed');
        }

        console.log('\nAll Employee Flow tests passed successfully! 🎉');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testEmployeeFlow();
