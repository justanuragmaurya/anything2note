/**
 * Mock data for read-only shared notes at /s/[slug].
 * Replace with `GET /share/:slug` once the API exists. Only `demo` resolves.
 */

import type { NoteTypeKey } from "@/lib/mock/note-types";
import { NOT_MENTIONED, type SampleBlock } from "@/lib/mock/marketing-samples";

export type SharedTab = { value: string; label: string; blocks: SampleBlock[] };

export type SharedNote = {
  slug: string;
  title: string;
  noteType: NoteTypeKey;
  source: { kind: string; file: string; duration: string; recorded: string; speakers: string };
  sharedBy: string;
  updated: string;
  summary: string;
  tabs: SharedTab[];
};

const m = (min: number, sec = 0) => min * 60 + sec;

const DEMO: SharedNote = {
  slug: "demo",
  title: "Launch readiness review: mobile app v1",
  noteType: "meeting",
  source: {
    kind: "Audio upload",
    file: "launch-readiness-2026-09-24.m4a",
    duration: "38 min",
    recorded: "Thu, 24 Sep 2026",
    speakers: "5 speakers",
  },
  sharedBy: "Shared by Aditi",
  updated: "Updated 25 Sep 2026",
  summary:
    "Go/no-go review for the iOS and Android launch. Launch stays on 8 October, with offline flashcards cut from v1 and a staged Android rollout.",
  tabs: [
    {
      value: "minutes",
      label: "Minutes",
      blocks: [
        {
          type: "fields",
          rows: [
            { label: "Meeting", value: "Launch readiness review" },
            { label: "Date", value: "Thu, 24 Sep 2026 · 16:00 IST" },
            { label: "Attendees", value: "Aditi (chair), Rohan, Sana, Vikram, Leah" },
            { label: "Apologies", value: NOT_MENTIONED },
          ],
        },
        { type: "heading", text: "Discussion" },
        {
          type: "numbered",
          items: [
            {
              title: "App Store review status",
              body: "Rohan reported the iOS build passed review on the second submission after adding the account-deletion flow. Android is in closed testing with 140 testers.",
              anchor: { kind: "time", at: m(2, 15) },
            },
            {
              title: "Offline flashcards",
              body: "Sana flagged sync conflicts when the same card is reviewed on two devices offline. The group agreed it isn't safe for v1.",
              anchor: { kind: "time", at: m(9, 40) },
            },
            {
              title: "Crash rate on older Android devices",
              body: "Vikram shared a 1.8% crash rate on Android 10 and below, mostly in the recorder. A fix is in review; staged rollout limits exposure meanwhile.",
              anchor: { kind: "time", at: m(18, 5) },
            },
            {
              title: "Launch comms",
              body: "Leah will prepare the announcement email and store listing copy. Timing of the press note was discussed but not settled.",
              anchor: { kind: "time", at: m(29, 30) },
            },
          ],
        },
        {
          type: "callout",
          label: "Next meeting",
          text: "Thu, 1 Oct. Final go/no-go with crash-rate numbers from the staged rollout.",
        },
      ],
    },
    {
      value: "actions",
      label: "Action items",
      blocks: [
        {
          type: "actions",
          items: [
            { task: "Remove offline flashcards from the v1 build", owner: "Sana", due: "Mon, 28 Sep", anchor: { kind: "time", at: m(12, 2) }, done: true },
            { task: "Merge recorder crash fix and ship to closed testing", owner: "Vikram", due: "Wed, 30 Sep", anchor: { kind: "time", at: m(20, 44) } },
            { task: "Set up 10% → 50% → 100% staged Android rollout", owner: "Rohan", due: NOT_MENTIONED, anchor: { kind: "time", at: m(23, 10) } },
            { task: "Draft launch email and store listing copy", owner: "Leah", due: "Fri, 2 Oct", anchor: { kind: "time", at: m(30, 5) } },
            { task: "Decide on press note timing", owner: NOT_MENTIONED, due: NOT_MENTIONED, anchor: { kind: "time", at: m(33, 50) } },
          ],
        },
      ],
    },
    {
      value: "decisions",
      label: "Decisions",
      blocks: [
        {
          type: "decisions",
          items: [
            { text: "Launch date stays Thursday, 8 October.", anchor: { kind: "time", at: m(35, 12) } },
            { text: "Offline flashcards move to v1.1; v1 requires a connection to review.", anchor: { kind: "time", at: m(11, 30) } },
            { text: "Android launches as a staged rollout starting at 10%.", anchor: { kind: "time", at: m(22, 48) } },
          ],
        },
      ],
    },
    {
      value: "notes",
      label: "Notes",
      blocks: [
        { type: "heading", text: "Summary" },
        {
          type: "paragraph",
          text: "The team reviewed store status, feature scope and stability ahead of the 8 October launch. The one risky feature was cut instead of moving the date.",
        },
        { type: "heading", text: "iOS", anchor: { kind: "time", at: m(2, 15) } },
        {
          type: "bullets",
          items: [
            { text: "First submission rejected: in-app account deletion was missing (guideline 5.1.1).", anchor: { kind: "time", at: m(3, 2) } },
            { text: "Second submission approved in under 24 hours.", anchor: { kind: "time", at: m(4, 30) } },
          ],
        },
        { type: "heading", text: "Android", anchor: { kind: "time", at: m(16, 50) } },
        {
          type: "bullets",
          items: [
            { text: "Crashes cluster in the recorder on Android 10 and below: a MediaRecorder codec issue.", anchor: { kind: "time", at: m(18, 40) } },
            { text: "Staged rollout lets the team pause if the crash rate stays above 1%.", anchor: { kind: "time", at: m(23, 10) } },
          ],
        },
        {
          type: "quote",
          text: "I'd rather ship without offline than ship something that loses someone's reviews.",
          speaker: "Sana",
          anchor: { kind: "time", at: m(10, 58) },
        },
      ],
    },
    {
      value: "flashcards",
      label: "Flashcards",
      blocks: [
        {
          type: "flashcards",
          items: [
            { q: "What is the mobile v1 launch date?", a: "Thursday, 8 October 2026.", anchor: { kind: "time", at: m(35, 12) } },
            { q: "Why were offline flashcards cut from v1?", a: "Sync conflicts when the same card is reviewed offline on two devices.", anchor: { kind: "time", at: m(9, 40) } },
            { q: "What caused the first iOS rejection?", a: "The app had no in-app account deletion flow.", anchor: { kind: "time", at: m(3, 2) } },
            { q: "What's the Android rollout plan?", a: "Staged: 10% → 50% → 100%, pausing if crashes stay above 1%.", anchor: { kind: "time", at: m(23, 10) } },
          ],
        },
      ],
    },
  ],
};

const SHARED: Record<string, SharedNote> = { demo: DEMO };

export const SHARED_SLUGS = Object.keys(SHARED);

export function getSharedNote(slug: string): SharedNote | undefined {
  return Object.hasOwn(SHARED, slug) ? SHARED[slug] : undefined;
}
