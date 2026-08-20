-- Phase 2, Step 1b: move the hardcoded demo data into the schema.
--
-- Values are transcribed verbatim from lib/fundData.ts and the SIGNALS/ANOMALIES
-- constants in components/GPView.tsx, so the rendered demo is unchanged once the
-- views read from here instead of from the bundle.
--
-- Idempotent: re-running only fills what is missing.

-- ---------------------------------------------------------------------------
-- Fund
-- ---------------------------------------------------------------------------
insert into public.funds (
  name, vintage_year, currency, as_of_date, as_of_label_en, as_of_label_fr,
  period_label, total_invested, current_gross_value, gross_irr
)
select 'Fund II', 2022, 'GBP', date '2026-03-31', '31 March 2026', '31 mars 2026',
       'Q1 2026', 16900000, 23500000, 24.1
where not exists (select 1 from public.funds where name = 'Fund II');

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
insert into public.companies (
  fund_id, slug, name, sector_en, sector_fr, country_en, country_fr, currency,
  status, investment_date, ownership, cost, moic, irr, ev_ebitda,
  commentary_en, commentary_fr, trend, in_portfolio
)
select f.id, v.slug, v.name, v.sector_en, v.sector_fr, v.country_en, v.country_fr,
       v.currency, v.status, v.investment_date, v.ownership, v.cost, v.moic,
       v.irr, v.ev_ebitda, v.commentary_en, v.commentary_fr, v.trend::jsonb, v.in_portfolio
from public.funds f
cross join (values
  ('mrj', 'Marlow & Reed Joinery', 'Manufacturing', 'Industrie', 'UK', 'R.-U.', 'GBP',
   'green', 'Jun 2022', 68, 4200000, 1.69, 32.4, 9.2,
   'Revenue grew 21.3% over three years with gross margin expanding from 41% to 43%, a structural gain rather than a one-off. EBITDA rose from £749k to £1.04M and cash more than doubled, with no debt drawn. The balance sheet now supports an add-on.',
   'Le chiffre d''affaires a progressé de 21,3 % sur trois ans, la marge brute passant de 41 % à 43 %, un gain structurel plutôt que ponctuel. L''EBITDA est passé de 749 k£ à 1,04 M£ et la trésorerie a plus que doublé, sans dette tirée. Le bilan permet désormais une acquisition de croissance externe.',
   '[3280000,3450000,3610000,3780000,3980000]', true),

  ('df', 'Delacourt Frères', 'F&B Distribution', 'Distribution agroalimentaire', 'France', 'France', 'EUR',
   'amber', 'Nov 2022', 55, 5100000, 1.35, 18.7, 7.8,
   'Revenue is growing but gross margin has compressed from 28% to 26% as input costs remain elevated. Working capital has tightened — receivables up 26% while cash declined. Management is executing a price-led recovery for H2.',
   'Le chiffre d''affaires croît mais la marge brute s''est contractée de 28 % à 26 %, les coûts des intrants restant élevés. Le besoin en fonds de roulement s''est tendu — créances en hausse de 26 % tandis que la trésorerie a reculé. La direction met en œuvre un redressement par les prix au S2.',
   '[11200000,11800000,12400000,13000000,13680000]', true),

  ('ats', 'Abington Technical Services', 'B2B Services', 'Services B2B', 'UK', 'R.-U.', 'GBP',
   'green', 'Apr 2023', 72, 4400000, 1.34, 22.1, 8.9,
   'Strong performance across all metrics. Revenue up 37.8% over three years with consistent margin expansion. The B2B services model generates high cash conversion — cash has grown to £3.6M. Pipeline supports continued growth into FY26.',
   'Performance solide sur tous les indicateurs. Chiffre d''affaires en hausse de 37,8 % sur trois ans avec une expansion régulière des marges. Le modèle de services B2B génère une forte conversion en trésorerie — celle-ci a atteint 3,6 M£. Le carnet de commandes soutient la croissance jusqu''en EX26.',
   '[5980000,6400000,7100000,7600000,8240000]', true),

  ('asp', 'Atelier Saint-Pierre', 'Specialty Mfg', 'Fabrication spécialisée', 'France', 'France', 'EUR',
   'amber', 'Sep 2023', 61, 3200000, 1.09, 4.8, 6.4,
   'Revenue is growing modestly but profitability is declining as gross margins compress. Cash has fallen from €920k to €640k while receivables have grown. Working capital management is a priority and the team is reviewing pricing and operational costs.',
   'Le chiffre d''affaires croît modestement mais la rentabilité décline à mesure que les marges brutes se contractent. La trésorerie est passée de 920 k€ à 640 k€ tandis que les créances ont augmenté. La gestion du besoin en fonds de roulement est une priorité et l''équipe revoit la tarification et les coûts opérationnels.',
   '[3840000,3900000,3980000,4100000,4210000]', true),

  -- Supervised but not LP-facing holdings: these two exist only in the GP
  -- anomaly feed today, with no accounts of their own.
  ('halcyon', 'Halcyon Textiles', 'Textiles', 'Textile', 'UK', 'R.-U.', 'GBP',
   'red', null, null, null, null, null, null, null, null, '[]', false),

  ('sentinel', 'Sentinel Security NW', 'B2B Services', 'Services B2B', 'UK', 'R.-U.', 'GBP',
   'amber', null, null, null, null, null, null, null, null, '[]', false)
) as v(slug, name, sector_en, sector_fr, country_en, country_fr, currency,
       status, investment_date, ownership, cost, moic, irr, ev_ebitda,
       commentary_en, commentary_fr, trend, in_portfolio)
