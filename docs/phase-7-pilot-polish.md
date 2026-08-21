# Phase 7 — pilot polish

Design for review. No code yet.

Five pieces: email notifications, LP report PDF export, an admin panel, error
handling, and usage logging. They are independent enough to ship in that order,
and the sequencing section says which ones can land without a migration.

---

## 1. Email notifications

### The thing that has to be settled first

**There is no email provider configured, and every demo account is a fictional
address.** `gp@clavio.app`, `lp@clavio.app`, `submit@clavio.app` and
`submit.atelier@clavio.app` are rows in `auth.users` with no mailbox behind
them. Wiring a provider and pointing it at those addresses would send real mail
to non-existent recipients, which bounces, and repeated bounces damage the
sending domain's reputation before the pilot has sent a single real message.

So the design is **outbox-first**:

1. Every notification is composed and **written to an `email_outbox` table**,
   always. That row is the record of what the system decided to send.
2. Dispatch is a **separate, explicitly enabled step**. With no provider key
   configured, nothing is transmitted — the outbox simply accumulates, and the
   admin panel renders it as a list of rendered emails you can read.
3. Turning on real sending is a deliberate act: set the provider key, and set
   `email_dispatch_enabled` on the fund. Both, not either.

This is not a stub. The composition, the tenancy scoping, the templates and the
scheduling are all real and all testable; only the final transmission is gated.
It also means the whole feature can be verified without sending anything.

**I am not going to enable transmission or send a test message on your behalf.**
Sending email is outward-facing and irreversible, and the recipients would need
to be addresses you actually control. When you want it live, you provide the
provider key and a verified sender domain, and you make the call on the first
send.

### Provider recommendation

**Resend.** One HTTP call, no SDK weight, works from a Next.js route handler,
and the free tier covers a pilot. It needs a verified domain to send from —
which is the step that forces the deliberate decision above.

### What gets sent, and to whom

Two kinds, both requested:

| Notification | Recipient | Trigger |
|---|---|---|
| **Submission reminder** | the `submit` user of one company | that company has not filed for the current period, N days before the deadline |
| **Submission confirmation** | the `submit` user who filed | immediately after a successful `POST /api/quarters` |

### Tenancy: the constraint that shapes the templates

> *A reminder to a portfolio company must never leak fund or peer information.*

This is enforced in three places, not one, because a template is easy to edit
carelessly:

**Composition is scoped by construction.** The composer takes a `company_id`
and reads only that company's own row and its own quarters. It is never handed
a fund object, a peer list, or a portfolio aggregate — there is nothing in
scope to leak, so a careless edit has nothing to reach for.

**The template is a fixed field set.** A submit-audience email may reference:
the company's own name, the period being asked for, the deadline date, and a
link to the submission page. That is the entire vocabulary. Not the fund name,
not how many other companies have filed, not "you are the last one" — which is
peer information wearing a helpful disguise.

**A test asserts the absence.** Every composed submit-audience email is checked
against the fund name, every peer company name, and every peer slug. Present in
the body → the test fails. Paired with a positive control confirming the
company's *own* name IS present, because a composer that returned an empty
string would otherwise pass a leak test perfectly.

### What this does NOT include

**The in-app notification bells stay authored for now, and I want to flag them.**
`GP_NOTIFICATIONS` and `LP_NOTIFICATIONS` are hardcoded arrays in
`app/gp/page.tsx` and `app/lp/page.tsx` — the same authored-presented-as-real
pattern the anomaly feed had. They are out of scope here, but they are the next
instance of the thing we just spent a phase removing, and they should either be
derived or labelled. Say the word and I will fold it in.

---

## 2. LP report PDF export

Reuses `scripts/generate-demo-pdfs.mjs` — same wordmark, same rules, same
demonstration notice on every page and in the body. That script's `buildPdf`
moves into `lib/pdf.ts` so the export and the seed script share it rather than
diverging.

**Client-side, in `LPView`.** The data is already in the browser under the
investor's own session, so rendering there adds no endpoint and no new place
for the wrong figures to be assembled. `jspdf` and `jspdf-autotable` are already
dependencies and already dynamically imported by `GPView`'s export, so this
costs nothing new in the bundle.

Contents follow the LP tabs, and **only** what an LP is already entitled to see
— which RLS has already decided by the time the payload reaches the browser:
position and capital account, fund performance, portfolio company performance
figures, capital events, forecast. Working capital, cash, receivables, payables
and net debt are absent because `company_internals` and
`company_year_internals` never reached the client.

**Verification:** generate as an LP, extract the text, and assert that no
withheld figure appears. Positive control: generate the same report as a GP
session — where those figures ARE present in the payload — and confirm the
export still omits them, so the omission is the export's doing and not merely
an artefact of RLS having already removed them.

---

## 3. Admin panel — scoped explicitly

You asked what it can and cannot do. The short version: **it can read
everything within one fund, and it can write exactly four things, none of which
destroy data.**

### No new role

`profiles.role` is `check (role in ('gp','lp','submit'))`, and every RLS policy
in the system branches on `current_app_role()`. Adding an `admin` role means
touching the check constraint and auditing every policy for a role none of them
were written against — a large blast radius for a pilot convenience.

**The admin panel is a GP-only section, scoped to the GP's own fund** by exactly
the policies already in force. An admin does not see across funds, because
there is no such thing as across-funds in this model.

### What it CAN do

**Read (all fund-scoped):**
- Companies in the fund, with quarters filed and latest period
- Which companies are missing the current period — the reminder queue
- The `email_outbox`: every composed message, its state, its rendered body
- The usage log (§5), as counts and latencies
- Feature flags currently set

