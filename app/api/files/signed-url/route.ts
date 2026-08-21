import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mints a short-lived signed URL for one stored file.
//
// A signed URL bypasses RLS for its lifetime — that is the whole point of one —
// so this route is the real gate, and the single rule that makes it safe is:
// it takes a row id, never a path.
//
// The id is resolved through the caller's own session, so RLS decides whether
// the row is even visible. Another tenant's id simply returns nothing and the
// caller gets a 404, indistinguishable from an id that does not exist. Accepting
// a client-supplied path would hand that decision to the caller.
//
// Storage policies on the bucket are defence in depth behind this, not the
// primary control.

const EXPIRY_SECONDS = 60

type Body = { kind?: unknown; id?: unknown }

export async function POST(req: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const kind = body.kind
  const id = body.id

  if (kind !== 'document' && kind !== 'submission') {
    return NextResponse.json({ error: 'kind must be "document" or "submission"' }, { status: 400 })
  }
  // Reject anything that is not a bare uuid. A path would never match this, so
  // a caller cannot smuggle one through in place of an id.
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'id must be a uuid' }, { status: 400 })
  }

  const bucket = kind === 'document' ? 'fund-documents' : 'submissions'
  const table = kind === 'document' ? 'documents' : 'submission_files'
  const nameColumn = kind === 'document' ? 'title_en' : 'filename'

  const { data: row } = await supabase
    .from(table)
    .select(`storage_path, ${nameColumn}`)
    .eq('id', id)
    .maybeSingle()

  // Not visible under RLS, or no such row — same answer either way, so this
  // cannot be used to probe which ids exist in other tenants.
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const record = row as unknown as Record<string, string | null>
  const storagePath = record.storage_path
  if (!storagePath) {
    return NextResponse.json({ error: 'No file attached to this record' }, { status: 404 })
  }

  const { data: signed, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(storagePath, EXPIRY_SECONDS, {
      download: record[nameColumn] ?? undefined,
    })

  if (error || !signed) {
    return NextResponse.json({ error: error?.message ?? 'Could not sign URL' }, { status: 500 })
  }

  return NextResponse.json({
    url: signed.signedUrl,
    expiresIn: EXPIRY_SECONDS,
    filename: record[nameColumn] ?? 'download',
  })
}
