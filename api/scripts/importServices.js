const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const services = [
    "Virtual CFO Services",
    "Start-up India Registration",
    "LLP Registration",
    "One Person Company Registration",
    "Partnership Firm Registrations",
    "Private Limited Company Registration",
    "GST Registrations",
    "GST Filing",
    "New GST Rates",
    "Income Tax Calculation",
    "ITR Filing",
    "ITR-1",
    "ITR-2",
    "ITR-3",
    "ITR-4",
    "ITR-5",
    "ITR-6",
    "ITR-7",
    "TDS Return Filing",
    "Provident Fund",
    "ESIC",
    "RERA Andhra Pradesh Registration",
    "IEC Registration",
    "MSME Registrations",
    "Form 11 (LLP)",
    "Form 8 (LLP)",
    "AOC-4 & MGT-7"
];

async function main() {
    console.log(`Starting to import ${services.length} services...`);

    let count = 0;
    for (const name of services) {
        // Check if service already exists
        const exists = await prisma.service.findFirst({
            where: { name }
        });

        if (!exists) {
            await prisma.service.create({
                data: {
                    name: name,
                    description: name,
                    is_active: true
                }
            });
            console.log(`\u2714 Created: ${name}`);
            count++;
        } else {
            console.log(`\u2014 Skipped (already exists): ${name}`);
        }
    }

    console.log(`\nImport complete! Added ${count} new services to the database.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
