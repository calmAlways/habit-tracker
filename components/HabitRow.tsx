"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckButton } from "./CheckButton";
import { QuantityDialog } from "./QuantityDialog";
import { Habit, HabitLog } from "@prisma/client";
import { formatDurationMinutes } from "@/lib/date";

interface HabitRowProps {
  habit: Habit;
  today: string;
  logs: HabitLog[];
}

export function HabitRow({ habit, today, logs }: HabitRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const checkLog = habit.type === "CHECK" ? logs.find((l) => l.value === null) : undefined;
  const quantityLogs = habit.type === "QUANTITY" ? logs : [];
  const quantityTotal = quantityLogs.reduce((s, l) => s + (l.value ?? 0), 0);

  async function toggleCheck() {
    setBusy(true);
    try {
      if (checkLog) {
        await fetch(`/api/logs?id=${checkLog.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habitId: habit.id }),
        });
      }
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function addQuantity(value: number, occurredAt: string, note?: string) {
    setBusy(true);
    try {
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: habit.id, value, occurredAt, note }),
      });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function deleteQuantity(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/logs?id=${id}`, { method: "DELETE" });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{habit.name}</p>
          {habit.type === "QUANTITY" && (
            <p className="text-sm text-muted-foreground">
              今天 {formatDurationMinutes(quantityTotal)}（{quantityLogs.length} 次）
            </p>
          )}
        </div>
        <div className="shrink-0">
          {habit.type === "CHECK" ? (
            <CheckButton checked={!!checkLog} onClick={toggleCheck} disabled={busy} />
          ) : (
            <QuantityDialog
              habit={habit}
              logs={quantityLogs}
              onAdd={addQuantity}
              onDelete={deleteQuantity}
              disabled={busy}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
