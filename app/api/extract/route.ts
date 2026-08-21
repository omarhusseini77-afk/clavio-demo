import { NextResponse } from 'next/server'
import { fail } from '@/lib/apiError'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a financial data extractor. The user will provide a financial document (P&L and/or balance sheet).
Extract the following fields and return ONLY a valid JSON object with these exact keys (all numeric values in GBP, no formatting, just numbers):
{
  "period": "Q1 2024",
  "turnover": 0,
  "cos": 0,
  "gross": 0,
  "admin": 0,
  "op": 0,
  "interest": 0,
  "pbt": 0,
  "tax": 0,
  "retained": 0,
  "fixed": 0,
  "stock": 0,
  "debtors": 0,
  "cash": 0,
  "creditors": 0,
  "net_assets": 0,
  "funds": 0
}
Period should be in format "Q1 2024". If a value is not found, use 0. Return ONLY the JSON object, no other text.`

export async function POST(req: Request) {
  // Outside the middleware matcher, so this is the route's only gate. An open
  // upload endpoint that calls a paid model is an abuse and billing surface as
  // much as a data one. Checked before the API-key guard so a misconfigured
  // deploy still refuses anonymous callers.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Extraction belongs to the filing flow. LPs have no upload UI and no reason
  // to run documents through the model.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'submit' && profile?.role !== 'gp') {
    return NextResponse.json({ error: 'Not permitted' }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
    const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name)

    let message: Anthropic.MessageParam

    if (isPdf) {
      const base64 = buffer.toString('base64')
      message = {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as Anthropic.DocumentBlockParam,
          { type: 'text', text: 'Extract the financial data from this document and return the JSON.' },
        ],
      }
    } else if (isExcel) {
      const { read, utils } = await import('xlsx')
      const wb = read(buffer, { type: 'buffer' })
      const csvParts: string[] = []
      for (const sheetName of wb.SheetNames) {
        const csv = utils.sheet_to_csv(wb.Sheets[sheetName])
        csvParts.push(`Sheet: ${sheetName}\n${csv}`)
      }
      const csvText = csvParts.join('\n\n')
      message = {
        role: 'user',
        content: `Extract the financial data from this spreadsheet and return the JSON.\n\n${csvText}`,
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, XLSX, XLS, or CSV.' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [message],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse extracted data' }, { status: 500 })

    const extracted = JSON.parse(jsonMatch[0])

    // Keep the source document. Until now it was read into memory, sent to the
    // model and dropped, leaving the figures a GP sees with nothing behind them.
    //
    // Stored under {company_id}/... because the storage policy reads tenancy
    // from the first path segment — a company physically cannot write outside
    // its own folder. Uploaded with the caller's session, so that policy is
    // enforced here rather than trusted.
    let storedFileId: string | null = null
    if (profile?.role === 'submit' && profile.company_id) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
      const objectPath = `${profile.company_id}/${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName}`

      const { error: upErr } = await supabase.storage
        .from('submissions')
        .upload(objectPath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (upErr) {
        // Extraction already succeeded; losing the file is worth reporting but
        // not worth discarding the parsed figures the user is waiting on.
        console.error('[extract] upload failed:', upErr.message)
      } else {
        const { data: inserted, error: rowErr } = await supabase
          .from('submission_files')
          .insert({
            company_id: profile.company_id,
            storage_path: objectPath,
            filename: file.name,
            mime_type: file.type || null,
            size_bytes: buffer.length,
            uploaded_by: user.id,
          })
          .select('id')
          .single()
        if (rowErr) console.error('[extract] submission_files insert failed:', rowErr.message)
        else storedFileId = inserted.id
      }
    }

    return NextResponse.json({ ...extracted, storedFileId })
  } catch (err: unknown) {
    return fail('POST /api/extract', err)
  }
}
