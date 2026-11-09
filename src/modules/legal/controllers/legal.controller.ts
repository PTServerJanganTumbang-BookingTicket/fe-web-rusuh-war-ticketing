"use client";

// Syarat dan Ketentuan serta Kebijakan Privasi. Requirement: FR-30 (persetujuan saat register), UU PDP.

import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import type { LegalViewProps } from "../views/LegalView";
import { toLegalViewProps, type LegalDocument } from "./legal.mapper";

export function useLegalController(document: LegalDocument): LegalViewProps {
  return toLegalViewProps(document, useSiteChrome());
}
