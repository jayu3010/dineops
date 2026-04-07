const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting seed...');
    const r = await prisma.restaurant.findFirst({ where: { name: 'Petpooja Copy Restaurant' } });
    if (!r) {
      console.log('Restaurant not found');
      return;
    }
    const count = await prisma.table.count({ where: { restaurantId: r.id } });
    console.log('Current count:', count);
    if (count < 20) {
      for (let i = 1; i <= 20; i++) {
        await prisma.table.create({
          data: {
            restaurantId: r.id,
            tableNumber: 'T' + i,
            capacity: 4,
            status: 'AVAILABLE',
            x: (i - 1) % 5 * 150 + 50,
            y: Math.floor((i - 1) / 5) * 150 + 50
          }
        });
      }
      console.log('Seeded 20 tables successfully using loop');
    } else {
      console.log('Tables already exist');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
