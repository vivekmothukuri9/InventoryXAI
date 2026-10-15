-- Add role column to dealers table
ALTER TABLE public.dealers
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'dealer';

-- Update any existing records to ensure they have the 'dealer' role
UPDATE public.dealers SET role = 'dealer' WHERE role IS NULL;

-- Make role not null for future records
ALTER TABLE public.dealers
ALTER COLUMN role SET NOT NULL;
