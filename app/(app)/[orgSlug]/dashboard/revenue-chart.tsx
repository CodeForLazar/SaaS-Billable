'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
   type ChartConfig,
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent
} from '@/components/ui/chart';
import { formatMoney } from '@/lib/money';

export type RevenueMonth = {
   key: string; // "2026-09", unique per month
   label: string; // "Sep", on the axis
   title: string; // "September 2026", in the tooltip
   cents: number;
   count: number; // invoices paid
};

// The colors come from CSS variables (the theme's --chart-1), so the chart follows the theme.
const config = {
   cents: { label: 'Paid', color: 'var(--chart-1)' }
} satisfies ChartConfig;

/** "€1.2K": short amounts for the axis (Intl's compact notation). */
function compactMoney(cents: number, currency: string) {
   return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
   }).format(cents / 100);
}

// A Client Component: Recharts measures the container and shows tooltips in the browser. The
// numbers and labels are prepared by the server page, so this only draws.
export function RevenueChart({ data, currency }: { data: RevenueMonth[]; currency: string }) {
   return (
      <ChartContainer config={config} className='aspect-auto h-64 w-full'>
         <BarChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='label' tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
               tickLine={false}
               axisLine={false}
               width={56}
               tickFormatter={(value: number) => compactMoney(value, currency)}
            />
            <ChartTooltip
               cursor={false}
               content={
                  <ChartTooltipContent
                     labelFormatter={(_, payload) => payload[0]?.payload.title}
                     formatter={(value, _name, item) => (
                        <div className='flex w-full justify-between gap-4'>
                           <span className='text-muted-foreground'>
                              {item.payload.count} invoice{item.payload.count === 1 ? '' : 's'}
                           </span>
                           <span className='font-medium tabular-nums'>
                              {formatMoney(Number(value), currency)}
                           </span>
                        </div>
                     )}
                  />
               }
            />
            <Bar dataKey='cents' fill='var(--color-cents)' radius={4} />
         </BarChart>
      </ChartContainer>
   );
}
