import '@/lib/special-hardware-presets';
import type { QuoteModulePreset } from '@/lib/module-presets';

type Props={preset:QuoteModulePreset;previewUrl?:string|null;bridgeVersion?:number|null};

export function ModuleThumbnail({preset,previewUrl,bridgeVersion}:Props){
  const legacyUnreadableDrawerPreview=preset.group==='base-drawer'&&Boolean(bridgeVersion)&&Number(bridgeVersion)<=13;
  const showPreview=Boolean(previewUrl&&!legacyUnreadableDrawerPreview);

  if(showPreview){
    return <div aria-hidden="true" title={`Makster Asset Bridge · READY${bridgeVersion?` · V${bridgeVersion}`:''}`} style={{height:124,position:'relative',display:'grid',placeItems:'center',borderRadius:14,background:'radial-gradient(circle at 50% 40%,#fffdf9 0%,#f5ede5 72%,#eadfd5 100%)',border:'1px solid var(--mq-border,#dfd0c0)',overflow:'hidden'}}>
      <img src={previewUrl??''} alt="" style={{width:'100%',height:'100%',objectFit:'contain',display:'block',boxSizing:'border-box',padding:7,filter:'contrast(1.06) saturate(.96)'}}/>
      <span style={{position:'absolute',right:7,bottom:7,padding:'3px 6px',borderRadius:999,background:'rgba(43,29,22,.76)',color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'.06em'}}>BLENDER{bridgeVersion?` · V${bridgeVersion}`:''}</span>
    </div>;
  }

  const isTall=preset.heightMm>=1400;
  const isLow=preset.heightMm<=500;
  const ratio=Math.max(.48,Math.min(1.35,preset.widthMm/Math.max(1,preset.heightMm)));
  const width=Math.round(58*ratio+34);
  const drawerCount=preset.moduleKey==='b-drawer'?Math.max(1,preset.drawers):0;
  const doorCount=drawerCount?0:Math.max(0,preset.doors);
  const open=preset.moduleKey==='open';
  return <div aria-hidden="true" title={legacyUnreadableDrawerPreview?'Legacy Blender preview replaced by readable schematic':undefined} style={{height:124,position:'relative',display:'grid',placeItems:'center',borderRadius:14,background:'radial-gradient(circle at 50% 42%,#fffdf9 0%,#f6eee7 75%,#eee2d7 100%)',border:'1px solid var(--mq-border,#dfd0c0)',overflow:'hidden'}}>
    <div style={{position:'relative',width, height:isTall?104:isLow?58:82,border:'3px solid var(--mq-button,#2b1d16)',borderRadius:5,background:'var(--mq-surface,#fffdfa)',boxShadow:'0 10px 22px rgba(62,36,22,.11)'}}>
      {drawerCount?Array.from({length:drawerCount}).map((_,i)=><span key={i} style={{position:'absolute',left:4,right:4,top:`${(i/drawerCount)*100+2}%`,height:`${Math.max(8,100/drawerCount-4)}%`,border:'1px solid var(--mq-copper,#b86e3e)',borderRadius:3}}/>):null}
      {doorCount?Array.from({length:doorCount}).map((_,i)=><span key={i} style={{position:'absolute',top:4,bottom:4,left:`${(i/doorCount)*100+2}%`,width:`${Math.max(12,100/doorCount-4)}%`,border:'1px solid var(--mq-copper,#b86e3e)',borderRadius:3}}/>):null}
      {open?Array.from({length:Math.min(6,Math.max(1,preset.shelfCount))}).map((_,i)=><span key={i} style={{position:'absolute',left:5,right:5,top:`${((i+1)/(Math.min(6,Math.max(1,preset.shelfCount))+1))*100}%`,borderTop:'2px solid var(--mq-copper,#b86e3e)'}}/>):null}
      {preset.group==='appliance'?<span style={{position:'absolute',left:'18%',right:'18%',top:'32%',height:'34%',border:'2px solid var(--mq-brass,#d79a66)',borderRadius:4,background:'var(--mq-bg-secondary,#eee2d5)'}}/>:null}
      {preset.group==='corner'?<span style={{position:'absolute',right:-12,top:12,bottom:12,width:18,border:'3px solid var(--mq-button,#2b1d16)',borderLeft:0,borderRadius:'0 4px 4px 0'}}/>:null}
    </div>
    {legacyUnreadableDrawerPreview?<span style={{position:'absolute',right:7,bottom:7,padding:'3px 6px',borderRadius:999,background:'rgba(79,48,34,.09)',color:'#6e4b38',fontSize:8,fontWeight:800,letterSpacing:'.05em'}}>SCHEMATIC</span>:null}
  </div>;
}
