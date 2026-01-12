/*
  Warnings:

  - A unique constraint covering the columns `[externalRef]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalRef]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalRef]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "TaskList" ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_externalRef_key" ON "Account"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalRef_key" ON "Lead"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "Task_externalRef_key" ON "Task"("externalRef");
