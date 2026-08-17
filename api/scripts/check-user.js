const prisma = require('../src/models/prismaClient');

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'vijayawada@accountantsfactory.com' } });
  console.log(user);
}

check().catch(e => console.error(e));
