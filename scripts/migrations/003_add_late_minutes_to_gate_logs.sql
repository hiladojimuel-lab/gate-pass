-- Add late_minutes column to gate_logs to track minutes late for entries
ALTER TABLE gate_logs
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;


