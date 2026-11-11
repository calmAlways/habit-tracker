"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Habit } from "@prisma/client";
import { Download, ArchiveRestore, Archive, ArrowUp, ArrowDown } from "lucide-react";

const WEEKDAYS = [
  { label: "周日", value: 0 },
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 },
];

const STREAK_MODES = [
  { label: "每天", value: "DAILY" },
  { label: "工作日", value: "WEEKDAYS" },
  { label: "周末", value: "WEEKENDS" },
  { label: "自定义", value: "CUSTOM" },
];

export default function SettingsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"CHECK" | "QUANTITY">("CHECK");

  async function refresh() {
    try {
      const res = await fetch("/api/habits?archived=1");
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      const items = Array.isArray(json.items) ? json.items : [];
      setHabits(items.sort((a: Habit, b: Habit) => a.sortOrder - b.sortOrder));
    } catch (err) {
      console.error(err);
      setHabits([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function updateHabit(id: string, data: Partial<Habit>) {
    setLoading(true);
    await fetch(`/api/habits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    await refresh();
    setLoading(false);
  }

  async function createHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, type: newType }),
    });
    setNewName("");
    await refresh();
    setLoading(false);
  }

  async function reorder(id: string, direction: "up" | "down") {
    const active = habits.filter((h) => !h.archivedAt);
    const idx = active.findIndex((h) => h.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= active.length) return;
    const swapped = [...active];
    [swapped[idx], swapped[newIdx]] = [swapped[newIdx], swapped[idx]];
    setLoading(true);
    await fetch("/api/habits/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: swapped.map((h) => h.id) }),
    });
    await refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <a href="/api/export" download className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download className="size-4 mr-1" />
          导出 CSV
        </a>
      </div>

      <div className="space-y-3">
        {habits.map((h) => (
          <Card key={h.id} className={h.archivedAt ? "opacity-70" : ""}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={h.name}
                  onBlur={(e) => updateHabit(h.id, { name: e.target.value })}
                  disabled={loading || !!h.archivedAt}
                />
                {!h.archivedAt && (
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => reorder(h.id, "up")}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => reorder(h.id, "down")}>
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {h.type === "QUANTITY" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">单位</Label>
                    <Input
                      defaultValue={h.unit ?? ""}
                      onBlur={(e) => updateHabit(h.id, { unit: e.target.value || null })}
                      disabled={loading || !!h.archivedAt}
                    />
                  </div>
                </div>
              )}

              {h.type === "CHECK" && (
                <div className="space-y-2">
                  <Select
                    value={h.streakMode}
                    onValueChange={(v) => updateHabit(h.id, { streakMode: v as any })}
                    disabled={loading || !!h.archivedAt}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STREAK_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {h.streakMode === "CUSTOM" && (
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAYS.map((d) => (
                        <label key={d.value} className="flex items-center gap-1 text-sm">
                          <Checkbox
                            checked={h.customDays.includes(d.value)}
                            onCheckedChange={(checked) => {
                              const days = checked
                                ? Array.from(new Set([...h.customDays, d.value]))
                                : h.customDays.filter((x) => x !== d.value);
                              updateHabit(h.id, { customDays: days });
                            }}
                          />
                          {d.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateHabit(h.id, { archived: !h.archivedAt })}
                disabled={loading}
              >
                {h.archivedAt ? <ArchiveRestore className="size-4 mr-1" /> : <Archive className="size-4 mr-1" />}
                {h.archivedAt ? "恢复归档" : "归档"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新建习惯</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createHabit} className="flex gap-2">
            <Input
              placeholder="习惯名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              disabled={loading}
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as any)} disabled={loading}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHECK">打卡</SelectItem>
                <SelectItem value="QUANTITY">数值</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading}>
              添加
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
