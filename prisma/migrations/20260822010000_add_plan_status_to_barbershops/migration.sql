-- AlterTable: Adicionar campos de plano e status na tabela barbershops
ALTER TABLE "barbershops" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "barbershops" ADD COLUMN "plan" VARCHAR(10) NOT NULL DEFAULT 'BASIC';
ALTER TABLE "barbershops" ADD COLUMN "trial_ends_at" TIMESTAMPTZ;
ALTER TABLE "barbershops" ADD COLUMN "override_marketing_module" BOOLEAN;

-- Backfill: barbers existentes ficam BASIC/ACTIVE (sem trial, já passaram do período)
UPDATE "barbershops" SET "status" = 'ACTIVE', "plan" = 'BASIC' WHERE "status" = 'TRIAL';
