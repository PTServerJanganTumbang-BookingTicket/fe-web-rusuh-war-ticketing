import { VerifyLoginContainer } from "@/modules/auth/views/VerifyLoginContainer";

// Tujuan link di email login: `/login/verify#token=...` (ADR-0023 usulan 1).
export default function VerifyLoginPage() {
  return <VerifyLoginContainer />;
}
