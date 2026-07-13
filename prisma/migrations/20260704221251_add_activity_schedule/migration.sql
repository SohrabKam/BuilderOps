-- CreateTable
CREATE TABLE "activity_schedule_lines" (
    "id" TEXT NOT NULL,
    "subcontractOrderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "itemRef" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contractValue" DECIMAL(14,2) NOT NULL,
    "isVariation" BOOLEAN NOT NULL DEFAULT false,
    "variationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_schedule_lines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activity_schedule_lines" ADD CONSTRAINT "activity_schedule_lines_subcontractOrderId_fkey" FOREIGN KEY ("subcontractOrderId") REFERENCES "subcontract_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
