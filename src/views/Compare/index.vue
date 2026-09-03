<template>
  <div class="ai-page compare">
    <PageHeader
      title="车型对比"
      description="并排比较 2~3 款车型的核心参数、销量表现与综合评分，所有结论均基于平台已录入数据实时计算，不含任何主观推断"
      :updated-at="updatedAt"
      source="示例数据集 · 车型库"
      :mock="true"
      :breadcrumbs="[{ title: '首页' }, { title: '车型对比' }]"
    >
      <template #actions>
        <el-button :disabled="!carStore.compareIds.length" @click="onClear">
          <el-icon><Delete /></el-icon>
          <span style="margin-left: 4px">清空对比</span>
        </el-button>
        <el-button type="primary" @click="$router.push('/cars')">
          <el-icon><Grid /></el-icon>
          <span style="margin-left: 4px">去挑选车型</span>
        </el-button>
      </template>
    </PageHeader>

    <!-- ---------------- 对比位 ---------------- -->
    <section class="ai-cols ai-cols--3 compare__slots">
      <CarCompareCard
        v-for="slot in 3"
        :key="slot"
        :slot-no="slot"
        :car="carAt(slot - 1)"
        :options="selectOptions"
        @select="onSelect"
        @remove="onRemove"
      />
    </section>

    <!-- ---------------- 参数对比 ---------------- -->
    <section v-if="cars.length >= 2" class="ai-panel compare__panel">
      <header class="ai-panel__header">
        <div>
          <h3 class="ai-panel__title">参数对比</h3>
          <p class="ai-panel__subtitle">左侧为对比项，右侧为各车型实测数据；最优项已高亮标注</p>
        </div>
        <div class="compare__legend">
          <span class="compare__legend-item"><i class="compare__legend-dot" /> 该项最优</span>
        </div>
      </header>

      <div class="compare__table-wrap">
        <table class="compare__table">
          <thead>
            <tr>
              <th class="compare__th compare__th--label">对比项</th>
              <th v-for="car in cars" :key="car.id" class="compare__th">
                <div class="compare__th-inner">
                  <span class="compare__th-brand" :style="{ background: brandColor(car.brand) }">
                    {{ car.brand.slice(0, 1) }}
                  </span>
                  <div class="compare__th-text">
                    <span class="compare__th-name ai-truncate">{{ car.brand }} {{ car.name }}</span>
                    <span class="compare__th-meta ai-num">{{ car.modelCode }} · {{ car.category }}</span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.label">
              <td class="compare__td compare__td--label">{{ row.label }}</td>
              <td
                v-for="(cell, idx) in row.values"
                :key="`${row.label}-${idx}`"
                class="compare__td"
                :class="{ 'is-best': row.better && bestIndexes(row).includes(idx) && cars.length > 1 }"
              >
                <span class="ai-num" :style="cellStyle(row, idx)">{{ cell }}</span>
                <el-icon v-if="row.better && bestIndexes(row).includes(idx) && cars.length > 1" :size="12" class="compare__best">
                  <CaretTop />
                </el-icon>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <EmptyState
      v-else
      title="请至少选择 2 款车型"
      description="在上方对比位中选择车型，或在车型中心点击「加入对比」后返回本页查看参数差异"
      :icon="Operation"
    >
      <el-button type="primary" plain @click="$router.push('/cars')">前往车型中心</el-button>
    </EmptyState>

    <!-- ---------------- 可视化对比 ---------------- -->
    <template v-if="cars.length >= 2">
      <section class="ai-cols ai-cols--2">
        <ChartCard title="综合能力雷达" subtitle="各维度统一归一化为 0~100 分" mock :height="360">
          <RadarCompareChart :indicators="radarIndicators" :series="radarSeries" :height="360" />
        </ChartCard>

        <ChartCard title="综合评分对比" subtitle="按价格、续航、动力、空间、智能化、舒适、口碑、销量加权计算" mock :height="360">
          <DistributionBarChart :data="scoreBars" :height="360" horizontal value-type="plain" />
        </ChartCard>
      </section>

      <section class="ai-cols ai-cols--2">
        <ChartCard title="近 12 个月销量对比" subtitle="单位：辆" mock :height="300">
          <DistributionBarChart :data="salesBars" :height="300" />
        </ChartCard>

        <ChartCard title="核心评分维度对比" subtitle="智能化 / 舒适性 / 空间 / 性能，单位：分" mock :height="300">
          <RadarCompareChart :indicators="scoreIndicators" :series="scoreRadarSeries" :height="300" />
        </ChartCard>
      </section>

      <!-- ---------------- 综合表现分析 ---------------- -->
      <section class="ai-panel compare__panel">
        <header class="ai-panel__header">
          <div>
            <h3 class="ai-panel__title">综合表现分析</h3>
            <p class="ai-panel__subtitle">
              由前端依据当前对比车型的真实参数与销量数据计算生成，计算口径透明可追溯
            </p>
          </div>
          <span class="ai-tag ai-tag--mock">前端计算</span>
        </header>

        <div class="ai-panel__body compare__analysis">
          <div class="compare__ranking">
            <div
              v-for="(item, idx) in ranking"
              :key="item.car.id"
              class="compare__rank-item"
              :class="{ 'is-top': idx === 0 }"
            >
              <span class="compare__rank-no">No.{{ idx + 1 }}</span>
              <div class="compare__rank-body">
                <span class="compare__rank-name ai-truncate">{{ item.car.brand }} {{ item.car.name }}</span>
                <div class="ai-bar">
                  <div class="ai-bar__fill" :style="{ width: `${item.score}%`, background: brandColor(item.car.brand) }" />
                </div>
              </div>
              <span class="compare__rank-score ai-num">{{ item.score.toFixed(1) }}</span>
            </div>
          </div>

          <ul class="compare__conclusion">
            <li v-for="(line, i) in conclusions" :key="i">
              <span class="compare__conclusion-dot" :class="`is-${line.tone}`" />
              <p>{{ line.text }}</p>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CaretTop, Delete, Grid, Operation } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ChartCard from '@/components/common/ChartCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CarCompareCard from '@/components/car/CarCompareCard.vue'
