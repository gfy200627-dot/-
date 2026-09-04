<template>
  <div class="intro" :class="{ 'intro--running': running, 'intro--done': done }" aria-label="AutoInsight 开场动画" role="presentation">
    <div class="intro__scene">
      <div class="intro__road-line" aria-hidden="true"></div>

      <div class="intro__car intro__car--side" aria-hidden="true">
        <img :src="carSide" alt="" draggable="false" />
      </div>

      <div class="intro__car intro__car--front" aria-hidden="true">
        <img :src="carFront" alt="" draggable="false" />
      </div>

      <div class="intro__streak" aria-hidden="true"></div>
    </div>

    <div class="intro__brand" aria-hidden="true">
      <div class="intro__wordmark">AutoInsight</div>
      <div class="intro__rule"></div>
      <div class="intro__tagline">汽车行业数据智能分析与决策平台</div>
    </div>

    <button class="intro__skip" type="button" @click="skipAnimation">
      跳过 <span>SKIP</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import carSide from '@/assets/intro/car-side.svg'
import carFront from '@/assets/intro/car-front.svg'

const emit = defineEmits<{
  complete: []
}>()

const running = ref(false)
const done = ref(false)
let timer: number | undefined
let finished = false

function finish() {
  if (finished) return
  finished = true
  if (timer) window.clearTimeout(timer)
  done.value = true
  window.setTimeout(() => emit('complete'), 320)
}

function skipAnimation() {
  finish()
}

onMounted(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    timer = window.setTimeout(finish, 450)
    return
  }

  requestAnimationFrame(() => {
    running.value = true
  })

  // 约 4.35 秒完成：驶入 → 转向正面 → 冲屏 → 字标显现。
  timer = window.setTimeout(finish, 4350)
})

onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer)
})
</script>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 99999;
  overflow: hidden;
  background: #fff;
  color: #050505;
  font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  isolation: isolate;
}

.intro--done {
  animation: introExit 320ms ease-in forwards;
}

.intro__scene {
  position: absolute;
  inset: 0;
  perspective: 1200px;
  transform-style: preserve-3d;
}

.intro__car {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(58vw, 860px);
  transform-style: preserve-3d;
  transform-origin: center center;
  pointer-events: none;
  opacity: 0;
  will-change: transform, opacity, filter;
}

.intro__car img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
}

.intro__car--side {
  margin-left: min(-29vw, -430px);
  margin-top: min(-14vw, -210px);
}

.intro__car--front {
  width: min(56vw, 820px);
  margin-left: min(-28vw, -410px);
  margin-top: min(-13vw, -195px);
}

.intro--running .intro__car--side {
  animation: carSide 1.9s cubic-bezier(.18,.75,.28,1) forwards;
}

.intro--running .intro__car--front {
  animation: carFront 1.55s cubic-bezier(.16,.82,.22,1) 1.82s forwards;
}

.intro__road-line {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 71%;
  height: 1px;
  background: #050505;
  transform: scaleX(0);
  transform-origin: center;
  opacity: 0;
}

.intro--running .intro__road-line {
  animation: roadLine 2.75s ease-out forwards;
}

.intro__streak {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(70vw, 1000px);
  height: min(9vw, 130px);
  margin-left: min(-35vw, -500px);
  margin-top: min(-4.5vw, -65px);
  border-radius: 999px;
  background: #050505;
  filter: blur(16px);
  transform: scaleX(0) scaleY(.7);
  opacity: 0;
}

.intro--running .intro__streak {
  animation: streak 0.82s cubic-bezier(.12,.8,.22,1) 2.1s forwards;
}

.intro__brand {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(88vw, 1100px);
  transform: translate(-50%, -50%) scale(.92);
  text-align: center;
  opacity: 0;
}

.intro--running .intro__brand {
  animation: brand 1.15s cubic-bezier(.2,.75,.25,1) 2.95s forwards;
}

.intro__wordmark {
  font-size: clamp(48px, 8vw, 116px);
  font-weight: 700;
  line-height: .95;
  letter-spacing: .34em;
  padding-left: .34em;
  white-space: nowrap;
  transform: scaleX(.42);
  transform-origin: center;
}

