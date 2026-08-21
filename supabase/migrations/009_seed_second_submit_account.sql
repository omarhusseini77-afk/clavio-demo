-- A second portfolio-company login, pointed at Atelier Saint-Pierre.
--
-- Why a second account rather than repointing submit@clavio.app: Marlow &
-- Reed's series fires nothing, and that silence is worth demonstrating. Most
-- quarters at a healthy company should be quiet — a surface that always has
-- something to say trains the CFO to ignore it. Atelier fires the cash
-- conversion cycle rule, so both states are reachable in the same demo.
--
-- Atelier is already in the LP portfolio, so the fund story stays coherent:
-- the company an investor can read about is the company filing.
--
-- Replace :password before running. The value is not committed.
--
-- crypt() and gen_salt() MUST stay schema-qualified as extensions.crypt /
-- extensions.gen_salt — unqualified they are off the SQL editor's search_path,
-- and the insert affects zero rows while still reporting "Success".

create extension if not exists pgcrypto with schema extensions;

-- The empty-string token columns are NOT optional. GoTrue scans them into
-- non-nullable Go strings; NULL makes every sign-in fail with a 500
-- "Database error querying schema" even though the row looks correct.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'submit.atelier@clavio.app',
  extensions.crypt(:'password', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false, false,
  '', '', '', '', '', '', '', ''
where not exists (
  select 1 from auth.users u where u.email = 'submit.atelier@clavio.app'
);

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
where u.email = 'submit.atelier@clavio.app'
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- company_id is set here rather than left to a later backfill: an untenanted
-- submit profile reads no quarters and writes none, so the account would look
-- broken rather than empty.
insert into public.profiles (id, role, full_name, company_id)
select
  u.id, 'submit', 'Atelier Saint-Pierre',
  (select id from public.companies where slug = 'asp')
from auth.users u
where u.email = 'submit.atelier@clavio.app'
  and not exists (select 1 from public.profiles p where p.id = u.id);
