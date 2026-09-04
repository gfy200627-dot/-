<template>
  <div ref="root" class="intro" aria-label="AutoInsight 开场动画" role="presentation">
    <div ref="scene" class="intro__scene">
      <div ref="roadLine" class="intro__road-line" aria-hidden="true"></div>

      <div ref="sideWrap" class="intro__car intro__car--side">
        <img :src="carSide" alt="" draggable="false" />
      </div>

      <div ref="frontWrap" class="intro__car intro__car--front">
        <img :src="carFront" alt="" draggable="false" />
      </div>

      <div ref="streak" class="intro__streak" aria-hidden="true"></div>
    </div>

    <div ref="brand" class="intro__brand" aria-hidden="true">
      <div class="intro__wordmark">AutoInsight</div>
      <div class="intro__rule"></div>
      <div class="intro__tagline">汽车行业数据智能分析与决策平台</div>
    </div>

    <button ref="skip" class="intro__skip" type="button" @click="skipAnimation">
      跳过 <span>SKIP</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { gsap } from 'gsap'
import carSide from '@/assets/intro/car-side.svg'
import carFront from '@/assets/intro/car-front.svg'

const emit = defineEmits<{
  complete: []
}>()

const root = ref<HTMLElement | null>(null)
const scene = ref<HTMLElement | null>(null)
const sideWrap = ref<HTMLElement | null>(null)
const frontWrap = ref<HTMLElement | null>(null)
const streak = ref<HTMLElement | null>(null)
const roadLine = ref<HTMLElement | null>(null)
const brand = ref<HTMLElement | null>(null)
const skip = ref<HTMLButtonElement | null>(null)

let timeline: gsap.core.Timeline | null = null
let completed = false

function finish() {
  if (completed) return
  completed = true
  timeline?.kill()
  gsap.killTweensOf([root.value, scene.value, sideWrap.value, frontWrap.value, streak.value, roadLine.value, brand.value])
  emit('complete')
}

function skipAnimation() {
  if (!root.value) return
  gsap.to(root.value, {
    opacity: 0,
    duration: 0.28,
    ease: 'power2.in',
    onComplete: finish,
  })
}