.intro--running .intro__wordmark {
  animation: wordmark 720ms cubic-bezier(.18,.78,.24,1) 2.96s forwards;
}

.intro__rule {
  width: min(420px, 44vw);
  height: 1px;
  margin: 24px auto 18px;
  background: #050505;
  transform: scaleX(0);
  transform-origin: center;
}

.intro--running .intro__rule {
  animation: rule 420ms ease-out 3.24s forwards;
}

.intro__tagline {
  font-size: clamp(11px, 1.05vw, 15px);
  font-weight: 400;
  letter-spacing: .28em;
  padding-left: .28em;
  opacity: 0;
  transform: translateY(12px);
}

.intro--running .intro__tagline {
  animation: tagline 380ms ease-out 3.4s forwards;
}

.intro__skip {
  position: absolute;
  right: 28px;
  bottom: 26px;
  border: 0;
  padding: 8px 0;
  background: transparent;
  color: #111;
  font-size: 11px;
  letter-spacing: .18em;
  cursor: pointer;
  opacity: .52;
  transition: opacity 160ms ease;
}

.intro__skip span {
  margin-left: 7px;
  font-size: 9px;
  opacity: .55;
}

.intro__skip:hover { opacity: 1; }

@keyframes carSide {
  0% { opacity: 0; transform: translateX(-128%) translateY(7%) scale(.38) rotateY(0deg) rotateZ(-1.5deg); }
  8% { opacity: 1; }
  62% { opacity: 1; transform: translateX(-3%) translateY(0) scale(.52) rotateY(0deg) rotateZ(0deg); }
  91% { opacity: 1; transform: translateX(0) translateY(0) scale(.58) rotateY(72deg) rotateZ(0deg); }
  100% { opacity: 0; transform: translateX(0) translateY(0) scale(.58) rotateY(90deg) rotateZ(0deg); }
}

@keyframes carFront {
  0% { opacity: 0; transform: translateZ(0) scale(.42) rotateY(-8deg); }
  12% { opacity: 1; transform: translateZ(0) scale(.56) rotateY(0deg); }
  27% { opacity: 1; transform: translateZ(0) scale(.73) rotateY(0deg); }
  72% { opacity: 1; transform: translateZ(0) scale(5.8) translateY(10px) rotateY(0deg); }
  100% { opacity: 0; transform: translateZ(0) scaleX(13) scaleY(.18) translateY(10px) rotateY(0deg); filter: blur(2px); }
}

@keyframes streak {
  0% { opacity: 0; transform: scaleX(0) scaleY(.7); }
  28% { opacity: .72; transform: scaleX(1) scaleY(.7); }
  100% { opacity: 0; transform: scaleX(1.7) scaleY(1.8); }
}

@keyframes roadLine {
  0% { opacity: 0; transform: scaleX(0); }
  18% { opacity: .45; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(1); }
}

@keyframes brand {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.92); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes wordmark {
  0% { transform: scaleX(.42); letter-spacing: .34em; padding-left: .34em; }
  100% { transform: scaleX(1); letter-spacing: .08em; padding-left: .08em; }
}

@keyframes rule {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}

@keyframes tagline {
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: .62; transform: translateY(0); }
}

@keyframes introExit {
  from { opacity: 1; }
  to { opacity: 0; }
}

@media (max-width: 700px) {
  .intro__car { width: 82vw; }
  .intro__car--side { margin-left: -41vw; margin-top: -20vw; }
  .intro__car--front { width: 80vw; margin-left: -40vw; margin-top: -18vw; }
  .intro__road-line { left: 5%; right: 5%; top: 73%; }
  .intro__tagline { letter-spacing: .16em; padding-left: .16em; }
  .intro__skip { right: 18px; bottom: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .intro__car,
  .intro__road-line,
  .intro__streak,
  .intro__brand,
  .intro__wordmark,
  .intro__rule,
  .intro__tagline {
    animation: none !important;
  }

  .intro__brand { opacity: 1; transform: translate(-50%, -50%); }
  .intro__wordmark { transform: none; letter-spacing: .08em; padding-left: .08em; }
  .intro__rule { transform: none; }
  .intro__tagline { opacity: .62; transform: none; }
}
</style>
