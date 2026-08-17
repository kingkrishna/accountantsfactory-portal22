const prisma = require('../models/prismaClient');
const { validateObjectId, parseIntSafe } = require('../utils/validation');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseIntSafe(req.query.page, 1, 1, 10000);
        const limit = parseIntSafe(req.query.limit, 20, 1, 100);
        const skip = (page - 1) * limit;

        const assignedOrders = await prisma.serviceOrder.findMany({
            where: { employee_id: userId },
            include: {
                user: { select: { email: true, id: true } },
                service: { select: { name: true } },
                workUpdates: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        const total = await prisma.serviceOrder.count({ where: { employee_id: userId } });

        res.json({
            success: true,
            orders: assignedOrders.map(o => ({
                id: o.id,
                client_id: o.user.id,
                client_email: o.user.email,
                service_name: o.service.name,
                status: o.status,
                period: o.period,
                created_at: o.createdAt,
                latest_update: o.workUpdates[0] || null
            })),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Employee dashboard error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.submitEODUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;
        const { status, comments } = req.body;

        const idValidation = validateObjectId(orderId, 'Order ID');
        if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

        if (!['pending', 'ongoing', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be pending, ongoing, or completed.' });
        }

        const order = await prisma.serviceOrder.findFirst({
            where: { id: idValidation.id, employee_id: userId }
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });

        await prisma.$transaction(async (tx) => {
            // 1. Create the EOD log
            const workUpdate = await tx.workUpdate.create({
                data: {
                    service_order_id: idValidation.id,
                    employee_id: userId,
                    status,
                    comments: comments ? String(comments).trim() : ""
                }
            });

            // 2. Map their EOD status to the actual ServiceOrder status if applicable
            // ongoing -> in_progress
            let mappedStatus = order.status;
            if (status === 'ongoing') mappedStatus = 'in_progress';
            else if (status === 'completed') mappedStatus = 'completed';
            else mappedStatus = 'pending';

            // 3. Update the main order status
            // (Don't set updatedAt manually — Catalyst auto-manages MODIFIEDTIME)
            await tx.serviceOrder.update({
                where: { id: idValidation.id },
                data: { status: mappedStatus }
            });
        });

        res.json({ success: true, message: 'Work status updated successfully' });
    } catch (error) {
        console.error('Submit EOD update error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getEODUpdates = async (req, res) => {
    try {
        const { orderId } = req.params;

        const idValidation = validateObjectId(orderId, 'Order ID');
        if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

        // Validating permissions: the employee must be assigned.
        const order = await prisma.serviceOrder.findFirst({
            where: { id: idValidation.id, employee_id: req.user.id }
        });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found or not assigned' });

        const updates = await prisma.workUpdate.findMany({
            where: { service_order_id: idValidation.id },
            orderBy: { date: 'desc' }
        });

        res.json({ success: true, updates });
    } catch (error) {
        console.error('Get EOD updates error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
