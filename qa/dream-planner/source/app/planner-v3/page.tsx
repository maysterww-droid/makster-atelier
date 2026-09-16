"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { isMaksterLibraryConfigured, loadMotionContract, loadReadyModuleLibrary, type MotionContract, type ReadyModuleAsset } from "../../lib/makster-library";

const DreamKitchenViewer = dynamic(() => import("../../components/DreamKitchenViewer"), {
  ssr: false,
  loading: () => <div style={{height:"100%",display:"grid",placeItems:"center",color:"#e7c678"}}>Loading Dream Planner v3…</div>,
});

const steps = ["shape","size","fronts","worktop","panel","options","request"];
const shapeOptions = [["Straight","Прямая","▭▭▭",1],["L-shape","Угловая","▭┐",1.25],["U-shape","П-образная","┌▭┐",1.45],["Island","С островом","▭ ◫",1.7]];
const fronts = [["Fenix Nero","#111111","#2c2c2c",1200],["Cashmere","#b8aa96","#978876",850],["Warm white","#eee9df","#cfc7bb",850],["Graphite","#4a4a47","#1a1a1a",1050],["Natural oak","#bd8651","#8b5e36",1300],["Walnut","#6b4530","#3c2418",1400]];
const tops = [["Caesarstone 5133","#e8ded0",2200],["Black stone","#151515",2600],["Travertine","#c2ad88",2800],["Compact concrete","#9d9489",1200]];
const panels = [["Quartz panel","#d9d1c8",700],["Marble panel","#e4e1d9",900],["Black stone","#141414",1100],["Concrete","#9d9489",650]];
const options = [["Warm LED",550],["GOLA black",450],["Bosch premium",3800],["Blum",950],["Premium organizers",1600],["Undercounter sink",1400]];

function euro(n:number){return "€ "+Math.round(n).toLocaleString("en-US").replace(","," ")}