**Write — four actions, all reversible:**

| Action | Effect | Reversible by |
|---|---|---|
| Toggle `cfo_signals_simultaneous` per company | whether the CFO sees signals as they compute | toggling back |
| Toggle `email_dispatch_enabled` per fund | whether the outbox actually transmits | toggling back |
| Compose a reminder for one company | writes an outbox row | it is not sent while dispatch is off |
| Mark an outbox row cancelled | that row will not be dispatched | it stays visible, marked |

### What it explicitly CANNOT do

This list is the point of the section:

- **No deleting anything.** No quarters, no companies, no users, no documents,
  no outbox rows. Cancelling marks a row; it does not remove it.
- **No editing financial figures.** Quarters are editable by a GP through the
  existing dashboard, deliberately not duplicated here — one path for changing
  numbers, not two.
- **No creating or deleting user accounts, and no password operations.** Those
  are Supabase dashboard operations, done by you.
- **No cross-fund anything.** Not a policy in the panel — a property of RLS.
- **No re-seeding, no "reset demo data" button.** The seed route has already
  destroyed real filings once. A button for it is the same mistake with a nicer
  affordance.
- **No sending email directly.** The panel can compose into the outbox and can
  flip the dispatch flag; it has no "send now" control, so there is no single
  click that puts mail on the wire.

### Where it lives

A fifth tab in the existing GP settings area rather than a new route — it
inherits the session, the role check and the layout, and both breakpoints come
from the existing tab machinery.

---

## 4. Error handling

Three gaps today:

**No error boundaries.** There is no `app/error.tsx` and no `not-found.tsx`, so
an unhandled render error shows the default Next.js overlay in dev and a blank
page in production. Adding both, in the app's own visual language, with a
retry.

**API errors leak internals.** Several routes do
`catch (err) { return NextResponse.json({ error: err.message }) }`, which sends
whatever the exception said — a Postgres error, a stack-adjacent string — to
the client. Replacing with: a stable, generic message to the caller, and the
real detail logged server-side with a short correlation id shown to the user so
a report can be tied to a log line.

**Failures are silent in the UI.** `useQuarters` does
`setQuarters(Array.isArray(data) ? sort(data) : [])` — a failed fetch is
indistinguishable from a company with no filings, which is the same
silence-equals-success shape as `docs/verification-notes.md`. It needs an error
state distinct from empty.

**Verification:** every one of these is only observable when something breaks,
so each gets broken on purpose — a route made to throw, a fetch forced to fail,
a component made to error — and the handling is watched working before the
break is reverted.

---

## 5. Usage logging

A `usage_log` table, written server-side by API routes.

### Recorded

`created_at`, `route`, `method`, `status`, `duration_ms`, `role`, `company_id`,
`fund_id`, and for `/api/ask` only: `input_tokens`, `output_tokens`,
`cache_read_tokens`, `cache_write_tokens`, `lang`.

### Deliberately NOT recorded

> *Usage logging must not capture financial figures or anything that would be
> sensitive in a log.*

- **No question text and no answer text.** A question is free text and will
  contain figures — "why did cash fall from £2.7m" is a financial figure in a
  log. This is the single biggest temptation here and the answer is no.
- **No request or response bodies.** Not truncated, not hashed, not sampled.
- **No quarterly figures, ever.** Nothing from `quarters` reaches this table.
- **No file names or storage paths.** A filename carries the company and period.
- **No email addresses.** `user_id` identifies a person; the address adds
  nothing and makes the table PII in a new way.
- **No IP addresses or user agents.**

The rule the table is designed around: **a log row answers "what was called,
by which tenant, how fast, did it work" and nothing about what was in it.**

### Enforcement, not intention

An allow-list writer. The logging helper takes a typed record with exactly those
fields; there is no free-form `metadata jsonb` column, because that column is
where every one of the excluded items would eventually end up.

**Verification:** a test that writes a log row for every route, dumps the
table, and asserts no value matches any figure from `quarters`, any question
string, or any known filename. Positive control: the same scan run against a
deliberately-poisoned row proves the scan can detect a leak — otherwise a clean
result is the `LC_ALL=C` bundle scan all over again.

### RLS

`usage_log` is written by the server under the caller's session and readable
only by a GP for their own fund. No update policy, no delete policy: a log you
can edit is not a log.

---

## Sequencing

1. **Error handling** — no migration, no schema, nothing to leak. Ships first
   and independently.
2. **LP PDF export** — no migration; shares `lib/pdf.ts` with the seed script.
3. **Migration 011:** `email_outbox`, `usage_log`, `funds.email_dispatch_enabled`,
   with RLS. Additive and unread until the code lands.
4. **Usage logging** — writes only; nothing reads it yet.
5. **Notifications** — composer, outbox writes, scheduling. Dispatch stays off.
6. **Admin panel** — reads everything above, so it lands last.

Nothing here tightens an existing policy, so there is no Phase-3-shaped
outage step.

---

## Open questions for you

1. **Reminder timing.** How many days before a deadline, and is there a deadline
   field at all? There is no such column today — I would add
   `companies.reporting_deadline_days` (days after period end) rather than
   hardcode a number.
2. **Does a submission confirmation go to the GP as well as the CFO?** It is the
   one place the two audiences might reasonably get the same event, and it is
   also the one place a peer-leak could sneak in if the templates are shared.
   My recommendation is separate templates with no shared body.
3. **The authored notification bells** — fold into this phase, or track
   separately?
