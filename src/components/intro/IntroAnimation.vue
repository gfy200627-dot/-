<template>
  <div class="intro" :class="{ 'intro--done': done, 'intro--brand': brandVisible }" role="presentation" aria-label="AutoInsight 开场动画">
    <canvas ref="canvas" class="intro__canvas" aria-hidden="true"></canvas>

    <div class="intro__vignette" aria-hidden="true"></div>

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
import * as THREE from 'three'

const emit = defineEmits<{ complete: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const done = ref(false)
const brandVisible = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let car: THREE.Group | null = null
let frame = 0
let startedAt = 0
let finishTimer: number | undefined
let finished = false

const INTRO_MS = 7900
const EASE = (t: number) => {
  const x = Math.max(0, Math.min(1, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}
const EASE_IN = (t: number) => Math.pow(Math.max(0, Math.min(1, t)), 4)
const EASE_OUT = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)

function makeMaterial(color: number) {
  return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
}

function extrudedProfile(points: Array<[number, number]>, depth: number, bevel = 0.05) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 4
  })
}

function buildCar() {
  const group = new THREE.Group()
  const black = makeMaterial(0x050505)
  const white = makeMaterial(0xffffff)
  const glass = makeMaterial(0xf8f8f8)

  // 主车身：低多边形轮廓，比例参考用户提供的侧视/正视/俯视三视图。
  const lower = extrudedProfile([
    [-2.55, 0.08], [-2.35, 0.55], [-1.85, 0.72], [-1.05, 0.68],
    [0.15, 0.67], [1.15, 0.63], [2.15, 0.48], [2.5, 0.18], [2.4, 0.02], [-2.55, 0.08]
  ], 1.58, 0.06)
  lower.translateZ(-0.79)
  group.add(new THREE.Mesh(lower, black))

  // 座舱轮廓。
  const cabin = extrudedProfile([
    [-1.25, 0.69], [-0.82, 1.42], [-0.25, 1.7], [0.7, 1.66], [1.45, 1.35], [1.72, 0.66], [1.2, 0.68], [0.85, 1.2], [-0.65, 1.26], [-1.1, 0.67]
  ], 1.36, 0.045)
  cabin.translateZ(-0.68)
  group.add(new THREE.Mesh(cabin, black))

  // 前挡风玻璃，保留三视图中最醒目的白色留白。
  const windshield = extrudedProfile([
    [-0.75, 1.28], [-0.27, 1.59], [0.62, 1.55], [1.12, 1.32], [0.9, 1.23], [-0.55, 1.25]
  ], 1.375, 0.01)
  windshield.translateZ(-0.6875)
  group.add(new THREE.Mesh(windshield, glass))

  // 车顶高光边框，让镜头绕行时更容易感知体积。
  const roofRail = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.025, 5, 28, Math.PI * 0.96),
    white
  )
  roofRail.scale.set(1.5, 0.72, 0.96)
  roofRail.position.set(-0.02, 1.54, 0)
  roofRail.rotation.x = Math.PI / 2
  group.add(roofRail)

  // 四个车轮。圆柱轴沿 Z，正好对应车身宽度。
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.24, 32)
  const hubGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.255, 24)
  const wheelPositions: Array<[number, number, number]> = [
    [-1.62, 0.48, 0.84], [-1.62, 0.48, -0.84], [1.58, 0.48, 0.84], [1.58, 0.48, -0.84]
  ]
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, black)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(x, y, z)
    group.add(wheel)

    const hub = new THREE.Mesh(hubGeo, white)
    hub.rotation.x = Math.PI / 2
    hub.position.set(x, y, z)
    group.add(hub)
  })

  // 正面灯组。镜头转到车头时才会完整出现。
  const lampGeo = new THREE.SphereGeometry(0.24, 16, 8)
  const lampL = new THREE.Mesh(lampGeo, white)
  const lampR = lampL.clone()
  lampL.scale.set(0.95, 0.35, 1.55)
  lampR.scale.copy(lampL.scale)
  lampL.position.set(2.49, 0.67, 0.55)
  lampR.position.set(2.49, 0.67, -0.55)
  group.add(lampL, lampR)

  // 前脸下唇，增强正面宽度。
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 1.15), black)
  lip.position.set(2.5, 0.26, 0)
  group.add(lip)

  group.position.set(-7.2, -0.9, 0)
  group.scale.setScalar(1.0)
  return group
}

function setupThree() {
  if (!canvas.value) return false

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.05, 100)
  camera.position.set(0, 1.5, 9.4)
  camera.lookAt(0, 0.5, 0)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  car = buildCar()
  scene.add(car)

  window.addEventListener('resize', handleResize, { passive: true })
  return true
}

function handleResize() {
  if (!camera || !renderer) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
}

