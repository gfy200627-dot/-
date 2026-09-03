<template>
  <div class="ai-page dashboard">
    <PageHeader
      title="汽车产业数据驾驶舱"
      description="覆盖全国汽车销量、新能源渗透、品牌格局与区域分布的实时数据视图"
      :updated-at="store.updatedAt"
      :source="store.overview?.source"
      :mock="true"
      :breadcrumbs="[{ title: '首页' }, { title: '数据驾驶舱' }]"
    >
      <template #actions>
        <el-radio-group v-model="span" size="small" @change="store.loadAll(span)">
          <el-radio-button :value="12">近 12 月</el-radio-button>
          <el-radio-button :value="18">近 18 月</el-radio-button>
          <el-radio-button :value="24">近 24 月</el-radio-button>
        </el-radio-group>
        <el-button :loading="store.loading" @click="store.loadAll(span)">
          <el-icon><Refresh /></el-icon>
          <span style="margin-left: 4px">刷新数据</span>
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="store.error"
      :title="store.error"
      type="warning"
      show-icon
      :closable="false"
      class="dashboard__alert"
    />

    <!-- 核心指标 -->
    <section class="ai-cols ai-cols--5 dashboard__metrics">
      <template v-if="store.loading && !store.overview">
        <div v-for="i in 5" :key="i" class="ai-panel dashboard__metric-skeleton">
          <LoadingState variant="metric" />
        </div>
      </template>
      <StatCard
        v-for="(m, i) in metrics"
        v-else
        :key="m.key"
        :label="m.label"
        :value="m.value"
        :unit="m.unit"
        :change="m.change"
        :trend="m.trend"
        :tone="m.tone"
        :hint="m.hint"
        :format="m.format"
        :text="m.text"
        :icon="metricIcons[i]"
      />
    </section>

    <!-- 销量趋势 + 渗透率 -->
    <section class="dashboard__grid">
      <ChartCard
        class="span-2"
        title="全国汽车销量趋势"
        subtitle="总销量 / 新能源 / 燃油车 月度走势"
        :option="trendOption"
        :loading="store.loading"
        :empty="!store.trend"
        :height="320"
        :mock="true"
        empty-text="暂无销量趋势数据"
      >
        <template #extra>
          <span class="dashboard__legend-hint">单位：辆</span>
        </template>
      </ChartCard>

      <ChartCard
        title="新能源渗透率"
        subtitle="最近完整月新能源销量占比"
        :option="penetrationOption"
        :loading="store.loading"
        :empty="!penetrationValue"
        :height="320"
      />
    </section>

    <!-- 地区地图 + 能源结构 -->
    <section class="dashboard__grid">
      <ChartCard
        class="span-2"
        title="地区销量分布"
        subtitle="省级行政区销量热力分布（支持缩放与下钻）"
        :option="mapOption"
        :loading="store.loading"
        :empty="!regionData.length"
        :height="460"
        flush
      />

      <ChartCard
        title="能源类型结构"
        subtitle="当月各能源类型销量占比"
        :option="energyOption"
        :loading="store.loading"
        :empty="!energyData.length"
        :height="300"
      />
    </section>

    <!-- 排行榜与价格分布 -->
    <section class="dashboard__grid dashboard__grid--3">
      <ChartCard
        title="品牌销量 TOP10"
        subtitle="按最近 12 个月销量排序"
        :loading="store.loading"
        :empty="!brandData.length"
        :height="320"
      >
        <BrandRankingChart :data="brandData" :height="320" />
      </ChartCard>

      <ChartCard
        title="热门车型 TOP10"
        subtitle="按年累计销量排序"
        :loading="store.loading"
        :empty="!carData.length"
        :height="320"
      >
        <BrandRankingChart :data="carData" :height="320" />
      </ChartCard>

      <ChartCard
        title="价格区间分布"
        subtitle="不同指导价区间的销量结构"
        :loading="store.loading"
        :empty="!priceData.length"
        :height="320"
      >
        <DistributionBarChart :data="priceData" :height="320" />
      </ChartCard>
    </section>

    <!-- 能源对比 + 市场增长 -->
    <section class="dashboard__grid dashboard__grid--3">
      <ChartCard
        class="span-2"
        title="新能源 / 燃油车销量对比"
        subtitle="近 12 个月结构对比"
        :option="energyCompareOption"
        :loading="store.loading"
        :empty="!store.trend"
        :height="300"
      />

      <ChartCard
        title="市场增长趋势"
        subtitle="市场规模与环比增速"
        :option="growthOption"
        :loading="store.loading"
        :empty="!store.growth"
        :height="300"
      />
    </section>

    <!-- 价格—销量散点 -->
    <section class="dashboard__grid">
      <ChartCard
        class="span-3"
        title="价格—销量分布矩阵"
        subtitle="气泡大小代表用户评分，横轴为指导价，纵轴为年销量"
        :loading="store.loading"
        :empty="!store.scatter.length"
        :height="340"
      >
        <ScatterChart :data="store.scatter" :height="340" />
      </ChartCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Coin, DataLine, Odometer, Refresh, Sunny, Wallet } from '@element-plus/icons-vue'
