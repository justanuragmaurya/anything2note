/**
 * DRAFT legal copy for /privacy, /terms and /refunds.
 * Placeholder text written for a SaaS that processes user uploads, operated
 * from India and sold internationally. It MUST be reviewed by counsel before
 * launch. Bracketed values like [Company legal name] still need filling in.
 */

export type LegalBlock = string | { list: string[] } | { note: string };
export type LegalSection = { id: string; heading: string; blocks: LegalBlock[] };
export type LegalDoc = {
  slug: "privacy" | "terms" | "refunds";
  metaTitle: string;
  description: string;
  title: { before: string; accent: string };
  updated: string;
  summary: string;
  sections: LegalSection[];
};

const COMPANY = "[Company legal name]";
const UPDATED = "27 September 2026";

export const PRIVACY: LegalDoc = {
  slug: "privacy",
  metaTitle: "Privacy policy",
  description: "How anything2note collects, uses, stores and deletes your uploads, recordings, documents and account data.",
  title: { before: "Privacy", accent: "policy" },
  updated: UPDATED,
  summary:
    "Your uploads are yours. We process them only to make your notes, we never sell them or use them to train AI models, and you can delete them at any time.",
  sections: [
    {
      id: "who-we-are",
      heading: "Who we are",
      blocks: [
        `anything2note ("we", "us") is operated by ${COMPANY}, a company registered in India at [registered address]. We are the data controller (and "data fiduciary" under India's Digital Personal Data Protection Act, 2023) for the personal data described in this policy.`,
        "This policy covers our website, web app, and iOS and Android apps (together, the \"Service\").",
      ],
    },
    {
      id: "what-we-collect",
      heading: "What we collect",
      blocks: [
        "We collect only what we need to run the Service:",
        {
          list: [
            "Account data: your name, email address, and profile image if you sign in with Google or Apple.",
            "Your content: files you upload (audio, video, PDFs, Office documents, images), in-app recordings, links you submit, pasted text, and the notes, transcripts, flashcards and other outputs we generate from them.",
            "Usage data: the minutes and pages you use, features you open, and basic device and browser information, used to enforce plan limits and fix problems.",
            "Billing data: your plan, billing country and subscription status. Card, UPI and bank details are collected by our payment providers, not by us.",
            "Support data: anything you send us when you contact support.",
          ],
        },
      ],
    },
    {
      id: "how-we-use",
      heading: "How we use your data",
      blocks: [
        {
          list: [
            "To provide the Service: transcribe, extract and generate outputs from your content, and answer your questions about it.",
            "To run your account: authentication, plan limits, billing and account notices.",
            "To keep the Service secure: detect abuse, prevent fraud and protect free-trial credits from bots.",
            "To improve the Service using aggregated, de-identified usage metrics. Never the contents of your uploads.",
          ],
        },
        { note: "We do not sell your personal data, and we do not use your uploads, recordings, documents or notes to train AI models." },
      ],
    },
    {
      id: "ai-processing",
      heading: "AI processing and sub-processors",
      blocks: [
        "To generate your notes, we send the relevant content to third-party AI and infrastructure providers that act on our instructions. They may process it only to return results to us, under contracts that prohibit using it to train their models.",
        "Our main sub-processors are:",
        {
          list: [
            "Cloud infrastructure and storage: [e.g. Cloudflare], [e.g. Vercel].",
            "Speech-to-text and language model providers: [list providers and regions].",
            "Authentication: Google and Apple, if you choose those sign-in methods.",
            "Payments: Dodo Payments, which sells subscriptions to you as merchant of record.",
            "Email delivery: [email provider], for sign-in codes and account notices.",
          ],
        },
        "Public YouTube videos are an exception to per-user processing: their transcript may be processed once and cached so it can be reused. Which videos you add, and everything generated for you, remains private to your account.",
      ],
    },
    {
      id: "retention",
      heading: "Retention and deletion",
      blocks: [
        "We keep your content for as long as your account is active, unless you delete it sooner.",
        {
          list: [
            "Delete originals after processing: an account setting, off unless you turn it on. When it's on, uploaded files and recordings are deleted once their notes are made. Your notes, transcripts and flashcards remain.",
            "Deleting an item removes its original file, transcript and outputs from our active systems immediately and from backups within [30] days.",
            "Deleting your account removes all your content within [30] days. We keep limited billing records for as long as tax law requires (currently up to 8 years in India).",
          ],
        },
      ],
    },
    {
      id: "sharing",
      heading: "Share links",
      blocks: [
        "If you create a read-only share link, anyone with the link can view the outputs you chose to share. They cannot see your original file, other items or your account. You can revoke a link at any time, and it stops working immediately.",
      ],
    },
    {
      id: "your-rights",
      heading: "Your rights",
      blocks: [
        "Depending on where you live, including under India's DPDP Act, the EU/UK GDPR and US state privacy laws, you may have the right to:",
        {
          list: [
            "access the personal data we hold about you and get a copy of it;",
            "correct inaccurate data or complete incomplete data;",
            "delete your data, or withdraw consent where we rely on it;",
            "object to or restrict certain processing, and port your data to another service;",
            "nominate someone to exercise your rights if you die or become incapacitated (India);",
            "complain to your local data protection authority or the Data Protection Board of India.",
          ],
        },
        "Most of this is self-serve: export or delete items from the app, and delete your account in Settings. For anything else, email privacy@anything2note.com and we will respond within [30] days.",
      ],
    },
    {
      id: "transfers",
      heading: "International transfers",
      blocks: [
        "We and our sub-processors may process data in India, the United States, the European Union and other countries. Where required, we rely on appropriate safeguards such as the EU Standard Contractual Clauses, and we comply with any transfer restrictions notified under Indian law.",
      ],
    },
    {
      id: "security",
      heading: "Security",
      blocks: [
        "Data is encrypted in transit (TLS) and at rest. Access to production systems is limited to staff who need it, protected by multi-factor authentication and logged. No system is perfectly secure; if a breach affects your personal data, we will notify you and the relevant authorities as the law requires.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        "The Service is not directed at children under 13. In India, users under 18 need verifiable consent from a parent or guardian, and in the EU the age of consent may be up to 16. If you believe a child has given us personal data without the required consent, contact us and we will delete it.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      blocks: [
        "We use strictly necessary cookies to keep you signed in and to secure the Service, plus privacy-friendly analytics that do not track you across other sites. We do not use advertising cookies.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        "If we make material changes, we will tell you by email or in the app at least 14 days before they take effect. The date at the top shows when this policy was last updated.",
      ],
    },
    {
      id: "contact",
      heading: "Contact and grievance officer",
      blocks: [
        "Questions or requests: privacy@anything2note.com.",
        "Grievance Officer (India): [Name], [designation], [address]. Email grievance@anything2note.com. We acknowledge complaints within 24 hours and resolve them within the time required by law.",
        "EU/UK representative: [to be appointed if required].",
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  slug: "terms",
  metaTitle: "Terms of service",
  description: "The terms that govern your use of anything2note, including accounts, subscriptions, your content and acceptable use.",
  title: { before: "Terms of", accent: "service" },
  updated: UPDATED,
  summary:
    "Use anything2note for content you have the right to use. Keep your account secure. Check AI outputs before relying on them. After the 7-day trial, pay for the plan you use. You can leave any time.",
  sections: [
    {
      id: "agreement",
      heading: "The agreement",
      blocks: [
        `These terms are a contract between you and ${COMPANY} ("we", "us"). By creating an account or using anything2note, you agree to them and to our Privacy policy. If you use the Service for an organisation, you confirm you are authorised to accept these terms on its behalf.`,
      ],
    },
    {
      id: "accounts",
      heading: "Your account",
      blocks: [
        {
          list: [
            "You must be at least 13, and have a parent's or guardian's consent if you are under the age of majority where you live (18 in India).",
            "Give us accurate information and keep your sign-in methods secure. You are responsible for activity on your account.",
            "One person per account. Don't create multiple accounts to get extra free trials or get around usage limits.",
          ],
        },
      ],
    },
    {
      id: "plans-billing",
      heading: "Plans, billing and renewal",
      blocks: [
        "anything2note is a paid subscription with three plans (Starter, Plus and Pro), billed monthly in advance. Each plan includes a monthly allowance of credits (1 credit is 1 minute of audio or video, or 1 document page) and AI chat messages. Unused credits don't roll over.",
        "Every plan starts with a 7-day free trial with a capped allowance of credits and chat messages. A card is required to start it. You won't be charged until the trial ends, and if you cancel before then you won't be charged at all. One trial per account.",
        {
          list: [
            "Subscriptions renew automatically at the end of each period until you cancel. Where local rules require a pre-debit notice (for example RBI rules for Indian cards), you'll get one.",
            "Prices are in USD and shown at checkout, with applicable taxes (for example GST in India) added where required. Dodo Payments sells the subscription to you as merchant of record, and its terms also apply to the purchase.",
            "We may change prices for future periods with at least 30 days' notice. Changes never apply to a period you've already paid for.",
          ],
        },
        "Refunds are covered by our Refund policy.",
      ],
    },
    {
      id: "your-content",
      heading: "Your content",
      blocks: [
        "You keep all rights in the files, recordings, links and text you submit (\"your content\") and in the outputs generated for you.",
        "You give us a limited licence to host, copy, process and transmit your content only as needed to provide the Service to you, including sending it to our sub-processors. This licence ends when you delete the content, except for residual backups kept for up to [30] days.",
        "You're responsible for having the rights and permissions needed for your content, including copyright and the consent of people you record, such as your lecturer's or institution's permission to record a class.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "Acceptable use",
      blocks: [
        "Don't use the Service to:",
        {
          list: [
            "record people without the consent your local law requires, or upload content you don't have the right to use;",
            "process unlawful content, or content that exploits or harms children;",
            "infringe others' intellectual property, including redistributing copyrighted material via share links;",
            "probe, overload or disrupt the Service, bypass usage limits, or scrape it;",
            "resell the Service or build a competing product from its outputs without our written permission.",
          ],
        },
        "We may suspend or remove content or accounts that break these rules, and we will tell you why unless the law or safety prevents it.",
      ],
    },
    {
      id: "ai-outputs",
      heading: "AI outputs",
      blocks: [
        "Notes, tasks, flashcards and other outputs are generated automatically and can be incomplete or wrong. We design them to cite their sources and to say \"Not mentioned\" rather than guess, but you should check anything important against the original before relying on it.",
        "Outputs are not professional advice: medical, legal, financial or otherwise.",
      ],
    },
    {
      id: "third-party",
      heading: "Third-party services",
      blocks: [
        "When you add a YouTube link, you must also follow YouTube's Terms of Service. We are not responsible for third-party services, and their availability can change.",
      ],
    },
    {
      id: "our-ip",
      heading: "Our intellectual property",
      blocks: [
        "The Service, including its software, design and brand, belongs to us and our licensors. These terms don't grant you any rights in it beyond using the Service as intended.",
        "If you send us feedback, we may use it without any obligation to you.",
      ],
    },
    {
      id: "termination",
      heading: "Ending the agreement",
      blocks: [
        "You can stop using the Service and delete your account at any time. We may suspend or end your access if you materially breach these terms, if required by law, or if we discontinue the Service. If we discontinue it, we'll give you at least 30 days to export your content and refund any unused prepaid period.",
      ],
    },
    {
      id: "disclaimers",
      heading: "Disclaimers and liability",
      blocks: [
        "The Service is provided \"as is\". To the extent the law allows, we disclaim implied warranties of merchantability, fitness for a particular purpose and non-infringement.",
        "To the extent the law allows, we are not liable for indirect, incidental or consequential losses, or for lost data, profits or goodwill. Our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim and INR 5,000 (or USD 60).",
        "Nothing in these terms limits rights you have as a consumer that cannot be limited by contract.",
      ],
    },
    {
      id: "indemnity",
      heading: "Indemnity",
      blocks: [
        "If someone brings a claim against us because of your content or your breach of these terms, you agree to cover our reasonable losses and costs, to the extent the law allows.",
      ],
    },
    {
      id: "law",
      heading: "Governing law and disputes",
      blocks: [
        "These terms are governed by the laws of India. The courts at [City], India have exclusive jurisdiction, except that if you are a consumer in the EU or UK you may also bring proceedings in your country of residence under its mandatory laws.",
        "Before filing a claim, please write to legal@anything2note.com so we can try to resolve it informally within 30 days.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [
        "We may update these terms. For material changes we'll give at least 14 days' notice by email or in the app. If you keep using the Service after changes take effect, you accept them. If you don't agree, you can cancel before then.",
      ],
    },
    {
      id: "contact",
      heading: "Contact",
      blocks: [`${COMPANY}, [registered address]. Email legal@anything2note.com.`],
    },
  ],
};

export const REFUNDS: LegalDoc = {
  slug: "refunds",
  metaTitle: "Refund policy",
  description: "When and how anything2note refunds subscriptions, and how the 7-day free trial works.",
  title: { before: "Refund", accent: "policy" },
  updated: UPDATED,
  summary:
    "Every plan starts with a 7-day free trial, so try it first. Cancel before the trial ends and you're never charged. Monthly plans can be cancelled any time. Mistaken and duplicate charges are always refunded.",
  sections: [
    {
      id: "free-first",
      heading: "Try before you pay",
      blocks: [
        "Every plan starts with a 7-day free trial that includes every note type and output, so you can check that anything2note works for your content before you pay. A card is required, but nothing is charged until the trial ends, and cancelling before then means you're never charged. Because of that, and because processing costs us real money the moment you upload, refunds are limited to the cases below.",
      ],
    },
    {
      id: "monthly",
      heading: "Monthly subscriptions",
      blocks: [
        "You can cancel any time in Settings → Plan & billing. You keep your plan until the end of the month you've paid for, and you won't be charged again. We don't give partial refunds for unused days in a monthly period.",
      ],
    },
    {
      id: "always",
      heading: "When we always refund",
      blocks: [
        {
          list: [
            "Duplicate charges, or being charged after you cancelled.",
            "A second active subscription bought by mistake on another payment method or platform.",
            "Extended outages: if the Service is unavailable for more than 72 consecutive hours in a billing period, we'll credit or refund that period pro rata on request.",
          ],
        },
      ],
    },
    {
      id: "how-to",
      heading: "How to request a refund",
      blocks: [
        "Email billing@anything2note.com from your account email with your invoice or order number. We reply within 2 business days.",
        { note: "Please contact us before disputing a charge with your bank. A chargeback freezes the account while it's investigated, and we can usually refund you faster directly." },
      ],
    },
    {
      id: "timing",
      heading: "How long refunds take",
      blocks: [
        {
          list: [
            "Refunds go through Dodo Payments back to the original payment method, usually within 5–10 business days depending on your bank.",
          ],
        },
        "Refunded amounts include the taxes you paid. When a refund is issued, the plan ends and you can no longer add notes, but your existing notes stay intact.",
      ],
    },
    {
      id: "consumer-rights",
      heading: "Your statutory rights",
      blocks: [
        "This policy doesn't affect any rights you have under consumer protection law where you live, including India's Consumer Protection Act, 2019 and, for EU/UK consumers, withdrawal rights for digital services where they apply.",
      ],
    },
  ],
};

export const LEGAL_DOCS = { privacy: PRIVACY, terms: TERMS, refunds: REFUNDS } as const;
