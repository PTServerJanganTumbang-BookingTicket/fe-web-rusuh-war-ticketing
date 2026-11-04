"use client";

import {
  useEmailVerifiedController,
  useVerifyEmailController,
} from "../controllers/registration-status.controller";
import { RegistrationStatusView } from "./RegistrationStatusView";

export function VerifyEmailContainer() {
  return <RegistrationStatusView {...useVerifyEmailController()} />;
}

export function EmailVerifiedContainer() {
  return <RegistrationStatusView {...useEmailVerifiedController()} />;
}
