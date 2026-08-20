-- Performance indexes for common query patterns
CREATE INDEX "idx_appointment_barbershop_status" ON "appointments"("barbershopId", "status");
CREATE INDEX "idx_commission_barbershop_created" ON "commissions"("barbershopId", "createdAt");
