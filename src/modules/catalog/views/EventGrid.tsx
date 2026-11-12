"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/layout/EmptyState";
import { EventCard, type EventCardProps } from "./EventCard";
import { Input } from "@/components/ui/input";
import { EventFilter } from "./EventFilter";

export type EventGridProps = {
  events: EventCardProps[];
  filterLabel: string;
  allLabel: string;
  emptyCategoryLabel: string;
  /** Kotak cari di sisi klien (nama, lokasi, kategori); tanpa ini tidak ada kotak cari. */
  search?: { label: string; placeholder: string; empty: string };
};

const ALL = "all";

/** Daftar kartu dengan filter kategori. Kategori diambil dari event yang tampil; tab hanya muncul bila ada lebih dari satu. */
export function EventGrid({ events, filterLabel, allLabel, emptyCategoryLabel, search }: EventGridProps) {
  const [active, setActive] = useState(ALL);
  const [query, setQuery] = useState("");
  const categories = [...new Set(events.map((event) => event.category))];
  // Kategori yang hilang saat refresh (event hilang dari daftar) kembali ke "Semua", bukan layar kosong.
  const selected = categories.includes(active) ? active : ALL;
  const byCategory = selected === ALL ? events : events.filter((event) => event.category === selected);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? byCategory.filter((event) =>
        [event.name, event.venue, event.location, event.category].some((text) =>
          text.toLowerCase().includes(needle),
        ),
      )
    : byCategory;

  return (
    <div className="flex flex-col gap-6">
      {search && (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={search.label}
          placeholder={search.placeholder}
          className="sm:max-w-md"
        />
      )}
      {categories.length > 1 && (
        <div role="group" aria-label={filterLabel}>
          <EventFilter
            tabs={[
              { id: ALL, label: allLabel },
              ...categories.map((category) => ({ id: category, label: category })),
            ]}
            activeTab={selected}
            onTabChange={setActive}
          />
        </div>
      )}
      {visible.length === 0 ? (
        <EmptyState illustration="events" title={needle && search ? search.empty : emptyCategoryLabel} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((event, index) => (
            <div
              key={event.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards motion-reduce:animate-none"
              // Jeda bertingkat dibatasi supaya daftar panjang tidak terasa lambat.
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <EventCard {...event} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
