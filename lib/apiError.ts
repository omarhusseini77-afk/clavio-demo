import { NextResponse } from 'next/server'

// Stable error responses for API routes.
//
// Several routes used to do `catch (err) { return json({ error: err.message }) }`,
// which hands the caller whatever the exception happened to say — a Postgres
// error naming a table and column, a fetch failure naming an internal host, an
// SDK error quoting part of a request. None of that is useful to the person
// looking at the screen and all of it describes the inside of the system.
//
// So: the caller gets a fixed sentence and a short reference; the real detail
// goes to the server log against that same reference. A support conversation
// then starts with "ref 7QK2FD" rather than a screenshot of a stack trace.
//
// Expected, meaningful conditions — 401, 403, 400 with a reason the caller can
// act on — are NOT routed through here. Those messages are authored, safe, and
// worth saying plainly; `fail` is for the ones nobody anticipated.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no I/L/O/0/1 — these get read aloud

function reference(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * Log the real failure server-side, return a safe one to the caller.
 * The returned body is always `{ error, ref }` with the same fixed `error`.
 */
export function fail(route: string, err: unknown, status = 500): NextResponse {
  const ref = reference()
  // Logged as one line with the reference first so it greps cleanly.
  console.error(
    `[error] ref=${ref} route=${route}`,
    err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : err,
  )
  return NextResponse.json(
    {
      // Deliberately does not promise that nothing was changed. A failure can
      // land after a partial write, and a reassurance the code cannot verify
      // is worse than no reassurance.
      error: 'Something went wrong on our side. Quote this reference if you report it.',
      ref,
    },
    { status },
  )
}

/**
 * A write Postgres refused. Expected — usually RLS — so the caller gets a
 * meaningful 403 rather than a generic 500, but the database's own wording
 * ("new row violates row-level security policy for table quarters") names
 * internals and does not reach them.
 */
export function refused(route: string, err: unknown, message: string): NextResponse {
  const ref = reference()
  console.error(`[refused] ref=${ref} route=${route}`, err)
  return NextResponse.json({ error: message, ref }, { status: 403 })
}
