"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Habit, HabitLog } from "@prisma/client";
import { toDateString } from "@/lib/date";

interface Props {
  habit: Habit;
  logs: HabitLog[];
  onAdd: (value: number, occurredAt: string, note?: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function QuantityDialog({ habit, logs, onAdd, onDelete, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [occurredAt, setOccurredAt] = useState(toDatetimeLocal(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0 || num > 100000) {
      setError("请输入 1–100000 的整数");
      return;
    }
    const localWithOffset = `${occurredAt}:00+08:00`;
    const parsed = new Date(localWithOffset);
    if (Number.isNaN(parsed.getTime())) {
      setError("时间格式错误");
      return;
    }
    onAdd(num, parsed.toISOString(), note);
    setOpen(false);
    setValue("");
    setNote("");
    setError("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="记录"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <Plus className="size-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>记录 {habit.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`value-${habit.id}`}>
              数值（{habit.unit ?? "分钟"}）
            </Label>
            <Input
              id={`value-${habit.id}`}
              type="number"
              min={1}
              max={100000}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`time-${habit.id}`}>时间</Label>
            <Input
              id={`time-${habit.id}`}
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`note-${habit.id}`}>备注</Label>
            <Input
              id={`note-${habit.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            保存
          </Button>
        </form>
        {logs.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">今天已记录</p>
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span>
                  {l.value} {habit.unit} · {toDateString(new Date(l.occurredAt))}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(l.id)}>
                  删除
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