import type { EChartsOption } from 'echarts'
import PageHeader from '@/components/common/PageHeader.vue'
import StatCard from '@/components/common/StatCard.vue'
import ChartCard from '@/components/common/ChartCard.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import SalesTrendChart from '@/components/charts/SalesTrendChart.vue'
import BrandRankingChart from '@/components/charts/BrandRankingChart.vue'
import EnergyPieChart from '@/components/charts/EnergyPieChart.vue'
import RegionMapChart from '@/components/charts/RegionMapChart.vue'
import DistributionBarChart from '@/components/charts/DistributionBarChart.vue'
import ScatterChart from '@/components/charts/ScatterChart.vue'
import GaugeChart from '@/components/charts/GaugeChart.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { buildBarOption, buildGaugeOption, buildLineOption } from '@/charts/builders'
import { PALETTE } from '@/charts/theme'
import { ENERGY_COLOR, ENERGY_LABEL } from '@/constants'
import type { MetricItem } from '@/types'

const store = useDashboardStore()
const span = ref(18)

const metricIcons = [Odometer, Sunny, DataLine, Wallet, Coin]

const metrics = computed<MetricItem[]>(() => store.overview?.metrics ?? [])
const regionData = computed(() => store.region?.regions ?? [])
const energyData = computed(() => store.energy?.proportion ?? [])
const brandData = computed(() => store.brandRanking)
const carData = computed(() => store.carRanking)
const priceData = computed(() => store.price?.buckets ?? [])

const penetrationValue = computed(() => metrics.value.find((m) => m.key === 'penetration')?.value ?? 0)

const trendOption = computed<EChartsOption>(() => {
  const t = store.trend
  if (!t) return {}
  return buildLineOption({
    x: t.months,
    valueType: 'compact',
    series: [
      { name: '总销量', data: t.total, color: PALETTE[0], area: true },
      { name: '新能源', data: t.nev, color: PALETTE[1] },
      { name: '燃油车', data: t.ice, color: PALETTE[2] }
    ]
  })
})

const penetrationOption = computed<EChartsOption>(() =>
  buildGaugeOption({ value: penetrationValue.value, name: '渗透率', color: PALETTE[1] })
)

const energyOption = computed<EChartsOption>(() => {
  const data = energyData.value
  return {
    tooltip: { trigger: 'item' },
    color: [ENERGY_COLOR.BEV, ENERGY_COLOR.PHEV, ENERGY_COLOR.HEV, ENERGY_COLOR.ICE],
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '52%'],
        itemStyle: { borderColor: 'rgba(11,15,22,0.9)', borderWidth: 2, borderRadius: 3 },
        label: { color: '#9fb0c6', fontSize: 11, formatter: '{b}\n{d}%' },
        labelLine: { length: 8, length2: 10, lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        data: data.map((d) => ({ name: d.name, value: d.value }))
      }
    ]
  }
})

