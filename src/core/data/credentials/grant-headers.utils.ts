import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";

/**
 * Header wajib endpoint booking dan payment (kontrak: GrantToken, X-Device-Id). Dengan `eventId`, hanya grant milik
 * event itu yang dikirim.
 * Header grant dilewati bila tab tidak memegang grant: header kosong tidak pernah dikirim.
 */
export function grantHeaders(
  credentialStore: CredentialStoreProtocol,
  eventId?: string,
): Record<string, string> {
  const grant = credentialStore.grantToken(eventId);
  return {
    ...(grant ? { "x-grant-token": grant } : {}),
    "x-device-id": credentialStore.deviceId(),
  };
}
