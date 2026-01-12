-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "mainCategory" TEXT,
ADD COLUMN     "subCategory" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "mainCategory" TEXT,
ADD COLUMN     "subCategory" TEXT;

-- CreateTable
CREATE TABLE "CategoryMain" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryMain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySub" (
    "id" TEXT NOT NULL,
    "mainId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategorySub_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMain_label_key" ON "CategoryMain"("label");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySub_mainId_label_key" ON "CategorySub"("mainId", "label");

-- AddForeignKey
ALTER TABLE "CategorySub" ADD CONSTRAINT "CategorySub_mainId_fkey" FOREIGN KEY ("mainId") REFERENCES "CategoryMain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
