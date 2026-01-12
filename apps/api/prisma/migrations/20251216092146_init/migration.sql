-- DropIndex
DROP INDEX "Account_externalRef_key";

-- DropIndex
DROP INDEX "Lead_externalRef_key";

-- DropIndex
DROP INDEX "Task_externalRef_key";

-- CreateIndex
CREATE INDEX "Account_externalRef_idx" ON "Account"("externalRef");

-- CreateIndex
CREATE INDEX "Lead_externalRef_idx" ON "Lead"("externalRef");

-- CreateIndex
CREATE INDEX "Task_externalRef_idx" ON "Task"("externalRef");
