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

  // Seed sample skills
  const skillCount = await prisma.skills.count();
  if (skillCount === 0) {
    await prisma.skills.createMany({
      data: [
        { name: 'TypeScript', category: '编程语言', description: 'JavaScript 超集', companyId: company.id },
        { name: 'React', category: '框架', description: 'UI 框架', companyId: company.id },
        { name: 'Node.js', category: '运行时', description: '服务端 JavaScript', companyId: company.id },
        { name: 'PostgreSQL', category: '数据库', description: '关系型数据库', companyId: company.id },
        { name: 'Docker', category: '运维', description: '容器化部署', companyId: company.id },
      ],
    });
    console.log('Sample skills created.');
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
