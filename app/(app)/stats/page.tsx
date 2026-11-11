"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const WINDOWS = ["7", "30", "90", "365", "all"];

export default function StatsPage() {
  const [window, setWindow] = useState("30");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats?window=${window}&includeArchived=${includeArchived ? 1 : 0}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [window, includeArchived]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">统计</h1>
        <div className="flex items-center gap-2">
          <Switch id="archived" checked={includeArchived} onCheckedChange={setIncludeArchived} />
          <Label htmlFor="archived" className="text-sm">
            显示已归档
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <Button
            key={w}
            variant={window === w ? "default" : "outline"}
            size="sm"
            onClick={() => setWindow(w)}
          >
            {w === "all" ? "全部" : `${w} 天`}
          </Button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">加载中...</p>}

      {data?.items && (
        <div className="space-y-3">
          {data.items.map((item: any) => (
            <StatCard key={item.habit.id} habit={item.habit} check={item.check} quantity={item.quantity} />
          ))}
        </div>
      )}
    </div>
  );
}
