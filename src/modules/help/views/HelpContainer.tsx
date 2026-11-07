"use client";

import { useHelpController } from "../controllers/help.controller";
import { HelpView } from "./HelpView";

export function HelpContainer() {
  return <HelpView {...useHelpController()} />;
}