import RadarCompareChart from '@/components/charts/RadarCompareChart.vue'
import DistributionBarChart from '@/components/charts/DistributionBarChart.vue'
import { useCarStore } from '@/stores/car'
import { carApi } from '@/api/cars'
import { ENERGY_LABEL } from '@/constants'
import { brandColor } from '@/utils/brand'
import { formatCompact, formatNumber } from '@/utils/format'
import type { Car } from '@/types'

/**
 * 车型对比
 * ------------------------------------------------------------
 * 数据来源：/api/cars/:id 与 /api/cars（下拉选项）
 * 综合评分与分析结论全部由前端基于真实字段计算，不使用任何预置文案
 */

const router = useRouter()
const carStore = useCarStore()
const updatedAt = ref('2026-09-01 09:30:00')

/** 已加载的车型详情缓存 */
const carMap = ref<Record<number, Car>>({})
const loadingIds = ref<number[]>([])
const selectOptions = ref<Car[]>([])

const cars = computed<Car[]>(() =>
  carStore.compareIds.map((id) => carMap.value[id]).filter((c): c is Car => Boolean(c))
)

const loading = computed(() => loadingIds.value.length > 0)

function carAt(index: number): Car | null {
  return cars.value[index] ?? null
}

/* ---------------- 数据加载 ---------------- */

async function ensureCars(ids: number[]): Promise<void> {
  const missing = ids.filter((id) => !carMap.value[id] && !loadingIds.value.includes(id))
  if (!missing.length) return
  loadingIds.value = [...loadingIds.value, ...missing]
  await Promise.all(
    missing.map(async (id) => {
      try {
        carMap.value[id] = await carApi.detail(id)
      } catch {
        ElMessage.error(`车型 ${id} 详情加载失败`)
      } finally {
        loadingIds.value = loadingIds.value.filter((i) => i !== id)
      }
    })
  )
}

watch(
  () => [...carStore.compareIds],
  (ids) => {
    void ensureCars(ids)
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    const res = await carApi.list({ page: 1, pageSize: 60, sortBy: 'sales', sortOrder: 'desc' })
    selectOptions.value = res.list
  } catch {
    selectOptions.value = []
  }
})

/* ---------------- 交互 ---------------- */

function onSelect(slotNo: number, carId: number): void {
  const idx = slotNo - 1
  if (carStore.inCompare(carId)) {
    ElMessage.warning('该车型已在对比栏中')
    return
  }
  // 替换该槽位原有车型
  if (idx < carStore.compareIds.length) {
    carStore.removeCompare(carStore.compareIds[idx])
  }
  const res = carStore.toggleCompare(carId)
  if (!res.ok) ElMessage.warning(res.message)
}

function onRemove(slotNo: number): void {
  const id = carStore.compareIds[slotNo - 1]
  if (id !== undefined) carStore.removeCompare(id)
}

function onClear(): void {
  carStore.clearCompare()
  ElMessage.success('已清空对比栏')
}

/* ---------------- 参数对比表 ---------------- */