where f.name = 'Fund II'
  and not exists (
    select 1 from public.companies c where c.fund_id = f.id and c.slug = v.slug
  );

-- ---------------------------------------------------------------------------
-- Annual accounts — headline
-- ---------------------------------------------------------------------------
insert into public.company_years (company_id, fy, revenue, gross_margin, ebitda, net_profit)
select c.id, v.fy, v.revenue, v.gross_margin, v.ebitda, v.net_profit
from public.companies c
join (values
  ('mrj', 'FY23', 3280000, 41, 749000, 562000),
  ('mrj', 'FY24', 3610000, 42, 889000, 702000),
  ('mrj', 'FY25', 3980000, 43, 1040000, 824000),
  ('df',  'FY23', 11200000, 28, 980000, 620000),
  ('df',  'FY24', 12400000, 27, 1050000, 680000),
  ('df',  'FY25', 13680000, 26, 1120000, 710000),
  ('ats', 'FY23', 5980000, 52, 1240000, 890000),
  ('ats', 'FY24', 7100000, 53, 1580000, 1120000),
  ('ats', 'FY25', 8240000, 54, 1920000, 1380000),
  ('asp', 'FY23', 3840000, 38, 580000, 320000),
  ('asp', 'FY24', 3980000, 37, 540000, 290000),
  ('asp', 'FY25', 4210000, 36, 510000, 270000)
) as v(slug, fy, revenue, gross_margin, ebitda, net_profit) on v.slug = c.slug
where not exists (
  select 1 from public.company_years cy where cy.company_id = c.id and cy.fy = v.fy
);

-- ---------------------------------------------------------------------------
-- Annual accounts — working capital. LPs cannot read this table.
-- ---------------------------------------------------------------------------
insert into public.company_year_internals (company_year_id, cash, receivables, payables)
select cy.id, v.cash, v.receivables, v.payables
from public.company_years cy
join public.companies c on c.id = cy.company_id
join (values
  ('mrj', 'FY23', 1270000, 572000, 163000),
  ('mrj', 'FY24', 2490000, 639000, 337000),
  ('mrj', 'FY25', 2980000, 692000, 412000),
  ('df',  'FY23', 1840000, 2100000, 890000),
  ('df',  'FY24', 1650000, 2380000, 1020000),
  ('df',  'FY25', 1420000, 2640000, 1180000),
  ('ats', 'FY23', 2100000, 980000, 310000),
  ('ats', 'FY24', 2840000, 1240000, 380000),
  ('ats', 'FY25', 3620000, 1490000, 440000),
  ('asp', 'FY23', 920000, 710000, 290000),
  ('asp', 'FY24', 780000, 820000, 340000),
  ('asp', 'FY25', 640000, 890000, 390000)
) as v(slug, fy, cash, receivables, payables) on v.slug = c.slug and v.fy = cy.fy
where not exists (
  select 1 from public.company_year_internals i where i.company_year_id = cy.id
);

