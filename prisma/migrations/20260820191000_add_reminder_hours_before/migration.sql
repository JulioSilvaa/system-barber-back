-- Add reminderHoursBefore column to barbershops
ALTER TABLE "barbershops" ADD COLUMN "reminderHoursBefore" INTEGER NOT NULL DEFAULT 24;
