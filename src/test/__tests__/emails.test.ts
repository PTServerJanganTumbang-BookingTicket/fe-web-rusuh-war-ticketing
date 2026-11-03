// Template email dikompilasi dalam mode strict; placeholder harus sampai utuh ke BE.
import { describe, expect, it } from "vitest";
import { compileTemplate, listTemplates } from "../../../emails/build.mjs";

const PLACEHOLDERS: Record<string, string[]> = {
  "verify-register": ["customerName", "verificationUrl", "supportEmail"],
  "login-link": ["customerName", "loginUrl", "expiryMinutes", "supportEmail"],
  "booking-expired": ["bookingCode", "eventName", "eventUrl", "supportEmail"],
  "ticket-issued": [
    "eventName",
    "eventDate",
    "eventVenue",
    "bookingCode",
    "#tickets",
    "ticketId",
    "qrCodeUrl",
    "category",
    "nikMasked",
    "/tickets",
    "supportEmail",
  ],
};

describe("template email", () => {
  it("setiap template punya daftar placeholder", async () => {
    expect((await listTemplates()).sort()).toEqual(Object.keys(PLACEHOLDERS).sort());
  });

  it.each(Object.entries(PLACEHOLDERS))(
    "%s mengompilasi dan mempertahankan placeholder",
    async (name, keys) => {
      const html = await compileTemplate(name);

      expect(html).toContain('lang="id"');
      for (const key of keys) {
        expect(html).toContain(`{{${key}}}`);
      }
    },
  );

  it("satu blok ticket-issued berulang per tiket", async () => {
    const html = await compileTemplate("ticket-issued");

    const block = html.slice(html.indexOf("{{#tickets}}"), html.indexOf("{{/tickets}}"));
    expect(block).toContain('src="{{qrCodeUrl}}"');
    expect(block).toContain("{{nikMasked}}");
    expect(html).not.toContain("seatNumber");
    expect(html.indexOf("{{#tickets}}")).toBeLessThan(html.indexOf("{{/tickets}}"));
  });

  it("tombol link memakai placeholder URL apa adanya", async () => {
    expect(await compileTemplate("verify-register")).toContain('href="{{verificationUrl}}"');
    expect(await compileTemplate("login-link")).toContain('href="{{loginUrl}}"');
  });
});
