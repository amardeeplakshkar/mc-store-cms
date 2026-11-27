import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL ?? 'owner@business.com';
  const password = process.env.SUPERADMIN_PASSWORD ?? 'change-me';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { isSuperAdmin: true },
    create: { email, passwordHash, name: 'Platform Owner', isSuperAdmin: true },
  });

  await prisma.globalConfig.upsert({
    where: { key: 'defaultCommissionPercent' },
    update: {},
    create: { key: 'defaultCommissionPercent', value: 5 },
  });

  await prisma.globalConfig.upsert({
    where: { key: 'reservedSlugs' },
    update: {},
    create: { key: 'reservedSlugs', value: ['billing', 'dashboard', 'login', 'signup', 'docs', 'blog', 'store', 'shop', 'business'] },
  });

  // Demo store
  const store = await prisma.store.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo SMP',
      description: 'A demo Minecraft store',
      serverName: 'Demo SMP',
      serverIp: 'play.demo.net',
      members: { create: { adminId: admin.id, role: 'OWNER' } },
      payment: { create: { upiId: 'demo@upi', upiPayeeName: 'Demo SMP', instructions: 'Pay the exact amount and submit your UTR.' } },
      categories: { create: [{ name: 'Ranks', type: 'RANK' }, { name: 'Crates', type: 'CRATE' }] },
    },
    include: { categories: true },
  });

  const ranks = store.categories.find((c) => c.type === 'RANK');
  if (ranks && (await prisma.package.count({ where: { storeId: store.id } })) === 0) {
    await prisma.package.create({
      data: {
        storeId: store.id,
        categoryId: ranks.id,
        name: 'VIP',
        description: 'VIP rank with /fly and kit',
        pricePaise: 19900,
        durationType: 'MONTHLY',
        commands: ['lp user {username} parent add vip'],
        expiryCommands: ['lp user {username} parent remove vip'],
      },
    });
  }
  console.log(`Seeded super admin ${email} and demo store`);
}

main().finally(() => prisma.$disconnect());