insert into public.company_internals (company_id, net_debt)
select c.id, v.net_debt
from public.companies c
join (values
  ('mrj', 420000), ('df', 1840000), ('ats', 310000), ('asp', 890000)
) as v(slug, net_debt) on v.slug = c.slug
where not exists (
  select 1 from public.company_internals i where i.company_id = c.id
);

-- ---------------------------------------------------------------------------
-- Tenancy backfill
-- ---------------------------------------------------------------------------
-- The 13 existing quarters are Marlow & Reed Joinery's: the GP notification
-- records it as the submitter, and quarterly turnover of ~£1.0M annualises to
-- its £3.98M FY25 revenue.
update public.quarters
set company_id = (select id from public.companies where slug = 'mrj')
where company_id is null;

update public.profiles p
set fund_id = (select id from public.funds where name = 'Fund II')
where p.role in ('gp', 'lp') and p.fund_id is null;

update public.profiles p
set company_id = (select id from public.companies where slug = 'mrj')
where p.role = 'submit' and p.company_id is null;

-- ---------------------------------------------------------------------------
-- Investor position
-- ---------------------------------------------------------------------------
insert into public.lp_positions (
  fund_id, profile_id, commitment, called, unfunded, distributed,
  nav, share_of_fund, tvpi, dpi, rvpi, irr
)
select f.id, p.id, 5000000, 3850000, 1150000, 1240000,
       5220000, 14.8, 1.68, 0.32, 1.36, 18.4
from public.funds f
join public.profiles p on p.role = 'lp'
where f.name = 'Fund II'
  and not exists (
    select 1 from public.lp_positions lp where lp.fund_id = f.id and lp.profile_id = p.id
  );

insert into public.capital_events (
  lp_position_id, event_date, date_label_en, date_label_fr, type, label_en, label_fr, amount
)
select lp.id, v.event_date::date, v.date_en, v.date_fr, v.type, v.label_en, v.label_fr, v.amount
from public.lp_positions lp
cross join (values
  ('2022-06-15', '15 Jun 2022', '15 juin 2022', 'call', 'Capital Call 1 · Initial deployment', 'Appel de fonds 1 · Déploiement initial', 750000),
  ('2022-11-20', '20 Nov 2022', '20 nov. 2022', 'call', 'Capital Call 2', 'Appel de fonds 2', 600000),
  ('2023-04-18', '18 Apr 2023', '18 avr. 2023', 'call', 'Capital Call 3', 'Appel de fonds 3', 550000),
  ('2023-09-22', '22 Sep 2023', '22 sept. 2023', 'call', 'Capital Call 4', 'Appel de fonds 4', 500000),
  ('2024-03-14', '14 Mar 2024', '14 mars 2024', 'call', 'Capital Call 5', 'Appel de fonds 5', 550000),
  ('2024-05-12', '12 May 2024', '12 mai 2024', 'distribution', 'Distribution 1 · Delacourt dividend recap', 'Distribution 1 · Recap. dividende Delacourt', 380000),
  ('2024-09-19', '19 Sep 2024', '19 sept. 2024', 'call', 'Capital Call 6 · Abington add-on', 'Appel de fonds 6 · Croissance externe Abington', 450000),
  ('2024-11-28', '28 Nov 2024', '28 nov. 2024', 'distribution', 'Distribution 2 · Portfolio refinancing', 'Distribution 2 · Refinancement du portefeuille', 420000),
  ('2025-11-20', '20 Nov 2025', '20 nov. 2025', 'distribution', 'Distribution 3', 'Distribution 3', 440000),
  ('2026-04-02', '02 Apr 2026', '02 avr. 2026', 'call', 'Capital Call 7', 'Appel de fonds 7', 450000)
) as v(event_date, date_en, date_fr, type, label_en, label_fr, amount)
where not exists (
  select 1 from public.capital_events ce
  where ce.lp_position_id = lp.id and ce.event_date = v.event_date::date and ce.label_en = v.label_en
);

