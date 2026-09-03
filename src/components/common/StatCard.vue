<template>
  <section class="stat-card ai-panel ai-panel--hoverable" :class="{ 'is-loading': loading }">
    <LoadingState v-if="loading" variant="metric" />
    <template v-else>
      <header class="stat-card__head">
        <span class="stat-card__label">{{ label }}</span>
        <span class="stat-card__icon" :style="{ color: toneColor, background: toneBg }">
          <el-icon :size="14"><component :is="iconComponent" /></el-icon>
        </span>
      </header>

      <div class="stat-card__value">
        <span class="ai-metric">{{ displayValue }}</span>
        <span v-if="unit && format !== 'text'" class="ai-metric__unit">{{ unit }}</span>
      </div>

      <footer class="stat-card__foot">
        <span class="stat-card__delta" :class="deltaClass">
          <span class="stat-card__arrow">{{ arrow }}</span>
          {{ deltaText }}
        </span>
        <span v-if="hint" class="stat-card__hint">{{ hint }}</span>
      </footer>

      <div v-if="trend.length" class="stat-card__spark">
        <BaseChart :option="sparkOption" :height="44" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Odometer } from '@element-plus/icons-vue'
import BaseChart from '@/components/charts/BaseChart.vue'
import LoadingState from './LoadingState.vue'
import type { MetricItem } from '@/types'
import { formatCompact, formatNumber, formatPercent, formatPrice } from '@/utils/format'
import { PALETTE, areaGradient, withAlpha } from '@/charts/theme'
import type { EChartsOption } from 'echarts'

/**
 * 核心指标卡
 * 当前值 + 同比变化 + 趋势箭头 + Sparkline
 */
const props = withDefaults(
  defineProps<{
    label: string
    value?: number
    unit?: string
    change?: number
    trend?: number[]
    tone?: MetricItem['tone']
    hint?: string
    format?: MetricItem['format']
    text?: string
    loading?: boolean
    icon?: unknown
  }>(),
  { value: 0, unit: '', change: 0, trend: () => [], tone: 'brand', format: 'int', loading: false }
)

const iconComponent = computed(() => props.icon ?? Odometer)

const TONE_COLOR: Record<MetricItem['tone'], string> = {
  brand: PALETTE[0],
  nev: PALETTE[1],
  warn: PALETTE[2],
  danger: PALETTE[5],
  purple: PALETTE[3],
  cyan: PALETTE[4]
}

const toneColor = computed(() => TONE_COLOR[props.tone])
const toneBg = computed(() => withAlpha(TONE_COLOR[props.tone], 0.12))

const displayValue = computed(() => {
  if (props.format === 'text') return props.text ?? '--'
  if (props.format === 'percent') return formatPercent(props.value, 1).replace('%', '')
  if (props.format === 'price') return formatPrice(props.value, 2).replace('万', '')
  return formatNumber(props.value)
})

const deltaClass = computed(() => (props.change > 0 ? 'ai-up' : props.change < 0 ? 'ai-down' : ''))
const arrow = computed(() => (props.change > 0 ? '↑' : props.change < 0 ? '↓' : '—'))
const deltaText = computed(() => {
  if (props.format === 'text') return `份额 ${props.change.toFixed(1)}%`
  return `${Math.abs(props.change).toFixed(1)}%`
})

const sparkOption = computed<EChartsOption>(() => ({
  grid: { left: 0, right: 0, top: 4, bottom: 0 },
  xAxis: { type: 'category', show: false, boundaryGap: false, data: props.trend.map((_, i) => i) },
  yAxis: { type: 'value', show: false, scale: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(19,26,36,0.96)',
    borderColor: 'rgba(255,255,255,0.12)',
    textStyle: { color: '#e6edf6', fontSize: 12 },
    formatter: (params: unknown) => {
      const arr = params as { value: number }[]
      return formatCompact(arr[0]?.value ?? 0)
    }
  },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: props.trend,
      lineStyle: { width: 1.6, color: toneColor.value },
      areaStyle: { color: areaGradient(toneColor.value, 0.22, 0) }
    }
  ]
}))
</script>

<style scoped lang="scss">
.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--ai-space-4) var(--ai-space-5);
  min-height: 132px;
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ai-border-strong), transparent);
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ai-space-2);
}

.stat-card__label {
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-3);
  letter-spacing: 0.02em;
}

.stat-card__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--ai-radius-sm);
}

.stat-card__value {
  display: flex;
  align-items: baseline;
  line-height: 1;
}

.stat-card__foot {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  flex-wrap: wrap;
}

.stat-card__delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--ai-fs-xs);
  font-variant-numeric: tabular-nums;
}

.stat-card__delta.ai-up { color: var(--ai-up); }
.stat-card__delta.ai-down { color: var(--ai-down); }

.stat-card__hint {
  font-size: var(--ai-fs-mini);
  color: var(--ai-text-4);
}

.stat-card__spark {
  margin: -4px -6px -8px;
}
</style>
