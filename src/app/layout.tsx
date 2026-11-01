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
