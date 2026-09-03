<template>
  <div class="main-layout">
    <AppHeader />

    <main class="main-layout__body">
      <router-view v-slot="{ Component }">
        <transition name="fade-up" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="main-layout__footer">
      <span>AutoInsight · 汽车行业数据智能分析与决策平台</span>
      <span class="main-layout__divider" />
      <span>当前为前端示例数据环境，接入后端后自动切换为真实业务数据</span>
      <span class="main-layout__divider" />
      <span>数据更新时间：模拟</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 12% -10%, rgba(46, 124, 246, 0.07), transparent 60%),
    radial-gradient(1000px 500px at 88% 0%, rgba(22, 199, 154, 0.05), transparent 55%),
    var(--ai-bg-base);
}

.main-layout__body {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}

.main-layout__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ai-space-3);
  padding: var(--ai-space-5) var(--ai-space-6);
  border-top: 1px solid var(--ai-border);
  font-size: var(--ai-fs-mini);
  color: var(--ai-text-4);
  flex-wrap: wrap;
  text-align: center;
}

.main-layout__divider {
  width: 1px;
  height: 10px;
  background: var(--ai-border);
}
</style>
