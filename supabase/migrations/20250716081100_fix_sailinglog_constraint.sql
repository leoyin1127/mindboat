-- Remove the foreign key constraint from SailingLog to goal table
-- This allows users to have sailing sessions without requiring a goal entry
ALTER TABLE "public"."SailingLog" DROP CONSTRAINT IF EXISTS "SailingLog_user_id_fkey";

-- The SailingLog table should reference the auth.users table instead
-- But since we're using UUIDs and this is managed by Supabase auth, 
-- we'll just remove the constraint entirely for now