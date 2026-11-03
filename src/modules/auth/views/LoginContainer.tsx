"use client";

import { useLoginController } from "../controllers/login.controller";
import { LoginView } from "./LoginView";

export function LoginContainer() {
  return <LoginView {...useLoginController()} />;
}
