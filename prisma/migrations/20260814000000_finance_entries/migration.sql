-- Drop obsolete cash register tables (replaced by finance_entries)
DROP TABLE IF EXISTS "cash_register_movements";
DROP TABLE IF EXISTS "cash_registers";

-- Create finance_entries
CREATE TABLE "finance_entries" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_entries_barbershopId_idx" ON "finance_entries"("barbershopId");
CREATE INDEX "finance_entries_appointmentId_idx" ON "finance_entries"("appointmentId");

ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "barbershops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Working hours per barber
ALTER TABLE "working_hours" ADD COLUMN "barberId" TEXT;
CREATE UNIQUE INDEX "working_hours_barbershopId_barberId_dayOfWeek_key" ON "working_hours"("barbershopId", "barberId", "dayOfWeek");
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
