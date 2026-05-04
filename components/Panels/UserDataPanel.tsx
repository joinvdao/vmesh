"use client";

import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRecordCategory } from "@/lib/vmeshTypes";
import { useVmeshStore } from "@/store/useVmeshStore";

const categories: { value: UserRecordCategory; label: string }[] = [
  { value: "observation", label: "Observation" },
  { value: "property-note", label: "Property" },
  { value: "farmers-market", label: "Market" },
  { value: "grower", label: "Grower" },
  { value: "community-asset", label: "Asset" },
  { value: "correction", label: "Correction" }
];

export function UserDataPanel() {
  const draft = useVmeshStore((state) => state.draftUserRecord);
  const selected = useVmeshStore((state) => state.selectedHexDetails);
  const updateDraft = useVmeshStore((state) => state.updateDraftUserRecord);
  const addUserRecord = useVmeshStore((state) => state.addUserRecord);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);

  return (
    <div className="absolute right-6 top-6 z-30 w-80 rounded-[12px] border border-[#dfe8e6] bg-white/94 p-3 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#52616f]">
            Add Local Data
          </div>
          <div className="mt-1 max-w-[200px] truncate font-mono text-[10px] text-[#7b8893]">
            {selected.h3Id}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">Private</Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setActivePanel(null)}
            aria-label="Close add local data"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <button
            key={category.value}
            className={`rounded-[6px] border px-2 py-1 text-[10px] ${
              draft.category === category.value
                ? "border-[#76c9bf] bg-[#eef9f6] text-[#0f766e]"
                : "border-[#dfe8e6] bg-white text-[#6f7d88]"
            }`}
            onClick={() => updateDraft({ category: category.value })}
          >
            {category.label}
          </button>
        ))}
      </div>
      <Input
        value={draft.title}
        onChange={(event) => updateDraft({ title: event.target.value })}
        placeholder="Local note title"
        className="h-9 text-xs"
      />
      <Button variant="default" size="sm" className="mt-3 w-full" onClick={addUserRecord}>
        <Plus className="h-3.5 w-3.5" />
        Attach to selected hex
      </Button>
    </div>
  );
}