const mapOption = computed<EChartsOption>(() => {
  const regions = regionData.value
  const values = regions.map((r) => r.value)
  const max = Math.max(...values, 1)
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(19,26,36,0.96)',
      borderColor: 'rgba(255,255,255,0.12)',
      textStyle: { color: '#e6edf6', fontSize: 12 },
      formatter: (p: unknown) => {
        const item = p as { name: string; value?: number; data?: { penetration?: number } }
        return [
          `<div style="font-weight:600;margin-bottom:4px">${item.name}</div>`,
          `销量：${Number(item.value ?? 0).toLocaleString('zh-CN')} 辆`,
          item.data?.penetration ? `渗透率：${item.data.penetration}%` : ''
        ]
          .filter(Boolean)
          .join('<br/>')
      }
    },
    visualMap: {
      min: Math.min(...values, 0),
      max,
      left: 16,
      bottom: 24,
      calculable: true,
      orient: 'vertical',
      itemWidth: 10,
      itemHeight: 90,
      textStyle: { color: '#6b7c93', fontSize: 10 },
      inRange: { color: ['#12233a', '#17365c', '#1d4f96', '#2e7cf6', '#16c79a'] }
    },
    series: [
      {
        type: 'map',
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [104.5, 35.5],
        itemStyle: {
          areaColor: 'rgba(255,255,255,0.045)',
          borderColor: 'rgba(255,255,255,0.16)',
          borderWidth: 0.6
        },
        emphasis: {
          label: { show: true, color: '#fff', fontSize: 11 },
          itemStyle: { areaColor: 'rgba(46,124,246,0.55)' }
        },
        data: regions.map((r) => ({ name: r.name, value: r.value, penetration: r.penetration }))
      }
    ]
  }
})

const energyCompareOption = computed<EChartsOption>(() => {
  const t = store.trend
  if (!t) return {}
  const months = t.months.slice(-12)
  return buildBarOption({
    x: months,
    legend: true,
    series: [
      { name: '新能源', data: t.nev.slice(-12), color: PALETTE[1], stack: 'total', barWidth: 18 },
      { name: '燃油车', data: t.ice.slice(-12), color: PALETTE[2], stack: 'total', barWidth: 18 }
    ]
  })
})

const growthOption = computed<EChartsOption>(() => {
  const g = store.growth
  if (!g) return {}
  return buildLineOption({
    x: g.months,
    yName: ['市场规模（亿元）', '环比增速（%）'],
    series: [
      { name: '市场规模（亿元）', data: g.marketSize, color: PALETTE[3], area: true, yAxisIndex: 0 },
      { name: '环比增速（%）', data: g.growth, color: PALETTE[2], yAxisIndex: 1 }
    ],
    valueType: 'plain'
  })
})

onMounted(() => {
  if (!store.overview) void store.loadAll(span.value)
})
</script>

<style scoped lang="scss">
.dashboard__alert {
  margin-bottom: var(--ai-space-2);
  background: transparent;
  border: 1px solid rgba(245, 165, 36, 0.28);
}

.dashboard__metrics {
  align-items: stretch;
}

.dashboard__metric-skeleton {
  padding: var(--ai-space-4) var(--ai-space-5);
  min-height: 132px;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: var(--ai-space-4);
}

.dashboard__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dashboard__grid--3 .span-2 { grid-column: span 2; }
.span-3 { grid-column: 1 / -1; }

.dashboard__legend-hint {
  font-size: var(--ai-fs-mini);
  color: var(--ai-text-4);
}

@media (max-width: 1280px) {
  .dashboard__grid,
  .dashboard__grid--3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
