import prisma from '../config/database';

export async function migrateDepartmentRelation() {
  const url = process.env.DATABASE_URL?.trim() || '';
  if (url.startsWith('file:')) {
    console.log('[Migration] SQLite 환경 - student_departments 마이그레이션 스킵');
    return;
  }

  try {
    const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'department_id'
    `);

    if (columns.length > 0) {
      console.log('[Migration] department_id → student_departments 마이그레이션 시작...');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "student_departments" (
          "id" TEXT NOT NULL,
          "student_id" TEXT NOT NULL,
          "department_id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "student_departments_pkey" PRIMARY KEY ("id")
        )
      `);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "student_departments" ("id", "student_id", "department_id")
        SELECT gen_random_uuid()::text, "id", "department_id" 
        FROM "students" 
        WHERE "department_id" IS NOT NULL
        ON CONFLICT DO NOTHING
      `);

      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "student_departments_student_id_department_id_key" ON "student_departments"("student_id", "department_id")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "student_departments_student_id_idx" ON "student_departments"("student_id")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "student_departments_department_id_idx" ON "student_departments"("department_id")`);

      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "student_departments" ADD CONSTRAINT "student_departments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
      } catch (_) {}
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "student_departments" ADD CONSTRAINT "student_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
      } catch (_) {}

      await prisma.$executeRawUnsafe(`ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_department_id_fkey"`);
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "students_department_id_idx"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "students" DROP COLUMN IF EXISTS "department_id"`);

      console.log('[Migration] department_id 마이그레이션 완료');
    } else {
      const tables: any[] = await prisma.$queryRawUnsafe(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'student_departments'
      `);

      if (tables.length === 0) {
        console.log('[Migration] student_departments 테이블 생성...');
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "student_departments" (
            "id" TEXT NOT NULL,
            "student_id" TEXT NOT NULL,
            "department_id" TEXT NOT NULL,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "student_departments_pkey" PRIMARY KEY ("id")
          )
        `);
        await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "student_departments_student_id_department_id_key" ON "student_departments"("student_id", "department_id")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX "student_departments_student_id_idx" ON "student_departments"("student_id")`);
        await prisma.$executeRawUnsafe(`CREATE INDEX "student_departments_department_id_idx" ON "student_departments"("department_id")`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "student_departments" ADD CONSTRAINT "student_departments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "student_departments" ADD CONSTRAINT "student_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        console.log('[Migration] student_departments 테이블 생성 완료');
      }
    }
  } catch (error: any) {
    console.error('[Migration] 부서 마이그레이션 오류:', error.message);
  }
}
