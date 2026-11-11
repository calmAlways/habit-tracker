"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: Array<{ logDate: string; value: number }>;
  unit: string;
}

export function TrendChart({ data, unit }: Props) {
  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">无趋势数据</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="logDate" hide />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [`${value} ${unit}`, "数值"]}
          labelFormatter={(label: string) => label}
        />
        <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
