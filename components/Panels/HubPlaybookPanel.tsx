"use client";

import { Check, ClipboardList, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVmeshStore } from "@/store/useVmeshStore";

export function HubPlaybookPanel() {
  const playbook = useVmeshStore((state) => state.hubPlaybook);
  const toggleTask = useVmeshStore((state) => state.toggleHubPlaybookTask);
  const updateTaskNotes = useVmeshStore((state) => state.updateHubPlaybookTaskNotes);
  const setActivePanel = useVmeshStore((state) => state.setActivePanel);
  const primaryTask = playbook.tasks[0];

  const exportChecklist = () => {
    const checklist = {
      h3Id: playbook.selectedH3Id,
      readinessScore: playbook.readinessScore,
      updatedAt: playbook.updatedAt,
      tasks: playbook.tasks
    };
    const blob = new Blob([JSON.stringify(checklist, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vmesh-hub-checklist-${playbook.selectedH3Id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="absolute right-6 top-6 z-30 w-80 bg-white/94 p-3 shadow-[0_24px_80px_rgba(31,53,58,0.18)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#52616f]">
          <ClipboardList className="h-4 w-4 text-[#0f766e]" />
          Build A Hub
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[6px] bg-[#eef8f6] px-2 py-1 text-xs font-semibold text-[#0f766e]">
            {playbook.readinessScore}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setActivePanel(null)}
            aria-label="Close build a hub"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {playbook.tasks.slice(0, 6).map((task) => (
          <button
            key={task.id}
            className="flex w-full items-center gap-2 rounded-[8px] border border-[#e6eeec] bg-[#fbfdfc] px-2 py-2 text-left text-xs text-[#52616f] transition hover:border-[#9fd8c5]"
            onClick={() => toggleTask(task.id)}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border ${
                task.complete
                  ? "border-[#0f766e] bg-[#0f766e] text-white"
                  : "border-[#c8d7d4] bg-white text-transparent"
              }`}
            >
              <Check className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1 truncate">{task.title}</span>
            <span className="font-mono text-[10px] uppercase text-[#7b8893]">{task.phase}</span>
          </button>
        ))}
      </div>
      <textarea
        className="mt-3 h-16 w-full resize-none rounded-[8px] border border-[#e6eeec] bg-white px-3 py-2 text-xs text-[#41515f] outline-none focus:border-[#9fd8c5]"
        placeholder="Hub notes for selected hex"
        value={primaryTask?.notes ?? ""}
        onChange={(event) => {
          if (primaryTask) updateTaskNotes(primaryTask.id, event.target.value);
        }}
      />
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={exportChecklist}>
        Export Checklist
      </Button>
    </Card>
  );
}
