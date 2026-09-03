<template>
  <div class="ai-page cars">
    <PageHeader
      title="车型中心"
      description="统一管理在售车型基础信息、核心参数与销量表现，支持多维筛选与批量对比"
      :updated-at="updatedAt"
      source="示例数据集 · 车型库"
      :mock="true"
      :breadcrumbs="[{ title: '首页' }, { title: '车型中心' }]"
    >
      <template #actions>
        <el-button @click="$router.push('/compare')">
          <el-icon><Operation /></el-icon>
          <span style="margin-left: 4px">车型对比（{{ carStore.compareCount }}）</span>
        </el-button>
      </template>
    </PageHeader>

    <section class="ai-panel cars__filter">
      <div class="cars__filter-body">
        <SearchBar v-model="keyword" placeholder="搜索品牌 / 车型 / 车系" width="240px" @search="onSearch" />
        <el-select v-model="filters.brandId" placeholder="全部品牌" clearable filterable style="width: 150px" @change="onFilterChange">
          <el-option v-for="b in options?.brands ?? []" :key="b.id" :label="b.name" :value="b.id" />
        </el-select>
        <el-select v-model="filters.energyType" placeholder="能源类型" clearable style="width: 130px" @change="onFilterChange">
          <el-option v-for="e in ENERGY_OPTIONS" :key="e.value" :label="e.label" :value="e.value" />
        </el-select>
        <el-select v-model="filters.category" placeholder="车型类别" clearable style="width: 120px" @change="onFilterChange">
          <el-option v-for="c in CAR_CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select v-model="priceBucket" placeholder="价格区间" clearable style="width: 150px" @change="onPriceChange">
          <el-option v-for="b in PRICE_OPTIONS" :key="b.label" :label="b.label" :value="b.label" />
        </el-select>
        <el-select v-model="filters.year" placeholder="上市年份" clearable style="width: 120px" @change="onFilterChange">
          <el-option v-for="y in options?.years ?? []" :key="y" :label="`${y} 年`" :value="y" />
        </el-select>
        <el-button @click="onReset">
          <el-icon><RefreshLeft /></el-icon>
          <span style="margin-left: 4px">重置</span>
        </el-button>
      </div>

      <div v-if="selection.length" class="cars__batch">
        <span class="cars__batch-text">已选择 {{ selection.length }} 项</span>
        <el-button size="small" type="primary" plain @click="batchCompare">批量加入对比</el-button>
        <el-button size="small" @click="exportSelection">导出所选</el-button>
        <el-button size="small" text @click="clearSelection">取消选择</el-button>
      </div>
    </section>

    <section class="ai-panel cars__table">
      <DataTable
        v-model:page="page"
        v-model:page-size="pageSize"
        :data="carStore.list"
        :columns="columns"
        :loading="carStore.loading"
        :total="carStore.total"
        selectable
        :selected-count="selection.length"
        :default-sort="{ prop: 'sales', order: 'descending' }"
        @page-change="onPageChange"
        @sort-change="onSortChange"
        @selection-change="selection = $event"
      >
        <template #name="{ row }">
          <div class="cars__car">
            <span class="cars__car-brand" :style="{ background: brandColor(row.brand) }">
              {{ row.brand.slice(0, 1) }}
            </span>
            <div class="cars__car-info">
              <span class="cars__car-name">{{ row.name }}</span>
              <span class="cars__car-meta ai-num">{{ row.modelCode }} · {{ row.category }}</span>
            </div>
          </div>
        </template>

        <template #price="{ row }">
          <span class="ai-num cars__price">{{ row.price.toFixed(2) }} 万</span>
        </template>

        <template #energyType="{ row }">
          <StatusTag :status="row.energyType" :text="energyLabel(row.energyType)" :dot="true" />
        </template>

        <template #range="{ row }">
          <span class="ai-num">{{ row.range ? `${row.range} km` : '—' }}</span>
        </template>

        <template #power="{ row }">
          <span class="ai-num">{{ row.power }} kW</span>
        </template>

        <template #sales="{ row }">
          <span class="ai-num">{{ formatCompact(row.sales) }}</span>
        </template>

        <template #rating="{ row }">
          <span class="cars__rating">
            <el-icon :size="12"><Star /></el-icon>
            <span class="ai-num">{{ row.rating.toFixed(1) }}</span>
          </span>
        </template>

        <template #action="{ row }">
          <div class="cars__actions">
            <el-button link type="primary" size="small" @click="goDetail(row)">查看详情</el-button>
            <el-button
              link
              size="small"
              :type="carStore.inCompare(row.id) ? 'success' : 'default'"
              @click="toggleCompare(row)"
            >
              {{ carStore.inCompare(row.id) ? '已加入' : '加入对比' }}
            </el-button>
          </div>
        </template>
      </DataTable>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Operation, RefreshLeft, Star } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import DataTable from '@/components/common/DataTable.vue'
