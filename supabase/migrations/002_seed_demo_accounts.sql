-- Phase 1: the three demo accounts (GP, LP, Portfolio Co.).
--
-- Replace :password below before running. The real value is not committed —
-- these logins are handed out during demos, so treat them as disposable and
-- rotate them from the dashboard whenever needed.
--
-- Note: crypt() and gen_salt() MUST be schema-qualified as extensions.crypt /
-- extensions.gen_salt. Unqualified calls are not on the SQL editor's
-- search_path and the insert silently affects zero rows while still reporting
-- "Success" — which is how the first attempt at this appeared to work but
-- created nothing.

create extension if not exists pgcrypto with schema extensions;

-- 1. Auth users. Pre-confirmed, since no mail is delivered for these.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  t.email,
  extensions.crypt(:'password', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false, false
from (values
  ('gp@clavio.app'),
  ('lp@clavio.app'),
  ('submit@clavio.app')
) as t(email)
where not exists (select 1 from auth.users u where u.email = t.email);

-- 2. Email identities. Without these, signInWithPassword fails.
insert into auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object(
    'sub', u.id::text, 'email', u.email,
    'email_verified', true, 'phone_verified', false
  ),
  'email', now(), now(), now()
from auth.users u
where u.email in ('gp@clavio.app', 'lp@clavio.app', 'submit@clavio.app')
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- 3. Roles. This is what middleware reads to decide where each user lands.
insert into public.profiles (id, role, full_name)
select
  u.id,
  case u.email
    when 'gp@clavio.app' then 'gp'
    when 'lp@clavio.app' then 'lp'
    else 'submit'
  end,
  case u.email
    when 'gp@clavio.app' then 'Partner'
    when 'lp@clavio.app' then 'Investor'
    else 'Portfolio Co.'
  end
from auth.users u
where u.email in ('gp@clavio.app', 'lp@clavio.app', 'submit@clavio.app')
  and not exists (select 1 from public.profiles p where p.id = u.id);
