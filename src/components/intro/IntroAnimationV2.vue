<template>
  <div class="intro" :class="{ done }">
    <canvas ref="canvas" class="canvas"></canvas>
    <div class="hud" :class="{ show: hudVisible }"><span>AUTO / INSIGHT</span><i></i><span>DATA INTELLIGENCE</span></div>
    <div class="brand" :class="{ show: brandVisible }"><strong>AutoInsight</strong><b></b><small>汽车行业数据智能分析与决策平台</small></div>
    <button class="skip" @click="finish">跳过 <em>SKIP</em></button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'

const emit = defineEmits<{ complete: [] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const done = ref(false), brandVisible = ref(false), hudVisible = ref(false)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let car: THREE.Group | null = null
let parts: THREE.Object3D[] = []
let particles: THREE.Points | null = null
let particleMaterial: THREE.PointsMaterial | null = null
let from: Float32Array | null = null, to: Float32Array | null = null
let frame = 0, startedAt = 0, timer: number | undefined, finished = false

const clamp=(v:number)=>Math.max(0,Math.min(1,v))
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)}
const out=(v:number)=>1-Math.pow(1-clamp(v),3)
const inn=(v:number)=>Math.pow(clamp(v),3.5)
const mat=(c:number,m=.2,r=.3)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r})
function extrude(points:Array<[number,number]>,depth:number,bevel=.045){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel,curveSegments:8})}
function add(g:THREE.Group,o:THREE.Object3D){g.add(o);parts.push(o)}

function buildCar(){
  const g=new THREE.Group(), body=mat(0x15171b,.92,.17), dark=mat(0x030405,.65,.14), glass=mat(0x202b35,.4,.1), chrome=mat(0xbfc6ce,.95,.14)
  let x=extrude([[-2.85,.08],[-2.62,.48],[-2.1,.7],[-1.12,.77],[.3,.74],[1.48,.64],[2.3,.46],[2.62,.18],[2.52,.04]],1.78,.065);x.translateZ(-.89);add(g,new THREE.Mesh(x,body))
  x=extrude([[-1.4,.76],[-.86,1.43],[-.25,1.72],[.72,1.67],[1.46,1.34],[1.75,.72]],1.5,.045);x.translateZ(-.75);add(g,new THREE.Mesh(x,dark))
  x=extrude([[-.78,1.29],[-.28,1.59],[.6,1.55],[1.12,1.32],[.85,1.24],[-.56,1.25]],1.52,.008);x.translateZ(-.76);add(g,new THREE.Mesh(x,glass))
  const tire=mat(0x020202,.05,.82), hubMat=mat(0xcfd4d9,.95,.14), wg=new THREE.CylinderGeometry(.56,.56,.28,40),hg=new THREE.CylinderGeometry(.22,.22,.3,28)
  for(const [px,pz] of [[-1.7,.91],[-1.7,-.91],[1.62,.91],[1.62,-.91]]){let w=new THREE.Mesh(wg,tire);w.rotation.x=Math.PI/2;w.position.set(px,.48,pz);add(g,w);let h=new THREE.Mesh(hg,hubMat);h.rotation.x=Math.PI/2;h.position.set(px,.48,pz);add(g,h)}
  const lampMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:4,roughness:.1})
  for(const z of [-.58,.58]){let l=new THREE.Mesh(new THREE.SphereGeometry(.26,20,12),lampMat);l.scale.set(1,.3,1.6);l.position.set(2.58,.68,z);add(g,l)}
  let grill=new THREE.Mesh(new THREE.BoxGeometry(.1,.24,1.22),dark);grill.position.set(2.65,.3,0);add(g,grill)
  let trim=new THREE.Mesh(new THREE.BoxGeometry(.045,.035,3.9),chrome);trim.position.set(.05,.69,.91);add(g,trim)
  g.position.set(-7.4,-.9,0);return g
}

