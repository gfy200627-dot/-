<template>
  <header class="page-header">
    <div class="page-header__main">
      <div v-if="breadcrumbs.length" class="page-header__crumb">
        <template v-for="(item, index) in breadcrumbs" :key="item.title">
          <span class="page-header__crumb-item" :class="{ 'is-current': index === breadcrumbs.length - 1 }">
            {{ item.title }}
          </span>
          <span v-if="index < breadcrumbs.length - 1" class="page-header__sep">/</span>
        </template>
      </div>

      <div class="page-header__title-row">
        <h1 class="page-header__title">{{ title }}</h1>
        <span v-if="mock" class="ai-tag ai-tag--mock">示例数据</span>
        <slot name="tags" />
      </div>

      <p v-if="description" class="page-header__desc">{{ description }}</p>

      <div class="page-header__meta">
        <span v-if="updatedAt" class="page-header__meta-item">
          数据更新时间：{{ updatedAt }}
        </span>
        <span v-if="source" class="page-header__meta-item">
          <span class="page-header__dot" />
          {{ source }}
        </span>
        <slot name="meta" />
      </div>
    </div>

    <div class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
/** 页面头部：标题、描述、数据更新时间、来源、操作区 */
withDefaults(
  defineProps<{
    title: string
    description?: string
    updatedAt?: string
    source?: string
    mock?: boolean
    breadcrumbs?: { title: string }[]
  }>(),
  { breadcrumbs: () => [] }
)
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ai-space-5);
  flex-wrap: wrap;
}

.page-header__crumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-4);
  margin-bottom: 8px;
}

.page-header__crumb-item.is-current { color: var(--ai-text-3); }

.page-header__sep { color: var(--ai-text-4); opacity: 0.6; }

.page-header__title-row {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  flex-wrap: wrap;
}

.page-header__title {
  font-size: var(--ai-fs-h1);
  font-weight: var(--ai-fw-semibold);
  color: var(--ai-text-1);
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.page-header__desc {
  margin-top: 8px;
  font-size: var(--ai-fs-sm);
  color: var(--ai-text-2);
  max-width: 780px;
  line-height: var(--ai-lh-normal);
}

.page-header__meta {
  display: flex;
  align-items: center;
  gap: var(--ai-space-4);
  margin-top: 10px;
  flex-wrap: wrap;
  font-size: var(--ai-fs-xs);
  color: var(--ai-text-3);
}

.page-header__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.page-header__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ai-nev);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  flex-wrap: wrap;
}
</style>
