"use client";

import { usePathname } from "next/navigation";
import { AccountLink, NavLinks } from "@rusuh/ui";
import { toAccountLinkProps, toNavLinksProps } from "./siteNav";

// Satu-satunya bagian navbar yang membaca URL. Dirender di dalam Suspense agar route dinamis tetap bisa diprerender
// (Cache Components) dan Home tetap statis (ADR-0007).

export function ActiveNavLinks() {
  return <NavLinks {...toNavLinksProps(usePathname())} />;
}

export function CurrentAccountLink() {
  return <AccountLink {...toAccountLinkProps(usePathname())} />;
}
