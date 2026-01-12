-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bestService" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "services" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bestService" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "person" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "queryStatus" TEXT,
ADD COLUMN     "services" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "statusEndWeek" TEXT,
ADD COLUMN     "webCategory" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "city" TEXT,
ADD COLUMN     "lastSalesperson" TEXT,
ADD COLUMN     "previousTaskId" TEXT;

-- CreateTable
CREATE TABLE "Lookup" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lookup_type_label_idx" ON "Lookup"("type", "label");
