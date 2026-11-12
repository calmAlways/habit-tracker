import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Habit } from "@prisma/client";
import { formatDateTimeShanghai } from "@/lib/date";
import { TrendChart } from "./TrendChart";

export interface CheckStats {
  streak: number;
  lastOccurredAt: string | null;
  count: number;
}

export interface QuantityStats {
  totalValue: number;
  count: number;
  unit: string;
  displayTotal: string;
  trend: Array<{ logDate: string; value: number }>;
}

interface Props {
  habit: Habit;
  check: CheckStats | null;
  quantity: QuantityStats | null;
}

export function StatCard({ habit, check, quantity }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{habit.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {check && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{check.streak}</p>
              <p className="text-xs text-muted-foreground">连续天数</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{check.count}</p>
              <p className="text-xs text-muted-foreground">打卡次数</p>
            </div>
            <div className="flex items-center justify-center">
              <p className="text-xs text-muted-foreground">
                {check.lastOccurredAt ? formatDateTimeShanghai(new Date(check.lastOccurredAt)) : "无记录"}
              </p>
            </div>
          </div>
        )}
        {quantity && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-semibold tabular-nums">{quantity.displayTotal}</p>
              <p className="text-sm text-muted-foreground">{quantity.count} 次记录</p>
            </div>
            <div className="h-40">
              <TrendChart data={quantity.trend} unit={quantity.unit} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