export default function PlannerV3(){
  const [step,setStep]=useState(0);
  const [shape,setShape]=useState(shapeOptions[1]);
  const [length,setLength]=useState(4200);
  const [lengthB,setLengthB]=useState(2600);
  const [height,setHeight]=useState(2700);
  const [front,setFront]=useState(fronts[0]);
  const [top,setTop]=useState(tops[0]);
  const [panel,setPanel]=useState(panels[0]);
  const [selectedOptions,setSelectedOptions]=useState(options.slice(0,4));
  const [doors,setDoors]=useState(false);
  const [drawers,setDrawers]=useState(false);
  const [cam,setCam]=useState("iso");
  const [readyModules,setReadyModules]=useState<ReadyModuleAsset[]>([]);
  const [cloudAsset,setCloudAsset]=useState<ReadyModuleAsset|null>(null);
  const [motionContract,setMotionContract]=useState<MotionContract|null>(null);
  const [libraryStatus,setLibraryStatus]=useState<"loading"|"ready"|"fallback"|"error">(isMaksterLibraryConfigured()?"loading":"fallback");

  useEffect(()=>{
    if(!isMaksterLibraryConfigured()) return;
    const controller=new AbortController();
    loadReadyModuleLibrary(controller.signal)
      .then((assets)=>{
        setReadyModules(assets);
        const preferred=assets.find((asset)=>asset.templateCode==="M_BASE_DOOR"&&asset.widthMm===600)??assets[0]??null;
        setCloudAsset(preferred);
        setLibraryStatus(preferred?"ready":"fallback");
      })
      .catch((error)=>{
        if((error as Error).name!=="AbortError"){
          console.error("Makster Module Library:",error);
          setLibraryStatus("error");
        }
      });
    return()=>controller.abort();
  },[]);

  useEffect(()=>{
    const controller=new AbortController();
    setMotionContract(null);
    if(!cloudAsset?.motionUrl) return()=>controller.abort();
    loadMotionContract(cloudAsset.motionUrl,controller.signal)
      .then(setMotionContract)
      .catch((error)=>{if((error as Error).name!=="AbortError")console.error("Makster motion contract:",error)});
    return()=>controller.abort();
  },[cloudAsset]);

  const price = useMemo(()=>{
    const meters=(length+(shape[0]==="Straight"?0:lengthB))/1000;
    return meters*1800*Number(shape[3])+Number(front[3])+Number(top[2])+Number(panel[2])+selectedOptions.reduce((s:any,o:any)=>s+Number(o[1]),0);
  },[shape,length,lengthB,front,top,panel,selectedOptions]);

  const progress = Math.round(((step+1)/steps.length)*100);
  const mailto = "mailto:maysterww@gmail.com?subject=Dream Planner v3 request&body="+encodeURIComponent(JSON.stringify({shape:shape[1],length,lengthB,height,front:front[0],top:top[0],panel:panel[0],options:selectedOptions.map((o:any)=>o[0]),price:euro(price)},null,2));

  return <main className="v3">
    <header className="header"><a className="logo" href="/">MAKSTER<small>ATELIER</small></a><nav className="nav"><a href="/">Главная</a><a>Портфолио</a><a className="active">Dream Planner v3</a><a>Контакты</a></nav><a href={mailto} className="gold">Получить расчёт</a></header>
    <div className="shell">
      <aside className="left panel">
        <div className="stepHead"><small>Project readiness</small><b>{progress}%</b></div><div className="bar"><span style={{width:progress+"%"}}/></div>
        <div className="steps">{steps.map((_,i)=><button key={i} onClick={()=>setStep(i)} className={i===step?"active":""}>{i+1}</button>)}</div>
        <h1 className="title">{["Форма кухни","Размеры","Фасады","Столешница","Стеновая панель","Опции","Заявка"][step]}</h1>
        <p className="desc">{["Выберите форму кухни.","Укажите размеры помещения.","Выберите материал фасадов.","Выберите столешницу.","Подберите стеновую панель.","Добавьте подсветку, технику, фурнитуру и наполнение.","Отправьте проект на точный расчёт."][step]}</p>
        {step===0&&<div className="grid">{shapeOptions.map((x:any)=><button key={x[0]} onClick={()=>setShape(x)} className={"choice "+(shape[0]===x[0]?"active":"")}><i>{x[2]}</i><b>{x[1]}</b><small>{x[0]}</small></button>)}</div>}
        {step===1&&<div>{field("Стена A",length,setLength)}{field("Стена B",lengthB,setLengthB)}{field("Высота",height,setHeight)}</div>}
        {step===2&&<MaterialGrid items={fronts} selected={front} setSelected={setFront}/>}
        {step===3&&<MaterialGrid items={tops} selected={top} setSelected={setTop}/>}
        {step===4&&<MaterialGrid items={panels} selected={panel} setSelected={setPanel}/>}
        {step===5&&<div className="grid">{options.map((x:any)=><button key={x[0]} className={"choice "+(selectedOptions.find((o:any)=>o[0]===x[0])?"active":"")} onClick={()=>setSelectedOptions((arr:any)=>arr.find((o:any)=>o[0]===x[0])?arr.filter((o:any)=>o[0]!==x[0]):[...arr,x])}><b>{x[0]}</b><small>+€ {x[1]}</small></button>)}</div>}
        {step===6&&<div className="request"><input placeholder="Ваше имя"/><input placeholder="+420 ___ ___ ___"/><input placeholder="Email"/><input placeholder="Адрес объекта"/><textarea placeholder="Комментарий"/><div className="upload">⇧<br/>Загрузить план помещения<br/><small>PDF, JPG, PNG</small></div><a className="gold" href={mailto}>Отправить проект</a></div>}
        <div className="actions"><button className="ghost" onClick={()=>setStep(Math.max(0,step-1))}>Назад</button><button className="gold" onClick={()=>setStep(Math.min(steps.length-1,step+1))}>Далее</button></div>
      </aside>
      <section className="center panel">
        <div className="viewerTop"><button onClick={()=>setCam("front")}>2D План</button><button className="active" onClick={()=>setCam("iso")}>3D Вид</button><button onClick={()=>setCam("top")}>Top</button><span style={{marginLeft:"auto",fontSize:11,letterSpacing:".08em",color:libraryStatus==="ready"?"#e7c678":"#9a938b"}}>{libraryStatus==="loading"?"MAKSTER LIBRARY · CONNECTING":libraryStatus==="ready"?`MAKSTER LIBRARY · READY · ${cloudAsset?.moduleCode} · V${cloudAsset?.version}`:libraryStatus==="error"?"MAKSTER LIBRARY · OFFLINE FALLBACK":"MAKSTER LIBRARY · LOCAL FALLBACK"}</span></div>
        <div className="canvasWrap"><DreamKitchenViewer frontColor={String(front[1])} topColor={String(top[1])} panelColor={String(panel[1])} layout={String(shape[0])} led={selectedOptions.some((o:any)=>String(o[0]).includes("LED"))} doorsOpen={doors} drawersOpen={drawers} cameraMode={cam} cloudAsset={cloudAsset} motionContract={motionContract}/></div>
        <div className="tools"><button onClick={()=>setCam("iso")}>↻<small>Вращать</small></button><button>⌕<small>Zoom</small></button><button onClick={()=>setDoors(v=>!v)}>▣<small>Фасады</small></button><button onClick={()=>setDrawers(v=>!v)}>▤<small>Ящики</small></button>{readyModules.length>1?<select aria-label="READY module" value={cloudAsset?.moduleCode??""} onChange={(e)=>setCloudAsset(readyModules.find((asset)=>asset.moduleCode===e.target.value)??null)}>{readyModules.map((asset)=><option key={asset.moduleCode} value={asset.moduleCode}>{asset.displayName} · V{asset.version}</option>)}</select>:null}</div>
      </section>
      <aside className="right panel">
        <div className="estimate"><small>Ориентировочная стоимость</small><strong>{euro(price)}</strong><span>Включая НДС</span><a href={mailto} className="gold">Получить точное предложение</a><br/><br/><button className="outline">Сохранить проект</button></div>
        <div className="spec"><h3>Выбранная комплектация</h3>{[["Форма",shape[1]],["Размеры",`${length} × ${lengthB} × ${height} мм`],["Фасады",front[0]],["Столешница",top[0]],["Панель",panel[0]],["Опции",selectedOptions.map((o:any)=>o[0]).join(", ")]].map(([a,b])=><div className="specRow" key={a}><div className="ico"/><div><small>{a}</small><b>{b}</b></div></div>)}</div>
      </aside>
    </div>
  </main>
}

function field(label:string,value:number,setter:any){return <label className="field"><span>{label}</span><input type="number" value={value} onChange={e=>setter(Number(e.target.value))}/></label>}
function MaterialGrid({items,selected,setSelected}:any){return <div className="grid">{items.map((x:any)=><button key={x[0]} onClick={()=>setSelected(x)} className={"choice "+(selected[0]===x[0]?"active":"")}><div className="swatch" style={{background:x[1]}}/><b>{x[0]}</b><small>Premium collection</small></button>)}</div>}