function makeParticles(){
  const n=4000,c=document.createElement('canvas');c.width=1800;c.height=360;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.font='700 235px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('AutoInsight',900,180);const data=ctx.getImageData(0,0,c.width,c.height).data,pts:Array<[number,number]>=[]
  for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3)if(data[(y*c.width+x)*4+3]>80)pts.push([x,y])
  // 某些浏览器/隐私模式下 canvas 文字采样可能得到空数组，不能因此让整个 3D 开场初始化失败。
  if(!pts.length){for(let i=0;i<900;i++){const a=(i/900)*Math.PI*2;pts.push([900+Math.cos(a)*760,180+Math.sin(a)*95])}}
  from=new Float32Array(n*3);to=new Float32Array(n*3);let seed=9187;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
  for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,b=Math.acos(2*rnd()-1),q=Math.pow(rnd(),.4);from[i*3]=Math.cos(a)*Math.sin(b)*q*4;from[i*3+1]=Math.cos(b)*q*2.3+.35;from[i*3+2]=Math.sin(a)*Math.sin(b)*q*6;const p=pts[(i*43)%pts.length];to[i*3]=.05;to[i*3+1]=-(p[1]-180)/360*2.6;to[i*3+2]=-(p[0]-900)/1800*10.5}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(from.slice(),3));particleMaterial=new THREE.PointsMaterial({color:0xffffff,size:.024,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});particles=new THREE.Points(geo,particleMaterial);particles.frustumCulled=false;particles.visible=false;scene!.add(particles)
}
function morph(p:number,t:number){if(!particles||!particleMaterial||!from||!to)return;const a=(particles.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array,m=smooth(p),n=(1-m)*.3;for(let i=0;i<a.length;i+=3){a[i]=THREE.MathUtils.lerp(from[i],to[i],m)+Math.sin(t*.008+i*.12)*n;a[i+1]=THREE.MathUtils.lerp(from[i+1],to[i+1],m)+Math.cos(t*.007+i*.08)*n;a[i+2]=THREE.MathUtils.lerp(from[i+2],to[i+2],m)+Math.sin(t*.006+i*.05)*n*.7}(particles.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true;particleMaterial.opacity=clamp(p*2.3);particleMaterial.size=THREE.MathUtils.lerp(.018,.034,m)}

function setup(){
  if(!canvas.value)return false
  try{
    scene=new THREE.Scene();scene.background=new THREE.Color(0x050609);scene.fog=new THREE.Fog(0x050609,10,25)
    camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.05,100);camera.position.set(-.6,1.35,10.8)
    renderer=new THREE.WebGLRenderer({canvas:canvas.value,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08
    scene.add(new THREE.HemisphereLight(0x9ca8ba,0x020204,1.2));const key=new THREE.DirectionalLight(0xffffff,3.8);key.position.set(-4,7,8);scene.add(key);const rim=new THREE.PointLight(0x71839a,20,18);rim.position.set(-3,2,-6);scene.add(rim)
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),mat(0x07080a,.7,.3));floor.rotation.x=-Math.PI/2;floor.position.y=-1.42;scene.add(floor)
    const grid=new THREE.GridHelper(40,32,0x34383e,0x17191d);grid.position.y=-1.405;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.3;scene.add(grid)
    parts=[];car=buildCar();scene.add(car);makeParticles();addEventListener('resize',resize,{passive:true});return true
  }catch(e){console.warn('[AutoInsight] intro init failed',e);return false}
}
function resize(){if(camera&&renderer){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false)}}
function animate(now:number){
  if(!renderer||!scene||!camera||!car||finished)return;const t=now-startedAt
  if(t<2700){const p=out(t/2700);car.position.x=THREE.MathUtils.lerp(-7.4,0,p);camera.position.set(-.75,1.35,10.8);camera.lookAt(0,.45,0);hudVisible.value=t>450;particles!.visible=false}
  else if(t<5700){const p=smooth((t-2700)/3000),a=p*Math.PI*.52,r=10.8;camera.position.set(Math.sin(a)*r-.25,1.4+Math.sin(p*Math.PI)*.42,Math.cos(a)*r);camera.lookAt(.1,.48,0);car.position.set(0,-.9,0);particles!.visible=false}
  else if(t<6500){const p=smooth((t-5700)/800);camera.position.set(10.3-p*.15,1.55,.04);camera.lookAt(.45,.5,0);hudVisible.value=false;particles!.visible=false}
  else if(t<7550){const p=inn((t-6500)/1050);camera.position.set(10.15-p*9.55,1.54-p*.16,.04);camera.lookAt(.8,.48,0);car.scale.setScalar(1+p*.16);car.rotation.y=p*.06;renderer.domElement.style.filter=`blur(${p*2.2}px)`}
  else if(t<8800){const p=smooth((t-7550)/1250);car.visible=p<.64;particles!.visible=true;particles!.position.set(.15,.42,0);morph(p,now);parts.forEach((o,i)=>{const q=(i*1.73)%1;o.position.x+=Math.sin(q*20)*p*.005;o.rotation.z+=(q-.5)*p*.006});renderer.domElement.style.filter='none'}
  else if(t<10300){const p=smooth((t-8800)/1500);car.visible=false;particles!.visible=true;morph(p,now);brandVisible.value=p>.76}
  else finish()
  renderer.render(scene,camera);frame=requestAnimationFrame(animate)
}
function finish(){if(finished)return;finished=true;cancelAnimationFrame(frame);brandVisible.value=true;done.value=true;timer=window.setTimeout(()=>emit('complete'),650)}
function dispose(){cancelAnimationFrame(frame);removeEventListener('resize',resize);scene?.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose())}});renderer?.dispose();renderer=null;scene=null;camera=null;car=null;particles=null;particleMaterial=null;from=null;to=null}
onMounted(()=>{startedAt=performance.now();if(setup())frame=requestAnimationFrame(animate);else{brandVisible.value=true;timer=window.setTimeout(finish,1500)}})
onBeforeUnmount(()=>{if(timer)clearTimeout(timer);dispose()})
</script>

