const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function f() {
  const count = await p.user.count();
  console.log('User count:', count);
  await p.$disconnect();
}
f().catch(e => {
  console.error('ERROR', e.message);
  process.exit(1);
});
