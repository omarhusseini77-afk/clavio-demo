import type { CfoSignal, CfoSignalId } from './cfoSignals'
import type { Loc } from './loc'

// Wording for both surfaces, generated from the rule that fired.
//
// Two voices live in one file on purpose. A GP looking at a portfolio and a CFO
// being shown what their investor sees should not read identical prose, but
// they must never quote different figures — so both take every number from
// `signal.detail` rather than restating it, and a change to one voice is made
// looking directly at the other.
//
// "Identical signals" means same rule ids, same periods, same numbers. It does
// not mean same sentences.
//
// ---------------------------------------------------------------------------
// The CFO voice.
//
// Deliberately not reused from the `anomalies` table: those rows carry partner
// actions ("place on the watch-list", "suspend pending drawdown approvals") and
// would read as surveillance. This is advance notice — the CFO seeing what their
// investor is about to see, before the investor asks.
//
// Shape of every message: what moved -> what the investor sees -> an invitation,
// never an instruction. No "warning", no "deterioration", no "action required",
// no rating of the company. The signal attaches to a number, never to them.
//
// French is written, not machine-translated. The tone is the feature; a stiff
// translation reads as more accusatory than the English.

const n1 = (v: number) => v.toFixed(1)
// French uses a comma decimal separator. Writing "7.8 %" in a French sentence
// is the tell that the text was translated rather than written, which is the
// one thing this file exists to avoid — so the French strings format their own
// numbers rather than sharing the English formatter.
const fr1 = (v: number) => v.toFixed(1).replace('.', ',')

export interface CfoSignalCopy {
  heading: Loc
  body: Loc
}

