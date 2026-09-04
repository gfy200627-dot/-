<template>
  <div class="intro" :class="{ 'intro--brand': brandVisible, 'intro--done': done }" aria-label="AutoInsight 开场动画">
    <canvas ref="canvas" class="intro__canvas" aria-hidden="true"></canvas>

    <div v-if="fallback" class="intro__fallback" aria-hidden="true">
      <div class="fallback-car">
        <div class="fallback-car__roof"></div>
        <div class="fallback-car__body"></div>
        <i class="fallback-car__wheel fallback-car__wheel--1"></i>
        <i class="fallback-car__wheel fallback-car__wheel--2"></i>
      </div>
    </div>

    <div class="intro__brand" aria-hidden="true">
      <div class="intro__wordmark">AutoInsight</div>
      <div class="intro__rule"></div>
      <div class="intro__tagline">汽车行业数据智能分析与决策平台</div>
    </div>

    <button class="intro__skip" type="button" @click="skipAnimation">跳过 <span>SKIP</span></button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'

const emit = defineEmits<{ complete: [] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const done = ref(false)
const brandVisible = ref(false)
const fallback = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let car: THREE.Group | null = null
let frame = 0
let startedAt = 0
let finishTimer: number | undefined
let finished = false

// 8.8 秒。给“驶入、环绕、停顿、冲屏”足够的电影节奏。
const INTRO_MS = 8800
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeInOut = (v: number) => {
  const t = clamp01(v)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3)
const easeIn = (v: number) => Math.pow(clamp01(v), 4)

function material(color: number) {
  return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
}

function profile(points: Array<[number, number]>, depth: number, bevel = 0.04) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 5
  })
}

function buildCar() {
  const group = new THREE.Group()
  const black = material(0x050505)
  const white = material(0xffffff)
  const glass = material(0xf7f7f7)

  // 车身长度沿 X 轴，宽度沿 Z 轴，车头朝 +X。
  const body = profile([
    [-2.65, 0.08], [-2.42, 0.48], [-1.92, 0.70], [-1.08, 0.68],
    [0.18, 0.67], [1.22, 0.62], [2.20, 0.47], [2.52, 0.20],
    [2.42, 0.04], [-2.65, 0.08]
  ], 1.62, 0.055)
  body.translateZ(-0.81)
  group.add(new THREE.Mesh(body, black))

  const cabin = profile([
    [-1.28, 0.68], [-0.84, 1.38], [-0.27, 1.68], [0.70, 1.64],
    [1.43, 1.33], [1.70, 0.66], [1.14, 0.67], [0.84, 1.19],
    [-0.66, 1.25], [-1.10, 0.67]
  ], 1.38, 0.04)
  cabin.translateZ(-0.69)
  group.add(new THREE.Mesh(cabin, black))

  const windshield = profile([
    [-0.76, 1.27], [-0.28, 1.57], [0.61, 1.53], [1.10, 1.31],
    [0.88, 1.22], [-0.56, 1.24]
  ], 1.395, 0.008)
  windshield.translateZ(-0.6975)
  group.add(new THREE.Mesh(windshield, glass))

  const sideWindow = profile([
    [-0.55, 1.29], [-0.24, 1.50], [0.35, 1.48], [0.72, 1.30], [0.62, 1.23], [-0.45, 1.24]
  ], 0.012, 0)
  sideWindow.translateZ(0.701)
  group.add(new THREE.Mesh(sideWindow, white))

  // 车轮独立成组，镜头移动时能提供明确的空间参照。
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.25, 32)
  const hubGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.265, 24)
  const wheelPositions: Array<[number, number, number]> = [
    [-1.62, 0.48, 0.86], [-1.62, 0.48, -0.86], [1.58, 0.48, 0.86], [1.58, 0.48, -0.86]
  ]
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, black)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(x, y, z)
    group.add(wheel)
    const hub = new THREE.Mesh(hubGeo, white)
    hub.rotation.x = Math.PI / 2
    hub.position.set(x, y, z)
    group.add(hub)
  }

  // 车头灯，车头朝向 +X。
  const lampGeo = new THREE.SphereGeometry(0.24, 16, 10)
  const lampL = new THREE.Mesh(lampGeo, white)
  const lampR = lampL.clone()
  lampL.scale.set(0.85, 0.32, 1.55)
  lampR.scale.copy(lampL.scale)
  lampL.position.set(2.49, 0.67, 0.55)
  lampR.position.set(2.49, 0.67, -0.55)
  group.add(lampL, lampR)

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 1.05), white)
  grille.position.set(2.53, 0.28, 0)
  group.add(grille)

  group.position.set(-7.5, -0.9, 0)
  return group
}

