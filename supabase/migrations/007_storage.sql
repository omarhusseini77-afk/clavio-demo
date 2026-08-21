-- Phase 4: real file storage.
--
-- Additive only, and invisible to the deployed build: it has no concept of
-- storage, so nothing here can affect the running demo. The code that reads any
-- of it deploys afterwards, once the buckets and files already exist.
--
-- Both buckets are private. There are no public object URLs anywhere in this
-- design; every read goes through a short-lived signed URL minted server-side.

insert into storage.buckets (id, name, public)
select 'submissions', 'submissions', false
where not exists (select 1 from storage.buckets where id = 'submissions');

insert into storage.buckets (id, name, public)
select 'fund-documents', 'fund-documents', false
where not exists (select 1 from storage.buckets where id = 'fund-documents');

-- ---------------------------------------------------------------------------
-- Metadata
-- ---------------------------------------------------------------------------
-- Nullable on purpose and permanently so: a document row without a file is a
-- legitimate state, so this never becomes NOT NULL.
alter table public.documents add column if not exists storage_path text;

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists submission_files_company_idx
  on public.submission_files(company_id);

alter table public.submission_files enable row level security;
alter table public.submission_files force row level security;

-- Mirrors the submissions bucket policy below. LPs are absent by design: a
-- portfolio company's own source documents are the same class of thing as
-- company_internals, which LPs also cannot read.
drop policy if exists "submission_files readable within tenant" on public.submission_files;
create policy "submission_files readable within tenant"
  on public.submission_files
  for select
  to authenticated
  using (
    (public.current_app_role() = 'submit' and company_id = public.current_company_id())
    or (
      public.current_app_role() = 'gp'
      and exists (
        select 1 from public.companies c
        where c.id = submission_files.company_id
          and c.fund_id = public.current_fund_id()
      )
    )
  );

drop policy if exists "submission_files insertable by own company" on public.submission_files;
create policy "submission_files insertable by own company"
  on public.submission_files
  for insert
  to authenticated
  with check (
    public.current_app_role() = 'submit'
    and company_id = public.current_company_id()
  );

-- ---------------------------------------------------------------------------
-- storage.objects
-- ---------------------------------------------------------------------------
-- Tenancy is carried by the first path segment, which is why the layout is
-- {tenant_id}/... — storage.foldername(name)[1] is the only handle a policy has
-- on where a file lives. A file therefore cannot be written outside its own
-- tenant's folder.
--
-- No update or delete policies at all: a filed document is immutable from the
-- client, and fund-documents is written only by migration/seed. No policy names
-- anon, so anonymous access fails by default.

drop policy if exists "submissions readable within tenant" on storage.objects;
create policy "submissions readable within tenant"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and (
      (
        public.current_app_role() = 'submit'
        and (storage.foldername(name))[1] = public.current_company_id()::text
      )
      or (
        public.current_app_role() = 'gp'
        -- objects.name must be qualified. Unqualified `name` inside this
        -- subquery resolves to companies.name, because the inner alias shadows
        -- the outer table, so the comparison silently becomes
        -- "company id = a fragment of the company's own name" — always false,
        -- and GPs lose access to their own fund's files with no error anywhere.
        and exists (
          select 1 from public.companies c
          where c.id::text = (storage.foldername(objects.name))[1]
            and c.fund_id = public.current_fund_id()
        )
      )
    )
  );

drop policy if exists "submissions writable by own company" on storage.objects;
create policy "submissions writable by own company"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'submissions'
    and public.current_app_role() = 'submit'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

drop policy if exists "fund documents readable within tenant" on storage.objects;
create policy "fund documents readable within tenant"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fund-documents'
    and public.current_app_role() in ('gp', 'lp')
    and (storage.foldername(name))[1] = public.current_fund_id()::text
  );
