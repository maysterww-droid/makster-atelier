
import type { ProjectModelV1 } from '../../project-model/src/types.js';
import { toMm } from '../../project-model/src/types.js';

export type MeasurementCompletenessStatus = 'complete' | 'missing' | 'review';

export interface MeasurementCompletenessItem {
  id: string;
  status: MeasurementCompletenessStatus;
  area: 'room' | 'opening' | 'obstacle' | 'utility';
  title: string;
  detail: string;
  wall?: 'south' | 'north' | 'west' | 'east';
  sourceId?: string;
}

export interface RoomMeasurementCompletenessReport {
  version: '2.8.7';
  projectId: string;
  revision: number;
  roomId?: string;
  completenessPercent: number;
  completeCount: number;
  missingCount: number;
  reviewCount: number;
  items: MeasurementCompletenessItem[];
}

function confirmed(m:any){return m?.value!=null && m?.state==='confirmed';}
function latestRoomScene(project:ProjectModelV1):any|undefined{
  const notes=[...project.notes].reverse();
  const n=notes.find(x=>typeof x.text==='string'&&x.text.startsWith('MAKSTER_ROOM_SCENE_V1:'));
  if(!n)return;
  try{return JSON.parse(n.text.slice('MAKSTER_ROOM_SCENE_V1:'.length));}catch{return;}
}
function wallOf(sceneObj:any):'south'|'north'|'west'|'east'|undefined{
  return ['south','north','west','east'].includes(sceneObj?.side)?sceneObj.side:undefined;
}
function add(items:MeasurementCompletenessItem[],status:MeasurementCompletenessStatus,area:MeasurementCompletenessItem['area'],id:string,title:string,detail:string,obj?:any){
  items.push({id,status,area,title,detail,...(wallOf(obj)?{wall:wallOf(obj)}:{}),...(obj?.id?{sourceId:String(obj.id)}:{})});
}

export function analyzeRoomMeasurementCompleteness(project:ProjectModelV1):RoomMeasurementCompletenessReport{
  const room=project.site.rooms[0];
  const scene=latestRoomScene(project);
  const items:MeasurementCompletenessItem[]=[];

  if(!room){
    add(items,'missing','room','room:missing','Помещение не сохранено','Сначала создайте/сохраните помещение в Kitchen Studio.');
  }else{
    add(items,confirmed(room.dimensions?.width)?'complete':'missing','room','room:width','Ширина помещения',confirmed(room.dimensions?.width)?`${toMm(room.dimensions!.width!.value!)} мм CONFIRMED`:'Ширина помещения не подтверждена.');
    add(items,confirmed(room.dimensions?.depth)?'complete':'missing','room','room:depth','Глубина помещения',confirmed(room.dimensions?.depth)?`${toMm(room.dimensions!.depth!.value!)} мм CONFIRMED`:'Глубина помещения не подтверждена.');
    add(items,confirmed(room.dimensions?.height)?'complete':'missing','room','room:height','Высота помещения',confirmed(room.dimensions?.height)?`${toMm(room.dimensions!.height!.value!)} мм CONFIRMED`:'Высота помещения не подтверждена. Для верхних шкафов/пеналов это критично.');

    room.walls.forEach((w,i)=>add(items,confirmed(w.height)?'complete':'missing','room',`wall:${w.id}:height`,`Высота стены ${i+1}`,confirmed(w.height)?`${toMm(w.height.value!)} мм CONFIRMED`:'Высота стены UNKNOWN.'));

    if(scene){
      for(const f of scene.features||[]){
        if(f.kind==='door'){
          const okWall=Boolean(wallOf(f)),okZ=f.verticalState==='confirmed'&&f.zMm!=null,okH=f.verticalState==='confirmed'&&f.heightMm!=null;
          add(items,okWall?'complete':'missing','opening',`door:${f.id}:wall`,'Дверь — привязка к стене',okWall?`${String(f.side).toUpperCase()}`:'Дверь не привязана к стене.',f);
          add(items,okZ&&okH?'complete':'missing','opening',`door:${f.id}:vertical`,'Дверь — высота/отметка',okZ&&okH?`Z ${f.zMm} мм · H ${f.heightMm} мм`:'Нужны подтверждённые Z и H двери.',f);
        } else if(f.kind==='window'){
          const okWall=Boolean(wallOf(f)),okZ=f.verticalState==='confirmed'&&f.zMm!=null,okH=f.verticalState==='confirmed'&&f.heightMm!=null;
          add(items,okWall?'complete':'missing','opening',`window:${f.id}:wall`,'Окно — привязка к стене',okWall?`${String(f.side).toUpperCase()}`:'Окно не привязано к стене.',f);
          add(items,okZ?'complete':'missing','opening',`window:${f.id}:sill`,'Подоконник / низ окна',okZ?`Z ${f.zMm} мм`:'Не задана высота низа окна/подоконника.',f);
          add(items,okH?'complete':'missing','opening',`window:${f.id}:height`,'Высота окна',okH?`H ${f.heightMm} мм`:'Высота окна не подтверждена.',f);
        } else if(f.kind==='radiator'){
          const okWall=Boolean(wallOf(f)),okVert=f.verticalState==='confirmed'&&f.zMm!=null&&f.heightMm!=null;
          add(items,okWall?'complete':'missing','obstacle',`radiator:${f.id}:wall`,'Радиатор — стена',okWall?`${String(f.side).toUpperCase()}`:'Радиатор не привязан к стене.',f);
          add(items,okVert?'complete':'missing','obstacle',`radiator:${f.id}:vertical`,'Радиатор — высота/отметка',okVert?`Z ${f.zMm} мм · H ${f.heightMm} мм`:'Нужны Z и H радиатора.',f);
        } else if(['column','shaft'].includes(f.kind)){
          add(items,'review','obstacle',`${f.kind}:${f.id}:height`,`${f.kind==='column'?'Колонна':'Шахта'} — высота`,`2D размер есть. Вертикальную высоту/проход до потолка нужно проверить отдельно.`,f);
        }
      }
      for(const u of scene.utilities||[]){
        const okWall=Boolean(wallOf(u)),okZ=u.zMm!=null && (u.verticalState==='confirmed'||u.zState==='confirmed');
        const title=u.kind==='power'?'Электрика':u.kind==='water'?'Вода':u.kind==='drain'?'Слив':u.kind==='hood_vent'?'Вытяжка':u.kind==='gas'?'Газ':String(u.kind);
        add(items,okWall?'complete':'missing','utility',`utility:${u.id}:wall`,`${title} — стена`,okWall?`${String(u.side).toUpperCase()}`:'Коммуникация не привязана к стене.',u);
        add(items,okZ?'complete':'missing','utility',`utility:${u.id}:z`,`${title} — высота`,okZ?`Z ${u.zMm} мм CONFIRMED`:'Вертикальная отметка Z не подтверждена.',u);
      }
    }else{
      add(items,'review','room','room:scene-source','Исходная сцена помещения не найдена','ProjectModel содержит помещение, но lossless Room Scene note отсутствует. Проверка отдельных Z-полей ограничена.');
    }
  }

  const completeCount=items.filter(x=>x.status==='complete').length;
  const missingCount=items.filter(x=>x.status==='missing').length;
  const reviewCount=items.filter(x=>x.status==='review').length;
  const denom=Math.max(1,items.length);
  const completenessPercent=Math.round(((completeCount+reviewCount*0.35)/denom)*100);
  return {version:'2.8.7',projectId:project.projectId,revision:project.revision,...(room?{roomId:room.id}:{}),completenessPercent,completeCount,missingCount,reviewCount,items};
}
