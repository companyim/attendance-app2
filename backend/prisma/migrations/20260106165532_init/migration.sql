-- CreateTable
CREATE TABLE "admin_auth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "department_id" TEXT,
    "name" TEXT NOT NULL,
    "baptism_name" TEXT,
    "student_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "grade" TEXT NOT NULL DEFAULT '1학년',
    "talent" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "students_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "talent_given" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "talent_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "attendance_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "talent_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "talent_transactions_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE INDEX "students_department_id_idx" ON "students"("department_id");

-- CreateIndex
CREATE INDEX "students_grade_idx" ON "students"("grade");

-- CreateIndex
CREATE INDEX "students_name_idx" ON "students"("name");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE INDEX "attendance_student_id_date_idx" ON "attendance"("student_id", "date");

-- CreateIndex
CREATE INDEX "attendance_department_id_date_idx" ON "attendance"("department_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_student_id_date_department_id_key" ON "attendance"("student_id", "date", "department_id");

-- CreateIndex
CREATE INDEX "talent_transactions_student_id_idx" ON "talent_transactions"("student_id");

-- CreateIndex
CREATE INDEX "talent_transactions_created_at_idx" ON "talent_transactions"("created_at" DESC);
