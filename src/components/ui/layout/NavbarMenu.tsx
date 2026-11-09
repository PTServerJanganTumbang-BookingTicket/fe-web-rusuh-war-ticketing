"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../button";
import { cn } from "../cn.utils";
import { MenuIcon } from "../icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../sheet";
import type { NavItem } from "./Navbar";

export type NavbarMenuProps = {
  items: NavItem[];
  /** Nama tombol pembuka dan judul panel, misalnya "Menu". */
  label: string;
  closeLabel: string;
};

/**
 * Navigasi untuk layar sempit (< `md`), tempat tautan utama navbar disembunyikan. Panel bawah yang sama dengan
 * dialog mobile: geser ke bawah atau Escape menutup, dan memilih tautan menutup panel.
 */
export function NavbarMenu({ items, label, closeLabel }: NavbarMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <MenuIcon aria-hidden="true" className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent closeLabel={closeLabel}>
          <SheetHeader>
            <SheetTitle className="type-h5">{label}</SheetTitle>
          </SheetHeader>
          <nav aria-label={label} className="flex flex-col">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "type-body1-bold flex min-h-12 items-center border-b border-border last:border-b-0",
                  item.active ? "text-primary" : "text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
