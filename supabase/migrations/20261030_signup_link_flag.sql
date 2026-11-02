-- Whether the sign-in page offers "Don't have an account? Sign up".
--
-- The sign-in page is shown before anyone is signed in, and team settings are readable only by signed-in team members,
-- so the page cannot read the switch from them. This returns just that one flag, nothing else from settings.
-- It hides the link only; it does not turn sign-ups off (that is Authentication → Sign In / Providers in Supabase).
--
-- true when the team has never set it, so the link stays until someone switches it off.

create or replace function public.show_signup_link()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (s.data ->> 'showSignUpLink')::boolean
       from public.settings s
      order by s.updated_at desc
      limit 1),
    true
  )
$$;

revoke all on function public.show_signup_link() from public;
grant execute on function public.show_signup_link() to anon, authenticated;