insert into public.forecasts (
  lp_position_id,
  next_call_period_en, next_call_period_fr, next_call_amount, next_call_note_en, next_call_note_fr,
  next_distribution_period_en, next_distribution_period_fr, next_distribution_amount,
  next_distribution_note_en, next_distribution_note_fr,
  projected_distributions_18m, through_en, through_fr
)
select lp.id,
  'Q3 2026', 'T3 2026', 450000,
  'Planned add-on acquisition at Abington Technical Services',
  'Acquisition de croissance externe prévue chez Abington Technical Services',
  'Q4 2026', 'T4 2026', 320000,
  'Expected from Marlow & Reed recapitalisation',
  'Attendue de la recapitalisation de Marlow & Reed',
  1600000, 'Through 2027', 'Jusqu''en 2027'
from public.lp_positions lp
where not exists (select 1 from public.forecasts f where f.lp_position_id = lp.id);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
insert into public.documents (
  fund_id, title_en, title_fr, type_en, type_fr, type_key, doc_date, date_label, is_new, sort_order
)
select f.id, v.title_en, v.title_fr, v.type_en, v.type_fr, v.type_key,
       v.doc_date::date, v.date_label, v.is_new, v.sort_order
from public.funds f
cross join (values
  ('Q1 2026 Quarterly Report', 'Rapport trimestriel T1 2026', 'Report', 'Rapport', 'Report', '2026-04-16', '16 Apr 2026', true, 1),
  ('Capital Call Notice · Call 7', 'Avis d''appel de fonds · Appel 7', 'Notice', 'Avis', 'Notice', '2026-04-02', '02 Apr 2026', true, 2),
  ('Q4 2025 Quarterly Report', 'Rapport trimestriel T4 2025', 'Report', 'Rapport', 'Report', '2026-01-18', '18 Jan 2026', false, 3),
  ('2025 Annual Report & Audited Accounts', 'Rapport annuel 2025 & comptes audités', 'Report', 'Rapport', 'Report', '2026-01-12', '12 Jan 2026', false, 4),
  ('Distribution Notice · Dist 3', 'Avis de distribution · Distribution 3', 'Notice', 'Avis', 'Notice', '2025-11-20', '20 Nov 2025', false, 5),
  ('Q3 2025 Quarterly Report', 'Rapport trimestriel T3 2025', 'Report', 'Rapport', 'Report', '2025-10-15', '15 Oct 2025', false, 6),
  ('2024 Tax Statement', 'Relevé fiscal 2024', 'Tax', 'Fiscal', 'Tax', '2025-03-30', '30 Mar 2025', false, 7)
) as v(title_en, title_fr, type_en, type_fr, type_key, doc_date, date_label, is_new, sort_order)
where f.name = 'Fund II'
  and not exists (
    select 1 from public.documents d where d.fund_id = f.id and d.title_en = v.title_en
  );

-- ---------------------------------------------------------------------------
-- Anomalies and signals
-- ---------------------------------------------------------------------------
insert into public.anomalies (
  company_id, level, is_signal, title_en, title_fr, detail_en, detail_fr,
  actions_en, actions_fr, sort_order
)
select c.id, v.level, v.is_signal, v.title_en, v.title_fr, v.detail_en, v.detail_fr,
       v.actions_en::jsonb, v.actions_fr::jsonb, v.sort_order
