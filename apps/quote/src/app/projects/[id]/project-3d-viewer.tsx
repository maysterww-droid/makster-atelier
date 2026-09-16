'use client';

import { useMemo } from 'react';
import type { Locale } from '@/lib/i18n';
import type { Module3DAsset } from '@/lib/module-3d-assets';
import styles from './visual-builder.module.css';

export type Project3DSceneItem = {
  sceneId: string;
  cabinetId: string;
  moduleKey: string;
  name: string;
  xMm: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  bottomMm: number;
  level: 'base' | 'wall' | 'tall';
};

type Props = {
  items: Project3DSceneItem[];
  assets: Module3DAsset[];
  locale: Locale;
};

const copy: Record<Locale, { loading: string; ready: string; fallback: string; fit: string; front: string; engineError: string }> = {
  ru: { loading: 'Загружаю 3D…', ready: '3D-модели', fallback: 'схематичные 3D-блоки', fit: 'Вписать', front: 'Спереди', engineError: '3D-движок не загрузился. Переключитесь на 2D.' },
  en: { loading: 'Loading 3D…', ready: '3D models', fallback: '3D placeholders', fit: 'Fit', front: 'Front', engineError: 'The 3D engine could not load. Switch to 2D.' },
  cs: { loading: 'Načítám 3D…', ready: '3D modely', fallback: '3D zástupné bloky', fit: 'Přizpůsobit', front: 'Zepředu', engineError: '3D modul se nepodařilo načíst. Přepněte na 2D.' },
  de: { loading: '3D wird geladen…', ready: '3D-Modelle', fallback: '3D-Platzhalter', fit: 'Einpassen', front: 'Vorne', engineError: 'Die 3D-Engine konnte nicht geladen werden. Bitte auf 2D wechseln.' },
  pl: { loading: 'Ładowanie 3D…', ready: 'Modele 3D', fallback: 'bloki zastępcze 3D', fit: 'Dopasuj', front: 'Przód', engineError: 'Nie udało się załadować silnika 3D. Przełącz na 2D.' },
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function Project3DViewer({ items, assets, locale }: Props) {
  const t = copy[locale];
  const srcDoc = useMemo(() => {
    const sceneJson = safeJson(items);
    const assetJson = safeJson(assets);
    const labelsJson = safeJson(t);
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:linear-gradient(180deg,#fffdf9,#f4e8dd);font-family:Inter,Arial,sans-serif;color:#4f3022}
#app{position:relative;width:100%;height:100%}canvas{display:block;width:100%;height:100%}
.hud{position:absolute;left:14px;top:14px;display:flex;gap:8px;align-items:center;z-index:5;pointer-events:none}
.status{background:rgba(255,255,255,.9);border:1px solid #d9c4b3;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;box-shadow:0 8px 22px rgba(72,45,28,.08)}
.controls{position:absolute;right:14px;top:14px;display:flex;gap:7px;z-index:5}.controls button{border:1px solid #cda88e;background:rgba(255,250,246,.94);color:#4f3022;border-radius:9px;padding:7px 10px;font:800 11px Inter,Arial,sans-serif;cursor:pointer}.controls button:hover{background:#f4e7dc}
.error{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#8b3f32;font-weight:800;background:#fff8f5;z-index:10}
</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
</head>
<body>
<div id="app"><div class="hud"><div class="status" id="status"></div></div><div class="controls"><button id="front"></button><button id="fit"></button></div><div class="error" id="error"></div></div>
<script type="module">
const ITEMS=${sceneJson};
const ASSETS=${assetJson};
const LABELS=${labelsJson};
const statusEl=document.getElementById('status');const errorEl=document.getElementById('error');
document.getElementById('front').textContent=LABELS.front;document.getElementById('fit').textContent=LABELS.fit;statusEl.textContent=LABELS.loading;
try{
  const THREE=await import('three');
  const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const app=document.getElementById('app');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xfffcf8);
  const camera=new THREE.PerspectiveCamera(35,1,.02,100);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;app.prepend(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=.4;controls.maxDistance=40;controls.target.set(0,1,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0xc9b7a8,2.2));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-4,7,5);key.castShadow=true;scene.add(key);const fill=new THREE.DirectionalLight(0xffe4cf,1.1);fill.position.set(7,4,2);scene.add(fill);
  const maxX=Math.max(2,...ITEMS.map(i=>(i.xMm+i.widthMm)/1000));const maxH=Math.max(2.4,...ITEMS.map(i=>(i.bottomMm+i.heightMm)/1000));const maxD=Math.max(.6,...ITEMS.map(i=>i.depthMm/1000));
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(6,maxX+4),Math.max(5,maxD+4)),new THREE.MeshStandardMaterial({color:0xe9ddd2,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.set(maxX/2,0,-maxD/2);floor.receiveShadow=true;scene.add(floor);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(6,maxX+4),Math.max(4,maxH+1)),new THREE.MeshStandardMaterial({color:0xf7f1eb,roughness:1}));wall.position.set(maxX/2,Math.max(2,maxH/2),.04);wall.receiveShadow=true;scene.add(wall);
  const loader=new GLTFLoader();const root=new THREE.Group();scene.add(root);
  const assetFor=(key)=>ASSETS.find(a=>Array.isArray(a.matchKeys)&&a.matchKeys.includes(key));
  const placeholder=(item)=>{const w=item.widthMm/1000,h=item.heightMm/1000,d=item.depthMm/1000;const color=item.level==='wall'?0xead8c8:item.level==='tall'?0xd7bfae:0xf0dfd1;const material=new THREE.MeshStandardMaterial({color,roughness:.75,metalness:0});const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set((item.xMm+item.widthMm/2)/1000,(item.bottomMm+item.heightMm/2)/1000,-d/2);mesh.castShadow=true;mesh.receiveShadow=true;const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0x5a3b2c,transparent:true,opacity:.5}));mesh.add(edge);root.add(mesh);};
  let loaded=0,placeholders=0;
  await Promise.all(ITEMS.map(async item=>{const asset=assetFor(item.moduleKey);if(!asset){placeholder(item);placeholders++;return;}try{const gltf=await loader.loadAsync(asset.glbUrl);const model=gltf.scene;model.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;if(obj.material&&'envMapIntensity' in obj.material)obj.material.envMapIntensity=.7;}});const box0=new THREE.Box3().setFromObject(model);const size0=box0.getSize(new THREE.Vector3());const target=new THREE.Vector3(item.widthMm/1000,item.heightMm/1000,item.depthMm/1000);model.scale.set(target.x/Math.max(size0.x,.001),target.y/Math.max(size0.y,.001),target.z/Math.max(size0.z,.001));model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);const center=box.getCenter(new THREE.Vector3());const targetCenter=new THREE.Vector3((item.xMm+item.widthMm/2)/1000,(item.bottomMm+item.heightMm/2)/1000,-item.depthMm/2000);model.position.add(targetCenter.sub(center));root.add(model);loaded++;}catch{placeholder(item);placeholders++;}}));
  statusEl.textContent=loaded+' '+LABELS.ready+' · '+placeholders+' '+LABELS.fallback;
  const contentBox=()=>new THREE.Box3().setFromObject(root);
  function fit(front=false){const box=contentBox();if(box.isEmpty()){box.min.set(0,0,-.6);box.max.set(maxX,maxH,0);}const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());controls.target.copy(center);const fov=THREE.MathUtils.degToRad(camera.fov);const distance=Math.max(size.x/(2*Math.tan(fov/2)),size.y/(2*Math.tan(fov/2)))*1.18;if(front)camera.position.set(center.x,center.y,Math.max(2,distance));else camera.position.set(center.x+distance*.42,center.y+distance*.22,Math.max(2,distance));camera.near=Math.max(.01,distance/100);camera.far=Math.max(100,distance*20);camera.updateProjectionMatrix();controls.update();}
  document.getElementById('fit').onclick=()=>fit(false);document.getElementById('front').onclick=()=>fit(true);fit(false);
  function resize(){const w=Math.max(1,app.clientWidth),h=Math.max(1,app.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(app);resize();
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
}catch(error){console.error(error);errorEl.style.display='grid';errorEl.textContent=LABELS.engineError;statusEl.style.display='none';}
</script>
</body>
</html>`;
  }, [items, assets, t]);

  return <iframe className={styles.threeViewer} title="Makster Quote 3D Preview" srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" />;
}
