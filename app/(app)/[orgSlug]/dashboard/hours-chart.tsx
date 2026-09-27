'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
   type ChartConfig,
   ChartContainer,
   ChartLegend,
   ChartLegendContent,
   ChartTooltip,
   ChartTooltipContent
} from '@/components/ui/chart';
import { formatDuration } from '@/lib/format';

export type ProjectHours = {
   key: string;
   name: string;
   client: string;
   billable: number; // hours (decimal), so the axis gets round numbers
   nonBillable: number;
};

const config = {
   billable: { label: 'Billable', color: 'var(--chart-1)' },
   nonBillable: { label: 'Non-billable', color: 'var(--chart-4)' }
} satisfies ChartConfig;

/** Longer project names are cut on the axis ("Brand guidelines and packa…"); the tooltip has the full name. */
const MAX_NAME = 22;

const hours = (value: number) => formatDuration(Math.round(value * 3600));

/** Whole-hour axis ticks from 0 past the longest bar, about 5 of them: [0, 1, 2, 3, 4, 5]. */
function hourTicks(data: ProjectHours[]) {
   const longest = Math.max(1, ...data.map((row) => row.billable + row.nonBillable));
   const step = Math.max(1, Math.ceil(longest / 5));
   return Array.from({ length: Math.ceil(longest / step) + 1 }, (_, i) => i * step);
}

/** One horizontal bar per project, billable and non-billable time stacked. */
export function HoursChart({ data }: { data: ProjectHours[] }) {
   const ticks = hourTicks(data);
   // Room for the longest project name (about 8 px per character at this size), within limits.
   const longestName = Math.max(...data.map((row) => Math.min(row.name.length, MAX_NAME)));
   const labelWidth = Math.min(180, Math.max(56, longestName * 8 + 12));
   return (
      <ChartContainer
         config={config}
         className='aspect-auto w-full'
         // Grows with the number of projects: ~40 px per bar plus room for the axis and legend.
         style={{ height: data.length * 40 + 72 }}
      >
         <BarChart data={data} layout='vertical' margin={{ left: 4, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <XAxis
               type='number'
               tickLine={false}
               axisLine={false}
               // Our own whole-hour ticks: Recharts' "nice" ones made 4.5 h an 8 h axis.
               ticks={ticks}
               domain={[0, ticks.at(-1)!]}
               tickFormatter={(value: number) => `${value} h`}
            />
            <YAxis
               type='category'
               dataKey='name'
               tickLine={false}
               axisLine={false}
               width={labelWidth}
               tickFormatter={(name: string) =>
                  name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name
               }
            />
            <ChartTooltip
               cursor={false}
               content={
                  <ChartTooltipContent
                     labelFormatter={(_, payload) => {
                        const row = payload[0]?.payload as ProjectHours | undefined;
                        return row && `${row.name} · ${row.client}`;
                     }}
                     formatter={(value, name) => (
                        <div className='flex w-full justify-between gap-4'>
                           <span className='text-muted-foreground'>
                              {config[name as keyof typeof config]?.label ?? name}
                           </span>
                           <span className='font-medium tabular-nums'>{hours(Number(value))}</span>
                        </div>
                     )}
                  />
               }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
               dataKey='billable'
               stackId='hours'
               fill='var(--color-billable)'
               radius={[4, 0, 0, 4]}
            />
            <Bar
               dataKey='nonBillable'
               stackId='hours'
               fill='var(--color-nonBillable)'
               radius={[0, 4, 4, 0]}
            />
         </BarChart>
      </ChartContainer>
   );
}
