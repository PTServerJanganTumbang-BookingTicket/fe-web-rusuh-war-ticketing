// Data awal mock. Bentuk mengikuti contoh di src/core/data/http/openapi.json.

export type MockCategory = {
  id: string;
  name: string;
  description: string;
  price: number;
  available: number;
};

export type MockEvent = {
  id: string;
  name: string;
  category: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  imageUrl: string;
  description: string;
  status: "AVAILABLE" | "SELLING_OUT_FAST" | "SOLD_OUT";
  queueState: "NOT_OPEN" | "DIRECT" | "OPEN" | "FULL";
  queueDepth: number;
  saleStartsAt: string;
  display: {
    enabled: boolean;
    action: "JOIN_QUEUE" | "GO_TO_TICKETS" | "NONE";
    labelKey: string;
    badgeKey: string | null;
  };
  categories: MockCategory[];
};

export const QUEUE_CAPACITY = 300_000;
export const MAX_TICKETS_PER_ORDER = 3;
export const MAX_SAVED_NIKS = 5;

export function createEvents(): MockEvent[] {
  return [
    {
      id: "evt_konser_a",
      name: "Konser A",
      category: "LIVE MUSIC",
      venue: "GBK",
      city: "Jakarta",
      date: "2026-12-25",
      time: "19:00",
      imageUrl: "/images/concert-placeholder.webp",
      description: "Energi panggung.",
      status: "AVAILABLE",
      queueState: "OPEN",
      queueDepth: 1248,
      saleStartsAt: "2026-11-10T02:00:00Z",
      display: { enabled: true, action: "JOIN_QUEUE", labelKey: "join_queue", badgeKey: null },
      categories: [
        {
          id: "cat_vip",
          name: "VIP",
          description: "Lebih dekat dengan energi panggung.",
          price: 1_500_000,
          available: 12,
        },
        {
          id: "cat_festival",
          name: "Festival",
          description: "Nikmati konser dari area festival.",
          price: 850_000,
          available: 240,
        },
        {
          id: "cat_tribune",
          name: "Tribune",
          description: "Area tribun dengan panorama panggung.",
          price: 500_000,
          available: 0,
        },
      ],
    },
    {
      id: "evt_konser_b",
      name: "Konser B",
      category: "LIVE MUSIC",
      venue: "GOR Saparua",
      city: "Bandung",
      date: "2027-01-10",
      time: "19:30",
      imageUrl: "/images/concert-placeholder.webp",
      description: "Antrian penuh.",
      status: "SELLING_OUT_FAST",
      queueState: "FULL",
      queueDepth: QUEUE_CAPACITY,
      saleStartsAt: "2026-11-10T02:00:00Z",
      display: { enabled: false, action: "NONE", labelKey: "queue_full", badgeKey: "selling_out_fast" },
      categories: [
        {
          id: "cat_festival",
          name: "Festival",
          description: "Nikmati konser dari area festival.",
          price: 750_000,
          available: 3,
        },
      ],
    },
    {
      id: "evt_konser_c",
      name: "Konser C",
      category: "LIVE MUSIC",
      venue: "Jatim Expo",
      city: "Surabaya",
      date: "2027-02-02",
      time: "20:00",
      imageUrl: "/images/concert-placeholder.webp",
      description: "Penjualan belum dibuka.",
      status: "AVAILABLE",
      queueState: "NOT_OPEN",
      queueDepth: 0,
      saleStartsAt: "2027-01-05T02:00:00Z",
      display: { enabled: false, action: "NONE", labelKey: "sale_not_open", badgeKey: "coming_soon" },
      categories: [
        {
          id: "cat_vip",
          name: "VIP",
          description: "Lebih dekat dengan energi panggung.",
          price: 1_250_000,
          available: 50,
        },
        {
          id: "cat_festival",
          name: "Festival",
          description: "Nikmati konser dari area festival.",
          price: 650_000,
          available: 500,
        },
      ],
    },
  ];
}

/** Hasil Dukcapil palsu. NIK 16 digit lain dianggap aktif dengan nama dari 4 digit terakhir. */
const NIK_DIRECTORY: Record<string, { name: string; status: "ACTIVE" | "INACTIVE" } | null> = {
  "3171000000000022": { name: "JOHN DOE", status: "ACTIVE" },
  "3171000000000033": { name: "JANE DOE", status: "ACTIVE" },
  "3171000000000044": { name: "BUDI SANTOSO", status: "ACTIVE" },
  "3171000000000099": { name: "NIK NONAKTIF", status: "INACTIVE" },
  "0000000000000000": null,
};

export function lookupNik(nik: string) {
  if (nik in NIK_DIRECTORY) return NIK_DIRECTORY[nik] ?? null;
  return { name: `WARGA ${nik.slice(-4)}`, status: "ACTIVE" as const };
}

export const isNikFormat = (nik: unknown): nik is string => typeof nik === "string" && /^\d{16}$/.test(nik);

export const maskNik = (nik: string) => `${nik.slice(0, 4)}********xx${nik.slice(-2)}`;

/** NIK yang sudah terdaftar ke akun lain (POST /auth/register → 409). */
export const REGISTERED_NIK = "3171000000000022";

/** Email akun yang masuk lewat magic link di mock (`GET /auth/verify`, `GET /events/{id}/tickets` → `account`). */
export const MOCK_ACCOUNT_EMAIL = "you@example.com";
