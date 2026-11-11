// Halaman pratinjau email (/dev/emails): mengisi placeholder dengan data contoh. Hanya untuk review desain; pengiriman tetap tugas Email_Service di BE.
import { compileTemplate, listTemplates } from "./build.mjs";

const TEMPLATE_SUBJECTS_FALLBACK = "(tanpa judul)";

const COMMON = {
  logoUrl: "/images/email/logo-rusuh.png",
  appUrl: "",
  supportEmail: "support@rush-my-ticket.my.id",
  customerName: "Budi Santoso",
};

const SAMPLES = {
  "verify-register": {
    verificationUrl: "https://www.rush-my-ticket.my.id/register/verified?token=contoh-token-123",
  },
  "login-link": {
    loginUrl: "https://www.rush-my-ticket.my.id/login/verify?token=contoh-token-456",
    expiryMinutes: "15",
  },
  "booking-expired": {
    bookingCode: "RSH-7K2M9Q",
    eventName: "Rusuh Fest 2026",
    eventUrl: "https://www.rush-my-ticket.my.id/events/rusuh-fest-2026",
  },
  "ticket-issued": {
    eventName: "Rusuh Fest 2026",
    eventDate: "Sabtu, 12 Desember 2026 · 19.00 WIB",
    eventVenue: "Istora Senayan, Jakarta",
    bookingCode: "RSH-7K2M9Q",
    tickets: [
      {
        ticketId: "TKT-0001",
        qrCodeUrl: "/images/email/preview-qr.svg",
        category: "Festival",
        nikMasked: "3174••••••••0001",
      },
      {
        ticketId: "TKT-0002",
        qrCodeUrl: "/images/email/preview-qr.svg",
        category: "Festival",
        nikMasked: "3174••••••••0002",
      },
    ],
  },
};

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );

function render(html, data) {
  const withSections = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, block) =>
    (Array.isArray(data[key]) ? data[key] : []).map((item) => render(block, { ...data, ...item })).join(""),
  );
  return withSections.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in data ? escapeHtml(data[key]) : match,
  );
}

export function sampleData(name) {
  return { ...COMMON, ...SAMPLES[name] };
}

/** Subjek email = isi `<title>` template (lihat emails/README.md). */
export function subjectOf(html) {
  return /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim() ?? TEMPLATE_SUBJECTS_FALLBACK;
}

export async function renderPreview(name) {
  if (!(await listTemplates()).includes(name)) return null;
  const html = await compileTemplate(name);
  const data = sampleData(name);
  return { html: render(html, data), subject: render(subjectOf(html), data) };
}

export async function listPreviews() {
  const names = (await listTemplates()).sort();
  return Promise.all(names.map(async (name) => ({ name, ...(await renderPreview(name)) })));
}
