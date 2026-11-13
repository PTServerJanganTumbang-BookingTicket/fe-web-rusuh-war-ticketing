import { describe, expect, it } from "vitest";
import type { CredentialStoreProtocol } from "@/core/domain/credential-store.protocol";
import { grantHeaders } from "../grant-headers.utils";

const store = (grant: string | null) =>
  ({ grantToken: () => grant, deviceId: () => "dev_1" }) as unknown as CredentialStoreProtocol;

describe("grantHeaders", () => {
  it("menyertakan grant dan device id bila grant dipegang", () => {
    expect(grantHeaders(store("grant_1"))).toEqual({ "x-grant-token": "grant_1", "x-device-id": "dev_1" });
  });

  it("tanpa grant, header X-Grant-Token tidak dikirim (bukan string kosong)", () => {
    expect(grantHeaders(store(null))).toEqual({ "x-device-id": "dev_1" });
  });
});
