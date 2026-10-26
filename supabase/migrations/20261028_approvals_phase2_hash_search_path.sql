-- Follow-up to 20261027_approvals_phase2.sql: pin the search_path of brief_content_hash, as the Supabase advisor asks.
-- It only uses built-in functions (sha256, convert_to, encode), so an empty search_path changes nothing about what it returns.
alter function public.brief_content_hash(jsonb) set search_path = '';
