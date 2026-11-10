"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/layout/EmptyState";
import { EventCard, type EventCardProps } from "./EventCard";
import { EventFilter } from "./EventFilter";

export type EventGridProps = {
  events: EventCardProps[];
  filterLabel: string;
  allLabel: string;
  emptyCategoryLabel: string;
};

const ALL = "all";

/** Daftar kartu dengan filter kategori. Kategori diambil dari event yang tampil; tab hanya muncul bila ada lebih dari satu. */
export function EventGrid({ events, filterLabel, allLabel, emptyCategoryLabel }: EventGridProps) {
  const [active, setActive] = useState(ALL);
  const categories = [...new Set(events.map((event) => event.category))];
  // Kategori yang hilang saat refresh (event hilang dari daftar) kembali ke "Semua", bukan layar kosong.
  const selected = categories.includes(active) ? active : ALL;
  const visible = selected === ALL ? events : events.filter((event) => event.category === selected);

  return (
    <div className="flex flex-col gap-6">
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
        <EmptyState illustration="events" title={emptyCategoryLabel} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>
      )}
    </div>
  );
}
