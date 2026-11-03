"use client";

import { useAccountController } from "../controllers/account.controller";
import { AccountView } from "./AccountView";

export function AccountContainer() {
  return <AccountView {...useAccountController()} />;
}
