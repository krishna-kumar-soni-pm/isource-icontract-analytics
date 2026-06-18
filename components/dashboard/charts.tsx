"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CHART_COLORS } from "@/lib/colors";
import { compact } from "@/lib/format";

const EMPTY_CFG = {} satisfies ChartConfig;

function truncate(s: string, n = 32) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Horizontal ranked bars. Height scales with item count. */
export function RankBarChart({
  data,
  color = "var(--chart-1)",
  valueLabel = "Value",
  perBarColor = false,
}: {
  data: { label: string; value: number; full?: string }[];
  color?: string;
  valueLabel?: string;
  perBarColor?: boolean;
}) {
  const height = Math.max(160, data.length * 36 + 16);
  const config = { value: { label: valueLabel } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 6, right: 48, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={210}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => truncate(v)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              labelKey="full"
              formatter={(value) => (
                <span className="font-medium tabular-nums">
                  {compact(Number(value))} {valueLabel.toLowerCase()}
                </span>
              )}
            />
          }
        />
        <Bar dataKey="value" radius={4} fill={color} maxBarSize={22} isAnimationActive={false}>
          {perBarColor &&
            data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={11}
            formatter={(v) => compact(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Donut with center total + legend rows handled by caller. */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; fill: string }[];
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <ChartContainer config={EMPTY_CFG} className="mx-auto aspect-square h-[210px]">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium tabular-nums">{compact(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={92}
          paddingAngle={2}
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Pie>
        {centerValue && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            <tspan x="50%" dy="-0.3em" className="fill-foreground text-2xl font-semibold tabular-nums">
              {centerValue}
            </tspan>
            {centerLabel && (
              <tspan x="50%" dy="1.6em" className="fill-muted-foreground text-xs">
                {centerLabel}
              </tspan>
            )}
          </text>
        )}
      </PieChart>
    </ChartContainer>
  );
}

/** Vertical bars (timelines, cohorts). Optional per-bar color. */
export function ColumnChart({
  data,
  color = "var(--chart-1)",
  height = 240,
  valueLabel = "Value",
}: {
  data: { label: string; value: number; fill?: string }[];
  color?: string;
  height?: number;
  valueLabel?: string;
}) {
  const config = { value: { label: valueLabel } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 16, bottom: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => compact(v)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-medium tabular-nums">
                  {compact(Number(value))} {valueLabel.toLowerCase()}
                </span>
              )}
            />
          }
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={color} maxBarSize={48} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill ?? color} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            offset={6}
            className="fill-muted-foreground"
            fontSize={10}
            formatter={(v) => compact(Number(v))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Customer quadrant: x = adoption breadth (%), y = total interactions (log), bubble = users. */
export function QuadrantScatter({
  data,
  xMid,
}: {
  data: { x: number; y: number; z: number; name: string; fill: string; segment: string }[];
  xMid: number;
}) {
  return (
    <ChartContainer config={EMPTY_CFG} className="aspect-auto h-[320px] w-full">
      <ScatterChart margin={{ left: 8, right: 16, top: 12, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          label={{ value: "Adoption breadth →", position: "bottom", offset: 10, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="number"
          dataKey="y"
          scale="log"
          domain={[1, "auto"]}
          allowDataOverflow
          tickFormatter={(v: number) => compact(v)}
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11 }}
          label={{ value: "Interactions", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <ZAxis type="number" dataKey="z" range={[50, 460]} />
        <ReferenceLine x={xMid} stroke="var(--border)" strokeDasharray="4 4" />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_v, _n, item) => {
                const p = item?.payload as { name: string; x: number; y: number; z: number; segment: string };
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{truncate(p.name, 40)}</span>
                    <span className="text-muted-foreground">
                      {p.segment} · {p.x}% adoption · {compact(p.y)} interactions · {p.z} users
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Scatter data={data} fillOpacity={0.72} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}

/** Reach (x: companies adopting) vs engagement depth (y: avg/user), bubble = volume. */
export function DepthScatter({
  data,
}: {
  data: { x: number; y: number; z: number; name: string; fill: string }[];
}) {
  return (
    <ChartContainer config={EMPTY_CFG} className="aspect-auto h-[300px] w-full">
      <ScatterChart margin={{ left: 4, right: 16, top: 12, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Customers adopting"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
          label={{ value: "Customers adopting →", position: "bottom", offset: 8, fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Avg / user"
          tickLine={false}
          axisLine={false}
          width={40}
          tick={{ fontSize: 11 }}
          label={{ value: "Avg / user", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <ZAxis type="number" dataKey="z" range={[40, 520]} />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_v, _n, item) => {
                const p = item?.payload as { name: string; x: number; y: number; z: number };
                return (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{truncate(p.name, 40)}</span>
                    <span className="text-muted-foreground">
                      {p.x} customers · {p.y}/user · {compact(p.z)} total
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Scatter data={data} fillOpacity={0.7} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}
