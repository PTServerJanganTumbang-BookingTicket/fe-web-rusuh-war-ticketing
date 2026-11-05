"use client";

import { useSiteChrome } from "@/core/controllers/site-chrome.hook";
import { HelpView } from "@/core/views/HelpView";

// Placeholder Pusat Bantuan: menu "Bantuan" di navbar tidak lagi berujung 404. Isi final menunggu konten dari tim.
export default function HelpPage() {
  const { nav, footer } = useSiteChrome({ active: "/help" });
  return <HelpView nav={nav} footer={footer} />;
}