interface CompareRow {
  label: string
  values: string[]
  /** 原始数值（用于最优判定），非数值行为 null */
  raw: (number | null)[]
  better?: 'higher' | 'lower'
}

const rows = computed<CompareRow[]>(() => {
  const list = cars.value
  if (list.length < 2) return []

  const num = (fn: (c: Car) => number, unit = ''): { values: string[]; raw: number[] } => ({
    values: list.map((c) => `${formatNumber(fn(c))}${unit}`),
    raw: list.map(fn)
  })

  const rowsData: { label: string; part: { values: string[]; raw: (number | null)[] }; better?: 'higher' | 'lower' }[] = [
    { label: '指导价（万元）', part: { ...num((c) => c.price, '') }, better: 'lower' },
    { label: '终端价格区间（万元）', part: { values: list.map((c) => `${c.priceMin.toFixed(1)} ~ ${c.priceMax.toFixed(1)}`), raw: list.map(() => null) } },
    { label: '能源类型', part: { values: list.map((c) => ENERGY_LABEL[c.energyType]), raw: list.map(() => null) } },
    { label: '车型类别', part: { values: list.map((c) => c.category), raw: list.map(() => null) } },
    { label: '纯电续航（km）', part: { ...num((c) => c.range, '') }, better: 'higher' },
    { label: '电池容量（kWh）', part: { ...num((c) => c.battery, '') }, better: 'higher' },
    { label: '最大功率（kW）', part: { ...num((c) => c.power, '') }, better: 'higher' },
    { label: '峰值扭矩（N·m）', part: { ...num((c) => c.torque, '') }, better: 'higher' },
    { label: '轴距（mm）', part: { ...num((c) => c.wheelbase, '') }, better: 'higher' },
    { label: '车身尺寸（mm）', part: { values: list.map((c) => `${c.length}×${c.width}×${c.height}`), raw: list.map((c) => c.length * c.width * c.height) }, better: 'higher' },
    { label: '座位数', part: { ...num((c) => c.seats, '') }, better: 'higher' },
    { label: '上市时间', part: { values: list.map((c) => c.launchDate), raw: list.map(() => null) } },
    { label: '近 12 月销量（辆）', part: { ...num((c) => c.sales, '') }, better: 'higher' },
    { label: '上月销量（辆）', part: { ...num((c) => c.lastMonthSales, '') }, better: 'higher' },
    { label: '用户评分（5 分制）', part: { values: list.map((c) => c.rating.toFixed(1)), raw: list.map((c) => c.rating) }, better: 'higher' },
    { label: '智能化评分', part: { ...num((c) => c.intelligenceScore, '') }, better: 'higher' },
    { label: '舒适性评分', part: { ...num((c) => c.comfortScore, '') }, better: 'higher' },
    { label: '空间评分', part: { ...num((c) => c.spaceScore, '') }, better: 'higher' },
    { label: '性能评分', part: { ...num((c) => c.performanceScore, '') }, better: 'higher' },
    { label: '累计评价数', part: { ...num((c) => c.reviewCount, '') }, better: 'higher' }
  ]

  return rowsData.map((r) => ({
    label: r.label,
    values: r.part.values,
    raw: r.part.raw,
    better: r.better
  }))
})

/** 返回该行最优（并列时全部返回）车辆下标 */
function bestIndexes(row: CompareRow): number[] {
  const nums = row.raw.filter((v): v is number => v !== null)
  if (nums.length < 2) return []
  const target = row.better === 'lower' ? Math.min(...nums) : Math.max(...nums)
  // 全部相同则不高亮，避免无意义标记
  if (nums.every((v) => v === target)) return []
  return row.raw.reduce<number[]>((acc, v, i) => {
    if (v === target) acc.push(i)
    return acc
  }, [])
}

function cellStyle(row: CompareRow, idx: number): Record<string, string> {
  if (bestIndexes(row).includes(idx) && cars.value.length > 1) {
    return { color: 'var(--ai-nev)', fontWeight: '600' }
  }
  return {}
}

/* ---------------- 综合评分（前端计算） ---------------- */

/** 归一化维度：把不同量纲的参数映射到 0~100 */
function normalized(car: Car): Record<string, number> {
  const list = cars.value
  const maxRange = Math.max(...list.map((c) => c.range), 1)
  const maxPower = Math.max(...list.map((c) => c.power), 1)
  const maxSales = Math.max(...list.map((c) => c.sales), 1)
  const minPrice = Math.min(...list.map((c) => c.price))
  const maxPrice = Math.max(...list.map((c) => c.price))

  return {
    price: maxPrice === minPrice ? 80 : ((maxPrice - car.price) / (maxPrice - minPrice)) * 40 + 60,
    range: Math.min(100, (car.range / Math.max(maxRange, 400)) * 100),
    power: Math.min(100, (car.power / Math.max(maxPower, 300)) * 100),
    space: car.spaceScore,
    intelligence: car.intelligenceScore,
    comfort: car.comfortScore,
    rating: (car.rating / 5) * 100,
    sales: (car.sales / maxSales) * 100
  }
}