export function cfoSignalCopy(signal: CfoSignal): CfoSignalCopy {
  const d = signal.detail

  switch (signal.id as CfoSignalId) {
    case 'working-capital-divergence':
      return {
        heading: {
          en: 'Creditor days rose while debtor days fell',
          fr: 'Les délais fournisseurs augmentent, les délais clients diminuent',
        },
        body: {
          en: `Creditors are up ${n1(d.creditorsChange)}% on the quarter while debtors are down ${n1(Math.abs(d.debtorsChange))}%. Your investor's dashboard picks this pattern up. If there's a reason — a supplier renegotiation, a large collection landing early — it's worth a line on your next submission.`,
          fr: `Les dettes fournisseurs progressent de ${fr1(d.creditorsChange)} % sur le trimestre tandis que les créances clients reculent de ${fr1(Math.abs(d.debtorsChange))} %. Le tableau de bord de votre investisseur relève ce mouvement. S'il y a une explication — renégociation fournisseurs, encaissement important arrivé plus tôt — une ligne dans votre prochaine transmission suffit.`,
        },
      }

    case 'revenue-cash-divergence':
      return {
        heading: {
          en: 'Revenue grew but cash did not follow',
          fr: 'Le chiffre d’affaires progresse sans que la trésorerie suive',
        },
        body: {
          en: `Revenue is up ${n1(d.revenueChange)}% on the quarter while cash moved ${n1(d.cashChange)}%. This is the pattern an investor asks about first, usually because it points at collection timing or a working-capital build. Context on your next submission saves the question.`,
          fr: `Le chiffre d'affaires augmente de ${fr1(d.revenueChange)} % sur le trimestre alors que la trésorerie évolue de ${fr1(d.cashChange)} %. C'est le point sur lequel un investisseur revient en premier, généralement lié au rythme des encaissements ou à une hausse du besoin en fonds de roulement. Un mot d'explication dans votre prochaine transmission évite la question.`,
        },
      }

    case 'gross-margin-outside-band':
      return {
        heading: {
          en: `Gross margin moved outside its usual range`,
          fr: `La marge brute sort de sa plage habituelle`,
        },
        body: {
          en: `Gross margin came in at ${n1(d.current)}%, against a recent range of ${n1(d.lower)}–${n1(d.upper)}%. Movement at the gross level usually traces to pricing or input costs rather than overheads.`,
          fr: `La marge brute ressort à ${fr1(d.current)} %, contre une plage récente de ${fr1(d.lower)} à ${fr1(d.upper)} %. Un mouvement au niveau brut vient généralement des prix ou du coût des intrants, plutôt que des frais de structure.`,
        },
      }

    case 'ebitda-margin-outside-band': {
      // Whether gross held steady is the diagnostic. Gross flat plus EBITDA
      // moving points at overhead or a one-off rather than pricing — worth
      // saying, because it is the difference between two very different
      // conversations with an investor.
      const grossSteady = d.grossHeldSteady === 1
      return {
        heading: {
          en: 'EBITDA margin moved outside its usual range',
          fr: 'La marge d’EBITDA sort de sa plage habituelle',
        },
        body: {
          en: `EBITDA margin came in at ${n1(d.current)}%, against a recent range of ${n1(d.lower)}–${n1(d.upper)}%.${grossSteady ? ' Gross margin held steady over the same period, which usually points at overheads or a one-off rather than pricing.' : ''} Your investor sees the same movement.`,
          fr: `La marge d'EBITDA ressort à ${fr1(d.current)} %, contre une plage récente de ${fr1(d.lower)} à ${fr1(d.upper)} %.${grossSteady ? ' La marge brute est restée stable sur la même période, ce qui oriente plutôt vers les frais de structure ou un élément exceptionnel que vers les prix.' : ''} Votre investisseur observe le même mouvement.`,
        },
      }
    }

    case 'collection-speed':
      return {
        heading: {
          en: 'Customers are taking longer to pay',
          fr: 'Les clients règlent plus lentement',
        },
        body: {
          en: `Debtor days are running at ${n1(d.current)}, about ${n1(d.change)}% above your trailing four-quarter average of ${n1(d.trailingMean)}. Measured against the average rather than last quarter, so ordinary seasonality does not trigger it.`,
          fr: `Le délai de règlement clients atteint ${fr1(d.current)} jours, soit environ ${fr1(d.change)} % au-dessus de votre moyenne des quatre derniers trimestres (${fr1(d.trailingMean)} jours). La comparaison porte sur la moyenne et non sur le trimestre précédent, afin que la saisonnalité habituelle ne déclenche rien.`,
        },
      }

    case 'cash-conversion-extending':
      return {
        heading: {
          en: 'Cash is tied up longer than it was',
          fr: 'La trésorerie est immobilisée plus longtemps',
        },
        body: {
          en: `Your cash conversion cycle has lengthened for ${d.quarters} consecutive quarters, from ${n1(d.from)} to ${n1(d.current)} days — ${n1(d.extensionDays)} days longer. That is stock, debtors and creditors moving together, so it can rise even when no single one of them looks unusual.`,
          fr: `Votre cycle de conversion de trésorerie s'allonge depuis ${d.quarters} trimestres consécutifs, passant de ${fr1(d.from)} à ${fr1(d.current)} jours, soit ${fr1(d.extensionDays)} jours de plus. Stocks, créances et dettes évoluent ensemble : le cycle peut donc s'allonger sans qu'aucun de ces postes ne paraisse anormal isolément.`,
        },
      }
  }
}

// ---------------------------------------------------------------------------
// The GP voice.
//
// Same rules, same numbers, different reader. A partner is scanning a portfolio
// rather than being told about their own company, so this drops the "your
// investor sees this" framing and the invitation to explain — neither means
// anything to the person on this side of the table.
//
// What it does NOT do is assign severity. A rule fired or it did not; there is
// no red and no amber here. Deriving a severity from how far past a threshold a
// value sits would be inventing a model and rendering it as measurement, which
// is the thing this whole change exists to remove. Severity survives only on
// partner observations, where a human put it there.

export interface GpSignalCopy {
  heading: Loc
  detail: Loc
  /** Suggested next steps. Per RULE, not per company — see the note below. */
  steps: Loc[]
}

