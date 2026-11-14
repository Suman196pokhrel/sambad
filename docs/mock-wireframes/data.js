/*
 * Sambad clickable mock: seeded demo data.
 * Everything the mock shows (people, documents, scripted answers, admin
 * numbers) lives here so app.js stays about behaviour, not content.
 * Nothing in this file talks to a server; it is a stand-in for the real API.
 */
window.DATA = {
  workspace: 'Acme',
  password: 'password123',
  otp: '428913',

  users: {
    priya: { name: 'Priya Mehta', short: 'Priya M.', email: 'priya@acme.com', role: 'employee' },
    suman: { name: 'Suman Pokhrel', short: 'Suman P.', email: 'suman@acme.com', role: 'admin' },
  },

  // Documents an answer can cite. before / passage / after feed the source panel.
  docs: {
    refunds: { title: 'Billing & Refunds Policy', src: 'Confluence', space: 'Finance', updated: 'updated 3 days ago',
      before: 'Section 4. Refunds. This policy applies to every subscription billed directly by Acme, whether bought self-serve or through sales.',
      passage: 'Annual plans can be refunded in full within 30 days of purchase. Monthly plans are not refundable, but cancelling stops the next charge.',
      after: 'Requests go through the billing portal or to billing@acme.com. Processing times are covered in the Finance Ops Handbook.' },
    financeOps: { title: 'Finance Ops Handbook', src: 'Confluence', space: 'Finance', updated: 'updated 5 weeks ago',
      before: 'Chapter 7 covers cancellations, credits and refunds for direct customers.',
      passage: 'After the 30-day window, annual plans are refunded on a prorated basis from the cancellation date. Prorated refunds are processed within two billing cycles.',
      after: 'Refunds above $10,000 need a second approver from the finance leads group.' },
    reseller: { title: 'Partner & Reseller Agreement', src: 'Google Drive', space: 'Partnerships', updated: 'updated 6 days ago',
      before: 'Clause 9. Customer remedies.',
      passage: 'Customers who purchased through an authorised reseller are refunded by that reseller under its own terms. Acme does not issue refunds directly for reseller purchases.',
      after: 'Resellers must notify Acme of any refund within 14 days so licences can be revoked.' },
    vendorRunbook: { title: 'Vendor Payment Runbook', src: 'Confluence', space: 'Finance', updated: 'not updated in 14 months, worth double-checking', stale: true, admin: 'vendor-runbook',
      before: 'This runbook covers invoices from contractors and small vendors.',
      passage: 'Contractors email invoices to accounts@acme.com by the 5th of the month. Approved invoices are paid on the 15th.',
      after: 'Late invoices roll over to the next payment run.' },
    handbookLeave: { title: 'Employee Handbook: Leave', src: 'Notion', space: 'People', updated: 'updated 2 months ago',
      before: 'Leave applies to permanent full-time and part-time employees.',
      passage: 'Permanent employees accrue 10 days of paid sick leave per year, available from their first day.',
      after: 'Part-time employees accrue sick leave pro rata.' },
    handbookExit: { title: 'Employee Handbook: Exit', src: 'Notion', space: 'People', updated: 'updated 3 weeks ago',
      before: 'Leaving Acme. This page covers resignation and termination.',
      passage: 'Once probation is complete, the notice period is four weeks for either party. During probation it is one week.',
      after: 'Your manager and People Ops agree your final working day in writing.' },
    oncall: { title: 'On-call Handbook', src: 'Confluence', space: 'Engineering', updated: 'updated 1 week ago',
      before: 'Who is on call, and how hand-overs work.',
      passage: 'Rotations run weekly and hand over on Monday at 09:00. The live schedule is in PagerDuty under Backend. Swaps need sign-off from your team lead.',
      after: 'Tier-2 is paged only if tier-1 has not acknowledged within 10 minutes.' },
    travel: { title: 'Travel Policy 2024', src: 'Google Drive', space: 'Finance', updated: 'not updated in 19 months, worth double-checking', stale: true, admin: 'travel-2024',
      before: 'Booking work travel.',
      passage: 'Book flights through Navan so they are billed centrally. Economy is standard under 6 hours; longer flights can be premium economy with manager approval.',
      after: 'Hotels are capped by city; see the appendix.' },
    expenses: { title: 'Expense Guide', src: 'Confluence', space: 'Finance', updated: 'updated 2 weeks ago',
      before: 'Claiming money back.',
      passage: 'If you paid for something yourself, submit the receipt in Expensify within 30 days.',
      after: 'Claims over 90 days old are not reimbursed.' },
    parental: { title: 'Parental Leave: Australia', src: 'Notion', space: 'People', updated: 'updated 4 months ago',
      before: 'This page applies to employees on Australian contracts.',
      passage: 'Primary carers receive 18 weeks of paid leave from Acme on top of the government scheme. Secondary carers receive 4 weeks. Both can be taken any time in the first year.',
      after: 'Tell People Ops at least 10 weeks before you plan to start leave.' },
    itSetup: { title: 'Onboarding: IT Setup', src: 'Confluence', space: 'IT', updated: 'not updated in 11 months, worth double-checking', stale: true, admin: 'it-setup',
      before: 'Getting a new laptop ready.',
      passage: 'Install Tailscale from the Self Service app and sign in with your work account. The laptop is approved automatically once it is enrolled in device management.',
      after: 'If enrolment fails, raise a ticket in #it-help.' },
    contractorProc: { title: 'Contractor Engagement Process', src: 'Confluence', space: 'People', updated: 'updated 3 weeks ago',
      before: 'Bringing a contractor on board.',
      passage: 'New contractor engagements are approved by the department head of the hiring manager. The signed agreement goes to People Ops before day one.',
      after: 'Extensions follow the same approval path.' },
  },

  // Scripted answers. Order matters: the first scenario whose keywords match wins.
  // [n] in an answer becomes citation n, pointing at sources[n-1].
  scenarios: [
    { id: 'reseller', q: 'Does that apply to plans bought through a reseller?', keys: ['reseller', 'partner'], kind: 'answer', found: 3,
      answer: 'No. Reseller purchases are refunded by the reseller under their own terms [1]. Acme does not issue those refunds directly, so point the customer back to whoever sold them the plan [1].',
      sources: ['reseller'] },
    { id: 'refund', q: "What's our refund policy for annual plans?", keys: ['refund', 'annual', 'cancel'], kind: 'answer', found: 4,
      answer: 'Annual plans can be refunded in full within 30 days of purchase [1]. After that, refunds are prorated from the cancellation date and processed within two billing cycles [2]. Monthly plans are not refundable, but cancelling stops the next charge [1].',
      sources: ['refunds', 'financeOps'], followUp: 'Does that apply to plans bought through a reseller?' },
    { id: 'invoice', q: 'How do contractors submit invoices?', keys: ['invoice'], kind: 'answer', found: 2,
      answer: 'Contractor invoices go to accounts@acme.com by the 5th of the month and are paid on the 15th [1]. Anything late rolls into the next month [1].',
      sources: ['vendorRunbook'] },
    { id: 'sick', q: 'How many sick days do contractors get?', keys: ['sick', 'contractor leave', 'holiday'], kind: 'abstain', found: 2,
      text: 'Your handbook covers sick leave for employees, but says nothing about contractors. Rather than guess, here is the closest thing it does say:',
      near: 'handbookLeave', person: 'People Ops' },
    { id: 'notice', q: "What's the notice period and how much is the payout?", keys: ['notice', 'payout', 'resign'], kind: 'partial', found: 3,
      answer: 'Notice is four weeks for anyone past probation [1]. During probation it is one week either way [1].',
      missingTitle: "I couldn't find the payout part.",
      missing: "Nothing in your documents covers payout amounts on notice. People Ops would know.",
      sources: ['handbookExit'] },
    { id: 'oncall', q: "What's the on-call rotation?", keys: ['on-call', 'oncall', 'rotation', 'pager'], kind: 'answer', found: 3,
      answer: 'On-call runs in weekly shifts that hand over on Monday at 09:00 [1]. The live schedule is in PagerDuty under Backend, and any swap needs sign-off from your team lead [1].',
      sources: ['oncall'] },
    { id: 'flight', q: 'How do I expense a flight?', keys: ['flight', 'expense', 'travel'], kind: 'answer', found: 4,
      answer: 'Book flights through Navan so they are billed centrally [1]. Economy is standard for flights under 6 hours; longer ones can be premium economy with manager approval [1]. If you paid yourself, submit the receipt in Expensify within 30 days [2].',
      sources: ['travel', 'expenses'] },
    { id: 'vendor', q: 'Who signs off on new vendors?', keys: ['vendor', 'security review', 'saas'], kind: 'abstain', found: 2,
      text: 'Your documents explain how vendors get paid, but nothing says who approves a new one or how the security review works. Rather than guess, here is the closest thing they do say:',
      near: 'vendorRunbook', person: 'Procurement' },
    { id: 'parental', q: 'How much parental leave do we get in Australia?', keys: ['parental', 'maternity', 'paternity'], kind: 'answer', found: 3,
      answer: 'Primary carers in Australia get 18 weeks of paid leave from Acme on top of the government scheme [1]. Secondary carers get 4 weeks [1]. Both can be taken any time in the first year, with 10 weeks notice to People Ops [1].',
      sources: ['parental'] },
    { id: 'vpn', q: 'How do I set up VPN on a new laptop?', keys: ['vpn', 'laptop', 'tailscale'], kind: 'answer', found: 2,
      answer: 'Install Tailscale from the Self Service app, then sign in with your work account [1]. Your laptop is approved automatically once it is enrolled in device management [1].',
      sources: ['itSetup'] },
    { id: 'contractorApproval', q: 'Who approves contractor engagements?', keys: ['approve', 'approves', 'engagement'], kind: 'answer', found: 3,
      answer: 'The department head of the hiring manager approves new contractor engagements [1]. The signed agreement has to reach People Ops before the first day [1].',
      sources: ['contractorProc'] },
  ],
  fallback: { id: 'fallback', kind: 'abstain', found: 0,
    text: "Nothing in your documents covers this yet. Rather than guess, I'd point you to a person who would know.",
    person: 'your admin' },

  starters: ["What's our refund policy for annual plans?", 'How do contractors submit invoices?',
    'How many sick days do contractors get?', "What's the notice period and how much is the payout?"],

  history: [
    { id: 'h1', title: 'Parental leave in Australia', sid: 'parental', group: 'Earlier this week' },
    { id: 'h2', title: 'VPN setup for new laptops', sid: 'vpn', group: 'Earlier this week' },
    { id: 'h3', title: 'Who approves contractors?', sid: 'contractorApproval', group: 'Earlier this week' },
    { id: 'h4', title: 'Expense limits for travel', sid: 'flight', group: 'Older' },
  ],

  /* ── admin ─────────────────────────────────────── */
  kpis: {
    '24h': { docs: 1284, asked: 52, answered: 88, stale: 18, delta: '↑ 4% on yesterday', bars: [20, 35, 60, 45, 80, 55, 30] },
    '7d':  { docs: 1284, asked: 341, answered: 86, stale: 18, delta: '↑ 12% on last week', bars: [30, 52, 24, 70, 96, 40, 34] },
    '30d': { docs: 1284, asked: 1408, answered: 84, stale: 18, delta: '↑ 31% on last month', bars: [44, 58, 62, 50, 71, 66, 90] },
  },
  ageBars: [88, 64, 46, 30, 22, 54],

  connectors: [
    { id: 'confluence', name: 'Confluence', docs: 1102, status: 'healthy', synced: '4 minutes ago', freq: 'Every 15 minutes' },
    { id: 'gdrive', name: 'Google Drive', docs: 182, status: 'failing', synced: '2 days ago', freq: 'Every hour' },
  ],
  sourceTypes: {
    Confluence: ['Engineering', 'Finance', 'People Ops', 'Product', 'Sales'],
    'Google Drive': ['Shared drives', 'Finance', 'Partnerships', 'Leadership'],
    Notion: ['Company wiki', 'People', 'Engineering docs', 'Design'],
    SharePoint: ['Intranet', 'Legal', 'HR'],
    'Upload files': [],
  },
  sampleFiles: [
    { name: 'Security Overview 2026.pdf', size: '2.4 MB' }, { name: 'Office Handbook.docx', size: '820 KB' },
    { name: 'Benefits Summary.pdf', size: '1.1 MB' }, { name: 'Incident Process.md', size: '14 KB' },
  ],

  staleDocs: [
    { id: 'vendor-runbook', title: 'Vendor Payment Runbook', src: 'Confluence', age: '14 months ago', cited: 19 },
    { id: 'it-setup', title: 'Onboarding: IT Setup', src: 'Confluence', age: '11 months ago', cited: 14 },
    { id: 'travel-2024', title: 'Travel Policy 2024', src: 'Google Drive', age: '19 months ago', cited: 10 },
  ],

  documents: {
    'vendor-runbook': { title: 'Vendor Payment Runbook', src: 'Confluence', space: 'Finance space', changed: '14 mo', cited: 19, chunks: 24, restricted: 3,
      rules: [['allow', 'finance-team', '14 people', 'Whole document'], ['allow', 'all-staff', '312 people', 'Chunks 1 to 18, 22 to 24'], ['deny', 'contractors', '26 people', 'Chunks 19 to 21, bank details']],
      rows: [[17, 'Contractors email invoices to accounts@acme.com by the 5th of the month.', 'all-staff', 8], [18, 'Approved invoices are paid on the 15th. Late invoices roll over.', 'all-staff', 6],
        [19, 'Payments leave from the operating account, BSB 062-000, account ending 4471.', 'finance only', 2], [20, 'Bank detail changes need a call-back to a known number before approval.', 'finance only', 1]] },
    'it-setup': { title: 'Onboarding: IT Setup', src: 'Confluence', space: 'IT space', changed: '11 mo', cited: 14, chunks: 12, restricted: 0,
      rules: [['allow', 'all-staff', '312 people', 'Whole document']],
      rows: [[3, 'Install Tailscale from the Self Service app and sign in with your work account.', 'all-staff', 9], [4, 'The laptop is approved automatically once enrolled in device management.', 'all-staff', 5]] },
    'travel-2024': { title: 'Travel Policy 2024', src: 'Google Drive', space: 'Finance drive', changed: '19 mo', cited: 10, chunks: 9, restricted: 0,
      rules: [['allow', 'all-staff', '312 people', 'Whole document']],
      rows: [[1, 'Book flights through Navan so they are billed centrally.', 'all-staff', 6], [2, 'Economy is standard under 6 hours; longer flights can be premium economy.', 'all-staff', 4]] },
  },

  run: { id: 1042, source: 'Google Drive', checked: 182, unchanged: 168, reindexed: 9, failed: 5,
    failures: [
      { doc: 'Q3 Board Pack.pdf', reason: "Couldn't read the file. It may be scanned images.", attempts: 3, retry: 'fail' },
      { doc: 'Regional Pricing.xlsx', reason: 'Access denied by Google Drive', attempts: 3, retry: 'fail' },
      { doc: 'Team Offsite Notes', reason: 'Timed out while fetching', attempts: 2, retry: 'ok' },
      { doc: 'Hiring Plan H2', reason: 'Timed out while fetching', attempts: 1, retry: 'ok' },
      { doc: 'Brand Guidelines v3.pdf', reason: 'File is larger than the 50 MB limit', attempts: 1, retry: 'fail' },
    ] },

  audit: [
    { time: '14:32', day: 0, person: 'Priya M.', q: "What's our refund policy for annual plans?", used: ['Billing & Refunds Policy, piece 4', 'Billing & Refunds Policy, piece 5', 'Finance Ops Handbook, piece 31'], withheld: [] },
    { time: '14:20', day: 0, person: 'Dev K.', q: 'How do contractors submit invoices?', used: ['Vendor Payment Runbook, piece 17', 'Vendor Payment Runbook, piece 18'],
      withheld: [['Vendor Payment Runbook, piece 19', 'Bank details, finance-team only', 'deny rule'], ['Vendor Payment Runbook, piece 20', 'Bank details, finance-team only', 'deny rule'], ['Regional Pricing 2026, piece 4', 'Not a member of pricing-committee', 'no allow rule']] },
    { time: '13:58', day: 0, person: 'Ana R.', q: 'How many sick days do contractors get?', used: [], withheld: [] },
    { time: '11:05', day: 0, person: 'Sam T.', q: 'What are the salary bands for senior engineers?', used: ['Career Ladder: Engineering, piece 2'],
      withheld: [['Compensation Bands, piece 7', 'Not a member of people-leads', 'no allow rule'], ['Compensation Bands, piece 8', 'Not a member of people-leads', 'no allow rule']] },
    { time: '09:41', day: 0, person: 'Priya M.', q: "What's the on-call rotation?", used: ['On-call Handbook, piece 2', 'On-call Handbook, piece 3'], withheld: [] },
    { time: 'Tue 16:12', day: 3, person: 'Dev K.', q: 'How do I set up VPN on a new laptop?', used: ['Onboarding: IT Setup, piece 3'], withheld: [] },
    { time: 'Mon 10:27', day: 4, person: 'Ana R.', q: 'Who signs off on new vendors?', used: ['Vendor Payment Runbook, piece 2'], withheld: [['Vendor Payment Runbook, piece 19', 'Bank details, finance-team only', 'deny rule']] },
  ],

  people: {
    'Dev K.': { groups: [['all-staff', 0, 'direct'], ['engineering', 0, 'direct'], ['backend-guild', 1, 'inherited'], ['oncall-tier-2', 2, 'inherited'], ['contractors', 0, 'deny source']],
      see: 1061, partial: 37, none: 186, docs: [['Vendor Payment Runbook', 21, 3, 'deny rule for contractors'], ['Compensation Bands', 4, 28, 'no allow rule']] },
    'Priya M.': { groups: [['all-staff', 0, 'direct'], ['engineering', 0, 'direct'], ['backend-guild', 1, 'inherited'], ['oncall-tier-2', 2, 'direct']],
      see: 1188, partial: 12, none: 84, docs: [['Compensation Bands', 4, 28, 'no allow rule'], ['Regional Pricing 2026', 2, 9, 'no allow rule']] },
    'Ana R.': { groups: [['all-staff', 0, 'direct'], ['finance-team', 0, 'direct']],
      see: 1240, partial: 6, none: 38, docs: [['Board Minutes 2026', 0, 14, 'no allow rule']] },
  },

  groups: [
    { id: 'all-staff', lvl: 0, n: 312, members: [['Dev K.', 'direct', 34], ['Ana R.', 'direct', 12], ['Priya M.', 'direct', 41], ['Sam T.', 'direct', 9]] },
    { id: 'engineering', lvl: 1, n: 84, members: [['Dev K.', 'direct', 34], ['Priya M.', 'direct', 41]] },
    { id: 'backend-guild', lvl: 2, n: 21, members: [['Dev K.', 'direct', 34], ['Ana R.', 'direct', 12], ['Priya M.', 'oncall-tier-2', 41]] },
    { id: 'frontend-guild', lvl: 2, n: 19, members: [['Lena W.', 'direct', 22], ['Omar S.', 'direct', 7]] },
    { id: 'finance-team', lvl: 1, n: 14, members: [['Ana R.', 'direct', 12], ['Grace L.', 'direct', 18]] },
    { id: 'contractors', lvl: 0, n: 26, members: [['Dev K.', 'direct', 34], ['Tom B.', 'direct', 3]] },
  ],

  gaps: [
    { id: 'g1', title: 'Contractor leave and benefits', people: 12, asks: 17, status: 'open',
      ex: ['How many sick days do contractors get?', 'Do contractors get public holidays off?', 'Is contractor leave paid or unpaid?'] },
    { id: 'g2', title: 'Security review process for new vendors', people: 9, asks: 11, status: 'open',
      ex: ['Who signs off on a new SaaS vendor?', 'How long does a security review take?'] },
    { id: 'g3', title: 'Payout on notice', people: 5, asks: 6, status: 'open',
      ex: ['How much is the payout if I resign?', 'Do I get paid out for unused leave?'] },
    { id: 'g4', title: 'Parking at the Sydney office', people: 4, asks: 5, status: 'open',
      ex: ['Is there parking at the Sydney office?', 'Can I claim parking costs?'] },
    { id: 'g5', title: 'Using personal devices for work', people: 3, asks: 4, status: 'open',
      ex: ['Can I check email on my own phone?', 'Is there a BYOD policy?'] },
    { id: 'g6', title: 'Expense limits by region', people: 6, asks: 6, status: 'resolved', note: 'Marked written 4 days ago. Asks dropped to 0.' },
  ],
  owners: ['People Ops', 'Security', 'Finance', 'IT'],

  model: { mode: 'local', answering: 'llama-3.1-8b-instruct', search: 'bge-base-en-v1.5', threshold: 62, endpoint: '', key: '' },
  answeringModels: ['llama-3.1-8b-instruct', 'qwen2.5-14b-instruct', 'mistral-nemo-12b'],
  searchModels: ['bge-base-en-v1.5', 'bge-large-en-v1.5', 'nomic-embed-text'],
};