from public.companies c
join (values
  -- Objective Signals strip
  ('halcyon', 'red', true, null, null,
   'Lost client >5% · Bank discussions · Miss next target',
   'Perte client >5 % · Discussions bancaires · Objectif suivant manqué',
   '[]', '[]', 1),
  ('sentinel', 'amber', true, null, null,
   'Miss next target', 'Objectif suivant manqué', '[]', '[]', 2),

  -- Full anomalies
  ('halcyon', 'red', false,
   'EBITDA margin contracted 4.2pp month-over-month',
   'Marge d''EBITDA en baisse de 4,2 pts sur un mois',
   'Outside the 95% confidence band of the trailing 6 months. Bad debt also up 14% on receivables.',
   'Hors de l''intervalle de confiance à 95 % des 6 derniers mois. Créances douteuses également en hausse de 14 %.',
   '["Request management''s written explanation for the 4.2pp EBITDA margin contraction — isolate cost vs. revenue driver","Run an EBITDA bridge vs. the prior quarter to identify the specific line items driving the move","Investigate the 14% receivables increase — request a full aged debtors schedule and top-10 debtor breakdown","Place Halcyon Textiles on the formal watch-list; schedule a partner call within 10 business days"]',
   '["Demander à la direction une explication écrite sur la contraction de 4,2 pts de la marge EBITDA — isoler l''origine (coûts vs. CA)","Établir un pont EBITDA par rapport au trimestre précédent pour identifier les postes en cause","Analyser la hausse de 14 % des créances — demander un échéancier complet des débiteurs et les 10 principaux clients","Inscrire Halcyon Textiles sur la liste de surveillance formelle ; planifier un appel associé sous 10 jours ouvrés"]',
   3),

  ('sentinel', 'amber', false,
   'Reported EBITDA inconsistent with prior pattern',
   'EBITDA déclaré incohérent avec la tendance passée',
   'Variance from 6-month trailing average exceeds 2σ. Flagged for partner review.',
   'L''écart par rapport à la moyenne mobile sur 6 mois dépasse 2σ. Signalé pour revue des associés.',
   '["Request management accounts for the last 3 months to independently validate the reported EBITDA figure","Cross-reference with the most recent board pack — check for restatements, reclassifications, or one-off items","Ask management to confirm the absence of accounting adjustments that may have suppressed the reported number","Suspend pending drawdown approvals until a satisfactory written explanation is received"]',
   '["Demander les comptes de gestion des 3 derniers mois pour valider indépendamment le chiffre d''EBITDA déclaré","Croiser avec le dernier board pack — vérifier tout redressement, reclassification ou élément exceptionnel","Demander à la direction de confirmer l''absence d''ajustements comptables ayant pu minorer le chiffre déclaré","Suspendre les approbations de tirage en attente jusqu''à réception d''une explication écrite satisfaisante"]',
   4),

  ('halcyon', 'amber', false,
   'Receivables aging — 18% in 30+ day bucket',
   'Vieillissement des créances — 18 % à plus de 30 jours',
   'Up from 9% three months ago. Trend warrants follow-up with management.',
   'Contre 9 % il y a trois mois. La tendance justifie un suivi avec la direction.',
   '["Request a full aged debtors schedule — identify the top-5 overdue accounts by value and days outstanding","Assess whether the overdue receivables are concentrated in the recently lost client (>5% of revenue)","Review credit terms and collections procedures with the CFO — set a 30-day remediation target","Evaluate whether a specific bad debt provision is required and model the downside P&L impact if the bucket does not normalise"]',
   '["Demander l''échéancier complet des débiteurs — identifier les 5 principaux comptes en retard par montant et ancienneté","Évaluer si les créances en retard sont concentrées sur le client récemment perdu (>5 % du CA)","Examiner les conditions de crédit et procédures de recouvrement avec le DG financier — fixer un objectif de remédiation à 30 jours","Évaluer si une provision pour créances douteuses est nécessaire et modéliser l''impact négatif sur le résultat si le solde ne se normalise pas"]',
   5),

  ('asp', 'amber', false,
   'Working capital tightened for second consecutive quarter',
   'Besoin en fonds de roulement en tension pour le deuxième trimestre consécutif',
   'Cash conversion cycle extended by 18 days vs. the same period last year. Trade creditors are being stretched to fund operations.',
   'Le cycle de conversion de trésorerie s''est allongé de 18 jours par rapport à la même période l''année dernière. Les fournisseurs sont sollicités pour financer l''exploitation.',
   '["Review the cash flow statement line by line with the CFO — identify the primary driver of the working capital build","Assess current headroom on the revolving credit facility and model cash requirements for the next two quarters","Request a 13-week cash flow forecast from management to assess near-term liquidity risk","Consider whether a short-term shareholder loan is warranted as a bridging measure pending a working capital improvement plan"]',
   '["Examiner le tableau de flux de trésorerie ligne par ligne avec le DG financier — identifier le principal facteur de tension du BFR","Évaluer la disponibilité de la ligne de crédit revolving et modéliser les besoins de trésorerie pour les deux prochains trimestres","Demander à la direction une prévision de trésorerie sur 13 semaines pour évaluer le risque de liquidité à court terme","Envisager si un prêt d''actionnaire à court terme est justifié comme mesure de transition dans l''attente d''un plan d''amélioration du BFR"]',
   6)
) as v(slug, level, is_signal, title_en, title_fr, detail_en, detail_fr,
       actions_en, actions_fr, sort_order) on v.slug = c.slug
where not exists (
  select 1 from public.anomalies a
  where a.company_id = c.id and a.sort_order = v.sort_order
);
