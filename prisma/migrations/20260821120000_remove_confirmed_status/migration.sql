-- Convert any remaining CONFIRMED appointments back to SCHEDULED
UPDATE appointments SET status = 'SCHEDULED' WHERE status = 'CONFIRMED';
