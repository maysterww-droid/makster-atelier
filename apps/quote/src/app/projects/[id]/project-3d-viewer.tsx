'use client';

import { useMemo } from 'react';
import type { Locale } from '@/lib/i18n';
import type { Module3DAsset } from '@/lib/module-3d-assets';

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
  compact?: boolean;
};

const copy: Record<Locale, { loading: string; ready: string; fallback: string; fit: string; front: string; engineError: string }> = {
  ru: { loading: 'Готовлю 3D…', ready: 'Blender-моделей', fallback: 'временных модулей', fit: 'Вписать', front: 'Спереди', engineError: '3D-движок не загрузился. Переключитесь на 2D.' },
  en: { loading: 'Preparing 3D…', ready: 'Blender models', fallback: 'temporary modules', fit: 'Fit', front: 'Front', engineError: 'The 3D engine could not load. Switch to 2D.' },
  cs: { loading: 'Připravuji 3D…', ready: 'Blender modely', fallback: 'dočasné moduly', fit: 'Přizpůsobit', front: 'Zepředu', engineError: '3D modul se nepodařilo načíst. Přepněte na 2D.' },
  de: { loading: '3D wird vorbereitet…', ready: 'Blender-Modelle', fallback: 'temporäre Module', fit: 'Einpassen', front: 'Vorne', engineError: 'Die 3D-Engine konnte nicht geladen werden. Bitte auf 2D wechseln.' },
  pl: { loading: 'Przygotowuję 3D…', ready: 'modele Blender', fallback: 'moduły tymczasowe', fit: 'Dopasuj', front: 'Przód', engineError: 'Nie udało się załadować silnika 3D. Przełącz na 2D.' },
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function Project3DViewer({ items, assets, locale, compact = false }: Props) {
  const t = copy[locale];
  const srcDoc = useMemo(() => {
    const sceneJson = safeJson(items);
    const assetJson = safeJson(assets);
    const labelsJson = safeJson(t);
    const compactCss = compact ? '.hud,.controls{display:none!important}' : '';
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#eee7e0;font-family:Inter,Arial,sans-serif;color:#4f3022}
#app{position:relative;width:100%;height:100%;background:radial-gradient(circle at 50% 32%,#fffdfb 0,#f3ece6 55%,#e7ddd4 100%)}
canvas{display:block;width:100%;height:100%;outline:none}
.hud{position:absolute;left:14px;top:14px;display:flex;gap:8px;align-items:center;z-index:5;pointer-events:none}
.status{background:rgba(255,255,255,.88);backdrop-filter:blur(8px);border:1px solid rgba(157,119,91,.28);border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;box-shadow:0 8px 24px rgba(72,45,28,.08)}
.controls{position:absolute;right:14px;top:14px;display:flex;gap:7px;z-index:5}
.controls button{border:1px solid #cda88e;background:rgba(255,252,249,.92);color:#4f3022;border-radius:10px;padding:8px 11px;font:800 11px Inter,Arial,sans-serif;cursor:pointer;box-shadow:0 7px 18px rgba(72,45,28,.07)}
.controls button:hover{background:#fff;border-color:#a97959}
.error{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:30px;color:#8b3f32;font-weight:800;background:#fff8f5;z-index:10}
${compactCss}
</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"}}</script>
</head>
<body>
<div id="app"><div class="hud"><div class="status" id="status"></div></div><div class="controls"><button id="front"></button><button id="fit"></button></div><div class="error" id="error"></div></div>
<script type="module">
const ITEMS=${sceneJson};
const ASSETS=${assetJson};
const LABELS=${labelsJson};
const statusEl=document.getElementById('status');
const errorEl=document.getElementById('error');
document.getElementById('front').textContent=LABELS.front;
document.getElementById('fit').textContent=LABELS.fit;
statusEl.textContent=LABELS.loading;
try{
  const THREE=await import('three');
  const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const {RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
  const app=document.getElementById('app');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xeee7e0);
  const camera=new THREE.PerspectiveCamera(34,1,.02,120);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.98;
  renderer.setClearColor(0xeee7e0,1);
  app.prepend(renderer.domElement);

  const pmrem=new THREE.PMREMGenerator(renderer);
  const envScene=new RoomEnvironment();
  scene.environment=pmrem.fromScene(envScene,.04).texture;
  envScene.dispose();
  pmrem.dispose();

  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;
  controls.dampingFactor=.065;
  controls.minDistance=.45;
  controls.maxDistance=45;
  controls.target.set(0,1,0);

  scene.add(new THREE.AmbientLight(0xffffff,.72));
  const hemi=new THREE.HemisphereLight(0xfffbf6,0xc4b09f,1.45);
  scene.add(hemi);
  const key=new THREE.DirectionalLight(0xfff7ef,3.35);
  key.position.set(-4.5,7.5,5.5);
  key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.bias=-.0002;
  key.shadow.normalBias=.025;
  key.shadow.camera.left=-12;key.shadow.camera.right=12;key.shadow.camera.top=10;key.shadow.camera.bottom=-6;
  scene.add(key);
  const fill=new THREE.DirectionalLight(0xffddc7,1.45);
  fill.position.set(7,4,4);
  scene.add(fill);
  const rim=new THREE.DirectionalLight(0xe8f0ff,.68);
  rim.position.set(-3,4,-5);
  scene.add(rim);

  const maxX=Math.max(2,...ITEMS.map(i=>(i.xMm+i.widthMm)/1000));
  const maxH=Math.max(2.4,...ITEMS.map(i=>(i.bottomMm+i.heightMm)/1000));
  const maxD=Math.max(.6,...ITEMS.map(i=>i.depthMm/1000));
  const floorMaterial=new THREE.MeshStandardMaterial({color:0xded3c8,roughness:.94,metalness:0});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(7,maxX+5),Math.max(6,maxD+5)),floorMaterial);
  floor.rotation.x=-Math.PI/2;
  floor.position.set(maxX/2,0,-maxD/2-.12);
  floor.receiveShadow=true;
  scene.add(floor);
  const wallMaterial=new THREE.MeshStandardMaterial({color:0xebe3dc,roughness:.99,metalness:0});
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(7,maxX+5),Math.max(4.5,maxH+1.8)),wallMaterial);
  wall.position.set(maxX/2,Math.max(2.15,maxH/2+.18),.08);
  wall.receiveShadow=true;
  scene.add(wall);

  const root=new THREE.Group();
  scene.add(root);
  const loader=new GLTFLoader();
  const assetFor=(key)=>ASSETS.find(a=>Array.isArray(a.matchKeys)&&a.matchKeys.includes(key));
  const standard=(color,rough=.62,metal=.0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,envMapIntensity:1.05});

  function addFront(group,item,w,h,d,type,yOffset=0){
    const frontZ=.011;
    if(type==='drawer'){
      const gap=.012;const section=(h-gap*4)/3;
      for(let n=0;n<3;n++){
        const panel=new THREE.Mesh(new THREE.BoxGeometry(w*.965,section,.018),standard(0xe3d0bf,.52));
        panel.position.set(0,yOffset-h/2+gap*2+section/2+n*(section+gap),d/2+frontZ);
        panel.castShadow=true;group.add(panel);
        const handle=new THREE.Mesh(new THREE.BoxGeometry(w*.28,.012,.025),standard(0x8e8278,.32,.42));
        handle.position.set(0,panel.position.y+section*.27,d/2+.026);handle.castShadow=true;group.add(handle);
      }
      return;
    }
    const panel=new THREE.Mesh(new THREE.BoxGeometry(w*.965,h*.965,.018),standard(item.level==='tall'?0xdfc9b7:0xe8d8ca,.54));
    panel.position.set(0,yOffset,d/2+frontZ);panel.castShadow=true;group.add(panel);
    if(type==='oven'){
      const glass=new THREE.Mesh(new THREE.BoxGeometry(w*.72,h*.46,.022),standard(0x343638,.26,.18));
      glass.position.set(0,yOffset-h*.02,d/2+.028);glass.castShadow=true;group.add(glass);
    }else if(type==='fridge'){
      const split=new THREE.Mesh(new THREE.BoxGeometry(w*.9,.012,.024),standard(0x8e8278,.4,.25));
      split.position.set(0,yOffset-h*.18,d/2+.027);group.add(split);
    }else{
      const handle=new THREE.Mesh(new THREE.BoxGeometry(.014,Math.min(.26,h*.28),.026),standard(0x8e8278,.32,.45));
      handle.position.set(w*.37,yOffset,d/2+.028);handle.castShadow=true;group.add(handle);
    }
  }

  function placeholder(item){
    const w=item.widthMm/1000,h=item.heightMm/1000,d=item.depthMm/1000;
    const type=(item.moduleKey||'').toLowerCase().includes('drawer')?'drawer':(item.moduleKey||'').toLowerCase().includes('oven')?'oven':(item.moduleKey||'').toLowerCase().includes('fridge')?'fridge':'door';
    const group=new THREE.Group();
    const supportHeight=item.level==='wall'?0:Math.min(.1,Math.max(.06,h*.12));
    const bodyH=Math.max(.12,h-supportHeight);
    const bodyCenter=supportHeight/2;
    const carcassColor=item.level==='wall'?0xded2c7:item.level==='tall'?0xd8c6b8:0xe8dcd1;
    const body=new THREE.Mesh(new THREE.BoxGeometry(w,bodyH,d),standard(carcassColor,.7));
    body.position.y=bodyCenter;body.castShadow=true;body.receiveShadow=true;group.add(body);
    addFront(group,item,w,bodyH,d,type,bodyCenter);
    if(supportHeight>0){
      const legSize=Math.min(.05,w*.09,d*.09);
      const legMaterial=standard(0x75685f,.4,.22);
      for(const x of [-w*.34,w*.34])for(const z of [-d*.34,d*.34]){
        const leg=new THREE.Mesh(new THREE.BoxGeometry(legSize,supportHeight,legSize),legMaterial);
        leg.position.set(x,-h/2+supportHeight/2,z);leg.castShadow=true;group.add(leg);
      }
    }
    group.position.set((item.xMm+item.widthMm/2)/1000,(item.bottomMm+item.heightMm/2)/1000,-d/2);
    root.add(group);
  }

  function tuneMaterial(material,name){
    if(!material)return;
    const list=Array.isArray(material)?material:[material];
    for(const mat of list){
      if(!mat||!mat.isMaterial)continue;
      if('envMapIntensity' in mat)mat.envMapIntensity=1.15;
      if('roughness' in mat&&typeof mat.roughness==='number')mat.roughness=Math.max(.34,Math.min(.9,mat.roughness));
      if(mat.color){
        const label=(name||'').toLowerCase();
        const sum=mat.color.r+mat.color.g+mat.color.b;
        if(label.includes('handle')||label.includes('руч')||label.includes('metal')){
          mat.color.set(0x8d837b);if('metalness' in mat)mat.metalness=.52;if('roughness' in mat)mat.roughness=.34;
        }else if(!label.includes('glass')&&!label.includes('oven')&&sum>2.65){
          mat.color.set(mat.map?0xf1e7df:(label.includes('front')||label.includes('door')||label.includes('facade')?0xe6d4c5:0xeee4dc));
          if('metalness' in mat)mat.metalness=0;if('roughness' in mat)mat.roughness=.58;
        }else if(!label.includes('glass')&&!label.includes('oven')&&sum<.16){
          mat.color.set(0xd7c3b4);if('metalness' in mat)mat.metalness=0;if('roughness' in mat)mat.roughness=.62;
        }
      }
      mat.needsUpdate=true;
    }
  }

  let loaded=0,placeholders=0;
  await Promise.all(ITEMS.map(async item=>{
    const asset=assetFor(item.moduleKey);
    if(!asset){placeholder(item);placeholders++;return;}
    try{
      const gltf=await loader.loadAsync(asset.glbUrl);
      const model=gltf.scene;
      model.traverse(obj=>{if(obj.isMesh){
        obj.castShadow=true;obj.receiveShadow=true;tuneMaterial(obj.material,obj.name);
        if(obj.geometry){
          const outline=new THREE.LineSegments(new THREE.EdgesGeometry(obj.geometry,28),new THREE.LineBasicMaterial({color:0x6b5547,transparent:true,opacity:.22,depthWrite:false}));
          outline.renderOrder=3;obj.add(outline);
        }
      }});
      const box0=new THREE.Box3().setFromObject(model);
      const size0=box0.getSize(new THREE.Vector3());
      const target=new THREE.Vector3(item.widthMm/1000,item.heightMm/1000,item.depthMm/1000);
      model.scale.set(target.x/Math.max(size0.x,.001),target.y/Math.max(size0.y,.001),target.z/Math.max(size0.z,.001));
      model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model);
      const center=box.getCenter(new THREE.Vector3());
      const targetCenter=new THREE.Vector3((item.xMm+item.widthMm/2)/1000,(item.bottomMm+item.heightMm/2)/1000,-item.depthMm/2000);
      model.position.add(targetCenter.sub(center));
      root.add(model);loaded++;
    }catch{placeholder(item);placeholders++;}
  }));

  statusEl.textContent=loaded+' '+LABELS.ready+' · '+placeholders+' '+LABELS.fallback;
  const contentBox=()=>new THREE.Box3().setFromObject(root);
  function resize(){
    const w=Math.max(1,app.clientWidth),h=Math.max(1,app.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function fit(front=false){
    const box=contentBox();
    if(box.isEmpty()){box.min.set(0,0,-.6);box.max.set(maxX,maxH,0);}
    const size=box.getSize(new THREE.Vector3());
    const center=box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    const fovY=THREE.MathUtils.degToRad(camera.fov);
    const fovX=2*Math.atan(Math.tan(fovY/2)*Math.max(camera.aspect,.1));
    const distY=size.y/(2*Math.tan(fovY/2));
    const distX=size.x/(2*Math.tan(Math.max(fovX,.05)/2));
    const distance=Math.max(1.5,distX,distY)*1.24;
    if(front)camera.position.set(center.x,center.y,center.z+distance);
    else camera.position.set(center.x+distance*.36,center.y+distance*.18,center.z+distance);
    camera.near=Math.max(.01,distance/120);camera.far=Math.max(120,distance*24);camera.updateProjectionMatrix();controls.update();
  }
  document.getElementById('fit').onclick=()=>fit(false);
  document.getElementById('front').onclick=()=>fit(true);
  resize();
  fit(false);
  const observer=new ResizeObserver(()=>{resize();});
  observer.observe(app);
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
}catch(error){
  console.error(error);errorEl.style.display='grid';errorEl.textContent=LABELS.engineError;statusEl.style.display='none';
}
</script>
</body>
</html>`;
  }, [items, assets, t, compact]);

  return <iframe title="Makster Quote 3D Preview" srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" style={{display:'block',width:'100%',height:'100%',minHeight:compact?132:440,border:0,borderRadius:compact?10:12,background:'#eee7e0',alignSelf:'stretch',flex:'1 1 auto'}} />;
}