import type { TableColumn } from '@/types/table'
import StatusTag from '@/components/common/StatusTag.vue'
import { useCarStore } from '@/stores/car'
import { carApi } from '@/api/cars'
import { CAR_CATEGORIES, ENERGY_LABEL, ENERGY_OPTIONS } from '@/constants'
import { brandColor } from '@/utils/brand'
import { formatCompact } from '@/utils/format'
import type { Car, CarCategory, EnergyType } from '@/types'

const router = useRouter()
const carStore = useCarStore()

const keyword = ref('')
const priceBucket = ref('')
const selection = ref<Car[]>([])
const options = ref<Awaited<ReturnType<typeof carApi.options>> | null>(null)
const updatedAt = ref('2026-09-01 09:30:00')

const PRICE_OPTIONS = [
  { label: '10万以下', min: 0, max: 10 },
  { label: '10-15万', min: 10, max: 15 },
  { label: '15-20万', min: 15, max: 20 },
  { label: '20-30万', min: 20, max: 30 },
  { label: '30-50万', min: 30, max: 50 },
  { label: '50万以上', min: 50, max: 10000 }
]

const filters = reactive<{
  brandId: number | ''
  energyType: EnergyType | ''
  category: CarCategory | ''
  year: number | ''
}>({
  brandId: '',
  energyType: '',
  category: '',
  year: ''
})

const page = ref(1)
const pageSize = ref(10)

const columns: TableColumn<Car>[] = [
  { prop: 'brand', label: '品牌', width: 110 },
  { prop: 'name', label: '车型', minWidth: 220, slot: 'name' },
  { prop: 'price', label: '指导价', width: 110, sortable: true, slot: 'price' },
  { prop: 'energyType', label: '能源类型', width: 120, slot: 'energyType' },
  { prop: 'range', label: '续航', width: 100, sortable: true, slot: 'range' },
  { prop: 'power', label: '功率', width: 100, sortable: true, slot: 'power' },
  { prop: 'launchYear', label: '上市年份', width: 100, sortable: true },
  { prop: 'sales', label: '年销量', width: 110, sortable: true, slot: 'sales' },
  { prop: 'rating', label: '评分', width: 90, sortable: true, slot: 'rating' },
  { prop: 'action', label: '操作', width: 160, fixed: 'right', slot: 'action' }
]

function energyLabel(v: string): string {
  return ENERGY_LABEL[v as keyof typeof ENERGY_LABEL] ?? v
}

function onSearch(value: string): void {
  carStore.setFilter('keyword', value)
  page.value = 1
  void load()
}

function onFilterChange(): void {
  page.value = 1
  void load()
}

function onPriceChange(label: string): void {
  const bucket = PRICE_OPTIONS.find((b) => b.label === label)
  carStore.setFilter('priceMin', bucket ? bucket.min : '')
  carStore.setFilter('priceMax', bucket ? bucket.max : '')
  page.value = 1
  void load()
}

function onReset(): void {
  keyword.value = ''
  priceBucket.value = ''
  filters.brandId = ''
  filters.energyType = ''
  filters.category = ''
  filters.year = ''
  carStore.resetFilters()
  page.value = 1
  void load()
}

