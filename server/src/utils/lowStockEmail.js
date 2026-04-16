const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let transporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || ''
      }
    });
  }
  return transporter;
}

/**
 * Fire-and-forget low stock alert to restaurant owner (or INVENTORY_ALERT_EMAIL).
 * @param {{ id: string, name: string, tenantId?: string }} restaurant
 * @param {{ id: string, name: string, unit: string, currentStock: number, minStockAlert: number }[]} ingredients
 */
async function sendLowStockAlert(restaurant, ingredients) {
  try {
    if (!ingredients?.length || !restaurant?.id) return;

    const transport = getTransporter();
    if (!transport) {
      console.info('[inventory] Low stock (email skipped — set SMTP_HOST, SMTP_USER):', restaurant.name, ingredients.map((i) => i.name));
      return;
    }

    let to = process.env.INVENTORY_ALERT_EMAIL;
    if (!to) {
      const owner = await prisma.user.findUnique({
        where: { id: restaurant.ownerId },
        select: { email: true }
      });
      to = owner?.email;
    }
    if (!to) return;

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const lines = ingredients
      .map(
        (i) =>
          `• ${i.name}: ${i.currentStock} ${i.unit} (alert ≤ ${i.minStockAlert} ${i.unit})`
      )
      .join('\n');

    await transport.sendMail({
      from,
      to,
      subject: `[ReserveTable] Low stock — ${restaurant.name}`,
      text: `The following ingredients are at or below minimum stock for ${restaurant.name}:\n\n${lines}\n\n— ReserveTable Inventory`
    });
  } catch (e) {
    console.error('[inventory] Low stock email failed:', e.message);
  }
}

module.exports = { sendLowStockAlert };
