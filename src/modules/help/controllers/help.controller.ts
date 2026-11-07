"use client";

// Pusat Bantuan. Menu "Bantuan" di navbar tidak lagi berujung 404; isi final menunggu konten dari tim.

import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import type { HelpViewProps } from "../views/HelpView";
import { toHelpViewProps } from "./help.mapper";

export function useHelpController(): HelpViewProps {
  return toHelpViewProps(useSiteChrome({ active: "/help" }));
}
