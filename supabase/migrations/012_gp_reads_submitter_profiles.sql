-- A GP could not compose a reminder, because it could not find who to remind.
--
-- `profiles` has exactly one select policy — "own profile readable" from
-- 001_profiles.sql — so a partner looking up the submitting user for one of
-- their own portfolio companies got nothing back, and composeReminder returned
-- "that company has no submitting user" for every company in the fund.
--
-- Caught by a test that had been written weakly enough to pass either way, then
-- tightened to demand the real path. See docs/verification-notes.md: an
-- assertion that accepts the error branch as success is not an assertion.
--
-- This is the narrowest widening that makes the feature work:
--
--   * role = 'submit' only. A GP still cannot read LP profiles, or other GPs'.
--   * scoped to companies in the caller's own fund.
--   * profiles carries id, role, full_name, company_id, fund_id — and NO email
--     address. Addresses live on auth.users, which no client policy exposes,
--     so this does not become a way to harvest contact details.
--
-- Rollback: drop this policy. Reminders stop composing; nothing else changes.
drop policy if exists "submitter profiles readable by fund gp" on public.profiles;
create policy "submitter profiles readable by fund gp"
  on public.profiles
  for select
  to authenticated
  using (
    public.current_app_role() = 'gp'
    and role = 'submit'
    and exists (
      select 1 from public.companies c
      where c.id = profiles.company_id
        and c.fund_id = public.current_fund_id()
    )
  );