function setupThree() {
  if (!canvas.value) return false
  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    camera = new THREE.PerspectiveCamera(31, window.innerWidth / window.innerHeight, 0.05, 100)
    camera.position.set(0, 1.45, 10.2)
    camera.lookAt(0, 0.55, 0)

    renderer = new THREE.WebGLRenderer({
      canvas: canvas.value,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    car = buildCar()
    scene.add(car)
    window.addEventListener('resize', resize, { passive: true })
    return true
  } catch (error) {
    console.warn('[AutoInsight] 3D intro unavailable, using fallback.', error)
    disposeThree()
    fallback.value = true
    return false
  }
}

function resize() {
  if (!camera || !renderer) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
}

function animate(now: number) {
  if (!renderer || !scene || !camera || !car || finished) return
  const elapsed = now - startedAt

  // 0.0 - 2.5s：从左侧慢慢驶入。
  if (elapsed < 2500) {
    const p = easeOut(elapsed / 2500)
    car.position.x = THREE.MathUtils.lerp(-7.5, 0, p)
    car.position.y = -0.9 + Math.sin(p * Math.PI) * 0.025
    camera.position.set(0, 1.45, 10.2)
    camera.lookAt(0, 0.55, 0)
  }
  // 2.5 - 5.1s：摄像机真正绕 3D 车体转向车头。
  else if (elapsed < 5100) {
    const p = easeInOut((elapsed - 2500) / 2600)
    const angle = p * Math.PI / 2
    const radius = 10.2
    camera.position.x = Math.sin(angle) * radius
    camera.position.z = Math.cos(angle) * radius
    camera.position.y = 1.45 + Math.sin(p * Math.PI) * 0.22
    camera.lookAt(0, 0.55, 0)
    car.position.set(0, -0.9, 0)
  }
  // 5.1 - 5.95s：正面停顿。
  else if (elapsed < 5950) {
    camera.position.set(10.2, 1.62, 0)
    camera.lookAt(0.35, 0.56, 0)
  }
  // 5.95 - 7.05s：突然加速冲屏。
  else if (elapsed < 7050) {
    const p = easeIn((elapsed - 5950) / 1100)
    const radius = THREE.MathUtils.lerp(10.2, 0.48, p)
    camera.position.set(radius, 1.57, 0)
    camera.lookAt(0.38, 0.56, 0)
    car.scale.setScalar(1 + p * 0.06)
    const shake = p * p * 0.035
    camera.position.y += Math.sin(elapsed * 0.075) * shake
  }
  // 7.05 - 8.0s：冲屏后的白场接管。
  else {
    const p = easeOut((elapsed - 7050) / 950)
    car.scale.setScalar(1.06 + p * 0.24)
    renderer.domElement.style.filter = `blur(${p * 11}px)`
    renderer.domElement.style.opacity = String(1 - p)
    camera.position.set(0.48, 1.57, 0)
    camera.lookAt(0.4, 0.56, 0)
  }

  // Logo 提前一点进入，让转场不出现空白断层。
  if (elapsed >= 7000) brandVisible.value = true
  renderer.render(scene, camera)

  if (elapsed < INTRO_MS) frame = requestAnimationFrame(animate)
  else finish()
}

function finish() {
  if (finished) return
  finished = true
  cancelAnimationFrame(frame)
  done.value = true
  finishTimer = window.setTimeout(() => emit('complete'), 620)
}

function skipAnimation() {
  finish()
}

function disposeThree() {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', resize)
  scene?.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((item) => item.dispose())
    }
  })
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  car = null
}

