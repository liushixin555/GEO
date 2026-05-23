import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  let company = await prisma.company.findFirst({ where: { shortName: 'DEFAULT' } });

  if (!company) {
    company = await prisma.company.create({
      data: {
        shortName: 'DEFAULT',
        fullName: 'Default Company',
        contactPerson: 'System',
        contactPhone: '0000000000',
      },
    });
  }

  const passwordHash = await bcrypt.hash('sysadmin123', 10);

  const existingAdmin = await prisma.user.findFirst({ where: { username: 'sysadmin' } });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash },
    });
    console.log('sysadmin password reset.');
  } else {
    await prisma.user.create({
      data: {
        username: 'sysadmin',
        passwordHash,
        cnName: '系统管理员',
        role: 'sysadmin',
        companyId: company.id,
      },
    });
    console.log('sysadmin user created.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
