<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
/**
 * 应用根组件
 * 仅负责路由视图切换与页面级淡入动画
 */
</script>
