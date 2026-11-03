import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";

/** Header wajib endpoint booking dan payment (kontrak: GrantToken, X-Device-Id). */
export function grantHeaders(credentialStore: CredentialStoreProtocol): Record<string, string> {
  return {
    "x-grant-token": credentialStore.grantToken() ?? "",
    "x-device-id": credentialStore.deviceId(),
  };
}
