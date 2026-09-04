<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <IntroAnimation v-if="showIntro" @complete="showIntro = false" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import IntroAnimation from '@/components/intro/IntroAnimation.vue'

/**
 * 应用根组件
 * 负责路由视图切换，并在进入应用时播放一次品牌开场动画。
 */
const showIntro = ref(true)
</script>