function onPageChange({ page: p, pageSize: s }: { page: number; pageSize: number }): void {
  page.value = p
  pageSize.value = s
  void load()
}

function onSortChange({ prop, order }: { prop: string; order: string }): void {
  carStore.setFilter('sortBy', prop || 'sales')
  carStore.setFilter('sortOrder', (order || 'desc') as 'asc' | 'desc')
  void load()
}

function goDetail(row: Car): void {
  void router.push(`/cars/${row.id}`)
}

function toggleCompare(row: Car): void {
  const res = carStore.toggleCompare(row.id)
  if (!res.ok) {
    ElMessage.warning(res.message)
    return
  }
  ElMessage.success(carStore.inCompare(row.id) ? `已加入对比：${row.name}` : `已移出对比：${row.name}`)
}

function batchCompare(): void {
  let added = 0
  for (const car of selection.value) {
    if (!carStore.inCompare(car.id)) {
      const res = carStore.toggleCompare(car.id)
      if (res.ok) added += 1
    }
  }
  ElMessage.success(`已加入 ${added} 款车型到对比栏`)
  clearSelection()
}

function clearSelection(): void {
  selection.value = []
}

function exportSelection(): void {
  const rows = [
    ['品牌', '车型', '指导价(万)', '能源类型', '续航(km)', '功率(kW)', '年销量'],
    ...selection.value.map((c) => [
      c.brand,
      c.name,
      c.price.toFixed(2),
      energyLabel(c.energyType),
      String(c.range),
      String(c.power),
      String(c.sales)
    ])
  ]
  const csv = `\uFEFF${rows.map((r) => r.join(',')).join('\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `autoinsight-cars-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function load(): Promise<void> {
  await carStore.fetchList({
    keyword: keyword.value || undefined,
    brandId: filters.brandId === '' ? undefined : filters.brandId,
    energyType: filters.energyType || undefined,
    category: filters.category || undefined,
    year: filters.year === '' ? undefined : filters.year,
    priceMin: carStore.filters.priceMin === '' ? undefined : carStore.filters.priceMin,
    priceMax: carStore.filters.priceMax === '' ? undefined : carStore.filters.priceMax,
    page: page.value,
    pageSize: pageSize.value,
    sortBy: carStore.filters.sortBy,
    sortOrder: carStore.filters.sortOrder
  })
}

watch([() => filters.brandId, () => filters.energyType, () => filters.category, () => filters.year], () => {
  carStore.setFilter('brandId', filters.brandId === '' ? '' : filters.brandId)
  carStore.setFilter('energyType', filters.energyType as never)
  carStore.setFilter('category', filters.category as never)
  carStore.setFilter('year', filters.year === '' ? '' : filters.year)
})

onMounted(async () => {
  try {
    options.value = await carApi.options()
  } catch {
    /* 选项加载失败时使用空选项 */
  }
  await load()
})
</script>

<style scoped lang="scss">
.cars__filter {
  padding: var(--ai-space-4);
}

.cars__filter-body {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  flex-wrap: wrap;
}

.cars__batch {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  margin-top: var(--ai-space-3);
  padding-top: var(--ai-space-3);
  border-top: 1px solid var(--ai-border);
}

.cars__batch-text {
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-2);
}

.cars__table {
  overflow: hidden;
}

.cars__car {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.cars__car-brand {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--ai-radius-sm);
  color: #fff;
  font-size: var(--ai-fs-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.cars__car-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.cars__car-name {
  font-size: var(--ai-fs-sm);
  color: var(--ai-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cars__car-meta {
  font-size: 10px;
  color: var(--ai-text-4);
}

.cars__price {
  color: var(--ai-warn);
  font-weight: var(--ai-fw-medium);
}

.cars__rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ai-warn);
  font-size: var(--ai-fs-xs);
}

.cars__actions {
  display: flex;
  gap: 4px;
}
</style>
