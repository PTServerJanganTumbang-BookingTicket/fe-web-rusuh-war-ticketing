import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Poppins di-self-host (subset latin, OFL) agar build tidak bergantung pada Google Fonts.
// Build image harus bisa berjalan di jaringan tertutup atau di belakang proxy (ADR-0013).
const poppins = localFont({
  variable: "--font-poppins",
  src: [
    { path: "./fonts/Poppins-latin-400.woff2", weight: "400" },
    { path: "./fonts/Poppins-latin-500.woff2", weight: "500" },
    { path: "./fonts/Poppins-latin-600.woff2", weight: "600" },
    { path: "./fonts/Poppins-latin-700.woff2", weight: "700" },
  ],
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
  title: "Rusuh Booking Tiket",
  description: "Pesan tiket acara dengan antrian yang adil.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${poppins.variable} ${batik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