// These follow from the class of movement, not from the company's situation.
// The authored versions they replace named specific companies and prescribed
// specific consequences ("place on the watch-list", "suspend pending drawdown
// approvals"), which read as findings when they were guesses. Labelled
// "suggested next steps" in the UI for the same reason.
export function gpSignalCopy(signal: CfoSignal): GpSignalCopy {
  const d = signal.detail

  switch (signal.id as CfoSignalId) {
    case 'working-capital-divergence':
      return {
        heading: {
          en: `Creditor days up ${n1(d.creditorsChange)}% while debtor days fell ${n1(Math.abs(d.debtorsChange))}%`,
          fr: `Dettes fournisseurs +${fr1(d.creditorsChange)} %, créances clients −${fr1(Math.abs(d.debtorsChange))} %`,
        },
        detail: {
          en: `Both sides of working capital moved against each other in ${signal.period}. Paying later while collecting sooner supports cash in the quarter without trading better.`,
          fr: `Les deux composantes du besoin en fonds de roulement ont évolué en sens inverse au ${signal.period}. Payer plus tard tout en encaissant plus tôt soutient la trésorerie du trimestre sans amélioration de l'activité.`,
        },
        steps: [
          { en: 'Ask whether supplier terms were renegotiated, and on what basis', fr: 'Demander si les conditions fournisseurs ont été renégociées, et sur quelle base' },
          { en: 'Check whether a large collection landed either side of the quarter end', fr: 'Vérifier si un encaissement important est intervenu de part et d\'autre de la clôture' },
          { en: 'Compare the movement against the same quarter last year before reading it as a trend', fr: 'Comparer avec le même trimestre de l\'exercice précédent avant d\'y voir une tendance' },
        ],
      }

    case 'revenue-cash-divergence':
      return {
        heading: {
          en: `Revenue up ${n1(d.revenueChange)}% with cash at ${n1(d.cashChange)}%`,
          fr: `Chiffre d'affaires +${fr1(d.revenueChange)} %, trésorerie ${fr1(d.cashChange)} %`,
        },
        detail: {
          en: `Growth in ${signal.period} did not convert to cash. Usually collection timing or a working-capital build funding the growth.`,
          fr: `La croissance du ${signal.period} ne s'est pas traduite en trésorerie. Généralement lié au rythme des encaissements ou à une hausse du besoin en fonds de roulement finançant la croissance.`,
        },
        steps: [
          { en: 'Establish whether the gap is timing or a permanent working-capital step-up', fr: 'Déterminer si l\'écart relève du calendrier ou d\'une hausse durable du besoin en fonds de roulement' },
          { en: 'Request a cash flow forecast covering the next two quarters', fr: 'Demander une prévision de trésorerie couvrant les deux prochains trimestres' },
          { en: 'Check facility headroom if the pattern repeats', fr: 'Vérifier la disponibilité des lignes de crédit si le schéma se répète' },
        ],
      }

    case 'gross-margin-outside-band':
      return {
        heading: {
          en: `Gross margin ${n1(d.current)}%, outside its ${n1(d.lower)}–${n1(d.upper)}% band`,
          fr: `Marge brute à ${fr1(d.current)} %, hors de la plage ${fr1(d.lower)}–${fr1(d.upper)} %`,
        },
        detail: {
          en: `${signal.period} sits outside two standard deviations of the trailing six-quarter mean of ${n1(d.trailingMean)}%. Movement at the gross level points at pricing or input costs rather than overheads.`,
          fr: `Le ${signal.period} se situe au-delà de deux écarts-types de la moyenne des six derniers trimestres (${fr1(d.trailingMean)} %). Un mouvement au niveau brut oriente vers les prix ou le coût des intrants, plutôt que vers les frais de structure.`,
        },
        steps: [
          { en: 'Separate price, volume and input cost as drivers before drawing a conclusion', fr: 'Distinguer prix, volumes et coût des intrants avant toute conclusion' },
          { en: 'Ask whether contract renewals or a supplier change fall in this quarter', fr: 'Demander si des renouvellements de contrats ou un changement de fournisseur interviennent sur ce trimestre' },
          { en: 'Confirm no reclassification moved costs between gross and overheads', fr: 'Confirmer qu\'aucune reclassification n\'a déplacé des coûts entre marge brute et frais de structure' },
        ],
      }

    case 'ebitda-margin-outside-band': {
      const grossSteady = d.grossHeldSteady === 1
      return {
        heading: {
          en: `EBITDA margin ${n1(d.current)}%, outside its ${n1(d.lower)}–${n1(d.upper)}% band`,
          fr: `Marge d'EBITDA à ${fr1(d.current)} %, hors de la plage ${fr1(d.lower)}–${fr1(d.upper)} %`,
        },
        detail: {
          en: `${signal.period} sits outside two standard deviations of the trailing six-quarter mean of ${n1(d.trailingMean)}%.${grossSteady ? ' Gross margin stayed inside its own band over the same period, which points at overheads or a one-off rather than pricing.' : ' Gross margin moved as well, so the driver is likelier to be pricing or input costs than overheads.'}`,
          fr: `Le ${signal.period} se situe au-delà de deux écarts-types de la moyenne des six derniers trimestres (${fr1(d.trailingMean)} %).${grossSteady ? ' La marge brute est restée dans sa propre plage sur la même période, ce qui oriente vers les frais de structure ou un élément exceptionnel plutôt que vers les prix.' : ' La marge brute a également varié : le facteur explicatif relève plus probablement des prix ou du coût des intrants que des frais de structure.'}`,
        },
        steps: grossSteady ? [
          { en: 'Build an EBITDA bridge against the prior quarter to isolate the lines that moved', fr: 'Établir un pont d\'EBITDA avec le trimestre précédent pour isoler les postes concernés' },
          { en: 'Ask management to identify any one-off item and confirm whether it recurs', fr: 'Demander à la direction d\'identifier tout élément exceptionnel et de confirmer son caractère récurrent ou non' },
          { en: 'Check whether the overhead base has stepped up permanently', fr: 'Vérifier si la base de frais de structure a augmenté de façon durable' },
        ] : [
          { en: 'Build an EBITDA bridge against the prior quarter to isolate the lines that moved', fr: 'Établir un pont d\'EBITDA avec le trimestre précédent pour isoler les postes concernés' },
          { en: 'Trace the move back to gross margin before examining overheads', fr: 'Rattacher le mouvement à la marge brute avant d\'examiner les frais de structure' },
        ],
      }
    }

    case 'collection-speed':
      return {
        heading: {
          en: `Debtor days ${n1(d.current)}, ${n1(d.change)}% above the trailing average`,
          fr: `Délai clients à ${fr1(d.current)} jours, ${fr1(d.change)} % au-dessus de la moyenne mobile`,
        },
        detail: {
          en: `Measured in ${signal.period} against a trailing four-quarter mean of ${n1(d.trailingMean)} days, so ordinary seasonality does not trigger it. This is collection speed, not an ageing analysis — the submission carries a debtors total and no ageing buckets.`,
          fr: `Mesuré au ${signal.period} par rapport à une moyenne des quatre derniers trimestres de ${fr1(d.trailingMean)} jours, afin que la saisonnalité habituelle ne déclenche rien. Il s'agit de la vitesse de recouvrement et non d'une balance âgée : la transmission comporte un total de créances, sans tranches d'antériorité.`,
        },
        steps: [
          { en: 'Ask whether the slowdown is concentrated in a small number of accounts', fr: 'Demander si le ralentissement se concentre sur un nombre restreint de comptes' },
          { en: 'Request an aged debtors schedule — the submission does not carry one', fr: 'Demander un échéancier des créances : la transmission n\'en comporte pas' },
          { en: 'Review whether credit terms changed in the period', fr: 'Examiner si les conditions de crédit ont évolué sur la période' },
        ],
      }

    case 'cash-conversion-extending':
      return {
        heading: {
          en: `Cash conversion cycle extended ${n1(d.extensionDays)} days over ${d.quarters} quarters`,
          fr: `Cycle de conversion de trésorerie allongé de ${fr1(d.extensionDays)} jours sur ${d.quarters} trimestres`,
        },
        detail: {
          en: `From ${n1(d.from)} to ${n1(d.current)} days, rising in each quarter to ${signal.period}. Stock, debtors and creditors moving together, so the cycle can lengthen while no single one of them looks unusual.`,
          fr: `De ${fr1(d.from)} à ${fr1(d.current)} jours, en progression à chaque trimestre jusqu'au ${signal.period}. Stocks, créances et dettes évoluent ensemble : le cycle peut s'allonger sans qu'aucun de ces postes ne paraisse anormal isolément.`,
        },
        steps: [
          { en: 'Identify which of the three components is driving the extension', fr: 'Identifier laquelle des trois composantes explique l\'allongement' },
          { en: 'Request a 13-week cash flow forecast to assess near-term liquidity', fr: 'Demander une prévision de trésorerie à 13 semaines pour évaluer la liquidité à court terme' },
          { en: 'Assess facility headroom against the additional working capital being absorbed', fr: 'Évaluer la disponibilité des lignes de crédit au regard du besoin en fonds de roulement supplémentaire absorbé' },
        ],
      }
  }
}