onMounted(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    brandVisible.value = true
    finishTimer = window.setTimeout(finish, 900)
    return
  }

  if (!setupThree()) {
    // WebGL 不可用时仍然保留品牌开场，而不是把用户困在白屏。
    brandVisible.value = true
    finishTimer = window.setTimeout(finish, 2200)
    return
  }

  startedAt = performance.now()
  frame = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (finishTimer) window.clearTimeout(finishTimer)
  disposeThree()
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

.intro__canvas,
.intro__fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.intro__canvas {
  will-change: filter, opacity;
}

.intro__fallback {
  display: grid;
  place-items: center;
}

.fallback-car {
  position: relative;
  width: min(58vw, 600px);
  height: 150px;
  transform: translateX(-18vw);
  animation: fallbackDrive 1.8s cubic-bezier(.18,.72,.2,1) forwards;
}

.fallback-car__body {
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: 24px;
  height: 66px;
  background: #050505;
  border-radius: 35px 48px 20px 20px;
}

.fallback-car__roof {
  position: absolute;
  left: 25%;
  top: 12px;
  width: 46%;
  height: 70px;
  border: 12px solid #050505;
  border-bottom: 0;
  border-radius: 70px 70px 0 0;
}

.fallback-car__wheel {
  position: absolute;
  bottom: 2px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: #050505;
}

.fallback-car__wheel--1 { left: 17%; }
.fallback-car__wheel--2 { right: 17%; }

.intro__brand {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(92vw, 1160px);
  transform: translate(-50%, -50%);
  text-align: center;
  opacity: 0;
  pointer-events: none;
}

.intro--brand .intro__brand {
  animation: brandIn 1050ms cubic-bezier(.18,.78,.22,1) forwards;
}

.intro__wordmark {
  font-size: clamp(46px, 8.2vw, 120px);
  font-weight: 700;
  line-height: .9;
  letter-spacing: .18em;
  padding-left: .18em;
  white-space: nowrap;
  transform: scaleX(.72);
}

.intro--brand .intro__wordmark {
  animation: wordmarkIn 900ms cubic-bezier(.18,.82,.22,1) 60ms forwards;
}

.intro__rule {
  width: min(440px, 48vw);
  height: 1px;
  margin: 25px auto 18px;
  background: #050505;
  transform: scaleX(0);
}

.intro--brand .intro__rule {
  animation: ruleIn 430ms ease-out 390ms forwards;
}

.intro__tagline {
  font-size: clamp(10px, 1.05vw, 15px);
  letter-spacing: .27em;
  padding-left: .27em;
  opacity: 0;
  transform: translateY(8px);
}

.intro--brand .intro__tagline {
  animation: taglineIn 600ms ease-out 530ms forwards;
}

.intro__skip {
  position: absolute;
  right: 28px;
  bottom: 25px;
  border: 0;
  background: transparent;
  color: rgba(5, 5, 5, .58);
  font-size: 11px;
  letter-spacing: .14em;
  cursor: pointer;
  transition: color 180ms ease;
}

.intro__skip:hover { color: #050505; }
.intro__skip span { margin-left: 7px; font-size: 9px; letter-spacing: .18em; }

.intro--done {
  animation: introOut 620ms ease forwards;
  pointer-events: none;
}

@keyframes fallbackDrive {
  0% { transform: translateX(-18vw); }
  100% { transform: translateX(0); }
}

@keyframes brandIn {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.94); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes wordmarkIn {
  0% { opacity: 0; transform: scaleX(.72); }
  100% { opacity: 1; transform: scaleX(1); }
}

@keyframes ruleIn { to { transform: scaleX(1); } }
@keyframes taglineIn { to { opacity: 1; transform: translateY(0); } }
@keyframes introOut { to { opacity: 0; visibility: hidden; } }

@media (max-width: 700px) {
  .intro__wordmark { letter-spacing: .10em; padding-left: .10em; }
  .intro__tagline { letter-spacing: .14em; padding-left: .14em; }
  .intro__skip { right: 16px; bottom: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .intro--brand .intro__brand,
  .intro--brand .intro__wordmark,
  .intro--brand .intro__rule,
  .intro--brand .intro__tagline,
  .intro--done { animation-duration: 1ms; }
}
</style>
