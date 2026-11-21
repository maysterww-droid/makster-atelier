const state={projects:[],project:null,scene:null,previewScene:null,engineering:null,view:'front',tab:'design',selectedFurniture:0,selectedModule:0,selectedCadPanel:null,selectedRoomFeature:null,snapGuide:null,hitAreas:[],drag:null,undoStack:[],redoStack:[],commercialEstimate:null,commercialQuote:null,productionPack:null,business:{quotes:[],contract:null,commercialGate:null,changeOrders:[],changeOrder:null,approvalToken:null,lastRequote:null},studio:{result:null,view:'plan',selectedId:null,room:{widthMm:4200,depthMm:3200,heightMm:null,minAisleMm:900,selectedWall:'south',features:[],utilities:[],selectedFeatureId:null}},catalog:{mode:'hardware',items:[],selected:null,result:null,auto:null,projectReport:null,importResult:null,reviewQueue:null},hardwareStudio:{items:[],manufacturers:[],selected:null,role:'all',manufacturer:'all',query:'',frontThicknessMm:null,nominalLengthMm:null,loadKg:null,requireProductionDrilling:false,auto:null,projectReport:null},applianceStudio:{items:[],manufacturers:[],selected:null,kind:'all',manufacturer:'all',query:'',nicheWidthMm:null,nicheHeightMm:null,nicheDepthMm:null,ventilationAreaCm2:null,priceTier:'all',procurementMode:'customer_supplied',auto:null,projectReport:null},autoComplete:{report:null},measurementCompleteness:null,installationCheck:null,conflictResolution:null,installerMode:null,installationCloseout:null,jobControl:null,purchasing:null,costing:null,clientPortal:null,clientShareLinks:null,lastClientSharePath:null,lifecycleGate:null,ownerCommand:null,ownerOps:null,ownerAllocation:null,paymentCalendar:null,ownerCapacity:null,capacityLearning:null,cashGap:null,replenishment:null,predictiveControl:null,scenarioPlanner:null,decisionPlans:null,operationsTower:null,procurementAutomation:null,ownerFinance:null,ownerFinanceTrend:null,businessOS:null,aiOffice:null,contentStudio:null,systemReadiness:null,observability:null,financeMonth:new Date().toISOString().slice(0,7),productionReadiness:null};
const $=id=>document.getElementById(id);
async function api(path,options={}){const r=await fetch(path,{headers:{'content-type':'application/json',...(options.headers||{})},...options});const text=await r.text();let body={};try{body=text?JSON.parse(text):{}}catch{body={raw:text}}if(!r.ok)throw new Error(body.error||`HTTP ${r.status}`);return body}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(minor,currency='EUR')=>new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format(Number(minor||0)/100);
function msg(text,type='ai'){const el=document.createElement('div');el.className=`message ${type}`;el.textContent=text;$('messages').appendChild(el);$('messages').scrollTop=$('messages').scrollHeight}
function contentLabel(kind,count){const m={open:'Открыто',shelves:'Полки',drawers:'Ящики',short_clothes:'Короткая одежда',long_clothes:'Длинная одежда',mixed:'Полки + штанга'};return `${m[kind]||kind}${['shelves','drawers'].includes(kind)?` × ${count}`:''}`}

const activeScene=()=>state.previewScene||state.scene;
const snapMm=(value,step=10)=>Math.round(value/step)*step;
const selectedFurniture=(scene=activeScene())=>scene?.furniture?.[state.selectedFurniture]||scene?.furniture?.[0]||null;
function clampSelection(){const count=state.scene?.furniture?.length||0;state.selectedFurniture=count?Math.max(0,Math.min(state.selectedFurniture,count-1)):0;const modules=state.scene?.furniture?.[state.selectedFurniture]?.modules?.length||0;state.selectedModule=modules?Math.max(0,Math.min(state.selectedModule,modules-1)):0}
function historyKey(){return state.project?`makster.visual-history.${state.project.id}`:null}
function persistHistory(){const key=historyKey();if(!key||!state.project?.snapshot)return;localStorage.setItem(key,JSON.stringify({currentRevision:state.project.snapshot.revision,undo:state.undoStack,redo:state.redoStack}))}
function loadHistory(){state.undoStack=[];state.redoStack=[];const key=historyKey(),rev=state.project?.snapshot?.revision;if(!key||!rev)return;try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.currentRevision===rev&&Array.isArray(saved.undo)&&Array.isArray(saved.redo)){state.undoStack=saved.undo.filter(Number.isInteger);state.redoStack=saved.redo.filter(Number.isInteger);return}}catch{}state.undoStack=Array.from({length:Math.max(0,rev-1)},(_,i)=>i+1);state.redoStack=[];persistHistory()}
function pushUndoRevision(revision){if(Number.isInteger(revision)){state.undoStack.push(revision);state.redoStack=[];persistHistory()}}
function updateHistoryButtons(){const u=$('undoVisual'),r=$('redoVisual');if(u)u.disabled=!state.project||!state.undoStack.length;if(r)r.disabled=!state.project||!state.redoStack.length}
function recomputeModuleX(f){let x=0;for(const m of f.modules){m.xMm=x;x+=m.widthMm};f.moduleDimensionChainMm=f.modules.map(m=>m.widthMm)}
function recomputeCadPanels(f){const t=f.carcassThicknessMm||18,H=f.heightMm,W=f.widthMm,panels=[];if(!W||!H||!t){f.cadPanels=[];return}panels.push({id:`${f.id}:side-left`,kind:'side_left',xMm:0,zMm:0,widthMm:t,heightMm:H,thicknessMm:t,editableBy:'resize'},{id:`${f.id}:side-right`,kind:'side_right',xMm:Math.max(0,W-t),zMm:0,widthMm:t,heightMm:H,thicknessMm:t,editableBy:'resize'},{id:`${f.id}:top`,kind:'top',xMm:0,zMm:Math.max(0,H-t),widthMm:W,heightMm:t,thicknessMm:t,editableBy:'resize'},{id:`${f.id}:bottom`,kind:'bottom',xMm:0,zMm:0,widthMm:W,heightMm:t,thicknessMm:t,editableBy:'resize'});for(let i=0;i<f.modules.length-1;i++){const m=f.modules[i],boundary=m.xMm+m.widthMm;panels.push({id:`${f.id}:divider:${m.id}`,kind:'divider',moduleIndex:i,xMm:Math.max(0,boundary-t/2),zMm:0,widthMm:t,heightMm:H,thicknessMm:t,editableBy:'divider'})}f.cadPanels=panels}
function shelfElevations(m,heightMm){if(Array.isArray(m.shelfElevationsMm)&&m.shelfElevationsMm.length===m.contentCount)return [...m.shelfElevationsMm];const count=Math.max(1,m.contentCount);return Array.from({length:count},(_,i)=>heightMm*(i+1)/(count+1))}
function footprint(f){const rotated=Math.abs(f.rotationZDeg%180)===90;return{w:rotated?f.depthMm:f.widthMm,d:rotated?f.widthMm:f.depthMm}}
function clampFurniturePosition(f,room,x,y){const fp=footprint(f);return{x:Math.max(0,Math.min(Math.max(0,room.widthMm-fp.w),x)),y:Math.max(0,Math.min(Math.max(0,room.depthMm-fp.d),y))}}
function updatePreviewClearances(f,room){const fp=footprint(f);f.clearancesMm={left:Math.max(0,f.xMm),right:Math.max(0,room.widthMm-f.xMm-fp.w),back:Math.max(0,f.yMm),front:Math.max(0,room.depthMm-f.yMm-fp.d)}}
function nearestSnap(value,candidates,threshold=35){let best=value,label=null,d=threshold+1;for(const c of candidates){const dist=Math.abs(value-c.value);if(dist<d&&dist<=threshold){best=c.value;label=c.label;d=dist}}return{value:best,label}}
function snapPlanPosition(index,room,x,y){const base=state.scene?.furniture?.[index];if(!base)return{x,y};const fp=footprint(base),xs=[{value:0,label:'левая стена'},{value:room.widthMm-fp.w,label:'правая стена'}],ys=[{value:0,label:'задняя стена'},{value:room.depthMm-fp.d,label:'передняя стена'}];for(const other of state.scene?.furniture||[]){if(other.index===index)continue;const ofp=footprint(other);xs.push({value:other.xMm+ofp.w,label:`после ${other.index+1}`},{value:other.xMm-fp.w,label:`перед ${other.index+1}`});ys.push({value:other.yMm+ofp.d,label:`перед ${other.index+1}`},{value:other.yMm-fp.d,label:`за ${other.index+1}`})}const sx=nearestSnap(x,xs),sy=nearestSnap(y,ys);const clamped=clampFurniturePosition(base,room,sx.value,sy.value);state.snapGuide={...(sx.label?{xMm:clamped.x,labelX:sx.label}:{}),...(sy.label?{yMm:clamped.y,labelY:sy.label}:{})};return clamped}
function cloneScene(){return state.scene?structuredClone(state.scene):null}

function previewDivider(d,p){if(!state.scene||lastGeom?.type!=='front')return null;const deltaRaw=(p.x-d.startX)/lastGeom.scale,base=state.scene.furniture?.[d.furnitureIndex];if(!base)return null;const left=base.modules[d.index],right=base.modules[d.index+1];if(!left||!right)return null;const minDelta=100-left.widthMm,maxDelta=right.widthMm-100,delta=Math.max(minDelta,Math.min(maxDelta,snapMm(deltaRaw,10)));const scene=cloneScene(),f=scene.furniture[d.furnitureIndex],l=f.modules[d.index],r=f.modules[d.index+1];l.widthMm=left.widthMm+delta;r.widthMm=right.widthMm-delta;recomputeModuleX(f);recomputeCadPanels(f);state.previewScene=scene;return delta}
function previewFurnitureMove(d,p){if(!state.scene||lastGeom?.type!=='plan')return null;const scene=cloneScene(),f=scene.furniture[d.index],room=scene.room;if(!f||!room)return null;const dx=(p.x-d.startX)/lastGeom.scale,dy=(p.y-d.startY)/lastGeom.scale,pos=snapPlanPosition(d.index,room,snapMm(d.startFx+dx,10),snapMm(d.startFy+dy,10));f.xMm=pos.x;f.yMm=pos.y;updatePreviewClearances(f,room);state.previewScene=scene;return pos}
function resizeAxisLimit(base,room){if(!room)return 12000;return Math.abs(base.rotationZDeg%180)===90?room.depthMm:room.widthMm}
function previewEdgeResize(d,p){if(!state.scene||lastGeom?.type!=='front')return null;const scene=cloneScene(),base=state.scene.furniture[d.index],f=scene.furniture[d.index],room=scene.room;if(!base||!f)return null;const horizontal=(p.x-d.startX)/d.startScale,vertical=-(p.y-d.startY)/d.startScale;let delta=snapMm(['left','right'].includes(d.edge)?horizontal:vertical,10);const moduleMin=Math.max(200,...base.modules.map(m=>100*base.widthMm/Math.max(1,m.widthMm))),moduleMax=Math.min(12000,...base.modules.map(m=>4000*base.widthMm/Math.max(1,m.widthMm)));
if(d.edge==='right'){const axisLimit=resizeAxisLimit(base,room),axisPos=Math.abs(base.rotationZDeg%180)===90?base.yMm:base.xMm;delta=Math.max(moduleMin-base.widthMm,Math.min(Math.min(moduleMax,axisLimit-axisPos)-base.widthMm,delta));f.widthMm=base.widthMm+delta}
if(d.edge==='left'){const axisPos=Math.abs(base.rotationZDeg%180)===90?base.yMm:base.xMm;delta=Math.max(Math.max(base.widthMm-moduleMax,-axisPos),Math.min(base.widthMm-moduleMin,delta));f.widthMm=base.widthMm-delta;if(Math.abs(base.rotationZDeg%180)===90)f.yMm=base.yMm+delta;else f.xMm=base.xMm+delta}
if(d.edge==='top'){const maxGrow=room?room.heightMm-(base.zMm+base.heightMm):6000;delta=Math.max(200-base.heightMm,Math.min(maxGrow,delta));f.heightMm=base.heightMm+delta}
if(d.edge==='bottom'){delta=Math.max(-base.zMm,Math.min(base.heightMm-200,delta));f.heightMm=base.heightMm-delta;f.zMm=base.zMm+delta}
if(['left','right'].includes(d.edge)){const ratio=f.widthMm/Math.max(1,base.widthMm);f.modules.forEach((m,i)=>m.widthMm=base.modules[i].widthMm*ratio);if(f.modules.length){const total=f.modules.reduce((a,m)=>a+m.widthMm,0);f.modules[f.modules.length-1].widthMm+=f.widthMm-total}recomputeModuleX(f);recomputeCadPanels(f)}if(room)updatePreviewClearances(f,room);state.previewScene=scene;return delta}
function previewShelfMove(d,p){if(!state.scene||lastGeom?.type!=='front')return null;const scene=cloneScene(),f=scene.furniture[d.furnitureIndex],m=f?.modules[d.moduleIndex];if(!f||!m)return null;const elevations=shelfElevations(m,f.heightMm),deltaY=(p.y-d.startY)/lastGeom.scale;let next=snapMm(d.startElevation-deltaY,10),lo=d.shelfIndex>0?elevations[d.shelfIndex-1]+32:50,hi=d.shelfIndex<elevations.length-1?elevations[d.shelfIndex+1]-32:f.heightMm-50;next=Math.max(lo,Math.min(hi,next));elevations[d.shelfIndex]=next;m.shelfElevationsMm=elevations;state.previewScene=scene;return next}
function previewRoomFeatureMove(d,p){if(!state.scene||lastGeom?.type!=='plan')return null;const scene=cloneScene(),room=scene.room;if(!room)return null;const list=d.featureType==='opening'?room.openings:room.obstacles,feature=list?.[d.index];if(!feature)return null;const dx=(p.x-d.startX)/lastGeom.scale,dy=(p.y-d.startY)/lastGeom.scale;const x=Math.max(0,Math.min(room.widthMm-feature.widthMm,snapMm(d.startFx+dx,10))),y=Math.max(0,Math.min(room.depthMm-feature.depthMm,snapMm(d.startFy+dy,10)));feature.xMm=x;feature.yMm=y;state.previewScene=scene;return{x,y}}
function hitAt(p){const hits=state.hitAreas.filter(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h),priority={divider:8,'furniture-resize-left':8,'furniture-resize-right':8,'furniture-resize-top':8,'furniture-resize-bottom':8,shelf:7,'room-opening':6,'room-obstacle':6,'furniture-plan':5,'cad-panel':4,module:2};return hits.sort((a,b)=>(priority[b.kind]||0)-(priority[a.kind]||0)).at(0)}

async function restoreVisualRevision(targetRevision,mode){if(!state.project)return false;const before=state.project.snapshot.revision;try{const r=await api(`/api/v1/projects/${state.project.id}/visual-restore`,{method:'POST',body:JSON.stringify({expectedRevision:before,targetRevision})});state.project=r.project;state.scene=r.visualScene;state.previewScene=null;state.snapGuide=null;state.engineering=r.engineering;clampSelection();if(mode==='undo')state.redoStack.push(before);else state.undoStack.push(before);persistHistory();renderAll();await loadProjects();msg(`${mode==='undo'?'Undo':'Redo'} → восстановлена Revision ${targetRevision}; новая immutable Revision ${state.project.snapshot.revision}.`,'meta');return true}catch(e){msg(`Visual History: ${e.message}`,'ai');return false}}
async function undoVisual(){if(!state.undoStack.length)return;const target=state.undoStack.pop(),ok=await restoreVisualRevision(target,'undo');if(!ok){state.undoStack.push(target);persistHistory();updateHistoryButtons()}}
async function redoVisual(){if(!state.redoStack.length)return;const target=state.redoStack.pop(),ok=await restoreVisualRevision(target,'redo');if(!ok){state.redoStack.push(target);persistHistory();updateHistoryButtons()}}

async function loadProjects(){try{state.projects=await api('/api/v1/projects');renderProjects()}catch(e){console.warn(e)}}
function renderProjects(){const host=$('projectList');if(!state.projects.length){host.innerHTML='<div class="project-empty">Проектов пока нет.<br>Создайте первый.</div>';return}host.innerHTML=state.projects.map(p=>`<div class="project-card ${state.project?.id===p.id?'active':''}" data-project="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.projectType)} · Rev ${p.snapshot?.revision??'—'}</small></div>`).join('');host.querySelectorAll('[data-project]').forEach(el=>el.addEventListener('click',()=>openProject(el.dataset.project)))}
async function openProject(id){state.project=await api(`/api/v1/projects/${id}`);state.selectedFurniture=0;state.selectedModule=0;state.selectedCadPanel=null;state.selectedRoomFeature=null;state.snapGuide=null;state.previewScene=null;state.business={quotes:[],contract:null,commercialGate:null,changeOrders:[],changeOrder:null,approvalToken:null,lastRequote:null};await refreshScene();loadHistory();renderAll();renderProjects();msg(`Открыт проект «${state.project.snapshot?.title||state.project.name}», Revision ${state.project.snapshot?.revision}.`,'meta')}
async function createProject(){const name=prompt('Название проекта','Новый проект')||'Новый проект';state.project=await api('/api/v1/projects',{method:'POST',body:JSON.stringify({name,projectType:'mixed'})});state.scene=await api(`/api/v1/projects/${state.project.id}/visual-scene`);state.previewScene=null;state.engineering=null;state.selectedFurniture=0;state.selectedModule=0;state.selectedCadPanel=null;state.selectedRoomFeature=null;state.snapGuide=null;state.undoStack=[];state.redoStack=[];state.business={quotes:[],contract:null,commercialGate:null,changeOrders:[],changeOrder:null,approvalToken:null,lastRequote:null};persistHistory();await loadProjects();renderAll();msg('Проект создан. Сначала задайте комнату справа или сразу опишите мебель AI.','ai')}
async function refreshScene(){if(!state.project)return;state.project=await api(`/api/v1/projects/${state.project.id}`);state.scene=await api(`/api/v1/projects/${state.project.id}/visual-scene`);clampSelection();if(state.project.snapshot?.furniture?.length){try{state.engineering=await api(`/api/v1/projects/${state.project.id}/engineering`)}catch{state.engineering=null}}else state.engineering=null}
async function visualCommand(command){if(!state.project)return false;const before=state.project.snapshot.revision;try{const r=await api(`/api/v1/projects/${state.project.id}/visual-command`,{method:'POST',body:JSON.stringify({expectedRevision:before,command})});state.project=r.project;state.scene=r.visualScene;state.previewScene=null;state.snapGuide=null;state.engineering=r.engineering;if(command.type==='duplicate_furniture'){state.selectedFurniture=Math.max(0,(state.scene?.furniture?.length||1)-1);state.selectedModule=0}else if(command.type==='remove_furniture'){state.selectedFurniture=Math.max(0,Math.min(state.selectedFurniture,(state.scene?.furniture?.length||1)-1));state.selectedModule=0}clampSelection();pushUndoRevision(before);renderAll();await loadProjects();msg(`${command.type} → Revision ${state.project.snapshot.revision}`,'meta');return true}catch(e){state.previewScene=null;renderDesign();msg(`Visual Editor: ${e.message}`,'ai');return false}}
async function sendPrompt(){const text=$('prompt').value.trim();if(!text)return;if(!state.project)await createProject();msg(text,'user');$('prompt').value='';$('send').disabled=true;try{const intake=await api('/api/v1/ai/intake',{method:'POST',body:JSON.stringify({projectId:state.project.id,text})});$('confidence').textContent=`${Math.round(intake.intent.confidence*100)}%`;$('missing').textContent=String(intake.intent.missingInformation.length);msg(`${intake.intent.summary}${intake.intent.missingInformation.length?'\nНужно уточнить: '+intake.intent.missingInformation.join(' '):''}`,'ai');if(intake.changeSet.patches.length){const before=state.project.snapshot.revision;state.project=await api(`/api/v1/projects/${state.project.id}/apply-change`,{method:'POST',body:JSON.stringify({expectedRevision:before,changeSet:intake.changeSet})});await refreshScene();pushUndoRevision(before);renderAll();await loadProjects();msg(`AI Design применён → Revision ${state.project.snapshot.revision}.`,'meta')}}catch(e){msg(`Ошибка AI: ${e.message}`,'ai')}finally{$('send').disabled=false}}

function renderAll(){renderHeader();renderProjects();renderInspector();renderTab();updateHistoryButtons()}
function renderHeader(){const p=state.project?.snapshot;$('projectTitle').textContent=p?.title||'Нет проекта';$('revisionPill').textContent=p?`Revision ${p.revision}`:'Revision —';const w=state.scene?.warnings?.length||0;$('visualWarnings').textContent=String(w);const eng=state.engineering;if(!eng){$('engineeringBadge').className='pill neutral';$('engineeringBadge').textContent='Engineering —'}else{$('engineeringBadge').className=`pill ${eng.readyForProduction?'':'bad'}`;$('engineeringBadge').textContent=eng.readyForProduction?'Production READY':`${eng.checks.blocking} blockers`}const view=state.view==='front'?'Front elevation':state.view==='plan'?'Room plan':'Axonometric 3D',f=selectedFurniture(state.scene);$('stageStatus').textContent=view+(f?` · ${f.name}`:'')+(state.previewScene?' · PREVIEW':'')}
function field(label,id,value,type='number',step='1'){return `<div class="input-field"><label>${label}</label><input id="${id}" type="${type}" ${type==='number'?`step="${step}"`:''} value="${esc(value)}"></div>`}
function featureRow(type,x){return `<div class="module-mini"><span class="module-index">${type==='opening'?'O':'!'}</span><div><strong>${esc(x.kind)}</strong><br><small>X ${Math.round(x.xMm)} · Y ${Math.round(x.yMm)} · ${Math.round(x.widthMm)}×${Math.round(x.depthMm)}×${Math.round(x.heightMm)}</small></div><button class="icon-button danger" data-remove-feature="${type}:${x.index}" title="Удалить">×</button></div>`}
function renderInspector(){const host=$('inspector');if(!state.project){host.innerHTML='<div class="meta-note">Создайте или откройте проект.</div>';return}const room=state.scene?.room;const f=selectedFurniture(state.scene);const m=f?.modules?.[state.selectedModule];$('selectionLabel').textContent=m?`${f.name} · секция ${m.index+1}`:f?f.name:'Project';
let html=`<section class="inspector-section"><h3>Room</h3><div class="inspector-body">${room?`<div class="field-grid three">${field('Ширина, мм','roomW',room.widthMm)}${field('Глубина, мм','roomD',room.depthMm)}${field('Высота, мм','roomH',room.heightMm)}</div><div class="button-row"><button id="applyRoom" class="secondary">Применить</button></div><div class="button-row"><button id="addDoor" class="secondary">＋ Дверь</button><button id="addWindow" class="secondary">＋ Окно</button><button id="addColumn" class="secondary">＋ Колонна</button></div><p class="meta-note">Двери, окна и препятствия можно тянуть мышью в PLAN. Они хранятся в Room ProjectModel и участвуют в Revision history.</p>${[...(room.openings||[]).map(x=>featureRow('opening',x)),...(room.obstacles||[]).map(x=>featureRow('obstacle',x))].join('')}`:`<div class="meta-note">Помещение ещё не создано.</div><div class="field-grid three" style="margin-top:8px">${field('Ширина','roomW',4200)}${field('Глубина','roomD',3600)}${field('Высота','roomH',2650)}</div><div class="button-row"><button id="createRoom">Создать комнату</button></div>`}</div></section>`;
if(state.scene?.furniture?.length){html+=`<section class="inspector-section"><h3>Furniture objects</h3><div class="inspector-body"><div class="module-mini-list">${state.scene.furniture.map(x=>`<div class="module-mini ${x.index===state.selectedFurniture?'active':''}" data-furniture="${x.index}"><span class="module-index">${x.index+1}</span><div><strong>${esc(x.name)}</strong><br><small>${esc(x.kind)} · ${Math.round(x.widthMm)}×${Math.round(x.heightMm)}×${Math.round(x.depthMm)}${x.layoutKind?` · L-${esc(x.layoutRole||'')}`:''}</small></div><strong>${x.rotationZDeg}°</strong></div>`).join('')}</div><div class="button-row"><button id="duplicateFurniture" class="secondary">Дублировать</button><button id="cornerCopy" class="secondary">L-угол 90°</button>${state.scene.furniture.length>1?'<button id="removeFurniture" class="danger">Удалить</button>':''}</div></div></section>`}
if(f){html+=`<section class="inspector-section"><h3>Selected furniture</h3><div class="inspector-body"><div class="field-grid three">${field('Ширина, мм','fW',f.widthMm)}${field('Высота, мм','fH',f.heightMm)}${field('Глубина, мм','fD',f.depthMm)}</div><div class="button-row"><button id="applyFurniture">Применить размеры</button><button id="equalize" class="secondary">Уравнять секции</button></div><div class="field-grid three" style="margin-top:9px">${field('X, мм','fX',f.xMm)}${field('Y, мм','fY',f.yMm)}<div class="input-field"><label>Поворот</label><select id="fRot">${[0,90,180,270].map(v=>`<option ${v===f.rotationZDeg?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="button-row"><button id="applyPosition" class="secondary">Положение</button></div><div class="field-grid" style="margin-top:9px">${field('Корпус, мм','carcassT',f.carcassThicknessMm||18)}<div class="input-field"><label>Стена</label><select id="clearanceWall"><option value="left">Левая</option><option value="right">Правая</option><option value="back">Задняя</option><option value="front">Передняя</option></select></div>${field('Зазор, мм','clearanceMm',0)}</div><div class="button-row"><button id="applyCarcass" class="secondary">Толщина корпуса</button><button id="applyClearance" class="secondary">Задать зазор</button></div>${state.scene.furniture.length>1?`<div class="field-grid" style="margin-top:9px"><div class="input-field"><label>Выровнять относительно</label><select id="alignTarget">${state.scene.furniture.filter(x=>x.index!==f.index).map(x=>`<option value="${x.index}">${x.index+1}. ${esc(x.name)}</option>`).join('')}</select></div><div class="input-field"><label>Сторона</label><select id="alignSide"><option value="right">Справа</option><option value="left">Слева</option><option value="front">Спереди</option><option value="back">Сзади</option></select></div>${field('Между, мм','alignGap',0)}</div><div class="button-row"><button id="applyAlign" class="secondary">Выровнять CAD</button></div>`:''}<p class="meta-note">FRONT: края корпуса и перегородки редактируют ProjectModel. PLAN: drag использует сетку 10 мм и магнитное snapping к стенам/соседней мебели. Каждое завершённое действие = одна Revision.</p></div></section>`;
html+=`<section class="inspector-section"><h3>CAD panels</h3><div class="inspector-body"><div class="module-mini-list">${(f.cadPanels||[]).map((panel,i)=>`<div class="module-mini ${panel.id===state.selectedCadPanel?'active':''}" data-cad-panel="${esc(panel.id)}"><span class="module-index">${i+1}</span><div><strong>${esc(panel.kind)}</strong><br><small>${Math.round(panel.widthMm)}×${Math.round(panel.heightMm)} · t ${panel.thicknessMm} мм · ${panel.editableBy}</small></div></div>`).join('')}</div><p class="meta-note">Это производная CAD-проекция. Она не сохраняется отдельно: боковины/верх/низ происходят из габарита и толщины корпуса, перегородки — из ширин секций.</p></div></section>`;
html+=`<section class="inspector-section"><h3>Sections</h3><div class="inspector-body"><div class="module-mini-list">${f.modules.map(x=>`<div class="module-mini ${x.index===state.selectedModule?'active':''}" data-module="${x.index}"><span class="module-index">${x.index+1}</span><div><strong>${esc(x.name)}</strong><br><small>${contentLabel(x.contentKind,x.contentCount)}</small></div><strong>${Math.round(x.widthMm)} мм</strong></div>`).join('')}</div><div class="meta-note" style="margin-top:8px">Цепочка: ${(f.moduleDimensionChainMm||f.modules.map(x=>x.widthMm)).map(x=>Math.round(x)).join(' + ')} = ${Math.round(f.widthMm)} мм</div><div class="button-row"><button id="addModule" class="secondary">＋ Секция</button><button id="setFronts" class="secondary">Распашные фасады</button></div></div></section>`;

const rawF=state.project?.snapshot?.furniture?.[f.index]; const rawM=rawF?.modules?.[state.selectedModule]; const ks=rawM?.kitchen; const moduleFront=rawF?.fronts?.find(x=>x.moduleIds?.includes(rawM?.id)); const moduleFrontMode=!moduleFront?'none':moduleFront.count===2?'double':moduleFront.hingeSides?.[0]==='right'?'single_right':'single_left';
const mats=state.project?.snapshot?.selections?.materials||[]; const hw=state.project?.snapshot?.selections?.hardware||[];
const runners=hw.filter(x=>x.role==='runner'); const legs=hw.filter(x=>x.role==='leg'); const hangers=hw.filter(x=>x.role==='other'||x.role==='connector');
html+=`<section class="inspector-section"><h3>Kitchen Pro 2.6.1</h3><div class="inspector-body">
<div class="field-grid"><div class="input-field"><label>Секции, мм</label><input id="kWidths" value="${esc((f.moduleDimensionChainMm||f.modules.map(x=>x.widthMm)).map(x=>Math.round(x)).join('+'))}"></div><div class="input-field"><label>Тип ряда</label><select id="kRunType">${['base','wall','tall'].map(x=>`<option value="${x}" ${ks?.type===x?'selected':''}>${x}</option>`).join('')}</select></div>${field('H секции, мм','kRunH',ks?.type==='wall'?900:ks?.type==='tall'?f.heightMm:720)}${field('D секции, мм','kRunD',ks?.type==='wall'?330:f.depthMm)}</div>
<div class="field-grid"><div class="input-field"><label>Открывание</label><select id="kRunOpening">${['gola','profile','push_to_open','handle','none'].map(x=>`<option value="${x}" ${ks?.opening===x?'selected':''}>${x}</option>`).join('')}</select></div></div>
<div class="button-row"><button id="configureKitchen">${f.kind==='kitchen'?'Перестроить кухонный ряд':'Сделать Kitchen Run'}</button></div>
<p class="meta-note">Секции становятся частью ProjectModel и пересчитываются Engineering. Это не отдельный калькулятор Pro.</p>
${f.kind==='kitchen'&&rawM?`<hr><strong>Module ${state.selectedModule+1} · ${esc(rawM.name||'')}</strong>
<div class="field-grid three"><div class="input-field"><label>Тип</label><select id="kType">${['base','wall','tall'].map(x=>`<option value="${x}" ${ks?.type===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="input-field"><label>Функция</label><select id="kFunction">${['storage','drawers','sink','hob','oven','dishwasher','fridge','hood','microwave','pantry','open'].map(x=>`<option value="${x}" ${ks?.function===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="input-field"><label>Открывание</label><select id="kOpening">${['gola','profile','push_to_open','handle','none'].map(x=>`<option value="${x}" ${ks?.opening===x?'selected':''}>${x}</option>`).join('')}</select></div>${field('H, мм','kH',m.kitchen?.heightMm||m.heightMm||720)}${field('D, мм','kD',m.kitchen?.depthMm||m.depthMm||560)}</div>
<div class="check-grid"><label><input id="kTop" type="checkbox" ${ks?.hasTop!==false?'checked':''}> Верх корпуса</label><label><input id="kBottom" type="checkbox" ${ks?.hasBottom!==false?'checked':''}> Низ корпуса</label><label><input id="kBack" type="checkbox" ${ks?.hasBack!==false?'checked':''}> Задняя стенка</label><label><input id="kWorktop" type="checkbox" ${ks?.worktop?.enabled?'checked':''}> Столешница</label><label><input id="kPlinth" type="checkbox" ${ks?.plinth?.enabled?'checked':''}> Цоколь/ножки</label></div>
<div class="field-grid"><div class="input-field"><label>Задняя стенка</label><select id="kBackMode">${['overlay','groove','recessed','none'].map(x=>`<option value="${x}" ${ks?.backPanelMode===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="input-field"><label>Навес</label><select id="kHanger"><option value="">—</option>${selectOpts(hangers,ks?.wallHangerHardwareSelectionId,x=>`${x.manufacturer||''} · ${x.name||''}`)}</select></div>${field('Навесов','kHangerCount',ks?.wallHangerCount??2)}</div>
<div class="button-row"><button id="applyKitchenModule">Применить модуль</button></div>
<hr><strong>Материалы и фурнитура</strong><div class="field-grid"><div class="input-field"><label>Корпус</label><select id="kCarcassMat">${selectOpts(mats,rawF?.construction?.defaultCarcassMaterialSelectionId,x=>`${x.name} · ${x.role}`)}</select></div><div class="input-field"><label>Фасад</label><select id="kFrontMat"><option value="">—</option>${selectOpts(mats,rawF?.construction?.defaultFrontMaterialSelectionId,x=>`${x.name} · ${x.role}`)}</select></div><div class="input-field"><label>HDF / back</label><select id="kBackMat"><option value="">—</option>${selectOpts(mats,rawF?.construction?.backPanel?.materialSelectionId,x=>`${x.name} · ${x.role}`)}</select></div><div class="input-field"><label>Кромка</label><select id="kEdgeMat"><option value="">—</option>${selectOpts(mats,rawF?.construction?.defaultEdgeMaterialSelectionId,x=>`${x.name} · ${x.role}`)}</select></div><div class="input-field"><label>Столешница</label><select id="kWorktopMat"><option value="">—</option>${selectOpts(mats,ks?.worktop?.materialSelectionId,x=>`${x.name} · ${x.role}`)}</select></div><div class="input-field"><label>Ножки</label><select id="kLegHw"><option value="">—</option>${selectOpts(legs,ks?.plinth?.legHardwareSelectionId,x=>`${x.manufacturer||''} ${x.name}`)}</select></div></div><div class="button-row"><button id="applyKitchenMaterials" class="secondary">Назначить материалы</button></div>
<hr><strong>Фасад секции</strong><div class="field-grid"><div class="input-field"><label>Фасады</label><select id="kFrontMode">${['none','single_left','single_right','double'].map(x=>`<option value="${x}" ${moduleFrontMode===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="input-field"><label>Материал фасада</label><select id="kModuleFrontMat"><option value="">default</option>${selectOpts(mats.filter(x=>x.role==='front'),moduleFront?.materialSelectionId,x=>x.name)}</select></div><div class="input-field"><label>Открывание</label><select id="kFrontOpening">${['gola','profile','push_to_open','handle','none'].map(x=>`<option value="${x}" ${moduleFront?.handle?.mode===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="button-row"><button id="applyKitchenFront" class="secondary">Применить фасад</button></div>
<hr><strong>Drawer System</strong><div class="field-grid"><div class="input-field"><label>Runner / SKU</label><select id="kRunner"><option value="">— выберите —</option>${selectOpts(runners,rawM?.contents?.find(x=>x.kind==='drawer_stack')?.runnerHardwareSelectionId,x=>`${x.manufacturer||''} · ${x.code||''} · ${x.name}`)}</select></div>${field('Ящиков','kDrawerCount',rawM?.contents?.find(x=>x.kind==='drawer_stack')?.count||3)}${field('Высота фасада, мм','kDrawerFrontH',180)}${field('Толщина бок/задн., мм','kDrawerSideT',16)}${field('Толщина дна, мм','kDrawerBottomT',16)}</div><div class="button-row"><button id="applyKitchenDrawers" class="secondary">Настроить ящики</button></div>
<hr><strong>Техника</strong><div class="field-grid"><div class="input-field"><label>Тип</label><select id="kApplianceKind">${['oven','dishwasher','fridge','hood','microwave','hob','other'].map(x=>`<option value="${x}" ${ks?.appliance?.kind===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="input-field"><label>Монтаж</label><select id="kApplianceInstall"><option value="cabinet">cabinet</option><option value="worktop">worktop</option><option value="wall">wall</option></select></div><div class="input-field"><label>Производитель</label><input id="kApplianceMaker" value="${esc(ks?.appliance?.manufacturer||'')}"></div><div class="input-field"><label>Модель</label><input id="kApplianceModel" value="${esc(ks?.appliance?.model||'')}"></div>${field('Ниша W, мм','kAppW',ks?.appliance?.requiredSpace?.width?.value?ks.appliance.requiredSpace.width.value/10:560)}${field('Ниша H, мм','kAppH',ks?.appliance?.requiredSpace?.height?.value?ks.appliance.requiredSpace.height.value/10:600)}${field('Ниша D, мм','kAppD',ks?.appliance?.requiredSpace?.depth?.value?ks.appliance.requiredSpace.depth.value/10:550)}</div><div class="check-grid"><label><input id="kApplianceAppend" type="checkbox"> Добавить вторым прибором (например hob к oven)</label></div><div class="button-row"><button id="applyKitchenAppliance" class="secondary">Назначить технику</button></div>
<hr><strong>Пристенный плинтус столешницы</strong><div class="field-grid">${field('Высота, мм','kTrimH',ks?.worktop?.wallTrim?.height?.value?ks.worktop.wallTrim.height.value/10:40)}${field('Толщина/глубина, мм','kTrimD',ks?.worktop?.wallTrim?.depth?.value?ks.worktop.wallTrim.depth.value/10:12)}</div><div class="button-row"><button id="applyKitchenTrim" class="secondary">Добавить пристенный плинтус</button></div>
<hr><strong>Вырез столешницы</strong><div class="field-grid"><div class="input-field"><label>Тип</label><select id="kCutKind"><option value="sink">sink</option><option value="hob">hob</option><option value="custom">custom</option></select></div>${field('W, мм','kCutW',500)}${field('D, мм','kCutD',400)}${field('X, мм','kCutX',50)}${field('Y, мм','kCutY',100)}<span class="meta-note">CNC verification — только через Manufacturing Trust</span></div><div class="button-row"><button id="applyKitchenCutout" class="secondary">Добавить/заменить вырез</button></div>`:''}
</div></section>`;
if(m){html+=`<section class="inspector-section"><h3>Selected section ${m.index+1}</h3><div class="inspector-body"><div class="field-grid">${field('Ширина, мм','mW',m.widthMm)}<div class="input-field"><label>Наполнение</label><select id="mKind">${['open','shelves','drawers','short_clothes','long_clothes','mixed'].map(k=>`<option value="${k}" ${k===m.contentKind?'selected':''}>${contentLabel(k,1).replace(' × 1','')}</option>`).join('')}</select></div>${field('Количество','mCount',m.contentCount)}</div><div class="button-row"><button id="applyModule">Применить</button><button id="removeModule" class="danger">Удалить секцию</button></div></div></section>`}
html+=`<section class="inspector-section"><h3>Style</h3><div class="inspector-body"><div class="field-grid"><div class="input-field"><label>Цвет / декор</label><input id="styleColor" value="${esc(f.colorNote||'')}"></div><div class="input-field"><label>Финиш</label><input id="styleFinish" value="${esc(f.finishNote||'')}"></div></div><div class="button-row"><button id="applyStyle" class="secondary">Сохранить стиль</button></div></div></section>`}
else html+=`<section class="inspector-section"><h3>AI Design</h3><div class="inspector-body"><p class="meta-note">Мебель ещё не создана. Опишите её слева: тип, габариты, количество секций и наполнение.</p></div></section>`;
host.innerHTML=html;attachInspectorHandlers()}
function num(id){return Number($(id)?.value||0)}
function parseWidths(id){return String($(id)?.value||'').replaceAll('×','+').replaceAll('x','+').split(/[+;,\s]+/).map(Number).filter(v=>Number.isFinite(v)&&v>0)}
function selectOpts(items,selected,label){return (items||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(label(x))}</option>`).join('')}
function defaultFeature(kind){const room=state.scene?.room;if(!room)return null;if(kind==='door')return{type:'add_room_opening',kind:'door',xMm:100,yMm:0,zMm:0,widthMm:Math.min(900,Math.max(300,room.widthMm-200)),depthMm:Math.min(100,room.depthMm),heightMm:Math.min(2100,room.heightMm),note:'Door'};if(kind==='window')return{type:'add_room_opening',kind:'window',xMm:Math.min(1200,Math.max(0,room.widthMm-1300)),yMm:0,zMm:Math.min(900,Math.max(0,room.heightMm-1300)),widthMm:Math.min(1200,room.widthMm),depthMm:Math.min(100,room.depthMm),heightMm:Math.min(1200,room.heightMm),note:'Window'};const size=Math.min(400,room.widthMm,room.depthMm);return{type:'add_room_obstacle',kind:'column',xMm:Math.min(1000,Math.max(0,room.widthMm-size)),yMm:Math.min(1000,Math.max(0,room.depthMm-size)),zMm:0,widthMm:size,depthMm:size,heightMm:room.heightMm,note:'Column'}}
function attachInspectorHandlers(){$('createRoom')?.addEventListener('click',()=>visualCommand({type:'create_rect_room',name:'Room 1',widthMm:num('roomW'),depthMm:num('roomD'),heightMm:num('roomH')}));$('applyRoom')?.addEventListener('click',()=>visualCommand({type:'set_room_dimensions',widthMm:num('roomW'),depthMm:num('roomD'),heightMm:num('roomH')}));$('addDoor')?.addEventListener('click',()=>{const c=defaultFeature('door');if(c)visualCommand(c)});$('addWindow')?.addEventListener('click',()=>{const c=defaultFeature('window');if(c)visualCommand(c)});$('addColumn')?.addEventListener('click',()=>{const c=defaultFeature('column');if(c)visualCommand(c)});document.querySelectorAll('[data-remove-feature]').forEach(b=>b.addEventListener('click',()=>{const[t,i]=b.dataset.removeFeature.split(':');visualCommand(t==='opening'?{type:'remove_room_opening',openingIndex:Number(i)}:{type:'remove_room_obstacle',obstacleIndex:Number(i)})}));
const fi=state.selectedFurniture;$('applyFurniture')?.addEventListener('click',()=>visualCommand({type:'set_furniture_dimensions',furnitureIndex:fi,widthMm:num('fW'),heightMm:num('fH'),depthMm:num('fD')}));$('equalize')?.addEventListener('click',()=>visualCommand({type:'equalize_modules',furnitureIndex:fi}));$('applyPosition')?.addEventListener('click',()=>visualCommand({type:'set_furniture_position',furnitureIndex:fi,xMm:num('fX'),yMm:num('fY'),rotationZDeg:Number($('fRot').value)}));$('applyCarcass')?.addEventListener('click',()=>visualCommand({type:'set_carcass_thickness',furnitureIndex:fi,thicknessMm:num('carcassT')}));$('applyClearance')?.addEventListener('click',()=>visualCommand({type:'set_furniture_wall_clearance',furnitureIndex:fi,wall:$('clearanceWall').value,clearanceMm:num('clearanceMm')}));$('applyAlign')?.addEventListener('click',()=>visualCommand({type:'align_furniture_to_furniture',furnitureIndex:fi,targetFurnitureIndex:Number($('alignTarget').value),side:$('alignSide').value,gapMm:num('alignGap')}));$('duplicateFurniture')?.addEventListener('click',()=>visualCommand({type:'duplicate_furniture',furnitureIndex:fi,offsetXMm:100,offsetYMm:100}));$('cornerCopy')?.addEventListener('click',()=>{const f=state.scene?.furniture?.[fi],room=state.scene?.room;if(!f||!room)return;const rightSpan=f.xMm+f.widthMm+f.depthMm<=room.widthMm+1,hand=rightSpan?'right':'left',returnWidth=Math.max(200,Math.min(f.widthMm,room.depthMm-f.yMm));visualCommand({type:'create_l_corner_layout',furnitureIndex:fi,hand,returnWidthMm:returnWidth,gapMm:0,name:`${f.name} · return`})});$('removeFurniture')?.addEventListener('click',()=>visualCommand({type:'remove_furniture',furnitureIndex:fi}));$('applyModule')?.addEventListener('click',async()=>{const m=state.scene?.furniture?.[fi]?.modules?.[state.selectedModule];if(!m)return;if(Math.abs(num('mW')-m.widthMm)>.05)await visualCommand({type:'set_module_width',furnitureIndex:fi,moduleIndex:state.selectedModule,widthMm:num('mW')});const current=state.scene?.furniture?.[fi]?.modules?.[state.selectedModule];if(current)await visualCommand({type:'set_module_content',furnitureIndex:fi,moduleIndex:state.selectedModule,kind:$('mKind').value,count:num('mCount')})});$('removeModule')?.addEventListener('click',()=>visualCommand({type:'remove_module',furnitureIndex:fi,moduleIndex:state.selectedModule}));$('addModule')?.addEventListener('click',()=>visualCommand({type:'add_module',furnitureIndex:fi,afterModuleIndex:state.selectedModule,widthMm:600,kind:'open'}));$('setFronts')?.addEventListener('click',()=>visualCommand({type:'set_hinged_fronts',furnitureIndex:fi,enabled:true}));
$('configureKitchen')?.addEventListener('click',()=>{const widths=parseWidths('kWidths');if(!widths.length)return msg('Kitchen: задайте ширины секций','ai');visualCommand({type:'configure_kitchen_run',furnitureIndex:fi,widthsMm:widths,moduleType:$('kRunType').value,heightMm:num('kRunH'),depthMm:num('kRunD'),opening:$('kRunOpening').value})});
$('applyKitchenModule')?.addEventListener('click',()=>visualCommand({type:'set_kitchen_module',furnitureIndex:fi,moduleIndex:state.selectedModule,moduleType:$('kType').value,function:$('kFunction').value,heightMm:num('kH'),depthMm:num('kD'),hasTop:$('kTop').checked,hasBottom:$('kBottom').checked,hasBack:$('kBack').checked,opening:$('kOpening').value,worktop:$('kWorktop').checked,plinth:$('kPlinth').checked,backPanelMode:$('kBackMode').value,...($('kHanger')?.value?{wallHangerHardwareSelectionId:$('kHanger').value}:{}),wallHangerCount:Math.round(num('kHangerCount'))}));
$('applyKitchenMaterials')?.addEventListener('click',()=>{const carcass=$('kCarcassMat')?.value;if(!carcass)return msg('Kitchen: выберите материал корпуса','ai');visualCommand({type:'set_kitchen_materials',furnitureIndex:fi,carcassMaterialSelectionId:carcass,...($('kFrontMat')?.value?{frontMaterialSelectionId:$('kFrontMat').value}:{}),...($('kBackMat')?.value?{backMaterialSelectionId:$('kBackMat').value}:{}),...($('kEdgeMat')?.value?{edgeMaterialSelectionId:$('kEdgeMat').value}:{}),...($('kWorktopMat')?.value?{worktopMaterialSelectionId:$('kWorktopMat').value}:{}),...($('kLegHw')?.value?{legHardwareSelectionId:$('kLegHw').value}:{})})});
$('applyKitchenFront')?.addEventListener('click',()=>visualCommand({type:'set_kitchen_front',furnitureIndex:fi,moduleIndex:state.selectedModule,mode:$('kFrontMode').value,...($('kModuleFrontMat')?.value?{materialSelectionId:$('kModuleFrontMat').value}:{}),openingMode:$('kFrontOpening').value}));
$('applyKitchenDrawers')?.addEventListener('click',()=>{const runner=$('kRunner')?.value;if(!runner)return msg('Kitchen: выберите Runner/SKU','ai');visualCommand({type:'set_kitchen_drawers',furnitureIndex:fi,moduleIndex:state.selectedModule,count:Math.round(num('kDrawerCount')),runnerHardwareSelectionId:runner,frontHeightMm:num('kDrawerFrontH'),sideThicknessMm:num('kDrawerSideT'),bottomThicknessMm:num('kDrawerBottomT')})});
$('applyKitchenAppliance')?.addEventListener('click',()=>visualCommand({type:'set_kitchen_appliance',furnitureIndex:fi,moduleIndex:state.selectedModule,kind:$('kApplianceKind').value,installation:$('kApplianceInstall').value,manufacturer:$('kApplianceMaker').value,model:$('kApplianceModel').value,widthMm:num('kAppW'),heightMm:num('kAppH'),depthMm:num('kAppD'),append:$('kApplianceAppend').checked}));
$('applyKitchenTrim')?.addEventListener('click',()=>visualCommand({type:'set_kitchen_wall_trim',furnitureIndex:fi,moduleIndex:state.selectedModule,enabled:true,heightMm:num('kTrimH'),depthMm:num('kTrimD'),...($('kWorktopMat')?.value?{materialSelectionId:$('kWorktopMat').value}:{})}));
$('applyKitchenCutout')?.addEventListener('click',()=>visualCommand({type:'set_kitchen_cutout',furnitureIndex:fi,moduleIndex:state.selectedModule,kind:$('kCutKind').value,widthMm:num('kCutW'),depthMm:num('kCutD'),offsetXMm:num('kCutX'),offsetYMm:num('kCutY'),verifiedForCnc:false}));
$('applyStyle')?.addEventListener('click',()=>visualCommand({type:'set_style_note',furnitureIndex:fi,colorNote:$('styleColor').value,finishNote:$('styleFinish').value}));document.querySelectorAll('[data-cad-panel]').forEach(el=>el.addEventListener('click',()=>{state.selectedCadPanel=el.dataset.cadPanel;renderInspector();renderDesign()}));document.querySelectorAll('[data-furniture]').forEach(el=>el.addEventListener('click',()=>{state.selectedFurniture=Number(el.dataset.furniture);state.selectedModule=0;state.selectedCadPanel=null;state.selectedRoomFeature=null;renderInspector();renderDesign()}));document.querySelectorAll('[data-module]').forEach(el=>el.addEventListener('click',()=>{state.selectedModule=Number(el.dataset.module);state.selectedCadPanel=null;renderInspector();renderDesign()}))}

function renderTab(){document.querySelectorAll('.bottom-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));const canvas=$('visualCanvas'),empty=$('emptyStage'),html=$('htmlStage');if(state.tab==='design'){canvas.classList.remove('hidden');html.classList.add('hidden');empty.classList.toggle('hidden',!!state.project);renderDesign()}else{canvas.classList.add('hidden');empty.classList.add('hidden');html.classList.remove('hidden');if(state.tab==='kitchen-studio')renderKitchenStudio();if(state.tab==='hardware-studio')renderHardwareStudio();if(state.tab==='appliance-studio')renderApplianceStudio();if(state.tab==='auto-complete')renderAutoComplete();if(state.tab==='measurements')renderMeasurements();if(state.tab==='installation-check')renderInstallationCheck();if(state.tab==='conflict-resolution')renderConflictResolution();if(state.tab==='owner-command')renderOwnerCommand();if(state.tab==='ai-office')renderAiOffice();if(state.tab==='content-studio')renderContentStudio();if(state.tab.startsWith('smm-'))window.MaksterSMM?.render(state.tab);if(state.tab==='system-readiness')renderSystemReadiness();if(state.tab==='job-control')renderJobControl();if(state.tab==='purchasing')renderPurchasing();if(state.tab==='costing')renderCosting();if(state.tab==='client-portal')renderClientPortal();if(state.tab==='release-gate')renderReleaseGate();if(state.tab==='installer')renderInstallerMode();if(state.tab==='catalog')renderCatalog();if(state.tab==='engineering')renderEngineering();if(state.tab==='quote')renderQuote();if(state.tab==='business')renderBusiness();if(state.tab==='production')renderProduction()}}

let lastGeom=null;
function canvasCtx(){const c=$('visualCanvas');const r=c.getBoundingClientRect();const dpr=window.devicePixelRatio||1;if(c.width!==Math.round(r.width*dpr)||c.height!==Math.round(r.height*dpr)){c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr)}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{c,ctx,w:r.width,h:r.height}}
function renderDesign(){if(state.tab!=='design')return;const {ctx,w,h}=canvasCtx();ctx.clearRect(0,0,w,h);state.hitAreas=[];if(!state.project){lastGeom=null;return}if(state.view==='front')drawFront(ctx,w,h);else if(state.view==='plan')drawPlan(ctx,w,h);else draw3D(ctx,w,h)}
function line(ctx,x1,y1,x2,y2,color='#777',width=1,dash=[]){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function text(ctx,s,x,y,size=11,color='#666',align='center'){ctx.save();ctx.fillStyle=color;ctx.font=`${size}px Inter,system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);ctx.restore()}
function roundedRect(ctx,x,y,w,h,r,fill,stroke='#777',lineWidth=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke()}
function tickH(ctx,x,y){line(ctx,x,y-5,x,y+5,'#8e8a82')}
function tickV(ctx,x,y){line(ctx,x-5,y,x+5,y,'#8e8a82')}
function dimH(ctx,x1,x2,y,label){line(ctx,x1,y,x2,y,'#8e8a82');tickH(ctx,x1,y);tickH(ctx,x2,y);text(ctx,label,(x1+x2)/2,y-10,9,'#666')}
function dimV(ctx,y1,y2,x,label){line(ctx,x,y1,x,y2,'#8e8a82');tickV(ctx,x,y1);tickV(ctx,x,y2);text(ctx,label,x-9,(y1+y2)/2,9,'#666','right')}
function drawFront(ctx,w,h){const scene=activeScene(),f=selectedFurniture(scene);if(!f){drawHint(ctx,w,h,'Опишите мебель AI или создайте её из шаблона.');lastGeom=null;return}const pad=82,availW=Math.max(100,w-pad*2),availH=Math.max(100,h-pad*2),resizePreview=state.drag?.kind==='edge-resize'&&state.previewScene&&state.drag.index===state.selectedFurniture;const scale=resizePreview?state.drag.startScale:Math.min(availW/Math.max(f.widthMm,1),availH/Math.max(f.heightMm,1));const fw=f.widthMm*scale,fh=f.heightMm*scale;let x=(w-fw)/2,y=(h-fh)/2+10;if(resizePreview){const d=state.drag;if(d.edge==='left')x=d.startRight-fw;else x=d.startXGeom;if(d.edge==='top')y=d.startBottom-fh;else y=d.startYGeom}lastGeom={type:'front',x,y,scale,f};ctx.save();ctx.shadowColor='rgba(0,0,0,.08)';ctx.shadowBlur=22;ctx.shadowOffsetY=10;ctx.fillStyle='#f6f4ef';ctx.fillRect(x,y,fw,fh);ctx.restore();ctx.strokeStyle='#25272a';ctx.lineWidth=2.4;ctx.strokeRect(x,y,fw,fh);dimH(ctx,x,x+fw,y-20,`${Math.round(f.widthMm)} мм`);dimV(ctx,y,y+fh,x-20,`${Math.round(f.heightMm)} мм`);for(const panel of f.cadPanels||[]){const px=x+panel.xMm*scale,py=y+fh-(panel.zMm+panel.heightMm)*scale,pw=Math.max(2,panel.widthMm*scale),ph=Math.max(2,panel.heightMm*scale);ctx.fillStyle=panel.id===state.selectedCadPanel?'rgba(190,143,82,.34)':'rgba(80,75,68,.10)';ctx.fillRect(px,py,pw,ph);if(panel.id===state.selectedCadPanel){ctx.strokeStyle='#b1844f';ctx.lineWidth=2;ctx.strokeRect(px,py,pw,ph)}state.hitAreas.push({kind:'cad-panel',panel,x:px,y:py,w:Math.max(6,pw),h:Math.max(6,ph)})}for(const m of f.modules){const mx=x+m.xMm*scale,mw=m.widthMm*scale;const selected=m.index===state.selectedModule;ctx.fillStyle=selected?'rgba(30,33,35,.075)':'rgba(255,255,255,.08)';ctx.fillRect(mx,y,mw,fh);if(m.index>0)line(ctx,mx,y,mx,y+fh,'#77736b',1.2);state.hitAreas.push({kind:'module',index:m.index,x:mx,y,w:mw,h:fh});drawInterior(ctx,m,mx,y,mw,fh,f.heightMm,true);text(ctx,`${m.index+1}`,mx+mw/2,y+15,10,selected?'#111':'#777');text(ctx,`${Math.round(m.widthMm)} мм`,mx+mw/2,y+fh-13,9,'#777');if(m.index<f.modules.length-1)state.hitAreas.push({kind:'divider',furnitureIndex:f.index,index:m.index,x:mx+mw-7,y,w:14,h:fh})}const handle='#b1844f';line(ctx,x,y+fh*.35,x,y+fh*.65,handle,4);line(ctx,x+fw,y+fh*.35,x+fw,y+fh*.65,handle,4);line(ctx,x+fw*.35,y,x+fw*.65,y,handle,4);line(ctx,x+fw*.35,y+fh,x+fw*.65,y+fh,handle,4);state.hitAreas.push({kind:'furniture-resize-left',index:f.index,edge:'left',x:x-9,y:y+fh*.2,w:18,h:fh*.6});state.hitAreas.push({kind:'furniture-resize-right',index:f.index,edge:'right',x:x+fw-9,y:y+fh*.2,w:18,h:fh*.6});state.hitAreas.push({kind:'furniture-resize-top',index:f.index,edge:'top',x:x+fw*.2,y:y-9,w:fw*.6,h:18});state.hitAreas.push({kind:'furniture-resize-bottom',index:f.index,edge:'bottom',x:x+fw*.2,y:y+fh-9,w:fw*.6,h:18});text(ctx,`${Math.round(f.depthMm)} мм глубина`,x+fw/2,y+fh+35,10,'#777');text(ctx,`${f.name} · объект ${f.index+1}/${scene.furniture.length}`,w/2,22,11,'#555');if(scene?.warnings?.length)text(ctx,'⚠ '+scene.warnings[0],w/2,h-18,10,'#8a6b1d')}
function drawInterior(ctx,m,x,y,w,h,heightMm,interactive=false){ctx.save();ctx.strokeStyle='#aaa69e';ctx.fillStyle='#e8e5de';if(m.contentKind==='shelves'||m.contentKind==='mixed'){const elevations=shelfElevations(m,heightMm);elevations.forEach((elevation,shelfIndex)=>{const sy=y+h-(elevation/Math.max(1,heightMm))*h;line(ctx,x+w*.15,sy,x+w*.85,sy,'#aaa69e',1.5);if(interactive)state.hitAreas.push({kind:'shelf',moduleIndex:m.index,shelfIndex,x:x+w*.12,y:sy-7,w:w*.76,h:14,elevationMm:elevation})})}if(m.contentKind==='drawers'){const count=Math.max(1,m.contentCount),dh=Math.min(42,(h*.42)/count),start=y+h*.54-count*dh;for(let i=0;i<count;i++){ctx.fillStyle='#e9e6df';ctx.fillRect(x+w*.12,start+i*dh,w*.76,dh);ctx.strokeRect(x+w*.12,start+i*dh,w*.76,dh)}}if(['short_clothes','long_clothes','mixed'].includes(m.contentKind)){const ry=y+(m.contentKind==='short_clothes'?h*.32:h*.24);line(ctx,x+w*.18,ry,x+w*.82,ry,'#777',2.5);if(m.contentKind==='short_clothes')line(ctx,x+w*.18,y+h*.62,x+w*.82,y+h*.62,'#bbb',1)}if(m.contentKind==='open')text(ctx,'＋',x+w/2,y+h/2,20,'#c0bbb1');ctx.restore()}
function drawPlanFeature(ctx,kind,feature,x,y,scale){const fx=x+feature.xMm*scale,fy=y+feature.yMm*scale,fw=Math.max(4,feature.widthMm*scale),fd=Math.max(4,feature.depthMm*scale),opening=kind==='opening';roundedRect(ctx,fx,fy,fw,fd,2,opening?'rgba(83,133,157,.18)':'rgba(178,126,72,.18)',opening?'#567f91':'#9a7148',1.5);text(ctx,opening?feature.kind:`! ${feature.kind}`,fx+fw/2,fy+fd/2,8,opening?'#365c70':'#76512d');state.hitAreas.push({kind:opening?'room-opening':'room-obstacle',featureType:kind,index:feature.index,x:fx,y:fy,w:fw,h:fd,feature})}
function drawPlan(ctx,w,h){const scene=activeScene(),room=scene?.room;if(!room){drawHint(ctx,w,h,'Создайте комнату в Inspector → Room.');lastGeom=null;return}const pad=78,scale=Math.min((w-pad*2)/room.widthMm,(h-pad*2)/room.depthMm),rw=room.widthMm*scale,rd=room.depthMm*scale,x=(w-rw)/2,y=(h-rd)/2;lastGeom={type:'plan',x,y,scale,room};ctx.fillStyle='#fff';ctx.fillRect(x,y,rw,rd);ctx.strokeStyle='#25272a';ctx.lineWidth=5;ctx.strokeRect(x,y,rw,rd);dimH(ctx,x,x+rw,y-24,`${Math.round(room.widthMm)} мм`);dimV(ctx,y,y+rd,x-24,`${Math.round(room.depthMm)} мм`);for(const feature of room.openings||[])drawPlanFeature(ctx,'opening',feature,x,y,scale);for(const feature of room.obstacles||[])drawPlanFeature(ctx,'obstacle',feature,x,y,scale);
for(const f of scene?.furniture||[]){const fx=x+f.xMm*scale,fy=y+f.yMm*scale,fp=footprint(f),fw=fp.w*scale,fd=fp.d*scale,selected=f.index===state.selectedFurniture;roundedRect(ctx,fx,fy,fw,fd,3,selected?'#d8d2c7':'#e7e3dc',selected?'#25272a':'#77736b',selected?2.6:1.2);text(ctx,`${f.index+1}. ${f.layoutKind==='l_corner'?`L-${f.layoutRole} · `:''}${f.name}`,fx+fw/2,fy+fd/2-5,9,'#333');text(ctx,`${Math.round(fp.w)}×${Math.round(fp.d)} · ${f.rotationZDeg}°`,fx+fw/2,fy+fd/2+8,8,'#666');state.hitAreas.push({kind:'furniture-plan',index:f.index,x:fx,y:fy,w:fw,h:fd,f});if(selected){const c=f.clearancesMm||{left:f.xMm,right:room.widthMm-f.xMm-fp.w,back:f.yMm,front:room.depthMm-f.yMm-fp.d};dimH(ctx,x,fx,fy-11,`L ${Math.round(c.left)}`);dimH(ctx,fx+fw,x+rw,fy-11,`R ${Math.round(c.right)}`);dimV(ctx,y,fy,fx-11,`B ${Math.round(c.back)}`);dimV(ctx,fy+fd,y+rd,fx-11,`F ${Math.round(c.front)}`);dimH(ctx,fx,fx+fw,fy+fd+12,`${Math.round(fp.w)}`);dimV(ctx,fy,fy+fd,fx+fw+12,`${Math.round(fp.d)}`)}}if(state.snapGuide?.xMm!==undefined){const gx=x+state.snapGuide.xMm*scale;line(ctx,gx,y,gx,y+rd,'#b1844f',1.4);text(ctx,`SNAP ${state.snapGuide.labelX||''}`,gx+6,y+14,8,'#8b663d','left')}if(state.snapGuide?.yMm!==undefined){const gy=y+state.snapGuide.yMm*scale;line(ctx,x,gy,x+rw,gy,'#b1844f',1.4);text(ctx,`SNAP ${state.snapGuide.labelY||''}`,x+8,gy-6,8,'#8b663d','left')}}
function draw3D(ctx,w,h){const f=selectedFurniture(activeScene());if(!f){drawHint(ctx,w,h,'Сначала создайте мебель.');return}const scale=Math.min((w-150)/Math.max(f.widthMm+f.depthMm*.45,1),(h-150)/Math.max(f.heightMm+f.depthMm*.25,1));const fw=f.widthMm*scale,fh=f.heightMm*scale,dx=f.depthMm*scale*.38,dy=f.depthMm*scale*.2,x=(w-fw-dx)/2,y=(h-fh+dy)/2;lastGeom={type:'3d',x,y,scale,f};ctx.lineJoin='round';ctx.fillStyle='#f5f2eb';ctx.strokeStyle='#35373a';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+fw,y);ctx.lineTo(x+fw+dx,y-dy);ctx.lineTo(x+dx,y-dy);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#e2ded5';ctx.beginPath();ctx.moveTo(x+fw,y);ctx.lineTo(x+fw,y+fh);ctx.lineTo(x+fw+dx,y+fh-dy);ctx.lineTo(x+fw+dx,y-dy);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#faf8f3';ctx.fillRect(x,y,fw,fh);ctx.strokeRect(x,y,fw,fh);for(const m of f.modules){const mx=x+m.xMm*scale,mw=m.widthMm*scale;if(m.index>0)line(ctx,mx,y,mx,y+fh,'#777',1);drawInterior(ctx,m,mx,y,mw,fh,f.heightMm,false);if(m.index===state.selectedModule){ctx.strokeStyle='#111';ctx.lineWidth=2.5;ctx.strokeRect(mx+2,y+2,mw-4,fh-4)}state.hitAreas.push({kind:'module',index:m.index,x:mx,y,w:mw,h:fh})}text(ctx,`${f.name} · ${Math.round(f.widthMm)} × ${Math.round(f.heightMm)} × ${Math.round(f.depthMm)} мм`,w/2,h-26,11,'#555')}
function drawHint(ctx,w,h,s){text(ctx,'◇',w/2,h/2-35,42,'#bbb');text(ctx,s,w/2,h/2+15,13,'#777')}

function canvasPoint(e){const r=$('visualCanvas').getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
$('visualCanvas').addEventListener('pointerdown',e=>{if(state.tab!=='design')return;const p=canvasPoint(e),hit=hitAt(p);if(!hit)return;if(hit.kind==='divider'&&state.view==='front'){state.drag={kind:'divider',furnitureIndex:state.selectedFurniture,index:hit.index,startX:p.x};$('visualCanvas').classList.add('dragging');$('visualCanvas').setPointerCapture(e.pointerId);return}if(hit.kind.startsWith('furniture-resize-')&&state.view==='front'){const f=selectedFurniture();state.drag={kind:'edge-resize',index:state.selectedFurniture,edge:hit.edge,startX:p.x,startY:p.y,startScale:lastGeom.scale,startXGeom:lastGeom.x,startYGeom:lastGeom.y,startRight:lastGeom.x+f.widthMm*lastGeom.scale,startBottom:lastGeom.y+f.heightMm*lastGeom.scale};$('visualCanvas').classList.add('dragging');$('visualCanvas').setPointerCapture(e.pointerId);return}if(hit.kind==='shelf'&&state.view==='front'){const f=selectedFurniture();state.selectedModule=hit.moduleIndex;state.drag={kind:'shelf',furnitureIndex:state.selectedFurniture,moduleIndex:hit.moduleIndex,shelfIndex:hit.shelfIndex,startY:p.y,startElevation:hit.elevationMm};$('visualCanvas').classList.add('dragging');$('visualCanvas').setPointerCapture(e.pointerId);renderInspector();return}if(hit.kind==='furniture-plan'&&state.view==='plan'){state.selectedFurniture=hit.index;state.selectedModule=0;state.selectedRoomFeature=null;state.drag={kind:'furniture',index:hit.index,startX:p.x,startY:p.y,startFx:hit.f.xMm,startFy:hit.f.yMm};$('visualCanvas').classList.add('dragging');$('visualCanvas').setPointerCapture(e.pointerId);renderInspector();renderDesign();return}if((hit.kind==='room-opening'||hit.kind==='room-obstacle')&&state.view==='plan'){state.selectedRoomFeature={type:hit.featureType,index:hit.index};state.drag={kind:'room-feature',featureType:hit.featureType,index:hit.index,startX:p.x,startY:p.y,startFx:hit.feature.xMm,startFy:hit.feature.yMm};$('visualCanvas').classList.add('dragging');$('visualCanvas').setPointerCapture(e.pointerId);return}if(hit.kind==='cad-panel'){state.selectedCadPanel=hit.panel.id;if(hit.panel.moduleIndex!==undefined)state.selectedModule=hit.panel.moduleIndex;renderInspector();renderDesign();return}if(hit.kind==='module'){state.selectedModule=hit.index;state.selectedCadPanel=null;renderInspector();renderDesign()}})
$('visualCanvas').addEventListener('pointermove',e=>{if(!state.drag)return;const p=canvasPoint(e),d=state.drag;if(d.kind==='divider')previewDivider(d,p);else if(d.kind==='furniture')previewFurnitureMove(d,p);else if(d.kind==='edge-resize')previewEdgeResize(d,p);else if(d.kind==='shelf')previewShelfMove(d,p);else if(d.kind==='room-feature')previewRoomFeatureMove(d,p);renderHeader();renderDesign()})
$('visualCanvas').addEventListener('pointerup',async e=>{if(!state.drag)return;const p=canvasPoint(e),d=state.drag;let command=null;if(d.kind==='divider'){const delta=previewDivider(d,p);if(delta!==null&&Math.abs(delta)>=1)command={type:'move_module_divider',furnitureIndex:d.furnitureIndex,leftModuleIndex:d.index,deltaMm:delta}}else if(d.kind==='furniture'){const pos=previewFurnitureMove(d,p);if(pos&&(Math.abs(pos.x-d.startFx)>=1||Math.abs(pos.y-d.startFy)>=1))command={type:'set_furniture_position',furnitureIndex:d.index,xMm:Math.round(pos.x),yMm:Math.round(pos.y)}}else if(d.kind==='edge-resize'){const delta=previewEdgeResize(d,p);if(delta!==null&&Math.abs(delta)>=1)command={type:'resize_furniture_edge',furnitureIndex:d.index,edge:d.edge,deltaMm:delta}}else if(d.kind==='shelf'){const elevation=previewShelfMove(d,p);if(elevation!==null&&Math.abs(elevation-d.startElevation)>=1)command={type:'set_shelf_elevation',furnitureIndex:d.furnitureIndex,moduleIndex:d.moduleIndex,shelfIndex:d.shelfIndex,elevationMm:elevation}}else if(d.kind==='room-feature'){const pos=previewRoomFeatureMove(d,p);if(pos&&(Math.abs(pos.x-d.startFx)>=1||Math.abs(pos.y-d.startFy)>=1))command=d.featureType==='opening'?{type:'move_room_opening',openingIndex:d.index,xMm:pos.x,yMm:pos.y}:{type:'move_room_obstacle',obstacleIndex:d.index,xMm:pos.x,yMm:pos.y}}state.drag=null;state.previewScene=null;state.snapGuide=null;$('visualCanvas').classList.remove('dragging');if(command)await visualCommand(command);else{renderHeader();renderDesign()}})
$('visualCanvas').addEventListener('pointercancel',()=>{state.drag=null;state.previewScene=null;state.snapGuide=null;$('visualCanvas').classList.remove('dragging');renderHeader();renderDesign()})

function renderEngineering(){const e=state.engineering,host=$('htmlStage');if(!e){host.innerHTML='<div class="dashboard"><div class="card"><div class="card-body">Сначала создайте мебельный проект.</div></div></div>';return}const rows=e.parts.slice(0,60).map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.kind)}</td><td>${p.quantity}</td><td>${(Number(p.length)/10).toFixed(0)} × ${(Number(p.width)/10).toFixed(0)} × ${(Number(p.thickness)/10).toFixed(0)} мм</td><td>${p.estimated?'CHECK':'exact'}</td></tr>`).join('');const issues=e.issues.slice(0,20).map(i=>`<div class="issue ${i.severity==='blocking'?'block':i.severity==='warning'?'warn':'ok'}"><span>${i.severity}</span><div><strong>${esc(i.code)}</strong><br>${esc(i.message)}</div></div>`).join('')||'<div class="issue ok"><span>OK</span><div>Blocking issues not found.</div></div>';host.innerHTML=`<div class="dashboard"><div class="metrics"><div class="metric ${e.readyForProduction?'good':'bad'}"><label>Production</label><strong>${e.readyForProduction?'READY':'HOLD'}</strong></div><div class="metric ${e.cncReady?'good':'bad'}"><label>CNC</label><strong>${e.cncReady?'READY':'HOLD'}</strong></div><div class="metric"><label>Furniture</label><strong>${state.scene?.furniture?.length||0}</strong></div><div class="metric"><label>Parts</label><strong>${e.stats.panelPartCount}</strong></div></div><div class="card"><h3>Cut list preview · ${esc(e.ruleSetId)}</h3><div class="card-body" style="padding:0;max-height:430px;overflow:auto"><table class="data-table"><thead><tr><th>Part</th><th>Type</th><th>Qty</th><th>Size</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="card"><h3>Manufacturability</h3>${issues}</div>${(e.catalogTraceability||[]).length?`<div class="card"><h3>Catalog Traceability</h3><div class="card-body">${e.catalogTraceability.map(x=>`<div class="business-alert"><strong>${esc(x.targetType.toUpperCase())} · ${esc(x.manufacturer||'—')} · ${esc(x.modelOrCode||x.catalogRecordId)}</strong><p>${esc(x.catalogRecordId)} · ${esc(x.trust||'UNKNOWN')}</p><p>${x.productionDrillingAuthorized===true?'Drilling: AUTHORIZED':x.targetType==='hardware'?'Drilling: NOT AUTHORIZED':'Installation source tracked'}</p><small>${esc(x.source||'source missing')}</small></div>`).join('')}</div></div>`:''}${(e.productionIntelligenceActions||[]).length?`<div class="card"><h3>Production Intelligence</h3><div class="card-body">${e.productionIntelligenceActions.map(a=>`<div class="business-alert"><strong>${esc(a.targetType.toUpperCase())} · ${esc(a.status.toUpperCase())}</strong><p>${esc(a.action)}</p><small>${esc(a.catalogRecordId)}</small></div>`).join('')}</div></div>`:''}</div>`}
function commercialBody(create=false){const body={useDemoPricing:true,markupBps:3500,discountBps:0,taxBps:2100,productionRoute:'manual_workshop'};if(create)body.quoteTerms={clientName:$('clientName')?.value?.trim()||'Client',validityDays:14,leadTimeText:'30–45 days after final approval and deposit',paymentTerms:[{label:'Deposit',bps:5000},{label:'Before installation',bps:4000},{label:'After handover',bps:1000}],inclusions:['Furniture according to approved project revision','Transport and installation'],exclusions:['Electrical work','Wall repair / painting'],notes:['TEST ONLY demo pricing — replace with organization catalog before real use.'],sellerName:'Makster Atelier'};return body}
function renderQuote(){const host=$('htmlStage'),e=state.commercialEstimate,q=state.commercialQuote;host.innerHTML=`<div class="dashboard"><div class="metrics"><div class="metric ${e?.ready?'good':'bad'}"><label>Commercial</label><strong>${e?e.ready?'READY':'HOLD':'—'}</strong></div><div class="metric"><label>Full cost</label><strong>${e?money(e.totals.totalCostMinor,e.currency):'—'}</strong></div><div class="metric"><label>Client net</label><strong>${e?money(e.totals.netSalesMinor,e.currency):'—'}</strong></div><div class="metric"><label>Margin</label><strong>${e?(e.totals.marginBps/100).toFixed(2)+'%':'—'}</strong></div></div><div class="card"><h3>Commercial & Quote Engine</h3><div class="card-body"><p class="meta-note">Makster 2.5 связывает quote с той же immutable Project Revision, что CAD и Engineering. Демо цены — TEST ONLY.</p><div class="toolbar-form"><input id="clientName" placeholder="Клиент" value="Demo Client"><button id="previewQuote">Рассчитать</button><button id="createQuote" class="secondary">Создать предложение</button>${q?'<button id="openQuote" class="secondary">Открыть HTML</button>':''}</div><div id="quoteStatus" style="margin-top:12px">${q?`Quote v${q.quoteVersion} · ${money(q.totalAmountMinor,q.currency)}`:''}</div></div></div></div>`;$('previewQuote')?.addEventListener('click',async()=>{try{const r=await api(`/api/v1/projects/${state.project.id}/commercial/estimate-preview`,{method:'POST',body:JSON.stringify(commercialBody(false))});state.commercialEstimate=r.estimate;renderQuote()}catch(e){msg(`Quote: ${e.message}`,'ai')}});$('createQuote')?.addEventListener('click',async()=>{try{const r=await api(`/api/v1/projects/${state.project.id}/commercial/quotes`,{method:'POST',body:JSON.stringify(commercialBody(true))});state.commercialEstimate=r.estimate;state.commercialQuote=r.quote;renderQuote()}catch(e){msg(`Quote: ${e.message}`,'ai')}});$('openQuote')?.addEventListener('click',()=>window.open(`/api/v1/commercial/quotes/${state.commercialQuote.quoteId}/files/client-offer.html`,'_blank'))}

async function renderBusiness(){
  const host=$('htmlStage');if(!state.project){host.innerHTML='<div class="dashboard"><div class="card"><div class="card-body">Откройте проект.</div></div></div>';return}
  host.innerHTML='<div class="dashboard"><div class="card"><div class="card-body">Загрузка Business chain…</div></div></div>';
  try{
    const q=await api(`/api/v1/projects/${state.project.id}/commercial/quotes`);state.business.quotes=q.quotes||[];
    try{const c=await api(`/api/v1/projects/${state.project.id}/commercial-contract`);state.business.contract=c.contract;state.business.commercialGate=c.commercialGate}catch{state.business.contract=null;state.business.commercialGate=null}
    try{const o=await api(`/api/v1/projects/${state.project.id}/change-orders`);state.business.changeOrders=o.changeOrders||[]}catch{state.business.changeOrders=[]}
  }catch(e){host.innerHTML=`<div class="dashboard"><div class="card"><div class="card-body">Business: ${esc(e.message)}</div></div></div>`;return}
  const rev=state.project.snapshot.revision,contract=state.business.contract,gate=state.business.commercialGate,quotes=state.business.quotes;
  const latestRequote=[...quotes].reverse().find(x=>x.lineage&&contract&&x.lineage.supersedesQuoteId===contract.currentQuoteId&&x.quote.revision===rev);
  const quoteRows=quotes.map(x=>{const st=x.lifecycleStatus,buttons=[];if(st==='draft')buttons.push(`<button class="secondary small" data-quote-status="${x.quote.quoteId}:approved">Approve</button>`);if(st==='approved')buttons.push(`<button class="secondary small" data-quote-status="${x.quote.quoteId}:sent">Mark sent</button>`);if(st==='sent')buttons.push(`<button class="secondary small" data-quote-status="${x.quote.quoteId}:accepted">Mark accepted</button>`);if(st==='accepted'&&!contract)buttons.push(`<button class="small" data-create-contract="${x.quote.quoteId}">Create contract</button>`);buttons.push(`<button class="secondary small" data-open-offer="${x.quote.quoteId}">Offer HTML</button>`);return `<tr><td>v${x.quote.quoteVersion}</td><td>R${x.quote.revision}</td><td>${esc(x.quote.clientName)}</td><td>${money(x.quote.totalAmountMinor,x.quote.currency)}</td><td><span class="pill ${st==='accepted'?'':'neutral'}">${esc(st)}</span></td><td><div class="button-row compact">${buttons.join('')}</div></td></tr>`}).join('')||'<tr><td colspan="6">Нет коммерческих предложений. Создайте его во вкладке Quote.</td></tr>';
  const payments=contract?.paymentSchedule?.map(x=>`<tr><td>${esc(x.label)}</td><td>${money(x.amountMinor,contract.currency)}</td><td>${esc(x.status)}</td><td>${x.status==='paid'?esc(x.paidAt||'paid'):`<button class="secondary small" data-pay="${x.installmentId}">Mark paid</button>`}</td></tr>`).join('')||'';
  const orders=state.business.changeOrders.map(o=>`<tr><td>${esc(o.publicReference)}</td><td>R${o.binding.fromRevision} → R${o.binding.toRevision}</td><td>${o.binding.deltaMinor>=0?'+':''}${money(o.binding.deltaMinor,o.binding.currency)}</td><td><span class="pill ${o.status==='accepted'?'':'neutral'}">${esc(o.status)}</span></td><td><button class="secondary small" data-open-change="${o.changeOrderId}">Document</button>${['draft'].includes(o.status)?` <button class="small" data-send-change="${o.changeOrderId}">Send</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5">Change Order пока нет.</td></tr>';
  const stale=contract&&contract.currentRevision!==rev;
  host.innerHTML=`<div class="dashboard"><div class="metrics"><div class="metric ${contract?'good':'bad'}"><label>Contract</label><strong>${contract?'ACTIVE':'—'}</strong></div><div class="metric ${gate?.allowed?'good':'bad'}"><label>Production gate</label><strong>${gate?gate.allowed?'OPEN':'BLOCKED':'—'}</strong></div><div class="metric"><label>Contract revision</label><strong>${contract?'R'+contract.currentRevision:'—'}</strong></div><div class="metric"><label>Project revision</label><strong>R${rev}</strong></div></div>
  <div class="card"><h3>Commercial documents</h3><div class="card-body"><p class="meta-note">Quote, договор и последующие изменения привязаны к точным Project Revision. Изменение CAD не переписывает уже согласованный договор.</p><table class="data-table"><thead><tr><th>Quote</th><th>Revision</th><th>Client</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>${quoteRows}</tbody></table></div></div>
  ${contract?`<div class="card"><h3>Contract · ${esc(contract.contractId)}</h3><div class="card-body"><div class="contract-line"><strong>${money(contract.agreedAmountMinor,contract.currency)}</strong><span>agreed · current R${contract.currentRevision}</span><span class="pill ${gate?.allowed?'':'bad'}">${esc(gate?.code||'—')}</span></div>${stale?`<div class="business-alert"><strong>CAD изменён после договора.</strong><br>Текущий проект R${rev}, договор R${contract.currentRevision}. Production заблокирован до согласования изменения.</div>`:''}<table class="data-table"><thead><tr><th>Payment</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${payments}</tbody></table><div class="button-row"><button id="openContractDocument" class="secondary">Contract document</button>${stale&&!latestRequote?'<button id="businessRequote">Requote current Revision</button>':''}${latestRequote?`<button id="businessChangeOrder">Create Change Order · Quote v${latestRequote.quote.quoteVersion}</button>`:''}</div></div></div>`:''}
  <div class="card"><h3>Client Change Orders</h3><div class="card-body"><table class="data-table"><thead><tr><th>Document</th><th>Revision</th><th>Delta</th><th>Status</th><th>Action</th></tr></thead><tbody>${orders}</tbody></table>${state.business.approvalToken?`<div class="business-alert goodish"><strong>Client approval token returned once</strong><br><code>${esc(state.business.approvalToken)}</code><br><span class="meta-note">Передайте клиенту защищённую ссылку/токен. В хранилище сохраняется только SHA-256.</span></div>`:''}</div></div></div>`;
  host.querySelectorAll('[data-quote-status]').forEach(b=>b.addEventListener('click',async()=>{const[id,status]=b.dataset.quoteStatus.split(':');try{await api(`/api/v1/commercial/quotes/${id}/status`,{method:'POST',body:JSON.stringify({status})});await renderBusiness()}catch(e){msg(`Business: ${e.message}`,'ai')}}));
  host.querySelectorAll('[data-open-offer]').forEach(b=>b.addEventListener('click',()=>window.open(`/api/v1/commercial/quotes/${b.dataset.openOffer}/files/client-offer.html`,'_blank')));
  host.querySelectorAll('[data-create-contract]').forEach(b=>b.addEventListener('click',async()=>{try{await api(`/api/v1/commercial/quotes/${b.dataset.createContract}/contract`,{method:'POST',body:'{}'});await renderBusiness()}catch(e){msg(`Contract: ${e.message}`,'ai')}}));
  host.querySelectorAll('[data-pay]').forEach(b=>b.addEventListener('click',async()=>{try{await api(`/api/v1/commercial/contracts/${contract.contractId}/payments/${b.dataset.pay}/mark-paid`,{method:'POST',body:'{}'});await renderBusiness()}catch(e){msg(`Payment: ${e.message}`,'ai')}}));
  $('openContractDocument')?.addEventListener('click',()=>window.open(`/api/v1/commercial/contracts/${contract.contractId}/document`,'_blank'));
  $('businessRequote')?.addEventListener('click',async()=>{try{const r=await api(`/api/v1/commercial/quotes/${contract.currentQuoteId}/requote`,{method:'POST',body:JSON.stringify({toRevision:rev})});state.business.lastRequote=r;await renderBusiness()}catch(e){msg(`Requote: ${e.message}`,'ai')}});
  $('businessChangeOrder')?.addEventListener('click',async()=>{try{const r=await api(`/api/v1/commercial/quotes/${latestRequote.quote.quoteId}/change-order`,{method:'POST',body:'{}'});state.business.changeOrder=r.changeOrder;await renderBusiness()}catch(e){msg(`Change Order: ${e.message}`,'ai')}});
  host.querySelectorAll('[data-send-change]').forEach(b=>b.addEventListener('click',async()=>{try{const r=await api(`/api/v1/client/change-orders/${b.dataset.sendChange}/send`,{method:'POST',body:'{}'});state.business.approvalToken=r.approvalToken;await renderBusiness()}catch(e){msg(`Change Order: ${e.message}`,'ai')}}));
  host.querySelectorAll('[data-open-change]').forEach(b=>b.addEventListener('click',()=>window.open(`/api/v1/client/change-orders/${b.dataset.openChange}/document`,'_blank')));
}



function studioKindLabel(kind){return ({straight:'Прямая',l_shape:'L-образная',u_shape:'U-образная',parallel:'Параллельная',island:'С островом'})[kind]||kind}
function studioStrategyLabel(s){return ({compact:'Компактная',utility_affinity:'По коммуникациям',distributed:'Распределённая'})[s]||s}
function studioModuleLabel(id){return ({'base.sink':'Мойка','base.oven_hob':'Духовка / варочная','base.dishwasher':'ПММ','base.drawers':'Ящики','base.storage':'Хранение','base.open':'Открытая','tall.fridge':'Холодильник','tall.oven':'Пенал духовки','tall.pantry':'Пенал','wall.hood':'Вытяжка','wall.storage':'Верхний'})[id]||id?.split('.').pop()||'модуль'}
function studioRunRect(run,roomW,roomD){const d=run.depthMm,L=run.lengthMm;switch(run.side){case'south':return{x:0,y:roomD-d,w:L,h:d,rot:0};case'north':return{x:roomW-L,y:0,w:L,h:d,rot:0};case'east':return{x:roomW-d,y:0,w:d,h:L,rot:90};case'west':return{x:0,y:roomD-L,w:d,h:L,rot:90};case'island':return{x:(roomW-L)/2,y:(roomD-d)/2,w:L,h:d,rot:0}}}
function studioPlanSvg(v){const p=v.mixedHeight,W=p.roomWidthMm,D=p.roomDepthMm,sw=520,sh=300,pad=22,sc=Math.min((sw-pad*2)/W,(sh-pad*2)/D),x=n=>pad+n*sc,y=n=>pad+n*sc;let out=`<svg class="studio-svg" viewBox="0 0 ${sw} ${sh}" role="img" aria-label="План кухни"><rect x="${x(0)}" y="${y(0)}" width="${W*sc}" height="${D*sc}" class="studio-room"/>`;for(const r of p.runs){const rr=studioRunRect(r,W,D);out+=`<rect x="${x(rr.x)}" y="${y(rr.y)}" width="${rr.w*sc}" height="${rr.h*sc}" rx="4" class="studio-run"/>`;for(const pl of r.floorPlacements){let px=rr.x,py=rr.y,pw=rr.w,ph=rr.h;if(r.side==='south'||r.side==='north'||r.side==='island'){px=rr.x+pl.xMm;pw=pl.widthMm}else{py=rr.y+pl.xMm;ph=pl.widthMm}out+=`<rect x="${x(px)}" y="${y(py)}" width="${Math.max(2,pw*sc)}" height="${Math.max(2,ph*sc)}" class="studio-module"><title>${esc(studioModuleLabel(pl.module.libraryModuleId))} · ${pl.widthMm} mm</title></rect>`}}out+=`<text x="${pad}" y="${sh-5}" class="studio-dim">${W} × ${D} mm</text></svg>`;return out}
function studioFrontSvg(v){const runs=v.mixedHeight.runs,sw=520,sh=300,pad=22,maxL=Math.max(...runs.map(r=>r.lengthMm),1),sc=(sw-pad*2)/maxL;let y=30,out=`<svg class="studio-svg" viewBox="0 0 ${sw} ${sh}" role="img" aria-label="Фасады кухни">`;for(const r of runs.slice(0,3)){const h=65;out+=`<text x="${pad}" y="${y-6}" class="studio-dim">${r.side.toUpperCase()}</text>`;for(const pl of r.floorPlacements){const x=pad+pl.xMm*sc,w=Math.max(3,pl.widthMm*sc);out+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" class="studio-module"><title>${esc(studioModuleLabel(pl.module.libraryModuleId))}</title></rect>`}for(const pl of r.wallPlacements||[]){const x=pad+pl.xMm*sc,w=Math.max(3,pl.widthMm*sc);out+=`<rect x="${x}" y="${y-26}" width="${w}" height="22" class="studio-wall-module"/>`}y+=88}return out+`</svg>`}
function studioIsoSvg(v){const p=v.mixedHeight,W=p.roomWidthMm,D=p.roomDepthMm,sw=520,sh=300,cx=260,cy=58,s=Math.min(190/W,120/D),iso=(X,Y,Z=0)=>[cx+(X-Y)*s,cy+(X+Y)*s*.5-Z*s*.7];let out=`<svg class="studio-svg" viewBox="0 0 ${sw} ${sh}" role="img" aria-label="3D эскиз кухни">`;const a=iso(0,0),b=iso(W,0),c=iso(W,D),d=iso(0,D);out+=`<path d="M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]} L${d[0]},${d[1]} Z" class="studio-floor"/>`;for(const r of p.runs){for(const pl of r.floorPlacements){const side=r.side;let X=0,Y=0,ww=pl.widthMm,dd=r.depthMm;if(side==='south'){X=pl.xMm;Y=0}else if(side==='north'){X=W-pl.xMm-pl.widthMm;Y=D-dd}else if(side==='east'){X=W-dd;Y=pl.xMm;ww=dd;dd=pl.widthMm}else if(side==='west'){X=0;Y=D-pl.xMm-pl.widthMm;ww=dd;dd=pl.widthMm}else{X=(W-r.lengthMm)/2+pl.xMm;Y=(D-r.depthMm)/2}const z=pl.module.libraryModuleId?.startsWith('tall.')?2100:720;const p1=iso(X,Y),p2=iso(X+ww,Y),p3=iso(X+ww,Y+dd),p4=iso(X,Y+dd),t1=iso(X,Y,z),t2=iso(X+ww,Y,z),t3=iso(X+ww,Y+dd,z),t4=iso(X,Y+dd,z);out+=`<path d="M${p1} L${p2} L${t2} L${t1} Z M${p2} L${p3} L${t3} L${t2} Z M${t1} L${t2} L${t3} L${t4} Z" class="studio-box"/>`}}return out+'</svg>'}
function studioPreview(v){return state.studio.view==='front'?studioFrontSvg(v):state.studio.view==='3d'?studioIsoSvg(v):studioPlanSvg(v)}
function studioScoreBars(v){const b=v.score,rows=[['Инженерия',b.engineering],['Эргономика',b.ergonomics],['Производство',b.manufacturing],['Коммуникации',b.utilities],['Рабочая зона',b.prepSurface],['Доступ техники',b.applianceAccess]];return `<div class="studio-score-grid">${rows.map(([n,x])=>`<div><span>${n}</span><b>${x}</b><i><em style="width:${Math.max(0,Math.min(100,x))}%"></em></i></div>`).join('')}</div>`}
async function generateKitchenStudio(){
  const btn=$('studioGenerate');if(btn)btn.disabled=true;
  try{
    const room=state.studio.room;
    room.widthMm=Math.max(2400,Number($('studioW')?.value)||room.widthMm||4200);
    room.depthMm=Math.max(1800,Number($('studioD')?.value)||room.depthMm||3200);
    room.minAisleMm=Math.max(700,Number($('studioAisle')?.value)||room.minAisleMm||900);
    const obstacles=room.features.filter(x=>!['door','window'].includes(x.kind)).map(x=>{const b=wallFeaturePlanBox(x);return {id:x.id,kind:x.kind,xMm:b.xMm,yMm:b.yMm,widthMm:b.widthMm,depthMm:b.depthMm,clearanceMm:x.clearanceMm||0}});
    const openingZones=room.features.filter(x=>x.kind==='door').map(x=>{const b=wallFeaturePlanBox(x),side=x.side||'south',span=x.openingWidthMm||x.widthMm,sweep=x.openingDepthMm||Math.max(800,x.depthMm);return {id:`opening:${x.id}`,owner:x.id,xMm:b.xMm,yMm:b.yMm,widthMm:(side==='west'||side==='east')?sweep:span,depthMm:(side==='west'||side==='east')?span:sweep}});
    const utilities=room.utilities.map(u=>({kind:u.kind,side:u.side,offsetMm:u.offsetMm,...(u.toleranceMm?{toleranceMm:u.toleranceMm}:{})}));
    const body={optimizationId:`studio-${Date.now()}`,roomWidthMm:room.widthMm,roomDepthMm:room.depthMm,minAisleMm:room.minAisleMm,maxGeneratedVariants:30,topN:3,allowedKinds:['straight','l_shape','parallel','u_shape','island'],requirements:[{libraryModuleId:'base.sink',widthMm:600},{libraryModuleId:'base.dishwasher',widthMm:600},{libraryModuleId:'base.oven_hob',widthMm:600},{libraryModuleId:'base.drawers',widthMm:600}],tallRequirements:[{libraryModuleId:'tall.fridge',widthMm:600}],createWallLayer:true,utilities,constraints:{obstacles,openingZones},applianceBindings:[]};
    state.studio.result=await api('/api/v1/kitchen-design-studio/generate',{method:'POST',body:JSON.stringify(body)});
    state.studio.selectedId=state.studio.result.recommended?.id||null;
    renderKitchenStudio();
  }catch(e){
    msg(`Kitchen Studio: ${e.message}`,'ai');
    const el=$('studioResults');if(el)el.innerHTML=`<div class="business-alert">${esc(e.message)}</div>`;
  }finally{if(btn)btn.disabled=false}
}
async function applyKitchenStudioVariant(id){const v=state.studio.result?.allVariants?.find(x=>x.id===id);if(!v)return;try{if(!state.project)await createProject();const r=await api(`/api/v1/projects/${state.project.id}/kitchen-design-studio/apply`,{method:'POST',body:JSON.stringify({variant:v,title:`Kitchen Studio · ${studioKindLabel(v.kind)} · ${v.score.total}/100`,roomScene:state.studio.room})});state.project=r.project;state.scene=r.visualScene;state.engineering=r.engineering;state.previewScene=null;state.tab='design';state.view='plan';state.selectedFurniture=0;state.selectedModule=0;loadHistory();renderAll();await loadProjects();msg(`Kitchen Studio: выбран вариант #${v.rank}, ${studioKindLabel(v.kind)}, ${v.score.total}/100 → Project Revision ${state.project.snapshot.revision}.`,'meta')}catch(e){msg(`Kitchen Studio apply: ${e.message}`,'ai')}}

function roomFeatureDefaults(kind){
  const room=state.studio.room;
  const id=`${kind}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  if(kind==='door')return {id,kind,side:'south',xMm:0,yMm:0,widthMm:900,depthMm:100,openingWidthMm:900,openingDepthMm:900,clearanceMm:0,zMm:null,heightMm:null,verticalState:'unknown'};
  if(kind==='window')return {id,kind,side:'south',xMm:1000,yMm:0,widthMm:1200,depthMm:80,clearanceMm:0,zMm:null,heightMm:null,verticalState:'unknown'};
  if(kind==='radiator')return {id,kind,side:'south',xMm:1200,yMm:0,widthMm:800,depthMm:160,clearanceMm:100,zMm:null,heightMm:null,verticalState:'unknown'};
  if(kind==='column')return {id,kind,xMm:room.widthMm/2-150,yMm:room.depthMm/2-150,widthMm:300,depthMm:300,clearanceMm:0};
  if(kind==='shaft')return {id,kind,xMm:room.widthMm-500,yMm:0,widthMm:500,depthMm:400,clearanceMm:0};
  return {id,kind,xMm:100,yMm:100,widthMm:500,depthMm:300,clearanceMm:0};
}
function addRoomFeature(kind){const f=roomFeatureDefaults(kind);state.studio.room.features.push(f);state.studio.room.selectedFeatureId=f.id;renderKitchenStudio()}
function removeSelectedRoomFeature(){const id=state.studio.room.selectedFeatureId;if(!id)return;state.studio.room.features=state.studio.room.features.filter(x=>x.id!==id);state.studio.room.selectedFeatureId=null;renderKitchenStudio()}
function addRoomUtility(kind){
  const room=state.studio.room,id=`util-${kind}-${Date.now()}`;
  room.utilities.push({id,kind,side:'south',offsetMm:Math.round(room.widthMm/2),toleranceMm:300,zMm:null,heightMm:null,verticalState:'unknown'});
  room.selectedFeatureId=id;renderKitchenStudio();
}
function selectedRoomObject(){
  const id=state.studio.room.selectedFeatureId;
  return state.studio.room.features.find(x=>x.id===id)||state.studio.room.utilities.find(x=>x.id===id)||null;
}
function wallFeaturePlanBox(f){
  const room=state.studio.room,side=f.side;
  if(!['door','window','radiator'].includes(f.kind)||!side)return {xMm:f.xMm,yMm:f.yMm,widthMm:f.widthMm,depthMm:f.depthMm};
  if(side==='south')return {xMm:f.xMm,yMm:0,widthMm:f.widthMm,depthMm:f.depthMm};
  if(side==='north')return {xMm:f.xMm,yMm:Math.max(0,room.depthMm-f.depthMm),widthMm:f.widthMm,depthMm:f.depthMm};
  if(side==='west')return {xMm:0,yMm:f.yMm,widthMm:f.depthMm,depthMm:f.widthMm};
  return {xMm:Math.max(0,room.widthMm-f.depthMm),yMm:f.yMm,widthMm:f.depthMm,depthMm:f.widthMm};
}
function snapWallFeature(f,px,py){
  const room=state.studio.room;
  const distances={south:py,north:room.depthMm-py,west:px,east:room.widthMm-px};
  const side=Object.entries(distances).sort((a,b)=>a[1]-b[1])[0][0];f.side=side;
  if(side==='south'||side==='north'){
    f.xMm=Math.max(0,Math.min(room.widthMm-f.widthMm,Math.round(px-f.widthMm/2)));
    f.yMm=side==='south'?0:Math.max(0,room.depthMm-f.depthMm);
  }else{
    f.yMm=Math.max(0,Math.min(room.depthMm-f.widthMm,Math.round(py-f.widthMm/2)));
    f.xMm=side==='west'?0:Math.max(0,room.widthMm-f.depthMm);
  }
}

function utilityPoint(u){
  const room=state.studio.room;
  if(u.side==='south')return {x:u.offsetMm,y:0};
  if(u.side==='north')return {x:u.offsetMm,y:room.depthMm};
  if(u.side==='west')return {x:0,y:u.offsetMm};
  return {x:room.widthMm,y:u.offsetMm};
}
function roomEditorSvg(){
  const room=state.studio.room,W=720,H=460,pad=28,s=Math.min((W-pad*2)/room.widthMm,(H-pad*2)/room.depthMm),ox=(W-room.widthMm*s)/2,oy=(H-room.depthMm*s)/2;
  const featureSvg=room.features.map(f=>{
    const b=wallFeaturePlanBox(f),x=ox+b.xMm*s,y=oy+(room.depthMm-b.yMm-b.depthMm)*s,w=Math.max(4,b.widthMm*s),h=Math.max(4,b.depthMm*s);
    const selected=f.id===room.selectedFeatureId;
    const label=f.kind==='door'?'Дверь':f.kind==='window'?'Окно':f.kind==='radiator'?'Радиатор':f.kind==='column'?'Колонна':f.kind==='shaft'?'Шахта':f.kind;
    const opening=f.kind==='door'?(()=>{const side=f.side||'south',span=f.openingWidthMm||f.widthMm,sweep=f.openingDepthMm||900;let ob;if(side==='south')ob={xMm:b.xMm,yMm:0,widthMm:span,depthMm:sweep};else if(side==='north')ob={xMm:b.xMm,yMm:Math.max(0,room.depthMm-sweep),widthMm:span,depthMm:sweep};else if(side==='west')ob={xMm:0,yMm:b.yMm,widthMm:sweep,depthMm:span};else ob={xMm:Math.max(0,room.widthMm-sweep),yMm:b.yMm,widthMm:sweep,depthMm:span};return `<rect class="room-opening" x="${ox+ob.xMm*s}" y="${oy+(room.depthMm-ob.yMm-ob.depthMm)*s}" width="${Math.max(6,ob.widthMm*s)}" height="${Math.max(6,ob.depthMm*s)}"/>`})():'';
    return `${opening}<g data-room-id="${esc(f.id)}" class="room-object ${selected?'selected':''}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle">${esc(label)}</text></g>`;
  }).join('');
  const utilSvg=room.utilities.map(u=>{
    const p=utilityPoint(u),cx=ox+p.x*s,cy=oy+(room.depthMm-p.y)*s,sel=u.id===room.selectedFeatureId;
    const label=u.kind==='water'?'W':u.kind==='drain'?'D':u.kind==='power'?'⚡':u.kind==='hood_vent'?'V':u.kind==='gas'?'G':'U';
    return `<g data-room-id="${esc(u.id)}" class="room-utility ${sel?'selected':''}"><circle cx="${cx}" cy="${cy}" r="10"/><text x="${cx}" y="${cy+4}" text-anchor="middle">${label}</text></g>`;
  }).join('');
  return `<svg id="roomEditorSvg" viewBox="0 0 ${W} ${H}" data-scale="${s}" data-ox="${ox}" data-oy="${oy}"><rect class="room-canvas" x="${ox}" y="${oy}" width="${room.widthMm*s}" height="${room.depthMm*s}"/><text class="room-dim" x="${W/2}" y="${oy-9}" text-anchor="middle">${room.widthMm} мм</text><text class="room-dim" x="${ox-9}" y="${H/2}" text-anchor="middle" transform="rotate(-90 ${ox-9} ${H/2})">${room.depthMm} мм</text>${featureSvg}${utilSvg}</svg>`;
}
function updateSelectedRoomObject(field,value){
  const o=selectedRoomObject();if(!o)return;
  if(field==='side'){
    o.side=value;
    if('offsetMm' in o){const max=(value==='south'||value==='north')?state.studio.room.widthMm:state.studio.room.depthMm;o.offsetMm=Math.min(o.offsetMm,max)}
    else if(['door','window','radiator'].includes(o.kind)){
      const room=state.studio.room;
      if(value==='south'){o.yMm=0;o.xMm=Math.min(o.xMm,Math.max(0,room.widthMm-o.widthMm))}
      if(value==='north'){o.yMm=Math.max(0,room.depthMm-o.depthMm);o.xMm=Math.min(o.xMm,Math.max(0,room.widthMm-o.widthMm))}
      if(value==='west'){o.xMm=0;o.yMm=Math.min(o.yMm,Math.max(0,room.depthMm-o.widthMm))}
      if(value==='east'){o.xMm=Math.max(0,room.widthMm-o.depthMm);o.yMm=Math.min(o.yMm,Math.max(0,room.depthMm-o.widthMm))}
    }
  }else if(field==='kind')o[field]=value;
  else if(['zMm','heightMm'].includes(field)){
    o[field]=value===''?null:Math.max(0,Number(value));
    o.verticalState=(o.zMm!=null&&o.heightMm!=null)?'confirmed':'unknown';
  }else o[field]=Math.max(0,Number(value)||0);
  renderKitchenStudio();
}
function bindRoomEditorDrag(){
  const svg=$('roomEditorSvg');if(!svg)return;
  const room=state.studio.room;
  let drag=null;
  const svgPoint=e=>{
    const r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
    return {x:(e.clientX-r.left)*vb.width/r.width,y:(e.clientY-r.top)*vb.height/r.height};
  };
  svg.querySelectorAll('[data-room-id]').forEach(g=>g.addEventListener('pointerdown',e=>{
    e.preventDefault();const id=g.dataset.roomId;room.selectedFeatureId=id;
    const feature=room.features.find(x=>x.id===id),utility=room.utilities.find(x=>x.id===id);
    const p=svgPoint(e);drag={id,feature,utility,start:p,startX:feature?.xMm??0,startY:feature?.yMm??0,startOffset:utility?.offsetMm??0};svg.setPointerCapture(e.pointerId);
    svg.querySelectorAll('[data-room-id]').forEach(x=>x.classList.toggle('selected',x.dataset.roomId===id));
  }));
  svg.addEventListener('pointermove',e=>{
    if(!drag)return;const p=svgPoint(e),s=Number(svg.dataset.scale),dx=(p.x-drag.start.x)/s,dy=-(p.y-drag.start.y)/s;
    if(drag.feature){
      const rawX=drag.startX+dx,rawY=drag.startY+dy;
      if(['door','window','radiator'].includes(drag.feature.kind))snapWallFeature(drag.feature,rawX+drag.feature.widthMm/2,rawY+drag.feature.depthMm/2);
      else{
        drag.feature.xMm=Math.max(0,Math.min(room.widthMm-drag.feature.widthMm,Math.round(rawX)));
        drag.feature.yMm=Math.max(0,Math.min(room.depthMm-drag.feature.depthMm,Math.round(rawY)));
      }
    }else if(drag.utility){
      const max=(drag.utility.side==='south'||drag.utility.side==='north')?room.widthMm:room.depthMm;
      const delta=(drag.utility.side==='south'||drag.utility.side==='north')?dx:dy;
      drag.utility.offsetMm=Math.max(0,Math.min(max,Math.round(drag.startOffset+delta)));
    }
  });
  svg.addEventListener('pointerup',()=>{drag=null;renderKitchenStudio()});
}
function renderRoomEditorOnly(){
  const wrap=$('roomEditorWrap');if(!wrap)return;
  wrap.innerHTML=roomEditorSvg();bindRoomEditorDrag();
}
function wallLength(side){const room=state.studio.room;return (side==='south'||side==='north')?room.widthMm:room.depthMm}
function wallObjectOffset(o,side){
  if('offsetMm' in o)return o.offsetMm;
  if(side==='south'||side==='north')return o.xMm||0;
  return o.yMm||0;
}
function wallObjects(side){
  const room=state.studio.room;
  return [...room.features.filter(f=>f.side===side&&['door','window','radiator'].includes(f.kind)),...room.utilities.filter(u=>u.side===side)];
}
function elevationSvg(){
  const room=state.studio.room,side=room.selectedWall||'south',length=wallLength(side),height=room.heightMm||2800;
  const W=760,H=400,padX=34,padTop=26,padBottom=34,sx=(W-padX*2)/length,sy=(H-padTop-padBottom)/height;
  const unknownY=H-padBottom-14;
  const objects=wallObjects(side).map(o=>{
    const offset=wallObjectOffset(o,side),isUtil='offsetMm' in o,z=o.zMm,heightMm=o.heightMm,known=z!=null&&heightMm!=null;
    const x=padX+offset*sx;
    if(isUtil){
      const cy=known?H-padBottom-z*sy:unknownY,sel=o.id===room.selectedFeatureId;
      const label=o.kind==='water'?'W':o.kind==='drain'?'D':o.kind==='power'?'⚡':o.kind==='hood_vent'?'V':o.kind==='gas'?'G':'U';
      return `<g data-elev-id="${esc(o.id)}" class="elev-util ${sel?'selected':''} ${known?'known':'unknown'}"><circle cx="${x}" cy="${cy}" r="11"/><text x="${x}" y="${cy+4}" text-anchor="middle">${label}</text><text class="elev-z" x="${x+15}" y="${cy+4}">${known?`Z ${z}`:'Z ?'}</text></g>`;
    }
    const width=o.widthMm||100,w=Math.max(8,width*sx),y=known?H-padBottom-(z+heightMm)*sy:unknownY-20,h=known?Math.max(8,heightMm*sy):20,sel=o.id===room.selectedFeatureId;
    const label=o.kind==='door'?'Дверь':o.kind==='window'?'Окно':'Радиатор';
    return `<g data-elev-id="${esc(o.id)}" class="elev-object ${sel?'selected':''} ${known?'known':'unknown'}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle">${esc(label)}</text><text class="elev-z" x="${x+w/2}" y="${Math.max(12,y-5)}" text-anchor="middle">${known?`Z ${z} · H ${heightMm}`:'Z/H ?'}</text></g>`;
  }).join('');
  const grid=[500,1000,1500,2000,2500,3000].filter(z=>z<height).map(z=>{const y=H-padBottom-z*sy;return `<line class="elev-grid" x1="${padX}" x2="${W-padX}" y1="${y}" y2="${y}"/><text class="elev-grid-label" x="${padX-5}" y="${y+3}" text-anchor="end">${z}</text>`}).join('');
  return `<svg id="wallElevationSvg" viewBox="0 0 ${W} ${H}" data-wall="${side}"><rect class="elev-wall" x="${padX}" y="${padTop}" width="${length*sx}" height="${height*sy}"/>${grid}<line class="elev-floor" x1="${padX}" x2="${W-padX}" y1="${H-padBottom}" y2="${H-padBottom}"/><text class="room-dim" x="${W/2}" y="${H-9}" text-anchor="middle">${length} мм · ${side.toUpperCase()}</text>${objects}</svg>`;
}
function bindElevationSelection(){
  const svg=$('wallElevationSvg');if(!svg)return;
  svg.querySelectorAll('[data-elev-id]').forEach(g=>g.addEventListener('click',()=>{state.studio.room.selectedFeatureId=g.dataset.elevId;renderKitchenStudio()}));
}
function setSelectedWall(side){state.studio.room.selectedWall=side;renderKitchenStudio()}

function roomInspector(){
  const o=selectedRoomObject();if(!o)return `<div class="room-inspector empty"><strong>Выберите объект</strong><p>PLAN задаёт X/Y, ELEVATION — Z и высоту.</p></div>`;
  const vertical=`<div class="vertical-fields"><strong>Вертикальные размеры</strong><label>Z от пола, мм<input data-room-field="zMm" type="number" placeholder="UNKNOWN" value="${o.zMm??''}"></label><label>Высота объекта, мм<input data-room-field="heightMm" type="number" placeholder="UNKNOWN" value="${o.heightMm??''}"></label><small>${o.verticalState==='confirmed'?'CONFIRMED':'UNKNOWN — не участвует как подтверждённая высота'}</small></div>`;
  if('side' in o && 'offsetMm' in o)return `<div class="room-inspector"><h4>${esc(o.kind.toUpperCase())}</h4><label>Стена<select data-room-field="side">${['south','north','west','east'].map(x=>`<option value="${x}" ${o.side===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Смещение, мм<input data-room-field="offsetMm" type="number" value="${o.offsetMm}"></label><label>Допуск, мм<input data-room-field="toleranceMm" type="number" value="${o.toleranceMm||0}"></label>${vertical}<button id="roomDelete" class="secondary">Удалить</button></div>`;
  const wallField=['door','window','radiator'].includes(o.kind)?`<label>Стена<select data-room-field="side">${['south','north','west','east'].map(x=>`<option value="${x}" ${o.side===x?'selected':''}>${x}</option>`).join('')}</select></label>`:'';
  return `<div class="room-inspector"><h4>${esc(o.kind.toUpperCase())}</h4><div class="room-inspector-grid">${wallField}<label>X, мм<input data-room-field="xMm" type="number" value="${o.xMm}"></label><label>Y, мм<input data-room-field="yMm" type="number" value="${o.yMm}"></label><label>Ширина<input data-room-field="widthMm" type="number" value="${o.widthMm}"></label><label>Глубина<input data-room-field="depthMm" type="number" value="${o.depthMm}"></label><label>Зазор<input data-room-field="clearanceMm" type="number" value="${o.clearanceMm||0}"></label>${o.kind==='door'?`<label>Зона двери W<input data-room-field="openingWidthMm" type="number" value="${o.openingWidthMm||o.widthMm}"></label><label>Зона двери D<input data-room-field="openingDepthMm" type="number" value="${o.openingDepthMm||900}"></label>`:''}</div>${vertical}<button id="roomDelete" class="secondary">Удалить</button></div>`;
}

function renderKitchenStudio(){
  const host=$('htmlStage'),r=state.studio.result,room=state.studio.room;
  const featuresCount=room.features.length,utilitiesCount=room.utilities.length;
  host.innerHTML=`<div class="studio-shell"><div class="studio-hero"><div><span class="eyebrow">MAKSTER AI 5.6.0</span><h1>Kitchen Design Studio</h1><p>Нарисуйте реальные условия помещения. Top 3 строятся из этой же сцены — без отдельного JSON и без повторного ввода.</p></div><div class="studio-form"><label>Ширина комнаты, мм<input id="studioW" type="number" value="${room.widthMm}"></label><label>Глубина комнаты, мм<input id="studioD" type="number" value="${room.depthMm}"></label><label>Высота помещения, мм<input id="studioH" type="number" placeholder="UNKNOWN" value="${room.heightMm??''}"></label><label>Мин. проход, мм<input id="studioAisle" type="number" value="${room.minAisleMm}"></label><button id="studioGenerate">Сгенерировать Top 3</button></div></div><div class="room-editor-shell"><div class="room-toolbox"><strong>Помещение</strong><button data-room-add="door">+ Дверь</button><button data-room-add="window">+ Окно</button><button data-room-add="radiator">+ Радиатор</button><button data-room-add="column">+ Колонна</button><button data-room-add="shaft">+ Шахта/короб</button><strong>Коммуникации</strong><button data-util-add="water">+ Вода</button><button data-util-add="drain">+ Слив</button><button data-util-add="power">+ Электрика</button><button data-util-add="hood_vent">+ Вытяжка</button><button data-util-add="gas">+ Газ</button><div class="room-scene-summary"><span>${featuresCount} объектов</span><span>${utilitiesCount} коммуникаций</span></div></div><div class="room-editor-main"><div id="roomEditorWrap" class="room-editor-wrap">${roomEditorSvg()}</div><p class="room-editor-hint">Перетащите объект мышкой. Точные размеры и координаты задаются справа.</p></div><div id="roomInspectorWrap">${roomInspector()}</div></div><div class="wall-elevation-shell"><div class="wall-elevation-head"><div><span class="eyebrow">WALL ELEVATION</span><h3>Развёртка стены</h3><p>Положение по стене берётся из PLAN. Здесь задаются только Z и высота.</p></div><div class="wall-tabs">${['south','north','west','east'].map(w=>`<button data-wall-side="${w}" class="${room.selectedWall===w?'active':''}">${w.toUpperCase()}</button>`).join('')}</div></div><div class="wall-elevation-canvas">${elevationSvg()}</div><p class="room-editor-hint">Объекты с Z/H ? ещё не имеют подтверждённых вертикальных размеров и не должны использоваться для точной коллизии по высоте.</p></div><div class="studio-viewbar"><strong>${r?`${r.generatedCount} сгенерировано · ${r.readyCount} READY · Top ${r.topDesigns.length}`:'После расстановки помещения запустите генерацию'}</strong><div class="view-switch"><button data-studio-view="plan" class="${state.studio.view==='plan'?'active':''}">PLAN</button><button data-studio-view="front" class="${state.studio.view==='front'?'active':''}">FRONT</button><button data-studio-view="3d" class="${state.studio.view==='3d'?'active':''}">3D</button></div></div><div id="studioResults" class="studio-results">${r?r.topDesigns.map(v=>`<article class="studio-variant ${v.id===r.recommended?.id?'recommended':''}"><div class="studio-variant-head"><div><span class="rank">#${v.rank}</span><h2>${esc(studioKindLabel(v.kind))}</h2><small>${esc(studioStrategyLabel(v.strategy))} · пеналы: ${esc(v.tallPositionMode)}</small></div><div class="score-ring"><strong>${v.score.total}</strong><span>/100</span></div></div>${studioPreview(v)}${studioScoreBars(v)}<div class="studio-reasons"><strong>${v.id===r.recommended?.id?'Рекомендуемый вариант':'Почему в Top 3'}</strong><p>${esc(v.reasons.slice(-2).join(' '))}</p></div><button class="studio-apply" data-studio-apply="${esc(v.id)}">Выбрать и открыть как проект →</button></article>`).join(''):`<div class="studio-empty"><strong>Top 3 появятся здесь</strong><p>Двери, радиаторы, шахты и коммуникации уже участвуют в Constraint/Utility Engine.</p></div>`}</div></div>`;
  $('studioW')?.addEventListener('change',e=>{room.widthMm=Math.max(2400,Number(e.target.value)||room.widthMm);renderKitchenStudio()});
  $('studioD')?.addEventListener('change',e=>{room.depthMm=Math.max(1800,Number(e.target.value)||room.depthMm);renderKitchenStudio()});$('studioH')?.addEventListener('change',e=>{room.heightMm=e.target.value===''?null:Math.max(1800,Number(e.target.value)||0);renderKitchenStudio()});
  $('studioAisle')?.addEventListener('change',e=>room.minAisleMm=Math.max(700,Number(e.target.value)||room.minAisleMm));
  $('studioGenerate')?.addEventListener('click',generateKitchenStudio);
  host.querySelectorAll('[data-room-add]').forEach(b=>b.addEventListener('click',()=>addRoomFeature(b.dataset.roomAdd)));
  host.querySelectorAll('[data-util-add]').forEach(b=>b.addEventListener('click',()=>addRoomUtility(b.dataset.utilAdd)));
  host.querySelectorAll('[data-room-field]').forEach(el=>el.addEventListener('change',()=>updateSelectedRoomObject(el.dataset.roomField,el.value)));
  $('roomDelete')?.addEventListener('click',removeSelectedRoomFeature);
  host.querySelectorAll('[data-wall-side]').forEach(b=>b.addEventListener('click',()=>setSelectedWall(b.dataset.wallSide)));bindElevationSelection();host.querySelectorAll('[data-studio-view]').forEach(b=>b.addEventListener('click',()=>{state.studio.view=b.dataset.studioView;renderKitchenStudio()}));
  host.querySelectorAll('[data-studio-apply]').forEach(b=>b.addEventListener('click',()=>applyKitchenStudioVariant(b.dataset.studioApply)));
  bindRoomEditorDrag();
}


async function loadCatalog(mode=state.catalog.mode){
  state.catalog.mode=mode; state.catalog.result=null; state.catalog.auto=null; state.catalog.selected=null;
  try{
    const data=await api(mode==='hardware'?'/api/v1/catalogs/hardware':'/api/v1/catalogs/appliances');
    state.catalog.items=data.items||[]; renderCatalog();
  }catch(e){msg(`Catalog: ${e.message}`,'ai')}
}
function catalogItemLabel(x){return state.catalog.mode==='hardware'?`${x.manufacturer} · ${x.family}${x.code?` · ${x.code}`:''}`:`${x.manufacturer} · ${x.model} · ${x.kind}`}
function catalogTrustLabel(x){return x.trust==='manufacturer_verified'?'VERIFIED':x.trust==='project_verified'?'PROJECT VERIFIED':x.trust==='planning_only'?'PLANNING ONLY':'UNVERIFIED'}
function renderCompatibilityResult(r){
  if(!r)return '';
  const issueHtml=(r.issues||[]).map(i=>`<div class="business-alert"><strong>${esc(i.severity.toUpperCase())} · ${esc(i.code)}</strong><p>${esc(i.message)}</p></div>`).join('');
  const alt=(r.alternatives||[]).map(a=>`<li><strong>${esc(a.manufacturer)} · ${esc(a.label)}</strong> — ${a.score}/100</li>`).join('');
  return `<div class="card"><h3>Compatibility · ${esc(r.status.toUpperCase())} · ${r.score}/100</h3><div class="card-body">${issueHtml||'<p class="meta-note">Проверенные ограничения не конфликтуют.</p>'}${alt?`<h4>Допустимые альтернативы</h4><ul>${alt}</ul>`:''}</div></div>`;
}
async function checkCatalogCompatibility(){
  const x=state.catalog.selected;if(!x)return;
  try{
    let context;
    if(state.catalog.mode==='hardware'){
      context={role:x.role};
      const f=Number($('catFront')?.value); if(f)context.frontThicknessMm=f;
      const l=Number($('catLength')?.value); if(l)context.desiredNominalLengthMm=l;
      const kg=Number($('catLoad')?.value); if(kg)context.expectedDynamicLoadKg=kg;
      context.requireProductionDrilling=Boolean($('catDrill')?.checked);
      state.catalog.result=await api('/api/v1/catalogs/hardware/compatibility',{method:'POST',body:JSON.stringify({id:x.id,context})});
    }else{
      context={kind:x.kind};
      const w=Number($('catNicheW')?.value);if(w)context.nicheWidthMm=w;
      const h=Number($('catNicheH')?.value);if(h)context.nicheHeightMm=h;
      const d=Number($('catNicheD')?.value);if(d)context.nicheDepthMm=d;
      const v=Number($('catVent')?.value);if(v)context.ventilationAreaCm2=v;
      state.catalog.result=await api('/api/v1/catalogs/appliances/compatibility',{method:'POST',body:JSON.stringify({id:x.id,context})});
    }
    renderCatalog();
  }catch(e){msg(`Compatibility: ${e.message}`,'ai')}
}
function selectCatalogItem(id){state.catalog.selected=state.catalog.items.find(x=>x.id===id)||null;state.catalog.result=null;state.catalog.auto=null;renderCatalog()}

async function autoSelectCatalog(){
  try{
    if(state.catalog.mode==='hardware'){
      const role=state.catalog.selected?.role||'runner';
      const body={role,maxResults:3};
      const f=Number($('catFront')?.value);if(f)body.frontThicknessMm=f;
      const l=Number($('catLength')?.value);if(l)body.desiredNominalLengthMm=l;
      const kg=Number($('catLoad')?.value);if(kg)body.expectedDynamicLoadKg=kg;
      body.requireProductionDrilling=Boolean($('catDrill')?.checked);
      state.catalog.auto=await api('/api/v1/catalogs/hardware/auto-select',{method:'POST',body:JSON.stringify(body)});
    }else{
      const kind=state.catalog.selected?.kind||'dishwasher';
      const body={kind,maxResults:3};
      const w=Number($('catNicheW')?.value);if(w)body.nicheWidthMm=w;
      const h=Number($('catNicheH')?.value);if(h)body.nicheHeightMm=h;
      const d=Number($('catNicheD')?.value);if(d)body.nicheDepthMm=d;
      const v=Number($('catVent')?.value);if(v)body.ventilationAreaCm2=v;
      state.catalog.auto=await api('/api/v1/catalogs/appliances/auto-select',{method:'POST',body:JSON.stringify(body)});
    }
    renderCatalog();
  }catch(e){msg(`Auto-select: ${e.message}`,'ai')}
}
function renderAutoSelection(r){
  if(!r)return '';
  const rows=(r.candidates||[]).map((c,i)=>`<div class="business-alert"><strong>#${i+1} · ${esc(state.catalog.mode==='hardware'?`${c.record.manufacturer} ${c.record.family}${c.record.code?` · ${c.record.code}`:''}`:`${c.record.manufacturer} ${c.record.model}`)} · ${c.selectionScore}/100</strong><p>${esc(c.compatibilityStatus.toUpperCase())}${c.productionReady?' · production-ready':''}</p><p>${esc((c.reasons||[]).join(' '))}</p></div>`).join('');
  return `<div class="card"><h3>Auto Selection · ${r.ready?'READY':'REVIEW'}</h3><div class="card-body">${rows||'<p class="meta-note">Совместимых кандидатов в текущем подтверждённом каталоге нет.</p>'}</div></div>`;
}


async function analyzeCurrentProjectCatalog(){
  if(!state.project){msg('Catalog: сначала откройте или создайте проект.','ai');return}
  try{
    state.catalog.projectReport=await api(`/api/v1/projects/${state.project.id}/catalog-auto-selection`);
    renderCatalog();
  }catch(e){msg(`Project Auto-Selection: ${e.message}`,'ai')}
}
function renderProjectCatalogReport(r){
  if(!r)return '';
  const rows=(r.recommendations||[]).map((x,i)=>{
    const c=x.result?.recommended;
    const label=!c?'нет подтверждённого кандидата':x.target==='appliance'?`${c.record.manufacturer} ${c.record.model}`:`${c.record.manufacturer} ${c.record.family}${c.record.code?` · ${c.record.code}`:''}`;
    const canApply=Boolean(c&&c.compatibilityStatus==='compatible');
    const apply=canApply?`<button class="secondary small" data-project-assign="${i}">Применить → новая Revision</button>`:'';
    return `<div class="business-alert"><strong>#${i+1} · ${esc(x.target.toUpperCase())} · ${esc(x.moduleLibraryId||x.moduleId)}</strong><p>${esc(x.note)}</p><p>${esc(label)}${c?` · ${c.compatibilityStatus} · ${c.selectionScore}/100`:''}</p>${apply}</div>`;
  }).join('');
  return `<div class="card"><h3>Project-Aware Auto Selection · ${r.readyCount}/${r.recommendations.length} READY</h3><div class="card-body"><p class="meta-note">Назначение выполняется только после нажатия «Применить» и всегда создаёт новую Project Revision.</p>${rows||'<p class="meta-note">В проекте нет целей для автоподбора.</p>'}</div></div>`;
}
async function applyProjectCatalogRecommendation(index){
  const report=state.catalog.projectReport,r=report?.recommendations?.[index],c=r?.result?.recommended;
  if(!state.project||!r||!c)return;
  try{
    const body={approved:true,approvedBy:'web-user',furnitureId:r.furnitureId,moduleId:r.moduleId,target:r.target,candidateId:c.record.id};
    if(r.targetRefId)body.targetRefId=r.targetRefId;
    if(r.applianceIndex!=null)body.applianceIndex=r.applianceIndex;
    const out=await api(`/api/v1/projects/${state.project.id}/catalog-assignment/apply`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.previewScene=null;
    await loadProjects();await analyzeCurrentProjectCatalog();renderAll();loadHistory();
    msg(`Catalog: ${r.target} → ${c.record.id} применён. Создана Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Catalog assignment: ${e.message}`,'ai')}
}










async function recordConflictDecision(id){
  if(!state.project)return;
  const s=state.conflictResolution?.suggestions?.find(x=>x.id===id);if(!s)return;
  const note=prompt(s.decisionPolicy==='record_site_task'?'Комментарий для монтажной задачи (необязательно):':'Зафиксируйте принятое конструктивное решение:','')??'';
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/installation-decisions`,{method:'POST',body:JSON.stringify({
      approved:true,expectedRevision:state.project.snapshot.revision,suggestionId:id,approvedBy:'web-user',note
    })});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.installationCheck=out.installationCheck;
    state.conflictResolution=null;state.productionReadiness=null;
    await loadProjects();await loadConflictResolution();renderAll();loadHistory();
    msg(`Installation decision: ${out.decision.kind} сохранено в Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Installation decision: ${e.message}`,'ai')}
}
async function completeSiteDecision(id){
  if(!state.project)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/installation-decisions/${id}/complete`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,completedBy:'web-user'})});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.conflictResolution=null;state.productionReadiness=null;
    await loadProjects();await loadConflictResolution();renderAll();loadHistory();
    msg(`Site task отмечена выполненной → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Complete site task: ${e.message}`,'ai')}
}



async function installerProposeChange(){
  if(!state.project)return;
  const furniture=state.project.snapshot.furniture||[];
  if(!furniture.length){msg('Site change: в проекте нет мебели.','ai');return}
  const list=furniture.map((f,i)=>`${i}: ${f.name||f.kind}`).join('\n');
  const ix=Number(prompt(`Какую мебель изменить?\n${list}`,'0'));
  const f=furniture[ix];if(!f)return;
  const title=prompt('Название изменения:','Сдвиг мебели по факту объекта')??'';if(!title.trim())return;
  const reason=prompt('Причина изменения:','')??'';if(!reason.trim())return;
  const cur=f.transform.position;
  const x=prompt('Новая X, мм (пусто = без изменения):','')??'';
  const y=prompt('Новая Y, мм (пусто = без изменения):','')??'';
  const z=prompt('Новая Z, мм (пусто = без изменения):','')??'';
  try{
    const body={expectedRevision:state.project.snapshot.revision,title,reason,requestedBy:'installer',targetFurnitureId:f.id};
    if(x.trim())body.xMm=Number(x);if(y.trim())body.yMm=Number(y);if(z.trim())body.zMm=Number(z);
    const out=await api(`/api/v1/projects/${state.project.id}/site-change-requests`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.scene=out.visualScene;state.installerMode=null;await loadProjects();await loadInstallerMode();renderAll();loadHistory();
    msg(`Site change request создан → Revision ${state.project.snapshot.revision}. Геометрия пока НЕ изменена.`,'meta');
  }catch(e){msg(`Site change request: ${e.message}`,'ai')}
}
async function installerReviewChange(id,approved){
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/site-change-requests/${id}/review`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,approved,reviewedBy:'designer'})});
    state.project=out.project;state.scene=out.visualScene;state.installerMode=null;await loadProjects();await loadInstallerMode();renderAll();loadHistory();
    msg(`Site change: ${approved?'утверждено':'отклонено'} → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Site change review: ${e.message}`,'ai')}
}
async function installerApplyChange(id){
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/site-change-requests/${id}/apply`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,appliedBy:'installer'})});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.installerMode=null;state.installationCheck=out.after;state.productionReadiness=null;
    await loadProjects();await loadInstallerMode();renderAll();loadHistory();
    msg(`As-built: изменение применено → Revision ${state.project.snapshot.revision}; blockers ${out.before.blockingCount} → ${out.after.blockingCount}.`,'meta');
  }catch(e){msg(`Apply site change: ${e.message}`,'ai')}
}


async function loadInstallationCloseout(){
  if(!state.project){state.installationCloseout=null;return}
  try{state.installationCloseout=await api(`/api/v1/projects/${state.project.id}/installation-closeout`)}
  catch(e){msg(`Closeout: ${e.message}`,'ai')}
}
async function addPunch(){
  const title=prompt('Замечание / punch item:','')??'';if(!title.trim())return;
  const detail=prompt('Что нужно исправить:','')??'';if(!detail.trim())return;
  const severity=(prompt('minor / major','minor')||'minor').toLowerCase();
  const out=await api(`/api/v1/projects/${state.project.id}/punch-list`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,severity:severity==='major'?'major':'minor',title,detail,createdBy:'installer'})});
  state.project=out.project;state.installationCloseout=out.closeout;await loadProjects();renderAll();loadHistory();renderInstallerMode();
}
async function closePunch(id){
  const out=await api(`/api/v1/projects/${state.project.id}/punch-list/${id}/close`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,closedBy:'installer'})});
  state.project=out.project;state.installationCloseout=out.closeout;await loadProjects();renderAll();loadHistory();renderInstallerMode();
}
async function signHandover(){
  const clientName=prompt('Имя клиента / принимающего:','')??'';if(!clientName.trim())return;
  const notes=prompt('Комментарий к приёмке (необязательно):','')??'';
  const out=await api(`/api/v1/projects/${state.project.id}/installation-handover/sign`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,signedBy:clientName,clientName,installerName:'installer',notes})});
  state.project=out.project;state.installationCloseout=out.closeout;await loadProjects();renderAll();loadHistory();renderInstallerMode();
}


const JOB_STAGES=['lead','measurement','design','client_approval','contract','deposit','purchasing','production','delivery','installation','handover','final_payment','warranty','closed'];
const jobStageLabel=s=>({
  lead:'Лид',measurement:'Замер',design:'Проектирование',client_approval:'Согласование',
  contract:'Договор',deposit:'Аванс',purchasing:'Закупки',production:'Производство',
  delivery:'Доставка',installation:'Монтаж',handover:'Приёмка',final_payment:'Финальный расчёт',
  warranty:'Гарантия',closed:'Закрыт'
}[s]||s);





async function loadClientShareLinks(){
  if(!state.project){state.clientShareLinks=null;return}
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/client-share-links`);
    state.clientShareLinks=out.links||[];
  }catch(e){msg(`Client share links: ${e.message}`,'ai')}
}
async function createClientShare(){
  if(!state.project)return;
  const days=Number(prompt('Срок действия ссылки, дней:','7')||7);
  const oneTime=(prompt('Одноразовая ссылка для одного ответа? yes / no','no')||'no').toLowerCase().startsWith('y');
  const allow=(prompt('Разрешить клиенту отвечать на согласования? yes / no','yes')||'yes').toLowerCase().startsWith('y');
  const label=prompt('Метка ссылки (необязательно):','Клиент')??'';
  const expiresAt=new Date(Date.now()+Math.max(1,days)*86400000).toISOString();
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/client-share-links`,{method:'POST',body:JSON.stringify({
      expectedRevision:state.project.snapshot.revision,createdBy:'owner',expiresAt,oneTime,allowApprovalResponses:allow,label
    })});
    state.project=out.project;state.lastClientSharePath=out.sharePath;
    await loadClientShareLinks();await loadProjects();renderAll();loadHistory();renderClientPortal();
    try{await navigator.clipboard.writeText(location.origin+out.sharePath);msg('Client share: новая ссылка скопирована в буфер обмена.','meta')}catch{msg(`Client share: ${location.origin+out.sharePath}`,'meta')}
  }catch(e){msg(`Create client share: ${e.message}`,'ai')}
}
async function revokeClientShare(id){
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/client-share-links/${id}/revoke`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision})});
    state.project=out.project;state.clientShareLinks=out.links;state.lastClientSharePath=null;
    await loadProjects();renderAll();loadHistory();renderClientPortal();
  }catch(e){msg(`Revoke client share: ${e.message}`,'ai')}
}
function copyClientShare(path){
  const value=location.origin+path;
  navigator.clipboard?.writeText(value).then(()=>msg('Client share URL скопирован.','meta')).catch(()=>msg(value,'meta'));
}


async function loadReleaseGate(){
  if(!state.project){state.lifecycleGate=null;renderReleaseGate();return}
  try{
    state.lifecycleGate=await api(`/api/v1/projects/${state.project.id}/lifecycle-release-gate`);
    renderReleaseGate();
  }catch(e){msg(`Release Gate: ${e.message}`,'ai')}
}
function renderReleaseGate(){
  const host=$('htmlStage'),r=state.lifecycleGate;
  if(state.project&&!r&&!state._releaseGateLoading){
    state._releaseGateLoading=true;
    api(`/api/v1/projects/${state.project.id}/lifecycle-release-gate`).then(x=>{
      state.lifecycleGate=x;state._releaseGateLoading=false;renderReleaseGate()
    }).catch(e=>{state._releaseGateLoading=false;msg(`Release Gate: ${e.message}`,'ai')});
  }
  if(!state.project){
    host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Lifecycle Release Gate проверяет весь заказ целиком.</p></div></div>';return
  }
  const gates=(r?.gates||[]).map(g=>`<div class="release-gate-row ${esc(g.status)}"><div class="release-gate-icon">${g.status==='pass'?'✓':g.status==='warning'?'!':g.status==='not_applicable'?'—':'×'}</div><div><strong>${esc(g.title)}</strong><p>${esc(g.detail)}</p><small>${esc(g.code)} · ${esc(g.status.toUpperCase())}</small></div></div>`).join('');
  host.innerHTML=`<div class="dashboard"><div class="release-hero ${r?.overallStatus?.toLowerCase()||'red'}"><div><span class="eyebrow">MAKSTER AI 3.5 · REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Project Lifecycle Release Gate</h2><p>Не отдельный технический тест, а единая проверка всего заказа: клиент, деньги, инженерия, закупки, монтаж и закрытие.</p></div><div class="release-state"><strong>${esc(r?.overallStatus||'—')}</strong><span>${esc(r?.releaseState||'DRAFT')}</span></div></div>
  <div class="metrics"><div class="metric good"><label>PASS</label><strong>${r?.passCount??0}</strong></div><div class="metric"><label>WARN</label><strong>${r?.warningCount??0}</strong></div><div class="metric bad"><label>FAIL</label><strong>${r?.failCount??0}</strong></div><div class="metric"><label>Revision</label><strong>${r?.revision??state.project.snapshot.revision}</strong></div></div>
  <div class="card"><h3>Следующее критическое действие</h3><div class="card-body"><div class="next-action"><strong>${esc(r?.nextCriticalAction||'—')}</strong></div><button id="releaseGateRefresh" class="secondary">Перепроверить</button></div></div>
  <div class="card"><h3>Lifecycle Gates</h3><div class="card-body">${gates||'<p class="meta-note">Нет данных.</p>'}</div></div></div>`;
  $('releaseGateRefresh')?.addEventListener('click',()=>{state.lifecycleGate=null;loadReleaseGate()});
}

async function loadClientPortal(){
  if(!state.project){state.clientPortal=null;renderClientPortal();return}
  try{state.clientPortal=await api(`/api/v1/projects/${state.project.id}/client-portal`);await loadClientShareLinks();renderClientPortal()}
  catch(e){msg(`Client Portal: ${e.message}`,'ai')}
}
async function saveClientPortalSettings(){
  if(!state.project)return;
  const body={
    expectedRevision:state.project.snapshot.revision,
    enabled:Boolean($('cpEnabled')?.checked),
    publicTitle:$('cpTitle')?.value||'',
    welcomeText:$('cpWelcome')?.value||'',
    showContractValue:Boolean($('cpShowContract')?.checked),
    showPayments:Boolean($('cpShowPayments')?.checked),
    showTargetDates:Boolean($('cpShowDates')?.checked),
    showMilestones:Boolean($('cpShowMilestones')?.checked)
  };
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/client-portal`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.clientPortal=out.clientPortal;state.jobControl=null;
    await loadProjects();renderAll();loadHistory();renderClientPortal();
  }catch(e){msg(`Client Portal settings: ${e.message}`,'ai')}
}
async function createClientApproval(){
  const kind=(prompt('Тип согласования: design / materials / commercial / change / handover_precheck','design')||'design').trim();
  const title=prompt('Что клиент должен согласовать:','Утвердить текущий дизайн')??'';if(!title.trim())return;
  const description=prompt('Описание для клиента:','Пожалуйста, проверьте проект и подтвердите решение.')??'';if(!description.trim())return;
  const amountText=prompt('Сумма для клиента (необязательно, в валюте проекта):','')??'';
  const body={expectedRevision:state.project.snapshot.revision,kind,title,description,requestedBy:'designer'};
  if(amountText.trim())body.clientAmountMinor=Math.round(Number(amountText)*100);
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/client-approvals`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.clientPortal=out.clientPortal;state.jobControl=null;
    await loadProjects();renderAll();loadHistory();renderClientPortal();
  }catch(e){msg(`Client approval: ${e.message}`,'ai')}
}
async function respondClientApproval(id,approved){
  const comment=prompt(approved?'Комментарий клиента (необязательно):':'Что нужно изменить:','')??'';
  const respondedBy=state.clientPortal?.client?.name||'client';
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/client-approvals/${id}/respond`,{method:'POST',body:JSON.stringify({
      expectedRevision:state.project.snapshot.revision,approved,respondedBy,comment
    })});
    state.project=out.project;state.clientPortal=out.clientPortal;state.jobControl=out.jobControl;
    await loadProjects();renderAll();loadHistory();renderClientPortal();
    msg(`Client approval: ${approved?'APPROVED':'CHANGES REQUESTED'} → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Client response: ${e.message}`,'ai')}
}
function renderClientPortal(){
  const host=$('htmlStage'),v=state.clientPortal,portal=state.project?.snapshot?.clientPortal;
  if(state.project&&!v&&!state._clientPortalLoading){
    state._clientPortalLoading=true;
    api(`/api/v1/projects/${state.project.id}/client-portal`).then(x=>{state.clientPortal=x;state._clientPortalLoading=false;renderClientPortal()}).catch(e=>{state._clientPortalLoading=false;msg(`Client Portal: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Client Portal показывает только публичную часть заказа.</p></div></div>';return}
  const currency=v?.commercial?.currency||state.project.snapshot.currency||'EUR';
  const money=x=>new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format((Number(x)||0)/100);
  const approvals=(v?.approvals||[]).map(a=>`<div class="client-approval ${a.status}"><div><strong>${esc(a.title)}</strong><p>${esc(a.description)}</p><small>${esc(a.kind.toUpperCase())} · ${esc(a.status.toUpperCase())} · Revision ${a.sourceRevision}${a.clientAmountMinor!=null?` · ${money(a.clientAmountMinor)}`:''}</small>${a.responseComment?`<p class="client-comment">Комментарий: ${esc(a.responseComment)}</p>`:''}</div><div>${a.status==='pending'?`<button class="small" data-client-approve="${esc(a.id)}">Утвердить</button><button class="secondary small" data-client-change="${esc(a.id)}">Нужны изменения</button>`:`<span class="pill ${a.status==='approved'?'good':a.status==='changes_requested'?'warn':''}">${esc(a.status.toUpperCase())}</span>`}</div></div>`).join('');
  const milestones=(v?.milestones||[]).map(m=>`<div class="client-milestone"><strong>${esc(m.title)}</strong><span>${esc(m.status.toUpperCase())}</span></div>`).join('');
  const shareLinks=(state.clientShareLinks||[]).map(l=>`<div class="client-approval ${l.status}"><div><strong>${esc(l.label||'Client link')}</strong><p><small>${esc(l.status.toUpperCase())} · created ${esc(l.createdAt)}${l.expiresAt?` · expires ${esc(l.expiresAt)}`:''} · ${l.oneTime?'ONE-TIME':'REUSABLE'} · ${l.allowApprovalResponses?`APPROVALS ${l.approvalCount??0}`:'READ ONLY'}</small></p></div><div>${l.status==='active'?`<button class="secondary small" data-share-revoke="${esc(l.id)}">Отозвать</button>`:`<span class="pill">${esc(l.status.toUpperCase())}</span>`}</div></div>`).join('');

  host.innerHTML=`<div class="dashboard"><div class="client-portal-admin"><div><span class="eyebrow">MAKSTER AI 3.3</span><h2>Client Portal & Approval Center</h2><p>Слева — настройки владельца. Ниже — точный публичный preview того, что увидит клиент.</p></div><div class="client-portal-status ${v?.enabled?'enabled':'disabled'}">${v?.enabled?'ENABLED':'DISABLED'}</div></div>
  <div class="job-grid"><div class="card"><h3>Portal settings</h3><div class="card-body"><div class="job-form">
    <label><span>Portal enabled</span><input id="cpEnabled" type="checkbox" ${portal?.enabled?'checked':''}></label>
    <label>Публичное название<input id="cpTitle" value="${esc(portal?.publicTitle||state.project.snapshot.title)}"></label>
    <label class="wide">Приветствие<textarea id="cpWelcome">${esc(portal?.welcomeText||'')}</textarea></label>
    <label><span>Показывать сумму договора</span><input id="cpShowContract" type="checkbox" ${portal?.showContractValue!==false?'checked':''}></label>
    <label><span>Показывать оплаты</span><input id="cpShowPayments" type="checkbox" ${portal?.showPayments!==false?'checked':''}></label>
    <label><span>Показывать сроки</span><input id="cpShowDates" type="checkbox" ${portal?.showTargetDates!==false?'checked':''}></label>
    <label><span>Показывать milestones</span><input id="cpShowMilestones" type="checkbox" ${portal?.showMilestones!==false?'checked':''}></label>
    <button id="cpSave">Сохранить Portal</button><button id="cpRequest" class="secondary">+ Запросить согласование</button>
  </div></div></div>
  <div class="card client-preview"><h3>Public Preview</h3><div class="card-body"><span class="eyebrow">CLIENT VIEW · REVISION ${v?.revision??state.project.snapshot.revision}</span><h2>${esc(v?.title||state.project.snapshot.title)}</h2>${v?.welcomeText?`<p>${esc(v.welcomeText)}</p>`:''}<div class="client-progress"><div style="width:${v?.stageProgressPercent??0}%"></div></div><p><strong>Этап:</strong> ${esc(jobStageLabel(v?.projectStage||'lead'))}</p><p><strong>Объект:</strong> ${esc(v?.client?.objectAddress||'—')}</p>${v?.commercial?`<div class="metrics">${v.commercial.contractValueMinor!=null?`<div class="metric"><label>Договор</label><strong>${money(v.commercial.contractValueMinor)}</strong></div>`:''}${v.commercial.receivedMinor!=null?`<div class="metric good"><label>Оплачено</label><strong>${money(v.commercial.receivedMinor)}</strong></div><div class="metric"><label>Остаток</label><strong>${money(v.commercial.outstandingMinor)}</strong></div>`:''}</div>`:''}<p class="meta-note">Внутренние закупочные цены, себестоимость, маржа, supplier orders и Engineering blockers в этот view не входят.</p></div></div></div>
  <div class="card"><h3>Secure Share Links</h3><div class="card-body"><button id="cpShareCreate">+ Создать внешнюю ссылку</button>${state.lastClientSharePath?`<div class="business-alert"><strong>Новая ссылка показана только сейчас</strong><p>${esc(location.origin+state.lastClientSharePath)}</p><button id="cpShareCopy" class="secondary small">Копировать</button></div>`:''}${shareLinks||'<p class="meta-note">Активных внешних ссылок пока нет.</p>'}<p class="meta-note">Секретный токен не хранится в открытом виде и после создания повторно не показывается.</p></div></div>
  <div class="card"><h3>Client Approvals · pending ${v?.pendingApprovalCount??0}</h3><div class="card-body">${approvals||'<p class="meta-note">Запросов на согласование пока нет.</p>'}</div></div>
  ${milestones?`<div class="card"><h3>Public Milestones</h3><div class="card-body">${milestones}</div></div>`:''}</div>`;
  $('cpSave')?.addEventListener('click',saveClientPortalSettings);
  $('cpRequest')?.addEventListener('click',createClientApproval);
  $('cpShareCreate')?.addEventListener('click',createClientShare);
  $('cpShareCopy')?.addEventListener('click',()=>state.lastClientSharePath&&copyClientShare(state.lastClientSharePath));
  host.querySelectorAll('[data-share-revoke]').forEach(b=>b.addEventListener('click',()=>revokeClientShare(b.dataset.shareRevoke)));
  host.querySelectorAll('[data-client-approve]').forEach(b=>b.addEventListener('click',()=>respondClientApproval(b.dataset.clientApprove,true)));
  host.querySelectorAll('[data-client-change]').forEach(b=>b.addEventListener('click',()=>respondClientApproval(b.dataset.clientChange,false)));
}

async function loadCosting(){
  if(!state.project){state.costing=null;renderCosting();return}
  try{state.costing=await api(`/api/v1/projects/${state.project.id}/costing`);renderCosting()}
  catch(e){msg(`Costing: ${e.message}`,'ai')}
}
async function addCostingEntry(){
  if(!state.project)return;
  const basis=(prompt('Тип: estimate / actual','estimate')||'estimate').toLowerCase()==='actual'?'actual':'estimate';
  const category=(prompt('Категория: labor / installation / transport / subcontract / overhead / material / hardware / appliance / other','labor')||'other').toLowerCase();
  const description=prompt('Описание расхода:','')??'';if(!description.trim())return;
  const value=Number(prompt(`Сумма, ${state.project.snapshot.currency||'EUR'}:`,'0')||0);
  if(!Number.isFinite(value)||value<0)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/cost-entries`,{method:'POST',body:JSON.stringify({
      expectedRevision:state.project.snapshot.revision,basis,category,description,amountMinor:Math.round(value*100),createdBy:'owner'
    })});
    state.project=out.project;state.costing=out.costing;state.jobControl=null;await loadProjects();renderAll();loadHistory();renderCosting();
  }catch(e){msg(`Cost entry: ${e.message}`,'ai')}
}
async function deleteCostingEntry(id){
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/cost-entries/${id}/delete`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision})});
    state.project=out.project;state.costing=out.costing;state.jobControl=null;await loadProjects();renderAll();loadHistory();renderCosting();
  }catch(e){msg(`Delete cost: ${e.message}`,'ai')}
}
function renderCosting(){
  const host=$('htmlStage'),r=state.costing;
  if(state.project&&!r&&!state._costingLoading){
    state._costingLoading=true;
    api(`/api/v1/projects/${state.project.id}/costing`).then(x=>{state.costing=x;state._costingLoading=false;renderCosting()}).catch(e=>{state._costingLoading=false;msg(`Costing: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Costing считает план и факт по конкретной Revision.</p></div></div>';return}
  const currency=r?.currency||state.project.snapshot.currency||'EUR';
  const money=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format((Number(v)||0)/100);
  const categories=(r?.categories||[]).map(c=>`<tr><td>${esc(c.category)}</td><td>${money(c.estimateMinor)}</td><td>${money(c.actualMinor)}</td><td>${money(c.varianceMinor)}</td></tr>`).join('');
  const entries=(r?.entries||[]).map(x=>`<div class="purchase-row"><div><strong>${esc(x.description)}</strong><small>${esc(x.basis.toUpperCase())} · ${esc(x.category)} · ${esc(x.createdBy)}</small></div><div><strong>${money(x.amountMinor)}</strong> <button class="secondary small" data-cost-delete="${esc(x.id)}">×</button></div></div>`).join('');
  const marginClass=(r?.forecastMarginMinor??0)>=0?'good':'bad';
  host.innerHTML=`<div class="dashboard"><div class="job-hero"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Costing · Margin · Actual vs Estimate</h2><p>Закупки считаются автоматически из Purchase Orders. Работа, монтаж, транспорт, накладные и прочие расходы добавляются отдельно.</p></div></div>
  <div class="metrics"><div class="metric"><label>Contract</label><strong>${money(r?.contractValueMinor)}</strong></div><div class="metric"><label>Estimate</label><strong>${money(r?.totalEstimateMinor)}</strong></div><div class="metric"><label>Actual</label><strong>${money(r?.totalActualMinor)}</strong></div><div class="metric ${marginClass}"><label>Forecast margin</label><strong>${money(r?.forecastMarginMinor)} · ${r?.forecastMarginPercent??0}%</strong></div><div class="metric ${((r?.actualMarginMinor??0)>=0)?'good':'bad'}"><label>Actual margin</label><strong>${money(r?.actualMarginMinor)} · ${r?.actualMarginPercent??0}%</strong></div></div>
  <div class="job-grid"><div class="card"><h3>Procurement</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Committed</label><strong>${money(r?.purchasingCommittedMinor)}</strong></div><div class="metric good"><label>Received / Actual</label><strong>${money(r?.purchasingActualMinor)}</strong></div><div class="metric"><label>Remaining forecast</label><strong>${money(r?.remainingForecastMinor)}</strong></div></div></div></div>
  <div class="card"><h3>Manual costs</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Estimate</label><strong>${money(r?.manualEstimateMinor)}</strong></div><div class="metric"><label>Actual</label><strong>${money(r?.manualActualMinor)}</strong></div></div><button id="costAdd">+ Добавить расход</button></div></div></div>
  <div class="card"><h3>По категориям</h3><div class="card-body"><div class="table-scroll"><table><thead><tr><th>Категория</th><th>Estimate</th><th>Actual</th><th>Variance</th></tr></thead><tbody>${categories}</tbody></table></div></div></div>
  <div class="card"><h3>Manual cost entries</h3><div class="card-body">${entries||'<p class="meta-note">Ручных расходов пока нет.</p>'}</div></div></div>`;
  $('costAdd')?.addEventListener('click',addCostingEntry);
  host.querySelectorAll('[data-cost-delete]').forEach(b=>b.addEventListener('click',()=>deleteCostingEntry(b.dataset.costDelete)));
}

async function loadPurchasing(){
  if(!state.project){state.purchasing=null;renderPurchasing();return}
  try{state.purchasing=await api(`/api/v1/projects/${state.project.id}/purchasing`);renderPurchasing()}
  catch(e){msg(`Purchasing: ${e.message}`,'ai')}
}
async function createSupplierOrder(){
  const r=state.purchasing;if(!r)return;
  const supplier=prompt('Поставщик:','')??'';if(!supplier.trim())return;
  const lines=r.requirements.map(x=>({kind:x.kind,sourceKey:x.sourceKey,description:x.description,manufacturer:x.manufacturer,code:x.code,quantity:x.quantity,unit:x.unit,unitPriceMinor:x.suggestedUnitPriceMinor??0,furnitureId:x.furnitureId,moduleId:x.moduleId,applianceCatalogRecordId:x.applianceCatalogRecordId}));
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/purchase-orders`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,supplierName:supplier,createdBy:'buyer',currency:state.project.snapshot.currency,lines})});
    state.project=out.project;state.purchasing=out.purchasing;state.jobControl=null;await loadProjects();renderAll();loadHistory();renderPurchasing();
  }catch(e){msg(`Create PO: ${e.message}`,'ai')}
}
async function setPurchaseStatus(id,status){
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/purchase-orders/${id}/status`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,status,actor:'buyer'})});
    state.project=out.project;state.purchasing=out.purchasing;state.jobControl=null;await loadProjects();renderAll();loadHistory();renderPurchasing();
  }catch(e){msg(`PO status: ${e.message}`,'ai')}
}
function renderPurchasing(){
  const host=$('htmlStage'),r=state.purchasing;
  if(state.project&&!r&&!state._purchasingLoading){
    state._purchasingLoading=true;
    api(`/api/v1/projects/${state.project.id}/purchasing`).then(x=>{state.purchasing=x;state._purchasingLoading=false;renderPurchasing()}).catch(e=>{state._purchasingLoading=false;msg(`Purchasing: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Purchasing строится из Engineering BOM и техники Makster-supplied.</p></div></div>';return}
  const currency=state.project.snapshot.currency||'EUR',moneyText=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format((Number(v)||0)/100);
  const reqs=(r?.requirements||[]).map(x=>`<div class="purchase-row"><div><strong>${esc(x.description)}</strong><small>${esc(x.kind.toUpperCase())} · ${x.quantity} ${esc(x.unit)}${x.procurementMode?` · ${esc(x.procurementMode)}`:''}</small></div><div>${x.suggestedUnitPriceMinor!=null?moneyText(x.suggestedUnitPriceMinor):'<span class="pill warn">PRICE ?</span>'}</div></div>`).join('');
  const orders=(r?.orders||[]).map(o=>`<div class="card"><h3>${esc(o.supplierName)} · ${esc(o.status.toUpperCase())}</h3><div class="card-body">${o.lines.map(l=>`<div class="purchase-row"><div><strong>${esc(l.description)}</strong><small>${l.quantity} ${esc(l.unit)} · received ${l.receivedQuantity??0}</small></div><div>${moneyText((l.unitPriceMinor??0)*l.quantity)}</div></div>`).join('')}<div class="toolbar-form">${o.status==='draft'?`<button data-po-status="${esc(o.id)}" data-status="approved">Утвердить</button>`:''}${o.status==='approved'?`<button data-po-status="${esc(o.id)}" data-status="ordered">Отправить поставщику</button>`:''}${['ordered','partially_received'].includes(o.status)?`<button data-po-status="${esc(o.id)}" data-status="received">Получено полностью</button>`:''}</div></div></div>`).join('');
  host.innerHTML=`<div class="dashboard"><div class="job-hero"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Purchasing & Supplier Orders</h2><p>Материалы и фурнитура идут из Engineering BOM. Техника попадает сюда только при procurementMode = makster_supplied.</p></div></div><div class="metrics"><div class="metric"><label>Requirements</label><strong>${r?.requirementCount??'—'}</strong></div><div class="metric bad"><label>Unresolved</label><strong>${r?.unresolvedRequirementCount??'—'}</strong></div><div class="metric"><label>Orders</label><strong>${r?.orderCount??'—'}</strong></div><div class="metric"><label>Ordered</label><strong>${moneyText(r?.orderedValueMinor)}</strong></div><div class="metric good"><label>Received</label><strong>${moneyText(r?.receivedValueMinor)}</strong></div></div><div class="card"><h3>Procurement split</h3><div class="card-body"><p>Makster supplied appliances: <strong>${r?.maksterApplianceCount??0}</strong> · Customer supplied: <strong>${r?.customerApplianceCount??0}</strong> · Undecided: <strong>${r?.undecidedApplianceCount??0}</strong></p><button id="purchaseCreate">Создать черновик заказа из требований</button></div></div><div class="card"><h3>Purchase Requirements</h3><div class="card-body">${reqs||'<p class="meta-note">Требований пока нет.</p>'}</div></div>${orders}</div>`;
  $('purchaseCreate')?.addEventListener('click',createSupplierOrder);
  host.querySelectorAll('[data-po-status]').forEach(b=>b.addEventListener('click',()=>setPurchaseStatus(b.dataset.poStatus,b.dataset.status)));
}





async function loadSystemReadiness(){
  try{
    const [r,o]=await Promise.all([api('/api/v1/system/readiness'),api('/api/v1/system/observability')]);
    state.systemReadiness=r;state.observability=o;renderSystemReadiness();
  }catch(e){msg(`System Readiness: ${e.message}`,'ai')}
}
async function bootstrapRoles(){
  try{const x=await api('/api/v1/system/roles/bootstrap',{method:'POST',body:JSON.stringify({})});msg(`Role policies: ${x.created} created.`,'meta');await loadSystemReadiness()}catch(e){msg(`Roles: ${e.message}`,'ai')}
}
function downloadSystemBackup(){
  window.open('/api/v1/system/backup/export','_blank');
  setTimeout(()=>loadSystemReadiness(),500);
}
function renderSystemReadiness(){
  const host=$('htmlStage'),r=state.systemReadiness,o=state.observability;
  if(!r&&!state._systemLoading){state._systemLoading=true;Promise.all([api('/api/v1/system/readiness'),api('/api/v1/system/observability')]).then(([rr,oo])=>{state.systemReadiness=rr;state.observability=oo;state._systemLoading=false;renderSystemReadiness()}).catch(e=>{state._systemLoading=false;msg(`System: ${e.message}`,'ai')})}
  if(!r){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Production Readiness</strong><p>Проверяю Release Gate…</p></div></div>';return}
  const checks=(r.checks||[]).map(x=>`<div class="readiness-check ${esc(x.status)}"><div><strong>${esc(x.label)}</strong><p>${esc(x.detail)}</p><small>${esc(x.category)}${x.critical?' · CRITICAL GATE':''}</small></div><span class="pill ${x.status==='pass'?'good':x.status==='fail'?'warn':''}">${esc(x.status.toUpperCase())}</span></div>`).join('');
  host.innerHTML=`<div class="dashboard office-dashboard">
    <div class="card office-hero"><h3>Makster AI 5.6 · Production Readiness Gate</h3><div class="card-body"><div class="bos-health ${r.releaseGateOpen?'green':r.status==='pilot_ready'?'amber':'red'}"><div><label>Release Readiness</label><strong>${r.score}/100 · ${esc(r.status.toUpperCase())}</strong></div><small>${r.releaseGateOpen?'Critical Release Gate OPEN':'Release Gate CLOSED — critical production requirements remain.'}</small></div><div class="toolbar-form"><button id="systemRoles">Bootstrap Roles</button><button id="systemBackup">Export Recovery Backup</button><button id="systemRefresh" class="secondary">Re-check</button></div></div></div>
    <div class="card"><h3>Critical Release Checks</h3><div class="card-body">${checks}</div></div>
    <div class="card"><h3>Observability</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Requests</label><strong>${o?.requests??0}</strong></div><div class="metric"><label>Errors</label><strong>${o?.errors??0}</strong></div><div class="metric"><label>Error rate</label><strong>${o?.errorRate??0}%</strong></div><div class="metric"><label>p50</label><strong>${o?.p50Ms??0} ms</strong></div><div class="metric"><label>p95</label><strong>${o?.p95Ms??0} ms</strong></div><div class="metric"><label>p99</label><strong>${o?.p99Ms??0} ms</strong></div></div></div></div>
    <div class="card"><h3>What still blocks production</h3><div class="card-body">${r.blockers.length?r.blockers.map(x=>`<div class="business-alert"><strong>BLOCKER</strong><p>${esc(x)}</p></div>`).join(''):'<p class="meta-note">No critical blockers.</p>'}${r.warnings.length?`<h4>Warnings</h4>${r.warnings.map(x=>`<p class="meta-note">• ${esc(x)}</p>`).join('')}`:''}</div></div>
  </div>`;
  $('systemRoles')?.addEventListener('click',bootstrapRoles);$('systemBackup')?.addEventListener('click',downloadSystemBackup);$('systemRefresh')?.addEventListener('click',loadSystemReadiness);
}
async function loadContentStudio(){try{state.contentStudio=await api('/api/v1/content-studio');renderContentStudio()}catch(e){msg(`Content Studio: ${e.message}`,'ai')}}
async function contentAddAsset(){
  const projects=state.projects||[];if(!projects.length){msg('Сначала нужен Makster Project.','meta');return}
  const i=Number(prompt(projects.map((x,i)=>`${i}: ${x.name||x.snapshot?.title||x.id}`).join('\n'),'0'));const p=projects[i];if(!p)return;
  const title=prompt('Название фото/рендера:','Готовый проект')||'Makster asset';
  const kind=(prompt('photo / render / video / document','photo')||'photo').trim();
  const uri=prompt('Путь/URL к медиа (можно пусто):','')||'';
  await api('/api/v1/content-studio/assets',{method:'POST',body:JSON.stringify({projectId:p.id,kind,title,uri,approvedForMarketing:confirm('Разрешено использовать в маркетинге?'),hero:confirm('Это hero-кадр?')})});await loadContentStudio();
}
async function contentGenerateProject(){
  const c=state.contentStudio,candidates=c?.candidateProjects||[];if(!candidates.length){msg('Нет проектов с approved marketing assets.','meta');return}
  const i=Number(prompt(candidates.map((x,i)=>`${i}: ${x.title} · ${x.stage}`).join('\n'),'0'));const p=candidates[i];if(!p)return;
  try{const out=await api(`/api/v1/content-studio/projects/${p.projectId}/generate`,{method:'POST',body:JSON.stringify({})});msg(`Content generated: ${out.items.length} items · approvals ${out.approvals.length}.`,'meta');await loadAiOffice();await loadContentStudio()}catch(e){msg(`Content: ${e.message}`,'ai')}
}
async function startPilotMode(){
  const count=Math.max(1,Math.min(5,Number(prompt('Сколько реальных проектов в Pilot Mode? 1–5','3')||3)));
  try{const out=await api('/api/v1/pilot-mode/start',{method:'POST',body:JSON.stringify({count,name:'Makster Real Project Pilot',createdBy:'owner'})});msg(`Pilot Mode: ${out.projects.length} project(s) started.`,'meta');await loadContentStudio()}catch(e){msg(`Pilot: ${e.message}`,'ai')}
}
function renderContentStudio(){
  const host=$('htmlStage'),c=state.contentStudio;
  if(!c&&!state._contentLoading){state._contentLoading=true;api('/api/v1/content-studio').then(x=>{state.contentStudio=x;state._contentLoading=false;renderContentStudio()}).catch(e=>{state._contentLoading=false;msg(`Content Studio: ${e.message}`,'ai')})}
  if(!c){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Content Studio</strong><p>Загрузка…</p></div></div>';return}
  const assets=(c.assets||[]).map(x=>`<div class="office-lead"><div><strong>${esc(x.title)}</strong><p>${esc(x.kind)} · project ${esc(x.projectId)} · ${x.approvedForMarketing?'MARKETING APPROVED':'PRIVATE'}</p><small>${esc((x.tags||[]).join(', '))}${x.hero?' · HERO':''}</small></div></div>`).join('');
  const content=(c.content||[]).slice(0,20).map(x=>`<div class="office-campaign"><div><strong>${esc(x.title)}</strong><p>${esc(x.channel)} · ${esc(x.format)} · ${esc(x.status)}</p><small>${esc(x.body.slice(0,180))}</small></div></div>`).join('');
  const jobs=(c.publishJobs||[]).slice(0,20).map(x=>`<div class="office-channel"><strong>${esc(x.channel)}</strong><span>${esc(x.status)}</span><span>${x.scheduledAt?esc(x.scheduledAt.slice(0,16)):'—'}</span><span>${esc(x.providerStatus||'internal queue')}</span><span>${esc(x.error||'')}</span></div>`).join('');
  const learning=(c.learning||[]).slice(0,12).map(x=>`<div class="office-channel"><strong>${esc(x.key)}</strong><span>${x.impressions} imp</span><span>${x.leads} leads</span><span>${x.qualified} qual.</span><span>${money(x.revenue,'EUR')}</span></div>`).join('');
  const pilots=(c.pilotProjects||[]).map(x=>`<div class="office-lead"><div><strong>${esc(x.title)}</strong><p>${esc(x.status)} · ${x.score}/100</p><small>${x.blockers.length?`Missing: ${esc(x.blockers.join(', '))}`:'All checkpoints complete'}</small></div><span class="pill ${x.score===100?'good':x.score<50?'warn':''}">${x.score}%</span></div>`).join('');
  host.innerHTML=`<div class="dashboard office-dashboard">
    <div class="card office-hero"><h3>Makster AI 5.5 · Content & Social Autopilot</h3><div class="card-body"><p>Реальные проекты → Creative Library → AI drafts → Owner Approval → Publish Queue → Performance Learning.</p><div class="toolbar-form"><button id="contentAddAsset">+ Real Asset</button><button id="contentGenerate">Generate from Project</button><button id="contentPilot" class="secondary">Start Pilot Mode</button></div><div class="metrics"><div class="metric"><label>Assets</label><strong>${c.summary.assets}</strong></div><div class="metric good"><label>Marketing approved</label><strong>${c.summary.marketingApprovedAssets}</strong></div><div class="metric"><label>Drafts</label><strong>${c.summary.contentDrafts}</strong></div><div class="metric"><label>Queued</label><strong>${c.summary.queued}</strong></div><div class="metric good"><label>Published</label><strong>${c.summary.published}</strong></div><div class="metric"><label>Pilot active</label><strong>${c.summary.pilotActive}</strong></div></div></div></div>
    <div class="card"><h3>Creative Library · Real Makster Work</h3><div class="card-body">${assets||'<p class="meta-note">Добавь фото/рендер реального проекта.</p>'}</div></div>
    <div class="card"><h3>Content Drafts</h3><div class="card-body">${content||'<p class="meta-note">Контент появится после Generate from Project.</p>'}</div></div>
    <div class="card"><h3>Publish Queue</h3><div class="card-body">${jobs||'<p class="meta-note">Публикации появятся после Owner Approval.</p>'}</div></div>
    <div class="card"><h3>Creative Performance Learning</h3><div class="card-body">${learning||'<p class="meta-note">Learning начнётся после накопления performance data.</p>'}</div></div>
    <div class="card"><h3>Real Project Pilot Mode</h3><div class="card-body">${pilots||'<p class="meta-note">Запусти 3–5 реальных заказов через Pilot Mode.</p>'}</div></div>
  </div>`;
  $('contentAddAsset')?.addEventListener('click',contentAddAsset);$('contentGenerate')?.addEventListener('click',contentGenerateProject);$('contentPilot')?.addEventListener('click',startPilotMode);
}
async function loadAiOffice(){
  try{state.aiOffice=await api('/api/v1/ai-office?currency=EUR');renderAiOffice()}
  catch(e){msg(`AI Office: ${e.message}`,'ai')}
}
async function officeCreateCampaign(){
  const name=prompt('Название кампании:','Makster Premium Leads CZ')||'';if(!name.trim())return;
  const channel=(prompt('Канал: google_ads / facebook_ads / instagram_ads / tiktok_ads','google_ads')||'google_ads').trim();
  const objective=(prompt('Цель: leads / traffic / awareness / remarketing / partner_acquisition','leads')||'leads').trim();
  const market=prompt('Рынок:','CZ')||'CZ';
  const eur=Number(prompt('Плановый бюджет EUR:','500')||0);
  try{await api('/api/v1/ai-office/campaigns',{method:'POST',body:JSON.stringify({name,channel,objective,market,budgetMinor:Math.round(eur*100),currency:'EUR',createdBy:'owner'})});await loadAiOffice()}
  catch(e){msg(`Campaign: ${e.message}`,'ai')}
}
async function officeCreateLead(){
  const name=prompt('Имя клиента / контакт:','')||'';if(!name.trim())return;
  const company=prompt('Компания:','')||'';
  const source=(prompt('Источник: instagram_ads / google_ads / referral / other','instagram_ads')||'other').trim();
  const email=prompt('Email:','')||'';
  const value=Number(prompt('Оценка заказа EUR:','10000')||0);
  try{await api('/api/v1/ai-office/leads',{method:'POST',body:JSON.stringify({name,company,source,email,currency:'EUR',country:'CZ',estimatedValueMinor:Math.round(value*100)})});await loadAiOffice()}
  catch(e){msg(`Lead: ${e.message}`,'ai')}
}


async function officeConfigureGrowthGuardrails(){
  const current=(state.aiOffice?.liveExecution?.guardrails||[]).find(x=>!x.provider&&x.currency==='EUR')||{};
  const daily=Number(prompt('Максимальный прогнозный spend в день, EUR:',String((current.dailySpendLimitMinor??100000)/100))||1000);
  const monthly=Number(prompt('Максимальный spend в месяц, EUR:',String((current.monthlySpendLimitMinor??1000000)/100))||10000);
  const inc=Number(prompt('Максимальное увеличение бюджета за одно решение, %:',String(current.maxBudgetIncreasePercent??35))||35);
  const dec=Number(prompt('Максимальное уменьшение бюджета за одно решение, %:',String(current.maxBudgetDecreasePercent??80))||80);
  try{
    await api('/api/v1/ai-office/growth/guardrails',{method:'POST',body:JSON.stringify({
      currency:'EUR',dailySpendLimitMinor:Math.round(daily*100),monthlySpendLimitMinor:Math.round(monthly*100),
      maxBudgetIncreasePercent:inc,maxBudgetDecreasePercent:dec,allowPause:true,enabled:true,updatedBy:'owner'
    })});await loadAiOffice();
  }catch(e){msg(`Guardrails: ${e.message}`,'ai')}
}
async function officeExecuteProvider(id){
  if(!confirm('Выполнить уже утверждённое изменение во внешнем рекламном кабинете? Guardrails будут проверены ещё раз.'))return;
  try{
    const out=await api(`/api/v1/ai-office/autopilot/decisions/${id}/execute-provider`,{method:'POST',body:JSON.stringify({requestedBy:'owner'})});
    msg(`Provider execution: ${out.execution.status}${out.execution.providerStatus?` · ${out.execution.providerStatus}`:''}.`,'meta');
    await loadAiOffice();
  }catch(e){msg(`Provider execution: ${e.message}`,'ai');await loadAiOffice()}
}
async function officeRunAutopilot(){
  try{
    const out=await api('/api/v1/ai-office/autopilot/run',{method:'POST',body:JSON.stringify({currency:'EUR'})});
    msg(`Growth Autopilot: SCALE ${out.run.summary.scale} · HOLD ${out.run.summary.hold} · REDUCE ${out.run.summary.reduce} · PAUSE ${out.run.summary.pause}.`,'meta');
    await loadAiOffice();
  }catch(e){msg(`Autopilot: ${e.message}`,'ai')}
}
async function officeAutopilotDecision(id,action){
  if(!confirm(action==='approve'?'Утвердить рекомендацию Autopilot? Изменится внутренний план Makster, но внешний рекламный кабинет без provider API не изменится.':'Отклонить рекомендацию Autopilot?'))return;
  try{
    const out=await api(`/api/v1/ai-office/autopilot/decisions/${id}/${action}`,{method:'POST',body:JSON.stringify({decidedBy:'owner'})});
    if(action==='approve'&&out.externalProviderMutation===false)msg(`Approved internally · provider execution: ${out.providerExecution}.`,'meta');
    await loadAiOffice();
  }catch(e){msg(`Autopilot decision: ${e.message}`,'ai')}
}
async function officeRunCycle(){
  const market=prompt('Рынок Growth Cycle:','CZ')||'CZ';
  const budget=Number(prompt('Месячный growth budget EUR:','1500')||0);
  const goal=prompt('Главная цель:','Получать качественные заявки на кухни, гардеробные и B2B-партнёрства.')||'';
  try{const out=await api('/api/v1/ai-office/cycles/run',{method:'POST',body:JSON.stringify({market,currency:'EUR',monthlyBudgetMinor:Math.round(budget*100),goal,createdBy:'owner'})});msg(`AI Office cycle: ${out.runs.length} agents completed · approvals ${out.approvals.length}.`,'meta');await loadAiOffice()}
  catch(e){msg(`AI Office cycle: ${e.message}`,'ai')}
}
async function officeApproval(id,action){
  try{await api(`/api/v1/ai-office/approvals/${id}/${action}`,{method:'POST',body:JSON.stringify({decidedBy:'owner'})});await loadAiOffice()}
  catch(e){msg(`Approval: ${e.message}`,'ai')}
}
async function officeNextStage(id){
  const l=state.aiOffice?.leads?.find(x=>x.id===id);if(!l)return;
  const stages=['new','contacted','qualified','measurement_booked','proposal','negotiation','won'];
  const next=stages[Math.min(stages.length-1,stages.indexOf(l.status)+1)];
  const follow=next==='won'?'':(prompt('Следующий follow-up YYYY-MM-DD (можно пусто):','')||'');
  await api(`/api/v1/ai-office/leads/${id}/status`,{method:'POST',body:JSON.stringify({status:next,owner:'Makster Sales',...(follow?{nextFollowUpAt:follow+'T09:00:00Z'}:{})})});await loadAiOffice();
}
async function officeLeadStatus(id,status){
  try{await api(`/api/v1/ai-office/leads/${id}/status`,{method:'POST',body:JSON.stringify({status,owner:'Makster Sales'})});await loadAiOffice()}
  catch(e){msg(`Lead status: ${e.message}`,'ai')}
}
async function officeConvertLead(id){
  if(!confirm('Создать из этого лида настоящий Makster Project?'))return;
  try{const out=await api(`/api/v1/ai-office/leads/${id}/convert-to-project`,{method:'POST',body:JSON.stringify({projectType:'other'})});msg(`Lead → Project: ${out.project.name}`,'meta');await loadProjects();await loadAiOffice()}
  catch(e){msg(`Lead → Project: ${e.message}`,'ai')}
}
async function officeCampaignMetrics(id){
  const c=state.aiOffice?.campaigns?.find(x=>x.id===id);if(!c)return;
  const spent=Number(prompt('Spent EUR:',String((c.spentMinor||0)/100))||0);
  const impressions=Number(prompt('Impressions:',String(c.impressions||0))||0);
  const clicks=Number(prompt('Clicks:',String(c.clicks||0))||0);
  const leads=Number(prompt('Leads:',String(c.leads||0))||0);
  const q=Number(prompt('Qualified leads:',String(c.qualifiedLeads||0))||0);
  const won=Number(prompt('Won deals:',String(c.wonDeals||0))||0);
  const revenue=Number(prompt('Attributed revenue EUR:',String((c.attributedRevenueMinor||0)/100))||0);
  await api(`/api/v1/ai-office/campaigns/${id}/metrics`,{method:'POST',body:JSON.stringify({spentMinor:Math.round(spent*100),impressions,clicks,leads,qualifiedLeads:q,wonDeals:won,attributedRevenueMinor:Math.round(revenue*100)})});
  await loadAiOffice();
}
function renderAiOffice(){
  const host=$('htmlStage'),o=state.aiOffice;
  if(!o&&!state._officeLoading){state._officeLoading=true;api('/api/v1/ai-office?currency=EUR').then(x=>{state.aiOffice=x;state._officeLoading=false;renderAiOffice()}).catch(e=>{state._officeLoading=false;msg(`AI Office: ${e.message}`,'ai')})}
  if(!o){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Makster AI Office</strong><p>Запускаю Growth Department…</p></div></div>';return}
  const M=x=>money(x,o.currency);
  const campaigns=(o.campaigns||[]).map(c=>`<div class="office-campaign"><div><strong>${esc(c.name)}</strong><p>${esc(c.channel)} · ${esc(c.market)} · ${esc(c.objective)} · ${esc(c.status)}</p><small>budget ${M(c.budgetMinor)} · spent ${M(c.spentMinor)} · leads ${c.leads} · qualified ${c.qualifiedLeads} · won ${c.wonDeals} · revenue ${M(c.attributedRevenueMinor)} · ROAS ${c.metrics.roas??'—'}</small></div><button class="secondary" data-office-metrics="${esc(c.id)}">Metrics</button></div>`).join('');
  const leads=(o.leads||[]).map(l=>`<div class="office-lead"><div><strong>${esc(l.name)}</strong><p>${esc(l.company||'—')} · ${esc(l.source)} · <b>${esc(l.status)}</b> · ${M(l.estimatedValueMinor||0)} · probability ${l.probabilityPercent??10}%</p><small>${esc(l.email||'')} ${l.nextFollowUpAt?`· follow-up ${esc(l.nextFollowUpAt.slice(0,10))}`:''} ${l.projectId?`· Project ${esc(l.projectId)}`:''}${l.actualRevenueMinor!=null?` · actual revenue ${M(l.actualRevenueMinor)}`:''}${l.actualProfitMinor!=null?` · profit ${M(l.actualProfitMinor)}`:''}</small></div><div class="office-actions">${!['won','lost'].includes(l.status)?`<button data-office-next-stage="${esc(l.id)}">Next stage</button>`:''}${!l.projectId&&['qualified','measurement_booked','proposal','negotiation','won'].includes(l.status)?`<button class="secondary" data-office-convert="${esc(l.id)}">→ Project</button>`:''}</div></div>`).join('');
  const approvals=(o.pendingApprovals||[]).map(a=>`<div class="office-approval"><div><strong>${esc(a.title)}</strong><p>${esc(a.detail)}</p><small>${esc(a.kind)} · requested by ${esc(a.requestedBy)}${a.amountMinor!=null?` · ${M(a.amountMinor)}`:''}</small></div><div class="office-actions"><button data-office-approve="${esc(a.id)}">Approve</button><button class="secondary" data-office-reject="${esc(a.id)}">Reject</button></div></div>`).join('');
  const agents=(o.agents||[]).map(a=>`<div class="office-agent"><strong>${esc(a.name)}</strong><span>${esc(a.department)}</span><p>${esc(a.mission)}</p><small>runs ${a.runs}${a.lastRun?` · last ${esc(a.lastRun.slice(0,16).replace('T',' '))}`:''}</small></div>`).join('');
  const channels=(o.channels||[]).map(c=>`<div class="office-channel"><strong>${esc(c.channel)}</strong><span>${M(c.spentMinor)} spend</span><span>${c.leads} leads</span><span>${c.wonDeals} won</span><span>ROAS ${c.roas??'—'}</span></div>`).join('');
  const autopilot=o.autopilot||{decisions:[],pending:0,latestRun:null};
  const autopilotDecisions=(autopilot.decisions||[]).slice(0,20).map(d=>`<div class="office-autopilot ${esc(d.action)}"><div><strong>${esc(d.action.toUpperCase())} · ${esc(d.campaignName)}</strong><p>${esc(d.reason)}</p><small>confidence ${d.confidence}% · budget ${M(d.currentBudgetMinor)} → ${M(d.proposedBudgetMinor)} · profit ${M(d.evidence.actualProjectProfitMinor)} · revenue ${M(d.evidence.actualProjectRevenueMinor)} · ROAS ${d.evidence.roas??'—'} · lead quality ${d.evidence.leadQualityPercent}% · provider ${esc(d.providerExecution)}</small></div><div class="office-actions">${d.status==='proposed'&&d.action!=='hold'?`<button data-auto-approve="${esc(d.id)}">Approve</button><button class="secondary" data-auto-reject="${esc(d.id)}">Reject</button>`:`${d.status==='executed'&&['pending_connection','pending_provider_sync'].includes(d.providerExecution)?`<button data-provider-execute="${esc(d.id)}">Execute Provider</button>`:''}<span class="pill">${esc(d.status.toUpperCase())} · ${esc(d.providerExecution)}</span>`}</div></div>`).join('');
  const live=o.liveExecution||{guardrails:[],executions:[],audit:[],inboundLeadEvents:[],summary:{}};
  const guardrails=(live.guardrails||[]).map(g=>`<div class="office-channel"><strong>${esc(g.provider||'ALL PROVIDERS')}</strong><span>daily ${M(g.dailySpendLimitMinor)}</span><span>monthly ${M(g.monthlySpendLimitMinor)}</span><span>+${g.maxBudgetIncreasePercent}% / -${g.maxBudgetDecreasePercent}%</span><span>${g.enabled?'ENABLED':'DISABLED'}</span></div>`).join('');
  const executions=(live.executions||[]).slice(0,15).map(x=>`<div class="office-execution"><div><strong>${esc(x.provider)} · ${esc(x.requestedAction.toUpperCase())}</strong><p>${M(x.beforeBudgetMinor)} → ${M(x.targetBudgetMinor)} · ${esc(x.status)}</p><small>guardrail ${x.guardrailCheck.allowed?'PASS':'BLOCK'} · day ${M(x.guardrailCheck.dailyProjectedMinor)} · month ${M(x.guardrailCheck.monthlyProjectedMinor)} · change ${x.guardrailCheck.budgetChangePercent}%${x.providerStatus?` · provider ${esc(x.providerStatus)}`:''}${x.error?` · ${esc(x.error)}`:''}</small></div></div>`).join('');
  const audit=(live.audit||[]).slice(0,12).map(x=>`<div class="office-audit"><strong>${esc(x.status.toUpperCase())} · ${esc(x.action)}</strong><span>${esc(x.category)} · ${esc(x.actor)}</span><p>${esc(x.detail)}</p><small>${esc(x.createdAt.slice(0,19).replace('T',' '))}</small></div>`).join('');
  const inbound=(live.inboundLeadEvents||[]).slice(0,10).map(x=>`<div class="office-audit"><strong>${esc(x.provider)} · ${esc(x.status.toUpperCase())}</strong><span>${esc(x.providerLeadId)}</span><p>${x.leadId?`CRM lead ${esc(x.leadId)}`:esc(x.error||'')}</p></div>`).join('');
  const brief=o.recentBrief;
  host.innerHTML=`<div class="dashboard office-dashboard">
    <div class="card office-hero"><h3>Makster AI Office · Growth Department</h3><div class="card-body"><div class="office-head"><div><strong>Маркетинг, реклама, контент и лидогенерация — внутри Makster AI</strong><p>Growth Director управляет Analytics → Audience → Creative → Content → Ads → Sales Bridge → Owner Brief. Расходы и рекламные действия требуют Owner Approval. Регулярный SMM выполняется действующими ChatGPT-автоматизациями по уже выданному разрешению; Office готовит материалы.</p></div><div class="toolbar-form"><button id="officeRunCycle">Run Growth Cycle</button><button id="officeRunAutopilot">Run Autopilot</button><button id="officeGuardrails" class="secondary">Spend Guardrails</button><button id="officeNewCampaign" class="secondary">+ Campaign</button><button id="officeNewLead" class="secondary">+ Lead</button></div></div><div class="metrics"><div class="metric"><label>Active campaigns</label><strong>${o.summary.activeCampaigns}</strong></div><div class="metric"><label>Spend</label><strong>${M(o.summary.spentMinor)}</strong></div><div class="metric"><label>Leads</label><strong>${o.summary.leads}</strong></div><div class="metric good"><label>Qualified</label><strong>${o.summary.qualifiedLeads}</strong></div><div class="metric good"><label>Won</label><strong>${o.summary.wonLeads}</strong></div><div class="metric"><label>Open pipeline</label><strong>${M(o.summary.openPipelineMinor)}</strong></div><div class="metric"><label>Weighted forecast</label><strong>${M(o.summary.weightedPipelineMinor)}</strong></div><div class="metric"><label>Actual project revenue</label><strong>${M(o.summary.actualRevenueMinor)}</strong></div><div class="metric"><label>Actual project profit</label><strong>${M(o.summary.actualProfitMinor)}</strong></div><div class="metric"><label>Follow-ups overdue</label><strong>${o.summary.overdueFollowUps}</strong></div><div class="metric"><label>Attributed revenue</label><strong>${M(o.summary.attributedRevenueMinor)}</strong></div><div class="metric bad"><label>Approvals</label><strong>${o.summary.pendingApprovals}</strong></div></div></div></div>
    ${brief?`<div class="card"><h3>Owner Brief</h3><div class="card-body"><div class="office-brief"><strong>${esc(brief.headline)}</strong><p>${esc(brief.summary)}</p><h4>Priorities</h4>${brief.priorities.map(x=>`<div>• ${esc(x)}</div>`).join('')}<h4>Risks</h4>${(brief.risks.length?brief.risks:['No major growth risk detected.']).map(x=>`<div>• ${esc(x)}</div>`).join('')}</div></div></div>`:''}
    <div class="card"><h3>Growth Autopilot · Owner Decisions</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Pending decisions</label><strong>${autopilot.pending??0}</strong></div><div class="metric"><label>Mode</label><strong>Recommend Only</strong></div><div class="metric"><label>External spend</label><strong>Owner gated</strong></div></div>${autopilot.latestRun?`<p class="meta-note">Latest run: SCALE ${autopilot.latestRun.summary.scale} · HOLD ${autopilot.latestRun.summary.hold} · REDUCE ${autopilot.latestRun.summary.reduce} · PAUSE ${autopilot.latestRun.summary.pause} · budget ${M(autopilot.latestRun.summary.proposedBudgetBeforeMinor)} → ${M(autopilot.latestRun.summary.proposedBudgetAfterMinor)}</p>`:''}${autopilotDecisions||'<p class="meta-note">Run Autopilot to generate budget/channel recommendations.</p>'}</div></div>
    <div class="card"><h3>Approval Center</h3><div class="card-body">${approvals||'<p class="meta-note">Нет действий, ожидающих решения владельца.</p>'}</div></div>
    <div class="card"><h3>Advertising & Growth Channels</h3><div class="card-body">${channels||'<p class="meta-note">Каналы появятся после создания кампаний.</p>'}</div></div>
    <div class="card"><h3>Provider Execution · Spend Guardrails · Audit</h3><div class="card-body"><div class="metrics"><div class="metric good"><label>Provider executed</label><strong>${live.summary.executed??0}</strong></div><div class="metric bad"><label>Blocked</label><strong>${live.summary.blocked??0}</strong></div><div class="metric bad"><label>Failed</label><strong>${live.summary.failed??0}</strong></div><div class="metric"><label>Waiting connection</label><strong>${live.summary.waitingConnection??0}</strong></div><div class="metric good"><label>Inbound leads</label><strong>${live.summary.inboundIngested??0}</strong></div><div class="metric"><label>Duplicates blocked</label><strong>${live.summary.inboundDuplicates??0}</strong></div><div class="metric bad"><label>Rejected inbound</label><strong>${live.summary.inboundRejected??0}</strong></div></div><h4>Spend Guardrails</h4>${guardrails||'<p class="meta-note">Default safety guardrail is used until you save a company policy.</p>'}<h4>Provider Executions</h4>${executions||'<p class="meta-note">No external execution attempts yet.</p>'}<h4>Inbound Lead Gateway</h4>${inbound||'<p class="meta-note">No signed provider leads ingested yet.</p>'}<h4>Audit Log</h4>${audit||'<p class="meta-note">Audit entries appear after guardrail, execution and ingestion actions.</p>'}</div></div>
    <div class="card"><h3>Live Growth Connections</h3><div class="card-body"><p class="meta-note">Adapter layer for Google Ads, Meta/Facebook/Instagram and TikTok Ads. Credentials stay server-side; no autonomous spend without Owner Approval.</p>${(o.connections||[]).map(c=>`<div class="office-channel"><strong>${esc(c.provider)}</strong><span>${esc(c.status)}</span><span>${esc(c.accountId||'not configured')}</span><span>${c.lastSyncAt?esc(c.lastSyncAt.slice(0,16)):'—'}</span><span>${esc(c.lastError||'')}</span></div>`).join('')||'<p class="meta-note">Provider accounts are not configured in this local build.</p>'}</div></div>
    <div class="card"><h3>Sales CRM · Revenue Attribution</h3><div class="card-body"><p class="meta-note">NEW → CONTACTED → QUALIFIED → MEASUREMENT BOOKED → PROPOSAL → NEGOTIATION → WON / LOST. Weighted pipeline uses stage probability; converted leads inherit real Makster Project revenue.</p></div></div>
    <div class="card"><h3>Campaigns</h3><div class="card-body">${campaigns||'<p class="meta-note">Создай первую кампанию или запусти Growth Cycle.</p>'}</div></div>
    <div class="card"><h3>Lead Pipeline → Makster Projects</h3><div class="card-body">${leads||'<p class="meta-note">Лидов пока нет.</p>'}</div></div>
    <div class="card"><h3>AI Office Team · 12 Agents</h3><div class="card-body office-agents">${agents}</div></div>
  </div>`;
  $('officeRunCycle')?.addEventListener('click',officeRunCycle);
  $('officeRunAutopilot')?.addEventListener('click',officeRunAutopilot);
  $('officeGuardrails')?.addEventListener('click',officeConfigureGrowthGuardrails);
  $('officeNewCampaign')?.addEventListener('click',officeCreateCampaign);
  $('officeNewLead')?.addEventListener('click',officeCreateLead);
  host.querySelectorAll('[data-provider-execute]').forEach(b=>b.addEventListener('click',()=>officeExecuteProvider(b.dataset.providerExecute)));
  host.querySelectorAll('[data-auto-approve]').forEach(b=>b.addEventListener('click',()=>officeAutopilotDecision(b.dataset.autoApprove,'approve')));
  host.querySelectorAll('[data-auto-reject]').forEach(b=>b.addEventListener('click',()=>officeAutopilotDecision(b.dataset.autoReject,'reject')));
  host.querySelectorAll('[data-office-approve]').forEach(b=>b.addEventListener('click',()=>officeApproval(b.dataset.officeApprove,'approve')));
  host.querySelectorAll('[data-office-reject]').forEach(b=>b.addEventListener('click',()=>officeApproval(b.dataset.officeReject,'reject')));
  host.querySelectorAll('[data-office-lead-status]').forEach(b=>b.addEventListener('click',()=>{const[id,status]=b.dataset.officeLeadStatus.split(':');officeLeadStatus(id,status)}));
  host.querySelectorAll('[data-office-next-stage]').forEach(b=>b.addEventListener('click',()=>officeNextStage(b.dataset.officeNextStage)));
  host.querySelectorAll('[data-office-convert]').forEach(b=>b.addEventListener('click',()=>officeConvertLead(b.dataset.officeConvert)));
  host.querySelectorAll('[data-office-metrics]').forEach(b=>b.addEventListener('click',()=>officeCampaignMetrics(b.dataset.officeMetrics)));
}

async function loadOwnerCommand(){
  try{
    state.ownerCommand=await api('/api/v1/owner-command-center?currency=EUR');
    state.ownerOps=await api('/api/v1/warehouse');
    state.ownerAllocation=await api('/api/v1/bom-allocation-plan');
    state.paymentCalendar=await api('/api/v1/payment-calendar?currency=EUR');
    state.ownerCapacity=await api('/api/v1/production-capacity');
    state.capacityLearning=await api('/api/v1/capacity-learning');
    state.cashGap=await api('/api/v1/cash-gap-forecast?currency=EUR');
    state.replenishment=await api('/api/v1/replenishment-plan');
    state.predictiveControl=await api('/api/v1/predictive-owner-control?currency=EUR');
    state.scenarioPlanner=await api('/api/v1/owner-scenario-planner?currency=EUR');
    state.decisionPlans=await api('/api/v1/decision-plans');
    await api('/api/v1/production-operations/sync',{method:'POST',body:'{}'});
    state.operationsTower=await api('/api/v1/operations-control-tower');
    state.procurementAutomation=await api('/api/v1/procurement-automation-center');
    state.ownerFinance=await api(`/api/v1/owner-finance?currency=EUR&month=${encodeURIComponent(state.financeMonth)}`);
    state.ownerFinanceTrend=await api(`/api/v1/owner-finance/trend?currency=EUR&month=${encodeURIComponent(state.financeMonth)}&months=6`);
    state.businessOS=await api(`/api/v1/business-os?currency=EUR&month=${encodeURIComponent(state.financeMonth)}`);
    renderOwnerCommand();
  }catch(e){msg(`Owner Command: ${e.message}`,'ai')}
}
async function ownerAddStock(){
  const sku=prompt('SKU / код фурнитуры:','')??'';if(!sku.trim())return;
  const name=prompt('Название:','')??'';if(!name.trim())return;
  const manufacturer=prompt('Производитель:','')??'';
  const qty=Number(prompt('Фактически на складе:','0')||0);
  const cost=Number(prompt('Закупочная цена за единицу, EUR:','0')||0);
  const min=Number(prompt('Минимальный остаток:','0')||0);
  await api('/api/v1/warehouse/items',{method:'POST',body:JSON.stringify({sku,name,manufacturer,unit:'pcs',onHand:qty,minStock:min,unitCostMinor:Math.round(cost*100),currency:'EUR'})});
  await loadOwnerCommand();
}

async function ownerAdjustStock(){
  const items=state.ownerCommand?.warehouse?.items||[];if(!items.length){msg('Склад пуст.','ai');return}
  const ii=Number(prompt(items.map((x,i)=>`${i}: ${x.name} · on hand ${x.onHand} · reserved ${x.reserved} · free ${x.available}`).join('\n'),'0'));
  const item=items[ii];if(!item)return;
  const delta=Number(prompt('Изменение количества: +приход / -списание','0')||0);
  try{await api(`/api/v1/warehouse/items/${item.id}/adjust`,{method:'POST',body:JSON.stringify({delta})});await loadOwnerCommand()}
  catch(e){msg(`Warehouse adjustment: ${e.message}`,'ai')}
}

async function ownerReserveStock(){
  const items=state.ownerCommand?.warehouse?.items||[],projects=state.ownerCommand?.queue||[];
  if(!items.length||!projects.length){msg('Для резерва нужны складские позиции и активные заказы.','ai');return}
  const ii=Number(prompt(items.map((x,i)=>`${i}: ${x.name} · available ${x.available}`).join('\n'),'0'));
  const pi=Number(prompt(projects.map((x,i)=>`${i}: #${x.queuePosition} ${x.title}`).join('\n'),'0'));
  const item=items[ii],project=projects[pi];if(!item||!project)return;
  const q=Number(prompt(`Количество для ${project.title}:`,'1')||0);
  try{await api('/api/v1/warehouse/reservations',{method:'POST',body:JSON.stringify({itemId:item.id,projectId:project.projectId,quantity:q,priority:project.queuePosition,note:`Reserved for queue #${project.queuePosition}`})});await loadOwnerCommand()}
  catch(e){msg(`Warehouse reservation: ${e.message}`,'ai')}
}

async function ownerAutoAllocateBom(){
  try{
    const out=await api('/api/v1/bom-allocation-plan/apply',{method:'POST',body:'{}'});
    state.ownerAllocation=out.plan;
    msg(`BOM allocation: создано резервов ${out.createdReservations.length}; shortages ${out.plan.shortageCount}.`,'meta');
    await loadOwnerCommand();
  }catch(e){msg(`BOM auto allocation: ${e.message}`,'ai')}
}








async function ownerBusinessCloseProject(){
  const ready=(state.businessOS?.projects||[]).filter(x=>x.closeReady);
  if(!ready.length){msg('Сейчас нет проектов, которые прошли все Business OS Close Gates.','meta');return}
  const i=Number(prompt(ready.map((x,i)=>`${i}: ${x.title} · ${x.client||'—'} · ${money(x.outstandingMinor,'EUR')} outstanding`).join('\n'),'0'));
  const x=ready[i];if(!x)return;
  if(!confirm(`Закрыть проект "${x.title}"? Это изменит Job Stage на CLOSED.`))return;
  try{
    const p=await api(`/api/v1/projects/${x.projectId}`);
    await api(`/api/v1/business-os/projects/${x.projectId}/close`,{method:'POST',body:JSON.stringify({expectedRevision:p.snapshot.revision,closedBy:'owner'})});
    msg(`Project CLOSED: ${x.title}.`,'meta');await loadProjects();await loadOwnerCommand();
  }catch(e){msg(`Business Close Gate: ${e.message}`,'ai')}
}
async function ownerBusinessInspectTruth(){
  const issues=state.businessOS?.truthIssues||[];
  if(!issues.length){msg('Business Truth: противоречий не найдено.','meta');return}
  msg(issues.slice(0,8).map(x=>`${x.severity.toUpperCase()} ${x.code}: ${x.message}`).join('\n'),'ai');
}

async function ownerFinanceChangeMonth(){
  const month=prompt('P&L месяц YYYY-MM:',state.financeMonth)||state.financeMonth;
  if(!/^\d{4}-\d{2}$/.test(month)){msg('Формат месяца: YYYY-MM.','ai');return}
  state.financeMonth=month;await loadOwnerCommand();
}
async function ownerFinanceRecognizeRevenue(){
  const projects=state.ownerCommand?.queue||[];
  const pi=Number(prompt(['-1: Company / no project',...projects.map((x,i)=>`${i}: #${x.queuePosition} ${x.title}`)].join('\n'),'-1'));
  const project=pi>=0?projects[pi]:null;
  const eur=Number(prompt('Сумма признанной выручки, EUR:','0')||0);if(eur<=0)return;
  const date=prompt('Дата YYYY-MM-DD:',new Date().toISOString().slice(0,10))||new Date().toISOString().slice(0,10);
  try{
    await api('/api/v1/owner-finance/ledger',{method:'POST',body:JSON.stringify({
      type:'revenue_recognition',category:'project_revenue',amountMinor:Math.round(eur*100),currency:'EUR',
      effectiveAt:new Date(date+'T12:00:00Z').toISOString(),projectId:project?.projectId,source:'manual',createdBy:'owner',
      note:'Owner revenue recognition'
    })});await loadOwnerCommand()
  }catch(e){msg(`Revenue recognition: ${e.message}`,'ai')}
}
async function ownerFinanceAddExpense(){
  const kind=(prompt('Тип: operating_expense / payroll / tax','operating_expense')||'operating_expense').trim();
  const category=prompt('Категория:','office')||'other';
  const eur=Number(prompt('Сумма, EUR:','0')||0);if(eur<=0)return;
  const date=prompt('Дата YYYY-MM-DD:',new Date().toISOString().slice(0,10))||new Date().toISOString().slice(0,10);
  try{
    await api('/api/v1/owner-finance/ledger',{method:'POST',body:JSON.stringify({
      type:kind,category,amountMinor:Math.round(eur*100),currency:'EUR',
      effectiveAt:new Date(date+'T12:00:00Z').toISOString(),source:'manual',createdBy:'owner'
    })});await loadOwnerCommand()
  }catch(e){msg(`Finance expense: ${e.message}`,'ai')}
}
async function ownerFinanceSettings(){
  const current=(state.ownerOps?.financeSettings||[]).find(x=>x.currency==='EUR')||{};
  const gross=Number(prompt('Целевая Gross Margin, %:',String(current.targetGrossMarginPercent??35))||35);
  const operating=Number(prompt('Целевая Operating Margin, %:',String(current.targetOperatingMarginPercent??15))||15);
  const tax=Number(prompt('Резерв на налог, %:',String(current.taxReservePercent??20))||20);
  const runway=Number(prompt('Безопасный runway, месяцев:',String(current.runwaySafetyMonths??3))||3);
  try{
    await api('/api/v1/owner-finance/settings',{method:'POST',body:JSON.stringify({
      currency:'EUR',targetGrossMarginPercent:gross,targetOperatingMarginPercent:operating,taxReservePercent:tax,runwaySafetyMonths:runway
    })});await loadOwnerCommand()
  }catch(e){msg(`Finance settings: ${e.message}`,'ai')}
}

async function ownerCreateMaterialRfq(){
  const shortages=(state.procurementAutomation?.shortages||[]).filter(x=>x.needsRfq);
  if(!shortages.length){msg('Все BOM shortages уже имеют RFQ или shortage нет.','meta');return}
  const i=Number(prompt(shortages.map((x,i)=>`${i}: #${x.queuePosition} ${x.projectTitle} · ${x.sku} · SHORT ${x.shortage} ${x.unit}`).join('\n'),'0'));
  const d=shortages[i];if(!d)return;
  const deadline=prompt('Deadline ответа YYYY-MM-DD:',new Date(Date.now()+2*86400000).toISOString().slice(0,10))||'';
  const strategy=prompt('Стратегия: optimal / cheapest / fastest','optimal')||'optimal';
  try{
    const out=await api('/api/v1/procurement-automation/rfqs/from-shortage',{method:'POST',body:JSON.stringify({
      projectId:d.projectId,sku:d.sku,strategy,responseDeadline:new Date(deadline+'T17:00:00Z').toISOString(),createdBy:'owner',currency:'EUR'
    })});
    await api(`/api/v1/procurement-automation/rfqs/${out.rfq.id}/drafts`,{method:'POST',body:JSON.stringify({provider:'memory'})});
    msg(`RFQ создан: ${d.sku} · поставщиков ${out.rfq.supplierIds.length}.`,'meta');await loadOwnerCommand();
  }catch(e){msg(`RFQ create: ${e.message}`,'ai')}
}
async function ownerSendMaterialRfq(){
  const rfqs=(state.procurementAutomation?.rfqs||[]).filter(x=>['ready_to_send','sent'].includes(x.status));
  if(!rfqs.length){msg('Нет RFQ, готовых к отправке.','meta');return}
  const i=Number(prompt(rfqs.map((x,i)=>`${i}: ${x.sku} · ${x.projectTitle} · ${x.status}`).join('\n'),'0'));
  const rfq=rfqs[i];if(!rfq||!confirm(`Отправить RFQ ${rfq.sku}? Это внешние письма.`))return;
  const provider=(prompt('Provider: memory / gmail','memory')||'memory').trim();
  const providerAccountRef=provider==='gmail'?(prompt('Gmail connection ID:','')||undefined):undefined;
  try{const out=await api(`/api/v1/procurement-automation/rfqs/${rfq.id}/send`,{method:'POST',body:JSON.stringify({provider,providerAccountRef,approvedBy:'owner'})});msg(`RFQ send: ${out.results.filter(x=>x.status==='sent'||x.status==='already_sent').length}/${out.results.length}.`,'meta');await loadOwnerCommand()}catch(e){msg(`RFQ send: ${e.message}`,'ai')}
}
async function ownerImportMaterialReply(){
  const rfqs=(state.procurementAutomation?.rfqs||[]).filter(x=>!['awarded','closed'].includes(x.status));if(!rfqs.length)return;
  const ri=Number(prompt(rfqs.map((x,i)=>`${i}: ${x.sku} · ${x.projectTitle}`).join('\n'),'0'));const rfq=rfqs[ri];if(!rfq)return;
  const suppliers=(state.ownerOps?.suppliers||[]).filter(x=>rfq.supplierIds.includes(x.id));
  const si=Number(prompt(suppliers.map((x,i)=>`${i}: ${x.name} · ${x.email||'no email'}`).join('\n'),'0'));const supplier=suppliers[si];if(!supplier)return;
  const text=prompt('Вставь ответ с блоком MAKSTER MATERIAL QUOTE:','')||'';if(!text.trim())return;
  try{const out=await api(`/api/v1/procurement-automation/rfqs/${rfq.id}/replies`,{method:'POST',body:JSON.stringify({supplierId:supplier.id,fromEmail:supplier.email,text})});msg(`Reply: ${out.parsed.classification}${out.quoteImported?' · quote imported':''}.`,'meta');await loadOwnerCommand()}catch(e){msg(`Supplier reply: ${e.message}`,'ai')}
}
async function ownerCompareMaterialRfq(){
  const rfqs=(state.procurementAutomation?.rfqs||[]).filter(x=>x.quoteCount>0&&!['awarded','closed'].includes(x.status));if(!rfqs.length){msg('Нет RFQ с котировками.','meta');return}
  const i=Number(prompt(rfqs.map((x,i)=>`${i}: ${x.sku} · quotes ${x.quoteCount}`).join('\n'),'0'));const rfq=rfqs[i];if(!rfq)return;
  const strategy=prompt('optimal / cheapest / fastest',rfq.strategy||'optimal')||'optimal';
  try{const out=await api(`/api/v1/procurement-automation/rfqs/${rfq.id}/compare`,{method:'POST',body:JSON.stringify({strategy})});const best=out.comparison.ranking[0];msg(`Recommended: ${best.supplierName} · ${money(best.totalCostMinor,'EUR')} · ${best.leadTimeDays} дн.`,'meta');await loadOwnerCommand()}catch(e){msg(`RFQ compare: ${e.message}`,'ai')}
}
async function ownerRunRfqReminders(){
  const due=state.procurementAutomation?.summary?.remindersDue??0;if(!due){msg('RFQ reminders сейчас не нужны.','meta');return}
  if(!confirm(`Отправить ${due} напоминаний?`))return;
  try{const out=await api('/api/v1/procurement-automation/reminders/run',{method:'POST',body:JSON.stringify({approvedBy:'owner',afterHours:24})});msg(`Reminders: ${out.results.filter(x=>x.status==='sent').length}/${out.due}.`,'meta');await loadOwnerCommand()}catch(e){msg(`RFQ reminders: ${e.message}`,'ai')}
}
async function ownerSelectMaterialWinner(){
  const rfqs=(state.procurementAutomation?.rfqs||[]).filter(x=>x.recommendedQuoteId&&!['awarded','closed'].includes(x.status));if(!rfqs.length){msg('Сначала Compare.','meta');return}
  const i=Number(prompt(rfqs.map((x,i)=>`${i}: ${x.sku} · ${x.projectTitle}`).join('\n'),'0'));const rfq=rfqs[i];if(!rfq)return;
  const best=rfq.ranking?.find(x=>x.quoteId===rfq.recommendedQuoteId)||rfq.ranking?.[0];
  if(!confirm(`Выбрать ${best?.supplierName||rfq.recommendedQuoteId} winner? PO пока не создаётся.`))return;
  try{await api(`/api/v1/procurement-automation/rfqs/${rfq.id}/select-winner`,{method:'POST',body:JSON.stringify({approvedBy:'owner',quoteId:rfq.recommendedQuoteId})});await loadOwnerCommand()}catch(e){msg(`Winner: ${e.message}`,'ai')}
}
async function ownerAwardMaterialWinner(){
  const rfqs=(state.procurementAutomation?.rfqs||[]).filter(x=>x.status==='winner_selected'&&x.selectedQuoteId);if(!rfqs.length){msg('Нет выбранного winner.','meta');return}
  const i=Number(prompt(rfqs.map((x,i)=>`${i}: ${x.sku} · ${x.projectTitle}`).join('\n'),'0'));const rfq=rfqs[i];if(!rfq)return;
  if(!confirm('Создать Purchase Order и Cash Commitment?'))return;
  try{const project=await api(`/api/v1/projects/${rfq.projectId}`);const out=await api(`/api/v1/supplier-quotes/${rfq.selectedQuoteId}/award`,{method:'POST',body:JSON.stringify({projectId:rfq.projectId,sku:rfq.sku,quantity:rfq.quantity,expectedRevision:project.snapshot.revision,awardedBy:'owner'})});msg(`AWARDED → PO ${out.order.id}.`,'meta');await loadProjects();await loadOwnerCommand()}catch(e){msg(`RFQ award: ${e.message}`,'ai')}
}

async function ownerProductionSync(){
  try{
    await api('/api/v1/production-operations/sync',{method:'POST',body:'{}'});
    state.operationsTower=await api('/api/v1/operations-control-tower');
    renderOwnerCommand();
  }catch(e){msg(`Production sync: ${e.message}`,'ai')}
}
async function ownerProductionAction(operationId,action){
  const op=state.operationsTower?.operations?.find(x=>x.id===operationId);if(!op)return;
  let body={};
  if(action==='assign'){
    const assignee=prompt('Ответственный:',op.assignee||'')||'';if(!assignee.trim())return;body={assignee};
  }else if(action==='start'){
    body={assignee:op.assignee||prompt('Ответственный:',op.assignee||'')||undefined};
  }else if(action==='complete'){
    const actualHours=Number(prompt('Фактические часы:',String(op.actualHours??op.plannedHours))||op.plannedHours);
    body={actualHours,recordedBy:op.assignee||'operator'};
  }else if(action==='block'){
    const reason=prompt('Причина блокировки:','Нет материала / проблема на объекте / техника / другое')||'';if(!reason.trim())return;
    body={reason,assignee:op.assignee};
  }
  try{
    await api(`/api/v1/production-operations/${operationId}/${action}`,{method:'POST',body:JSON.stringify(body)});
    await ownerProductionSync();
  }catch(e){msg(`Production ${action}: ${e.message}`,'ai')}
}

async function ownerCreateDecisionPlan(){
  const planner=state.scenarioPlanner;if(!planner)return;
  const ids=['baseline',...(planner.scenarios||[]).map(x=>x.scenario.id)];
  const recommended=planner.recommendedScenarioId||ids[0];
  const scenarioId=prompt(`Scenario ID:\n${ids.join('\n')}`,recommended)||recommended;
  try{
    const out=await api('/api/v1/decision-plans',{method:'POST',body:JSON.stringify({scenarioId,createdBy:'owner',currency:'EUR'})});
    msg(`Decision Plan created: ${out.plan.scenarioName} · ${out.summary.total} actions.`,'meta');
    await loadOwnerCommand();
  }catch(e){msg(`Decision Plan: ${e.message}`,'ai')}
}
async function ownerDecisionItem(planId,itemId,action){
  try{
    await api(`/api/v1/decision-plans/${planId}/items/${itemId}/${action}`,{method:'POST',body:JSON.stringify({approvedBy:'owner'})});
    await loadOwnerCommand();
  }catch(e){msg(`Decision ${action}: ${e.message}`,'ai')}
}
async function ownerApplyDecisionPlan(planId){
  try{
    const out=await api(`/api/v1/decision-plans/${planId}/apply`,{method:'POST',body:'{}'});
    const applied=(out.results||[]).filter(x=>x.status==='applied').length;
    const external=(out.results||[]).filter(x=>x.status==='ready_external').length;
    msg(`Decision execution: applied ${applied}; external ready ${external}.`,'meta');
    await loadProjects();await loadOwnerCommand();
  }catch(e){msg(`Decision execution: ${e.message}`,'ai')}
}

async function ownerRunCustomScenario(){
  const projects=state.ownerCommand?.queue||[];
  const cash=Number(prompt('What-if: дополнительный/ускоренный входящий cash, EUR:','0')||0);
  const assembly=Number(prompt('What-if: + часов Assembly в день:','0')||0);
  const installation=Number(prompt('What-if: + часов Installation в день:','0')||0);
  const reorder=(prompt('Поднять рисковые заказы вверх очереди? yes/no','no')||'no').toLowerCase().startsWith('y');
  const riskProjects=(state.predictiveControl?.projects||[]).filter(x=>x.scheduleRisk!=='normal').map(x=>x.projectId);
  const queueOrder=reorder?[...riskProjects,...projects.map(x=>x.projectId).filter(id=>!riskProjects.includes(id))]:undefined;
  const body={
    id:`custom-${Date.now()}`,name:'Custom What-If',
    cashInjectionMinor:Math.round(cash*100),
    cashInjectionDate:new Date(Date.now()+86400000).toISOString(),
    extraCapacityHoursPerDay:{...(assembly>0?{assembly}:{}),...(installation>0?{installation}:{})},
    ...(queueOrder?{queueOrder}:{})
  };
  try{
    const r=await api('/api/v1/owner-scenario-planner/evaluate',{method:'POST',body:JSON.stringify(body)});
    state._customScenario=r;renderOwnerCommand();
  }catch(e){msg(`Scenario Planner: ${e.message}`,'ai')}
}

async function ownerRecordActualTime(){
  const projects=state.ownerCommand?.queue||[];if(!projects.length)return;
  const pi=Number(prompt(projects.map((x,i)=>`${i}: #${x.queuePosition} ${x.title}`).join('\n'),'0'));
  const p=projects[pi];if(!p)return;
  const centerKind=(prompt('Центр: cutting / edging / drilling / assembly / installation','assembly')||'assembly').trim();
  const planned=Number(prompt('Сколько часов было запланировано:','8')||0);
  const actual=Number(prompt('Сколько часов реально ушло:','8')||0);
  try{
    await api('/api/v1/production-time-entries',{method:'POST',body:JSON.stringify({projectId:p.projectId,centerKind,plannedHours:planned,actualHours:actual,completedAt:new Date().toISOString(),recordedBy:'owner'})});
    await loadOwnerCommand();
  }catch(e){msg(`Actual time: ${e.message}`,'ai')}
}
async function ownerSetTreasury(){
  const eur=Number(prompt('Текущий доступный остаток денег, EUR:','0')||0);
  try{
    await api('/api/v1/treasury-balance',{method:'POST',body:JSON.stringify({currency:'EUR',openingBalanceMinor:Math.round(eur*100),asOf:new Date().toISOString()})});
    await loadOwnerCommand();
  }catch(e){msg(`Treasury: ${e.message}`,'ai')}
}

async function ownerConfigureWorkCenter(){
  const kind=(prompt('Work center: cutting / edging / drilling / assembly / installation','assembly')||'assembly').trim();
  const name=prompt('Название центра:',kind)||kind;
  const hours=Number(prompt('Доступная мощность в день, часов:','8')||8);
  try{
    await api('/api/v1/production-work-centers',{method:'POST',body:JSON.stringify({id:`wc-${kind}`,name,kind,dailyCapacityHours:hours,active:true,workdays:[1,2,3,4,5]})});
    await loadOwnerCommand();
  }catch(e){msg(`Capacity center: ${e.message}`,'ai')}
}
async function ownerSetCapacityOverride(){
  const projects=state.ownerCommand?.queue||[];if(!projects.length)return;
  const pi=Number(prompt(projects.map((x,i)=>`${i}: #${x.queuePosition} ${x.title}`).join('\n'),'0'));
  const p=projects[pi];if(!p)return;
  const centerKind=(prompt('Центр: cutting / edging / drilling / assembly / installation','assembly')||'assembly').trim();
  const hours=Number(prompt(`Сколько часов реально заложить для ${p.title}:`,'8')||0);
  try{
    await api('/api/v1/production-capacity/overrides',{method:'POST',body:JSON.stringify({projectId:p.projectId,centerKind,hours,note:'Owner override'})});
    await loadOwnerCommand();
  }catch(e){msg(`Capacity override: ${e.message}`,'ai')}
}
async function ownerAwardBestQuote(){
  const shortages=(state.ownerAllocation?.demands||[]).filter(x=>x.shortage>0);
  if(!shortages.length){msg('BOM shortages нет — award не требуется.','meta');return}
  const di=Number(prompt(shortages.map((x,i)=>`${i}: #${x.queuePosition} ${x.projectTitle} · ${x.sku} · SHORT ${x.shortage} ${x.unit}`).join('\n'),'0'));
  const d=shortages[di];if(!d)return;
  const strategy=(prompt('Стратегия: optimal / cheapest / fastest','optimal')||'optimal').trim();
  const cmp=await api(`/api/v1/supplier-quotes/compare?sku=${encodeURIComponent(d.sku)}&quantity=${encodeURIComponent(d.shortage)}&unit=${encodeURIComponent(d.unit)}&strategy=${encodeURIComponent(strategy)}`);
  const ranking=cmp.ranking||[];
  if(!ranking.length){msg(`Нет подходящих supplier quotes для ${d.sku}.`,'ai');return}
  const ri=Number(prompt(ranking.map((x,i)=>`${i}: ${x.supplierName} · ${money(x.totalCostMinor,'EUR')} · ${x.leadTimeDays} дн. · score ${x.score}`).join('\n'),'0'));
  const pick=ranking[ri];if(!pick)return;
  const project=await api(`/api/v1/projects/${d.projectId}`);
  try{
    const out=await api(`/api/v1/supplier-quotes/${pick.quoteId}/award`,{method:'POST',body:JSON.stringify({
      projectId:d.projectId,sku:d.sku,quantity:d.shortage,expectedRevision:project.snapshot.revision,awardedBy:'owner'
    })});
    msg(`AWARDED: ${pick.supplierName} → PO ${out.order.id} · commitment ${money(out.cashCommitment.amountMinor,out.cashCommitment.currency)}.`,'meta');
    await loadProjects();await loadOwnerCommand();
  }catch(e){msg(`Procurement award: ${e.message}`,'ai')}
}

async function ownerAddSupplierQuote(){
  const suppliers=state.ownerOps?.suppliers||[],shortages=(state.ownerAllocation?.demands||[]).filter(x=>x.shortage>0);
  if(!suppliers.length||!shortages.length){msg('Для quote нужны поставщик и BOM shortage.','ai');return}
  const si=Number(prompt(suppliers.map((x,i)=>`${i}: ${x.name}`).join('\n'),'0'));
  const di=Number(prompt(shortages.map((x,i)=>`${i}: ${x.sku} · shortage ${x.shortage} ${x.unit} · ${x.projectTitle}`).join('\n'),'0'));
  const supplier=suppliers[si],d=shortages[di];if(!supplier||!d)return;
  const price=Number(prompt(`Цена за ${d.unit}, EUR:`,'0')||0);
  const lead=Number(prompt('Срок поставки, дней:',String(supplier.leadTimeDays||7))||7);
  const delivery=Number(prompt('Доставка, EUR:','0')||0);
  await api('/api/v1/supplier-quotes',{method:'POST',body:JSON.stringify({
    supplierId:supplier.id,currency:'EUR',leadTimeDays:lead,deliveryCostMinor:Math.round(delivery*100),
    lines:[{sku:d.sku,quantity:d.shortage,unit:d.unit,unitPriceMinor:Math.round(price*100)}]
  })});
  await loadOwnerCommand();
}

async function ownerAddSupplier(){
  const name=prompt('Поставщик:','')??'';if(!name.trim())return;
  const lead=Number(prompt('Средний срок поставки, дней:','5')||5);
  const reliability=Number(prompt('Надёжность, %:','95')||95);
  const defect=Number(prompt('Брак, %:','1')||1);
  const price=Number(prompt('Индекс цены (100 = средний, меньше = дешевле):','100')||100);
  const terms=Number(prompt('Отсрочка оплаты, дней:','14')||14);
  await api('/api/v1/suppliers',{method:'POST',body:JSON.stringify({name,currency:'EUR',leadTimeDays:lead,reliabilityPct:reliability,defectPct:defect,paymentTermsDays:terms,priceIndex:price,active:true})});
  await loadOwnerCommand();
}
async function ownerAddFixedCost(){
  const category=prompt('Постоянный расход (аренда/зарплата/и т.д.):','Аренда')??'';if(!category.trim())return;
  const value=Number(prompt('Сумма в месяц, EUR:','0')||0);
  await api('/api/v1/cash-flow/fixed-costs',{method:'POST',body:JSON.stringify({category,amountMinor:Math.round(value*100),currency:'EUR'})});
  await loadOwnerCommand();
}
async function ownerAddCashEvent(){
  const type=(prompt('inflow / outflow','outflow')||'outflow')==='inflow'?'inflow':'outflow';
  const category=prompt('Категория: supplier / rent / salary / tax / client_payment / other','other')||'other';
  const value=Number(prompt('Сумма EUR:','0')||0);
  const dueAt=prompt('Дата YYYY-MM-DD:',new Date().toISOString().slice(0,10))||new Date().toISOString().slice(0,10);
  const counterparty=prompt('Контрагент:','')||'';
  await api('/api/v1/cash-flow/events',{method:'POST',body:JSON.stringify({type,category,amountMinor:Math.round(value*100),currency:'EUR',dueAt:new Date(dueAt+'T12:00:00Z').toISOString(),status:'committed',counterparty})});
  await loadOwnerCommand();
}
function renderOwnerCommand(){
  const host=$('htmlStage'),r=state.ownerCommand;
  if(!r&&!state._ownerLoading){state._ownerLoading=true;api('/api/v1/owner-command-center?currency=EUR').then(async x=>{state.ownerCommand=x;state.ownerOps=await api('/api/v1/warehouse');state.ownerAllocation=await api('/api/v1/bom-allocation-plan');state.paymentCalendar=await api('/api/v1/payment-calendar?currency=EUR');state.ownerCapacity=await api('/api/v1/production-capacity');state.capacityLearning=await api('/api/v1/capacity-learning');state.cashGap=await api('/api/v1/cash-gap-forecast?currency=EUR');state.replenishment=await api('/api/v1/replenishment-plan');state.predictiveControl=await api('/api/v1/predictive-owner-control?currency=EUR');state.scenarioPlanner=await api('/api/v1/owner-scenario-planner?currency=EUR');state.decisionPlans=await api('/api/v1/decision-plans');await api('/api/v1/production-operations/sync',{method:'POST',body:'{}'});state.operationsTower=await api('/api/v1/operations-control-tower');state.procurementAutomation=await api('/api/v1/procurement-automation-center');state.ownerFinance=await api(`/api/v1/owner-finance?currency=EUR&month=${encodeURIComponent(state.financeMonth)}`);state.ownerFinanceTrend=await api(`/api/v1/owner-finance/trend?currency=EUR&month=${encodeURIComponent(state.financeMonth)}&months=6`);state.businessOS=await api(`/api/v1/business-os?currency=EUR&month=${encodeURIComponent(state.financeMonth)}`);state._ownerLoading=false;renderOwnerCommand()}).catch(e=>{state._ownerLoading=false;msg(`Owner Command: ${e.message}`,'ai')})}
  if(!r){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Owner Command Center</strong><p>Загрузка управленческого контура…</p></div></div>';return}
  const M=x=>money(x,r.currency);
  const queue=(r.queue||[]).map(x=>`<div class="owner-order ${x.risk}"><div class="owner-num">#${x.queuePosition}</div><div><strong>${esc(x.title)}</strong><p>${esc(jobStageLabel(x.stage))} · ${esc(x.client||'—')}${x.dueAt?` · ${esc(x.dueAt.slice(0,10))}`:''}</p><small>${M(x.contractValueMinor)} · оплачено ${M(x.receivedMinor)} · остаток ${M(x.outstandingMinor)} · margin ${x.forecastMarginPercent}%</small></div><span class="pill ${x.risk==='normal'?'good':'warn'}">${esc(x.risk.toUpperCase())}</span></div>`).join('');
  const stock=(r.warehouse?.items||[]).map(x=>`<div class="purchase-row"><div><strong>${esc(x.name)}</strong><small>${esc(x.sku)} · ${esc(x.manufacturer||'')} · on hand ${x.onHand} · reserved ${x.reserved}</small></div><div><strong>${x.available} available</strong>${(x.minStock??0)>x.available?' <span class="pill warn">LOW</span>':''}</div></div>`).join('');
  const suppliers=(r.suppliers?.optimal||[]).map((x,i)=>`<div class="purchase-row"><div><strong>#${i+1} ${esc(x.name)}</strong><small>${x.leadTimeDays} дн. · reliability ${x.reliabilityPct}% · defect ${x.defectPct}% · price index ${x.priceIndex}</small></div><div><strong>${x.score}</strong></div></div>`).join('');
  const alerts=(r.alerts||[]).map(x=>`<div class="business-alert"><strong>ATTENTION</strong><p>${esc(x)}</p></div>`).join('');
  const cashEvents=(r.cashFlow?.events||[]).map(x=>`<div class="purchase-row"><div><strong>${esc(x.counterparty||x.category)}</strong><small>${esc(x.dueAt.slice(0,10))} · ${esc(x.category)} · ${esc(x.status)}</small></div><div><strong>${x.type==='inflow'?'+':'−'}${M(x.amountMinor)}</strong></div></div>`).join('');
  const allocation=state.ownerAllocation;
  const shortages=(allocation?.demands||[]).filter(x=>x.shortage>0).map(x=>`<div class="purchase-row"><div><strong>${esc(x.sku)}</strong><small>#${x.queuePosition} ${esc(x.projectTitle)} · need ${x.required} · reserved ${x.existingReserved} · auto ${x.allocatedFromFreeStock}</small></div><div><span class="pill warn">SHORT ${x.shortage} ${esc(x.unit)}</span></div></div>`).join('');
  const payRows=(state.paymentCalendar?.rows||[]).slice(0,30).map(x=>`<div class="purchase-row"><div><strong>${esc(x.counterparty||x.category)}</strong><small>${esc(x.date.slice(0,10))} · ${esc(x.source)} · running ${M(x.runningNetMinor)}</small></div><div><strong>${x.type==='inflow'?'+':'−'}${M(x.amountMinor)}</strong></div></div>`).join('');
  const capacity=state.ownerCapacity;
  const capacityRows=(capacity?.projectSummary||[]).map(x=>`<div class="owner-order ${x.risk==='late'?'late':x.risk==='tight'?'high':'normal'}"><div class="owner-num">#${x.queuePosition}</div><div><strong>${esc(x.projectTitle)}</strong><p>${esc(x.productionStart)} → workshop ${esc(x.productionFinish)} → install ${esc(x.installationFinish)}</p><small>${x.totalHours} h · ${x.daysBuffer==null?'no target':`${x.daysBuffer} day buffer`}</small></div><span class="pill ${x.risk==='normal'?'good':'warn'}">${esc(x.risk.toUpperCase())}</span></div>`).join('');
  const centerRows=(capacity?.centerUtilization||[]).map(x=>`<div class="purchase-row"><div><strong>${esc(x.centerName)}</strong><small>${esc(x.centerKind)} · ${x.dailyCapacityHours} h/day</small></div><div><strong>${x.scheduledHours} h scheduled</strong></div></div>`).join('');
  const awards=(state.ownerOps?.procurementAwards||[]).slice().reverse().slice(0,12).map(x=>`<div class="purchase-row"><div><strong>${esc(x.sku)}</strong><small>${esc(x.status)} · ${esc(x.projectId)}${x.purchaseOrderId?` · PO ${esc(x.purchaseOrderId)}`:''}</small></div><div><strong>${M(x.totalCostMinor)}</strong></div></div>`).join('');
  const learningRows=(state.capacityLearning?.centers||[]).map(x=>`<div class="purchase-row"><div><strong>${esc(x.centerKind)}</strong><small>${x.sampleCount} samples · confidence ${Math.round(x.confidence*100)}% · ${esc(x.status)}</small></div><div><strong>×${x.learnedMultiplier}</strong></div></div>`).join('');
  const replRows=(state.replenishment?.items||[]).slice(0,30).map(x=>`<div class="purchase-row"><div><strong>${esc(x.name)}</strong><small>${esc(x.sku)} · free ${x.available} · min ${x.minStock} · BOM shortage ${x.bomShortage}</small></div><div><span class="pill warn">ORDER ${x.recommendedOrderQuantity} ${esc(x.unit)}</span></div></div>`).join('');
  const gap=state.cashGap;
  const predictive=state.predictiveControl;
  const scenarios=state.scenarioPlanner;
  const scenarioRows=[scenarios?.baseline,...(scenarios?.scenarios||[])].filter(Boolean).map(x=>`<div class="scenario-row ${x.scenario.id===scenarios?.recommendedScenarioId?'recommended':''}"><div><strong>${esc(x.scenario.name)}${x.scenario.id===scenarios?.recommendedScenarioId?' · RECOMMENDED':''}</strong><p>Risk ${x.riskScore}/100 · cash gap ${M(x.cashGapMinor)} · schedule risk ${x.scheduleRiskProjects} · critical ${x.criticalActions}</p><small>Score ${x.score} · Δrisk ${x.improvement.riskScoreDelta} · Δcash ${M(x.improvement.cashGapDeltaMinor)} · Δschedule ${x.improvement.scheduleRiskDelta}</small></div><span class="pill ${x.overallRisk==='critical'||x.overallRisk==='high'?'warn':'good'}">${esc(x.overallRisk.toUpperCase())}</span></div>`).join('');
  const customScenario=state._customScenario;
  const decisionPlans=(state.decisionPlans?.plans||[]);
  const bos=state.businessOS;
  const bosProjects=(bos?.projects||[]).map(x=>`<div class="owner-order ${x.truthIssues>0?'high':x.closeReady?'normal':x.lifecycleStatus==='RED'?'late':'normal'}"><div class="owner-num">${esc(x.stage.toUpperCase())}</div><div><strong>${esc(x.title)}</strong><p>${esc(x.client||'—')} · lifecycle ${esc(x.lifecycleState)} / ${esc(x.lifecycleStatus)} · production ${esc(x.currentOperation||'—')} ${esc(x.productionStatus)}</p><small>contract ${M(x.contractValueMinor)} · AR ${M(x.outstandingMinor)} · profit ${M(x.forecastProfitMinor)} · margin ${x.forecastMarginPercent}% · truth issues ${x.truthIssues}</small><div class="bos-next">${esc(x.nextAction)}</div></div><span class="pill ${x.closeReady?'good':x.truthIssues>0?'warn':''}">${x.closeReady?'CLOSE READY':x.truthIssues?`${x.truthIssues} ISSUE`:esc(x.lifecycleStatus)}</span></div>`).join('');
  const bosIssues=(bos?.truthIssues||[]).slice(0,12).map(x=>`<div class="business-alert"><strong>${esc(x.severity.toUpperCase())} · ${esc(x.code)}</strong><p>${esc(x.message)}</p></div>`).join('');
  const bosActions=(bos?.nextOwnerActions||[]).slice(0,10).map(x=>`<div class="purchase-row"><div><strong>P${x.priority} · ${esc(x.title)}</strong><small>${esc(x.reason)}</small></div><span class="pill ${x.severity==='critical'||x.severity==='high'?'warn':'good'}">${esc(x.severity.toUpperCase())}</span></div>`).join('');
  const finance=state.ownerFinance,financeTrend=state.ownerFinanceTrend;
  const pnlRows=(finance?.pnl?.rows||[]).map(x=>`<div class="finance-pnl-row"><div><strong>${esc(x.category)}</strong></div><div>${M(x.actualMinor)}</div><div>${M(x.forecastMinor)}</div><div class="${x.varianceMinor<0?'bad-text':'good-text'}">${M(x.varianceMinor)}</div></div>`).join('');
  const financeProjects=(finance?.projects||[]).slice(0,12).map((x,i)=>`<div class="owner-order ${x.forecastMarginPercent<15?'high':'normal'}"><div class="owner-num">#${i+1}</div><div><strong>${esc(x.title)}</strong><p>${esc(x.client||'—')} · ${esc(x.stage)} · contract ${M(x.contractValueMinor)}</p><small>forecast profit ${M(x.forecastProfitMinor)} · margin ${x.forecastMarginPercent}% · received ${x.cashConversionPercent}% · AR ${M(x.accountsReceivableMinor)}</small></div><span class="pill ${x.forecastMarginPercent<15?'warn':'good'}">${x.rankScore}</span></div>`).join('');
  const financeAlerts=(finance?.alerts||[]).slice(0,10).map(x=>`<div class="business-alert"><strong>${esc(x.severity.toUpperCase())} · ${esc(x.code)}</strong><p>${esc(x.message)}</p></div>`).join('');
  const trendRows=(financeTrend?.months||[]).map(x=>`<div class="finance-trend-row"><span>${esc(x.month)}</span><span>${M(x.revenueActualMinor)}</span><span>${M(x.revenueForecastMinor)}</span><span>${M(x.operatingProfitForecastMinor)}</span><span>${x.grossMarginForecastPercent}%</span></div>`).join('');
  const procurement=state.procurementAutomation;
  const procurementRfqs=(procurement?.rfqs||[]).map(x=>`<div class="procurement-rfq ${x.overdue?'overdue':''}"><div><strong>${esc(x.sku)} · ${esc(x.projectTitle)}</strong><p>${x.quantity} ${esc(x.unit)} · ${esc(x.status)} · quotes ${x.quoteCount}/${x.supplierIds.length} · pending ${x.pendingSupplierCount}</p><small>${x.overdue?'OVERDUE · ':''}deadline ${esc(x.responseDeadline.slice(0,10))}${x.ranking?.[0]?` · best ${esc(x.ranking[0].supplierName)} ${M(x.ranking[0].totalCostMinor)} / ${x.ranking[0].leadTimeDays}d`:''}</small></div><span class="pill ${x.status==='awarded'?'good':x.overdue?'warn':''}">${esc(x.status.toUpperCase())}</span></div>`).join('');
  const outsourceRfqs=(procurement?.outsourceRfqs||[]).slice(-8).reverse().map(x=>`<div class="purchase-row"><div><strong>OUTSOURCE · ${esc(x.rfq.rfqId)}</strong><small>${esc(x.rfq.services.join(', '))} · rev ${x.rfq.revision} · invited ${x.rfq.invitedSupplierIds.length}</small></div><div><strong>${x.quotes.length} quotes</strong></div></div>`).join('');
  const tower=state.operationsTower;
  const prodProjects=(tower?.projects||[]).map(x=>`<div class="owner-order ${x.risk==='late'?'late':x.risk==='tight'||x.risk==='high'?'high':'normal'}"><div class="owner-num">#${x.queuePosition}</div><div><strong>${esc(x.projectTitle)}</strong><p>${esc(x.currentOperation||'done')} · ${esc(x.currentStatus)} · ${x.completedOperations}/${x.totalOperations} operations</p><small>baseline ${esc(x.baselineInstallationFinish||'—')} → recalculated ${esc(x.recalculatedInstallationFinish||'—')} · delay ${x.executionDelayDays} d${x.daysBuffer!=null?` · buffer ${x.daysBuffer} d`:''}</small>${x.blockers?.length?`<div class="prod-blocker">${x.blockers.map(esc).join(' · ')}</div>`:''}</div><span class="pill ${x.risk==='normal'?'good':'warn'}">${esc(x.risk.toUpperCase())}</span></div>`).join('');
  const prodOps=(tower?.operations||[]).filter(x=>!['completed','skipped'].includes(x.status)).sort((a,b)=>a.queuePosition-b.queuePosition||a.sequence-b.sequence).map(x=>`<div class="production-op ${esc(x.status)}"><div><strong>#${x.queuePosition} ${esc(x.projectTitle)} · ${esc(x.centerName)}</strong><p>${esc(x.plannedStart)} → ${esc(x.plannedFinish)}${x.cascadeDelayDays>0?` · RECALC ${esc(x.recalculatedStart)} → ${esc(x.recalculatedFinish)}`:''} · ${x.plannedHours} h · ${esc(x.assignee||'unassigned')}</p><small>${esc(x.status)}${x.cascadeDelayDays>0?` · cascade +${x.cascadeDelayDays} d`:''}${x.blockedReason?` · BLOCKED: ${esc(x.blockedReason)}`:''}</small></div><div class="prod-actions">${!x.assignee&&x.status!=='completed'?`<button class="secondary" data-prod="${esc(x.id)}" data-prod-action="assign">Assign</button>`:''}${x.status==='ready'?`<button data-prod="${esc(x.id)}" data-prod-action="start">Start</button>`:''}${x.status==='in_progress'||x.status==='ready'?`<button class="secondary" data-prod="${esc(x.id)}" data-prod-action="complete">Complete</button>`:''}${!['blocked','completed','skipped'].includes(x.status)?`<button class="secondary" data-prod="${esc(x.id)}" data-prod-action="block">Block</button>`:''}${x.status==='blocked'?`<button data-prod="${esc(x.id)}" data-prod-action="unblock">Unblock</button>`:''}</div></div>`).join('');

  const latestPlan=decisionPlans[0];
  const decisionItems=(latestPlan?.items||[]).map(x=>`<div class="decision-item ${esc(x.status)}"><div><strong>${esc(x.title)}</strong><p>${esc(x.description)}</p><small>${esc(x.type)} · ${x.externalAction?'EXTERNAL':'INTERNAL'} · ${esc(x.status)}</small></div><div class="decision-actions">${x.status==='pending_approval'?`<button data-plan="${esc(latestPlan.id)}" data-item="${esc(x.id)}" data-decision="approve">Approve</button><button class="secondary" data-plan="${esc(latestPlan.id)}" data-item="${esc(x.id)}" data-decision="reject">Reject</button>`:''}</div></div>`).join('');


  const actionRows=(predictive?.actions||[]).slice(0,20).map(x=>`<div class="predictive-action ${esc(x.severity)}"><div><strong>${esc(x.title)}</strong><p>${esc(x.reason)}</p><small>${esc(x.recommendedAction)}${x.dueAt?` · до ${esc(x.dueAt.slice(0,10))}`:''}</small></div><span class="pill ${x.severity==='critical'||x.severity==='high'?'warn':'good'}">${esc(x.severity.toUpperCase())}</span></div>`).join('');
  const riskRows=(predictive?.projects||[]).map(x=>`<div class="owner-order ${x.level==='critical'||x.level==='high'?'high':'normal'}"><div class="owner-num">#${x.queuePosition}</div><div><strong>${esc(x.projectTitle)}</strong><p>Risk ${x.score}/100 · schedule ${esc(x.scheduleRisk)} · shortages ${x.shortageCount}</p><small>margin ${x.marginPercent}% · cash exposure ${M(x.cashExposureMinor)} · actions ${x.actionCount}</small></div><span class="pill ${x.level==='critical'||x.level==='high'?'warn':'good'}">${esc(x.level.toUpperCase())}</span></div>`).join('');





  host.innerHTML=`<div class="dashboard owner-command"><div class="owner-hero"><div><span class="eyebrow">MAKSTER AI 5.6</span><h2>Owner Command Center</h2><p>Все заказы, деньги, склад, резервы и поставщики — сверху, на уровне всей фирмы.</p></div><div class="owner-kpi"><strong>${r.activeProjectCount}</strong><span>active jobs</span></div></div>
  <div class="metrics"><div class="metric"><label>Contracts</label><strong>${M(r.financials.contractTotalMinor)}</strong></div><div class="metric good"><label>Received</label><strong>${M(r.financials.receivedTotalMinor)}</strong></div><div class="metric bad"><label>Receivables</label><strong>${M(r.financials.outstandingTotalMinor)}</strong></div><div class="metric"><label>Committed purchases</label><strong>${M(r.financials.committedPurchasesMinor)}</strong></div><div class="metric"><label>Cash commitments</label><strong>${M(r.financials.committedCashOutMinor)}</strong></div><div class="metric"><label>Uncommitted received</label><strong>${M(r.financials.uncommittedReceivedMinor)}</strong></div><div class="metric"><label>Forecast margin</label><strong>${M(r.financials.forecastMarginTotalMinor)} · ${r.financials.forecastMarginPercent}%</strong></div><div class="metric"><label>Break-even revenue</label><strong>${M(r.breakEven.breakEvenRevenueMinor)}</strong></div></div>
  <div class="card"><h3>Cash Forecast</h3><div class="card-body"><div class="metrics"><div class="metric"><label>7 days</label><strong>${M(r.cashFlow.d7.netMinor)}</strong><small>in ${M(r.cashFlow.d7.inflowMinor)} / out ${M(r.cashFlow.d7.outflowMinor)}</small></div><div class="metric"><label>30 days</label><strong>${M(r.cashFlow.d30.netMinor)}</strong><small>in ${M(r.cashFlow.d30.inflowMinor)} / out ${M(r.cashFlow.d30.outflowMinor)}</small></div><div class="metric"><label>90 days</label><strong>${M(r.cashFlow.d90.netMinor)}</strong><small>in ${M(r.cashFlow.d90.inflowMinor)} / out ${M(r.cashFlow.d90.outflowMinor)}</small></div></div><div class="cash-bars"><div><span>7d</span><i style="width:${Math.min(100,Math.abs(r.cashFlow.d7.netMinor)/(Math.max(1,Math.abs(r.cashFlow.d30.netMinor),Math.abs(r.cashFlow.d90.netMinor)))*100)}%"></i></div><div><span>30d</span><i style="width:${Math.min(100,Math.abs(r.cashFlow.d30.netMinor)/(Math.max(1,Math.abs(r.cashFlow.d30.netMinor),Math.abs(r.cashFlow.d90.netMinor)))*100)}%"></i></div><div><span>90d</span><i style="width:${Math.min(100,Math.abs(r.cashFlow.d90.netMinor)/(Math.max(1,Math.abs(r.cashFlow.d30.netMinor),Math.abs(r.cashFlow.d90.netMinor)))*100)}%"></i></div></div><div class="toolbar-form"><button id="ownerCashAdd" class="secondary">+ Cash event</button><button id="ownerFixedAdd" class="secondary">+ Fixed monthly cost</button></div>${cashEvents?`<div class="cash-ledger">${cashEvents}</div>`:''}</div></div>
  ${alerts}
  <div class="card"><h3>Order / Production Queue</h3><div class="card-body">${queue||'<p class="meta-note">Активных заказов нет.</p>'}</div></div>
  <div class="card bos-card"><h3>Makster AI 5.0 · Business Operating System</h3><div class="card-body"><div class="bos-health ${esc(bos?.health||'red')}"><div><label>Business Health</label><strong>${bos?.healthScore??0}/100 · ${esc((bos?.health||'red').toUpperCase())}</strong></div><small>Single operating truth across ProjectModel, Production, Procurement and Finance.</small></div><div class="metrics"><div class="metric"><label>Active projects</label><strong>${bos?.summary?.activeProjects??0}</strong></div><div class="metric"><label>Closed</label><strong>${bos?.summary?.closedProjects??0}</strong></div><div class="metric bad"><label>Truth issues</label><strong>${bos?.summary?.truthIssueCount??0}</strong></div><div class="metric bad"><label>Critical truth</label><strong>${bos?.summary?.criticalTruthIssues??0}</strong></div><div class="metric"><label>Production blocked</label><strong>${bos?.summary?.productionBlockedProjects??0}</strong></div><div class="metric"><label>Procurement blocked</label><strong>${bos?.summary?.procurementBlockedProjects??0}</strong></div><div class="metric"><label>Unpaid projects</label><strong>${bos?.summary?.financiallyUnpaidProjects??0}</strong></div><div class="metric good"><label>Close ready</label><strong>${bos?.summary?.closeReadyProjects??0}</strong></div></div><div class="bos-company"><div><label>Backlog</label><strong>${M(bos?.company?.contractBacklogMinor??0)}</strong></div><div><label>Outstanding client</label><strong>${M(bos?.company?.outstandingClientMinor??0)}</strong></div><div><label>Forecast profit</label><strong>${M(bos?.company?.forecastProfitMinor??0)}</strong></div><div><label>Treasury</label><strong>${M(bos?.company?.treasuryMinor??0)}</strong></div><div><label>Accounts payable</label><strong>${M(bos?.company?.accountsPayableMinor??0)}</strong></div><div><label>Operating forecast</label><strong>${M(bos?.company?.operatingProfitForecastMinor??0)}</strong></div></div><div class="toolbar-form"><button id="ownerBosTruth" class="secondary">Проверить Business Truth</button><button id="ownerBosClose">Закрыть Close-Ready проект</button></div>${bosIssues}<div class="bos-actions"><h4>Next Owner Actions</h4>${bosActions||'<p class="meta-note">Критических действий нет.</p>'}</div><div class="bos-projects"><h4>End-to-End Project State</h4>${bosProjects||'<p class="meta-note">Проектов нет.</p>'}</div></div></div>
  <div class="card"><h3>Owner Finance · P&amp;L Intelligence</h3><div class="card-body"><div class="finance-period"><strong>${esc(finance?.period?.month||state.financeMonth)}</strong><span>${finance?.period?.basis==='recognized_revenue'?'Recognized revenue':'Cash receipts fallback'}</span></div><div class="metrics"><div class="metric"><label>Revenue actual</label><strong>${M(finance?.pnl?.revenueActualMinor??0)}</strong></div><div class="metric"><label>Revenue forecast</label><strong>${M(finance?.pnl?.revenueForecastMinor??0)}</strong></div><div class="metric ${Number(finance?.pnl?.grossProfitForecastMinor??0)<0?'bad':'good'}"><label>Gross profit forecast</label><strong>${M(finance?.pnl?.grossProfitForecastMinor??0)}</strong></div><div class="metric"><label>Gross margin</label><strong>${finance?.pnl?.grossMarginForecastPercent??0}%</strong></div><div class="metric ${Number(finance?.pnl?.operatingProfitForecastMinor??0)<0?'bad':'good'}"><label>Operating profit</label><strong>${M(finance?.pnl?.operatingProfitForecastMinor??0)}</strong></div><div class="metric"><label>Operating margin</label><strong>${finance?.pnl?.operatingMarginForecastPercent??0}%</strong></div><div class="metric"><label>Accounts receivable</label><strong>${M(finance?.workingCapital?.accountsReceivableMinor??0)}</strong></div><div class="metric"><label>Accounts payable</label><strong>${M(finance?.workingCapital?.accountsPayableMinor??0)}</strong></div><div class="metric ${finance?.liquidity?.runwayStatus==='critical'?'bad':finance?.liquidity?.runwayStatus==='strong'?'good':''}"><label>Cash runway</label><strong>${finance?.liquidity?.runwayMonths==null?'—':`${finance.liquidity.runwayMonths} mo`}</strong></div><div class="metric ${finance?.breakEven?.achieved?'good':'bad'}"><label>Break-even gap</label><strong>${M(finance?.breakEven?.revenueGapMinor??0)}</strong></div></div><div class="toolbar-form"><button id="ownerFinanceMonth" class="secondary">Месяц</button><button id="ownerFinanceRevenue" class="secondary">+ Recognized revenue</button><button id="ownerFinanceExpense" class="secondary">+ Operating expense</button><button id="ownerFinanceSettings" class="secondary">Finance settings</button></div><div class="finance-pnl"><div class="finance-pnl-head"><span>P&amp;L</span><span>Actual</span><span>Forecast</span><span>Variance</span></div>${pnlRows}</div><div class="finance-break-even"><strong>Break-even</strong><p>Fixed ${M(finance?.breakEven?.fixedMonthlyMinor??0)} · contribution margin ${finance?.breakEven?.contributionMarginPercent??0}% · required revenue ${M(finance?.breakEven?.breakEvenRevenueMinor??0)} · contracted this month ${M(finance?.breakEven?.contractedRevenueMinor??0)}</p></div><div class="finance-trend"><div class="finance-trend-row finance-trend-head"><span>Month</span><span>Revenue actual</span><span>Revenue forecast</span><span>Op. profit forecast</span><span>Gross margin</span></div>${trendRows}</div>${financeAlerts}<div class="finance-projects"><h4>Project Profitability Ranking</h4>${financeProjects||'<p class="meta-note">Нет финансовых проектов.</p>'}</div></div></div>
  <div class="card"><h3>Procurement Automation · RFQ Center</h3><div class="card-body"><div class="metrics"><div class="metric bad"><label>BOM shortages</label><strong>${procurement?.summary?.shortagePositions??0}</strong></div><div class="metric"><label>Without RFQ</label><strong>${procurement?.summary?.shortagesWithoutRfq??0}</strong></div><div class="metric"><label>Open RFQ</label><strong>${procurement?.summary?.openRfqs??0}</strong></div><div class="metric bad"><label>Overdue RFQ</label><strong>${procurement?.summary?.overdueRfqs??0}</strong></div><div class="metric good"><label>Quotes</label><strong>${procurement?.summary?.quotesReceived??0}</strong></div><div class="metric"><label>Winner ready</label><strong>${procurement?.summary?.recommendedWinners??0}</strong></div><div class="metric"><label>Reminders due</label><strong>${procurement?.summary?.remindersDue??0}</strong></div></div><div class="toolbar-form"><button id="ownerRfqCreate">RFQ из BOM shortage</button><button id="ownerRfqSend" class="secondary">Отправить RFQ</button><button id="ownerRfqReply" class="secondary">Импорт ответа</button><button id="ownerRfqCompare" class="secondary">Compare</button><button id="ownerRfqReminders" class="secondary">Send reminders</button><button id="ownerRfqSelect" class="secondary">Select winner</button><button id="ownerRfqAward" class="secondary">Award → PO</button></div>${procurementRfqs||'<p class="meta-note">Material/Hardware RFQ пока нет.</p>'}${outsourceRfqs?`<div class="procurement-outsource"><h4>Outsource Production RFQ</h4>${outsourceRfqs}</div>`:''}</div></div>
  <div class="card"><h3>Operations Control Tower · Production Board</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Active projects</label><strong>${tower?.summary?.activeProjects??0}</strong></div><div class="metric bad"><label>Blocked</label><strong>${tower?.summary?.blockedOperations??0}</strong></div><div class="metric"><label>In progress</label><strong>${tower?.summary?.operationsInProgress??0}</strong></div><div class="metric good"><label>Ready</label><strong>${tower?.summary?.operationsReady??0}</strong></div><div class="metric"><label>Cascade delayed</label><strong>${tower?.summary?.cascadeDelayedOperations??0}</strong></div><div class="metric bad"><label>Late projects</label><strong>${tower?.summary?.lateProjects??0}</strong></div></div><div class="toolbar-form"><button id="ownerProductionSync" class="secondary">Пересчитать Production Board</button></div><div class="production-board-tabs"><span>Today ${tower?.board?.today?.length??0}</span><span>Tomorrow ${tower?.board?.tomorrow?.length??0}</span><span>This week ${tower?.board?.thisWeek?.length??0}</span></div>${prodProjects||'<p class="meta-note">Активных производственных проектов нет.</p>'}<div class="production-ops-list">${prodOps||'<p class="meta-note">Нет активных операций.</p>'}</div></div></div>
  <div class="card"><h3>Decision Execution Center</h3><div class="card-body"><div class="toolbar-form"><button id="ownerCreateDecisionPlan">Создать Decision Plan из сценария</button>${latestPlan?`<button id="ownerApplyDecisionPlan" class="secondary">Применить одобренные действия</button>`:''}</div>${latestPlan?`<div class="decision-plan-head"><strong>${esc(latestPlan.scenarioName)}</strong><p>Status ${esc(latestPlan.status)} · risk ${latestPlan.baselineRiskScore} → ${latestPlan.scenarioRiskScore} · cash gap ${M(latestPlan.baselineCashGapMinor)} → ${M(latestPlan.scenarioCashGapMinor)}</p></div>${decisionItems}`:'<p class="meta-note">Decision Plan ещё не создан.</p>'}</div></div>
  <div class="card"><h3>Owner Scenario Planner · What-If</h3><div class="card-body"><div class="scenario-recommendation"><strong>${esc(scenarios?.recommendedReason||'—')}</strong></div><div class="toolbar-form"><button id="ownerCustomScenario" class="secondary">Запустить свой What-If</button></div>${scenarioRows||'<p class="meta-note">Сценарии ещё не рассчитаны.</p>'}${customScenario?`<div class="scenario-custom"><strong>Custom result</strong><p>Risk ${customScenario.riskScore}/100 · Cash gap ${M(customScenario.cashGapMinor)} · Schedule risk ${customScenario.scheduleRiskProjects} · Score ${customScenario.score}</p></div>`:''}</div></div>
  <div class="card"><h3>Predictive Owner Control</h3><div class="card-body"><div class="metrics"><div class="metric ${predictive?.overallRisk==='critical'||predictive?.overallRisk==='high'?'bad':'good'}"><label>Overall risk</label><strong>${esc(predictive?.overallRisk?.toUpperCase()||'—')} · ${predictive?.riskScore??0}/100</strong></div><div class="metric bad"><label>Critical actions</label><strong>${predictive?.summary?.criticalActions??0}</strong></div><div class="metric"><label>Schedule risk</label><strong>${predictive?.summary?.projectsAtScheduleRisk??0}</strong></div><div class="metric"><label>Margin leakage</label><strong>${M(predictive?.summary?.projectedMarginLeakageMinor??0)}</strong></div></div>${actionRows||'<p class="meta-note">Критических решений сейчас нет.</p>'}${riskRows?`<div class="predictive-risks">${riskRows}</div>`:''}</div></div>
  <div class="card"><h3>Capacity Intelligence</h3><div class="card-body"><div class="toolbar-form"><button id="ownerRecordTime" class="secondary">+ Фактические часы</button></div>${learningRows||'<p class="meta-note">Истории фактических часов ещё нет.</p>'}</div></div>
  <div class="card"><h3>Cash Gap Forecast</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Opening cash</label><strong>${M(gap?.openingBalanceMinor??0)}</strong></div><div class="metric ${gap?.status==='gap'?'bad':'good'}"><label>Minimum balance</label><strong>${M(gap?.minimumBalanceMinor??0)}</strong></div><div class="metric"><label>First gap</label><strong>${esc(gap?.firstCashGapAt?.slice(0,10)||'NO GAP')}</strong></div><div class="metric bad"><label>Cash gap amount</label><strong>${M(gap?.cashGapMinor??0)}</strong></div></div><button id="ownerTreasury" class="secondary">Указать текущий остаток денег</button></div></div>
  <div class="card"><h3>Replenishment Planning</h3><div class="card-body">${replRows||'<p class="meta-note">Склад и будущие BOM не требуют пополнения.</p>'}</div></div>
  <div class="card"><h3>Production Capacity & Schedule</h3><div class="card-body"><div class="toolbar-form"><button id="ownerCapacityCenter" class="secondary">Настроить мощность</button><button id="ownerCapacityOverride" class="secondary">Override часов заказа</button></div>${capacityRows||'<p class="meta-note">Нет активных заказов для планирования.</p>'}<div class="capacity-centers">${centerRows}</div></div></div>
  <div class="card"><h3>Procurement Awards</h3><div class="card-body"><button id="ownerAwardBest">Выбрать quote → создать PO</button>${awards||'<p class="meta-note">Award решений пока нет.</p>'}</div></div>
  <div class="card"><h3>BOM → Warehouse Allocation</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Shortage positions</label><strong>${allocation?.shortageCount??0}</strong></div><div class="metric"><label>Blocked projects</label><strong>${allocation?.blockedProjectIds?.length??0}</strong></div><div class="metric good"><label>Fully allocatable</label><strong>${allocation?.canFullyAllocateProjectIds?.length??0}</strong></div></div><div class="toolbar-form"><button id="ownerAutoAllocate">Автораспределить склад по очереди</button><button id="ownerQuoteAdd" class="secondary">+ Supplier quote на shortage</button><button id="ownerAwardBest" class="secondary">Award quote → PO</button></div>${shortages||'<p class="meta-note">Нехваток по BOM нет.</p>'}</div></div>
  <div class="card"><h3>Payment Calendar</h3><div class="card-body">${payRows||'<p class="meta-note">Платежей по календарю пока нет.</p>'}</div></div>
  <div class="job-grid"><div class="card"><h3>Warehouse · stock ${M(r.warehouse.stockValueMinor)} · reserved ${M(r.warehouse.reservedValueMinor)}</h3><div class="card-body"><div class="toolbar-form"><button id="ownerStockAdd">+ Новая позиция</button><button id="ownerStockAdjust" class="secondary">Приход / списание</button><button id="ownerStockReserve" class="secondary">Резерв под заказ</button></div>${stock||'<p class="meta-note">Склад пуст.</p>'}</div></div>
  <div class="card"><h3>Supplier Intelligence · Optimal</h3><div class="card-body"><div class="toolbar-form"><button id="ownerSupplierAdd" class="secondary">+ Поставщик</button><button id="ownerQuoteAdd2" class="secondary">+ Quote</button></div>${suppliers||'<p class="meta-note">Поставщики ещё не заведены.</p>'}</div></div></div></div>`;
  $('ownerBosTruth')?.addEventListener('click',ownerBusinessInspectTruth);
  $('ownerBosClose')?.addEventListener('click',ownerBusinessCloseProject);
  $('ownerFinanceMonth')?.addEventListener('click',ownerFinanceChangeMonth);
  $('ownerFinanceRevenue')?.addEventListener('click',ownerFinanceRecognizeRevenue);
  $('ownerFinanceExpense')?.addEventListener('click',ownerFinanceAddExpense);
  $('ownerFinanceSettings')?.addEventListener('click',ownerFinanceSettings);
  $('ownerRfqCreate')?.addEventListener('click',ownerCreateMaterialRfq);
  $('ownerRfqSend')?.addEventListener('click',ownerSendMaterialRfq);
  $('ownerRfqReply')?.addEventListener('click',ownerImportMaterialReply);
  $('ownerRfqCompare')?.addEventListener('click',ownerCompareMaterialRfq);
  $('ownerRfqReminders')?.addEventListener('click',ownerRunRfqReminders);
  $('ownerRfqSelect')?.addEventListener('click',ownerSelectMaterialWinner);
  $('ownerRfqAward')?.addEventListener('click',ownerAwardMaterialWinner);
  $('ownerProductionSync')?.addEventListener('click',ownerProductionSync);
  host.querySelectorAll('[data-prod-action]').forEach(b=>b.addEventListener('click',()=>ownerProductionAction(b.dataset.prod,b.dataset.prodAction)));
  $('ownerCreateDecisionPlan')?.addEventListener('click',ownerCreateDecisionPlan);
  $('ownerApplyDecisionPlan')?.addEventListener('click',()=>latestPlan&&ownerApplyDecisionPlan(latestPlan.id));
  host.querySelectorAll('[data-decision]').forEach(b=>b.addEventListener('click',()=>ownerDecisionItem(b.dataset.plan,b.dataset.item,b.dataset.decision)));
  $('ownerCustomScenario')?.addEventListener('click',ownerRunCustomScenario);
  $('ownerRecordTime')?.addEventListener('click',ownerRecordActualTime);
  $('ownerTreasury')?.addEventListener('click',ownerSetTreasury);
  $('ownerCapacityCenter')?.addEventListener('click',ownerConfigureWorkCenter);
  $('ownerCapacityOverride')?.addEventListener('click',ownerSetCapacityOverride);
  host.querySelectorAll('#ownerAwardBest').forEach(b=>b.addEventListener('click',ownerAwardBestQuote));
  $('ownerAutoAllocate')?.addEventListener('click',ownerAutoAllocateBom);
  $('ownerQuoteAdd')?.addEventListener('click',ownerAddSupplierQuote);
  $('ownerQuoteAdd2')?.addEventListener('click',ownerAddSupplierQuote);
  $('ownerStockAdd')?.addEventListener('click',ownerAddStock);
  $('ownerStockAdjust')?.addEventListener('click',ownerAdjustStock);
  $('ownerStockReserve')?.addEventListener('click',ownerReserveStock);
  $('ownerSupplierAdd')?.addEventListener('click',ownerAddSupplier);
  $('ownerFixedAdd')?.addEventListener('click',ownerAddFixedCost);
  $('ownerCashAdd')?.addEventListener('click',ownerAddCashEvent);
}

async function loadJobControl(){
  if(!state.project){state.jobControl=null;renderJobControl();return}
  try{state.jobControl=await api(`/api/v1/projects/${state.project.id}/job-control`);renderJobControl()}
  catch(e){msg(`Job Control: ${e.message}`,'ai')}
}
async function saveJobControl(patch){
  if(!state.project)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/job-control`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,...patch})});
    state.project=out.project;state.jobControl=out.jobControl;state.productionReadiness=null;state.installationCloseout=null;
    await loadProjects();renderAll();loadHistory();renderJobControl();
    msg(`Job Control: сохранено → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Job Control save: ${e.message}`,'ai')}
}
async function addJobMilestone(){
  const title=prompt('Название контрольной точки:','')??'';if(!title.trim())return;
  const code=(prompt('Код (коротко, латиницей):',title.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''))??'').trim();if(!code)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/job-control/milestones`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,code,title,status:'pending'})});
    state.project=out.project;state.jobControl=out.jobControl;await loadProjects();renderAll();loadHistory();renderJobControl();
  }catch(e){msg(`Milestone: ${e.message}`,'ai')}
}
async function setMilestoneStatus(code,title,status){
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/job-control/milestones`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,code,title,status})});
    state.project=out.project;state.jobControl=out.jobControl;await loadProjects();renderAll();loadHistory();renderJobControl();
  }catch(e){msg(`Milestone: ${e.message}`,'ai')}
}
function renderJobControl(){
  const host=$('htmlStage'),r=state.jobControl,job=state.project?.snapshot?.jobControl;
  if(state.project&&!r&&!state._jobLoading){
    state._jobLoading=true;
    api(`/api/v1/projects/${state.project.id}/job-control`).then(x=>{state.jobControl=x;state._jobLoading=false;renderJobControl()}).catch(e=>{state._jobLoading=false;msg(`Job Control: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Job Control связывает заказ, деньги и техническую Revision.</p></div></div>';return}
  const m=r?.commercial||{},currency=job?.money?.currency||state.project.snapshot.currency||'EUR';
  const moneyText=v=>new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format((Number(v)||0)/100);
  const blockers=(r?.blockers||[]).map(x=>`<div class="business-alert"><strong>BLOCK</strong><p>${esc(x)}</p></div>`).join('');
  const warnings=(r?.warnings||[]).map(x=>`<div class="business-alert"><strong>WARN</strong><p>${esc(x)}</p></div>`).join('');
  const stages=JOB_STAGES.map((s,i)=>`<button class="job-stage ${s===r?.stage?'active':''} ${i<(r?.stageIndex??0)?'done':''}" data-job-stage="${s}"><span>${i+1}</span><strong>${esc(jobStageLabel(s))}</strong></button>`).join('');
  const milestones=(r?.milestones||[]).map(x=>`<div class="job-milestone ${x.status}"><div><strong>${esc(x.title)}</strong><small>${esc(x.code)} · ${esc(x.status.toUpperCase())}</small>${x.note?`<p>${esc(x.note)}</p>`:''}</div><div>${x.status!=='done'?`<button class="small" data-ms-code="${esc(x.code)}" data-ms-title="${esc(x.title)}" data-ms-status="done">Готово</button>`:`<span class="pill good">DONE</span>`}</div></div>`).join('');

  host.innerHTML=`<div class="dashboard job-control"><div class="job-hero"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Project Lifecycle / Job Control</h2><p>Один заказ: от лида до гарантии. Техническая готовность и деньги показываются рядом, но не подменяют друг друга.</p></div><div class="job-progress"><strong>${r?.progressPercent??0}%</strong><span>${esc(jobStageLabel(r?.stage||'lead'))}</span></div></div>
  <div class="job-stage-strip">${stages}</div>
  <div class="job-grid">
    <div class="card"><h3>Клиент / объект</h3><div class="card-body"><div class="job-form">
      <label>Клиент<input id="jobClient" value="${esc(job?.client?.name||'')}"></label>
      <label>Компания<input id="jobCompany" value="${esc(job?.client?.company||'')}"></label>
      <label>Телефон<input id="jobPhone" value="${esc(job?.client?.phone||'')}"></label>
      <label>E-mail<input id="jobEmail" value="${esc(job?.client?.email||'')}"></label>
      <label class="wide">Объект<input id="jobAddress" value="${esc(job?.client?.objectAddress||'')}"></label>
      <button id="jobClientSave">Сохранить клиента</button>
    </div></div></div>
    <div class="card"><h3>Деньги</h3><div class="card-body">
      <div class="metrics"><div class="metric"><label>Договор</label><strong>${moneyText(m.contractValueMinor)}</strong></div><div class="metric good"><label>Получено</label><strong>${moneyText(m.receivedMinor)}</strong></div><div class="metric bad"><label>Остаток</label><strong>${moneyText(m.outstandingMinor)}</strong></div><div class="metric"><label>Маржа*</label><strong>${moneyText(m.estimatedMarginMinor)}</strong></div></div>
      <div class="job-form">
        <label>Договор, ${esc(currency)}<input id="jobContractValue" type="number" step="0.01" value="${((m.contractValueMinor||0)/100).toFixed(2)}"></label>
        <label>Получено, ${esc(currency)}<input id="jobReceived" type="number" step="0.01" value="${((m.receivedMinor||0)/100).toFixed(2)}"></label>
        <label>Заказы поставщикам, ${esc(currency)}<input id="jobCommitted" type="number" step="0.01" value="${((m.committedPurchaseMinor||0)/100).toFixed(2)}"></label>
        <label>Факт. себестоимость, ${esc(currency)}<input id="jobActual" type="number" step="0.01" value="${((m.actualCostMinor||0)/100).toFixed(2)}"></label>
        <button id="jobMoneySave">Сохранить деньги</button>
      </div><p class="meta-note">* Сейчас маржа = договор − фактическая себестоимость, либо договор − зафиксированные закупочные обязательства.</p>
    </div></div>
  </div>
  <div class="card"><h3>Следующий шаг</h3><div class="card-body"><div class="next-action"><strong>${esc(r?.nextAction||'—')}</strong></div>${blockers}${warnings}</div></div>
  <div class="card"><h3>Milestones</h3><div class="card-body"><button id="jobMilestoneAdd" class="secondary">+ Контрольная точка</button>${milestones||'<p class="meta-note">Дополнительных контрольных точек пока нет.</p>'}</div></div></div>`;

  host.querySelectorAll('[data-job-stage]').forEach(b=>b.addEventListener('click',()=>saveJobControl({stage:b.dataset.jobStage})));
  $('jobClientSave')?.addEventListener('click',()=>saveJobControl({client:{name:$('jobClient').value,company:$('jobCompany').value,phone:$('jobPhone').value,email:$('jobEmail').value,objectAddress:$('jobAddress').value}}));
  $('jobMoneySave')?.addEventListener('click',()=>saveJobControl({money:{
    currency,
    contractValueMinor:Math.round(Number($('jobContractValue').value||0)*100),
    receivedMinor:Math.round(Number($('jobReceived').value||0)*100),
    committedPurchaseMinor:Math.round(Number($('jobCommitted').value||0)*100),
    actualCostMinor:Math.round(Number($('jobActual').value||0)*100)
  }}));
  $('jobMilestoneAdd')?.addEventListener('click',addJobMilestone);
  host.querySelectorAll('[data-ms-code]').forEach(b=>b.addEventListener('click',()=>setMilestoneStatus(b.dataset.msCode,b.dataset.msTitle,b.dataset.msStatus)));
}

async function loadInstallerMode(){
  if(!state.project){state.installerMode=null;renderInstallerMode();return}
  try{state.installerMode=await api(`/api/v1/projects/${state.project.id}/installer-mode`);await loadInstallationCloseout();renderInstallerMode()}
  catch(e){msg(`Installer Mode: ${e.message}`,'ai')}
}
async function installerCompleteTask(id){
  if(!state.project)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/installation-decisions/${id}/complete`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,completedBy:'installer'})});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.installerMode=null;state.productionReadiness=null;
    await loadProjects();await loadInstallerMode();renderAll();loadHistory();
    msg(`Installer: задача закрыта → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Installer complete: ${e.message}`,'ai')}
}
async function installerReportIssue(){
  if(!state.project)return;
  const title=prompt('Кратко опишите проблему на объекте:','')??'';
  if(!title.trim())return;
  const detail=prompt('Что именно обнаружено и что нужно сделать:','')??'';
  if(!detail.trim())return;
  const severity=(prompt('Уровень: info / warning / blocking','warning')||'warning').toLowerCase();
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/installer-issues`,{method:'POST',body:JSON.stringify({
      expectedRevision:state.project.snapshot.revision,severity:['info','warning','blocking'].includes(severity)?severity:'warning',
      title,detail,reportedBy:'installer'
    })});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.installerMode=out.installerMode;state.productionReadiness=null;
    await loadProjects();renderAll();loadHistory();
    msg(`Installer: проблема записана → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Installer issue: ${e.message}`,'ai')}
}
async function installerResolveIssue(id){
  if(!state.project)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/installer-issues/${id}/resolve`,{method:'POST',body:JSON.stringify({expectedRevision:state.project.snapshot.revision,resolvedBy:'installer'})});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.installerMode=out.installerMode;state.productionReadiness=null;
    await loadProjects();renderAll();loadHistory();
    msg(`Installer: проблема закрыта → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Installer resolve: ${e.message}`,'ai')}
}
function renderInstallerMode(){
  const host=$('htmlStage'),r=state.installerMode;
  if(state.project&&!r&&!state._installerLoading){
    state._installerLoading=true;
    api(`/api/v1/projects/${state.project.id}/installer-mode`).then(x=>{state.installerMode=x;state._installerLoading=false;renderInstallerMode()}).catch(e=>{state._installerLoading=false;msg(`Installer Mode: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Installer Mode работает по конкретной Revision.</p></div></div>';return}
  const tasks=(r?.tasks||[]).map(x=>{
    const action=x.source==='site_task'&&x.status==='open'
      ?`<button class="small" data-installer-complete="${esc(x.id)}">Готово</button>`
      :x.source==='site_issue'&&x.status!=='done'
        ?`<button class="secondary small" data-installer-resolve="${esc(x.id)}">Проблема устранена</button>`
        :`<span class="pill ${x.status==='done'?'good':x.status==='blocked'?'bad':'warn'}">${esc(x.status.toUpperCase())}</span>`;
    return `<div class="installer-row ${x.status}"><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p><small>${esc(x.source.toUpperCase())}</small></div><div>${action}</div></div>`;
  }).join('');
  host.innerHTML=`<div class="dashboard"><div class="installer-hero ${r?.status==='BLOCKED'?'blocked':r?.status==='INSTALL_IN_PROGRESS'?'progress':'ready'}"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Installer Mode</h2><p>Монтажник видит только то, что относится к объекту: задачи, незакрытые проблемы, критические замеры и блокирующие коллизии.</p></div><div class="readiness-ring"><strong>${esc(r?.status||'—')}</strong><span>site</span></div></div><div class="metrics"><div class="metric"><label>Open tasks</label><strong>${r?.openTaskCount??'—'}</strong></div><div class="metric good"><label>Done</label><strong>${r?.completedTaskCount??'—'}</strong></div><div class="metric"><label>Open issues</label><strong>${r?.openIssueCount??'—'}</strong></div><div class="metric bad"><label>Blocking</label><strong>${r?.blockingIssueCount??'—'}</strong></div></div><div class="card"><div class="card-body"><button id="installerIssue">+ Проблема с объекта</button><button id="installerChange" class="secondary">+ Изменение по факту</button><button id="installerRefresh" class="secondary">Обновить</button><p class="meta-note">Любое закрытие задачи или новая проблема создаёт новую Project Revision. Ничего не редактируется задним числом.</p></div></div><div class="card"><h3>Site Execution</h3><div class="card-body">${tasks||'<p class="meta-note">Монтажных задач и проблем по текущей Revision нет.</p>'}</div></div></div>`;
  const co=state.installationCloseout;
  if(co){
    const punch=(state.project.snapshot.installationPunchItems||[]).filter(x=>x.status!=='cancelled');
    const card=document.createElement('div');card.className='card';
    card.innerHTML=`<h3>Installation Closeout · ${esc(co.status)}</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Punch open</label><strong>${co.openPunchCount}</strong></div><div class="metric"><label>Site tasks</label><strong>${co.openSiteTaskCount}</strong></div><div class="metric"><label>Site issues</label><strong>${co.openSiteIssueCount}</strong></div><div class="metric"><label>Changes</label><strong>${co.pendingChangeCount}</strong></div></div>${co.blockers?.length?`<div class="business-alert"><strong>Closeout blockers</strong>${co.blockers.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}<div class="toolbar-form"><button id="punchAdd" class="secondary">+ Punch item</button>${co.status==='READY_TO_SIGN'?'<button id="handoverSign">Подписать приёмку</button>':''}</div>${punch.map(x=>`<div class="installer-row ${x.status==='closed'?'done':'review'}"><div><strong>${esc(x.severity.toUpperCase())} · ${esc(x.title)}</strong><p>${esc(x.detail)}</p></div>${x.status==='open'?`<button class="small" data-punch-close="${esc(x.id)}">Закрыть</button>`:`<span class="pill good">CLOSED</span>`}</div>`).join('')}${co.handover?`<div class="business-alert"><strong>HANDOVER SIGNED</strong><p>${esc(co.handover.clientName||co.handover.signedBy)} · ${esc(co.handover.signedAt)}</p></div>`:''}</div>`;
    host.querySelector('.dashboard')?.appendChild(card);
    card.querySelector('#punchAdd')?.addEventListener('click',addPunch);
    card.querySelector('#handoverSign')?.addEventListener('click',signHandover);
    card.querySelectorAll('[data-punch-close]').forEach(b=>b.addEventListener('click',()=>closePunch(b.dataset.punchClose)));
  }

  $('installerIssue')?.addEventListener('click',installerReportIssue);
  $('installerChange')?.addEventListener('click',installerProposeChange);
  $('installerRefresh')?.addEventListener('click',()=>{state.installerMode=null;loadInstallerMode()});
  const changes=state.project.snapshot.installationChangeRequests||[];
  if(changes.length){
    const box=document.createElement('div');box.className='card';box.innerHTML=`<h3>Site Change Requests / As-Built</h3><div class="card-body">${changes.map(c=>`<div class="installer-row ${c.status==='rejected'?'done':'review'}"><div><strong>${esc(c.title)}</strong><p>${esc(c.reason)}</p><small>${esc(c.status.toUpperCase())} · source Revision ${c.sourceRevision}${c.proposedPositionMm?` · X ${c.proposedPositionMm.x??'—'} / Y ${c.proposedPositionMm.y??'—'} / Z ${c.proposedPositionMm.z??'—'} мм`:''}</small></div><div>${c.status==='proposed'?`<button class="small" data-change-approve="${esc(c.id)}">Утвердить</button><button class="secondary small" data-change-reject="${esc(c.id)}">Отклонить</button>`:c.status==='approved'?`<button class="small" data-change-apply="${esc(c.id)}">Применить как As-built</button>`:`<span class="pill ${c.status==='applied'?'good':'warn'}">${esc(c.status.toUpperCase())}</span>`}</div></div>`).join('')}</div>`;host.querySelector('.dashboard')?.appendChild(box);
    box.querySelectorAll('[data-change-approve]').forEach(b=>b.addEventListener('click',()=>installerReviewChange(b.dataset.changeApprove,true)));
    box.querySelectorAll('[data-change-reject]').forEach(b=>b.addEventListener('click',()=>installerReviewChange(b.dataset.changeReject,false)));
    box.querySelectorAll('[data-change-apply]').forEach(b=>b.addEventListener('click',()=>installerApplyChange(b.dataset.changeApply)));
  }
  host.querySelectorAll('[data-installer-complete]').forEach(b=>b.addEventListener('click',()=>installerCompleteTask(b.dataset.installerComplete)));
  host.querySelectorAll('[data-installer-resolve]').forEach(b=>b.addEventListener('click',()=>installerResolveIssue(b.dataset.installerResolve)));
}

async function loadConflictResolution(){
  if(!state.project){state.conflictResolution=null;renderConflictResolution();return}
  try{state.conflictResolution=await api(`/api/v1/projects/${state.project.id}/conflict-resolution`);renderConflictResolution()}
  catch(e){msg(`Conflict Resolution: ${e.message}`,'ai')}
}
async function applyConflictResolution(id){
  if(!state.project)return;
  try{
    const out=await api(`/api/v1/projects/${state.project.id}/conflict-resolution/apply`,{method:'POST',body:JSON.stringify({approved:true,expectedRevision:state.project.snapshot.revision,suggestionId:id})});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.previewScene=null;
    state.installationCheck=out.after;state.conflictResolution=null;state.productionReadiness=null;
    await loadProjects();await loadConflictResolution();renderAll();loadHistory();
    msg(`Resolve: создана Revision ${state.project.snapshot.revision}; blocking ${out.before.blockingCount} → ${out.after.blockingCount}.`,'meta');
  }catch(e){msg(`Conflict Resolution apply: ${e.message}`,'ai')}
}
function renderConflictResolution(){
  const host=$('htmlStage'),r=state.conflictResolution;
  if(state.project&&!r&&!state._resolutionLoading){
    state._resolutionLoading=true;
    api(`/api/v1/projects/${state.project.id}/conflict-resolution`).then(x=>{state.conflictResolution=x;state._resolutionLoading=false;renderConflictResolution()}).catch(e=>{state._resolutionLoading=false;msg(`Conflict Resolution: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Resolution Assistant работает по текущей Revision.</p></div></div>';return}
  const rows=(r?.suggestions||[]).map(x=>{
    const action=x.safeToAutoApply
      ?`<button class="small" data-resolution-apply="${esc(x.id)}">Применить → новая Revision</button>`
      :x.decisionPolicy==='record_site_task'
        ?`<button class="small" data-resolution-record="${esc(x.id)}">Добавить в монтаж → Revision</button>`
        :x.decisionPolicy==='record_design_decision'
          ?`<button class="secondary small" data-resolution-record="${esc(x.id)}">Зафиксировать решение</button>`
          :`<span class="pill bad">НУЖНО ФИЗИЧЕСКИ ИСПРАВИТЬ</span>`;
    return `<div class="resolution-row ${x.safeToAutoApply?'auto':'manual'}"><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p><small>${esc(x.mode)} · ${esc(x.decisionPolicy||'physical_fix_required')} · priority ${x.priority}${x.expectedBlockingReduction?` · blockers −${x.expectedBlockingReduction}`:''}</small></div><div>${action}</div></div>`;
  }).join('');
  const ledger=(state.project.snapshot.installationDecisions||[]).filter(d=>d.status!=='cancelled').map(d=>`<div class="decision-ledger-row"><div><strong>${esc(d.kind.toUpperCase())} · ${esc(d.title)}</strong><p>${esc(d.detail)}</p><small>${esc(d.status.toUpperCase())} · ${esc(d.approvedBy)} · source Revision ${d.sourceRevision}</small></div>${d.kind==='site_task'&&d.status==='approved'?`<button class="secondary small" data-site-complete="${esc(d.id)}">Отметить выполненной</button>`:`<span class="pill ${d.status==='completed'?'good':'warn'}">${esc(d.status.toUpperCase())}</span>`}</div>`).join('');
  host.innerHTML=`<div class="dashboard"><div class="resolution-hero"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Installation Conflict Resolution Assistant</h2><p>Makster не просто показывает проблему: безопасные геометрические сдвиги можно применить через новую Revision; конструктивные решения остаются за технологом.</p></div><div class="metrics-inline"><div class="metric good"><label>Auto</label><strong>${r?.autoApplicableCount??'—'}</strong></div><div class="metric"><label>Manual</label><strong>${r?.manualCount??'—'}</strong></div></div></div><div class="card"><div class="card-body"><button id="resolutionRefresh" class="secondary">Пересчитать решения</button><button id="resolutionInstallCheck">Открыть Install Check</button><p class="meta-note">Перед применением сервер повторно проверяет текущую Revision и принимает только решение, которое действительно уменьшает число Blocking-конфликтов.</p></div></div><div class="card"><h3>Предлагаемые решения</h3><div class="card-body">${rows||'<p class="meta-note">Активных конфликтов, для которых требуется решение, нет.</p>'}</div></div><div class="card"><h3>Installation Decision Ledger</h3><div class="card-body">${ledger||'<p class="meta-note">Утверждённых монтажных/конструктивных решений пока нет.</p>'}</div></div></div>`;
  $('resolutionRefresh')?.addEventListener('click',()=>{state.conflictResolution=null;loadConflictResolution()});
  $('resolutionInstallCheck')?.addEventListener('click',()=>{state.tab='installation-check';document.querySelectorAll('.bottom-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='installation-check'));renderTab()});
  host.querySelectorAll('[data-resolution-apply]').forEach(b=>b.addEventListener('click',()=>applyConflictResolution(b.dataset.resolutionApply)));
  host.querySelectorAll('[data-resolution-record]').forEach(b=>b.addEventListener('click',()=>recordConflictDecision(b.dataset.resolutionRecord)));
  host.querySelectorAll('[data-site-complete]').forEach(b=>b.addEventListener('click',()=>completeSiteDecision(b.dataset.siteComplete)));
}

async function loadInstallationCheck(){
  if(!state.project){state.installationCheck=null;renderInstallationCheck();return}
  try{state.installationCheck=await api(`/api/v1/projects/${state.project.id}/installation-check`);renderInstallationCheck()}
  catch(e){msg(`Installation Check: ${e.message}`,'ai')}
}
function renderInstallationCheck(){
  const host=$('htmlStage'),r=state.installationCheck;
  if(state.project&&!r&&!state._installCheckLoading){
    state._installCheckLoading=true;
    api(`/api/v1/projects/${state.project.id}/installation-check`).then(x=>{state.installationCheck=x;state._installCheckLoading=false;renderInstallationCheck()}).catch(e=>{state._installCheckLoading=false;msg(`Installation Check: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Install Check проверяет текущую Revision против подтверждённых проёмов, препятствий и коммуникаций.</p></div></div>';return}
  const rows=(r?.items||[]).map(x=>`<div class="install-row ${x.severity}"><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p><small>${esc(x.kind)}${x.distanceMm!=null?` · ${x.distanceMm} мм`:''}</small></div><span class="pill ${x.severity==='blocking'?'bad':x.severity==='warning'?'warn':'good'}">${esc(x.severity.toUpperCase())}</span></div>`).join('');
  host.innerHTML=`<div class="dashboard"><div class="install-hero ${r?.status==='BLOCKED'?'blocked':r?.status==='REVIEW'?'review':'pass'}"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Automatic Collision & Installation Check</h2><p>Проверка выполняется по тем же координатам, что используются в ProjectModel и Wall Elevation.</p></div><div class="readiness-ring"><strong>${esc(r?.status||'—')}</strong><span>install</span></div></div><div class="metrics"><div class="metric bad"><label>Blocking</label><strong>${r?.blockingCount??'—'}</strong></div><div class="metric"><label>Warnings</label><strong>${r?.warningCount??'—'}</strong></div><div class="metric good"><label>Info</label><strong>${r?.infoCount??'—'}</strong></div></div><div class="card"><div class="card-body"><button id="installRefresh" class="secondary">Перепроверить Revision</button><button id="installOpenStudio">Открыть Room / Elevation</button><p class="meta-note">BLOCKING автоматически входит в Production Lock. WARNING требует технологической проверки, но не подменяет измерение.</p></div></div><div class="card"><h3>Результаты проверки</h3><div class="card-body">${rows||'<p class="meta-note">Коллизий по текущему набору подтверждённых данных не найдено.</p>'}</div></div></div>`;
  $('installRefresh')?.addEventListener('click',()=>{state.installationCheck=null;loadInstallationCheck()});
  $('installOpenStudio')?.addEventListener('click',()=>{state.tab='kitchen-studio';document.querySelectorAll('.bottom-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='kitchen-studio'));renderTab()});
}

async function loadMeasurements(){
  if(!state.project){state.measurementCompleteness=null;renderMeasurements();return}
  try{state.measurementCompleteness=await api(`/api/v1/projects/${state.project.id}/room-measurement-completeness`);renderMeasurements()}
  catch(e){msg(`Measurements: ${e.message}`,'ai')}
}
function renderMeasurements(){
  const host=$('htmlStage'),r=state.measurementCompleteness;
  if(state.project&&!r&&!state._measurementsLoading){
    state._measurementsLoading=true;
    api(`/api/v1/projects/${state.project.id}/room-measurement-completeness`).then(x=>{state.measurementCompleteness=x;state._measurementsLoading=false;renderMeasurements()}).catch(e=>{state._measurementsLoading=false;msg(`Measurements: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Measurement Completeness проверяет сохранённое помещение текущей Revision.</p></div></div>';return}
  const groups=['room','opening','obstacle','utility'];
  const sections=groups.map(g=>{
    const items=(r?.items||[]).filter(x=>x.area===g);
    if(!items.length)return '';
    return `<div class="card"><h3>${g.toUpperCase()}</h3><div class="card-body">${items.map(x=>`<div class="measurement-row ${x.status}"><div><strong>${esc(x.title)}</strong><p>${esc(x.detail)}</p>${x.wall?`<small>Wall: ${esc(x.wall.toUpperCase())}</small>`:''}</div><span class="pill ${x.status==='complete'?'good':x.status==='missing'?'bad':'warn'}">${esc(x.status.toUpperCase())}</span></div>`).join('')}</div></div>`;
  }).join('');
  host.innerHTML=`<div class="dashboard"><div class="measurement-hero"><div><span class="eyebrow">REVISION ${r?.revision??state.project.snapshot.revision}</span><h2>Room Measurement Completeness</h2><p>Makster показывает только подтверждённые размеры как факты. UNKNOWN остаётся UNKNOWN и блокирует выпуск там, где размер критичен.</p></div><div class="readiness-ring"><strong>${r?.completenessPercent??'—'}${r?'%':''}</strong><span>complete</span></div></div><div class="metrics"><div class="metric good"><label>Complete</label><strong>${r?.completeCount??'—'}</strong></div><div class="metric bad"><label>Missing</label><strong>${r?.missingCount??'—'}</strong></div><div class="metric"><label>Review</label><strong>${r?.reviewCount??'—'}</strong></div></div><div class="card"><div class="card-body"><button id="measureRefresh" class="secondary">Перепроверить Revision</button><button id="measureOpenStudio">Открыть Kitchen Studio</button><p class="meta-note">Исправления измерений вносятся в Room Setup / Wall Elevation и затем сохраняются в новую Revision.</p></div></div>${sections}</div>`;
  $('measureRefresh')?.addEventListener('click',()=>{state.measurementCompleteness=null;loadMeasurements()});
  $('measureOpenStudio')?.addEventListener('click',()=>{state.tab='kitchen-studio';document.querySelectorAll('.bottom-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='kitchen-studio'));renderTab()});
}

async function loadAutoComplete(){
  if(!state.project){state.autoComplete.report=null;renderAutoComplete();return}
  try{state.autoComplete.report=await api(`/api/v1/projects/${state.project.id}/auto-complete`);renderAutoComplete()}
  catch(e){msg(`Auto Complete: ${e.message}`,'ai')}
}
async function applyAutoCompleteItem(index){
  const r=state.autoComplete.report,item=r?.items?.[index];
  if(!state.project||!item?.candidateId||!item.target)return;
  try{
    const body={approved:true,approvedBy:'auto-complete',furnitureId:item.furnitureId,moduleId:item.moduleId,target:item.target,candidateId:item.candidateId};
    if(item.targetRefId)body.targetRefId=item.targetRefId;
    if(item.applianceIndex!=null)body.applianceIndex=item.applianceIndex;
    const out=await api(`/api/v1/projects/${state.project.id}/catalog-assignment/apply`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.previewScene=null;
    await loadProjects();await loadAutoComplete();renderAll();loadHistory();
    msg(`Auto Complete: пункт применён → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Auto Complete apply: ${e.message}`,'ai')}
}
function renderAutoComplete(){
  const host=$('htmlStage'),r=state.autoComplete.report;
  if(state.project&&!r&&!state.autoComplete._loading){state.autoComplete._loading=true;api(`/api/v1/projects/${state.project.id}/auto-complete`).then(x=>{state.autoComplete.report=x;state.autoComplete._loading=false;renderAutoComplete()}).catch(e=>{state.autoComplete._loading=false;msg(`Auto Complete: ${e.message}`,'ai')})}
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Auto Complete анализирует текущую Project Revision.</p></div></div>';return}
  const s=r?.summary||{};
  const rows=(r?.items||[]).map((x,i)=>`<div class="business-alert"><strong>${esc(x.status.toUpperCase())} · ${esc(x.title)}</strong><p>${esc(x.detail)}</p>${x.action?`<small>${esc(x.action)}</small>`:''}${x.status==='needs_approval'&&x.candidateId?`<div><button class="small" data-ac-apply="${i}">Применить → новая Revision</button></div>`:''}</div>`).join('');
  host.innerHTML=`<div class="dashboard"><div class="card"><h3>Project Auto-Complete · 2.8.3</h3><div class="card-body"><div class="metrics"><div class="metric"><label>Readiness</label><strong>${s.readinessPercent??0}%</strong></div><div class="metric good"><label>Complete</label><strong>${s.complete??0}</strong></div><div class="metric"><label>Approval</label><strong>${s.needsApproval??0}</strong></div><div class="metric"><label>Measure</label><strong>${s.needsMeasurement??0}</strong></div><div class="metric bad"><label>Blocking</label><strong>${s.blocking??0}</strong></div></div><button id="acRefresh" class="secondary">Перепроверить Revision</button></div></div><div class="card"><h3>Что осталось закрыть</h3><div class="card-body">${rows||'<p class="meta-note">По текущему контуру незакрытых пунктов не найдено.</p>'}</div></div></div>`;
  $('acRefresh')?.addEventListener('click',()=>{state.autoComplete.report=null;loadAutoComplete()});
  host.querySelectorAll('[data-ac-apply]').forEach(b=>b.addEventListener('click',()=>applyAutoCompleteItem(Number(b.dataset.acApply))));
}

async function loadApplianceStudio(){
  try{
    const data=await api('/api/v1/catalogs/appliances');
    state.applianceStudio.items=data.items||[];
    state.applianceStudio.manufacturers=data.manufacturers||[];
    if(state.applianceStudio.selected&&!state.applianceStudio.items.some(x=>x.id===state.applianceStudio.selected.id))state.applianceStudio.selected=null;
    renderApplianceStudio();
  }catch(e){msg(`Appliance Studio: ${e.message}`,'ai')}
}
function applianceStudioFiltered(){
  const s=state.applianceStudio,q=(s.query||'').trim().toLowerCase();
  return (s.items||[]).filter(x=>
    (s.kind==='all'||x.kind===s.kind)
    &&(s.manufacturer==='all'||x.manufacturer===s.manufacturer)
    &&(s.priceTier==='all'||(x.priceTier||'unknown')===s.priceTier)
    &&(!q||[x.manufacturer,x.model,x.kind,x.id].some(v=>String(v||'').toLowerCase().includes(q)))
  );
}
function applianceFitPolicy(x){
  if(x?.kind==='hob'||x?.kind==='sink'||x?.productionPolicy?.cutoutExecutionDefault==='on_site')
    return {label:'ON-SITE CUTOUT',cls:'warn',text:'Чертёж и размеры обязательны; вырез/окончательная посадка выполняются на объекте по умолчанию.'};
  if(x?.productionPolicy?.fitModeDefault==='site_fit')
    return {label:'SITE FIT',cls:'warn',text:'Точные размеры учитываются в проекте, окончательная посадка подтверждается на объекте.'};
  return {label:'PREVERIFIED FIT',cls:'good',text:'Производство может опираться на подтверждённую монтажную геометрию.'};
}
function appliancePriceLabel(x){
  const t=x?.priceTier||'unknown';
  return t==='budget'?'Бюджет':t==='mid'?'Средний':t==='premium'?'Премиум':'Цена не классифицирована';
}
function appliancePriceGuidance(x){
  const p=x?.priceGuidance;
  if(!p)return 'Нет подтверждённого ценового ориентира.';
  const fmt=v=>v==null?'—':new Intl.NumberFormat('ru-RU',{style:'currency',currency:p.currency||'EUR',maximumFractionDigits:0}).format(v);
  return `Закупка ${fmt(p.purchaseMin)}–${fmt(p.purchaseMax)} · клиент ${fmt(p.clientMin)}–${fmt(p.clientMax)}${p.verified?' · VERIFIED':' · REVIEW'}`;
}
function selectApplianceStudioItem(id){state.applianceStudio.selected=state.applianceStudio.items.find(x=>x.id===id)||null;state.applianceStudio.auto=null;renderApplianceStudio()}
async function applianceStudioAutoSelect(){
  const s=state.applianceStudio;
  if(s.kind==='all'){msg('Appliance Studio: выберите тип техники.','ai');return}
  const body={kind:s.kind,maxResults:3};
  if(s.nicheWidthMm)body.nicheWidthMm=Number(s.nicheWidthMm);
  if(s.nicheHeightMm)body.nicheHeightMm=Number(s.nicheHeightMm);
  if(s.nicheDepthMm)body.nicheDepthMm=Number(s.nicheDepthMm);
  if(s.ventilationAreaCm2)body.ventilationAreaCm2=Number(s.ventilationAreaCm2);
  if(s.manufacturer!=='all')body.preferredManufacturers=[s.manufacturer];
  try{
    state.applianceStudio.auto=await api('/api/v1/catalogs/appliances/auto-select',{method:'POST',body:JSON.stringify(body)});
    renderApplianceStudio();
  }catch(e){msg(`Appliance Auto Selection: ${e.message}`,'ai')}
}
async function applianceStudioAnalyzeProject(){
  if(!state.project){msg('Appliance Studio: сначала откройте проект.','ai');return}
  try{
    const r=await api(`/api/v1/projects/${state.project.id}/catalog-auto-selection`);
    state.applianceStudio.projectReport={...r,recommendations:(r.recommendations||[]).filter(x=>x.target==='appliance')};
    renderApplianceStudio();
  }catch(e){msg(`Appliance Project Selection: ${e.message}`,'ai')}
}
async function applyApplianceProjectRecommendation(index){
  const r=state.applianceStudio.projectReport?.recommendations?.[index],c=r?.result?.recommended;
  if(!state.project||!r||!c)return;
  try{
    const body={approved:true,approvedBy:'appliance-studio',furnitureId:r.furnitureId,moduleId:r.moduleId,target:r.target,candidateId:c.record.id,procurementMode:state.applianceStudio.procurementMode,priceTier:(c.record.priceTier||state.applianceStudio.priceTier||'unknown')};
    if(r.applianceIndex!=null)body.applianceIndex=r.applianceIndex;
    const out=await api(`/api/v1/projects/${state.project.id}/catalog-assignment/apply`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.previewScene=null;
    await loadProjects();await applianceStudioAnalyzeProject();renderAll();loadHistory();
    msg(`Appliance Studio: ${c.record.manufacturer} ${c.record.model} применён → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Appliance assignment: ${e.message}`,'ai')}
}
function renderApplianceTop3(r){
  if(!r)return '';
  const rows=(r.candidates||[]).map((c,i)=>{
    const pol=applianceFitPolicy(c.record);
    return `<div class="appliance-pick"><div class="appliance-pick-head"><span class="rank">#${i+1}</span><strong>${esc(c.record.manufacturer)} · ${esc(c.record.model)}</strong><span class="appliance-score">${c.selectionScore}/100</span></div><p>${esc(c.compatibilityStatus.toUpperCase())} · ${esc(appliancePriceLabel(c.record))}</p><span class="pill ${pol.cls}">${pol.label}</span><small>${esc(pol.text)}</small></div>`;
  }).join('');
  return `<div class="card"><h3>Top 3 по нише и монтажу</h3><div class="card-body">${rows||'<p class="meta-note">Подтверждённых кандидатов нет.</p>'}</div></div>`;
}
function renderApplianceProjectRecommendations(r){
  if(!r)return '';
  const rows=(r.recommendations||[]).map((x,i)=>{
    const c=x.result?.recommended,ready=Boolean(c&&c.compatibilityStatus==='compatible');
    return `<div class="business-alert"><strong>APPLIANCE · ${esc(x.moduleLibraryId||x.moduleId)}</strong><p>${esc(x.note)}</p><p>${c?`${esc(c.record.manufacturer)} · ${esc(c.record.model)} · ${c.selectionScore}/100`:'Нет подтверждённой модели'}</p>${ready?`<button class="small" data-app-project-apply="${i}">Применить → новая Revision</button>`:''}</div>`;
  }).join('');
  return `<div class="card"><h3>Техника текущего проекта</h3><div class="card-body">${rows||'<p class="meta-note">В проекте нет техники для автоподбора.</p>'}</div></div>`;
}
function renderApplianceStudio(){
  const host=$('htmlStage'),s=state.applianceStudio;
  if(!s.items.length&&!s._loading){s._loading=true;api('/api/v1/catalogs/appliances').then(d=>{s.items=d.items||[];s.manufacturers=d.manufacturers||[];s._loading=false;renderApplianceStudio()}).catch(e=>{s._loading=false;msg(`Appliance Studio: ${e.message}`,'ai')})}
  const filtered=applianceStudioFiltered(),x=s.selected;
  const brands=(s.manufacturers||[]).map(b=>typeof b==='string'?b:b.name).filter(Boolean);
  const kinds=['dishwasher','fridge','oven','hob','hood','microwave','sink','other'];
  const rows=filtered.map(i=>{const pol=applianceFitPolicy(i);return `<button class="appliance-row ${x?.id===i.id?'active':''}" data-app-id="${esc(i.id)}"><div><strong>${esc(i.manufacturer)} · ${esc(i.model)}</strong><small>${esc(i.kind)} · ${esc(appliancePriceLabel(i))}</small></div><span class="pill ${pol.cls}">${pol.label}</span></button>`}).join('');
  const commercial=s.procurementMode==='makster_supplied'?`<div class="card"><h3>Закупка через Makster</h3><div class="card-body"><p class="meta-note">Ценовой слой не влияет на геометрию мебели. Он нужен для закупки, предложения клиенту и маржи.</p><div class="appliance-commerce-grid"><div><label>Сегмент</label><select id="appPriceTier">${['all','budget','mid','premium','unknown'].map(v=>`<option value="${v}" ${s.priceTier===v?'selected':''}>${v==='all'?'Все':v}</option>`).join('')}</select></div><div><label>Ориентир выбранной модели</label><strong>${x?esc(appliancePriceGuidance(x)):'—'}</strong></div></div></div></div>`:'';
  const detail=!x?`<div class="studio-empty"><strong>Выберите модель</strong><p>Главное здесь — монтажная геометрия, ниша, вентиляция, фасадная схема и источник чертежа.</p></div>`:(()=>{
    const pol=applianceFitPolicy(x),c=x.compatibility||{},dims=x.applianceDimensionsMm||{};
    return `<div class="card appliance-detail"><h3>${esc(x.manufacturer)} · ${esc(x.model)}</h3><div class="card-body"><div class="appliance-meta"><span>Type <strong>${esc(x.kind)}</strong></span><span>Installation <strong>${esc(x.installation)}</strong></span><span>Trust <strong>${esc(x.trust)}</strong></span><span>Price <strong>${esc(appliancePriceLabel(x))}</strong></span></div><div class="fit-policy ${pol.cls}"><strong>${pol.label}</strong><p>${esc(pol.text)}</p></div><h4>Монтажные данные</h4><div class="spec-grid"><span>Ниша W<strong>${c.nicheWidthMm??(c.nicheWidthRangeMm?`${c.nicheWidthRangeMm[0]}–${c.nicheWidthRangeMm[1]}`:'—')} мм</strong></span><span>Ниша H<strong>${c.nicheHeightMm??(c.nicheHeightRangeMm?`${c.nicheHeightRangeMm[0]}–${c.nicheHeightRangeMm[1]}`:'—')} мм</strong></span><span>Мин. глубина<strong>${c.minNicheDepthMm??'—'} мм</strong></span><span>Вентиляция<strong>${c.minVentilationAreaCm2??'—'} см²</strong></span></div><p class="meta-note">${esc(x.notes||'')}</p><p class="source-line">Drawing/source: ${esc(x.source)}</p></div></div>`;
  })();
  host.innerHTML=`<div class="dashboard appliance-studio"><div class="appliance-hero"><div><span class="eyebrow">FURNITURE-FIRST APPLIANCE INTELLIGENCE</span><h2>Appliance Studio</h2><p>Сначала правильная мебель под технику. Продажа техники — дополнительный сценарий, а не обязательный.</p></div><div class="appliance-hero-metrics"><div class="metric"><label>Models</label><strong>${s.items.length}</strong></div><div class="metric"><label>Brands</label><strong>${brands.length}</strong></div></div></div><div class="card"><div class="card-body"><div class="procurement-switch"><label><input type="radio" name="procMode" value="customer_supplied" ${s.procurementMode==='customer_supplied'?'checked':''}> Техника клиента</label><label><input type="radio" name="procMode" value="makster_supplied" ${s.procurementMode==='makster_supplied'?'checked':''}> Закупаем мы</label><label><input type="radio" name="procMode" value="undecided" ${s.procurementMode==='undecided'?'checked':''}> Ещё не решено</label></div></div></div>${commercial}<div class="card"><div class="card-body"><div class="appliance-filters"><input id="appSearch" placeholder="Бренд или модель" value="${esc(s.query)}"><select id="appBrand"><option value="all">Все бренды</option>${brands.map(b=>`<option value="${esc(b)}" ${s.manufacturer===b?'selected':''}>${esc(b)}</option>`).join('')}</select><select id="appKind"><option value="all">Все типы</option>${kinds.map(k=>`<option value="${k}" ${s.kind===k?'selected':''}>${k}</option>`).join('')}</select><button id="appProject" class="secondary">Подобрать по проекту</button></div></div></div><div class="appliance-grid"><div class="appliance-list">${rows||'<p class="meta-note">Моделей по фильтру нет.</p>'}</div><div>${detail}<div class="card"><h3>Подбор под мебель</h3><div class="card-body"><div class="toolbar-form"><input id="appW" type="number" placeholder="Ниша W, мм" value="${s.nicheWidthMm??''}"><input id="appH" type="number" placeholder="Ниша H, мм" value="${s.nicheHeightMm??''}"><input id="appD" type="number" placeholder="Ниша D, мм" value="${s.nicheDepthMm??''}"><input id="appVent" type="number" placeholder="Вентиляция, см²" value="${s.ventilationAreaCm2??''}"><button id="appAuto">Подобрать Top 3</button></div></div></div>${renderApplianceTop3(s.auto)}${renderApplianceProjectRecommendations(s.projectReport)}</div></div></div>`;
  host.querySelectorAll('input[name="procMode"]').forEach(r=>r.addEventListener('change',()=>{s.procurementMode=r.value;renderApplianceStudio()}));
  $('appPriceTier')?.addEventListener('change',e=>{s.priceTier=e.target.value;renderApplianceStudio()});
  $('appSearch')?.addEventListener('change',e=>{s.query=e.target.value;renderApplianceStudio()});
  $('appSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){s.query=e.target.value;renderApplianceStudio()}});
  $('appBrand')?.addEventListener('change',e=>{s.manufacturer=e.target.value;renderApplianceStudio()});
  $('appKind')?.addEventListener('change',e=>{s.kind=e.target.value;s.auto=null;renderApplianceStudio()});
  $('appW')?.addEventListener('change',e=>s.nicheWidthMm=e.target.value||null);
  $('appH')?.addEventListener('change',e=>s.nicheHeightMm=e.target.value||null);
  $('appD')?.addEventListener('change',e=>s.nicheDepthMm=e.target.value||null);
  $('appVent')?.addEventListener('change',e=>s.ventilationAreaCm2=e.target.value||null);
  $('appAuto')?.addEventListener('click',applianceStudioAutoSelect);
  $('appProject')?.addEventListener('click',applianceStudioAnalyzeProject);
  host.querySelectorAll('[data-app-id]').forEach(b=>b.addEventListener('click',()=>selectApplianceStudioItem(b.dataset.appId)));
  host.querySelectorAll('[data-app-project-apply]').forEach(b=>b.addEventListener('click',()=>applyApplianceProjectRecommendation(Number(b.dataset.appProjectApply))));
}

async function loadHardwareStudio(){
  try{
    const data=await api('/api/v1/catalogs/hardware');
    state.hardwareStudio.items=data.items||[];
    state.hardwareStudio.manufacturers=data.manufacturers||[];
    if(state.hardwareStudio.selected && !state.hardwareStudio.items.some(x=>x.id===state.hardwareStudio.selected.id))state.hardwareStudio.selected=null;
    renderHardwareStudio();
  }catch(e){msg(`Hardware Studio: ${e.message}`,'ai')}
}
function hardwareStudioFiltered(){
  const s=state.hardwareStudio,q=(s.query||'').trim().toLowerCase();
  return (s.items||[]).filter(x=>
    (s.role==='all'||x.role===s.role)
    &&(s.manufacturer==='all'||x.manufacturer===s.manufacturer)
    &&(!q||[x.manufacturer,x.family,x.code,x.id].some(v=>String(v||'').toLowerCase().includes(q)))
  );
}
function hardwareDrillingStatus(x){
  const s=x?.drillingProfile?.status;
  if(s==='verified_profile_reference'||s==='existing_project_profile')return {label:'DRILLING VERIFIED',cls:'good'};
  if(s==='not_imported')return {label:'DRILLING NOT IMPORTED',cls:'bad'};
  return {label:'DRILLING UNKNOWN',cls:'neutral'};
}
function selectHardwareStudioItem(id){state.hardwareStudio.selected=state.hardwareStudio.items.find(x=>x.id===id)||null;state.hardwareStudio.auto=null;renderHardwareStudio()}
async function hardwareStudioAutoSelect(){
  const s=state.hardwareStudio;
  if(s.role==='all'){msg('Hardware Studio: сначала выберите роль — петля, направляющая, подъёмник и т.д.','ai');return}
  const body={role:s.role,maxResults:3};
  if(s.frontThicknessMm)body.frontThicknessMm=Number(s.frontThicknessMm);
  if(s.nominalLengthMm)body.desiredNominalLengthMm=Number(s.nominalLengthMm);
  if(s.loadKg)body.expectedDynamicLoadKg=Number(s.loadKg);
  body.requireProductionDrilling=Boolean(s.requireProductionDrilling);
  if(s.manufacturer!=='all')body.preferredManufacturers=[s.manufacturer];
  try{
    state.hardwareStudio.auto=await api('/api/v1/catalogs/hardware/auto-select',{method:'POST',body:JSON.stringify(body)});
    renderHardwareStudio();
  }catch(e){msg(`Hardware Auto Selection: ${e.message}`,'ai')}
}
async function hardwareStudioAnalyzeProject(){
  if(!state.project){msg('Hardware Studio: сначала откройте проект.','ai');return}
  try{
    const r=await api(`/api/v1/projects/${state.project.id}/catalog-auto-selection`);
    state.hardwareStudio.projectReport={...r,recommendations:(r.recommendations||[]).filter(x=>x.target==='hinge'||x.target==='runner')};
    renderHardwareStudio();
  }catch(e){msg(`Hardware Project Selection: ${e.message}`,'ai')}
}
async function applyHardwareProjectRecommendation(index){
  const r=state.hardwareStudio.projectReport?.recommendations?.[index],c=r?.result?.recommended;
  if(!state.project||!r||!c)return;
  try{
    const body={approved:true,approvedBy:'hardware-studio',furnitureId:r.furnitureId,moduleId:r.moduleId,target:r.target,candidateId:c.record.id};
    if(r.targetRefId)body.targetRefId=r.targetRefId;
    const out=await api(`/api/v1/projects/${state.project.id}/catalog-assignment/apply`,{method:'POST',body:JSON.stringify(body)});
    state.project=out.project;state.scene=out.visualScene;state.engineering=out.engineering;state.previewScene=null;
    await loadProjects();await hardwareStudioAnalyzeProject();renderAll();loadHistory();
    msg(`Hardware Studio: ${c.record.manufacturer} ${c.record.family} применён → Revision ${state.project.snapshot.revision}.`,'meta');
  }catch(e){msg(`Hardware assignment: ${e.message}`,'ai')}
}
function renderHardwareAutoTop3(r){
  if(!r)return '';
  const rows=(r.candidates||[]).map((c,i)=>{
    const d=hardwareDrillingStatus(c.record);
    return `<div class="hardware-pick"><div><span class="rank">#${i+1}</span><strong>${esc(c.record.manufacturer)} · ${esc(c.record.family)}</strong>${c.record.code?`<code>${esc(c.record.code)}</code>`:''}</div><div class="hardware-score">${c.selectionScore}/100</div><p>${esc(c.compatibilityStatus.toUpperCase())} · ${c.productionReady?'production drilling trusted':'production drilling not trusted'}</p><span class="pill ${d.cls}">${d.label}</span></div>`;
  }).join('');
  return `<div class="card"><h3>Top 3 по условиям</h3><div class="card-body">${rows||'<p class="meta-note">Подтверждённых кандидатов нет.</p>'}</div></div>`;
}
function renderHardwareProjectRecommendations(r){
  if(!r)return '';
  const rows=(r.recommendations||[]).map((x,i)=>{
    const c=x.result?.recommended,ready=Boolean(c&&c.compatibilityStatus==='compatible');
    return `<div class="business-alert"><strong>${esc(x.target.toUpperCase())} · ${esc(x.moduleLibraryId||x.moduleId)}</strong><p>${esc(x.note)}</p><p>${c?`${esc(c.record.manufacturer)} · ${esc(c.record.family)}${c.record.code?` · ${esc(c.record.code)}`:''} · ${c.selectionScore}/100`:'Нет кандидата'}</p>${ready?`<button class="small" data-hw-project-apply="${i}">Применить → новая Revision</button>`:''}</div>`;
  }).join('');
  return `<div class="card"><h3>Фурнитура текущего проекта</h3><div class="card-body"><p class="meta-note">${r.recommendations.length} целей · применение только через новую Revision.</p>${rows||'<p>Петли/направляющие для автоподбора не найдены.</p>'}</div></div>`;
}
function renderHardwareStudio(){
  const host=$('htmlStage'),s=state.hardwareStudio;
  if(!s.items.length&&!s._loading){s._loading=true;api('/api/v1/catalogs/hardware').then(d=>{s.items=d.items||[];s.manufacturers=d.manufacturers||[];s._loading=false;renderHardwareStudio()}).catch(e=>{s._loading=false;msg(`Hardware Studio: ${e.message}`,'ai')})}
  const filtered=hardwareStudioFiltered(),x=s.selected;
  const brands=(s.manufacturers||[]).map(x=>typeof x==='string'?x:x.name).filter(Boolean);
  const rows=filtered.map(i=>{const d=hardwareDrillingStatus(i);return `<button class="hardware-row ${x?.id===i.id?'active':''}" data-hw-id="${esc(i.id)}"><div><strong>${esc(i.manufacturer)} · ${esc(i.family)}</strong><small>${esc(i.code||i.id)}</small></div><span class="pill ${d.cls}">${d.label}</span></button>`}).join('');
  const detail=!x?`<div class="studio-empty"><strong>Выберите фурнитуру</strong><p>Здесь видны не только название и артикул, но и инженерные ограничения и доверие к присадке.</p></div>`:`<div class="card hardware-detail"><h3>${esc(x.manufacturer)} · ${esc(x.family)}</h3><div class="card-body"><div class="hardware-meta"><span>Role <strong>${esc(x.role)}</strong></span><span>Code <strong>${esc(x.code||'—')}</strong></span><span>Trust <strong>${esc(x.trust)}</strong></span></div><p><strong>Drilling profile:</strong> ${esc(x.drillingProfile?.profileId||x.drillingProfile?.status||'UNKNOWN')}</p>${x.compatibility?.maxFrontThicknessMm?`<p>Макс. толщина фасада: <strong>${x.compatibility.maxFrontThicknessMm} мм</strong></p>`:''}${x.compatibility?.nominalLengthMm?`<p>Номинальная длина: <strong>${x.compatibility.nominalLengthMm} мм</strong></p>`:''}${x.compatibility?.maxDynamicLoadKg?`<p>Нагрузка: <strong>${x.compatibility.maxDynamicLoadKg} кг</strong></p>`:''}<p class="meta-note">${esc(x.notes||'')}</p><p class="source-line">Source: ${esc(x.source)}</p></div></div>`;
  host.innerHTML=`<div class="dashboard hardware-studio"><div class="hardware-hero"><div><span class="eyebrow">MAKSTER ENGINEERING CATALOG</span><h2>Hardware Studio</h2><p>Фурнитура как инженерный компонент: совместимость → присадка → BOM → Production Gate.</p></div><div class="hardware-hero-metrics"><div class="metric"><label>Records</label><strong>${s.items.length}</strong></div><div class="metric"><label>Brands</label><strong>${brands.length}</strong></div></div></div><div class="card"><div class="card-body hardware-coverage">${(s.manufacturers||[]).map(b=>{const name=typeof b==='string'?b:b.name,coverage=typeof b==='string'?'unknown':b.coverage,count=(s.items||[]).filter(x=>x.manufacturer===name).length;return `<span class="coverage-chip"><strong>${esc(name)}</strong><small>${count} records · ${esc(coverage)}</small></span>`}).join('')}</div></div><div class="card"><div class="card-body"><div class="hardware-filters"><input id="hwSearch" placeholder="Поиск по бренду, серии, артикулу" value="${esc(s.query)}"><select id="hwBrand"><option value="all">Все бренды</option>${brands.map(b=>`<option value="${esc(b)}" ${s.manufacturer===b?'selected':''}>${esc(b)}</option>`).join('')}</select><select id="hwRole"><option value="all">Все типы</option>${['hinge','runner','lift','connector','other'].map(r=>`<option value="${r}" ${s.role===r?'selected':''}>${r}</option>`).join('')}</select><button id="hwProject" class="secondary">Подобрать по проекту</button></div></div></div><div class="hardware-grid"><div class="hardware-list">${rows||'<p class="meta-note">Ничего не найдено.</p>'}</div><div>${detail}<div class="card"><h3>Подбор по условиям</h3><div class="card-body"><div class="toolbar-form"><input id="hwFront" type="number" placeholder="Фасад, мм" value="${s.frontThicknessMm??''}"><input id="hwLength" type="number" placeholder="Длина, мм" value="${s.nominalLengthMm??''}"><input id="hwLoad" type="number" placeholder="Нагрузка, кг" value="${s.loadKg??''}"><label><input id="hwDrill" type="checkbox" ${s.requireProductionDrilling?'checked':''}> Только с доверенной присадкой</label><button id="hwAuto">Подобрать Top 3</button></div></div></div>${renderHardwareAutoTop3(s.auto)}${renderHardwareProjectRecommendations(s.projectReport)}</div></div></div>`;
  $('hwSearch')?.addEventListener('change',e=>{s.query=e.target.value;renderHardwareStudio()});$('hwSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){s.query=e.target.value;renderHardwareStudio()}});
  $('hwBrand')?.addEventListener('change',e=>{s.manufacturer=e.target.value;renderHardwareStudio()});
  $('hwRole')?.addEventListener('change',e=>{s.role=e.target.value;s.auto=null;renderHardwareStudio()});
  $('hwFront')?.addEventListener('change',e=>s.frontThicknessMm=e.target.value||null);
  $('hwLength')?.addEventListener('change',e=>s.nominalLengthMm=e.target.value||null);
  $('hwLoad')?.addEventListener('change',e=>s.loadKg=e.target.value||null);
  $('hwDrill')?.addEventListener('change',e=>s.requireProductionDrilling=e.target.checked);
  $('hwAuto')?.addEventListener('click',hardwareStudioAutoSelect);
  $('hwProject')?.addEventListener('click',hardwareStudioAnalyzeProject);
  host.querySelectorAll('[data-hw-id]').forEach(b=>b.addEventListener('click',()=>selectHardwareStudioItem(b.dataset.hwId)));
  host.querySelectorAll('[data-hw-project-apply]').forEach(b=>b.addEventListener('click',()=>applyHardwareProjectRecommendation(Number(b.dataset.hwProjectApply))));
}

async function loadCatalogReviewQueue(){
  try{state.catalog.reviewQueue=await api('/api/v1/catalogs/review-queue');renderCatalog()}
  catch(e){msg(`Catalog review queue: ${e.message}`,'ai')}
}
async function promoteReviewCandidate(id){
  const c=state.catalog.reviewQueue?.candidates?.find(x=>x.candidateId===id);if(!c)return;
  try{
    await api('/api/v1/catalogs/import/promote',{method:'POST',body:JSON.stringify({candidateId:id,reviewedBy:'web-reviewer',manufacturerEvidenceConfirmed:true,trust:'manufacturer_verified'})});
    await loadCatalogReviewQueue();await loadCatalog(state.catalog.mode);msg(`Catalog: ${id} promoted.`,'meta');
  }catch(e){msg(`Catalog promote: ${e.message}`,'ai')}
}
async function rejectReviewCandidate(id){
  try{
    await api('/api/v1/catalogs/import/reject',{method:'POST',body:JSON.stringify({candidateId:id,reviewedBy:'web-reviewer',reason:'Rejected in review queue'})});
    await loadCatalogReviewQueue();msg(`Catalog: ${id} rejected.`,'meta');
  }catch(e){msg(`Catalog reject: ${e.message}`,'ai')}
}
function renderReviewQueue(q){
  const list=q?.candidates||[];
  return `<div class="card"><h3>Review Queue · ${q?.registryMode||'—'}</h3><div class="card-body"><button id="catReviewRefresh" class="secondary">Обновить очередь</button>${list.length?list.map(c=>`<div class="business-alert"><strong>${esc(c.record.manufacturer)} · ${esc(c.record.family||c.record.model||c.candidateId)}</strong><p>${esc(c.trust)} · confidence ${Math.round((c.confidence||0)*100)}%</p><div class="toolbar-form"><button class="small" data-promote="${esc(c.candidateId)}">Promote</button><button class="secondary small" data-reject="${esc(c.candidateId)}">Reject</button></div></div>`).join(''):'<p class="meta-note">Очередь пуста.</p>'}</div></div>`;
}

async function importCatalogText(){
  try{
    const target=$('catImportTarget')?.value||'hardware';
    const format=$('catImportFormat')?.value||'csv';
    const fileName=$('catImportFile')?.value?.trim()||`manual.${format}`;
    const manufacturer=$('catImportManufacturer')?.value?.trim()||undefined;
    const contentText=$('catImportText')?.value||'';
    state.catalog.importResult=await api('/api/v1/catalogs/import',{method:'POST',body:JSON.stringify({importId:`import-${Date.now()}`,target,format,fileName,...(manufacturer?{manufacturer}:{}),contentText})});
    renderCatalog();
  }catch(e){msg(`Catalog import: ${e.message}`,'ai')}
}
function renderCatalogImport(r){
  const rows=(r?.candidates||[]).slice(0,12).map((c,i)=>`<div class="business-alert"><strong>#${i+1} · ${esc(c.record.manufacturer)} · ${esc(c.record.family||c.record.model||c.record.code||c.record.id)}</strong><p>${esc(c.trust)} · confidence ${Math.round((c.confidence||0)*100)}%</p><p>${esc((c.warnings||[]).join(' ')||'Staged for review.')}</p></div>`).join('');
  return `<div class="card"><h3>Catalog Import Pipeline · 2.7.9</h3><div class="card-body"><div class="toolbar-form"><select id="catImportTarget"><option value="hardware">Фурнитура</option><option value="appliance">Техника</option></select><select id="catImportFormat"><option>csv</option><option>json</option><option>bxf</option><option>xlsx</option><option>pdf</option></select><input id="catImportManufacturer" placeholder="Производитель"><input id="catImportFile" placeholder="Имя файла"><button id="catImportRun">Разобрать в staging</button></div><textarea id="catImportText" rows="7" style="width:100%;margin-top:10px" placeholder="CSV / JSON / BXF text. Для PDF/XLSX core принимает extractedRows от extractor-adapter."></textarea>${r?`<p class="meta-note">${r.parsedCount} parsed · ${r.rejectedCount} rejected · REVIEW REQUIRED</p>${rows}`:''}</div></div>`;
}

function renderCatalog(){
  const host=$('htmlStage'),mode=state.catalog.mode,items=state.catalog.items||[],x=state.catalog.selected;
  if(!items.length && !state.catalog._loading){state.catalog._loading=true;api(mode==='hardware'?'/api/v1/catalogs/hardware':'/api/v1/catalogs/appliances').then(d=>{state.catalog.items=d.items||[];state.catalog._loading=false;renderCatalog()}).catch(e=>{state.catalog._loading=false;msg(`Catalog: ${e.message}`,'ai')})}
  const rows=items.map(i=>`<button class="catalog-row ${x?.id===i.id?'active':''}" data-cat-id="${esc(i.id)}"><span>${esc(catalogItemLabel(i))}</span><small>${esc(catalogTrustLabel(i))}</small></button>`).join('');
  const form=!x?'<div class="studio-empty"><strong>Выберите запись</strong><p>Makster проверит только те ограничения, для которых есть подтверждённые данные.</p></div>':
    mode==='hardware'
    ? `<div class="card"><h3>${esc(catalogItemLabel(x))}</h3><div class="card-body"><p class="meta-note">Trust: ${esc(catalogTrustLabel(x))} · source: ${esc(x.source)}</p><div class="toolbar-form"><input id="catFront" type="number" placeholder="Толщина фасада, мм"><input id="catLength" type="number" placeholder="Номинальная длина, мм"><input id="catLoad" type="number" placeholder="Нагрузка, кг"><label><input id="catDrill" type="checkbox"> Нужна производственная присадка</label><button id="catCheck">Проверить совместимость</button><button id="catAuto" class="secondary">Подобрать Top 3</button></div></div></div>`
    : `<div class="card"><h3>${esc(catalogItemLabel(x))}</h3><div class="card-body"><p class="meta-note">Trust: ${esc(catalogTrustLabel(x))} · source: ${esc(x.source)}</p><div class="toolbar-form"><input id="catNicheW" type="number" placeholder="Ниша ширина, мм"><input id="catNicheH" type="number" placeholder="Ниша высота, мм"><input id="catNicheD" type="number" placeholder="Ниша глубина, мм"><input id="catVent" type="number" placeholder="Вентиляция, см²"><button id="catCheck">Проверить совместимость</button><button id="catAuto" class="secondary">Подобрать Top 3</button></div></div></div>`;
  host.innerHTML=`<div class="dashboard">${renderCatalogImport(state.catalog.importResult)}${renderReviewQueue(state.catalog.reviewQueue)}<div class="card"><h3>Master Catalog · 2.8.0</h3><div class="card-body"><div class="toolbar-form"><button id="catHardware" class="${mode==='hardware'?'':'secondary'}">Фурнитура</button><button id="catAppliances" class="${mode==='appliances'?'':'secondary'}">Техника</button><button id="catProject" class="secondary">Подобрать по текущему проекту</button></div><p class="meta-note">Каталог не имеет права придумывать присадку или монтажные размеры. UNKNOWN лучше ложной точности.</p></div></div><div class="catalog-layout"><div class="catalog-list">${rows||'<p>Loading…</p>'}</div><div>${form}${renderCompatibilityResult(state.catalog.result)}${renderAutoSelection(state.catalog.auto)}${renderProjectCatalogReport(state.catalog.projectReport)}</div></div></div>`;
  $('catImportRun')?.addEventListener('click',importCatalogText);$('catReviewRefresh')?.addEventListener('click',loadCatalogReviewQueue);host.querySelectorAll('[data-promote]').forEach(b=>b.addEventListener('click',()=>promoteReviewCandidate(b.dataset.promote)));host.querySelectorAll('[data-reject]').forEach(b=>b.addEventListener('click',()=>rejectReviewCandidate(b.dataset.reject)));$('catHardware')?.addEventListener('click',()=>loadCatalog('hardware'));
  $('catAppliances')?.addEventListener('click',()=>loadCatalog('appliances'));$('catProject')?.addEventListener('click',analyzeCurrentProjectCatalog);
  host.querySelectorAll('[data-cat-id]').forEach(b=>b.addEventListener('click',()=>selectCatalogItem(b.dataset.catId)));
  $('catCheck')?.addEventListener('click',checkCatalogCompatibility);$('catAuto')?.addEventListener('click',autoSelectCatalog);
  host.querySelectorAll('[data-project-assign]').forEach(b=>b.addEventListener('click',()=>applyProjectCatalogRecommendation(Number(b.dataset.projectAssign))));
}

async function loadProductionReadiness(){
  if(!state.project){state.productionReadiness=null;renderProduction();return}
  try{state.productionReadiness=await api(`/api/v1/projects/${state.project.id}/production-readiness`);renderProduction()}
  catch(e){msg(`Production Readiness: ${e.message}`,'ai')}
}
function renderProduction(){
  const host=$('htmlStage'),m=state.productionPack?.manifest,r=state.productionReadiness;
  const currentRevision=state.project?.snapshot?.revision;
  if(state.project&&(!r||r.revision!==currentRevision)&&!state._readinessLoading){
    state._readinessLoading=true;
    api(`/api/v1/projects/${state.project.id}/production-readiness`).then(x=>{state.productionReadiness=x;state._readinessLoading=false;renderProduction()}).catch(e=>{state._readinessLoading=false;msg(`Production Readiness: ${e.message}`,'ai')});
  }
  if(!state.project){host.innerHTML='<div class="dashboard"><div class="studio-empty"><strong>Откройте проект</strong><p>Production Release привязан к конкретной Revision.</p></div></div>';return}
  const blockers=(r?.blockers||[]).map(b=>`<div class="business-alert"><strong>BLOCK · ${esc(b.code)}</strong><p>${esc(b.message)}</p><small>${esc(b.source)}</small></div>`).join('');
  const warnings=(r?.warnings||[]).slice(0,8).map(b=>`<div class="business-alert"><strong>WARN · ${esc(b.code)}</strong><p>${esc(b.message)}</p><small>${esc(b.source)}</small></div>`).join('');
  const locked=!r||!r.productionReady;
  host.innerHTML=`<div class="dashboard production-readiness"><div class="production-hero ${locked?'hold':'ready'}"><div><span class="eyebrow">REVISION ${currentRevision}</span><h2>Production Readiness · ${r?.status||'CHECKING'}</h2><p>${locked?'Производственный выпуск закрыт, пока обязательные данные не подтверждены.':'Текущая Revision прошла обязательные производственные проверки.'}</p></div><div class="readiness-ring"><strong>${r?.readinessPercent??'—'}${r?'%':''}</strong><span>readiness</span></div></div><div class="metrics"><div class="metric ${r?.productionReady?'good':'bad'}"><label>Production</label><strong>${r?r.productionReady?'UNLOCKED':'LOCKED':'—'}</strong></div><div class="metric ${r?.cncReady?'good':'bad'}"><label>CNC</label><strong>${r?r.cncReady?'READY':'HOLD':'—'}</strong></div><div class="metric"><label>Blocking</label><strong>${r?.blockers?.length??'—'}</strong></div><div class="metric"><label>Warnings</label><strong>${r?.warnings?.length??'—'}</strong></div><div class="metric"><label>Revision</label><strong>${r?.revision??currentRevision}</strong></div></div><div class="card"><h3>Production Release Gate</h3><div class="card-body"><p class="meta-note">Сервер перепроверяет эту Revision при каждом запросе Production Pack. UI не может обойти блокировку.</p><div class="toolbar-form"><button id="readinessRefresh" class="secondary">Перепроверить</button><button data-pack="manual" ${locked?'disabled':''}>Manual Workshop</button><button data-pack="cutting_only" class="secondary" ${locked?'disabled':''}>Только раскрой</button><button data-pack="cutting_edging" class="secondary" ${locked?'disabled':''}>Раскрой + кромка</button><button data-pack="cutting_edging_drilling" class="secondary" ${locked||!r?.cncReady?'disabled':''}>+ присадка CNC</button></div>${locked?'<p class="lock-note">🔒 Сначала закройте Blocking / Approval / Measurement пункты в Auto Complete.</p>':''}</div></div>${blockers?`<div class="card"><h3>Что блокирует производство</h3><div class="card-body">${blockers}</div></div>`:''}${warnings?`<div class="card"><h3>Предупреждения / CNC</h3><div class="card-body">${warnings}</div></div>`:''}${m?`<div class="card"><h3>Последний Production Pack</h3><div class="card-body"><p><strong>${m.ready?'READY':'HOLD'}</strong> · ${esc(m.route)} · ${m.summary?.physicalPanelParts??m.summary?.partCount??'—'} деталей · ${state.productionPack?.generatedFiles?.length??0} файлов</p></div></div>`:''}</div>`;
  $('readinessRefresh')?.addEventListener('click',()=>{state.productionReadiness=null;loadProductionReadiness()});
  host.querySelectorAll('[data-pack]').forEach(b=>b.addEventListener('click',async()=>{
    const preset=b.dataset.pack;if(b.disabled)return;
    try{
      const body=preset==='manual'?{route:'manual_workshop'}:{route:'outsource',outsourcePreset:preset};
      state.productionPack=await api(`/api/v1/projects/${state.project.id}/production-pack/preview`,{method:'POST',body:JSON.stringify(body)});
      await loadProductionReadiness();renderProduction();
    }catch(e){state.productionReadiness=null;msg(`Production Pack: ${e.message}`,'ai');loadProductionReadiness()}
  }));
}

$('newProject').addEventListener('click',createProject);$('refreshProjects').addEventListener('click',loadProjects);$('undoVisual').addEventListener('click',undoVisual);$('redoVisual').addEventListener('click',redoVisual);$('send').addEventListener('click',sendPrompt);$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))sendPrompt()});document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));renderHeader();renderDesign()}));document.querySelectorAll('.bottom-tabs button').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderTab()}));$('fitView').addEventListener('click',renderDesign);window.addEventListener('resize',renderDesign);
api('/api/v1/health').then(h=>{$('health').textContent=`Core ${h.version} · Visual ${h.visualProduct||'—'}`}).catch(()=>{$('health').textContent='Core offline';$('health').classList.add('bad')});loadProjects();renderAll();