function createTimeline() {
  if (!root.value || !scene.value || !sideWrap.value || !frontWrap.value || !streak.value || !roadLine.value || !brand.value) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    gsap.set(sideWrap.value, { autoAlpha: 0 })
    gsap.set(frontWrap.value, { autoAlpha: 0 })
    gsap.set(brand.value, { autoAlpha: 1 })
    gsap.set(brand.value.querySelector('.intro__wordmark'), { scale: 1, letterSpacing: '0.08em' })
    window.setTimeout(finish, 500)
    return
  }

  gsap.set(root.value, { opacity: 1 })
  gsap.set(sideWrap.value, {
    xPercent: -128,
    yPercent: 7,
    scale: 0.38,
    rotationY: 0,
    rotationZ: -1.5,
    autoAlpha: 1,
  })
  gsap.set(frontWrap.value, {
    x: 0,
    y: 0,
    scale: 0.42,
    rotationY: -8,
    autoAlpha: 0,
  })
  gsap.set(streak.value, { scaleX: 0, scaleY: 0.7, autoAlpha: 0 })
  gsap.set(roadLine.value, { scaleX: 0, autoAlpha: 0 })
  gsap.set(brand.value, { autoAlpha: 0, scale: 0.92 })
  gsap.set(brand.value.querySelector('.intro__wordmark'), { scaleX: 0.42, letterSpacing: '0.34em' })
  gsap.set(brand.value.querySelector('.intro__rule'), { scaleX: 0 })
  gsap.set(brand.value.querySelector('.intro__tagline'), { y: 12, autoAlpha: 0 })

  timeline = gsap.timeline({ onComplete: finish })

  timeline
    .to(roadLine.value, { autoAlpha: 0.45, scaleX: 1, duration: 0.5, ease: 'power2.out' }, 0.05)
    .to(sideWrap.value, {
      xPercent: -3,
      yPercent: 0,
      scale: 0.52,
      duration: 1.18,
      ease: 'power3.out',
    }, 0.18)
    .to(sideWrap.value, {
      xPercent: 0,
      scale: 0.58,
      rotationY: 72,
      rotationZ: 0,
      duration: 0.58,
      ease: 'power2.inOut',
    }, 1.36)
    .to(sideWrap.value, { autoAlpha: 0, duration: 0.08 }, 1.88)
    .to(frontWrap.value, {
      autoAlpha: 1,
      scale: 0.56,
      rotationY: 0,
      duration: 0.22,
      ease: 'power2.out',
    }, 1.84)
    .to(frontWrap.value, {
      scale: 0.73,
      duration: 0.28,
      ease: 'power2.in',
    }, 2.02)
    .to(streak.value, {
      autoAlpha: 0.7,
      scaleX: 1,
      duration: 0.18,
      ease: 'power4.out',
    }, 2.12)
    .to(frontWrap.value, {
      scale: 5.8,
      y: 10,
      duration: 0.74,
      ease: 'power4.in',
    }, 2.16)
    .to(root.value, { backgroundColor: '#ffffff', duration: 0.02 }, 2.72)
    .to(frontWrap.value, {
      scaleX: 13,
      scaleY: 0.18,
      filter: 'blur(2px)',
      autoAlpha: 0,
      duration: 0.34,
      ease: 'power3.inOut',
    }, 2.7)
    .to(streak.value, {
      scaleX: 1.7,
      scaleY: 1.8,
      autoAlpha: 0,
      duration: 0.42,
      ease: 'power3.out',
    }, 2.72)
    .to(roadLine.value, { autoAlpha: 0, duration: 0.2 }, 2.72)
    .to(brand.value, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.28,
      ease: 'power2.out',
    }, 2.98)
    .to(brand.value.querySelector('.intro__wordmark'), {
      scaleX: 1,
      letterSpacing: '0.08em',
      duration: 0.68,
      ease: 'power3.out',
    }, 2.98)
    .to(brand.value.querySelector('.intro__rule'), {
      scaleX: 1,
      duration: 0.42,
      ease: 'power2.out',
    }, 3.22)
    .to(brand.value.querySelector('.intro__tagline'), {
      y: 0,
      autoAlpha: 0.62,
      duration: 0.38,
      ease: 'power2.out',
    }, 3.36)
    .to(brand.value, { autoAlpha: 0, duration: 0.34, delay: 0.55, ease: 'power2.in' })
}

onMounted(async () => {
  await nextTick()
  createTimeline()
})

onBeforeUnmount(() => {
  timeline?.kill()
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

.intro__road-line {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 71%;
  height: 1px;
  background: #050505;
  transform-origin: center;
  opacity: 0.4;
  will-change: transform, opacity;
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
  transform-origin: center;
  will-change: transform, opacity;
}

.intro__brand {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(88vw, 1100px);
  transform: translate(-50%, -50%);
  text-align: center;
  will-change: transform, opacity;
}

.intro__wordmark {
  font-size: clamp(48px, 8vw, 116px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.08em;
  transform-origin: center;
  white-space: nowrap;
}

.intro__rule {
  width: min(420px, 44vw);
  height: 1px;
  margin: 24px auto 18px;
  background: #050505;
  transform-origin: center;
}

.intro__tagline {
  font-size: clamp(11px, 1.05vw, 15px);
  font-weight: 400;
  letter-spacing: 0.28em;
  padding-left: 0.28em;
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
  letter-spacing: 0.18em;
  cursor: pointer;
  opacity: 0.52;
  transition: opacity 160ms ease;
}

.intro__skip span {
  margin-left: 7px;
  font-size: 9px;
  opacity: 0.55;
}

.intro__skip:hover {
  opacity: 1;
}

@media (max-width: 700px) {
  .intro__car {
    width: 82vw;
  }

  .intro__car--side {
    margin-left: -41vw;
    margin-top: -20vw;
  }

  .intro__car--front {
    width: 80vw;
    margin-left: -40vw;
    margin-top: -18vw;
  }

  .intro__road-line {
    left: 5%;
    right: 5%;
    top: 73%;
  }

  .intro__tagline {
    letter-spacing: 0.16em;
    padding-left: 0.16em;
  }

  .intro__skip {
    right: 18px;
    bottom: 16px;
  }
}
</style>