function updateScene(now: number) {
  if (!renderer || !scene || !camera || !car) return

  const elapsed = now - startedAt
  const t = Math.min(elapsed / INTRO_MS, 1)

  // 0.0 - 2.25s：车从画面左侧真正驶入，摄像机保持侧视。
  if (elapsed < 2250) {
    const p = EASE_OUT(elapsed / 2250)
    car.position.x = THREE.MathUtils.lerp(-7.2, 0, p)
    car.position.y = -0.9 + Math.sin(p * Math.PI) * 0.025
    car.rotation.y = 0
    camera.position.set(0, 1.48, 9.2)
    camera.lookAt(0, 0.55, 0)
  }

  // 2.25 - 4.65s：不是旋转贴图，而是摄像机绕真实 3D 车体从侧面走到车头。
  else if (elapsed < 4650) {
    const p = EASE(elapsed / 2400)
    const angle = p * (Math.PI / 2)
    const radius = 9.2
    camera.position.x = Math.sin(angle) * radius
    camera.position.z = Math.cos(angle) * radius
    camera.position.y = 1.48 + Math.sin(p * Math.PI) * 0.2
    camera.lookAt(0, 0.55, 0)
    car.position.x = 0
    car.position.y = -0.9
  }

  // 4.65 - 5.35s：正面停住，让观众看清车头。
  else if (elapsed < 5350) {
    camera.position.set(9.2, 1.65, 0)
    camera.lookAt(0, 0.55, 0)
  }

  // 5.35 - 6.25s：镜头高速向车头推进，透视真正制造“冲屏”。
  else if (elapsed < 6250) {
    const p = EASE_IN((elapsed - 5350) / 900)
    const radius = THREE.MathUtils.lerp(9.2, 0.62, p)
    camera.position.set(radius, 1.55, 0)
    camera.lookAt(0.45, 0.56, 0)
    const shake = p * p * 0.035
    camera.position.y += Math.sin(elapsed * 0.08) * shake
    car.scale.setScalar(1 + p * 0.04)
  }

  // 6.25s 后汽车退出，Logo 接管画面。
  else {
    const p = EASE_OUT((elapsed - 6250) / 600)
    car.scale.setScalar(1.04 + p * 0.18)
    camera.position.set(0.62, 1.55, 0)
    camera.lookAt(0.45, 0.56, 0)
    renderer.domElement.style.filter = `blur(${p * 9}px)`
    renderer.domElement.style.opacity = String(1 - p)
  }

  // 5.95s 开始准备 Logo，避免汽车消失后页面空等。
  if (elapsed >= 5950 && !brandVisible.value) brandVisible.value = true

  renderer.render(scene, camera)

  if (t < 1 && !finished) frame = requestAnimationFrame(updateScene)
  else finish()
}

function finish() {
  if (finished) return
  finished = true
  if (finishTimer) window.clearTimeout(finishTimer)
  cancelAnimationFrame(frame)
  done.value = true
  finishTimer = window.setTimeout(() => emit('complete'), 520)
}

function skipAnimation() {
  finish()
}

function disposeThree() {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', handleResize)
  if (scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        const material = object.material
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else material.dispose()
      }
    })
  }
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
    finishTimer = window.setTimeout(finish, 700)
    return
  }

  if (!setupThree()) {
    finish()
    return
  }

  startedAt = performance.now()
  frame = requestAnimationFrame(updateScene)
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

.intro__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  will-change: transform, filter, opacity;
}

.intro__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 58%, rgba(0, 0, 0, 0.035) 100%);
}

.intro__brand {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(92vw, 1160px);
  transform: translate(-50%, -50%) scale(.94);
  text-align: center;
  opacity: 0;
  pointer-events: none;
}

.intro--brand .intro__brand {
  animation: brandIn 980ms cubic-bezier(.18,.78,.22,1) forwards;
}

.intro__wordmark {
  font-size: clamp(48px, 8.4vw, 122px);
  font-weight: 700;
  line-height: .9;
  letter-spacing: .2em;
  padding-left: .2em;
  white-space: nowrap;
  transform: scaleX(.7);
  transform-origin: center;
}

.intro--brand .intro__wordmark {
  animation: wordmarkIn 820ms cubic-bezier(.18,.82,.22,1) 70ms forwards;
}

.intro__rule {
  width: min(440px, 48vw);
  height: 1px;
  margin: 25px auto 18px;
  background: #050505;
  transform: scaleX(0);
}

.intro--brand .intro__rule {
  animation: ruleIn 420ms ease-out 380ms forwards;
}

.intro__tagline {
  font-size: clamp(11px, 1.05vw, 15px);
  letter-spacing: .28em;
  padding-left: .28em;
  opacity: 0;
  transform: translateY(10px);
}

.intro--brand .intro__tagline {
  animation: taglineIn 420ms ease-out 520ms forwards;
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
  opacity: .48;
  transition: opacity 160ms ease;
}

.intro__skip:hover { opacity: 1; }
.intro__skip span { margin-left: 7px; font-size: 9px; opacity: .55; }

.intro--done {
  animation: introExit 520ms ease-in forwards;
}

@keyframes brandIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(.94); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes wordmarkIn {
  from { transform: scaleX(.7); letter-spacing: .2em; padding-left: .2em; }
  to { transform: scaleX(1); letter-spacing: .075em; padding-left: .075em; }
}

@keyframes ruleIn {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes taglineIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: .62; transform: translateY(0); }
}

@keyframes introExit {
  from { opacity: 1; }
  to { opacity: 0; }
}

@media (max-width: 700px) {
  .intro__wordmark { font-size: clamp(38px, 12vw, 72px); }
  .intro__tagline { letter-spacing: .14em; padding-left: .14em; }
  .intro__skip { right: 18px; bottom: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .intro__brand { opacity: 1; transform: translate(-50%, -50%); }
  .intro__wordmark { transform: none; letter-spacing: .075em; padding-left: .075em; }
  .intro__rule { transform: none; }
  .intro__tagline { opacity: .62; transform: none; }
}
</style>