const DIMENSION_WEIGHT: Record<string, number> = {
  price: 0.15,
  range: 0.15,
  power: 0.1,
  space: 0.1,
  intelligence: 0.1,
  comfort: 0.1,
  rating: 0.15,
  sales: 0.15
}

const DIMENSION_LABEL: Record<string, string> = {
  price: '价格优势',
  range: '续航能力',
  power: '动力性能',
  space: '空间表现',
  intelligence: '智能化',
  comfort: '舒适性',
  rating: '用户口碑',
  sales: '市场表现'
}

const scored = computed(() =>
  cars.value.map((car) => {
    const dims = normalized(car)
    const score = Object.entries(DIMENSION_WEIGHT).reduce((sum, [key, w]) => sum + dims[key] * w, 0)
    return { car, dims, score }
  })
)

const ranking = computed(() => [...scored.value].sort((a, b) => b.score - a.score))

const radarIndicators = computed(() =>
  Object.keys(DIMENSION_WEIGHT).map((key) => ({ name: DIMENSION_LABEL[key], max: 100 }))
)

const radarSeries = computed(() =>
  scored.value.map((s) => ({
    name: `${s.car.brand} ${s.car.name}`,
    value: Object.keys(DIMENSION_WEIGHT).map((key) => Number(s.dims[key].toFixed(1))),
    color: brandColor(s.car.brand)
  }))
)

const scoreBars = computed(() =>
  ranking.value.map((s) => ({ label: `${s.car.brand} ${s.car.name}`, value: Number(s.score.toFixed(1)) }))
)

const salesBars = computed(() =>
  cars.value.map((c) => ({ label: `${c.brand} ${c.name}`, value: c.sales }))
)

const scoreIndicators = computed(() => [
  { name: '智能化', max: 100 },
  { name: '舒适性', max: 100 },
  { name: '空间', max: 100 },
  { name: '性能', max: 100 },
  { name: '口碑', max: 100 }
])

const scoreRadarSeries = computed(() =>
  cars.value.map((c) => ({
    name: `${c.brand} ${c.name}`,
    value: [c.intelligenceScore, c.comfortScore, c.spaceScore, c.performanceScore, Number(((c.rating / 5) * 100).toFixed(1))],
    color: brandColor(c.brand)
  }))
)

/* ---------------- 综合表现分析（基于真实数据生成） ---------------- */

interface ConclusionLine {
  text: string
  tone: 'brand' | 'nev' | 'warn'
}

const conclusions = computed<ConclusionLine[]>(() => {
  if (cars.value.length < 2) return []
  const lines: ConclusionLine[] = []
  const sorted = ranking.value

  // 1. 综合结论
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  lines.push({
    tone: 'nev',
    text: `综合评分：${best.car.brand} ${best.car.name} 以 ${best.score.toFixed(1)} 分领先，较 ${worst.car.brand} ${worst.car.name} 高出 ${(best.score - worst.score).toFixed(1)} 分。评分由价格优势、续航、动力、空间、智能化、舒适性、口碑、市场表现八项加权得出。`
  })

  // 2. 各维度最优（仅输出存在差异的维度）
  const dimLines: string[] = []
  for (const key of Object.keys(DIMENSION_WEIGHT)) {
    const values = sorted.map((s) => ({ car: s.car, v: s.dims[key] }))
    const top = values.reduce((a, b) => (b.v > a.v ? b : a))
    const bottom = values.reduce((a, b) => (b.v < a.v ? b : a))
    if (top.v - bottom.v < 3) continue
    dimLines.push(`${DIMENSION_LABEL[key]}：${top.car.name} 领先 ${(top.v - bottom.v).toFixed(1)} 分`)
  }
  if (dimLines.length) {
    lines.push({ tone: 'brand', text: `维度差异——${dimLines.slice(0, 4).join('；')}。` })
  }

  // 3. 价格对比
  const cheapest = [...cars.value].sort((a, b) => a.price - b.price)[0]
  const priciest = [...cars.value].sort((a, b) => b.price - a.price)[0]
  if (cheapest.id !== priciest.id) {
    lines.push({
      tone: 'warn',
      text: `购车成本：${cheapest.brand} ${cheapest.name} 指导价 ${cheapest.price.toFixed(2)} 万，比 ${priciest.name} 低 ${(priciest.price - cheapest.price).toFixed(2)} 万；${priciest.name} 在其余参数上的领先幅度需结合预算权衡。`
    })
  }

  // 4. 销量对比
  const topSales = [...cars.value].sort((a, b) => b.sales - a.sales)[0]
  lines.push({
    tone: 'brand',
    text: `市场表现：${topSales.brand} ${topSales.name} 近 12 个月累计销售 ${formatCompact(topSales.sales)} 辆，为对比组中销量最高车型，市场保有量与后续保值率相对更有优势。`
  })

  // 5. 选购建议（由分差推导，不做主观推荐）
  const gap = best.score - sorted[1].score
  lines.push({
    tone: 'nev',
    text:
      gap >= 8
        ? `选购建议：${best.car.name} 综合优势明显（领先 ${gap.toFixed(1)} 分），若购车需求与评分权重一致，可优先纳入考虑。`
        : `选购建议：${best.car.name} 与 ${sorted[1].car.name} 综合分差仅 ${gap.toFixed(1)} 分，建议结合实车试驾、终端优惠与补能条件做最终决策。`
  })

  return lines
})
</script>

