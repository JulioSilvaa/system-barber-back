-- Etapa A — Financeiro (RF-70 a RF-73, RF-84)
-- AlterTable
ALTER TABLE "user_barbershops" ADD COLUMN "commissionRate" INTEGER;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "pricePaidCents" INTEGER,
ADD COLUMN "paymentMethod" TEXT;

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "serviceValueCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commissions_barbershopId_idx" ON "commissions"("barbershopId");
CREATE INDEX "commissions_barberId_idx" ON "commissions"("barberId");
CREATE INDEX "commissions_appointmentId_idx" ON "commissions"("appointmentId");

-- CreateTable
CREATE TABLE "cash_registers" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "openedKey" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingAmountCents" INTEGER NOT NULL DEFAULT 0,
    "closedAt" TIMESTAMP(3),
    "closingAmountCents" INTEGER,
    "expectedAmountCents" INTEGER,
    "differenceCents" INTEGER,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_registers_barbershopId_openedKey_key" ON "cash_registers"("barbershopId", "openedKey");
CREATE INDEX "cash_registers_barbershopId_status_idx" ON "cash_registers"("barbershopId", "status");

-- CreateTable
CREATE TABLE "cash_register_movements" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_register_movements_cashRegisterId_idx" ON "cash_register_movements"("cashRegisterId");
CREATE INDEX "cash_register_movements_appointmentId_idx" ON "cash_register_movements"("appointmentId");

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_appointmentId_key" ON "evaluations"("appointmentId");
CREATE INDEX "evaluations_barbershopId_idx" ON "evaluations"("barbershopId");
CREATE INDEX "evaluations_barberId_idx" ON "evaluations"("barberId");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_register_movements" ADD CONSTRAINT "cash_register_movements_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;