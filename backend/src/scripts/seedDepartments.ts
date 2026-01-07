import prisma from '../config/database';

async function seedDepartments() {
  const departments = [
    { name: '전례부', description: '예배 전례를 담당하는 부서' },
    { name: '성가대', description: '예배 찬양을 담당하는 부서' },
    { name: '복음퀴즈부', description: '복음 퀴즈 활동을 하는 부서' },
    { name: '율동부', description: '예배 율동을 담당하는 부서' },
  ];

  console.log('초기 부서 데이터 설정 시작...');

  for (const dept of departments) {
    try {
      const existing = await prisma.department.findUnique({
        where: { name: dept.name },
      });

      if (existing) {
        console.log(`⏭️  부서 이미 존재: ${dept.name}`);
      } else {
        await prisma.department.create({
          data: dept,
        });
        console.log(`✅ 부서 생성: ${dept.name}`);
      }
    } catch (error) {
      console.error(`❌ 부서 생성 실패 (${dept.name}):`, error);
    }
  }

  console.log('초기 부서 데이터 설정 완료');
}

// 실행
seedDepartments()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('초기 데이터 설정 실패:', error);
    await prisma.$disconnect();
    process.exit(1);
  });


