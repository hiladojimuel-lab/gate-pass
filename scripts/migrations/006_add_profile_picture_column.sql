-- Add profile_picture column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add comment to the column
COMMENT ON COLUMN students.profile_picture IS 'Base64 encoded profile picture or file path to profile picture';
