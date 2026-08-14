-- Drop the barbershop-level unique constraint that blocked storing
-- per-barber working hours for the same weekday.
DROP INDEX IF EXISTS "working_hours_barbershopId_dayOfWeek_key";