<style scoped lang="scss">
.compare__slots {
  align-items: stretch;
}

.compare__panel {
  overflow: hidden;
}

.compare__legend {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-3);
}

.compare__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.compare__legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai-nev);
}

/* ---------- 对比表 ---------- */
.compare__table-wrap {
  overflow-x: auto;
}

.compare__table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: var(--ai-fs-sm);
}

.compare__th,
.compare__td {
  padding: 11px var(--ai-space-4);
  border-bottom: 1px solid var(--ai-border);
  text-align: left;
  vertical-align: middle;
}

.compare__th {
  position: sticky;
  top: 0;
  background: var(--ai-bg-subtle);
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-3);
  font-weight: var(--ai-fw-normal);
  border-bottom: 1px solid var(--ai-border-strong);
}

.compare__th--label,
.compare__td--label {
  width: 150px;
  background: var(--ai-bg-subtle);
  color: var(--ai-text-3);
  font-size: var(--ai-fs-xs);
  border-right: 1px solid var(--ai-border);
}

.compare__th-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.compare__th-brand {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--ai-radius-xs);
  color: #fff;
  font-size: var(--ai-fs-mini);
  font-weight: 600;
  flex-shrink: 0;
}

.compare__th-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.compare__th-name {
  font-size: var(--ai-fs-sm);
  color: var(--ai-text-1);
  font-weight: var(--ai-fw-medium);
}

.compare__th-meta {
  font-size: 10px;
  color: var(--ai-text-4);
}

.compare__td {
  color: var(--ai-text-1);
  min-width: 130px;
}

.compare__td.is-best {
  background: rgba(22, 199, 154, 0.05);
}

.compare__best {
  margin-left: 5px;
  color: var(--ai-nev);
  vertical-align: -1px;
}

/* ---------- 分析区 ---------- */
.compare__analysis {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: var(--ai-space-6);
  align-items: start;
}

.compare__ranking {
  display: flex;
  flex-direction: column;
  gap: var(--ai-space-3);
}

.compare__rank-item {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  padding: 10px var(--ai-space-3);
  border: 1px solid var(--ai-border);
  border-radius: var(--ai-radius-sm);
  background: var(--ai-bg-subtle);
  min-width: 0;

  &.is-top {
    border-color: var(--ai-border-brand);
    background: var(--ai-brand-ghost);
  }
}

.compare__rank-no {
  flex-shrink: 0;
  font-size: var(--ai-fs-mini);
  color: var(--ai-text-3);
  letter-spacing: 0.04em;
}

.compare__rank-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compare__rank-name {
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-1);
}

.compare__rank-score {
  flex-shrink: 0;
  font-size: var(--ai-fs-h3);
  font-weight: var(--ai-fw-semibold);
  color: var(--ai-text-1);
}

.compare__conclusion {
  display: flex;
  flex-direction: column;
  gap: var(--ai-space-3);

  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  p {
    flex: 1;
    font-size: var(--ai-fs-sm);
    color: var(--ai-text-2);
    line-height: var(--ai-lh-loose);
  }
}

.compare__conclusion-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--ai-brand);

  &.is-nev { background: var(--ai-nev); }
  &.is-warn { background: var(--ai-warn); }
}

@media (max-width: 1280px) {
  .compare__analysis { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 768px) {
  .compare__slots { grid-template-columns: minmax(0, 1fr); }
}
</style>
