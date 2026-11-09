"use client";

import { Button } from "@/components/ui/button";

export type FilterTab = {
  id: string;
  label: string;
};

export type EventFilterProps = {
  tabs: FilterTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export function EventFilter({ tabs, activeTab, onTabChange }: EventFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? "default" : "outline"}
          size="sm"
          onClick={() => onTabChange(tab.id)}
          className={activeTab === tab.id ? "bg-brand-dark hover:bg-brand-dark/90" : ""}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
