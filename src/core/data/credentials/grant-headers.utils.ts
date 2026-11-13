import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";

/**
 * Header wajib endpoint booking dan payment (kontrak: GrantToken, X-Device-Id). Dengan `eventId`, hanya grant milik
 * event itu yang dikirim.
 */
export function grantHeaders(
  credentialStore: CredentialStoreProtocol,
  eventId?: string,
): Record<string, string> {
  return {
    "x-grant-token": credentialStore.grantToken(eventId) ?? "",
    "x-device-id": credentialStore.deviceId(),
  };
}
