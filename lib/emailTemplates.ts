import type { Lang } from './loc'

// Notification templates.
//
// ONE TEMPLATE PER AUDIENCE, NEVER SHARED. There is deliberate duplication
// between the submit and GP variants below, and it must stay: a single template
// with conditional blocks is how a peer leak gets introduced later by someone
// editing one branch and not noticing the other renders for a different reader.
// Duplication is cheap; a portfolio company learning about its peers is not.
//
// ── The tenancy constraint on submit-audience mail ──
//
// A message to a portfolio company may reference ONLY:
//   * its own name
//   * the period being asked for
//   * the deadline date
//   * a link to its own submission page
//
// That is the entire vocabulary. Not the fund name. Not how many other
// companies have filed. Not "you are the last one we are waiting on", which is
// peer information wearing a helpful disguise.
//
// The composer enforces this by construction — it is never handed a fund object
// or a peer list, so there is nothing in scope for a careless edit to reach for
// — and scripts/test-notifications.mjs asserts the absence against every peer
// name and slug in the fund, with a positive control that the company's OWN
// name is present.

export interface Composed {
  subject: string
  body: string
}

/** What a submit-audience template is allowed to know. Note what is absent. */
export interface SubmitContext {
  companyName: string
  period: string
  deadline: string
  link: string
}

/** What a GP-audience template is allowed to know. */
export interface GpContext {
  companyName: string
  period: string
  fundName: string
  filedAt: string
  link: string
}

// ── Submit audience ────────────────────────────────────────────────────────

export function submissionReminder(c: SubmitContext, lang: Lang): Composed {
  if (lang === 'fr') {
    return {
      subject: `${c.companyName} — transmission ${c.period} attendue le ${c.deadline}`,
      body: [
        `Bonjour,`,
        ``,
        `La transmission de vos chiffres pour ${c.period} est attendue le ${c.deadline}.`,
        ``,
        `Vous pouvez la déposer ici : ${c.link}`,
        ``,
        `Si vos comptes de gestion sont prêts, il suffit de joindre le fichier — les champs sont remplis automatiquement et vous pouvez les corriger avant validation.`,
        ``,
        `— Clavio`,
      ].join('\n'),
    }
  }
  return {
    subject: `${c.companyName} — ${c.period} figures due ${c.deadline}`,
    body: [
      `Hello,`,
      ``,
      `Your ${c.period} figures are due on ${c.deadline}.`,
      ``,
      `You can file them here: ${c.link}`,
      ``,
      `If your management accounts are ready, attaching the file is enough — the form fills itself in and you can correct anything before submitting.`,
      ``,
      `— Clavio`,
    ].join('\n'),
  }
}

export function submissionConfirmation(c: SubmitContext, lang: Lang): Composed {
  if (lang === 'fr') {
    return {
      subject: `${c.companyName} — ${c.period} bien reçu`,
      body: [
        `Bonjour,`,
        ``,
        `Vos chiffres pour ${c.period} ont bien été reçus.`,
        ``,
        `Vous pouvez consulter votre historique et les indicateurs calculés à partir de vos propres chiffres ici : ${c.link}`,
        ``,
        `— Clavio`,
      ].join('\n'),
    }
  }
  return {
    subject: `${c.companyName} — ${c.period} received`,
    body: [
      `Hello,`,
      ``,
      `Your ${c.period} figures have been received.`,
      ``,
      `You can see your filing history, and the measures computed from your own figures, here: ${c.link}`,
      ``,
      `— Clavio`,
    ].join('\n'),
  }
}

// ── GP audience ────────────────────────────────────────────────────────────
//
// Written out separately rather than branching inside the functions above.
// A partner may be told the fund name and which company filed; a company may
// not. Keeping those facts in different functions is the safeguard.

export function gpSubmissionConfirmation(c: GpContext, lang: Lang): Composed {
  if (lang === 'fr') {
    return {
      subject: `${c.fundName} — ${c.companyName} a transmis ${c.period}`,
      body: [
        `${c.companyName} a transmis ses chiffres pour ${c.period} le ${c.filedAt}.`,
        ``,
        `Tableau de bord : ${c.link}`,
        ``,
        `— Clavio`,
      ].join('\n'),
    }
  }
  return {
    subject: `${c.fundName} — ${c.companyName} filed ${c.period}`,
    body: [
      `${c.companyName} filed its ${c.period} figures on ${c.filedAt}.`,
      ``,
      `Dashboard: ${c.link}`,
      ``,
      `— Clavio`,
    ].join('\n'),
  }
}
