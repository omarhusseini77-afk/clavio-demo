import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) { const m=l.match(/^([A-Z_]+)=(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].trim() }
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
await db.auth.signInWithPassword({email:'gp@clavio.app',password:'ClavioDemo2026'})
const n = async t => ((await db.from(t).select('id')).data ?? []).length
console.log(`funds=${await n('funds')} companies=${await n('companies')} quarters=${await n('quarters')}`)
