<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import type { ListingHistoryItem } from '../api/market'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

type Period = '1D' | '1W' | '1M' | '3M' | '1Y' | 'Max'

const props = defineProps<{
  history: ListingHistoryItem[]
  period: Period
  currency: string
}>()

const PERIOD_DAYS: Record<Period, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  'Max': Infinity,
}

const slicedHistory = computed(() => {
  const days = PERIOD_DAYS[props.period]
  const sorted = [...props.history].sort((a, b) => a.date.localeCompare(b.date))
  if (days === Infinity) return sorted
  return sorted.slice(-days)
})

const chartData = computed<ChartData<'line'>>(() => {
  const points = slicedHistory.value
  const prices = points.map((p) => p.price)
  const isPositive = prices.length < 2 || (prices[prices.length - 1] ?? 0) >= (prices[0] ?? 0)
  const lineColor = isPositive ? '#16a34a' : '#dc2626'
  const fillColor = isPositive ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)'

  return {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: `Cena (${props.currency})`,
        data: prices,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: points.length > 60 ? 0 : 3,
        tension: 0.3,
        fill: true,
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${(ctx.parsed.y ?? 0).toFixed(2)} ${props.currency}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        maxTicksLimit: 8,
        font: { size: 11 },
        color: '#94a3b8',
      },
    },
    y: {
      position: 'right',
      grid: { color: '#f1f5f9' },
      ticks: {
        font: { size: 11 },
        color: '#94a3b8',
        callback: (value) => Number(value).toFixed(2),
      },
    },
  },
}))
</script>

<template>
  <div class="chart-wrap">
    <div v-if="slicedHistory.length < 2" class="chart-empty">
      Nedovoljno podataka za odabrani period.
    </div>
    <Line v-else :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-wrap {
  height: 280px;
  position: relative;
}

.chart-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
  background: #f8fafc;
  border-radius: 12px;
}
</style>
