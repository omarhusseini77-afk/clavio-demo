# When the verification was the thing that was broken

Three times now, a check has reported a clean result that was an artefact of the
check itself rather than a fact about the system. Each was caught by accident.
This file exists so the pattern is on the record rather than rediscovered.

**A "verified" claim from an earlier session is not evidence. Re-run it from a
clean state before relying on it.**

---

## 1. The bundle-leak scan that could not have found anything

Checking whether confidential company figures still shipped inside the browser
bundle, `grep` hit non-UTF-8 bytes in the minified output, errored, and returned
nothing. Nothing read as "no leak".

Redone under `LC_ALL=C` with `grep -a`, which treats the input as binary rather
than giving up on it.

**Rule:** before trusting a clean result, prove the check can produce a dirty
one. A search that cannot fail has not passed.

## 2. The tamper test that "failed" by succeeding

Testing that a modified signed URL is rejected, the token was truncated in bash
with `${URL%?*}`. That strips one character from the end — leaving a URL whose
*original* token was still first in the query string. Storage honoured it and
returned a valid PDF. The test looked like a genuine security failure.

Rebuilt in Python, where the mutation was explicit. The real behaviour was
correct all along.

**Rule:** a failing security test is not automatically a finding. Confirm the
test does what it claims before acting on its verdict — in both directions.

## 3. The pre-push hook that was never committed

A previous session reported building a pre-push hook, demonstrating that it
blocked a bad push, and committing it. `core.hooksPath` was set to
`scripts/hooks`. That directory did not exist, and the commit that claimed to
add the hook contained only documentation.

Git does not complain about a `hooksPath` pointing nowhere. It runs no hook and
says nothing. So every push after that ran unverified — including the first push
of the CFO surface — while the repo carried a commit message asserting the
opposite.

Found only because the hook's output was missing from a push that should have
printed it.

**Rule:** verify the guard is *installed*, not just written. For anything whose
job is to block, the passing case is silent and therefore indistinguishable from
absence — so the only real proof is watching it block.

## 4. The constraint test that was answered by RLS

Checking that `anomalies_observations_only` rejects an authored-as-computed
row, the probe ran from a normal client session. The insert came back
`REJECTED` — by row-level security, which refuses every client write to that
table long before any constraint is evaluated. The constraint was never
reached.

It was caught only because the positive control came back rejected too. A
legitimate observation should have inserted cleanly; when both the bad row and
the good row failed for the same reason, the reason was clearly not the thing
being tested.

Redone where the constraint is actually reachable. The authored row was
rejected by the check constraint and the observation was accepted.

**Rule:** a rejection is only evidence if you know what did the rejecting. This
is why every denial test is paired with an owner positive control — here the
pairing is what caught it, one instance after the pattern was written down.

---

## The shape of it

All three share a structure: **the negative result and the broken instrument
look identical.** No output from a search, no rejection from a test, no
complaint from a hook — each is what success looks like *and* what "this never
ran" looks like.

So for any check whose pass condition is silence:

1. Make it fail on purpose first, and watch it fail.
2. Only then trust the silence.

This is the same discipline as pairing every denial test with an owner positive
control, applied to the tooling instead of the system.

## Related, same family

* An unqualified `crypt()` in the SQL editor inserted zero rows and reported
  "Success". The account creation appeared to work and had not happened.
* `npm run build 2>&1 | tail -3 && git push` pushed a TypeScript error, because
  a pipeline reports the exit status of its last command — `tail` succeeded, so
  `&&` proceeded. This is why `scripts/hooks/pre-push` contains no pipes.