/* ── richer data for the redesigned views (freshness, coverage, charts) ── */
(() => {
  const D = window.DATA;
  // Days since each cited document last changed, and who changed it.
  const AGE = { refunds: [3, 'Grace L.'], financeOps: [35, 'Grace L.'], reseller: [6, 'Omar S.'], vendorRunbook: [425, 'Tom B.'],
    handbookLeave: [60, 'Lena W.'], handbookExit: [21, 'Lena W.'], oncall: [7, 'Dev K.'], travel: [580, 'Grace L.'],
    expenses: [14, 'Grace L.'], parental: [120, 'Lena W.'], itSetup: [335, 'Sam T.'], contractorProc: [21, 'Lena W.'] };
  for (const k in AGE) Object.assign(D.docs[k], { age: AGE[k][0], editor: AGE[k][1] });

  // considered: found but not used. parts: what the question breaks into, for the coverage bar.
  const EXTRA = {
    reseller: { considered: ['refunds', 'financeOps'], parts: ['Reseller purchases'] },
    refund: { considered: ['reseller', 'expenses'], parts: ['First 30 days', 'After 30 days', 'Monthly plans'] },
    invoice: { considered: ['expenses'], parts: ['Where to send them', 'When they are paid'] },
    sick: { considered: ['contractorProc'], parts: ['Sick leave for contractors'] },
    notice: { considered: ['handbookLeave', 'contractorProc'], parts: ['Notice period', 'Payout on notice'], missingPart: 1 },
    oncall: { considered: ['itSetup', 'handbookLeave'], parts: ['How the rotation works', 'Where the schedule lives'] },
    flight: { considered: ['financeOps', 'vendorRunbook'], parts: ['Booking', 'Class of travel', 'Claiming it back'] },
    vendor: { considered: ['financeOps'], parts: ['Who approves a vendor', 'How security review works'] },
    parental: { considered: ['handbookLeave', 'handbookExit'], parts: ['Primary carers', 'Secondary carers'] },
    vpn: { considered: ['oncall'], parts: ['Installing it', 'Getting the laptop approved'] },
    contractorApproval: { considered: ['handbookLeave', 'vendorRunbook'], parts: ['Who approves', 'Paperwork'] },
  };
  D.scenarios.forEach(s => Object.assign(s, EXTRA[s.id]));
  Object.assign(D.fallback, { considered: ['handbookLeave'], parts: ['Your question'] });

  D.topics = [
    { name: 'Money', blurb: 'Refunds, invoices and expenses', ids: ['refund', 'invoice', 'flight'] },
    { name: 'People', blurb: 'Leave, notice and contractors', ids: ['sick', 'notice', 'parental'] },
    { name: 'Engineering and IT', blurb: 'On-call, laptops and access', ids: ['oncall', 'vpn'] },
  ];

  // Seeded random so charts look the same on every load.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spread = (weights, total) => { const s = weights.reduce((a, b) => a + b, 0); return weights.map(w => Math.round(w / s * total)); };
  const make = (labels, weights, total, missRate) => {
    const all = spread(weights.map(w => w * (0.85 + rnd() * 0.3)), total);
    const missed = all.map(v => Math.round(v * (missRate + (rnd() - 0.5) * 0.08)));
    return { labels, answered: all.map((v, i) => v - missed[i]), missed };
  };
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  const days30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(2026, 9, 17 + i); return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }); });
  D.series = {
    '24h': make(hours, hours.map((_, h) => h < 7 ? 0.2 : h < 9 ? 1.5 : h < 18 ? 4 + Math.sin(h) : h < 21 ? 1 : 0.3), 52, 0.12),
    '7d': make(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [62, 70, 66, 74, 50, 10, 9], 341, 0.14),
    '30d': make(days30, days30.map((_, i) => (i % 7 === 5 || i % 7 === 6) ? 0.2 : 1 + i / 40), 1408, 0.16),
  };

  // Where the knowledge lives: share of each space's documents changed in the last 6 months.
  D.spaces = [
    { src: 'Confluence', name: 'Engineering', docs: 420, fresh: 0.84 }, { src: 'Confluence', name: 'Finance', docs: 236, fresh: 0.52 },
    { src: 'Confluence', name: 'People Ops', docs: 198, fresh: 0.71 }, { src: 'Confluence', name: 'Product', docs: 164, fresh: 0.88 },
    { src: 'Confluence', name: 'Sales', docs: 84, fresh: 0.63 }, { src: 'Google Drive', name: 'Shared drives', docs: 96, fresh: 0.47 },
    { src: 'Google Drive', name: 'Finance', docs: 52, fresh: 0.31 }, { src: 'Google Drive', name: 'Partnerships', docs: 34, fresh: 0.76 },
  ];

  // Age (months since last change) against citations this week, for the freshness scatter.
  D.scatter = [
    ['vendor-runbook', 'Vendor Payment Runbook', 14, 19], ['it-setup', 'Onboarding: IT Setup', 11.2, 14], ['travel-2024', 'Travel Policy 2024', 19, 10],
    ['refunds', 'Billing & Refunds Policy', 0.1, 22], ['oncall', 'On-call Handbook', 0.25, 16], ['leave', 'Employee Handbook: Leave', 2, 12],
    ['finops', 'Finance Ops Handbook', 1.2, 9], ['expenses', 'Expense Guide', 0.5, 11], ['parental', 'Parental Leave: Australia', 4, 6],
    ['reseller', 'Partner & Reseller Agreement', 0.2, 7], ['incident', 'Incident Process', 3, 8], ['security', 'Security Overview', 7, 5],
    ['brand', 'Brand Guidelines v3', 16, 2], ['office', 'Office Handbook', 13, 4.5], ['benefits', 'Benefits Summary', 9, 7],
    ['hiring', 'Hiring Plan H2', 2, 3], ['sales', 'Sales Playbook', 6, 9], ['design', 'Design System Notes', 8, 3],
    ['api', 'API Style Guide', 5, 6], ['release', 'Release Checklist', 1, 8], ['retention', 'Data Retention Policy', 15, 5],
    ['laptop', 'Laptop Refresh Policy', 22, 3], ['holiday', 'Holiday Calendar 2025', 12.5, 6], ['pricing', 'Pricing FAQ', 18, 4],
    ['escalations', 'Customer Escalations', 1.5, 10], ['exit', 'Employee Handbook: Exit', 0.7, 6], ['contractor', 'Contractor Engagement Process', 0.7, 5],
    ['roadmap', 'Product Roadmap 2026', 0.4, 4], ['okr', 'Company OKRs', 1.8, 2], ['wifi', 'Office Wi-Fi Setup', 20, 1],
  ].map(([id, t, age, cites]) => ({ id, t, age, cites }));

  // Last 24 sync attempts per connector, oldest first. x = failed.
  D.connectors[0].beats = 'oooooooooooooooooooooooo';
  D.connectors[1].beats = 'oooooooooooooooooooooxxx';
  D.connectors[0].src = 'Confluence';
  D.connectors[1].src = 'Google Drive';

  // Asks per day over the last 14 days, per knowledge gap.
  const TR = { g1: [0, 1, 0, 2, 1, 1, 0, 2, 1, 3, 2, 1, 2, 1], g2: [1, 0, 1, 1, 0, 2, 1, 0, 1, 1, 1, 0, 1, 1], g3: [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    g4: [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0], g5: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1], g6: [2, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0] };
  D.gaps.forEach(g => { g.trend = TR[g.id]; });
  D.gaps[0].who = ['Ana R.', 'Dev K.', 'Tom B.', 'Sam T.']; D.gaps[1].who = ['Priya M.', 'Grace L.', 'Omar S.'];
  D.gaps[2].who = ['Lena W.', 'Dev K.']; D.gaps[3].who = ['Sam T.', 'Ana R.']; D.gaps[4].who = ['Omar S.']; D.gaps[5].who = ['Grace L.', 'Priya M.'];

  // How confident Sambad was on last week's questions, low to high, in 20 buckets.
  D.confidence = [1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8, 10, 14, 20, 28, 40, 52, 62, 70];

  D.groupParent = { 'all-staff': null, engineering: 'all-staff', 'backend-guild': 'engineering', 'frontend-guild': 'engineering', 'finance-team': 'all-staff', contractors: null };
  D.modelInfo = {
    'llama-3.1-8b-instruct': ['8B', 'Fast on a single GPU. A good default.'],
    'qwen2.5-14b-instruct': ['14B', 'Better at long policies. Needs about 16 GB of GPU memory.'],
    'mistral-nemo-12b': ['12B', 'Strong with mixed languages. Middle on speed.'],
    'bge-base-en-v1.5': ['110M', 'Balanced speed and quality for English.'],
    'bge-large-en-v1.5': ['335M', 'More accurate search, about 3x slower to index.'],
    'nomic-embed-text': ['137M', 'Handles very long documents well.'],
  };
  D.sourceBlurb = { Confluence: 'Spaces and pages', 'Google Drive': 'Docs, Sheets and PDFs', Notion: 'Workspaces and pages', SharePoint: 'Sites and libraries', 'Upload files': 'PDF, Word, Markdown' };

  // Workspace settings: the controls a company's IT and security teams expect before rollout.
  D.settings = {
    idp: 'Okta', sso: true, scim: true, session: '24 hours', domains: ['acme.com', 'acme.co.uk'],
    admins: [['Suman Pokhrel', 'suman@acme.com', 'Owner'], ['Lena Martin', 'lena@acme.com', 'Auditor'], ['Tom Baker', 'tom@acme.com', 'Knowledge manager']],
    retainQ: '90 days', retainAudit: '3 years', redact: true, anonymize: false,
    assistant: 'Sambad', strict: true,
    routes: { 'People and HR': 'People Ops', 'IT and devices': 'IT', 'Money and expenses': 'Finance', 'Security and access': 'Security' },
    apiKeys: [],
  };
  D.roles = {
    Owner: 'Everything, including billing and deleting the workspace.',
    Admin: 'Sources, people, model and settings.',
    Auditor: 'Read-only access audit and inspector. Cannot change anything.',
    'Knowledge manager': 'Knowledge gaps and freshness. No access to permissions.',
  };
  // Not built yet. Visitors vote, and each vote lands in the feedback store.
  D.planned = {
    slack: ['Ask from Slack', 'Mention @Sambad in any channel and get a cited answer in the thread.'],
    teams: ['Ask from Microsoft Teams', 'The same answers inside Teams chats and channels.'],
    siem: ['Stream the audit log to your SIEM', 'Send every access decision to Splunk, Sentinel or Elastic as it happens.'],
    languages: ['Answers in more languages', 'Ask in Nepali, Hindi, Spanish or German, and get answers from English documents.'],
    extension: ['Browser extension', 'Ask about the page you are reading, with the same permissions.'],
    connectorsApi: ['Build your own connector', 'A documented API for in-house systems, with permissions mapped the same way.'],
  };
  // Draft plans, shown so visitors can react to pricing. Nothing here is final.
  D.plans = [
    ['Community', 'Free', 'For personal and non-commercial use. Self-hosted, with every core feature: permission-aware answers, freshness and the access audit.'],
    ['Business', 'Per person, per month', 'Licensed for commercial use. Adds single sign-on, automatic user provisioning, audit export and email support.'],
    ['Enterprise', 'Custom', 'Air-gapped installs, an uptime commitment, priority support and help connecting in-house systems.'],
  ];
  D.priceBands = ['Under $5', '$5 to $10', '$10 to $20', '$20 to $30', 'Over $30'];
})();
