-- Create gate_logs table
CREATE TABLE IF NOT EXISTS gate_logs (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  access_type VARCHAR(10) NOT NULL CHECK (access_type IN ('entry', 'exit')),
  access_status VARCHAR(10) NOT NULL CHECK (access_status IN ('granted', 'denied')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- Create index on student_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_gate_logs_student_id ON gate_logs(student_id);

-- Create index on timestamp for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_gate_logs_timestamp ON gate_logs(timestamp);

-- Create composite index for student_id and timestamp
CREATE INDEX IF NOT EXISTS idx_gate_logs_student_timestamp ON gate_logs(student_id, timestamp);
