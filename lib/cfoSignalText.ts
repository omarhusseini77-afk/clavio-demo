import type { CfoSignal, CfoSignalId } from './cfoSignals'
import type { Loc } from './loc'

// Wording for the CFO surface, generated from the rule that fired.
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
          fr: `Les dettes fournisseurs progressent de ${n1(d.creditorsChange)} % sur le trimestre tandis que les créances clients reculent de ${n1(Math.abs(d.debtorsChange))} %. Le tableau de bord de votre investisseur relève ce mouvement. S'il y a une explication — renégociation fournisseurs, encaissement important arrivé plus tôt — une ligne dans votre prochaine transmission suffit.`,
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
          fr: `Le chiffre d'affaires augmente de ${n1(d.revenueChange)} % sur le trimestre alors que la trésorerie évolue de ${n1(d.cashChange)} %. C'est le point sur lequel un investisseur revient en premier, généralement lié au rythme des encaissements ou à une hausse du besoin en fonds de roulement. Un mot d'explication dans votre prochaine transmission évite la question.`,
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
          fr: `La marge brute ressort à ${n1(d.current)} %, contre une plage récente de ${n1(d.lower)} à ${n1(d.upper)} %. Un mouvement au niveau brut vient généralement des prix ou du coût des intrants, plutôt que des frais de structure.`,
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
          fr: `La marge d'EBITDA ressort à ${n1(d.current)} %, contre une plage récente de ${n1(d.lower)} à ${n1(d.upper)} %.${grossSteady ? ' La marge brute est restée stable sur la même période, ce qui oriente plutôt vers les frais de structure ou un élément exceptionnel que vers les prix.' : ''} Votre investisseur observe le même mouvement.`,
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
          fr: `Le délai de règlement clients atteint ${n1(d.current)} jours, soit environ ${n1(d.change)} % au-dessus de votre moyenne des quatre derniers trimestres (${n1(d.trailingMean)} jours). La comparaison porte sur la moyenne et non sur le trimestre précédent, afin que la saisonnalité habituelle ne déclenche rien.`,
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
          fr: `Votre cycle de conversion de trésorerie s'allonge depuis ${d.quarters} trimestres consécutifs, passant de ${n1(d.from)} à ${n1(d.current)} jours, soit ${n1(d.extensionDays)} jours de plus. Stocks, créances et dettes évoluent ensemble : le cycle peut donc s'allonger sans qu'aucun de ces postes ne paraisse anormal isolément.`,
        },
      }
  }
}
