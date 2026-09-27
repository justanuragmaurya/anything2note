"use client";

import { useState } from "react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import type { SharedTab } from "@/lib/mock/marketing-shared";
import { SampleBlocks } from "./sample-blocks";

/** Read-only output tabs for a shared note. */
export function SharedTabs({ tabs, accent }: { tabs: SharedTab[]; accent: string }) {
  const [value, setValue] = useState(tabs[0]?.value ?? "");
  const tab = tabs.find((t) => t.value === value) ?? tabs[0];

  return (
    <div>
      <div className="-mx-6 overflow-x-auto px-6 pb-1 sm:mx-0 sm:px-0">
        <SlidingTabs
          value={value}
          onChange={setValue}
          ariaLabel="Outputs"
          items={tabs.map((t) => ({ value: t.value, label: t.label }))}
        />
      </div>
      <div role="tabpanel" aria-label={tab?.label} key={tab?.value} className="rise mt-6">
        {tab && <SampleBlocks blocks={tab.blocks} accent={accent} />}
      </div>
    </div>
  );
}
