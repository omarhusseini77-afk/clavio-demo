# GP company selector

Design for review. No code yet.

## The answer to your question: neither, quite

**The API route already accepts a company parameter.** `/api/quarters` has
taken `?company=` since the scoping work, and `fetchScopedQuarters` already
threads it through. Nothing needs adding to the route.

```ts
const requested = new URL(request.url).searchParams.get('company')
const { quarters } = await fetchScopedQuarters(supabase, profile, requested)
```

So the work is: have the client pass it, give the client a list to choose from,
and make everything on the page follow the selection.

### Why not a client-side switch over already-fetched data

`/api/quarters` returns **one** company's series, so the client never holds the
others. `/api/fund-data` *does* read every quarter the caller can see — it has
to, for the computed signals — so it could return them all grouped and let the
switch be instant.

I recommend against it. It would put a second copy of the quarterly data on a
second path with its own scoping, and "two paths that can disagree about what a
company's series is" is precisely the failure `lib/quartersScope.ts` was written
to end. The module's own comment is about that incident. One fetch per
selection is a few hundred milliseconds; a dashboard and an assistant answering
from different datasets is the worst failure this product has.

## The thing that would break if I only did what was asked

**The assistant would keep answering about the old company.**

`/api/ask` calls `fetchScopedQuarters(supabase, profile)` with no requested
company, so it resolves the *server default* every time. Add a selector without
touching it and a partner switches the dashboard to Halcyon, asks "what
happened to margin last quarter", and gets an answer about Marlow & Reed —
confidently, with the wrong company's figures, while Halcyon's are on screen.

That is the exact bug the scoping module exists to prevent, reintroduced
through the front door. So `/api/ask` takes the same company parameter, from
the same selection, resolved by the same function.

`AskPanel` already sends a `context` field that `/api/ask` deliberately
ignores — it was how the LP view once received the full-detail dataset. The
company id goes in as its own field, not smuggled through `context`, and it is
an **id only**: never a series, never a name, nothing the server would trust.

## What changes

| File | Change |
|---|---|
| `app/api/fund-data/route.ts` | return `quartersCompanies: [{ id, name, quartersFiled, latestPeriod }]`, derived from the all-quarters grouping it **already** performs — zero new queries |
| `app/api/ask/route.ts` | accept `company` from the body, pass it to `fetchScopedQuarters` |
| `lib/useQuarters.ts` | accept an optional company id, send it as `?company=`, refetch when it changes |
| `app/gp/page.tsx` | hold the selection, pass it to `useQuarters` |
| `components/GPView.tsx` | the selector itself; header label follows the selection; pass the id to `AskPanel` |
| `components/AskPanel.tsx` | forward an optional `companyId` in the request body |

### The selector

A dropdown, not tabs. Four companies today and six in the fund, so a tab strip
would wrap awkwardly at the mobile breakpoint and would need a different shape
at each — a `<select>` is one control that behaves correctly at both, and
degrades to the native picker on a phone.

It lists **only companies with quarters**. A company with nothing filed cannot
be a dashboard scope; showing it as a choice that yields an empty screen would
be an invitation to a dead end. Today that is four of six:

| Company | Quarters |
|---|---|
| Marlow & Reed Joinery | 13 |
| Halcyon Textiles | 8 |
| Sentinel Security NW | 8 |
| Atelier Saint-Pierre | 8 |

Abington Technical Services and Delacourt Frères have none, and are excluded.

### Default

No parameter on first load, so the server resolves it exactly as it does today
and nothing changes about what a partner sees when they arrive.

**Correction worth making while I'm here:** the default is *most quarters
filed*, not *most recent submitter*. `resolveQuartersCompany` counts rows per
company and takes the largest; the comment in `/api/quarters` that says
"whichever company submitted most recently" is stale — it describes an earlier
version that sorted by `id`, which was changed because bulk inserts made it
reassign the dashboard unpredictably. I will fix the comment rather than leave
a wrong description of the behaviour in the file.

Either way the answer today is Marlow & Reed, so the default does not move.

## Security: where the boundary actually is

**The selector is not the boundary and must not be mistaken for one.**

`resolveQuartersCompany` passes `requested` straight through without checking
it belongs to the caller's fund. That is deliberate and safe, because the query
underneath is:

```ts
supabase.from('quarters').select('*').eq('company_id', companyId)
```

— under the caller's own session. `006_tenancy_rls.sql` restricts `quarters` to
companies in the caller's fund, so a foreign id returns **zero rows**, not
another fund's data. The filter narrows within what RLS already permits; it
cannot widen it.

Two consequences worth stating rather than discovering:

1. A hand-crafted request with someone else's company id yields an empty
   series, not an error. That is the right behaviour — an error would confirm
   the id exists — and the UI never reaches that state, because the selector
   only offers ids from the caller's own fund.
2. The same is true for a `submit` user: passing `?company=<peer>` returns
   nothing, because their policy is `company_id = current_company_id()`. Worth
   a test, since the parameter is now genuinely exercised for the first time.

### Verification

Reasoning about the policy is not evidence, and with one fund in the database
there is nothing to be denied *from* — a clean result would be vacuous. So:

**A temporary second tenant**, as in Phase 2 and Phase 4: fund B, one company,
a few quarters, a GP for it. Then:

**Must fail**
1. Fund A's GP requests fund B's company id → empty series, not fund B's rows.
2. Fund B's company does not appear in fund A's selector list.
3. Fund A's GP asks the assistant with fund B's company id → the answer is not
   grounded in fund B's figures.
4. `submit@clavio.app` requests a peer company id in its own fund → empty.
5. Anon requests any company id → 401.

**Positive controls — each must succeed**, or the failures above prove nothing
6. Fund B's GP requests its own company id → gets fund B's rows. This is the
   one that makes test 1 mean something: without it, an empty result could just
   mean the id was wrong.
7. Fund A's GP requests each of its own four companies → gets the right series,
   with the right row counts (13 / 8 / 8 / 8).
8. The selector for fund A lists exactly those four.

**Regression:** default with no parameter still resolves to Marlow & Reed; the
assistant and the dashboard report the same company for the same selection;
both breakpoints; exact before/after counts on the way out — back to 1 fund,
6 companies, 37 quarters, 4 users.

## Not in scope

The **computed signals panel stays fund-wide**. It already covers every company
in the fund and that is correct — a partner scanning for what needs attention
should not have to switch company to find out. Only the chart, the KPI strip,
the quarters table and the assistant follow the selection.
