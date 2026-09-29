/**
 * Pricing page content. Limits mirror plan.md §8 and the <Pricing/> cards;
 * numbers are the launch starting point and may be tuned.
 */

/** true = included, false = not included, string = a specific value */
export type Cell = boolean | string;

export type ComparisonRow = { feature: string; hint?: string; starter: Cell; plus: Cell; pro: Cell };
export type ComparisonGroup = { title: string; rows: ComparisonRow[] };

export const COMPARISON: ComparisonGroup[] = [
  {
    title: "Usage",
    rows: [
      { feature: "Credits / month", hint: "1 credit = 1 minute of audio or video, or 1 page", starter: "1,200", plus: "3,000", pro: "5,000" },
      { feature: "Assistant chat / month", hint: "Then 1 credit per message", starter: "300", plus: "1,500", pro: "2,000" },
      { feature: "Max recording length", starter: "2 hours", plus: "4 hours", pro: "6 hours" },
      { feature: "7-day free trial", hint: "150 credits and 30 chat messages", starter: true, plus: true, pro: true },
    ],
  },
  {
    title: "Notes & outputs",
    rows: [
      { feature: "All 6 note types + auto-detect", starter: true, plus: true, pro: true },
      { feature: "Every output, add or regenerate any time", starter: true, plus: true, pro: true },
      { feature: "Timestamp & page anchors", starter: true, plus: true, pro: true },
      { feature: "Output language different from source", starter: true, plus: true, pro: true },
    ],
  },
  {
    title: "Study & productivity",
    rows: [
      { feature: "Flashcards with spaced repetition", starter: true, plus: true, pro: true },
      { feature: "Quizzes & practice exams", starter: true, plus: true, pro: true },
      { feature: "Tasks & deadlines tracked across every course", starter: true, plus: true, pro: true },
      { feature: "Markdown & Anki CSV export", starter: true, plus: true, pro: true },
    ],
  },
  {
    title: "Privacy & account",
    rows: [
      { feature: "Private by default, never used for training", starter: true, plus: true, pro: true },
      { feature: "Web, iOS & Android with one account", starter: true, plus: true, pro: true },
      { feature: "Support", starter: "Email", plus: "Email", pro: "Priority email" },
    ],
  },
];

export const COUNTING = [
  {
    kicker: "Audio & video",
    title: "1 credit per minute, rounded up",
    body: "A 52-minute lecture recording uses 53 credits; a 41-second voice memo uses 1. Recordings, uploads and videos all count their full length.",
    example: "52:18 class recording → 53 credits",
    color: "var(--nt-lecture)",
  },
  {
    kicker: "Documents",
    title: "1 credit per page, slide or photo",
    body: "A 34-page PDF uses 34 credits, a 20-slide deck uses 20 and one whiteboard photo uses 1. Articles and pasted text count one credit per 3,000 characters.",
    example: "34-page chapter → 34 credits",
    color: "var(--nt-reading)",
  },
  {
    kicker: "Everything else",
    title: "Charged once, when a source is processed",
    body: "Editing, reviewing flashcards and taking quizzes never use credits. Chat is included up to your plan's monthly allowance. Credits reset on your billing date and don't roll over. If processing fails, you get them back.",
    example: "Review 200 cards → 0 credits",
    color: "var(--nt-podcast)",
  },
] as const;

export const BILLING_FAQ = [
  {
    q: "How does the free trial work?",
    a: "Every plan starts with 7 days free, with 150 credits and 30 chat messages to try it properly. A card is required, but nothing is charged until the trial ends, and you can cancel before then from Settings → Plan & billing.",
  },
  {
    q: "What currency do you charge in?",
    a: "USD, at the same price everywhere. Your bank converts it to your local currency if needed.",
  },
  {
    q: "Who handles tax and invoices?",
    a: "Checkout is run by Dodo Payments as merchant of record. They calculate and collect VAT, GST or sales tax for your country and send a compliant invoice.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Nothing you've made is affected. You can keep reading, reviewing and exporting; new notes wait until your credits reset or you upgrade.",
  },
  {
    q: "If I upgrade mid-month, when do I get the new credits?",
    a: "Immediately. You get the new plan's full allowance right away and pay the difference for the rest of the period, and your billing date becomes the day you upgraded. Downgrades apply at the end of the period.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, from Settings → Plan & billing. Your plan keeps working until the end of the period you've paid for, and your notes stay in your library.",
  },
  {
    q: "Do you offer refunds?",
    a: "We always refund duplicate or mistaken charges. The refund policy has the details.",
  },
];
