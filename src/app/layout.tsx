import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Telkomsel Batik Sans: font heading Signal DS (ADR-0012).
const batik = localFont({
  variable: "--font-batik",
  src: [
    { path: "./fonts/TelkomselBatikSans-Regular.woff2", weight: "400" },
    { path: "./fonts/TelkomselBatikSans-Bold.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Rusuh Booking Tiket",
    template: "%s | Rusuh Booking Tiket",
  },
  description:
    "Platform pemesanan tiket konser dan acara musik dengan sistem antrian yang adil. Dapatkan tiket event favoritmu tanpa bot dan calo.",
  keywords: [
    "tiket konser",
    "booking tiket",
    "tiket musik",
    "antrian tiket",
    "beli tiket online",
    "tiket event",
    "konser Indonesia",
    "festival musik",
    "tiket adil",
    "rusuh tiket",
  ],
  authors: [{ name: "PT Server Jangan Tumbang" }],
  creator: "PT Server Jangan Tumbang",
  publisher: "PT Server Jangan Tumbang",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Rusuh Booking Tiket",
    title: "Rusuh Booking Tiket",
    description:
      "Platform pemesanan tiket konser dan acara musik dengan sistem antrian yang adil. Dapatkan tiket event favoritmu tanpa bot dan calo.",
  },
  twitter: {
    card: "summary",
    title: "Rusuh Booking Tiket",
    description: "Platform pemesanan tiket konser dan acara musik dengan sistem antrian yang adil.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${poppins.variable} ${batik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
