"use client";

import { createContext, useContext } from "react";
import type { Anchor } from "@/lib/mock/app-data";

export type WorkspaceNav = {
  /** current playback time (media) in seconds */
  time: number;
  /** current page (documents) */
  page: number;
  seek: (a: Anchor) => void;
};

export const WorkspaceNavContext = createContext<WorkspaceNav | null>(null);

export const useWorkspaceNav = () => useContext(WorkspaceNavContext);
