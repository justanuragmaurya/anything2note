/**
 * Pricing page content. Limits mirror plan.md §8 and the <Pricing/> cards;
 * numbers are the launch starting point and may be tuned.
 */

/** true = included, false = not included, string = a specific value */
export type Cell = boolean | string;

export type ComparisonRow = { feature: string; hint?: string; free: Cell; pro: Cell };
export type ComparisonGroup = { title: string; rows: ComparisonRow[] };

export const COMPARISON: ComparisonGroup[] = [
  {
    title: "Usage",
    rows: [
      { feature: "Media minutes / month", hint: "Audio, video, YouTube and recordings", free: "120", pro: "2,000" },
      { feature: "Document pages / month", hint: "PDF, Office files and images", free: "50", pro: "2,000" },
      { feature: "Max media length", free: "60 min", pro: "5 hours" },
      { feature: "Max upload size", free: "200 MB", pro: "2 GB" },
    ],
  },
  {
    title: "Notes & outputs",
    rows: [
      { feature: "All 7 note types + auto-detect", free: true, pro: true },
      { feature: "Every output, add or regenerate any time", free: true, pro: true },
      { feature: "Timestamp & page anchors", free: true, pro: true },
      { feature: "Speaker labels", hint: "Meetings, interviews, podcasts", free: false, pro: true },
      { feature: "Output language different from source", free: true, pro: true },
      { feature: "Assistant chat", free: "20 messages / day", pro: "Generous" },
    ],
  },
  {
    title: "Study & productivity",
    rows: [
      { feature: "Flashcards with spaced repetition", free: true, pro: true },
      { feature: "Quizzes & practice exams", free: true, pro: true },
      { feature: "Action items tracked across meetings", free: true, pro: true },
      { feature: "Folders & search", free: true, pro: true },
    ],
  },
  {
    title: "Export & sharing",
    rows: [
      { feature: "Markdown export", free: true, pro: true },
      { feature: "PDF & DOCX export", free: false, pro: true },
      { feature: "Anki CSV export", free: false, pro: true },
      { feature: "Read-only share links", free: false, pro: true },
    ],
  },
  {
    title: "Privacy & account",
    rows: [
      { feature: "Private by default, never used for training", free: true, pro: true },
      { feature: "Auto-delete originals after processing", free: true, pro: true },
      { feature: "Web, iOS & Android with one account", free: true, pro: true },
      { feature: "Support", free: "Email", pro: "Priority email" },
    ],
  },
];

export const COUNTING = [
  {
    kicker: "Media minutes",
    title: "Length of the source, rounded up",
    body: "A 52-minute recording uses 52 minutes; a 41-second voice memo uses 1. YouTube videos count their full length, whether or not they have captions.",
    example: "52:18 recording → 53 min",
    color: "var(--nt-meeting)",
  },
  {
    kicker: "Document pages",
    title: "One page, slide or photo is one page",
    body: "A 34-page PDF uses 34 pages, a 20-slide deck uses 20 and one whiteboard photo uses 1. Articles and pasted text count one page per 3,000 characters.",
    example: "34-page chapter → 34 pages",
    color: "var(--nt-reading)",
  },
  {
    kicker: "Always free",
    title: "Charged once, when a source is processed",
    body: "Adding outputs, regenerating, editing, chatting and reviewing flashcards never use minutes or pages. Allowances reset on your billing date and don't roll over.",
    example: "+ Add flashcards → 0 min",
    color: "var(--nt-podcast)",
  },
] as const;

export const BILLING_FAQ = [
  {
    q: "How do I pay from India?",
    a: "Choose India as your billing country at checkout to pay in INR through Razorpay: UPI AutoPay, cards or netbanking. Prices include GST and you get a GST invoice.",
  },
  {
    q: "I'm outside India. Who handles tax and invoices?",
    a: "Checkout is run by Dodo Payments as merchant of record. They calculate and collect VAT or sales tax for your country and send a compliant invoice.",
  },
  {
    q: "What happens when I run out of minutes or pages?",
    a: "Nothing you've made is affected. You can keep reading, reviewing and chatting; new uploads wait until your allowance resets or you upgrade.",
  },
  {
    q: "If I upgrade mid-month, when do I get Pro limits?",
    a: "Immediately. Your Pro allowance starts the moment payment succeeds, and your billing date becomes the day you upgraded.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, from Settings → Plan & billing. You keep Pro until the end of the period you've paid for, then drop to Free with all your notes intact.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yearly plans can be refunded in full within 7 days if you've barely used them, and we always refund duplicate or mistaken charges. The refund policy has the details.",
  },
];