<style scoped>
.intro{position:fixed;inset:0;z-index:99999;overflow:hidden;background:#050609;color:#fff;isolation:isolate;font-family:Inter,"Helvetica Neue",Arial,sans-serif;transition:opacity .65s ease}.intro.done{opacity:0;pointer-events:none}.canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.hud{position:absolute;top:32px;left:34px;right:34px;display:flex;align-items:center;gap:12px;font:500 9px Arial,sans-serif;letter-spacing:.24em;color:rgba(255,255,255,.4);opacity:0;transition:opacity .7s}.hud.show{opacity:1}.hud i{height:1px;background:rgba(255,255,255,.2);flex:1}.brand{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.94);text-align:center;opacity:0;transition:opacity .8s,transform 1s cubic-bezier(.16,.8,.2,1);pointer-events:none}.brand.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.brand strong{display:block;font:650 clamp(55px,8vw,120px)/.88 Arial,sans-serif;letter-spacing:-.07em}.brand b{display:block;width:150px;height:1px;margin:23px auto 15px;background:rgba(255,255,255,.7)}.brand small{font:400 clamp(10px,1.1vw,14px)/1.5 Arial,"Microsoft YaHei",sans-serif;letter-spacing:.24em;color:rgba(255,255,255,.55)}.skip{position:absolute;right:26px;bottom:22px;border:0;background:none;color:rgba(255,255,255,.45);font:500 10px Arial;letter-spacing:.12em;cursor:pointer;padding:8px}.skip em{font-style:normal;margin-left:7px;color:rgba(255,255,255,.25)}@media(max-width:700px){.hud{left:18px;right:18px}.brand small{letter-spacing:.1em}.skip{right:14px;bottom:14px}}
</style>
