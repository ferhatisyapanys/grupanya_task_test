-- AlterTable
ALTER TABLE "Lookup" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "Lookup" ADD CONSTRAINT "Lookup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
