"use client";

import { useRegisterController } from "../controllers/register.controller";
import { RegisterView } from "./RegisterView";

export function RegisterContainer() {
  return <RegisterView {...useRegisterController()} />;
}
