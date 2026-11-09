"use client";

import { useLegalController } from "../controllers/legal.controller";
import type { LegalDocument } from "../controllers/legal.mapper";
import { LegalView } from "./LegalView";

export function LegalContainer({ document }: { document: LegalDocument }) {
  return <LegalView {...useLegalController(document)} />;
}
