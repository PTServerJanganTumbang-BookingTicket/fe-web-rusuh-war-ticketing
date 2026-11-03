"use client";

import { useVerifyLoginController } from "../controllers/verify-login.controller";
import { VerifyLoginView } from "./VerifyLoginView";

export function VerifyLoginContainer() {
  return <VerifyLoginView {...useVerifyLoginController()} />;
}
