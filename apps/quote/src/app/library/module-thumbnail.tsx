import '@/lib/special-hardware-presets';
import type { QuoteModulePreset } from '@/lib/module-presets';

type Props={preset:QuoteModulePreset;previewUrl?:string|null;bridgeVersion?:number|null};

const thumbnailFrameStyle={
  width:'100%',
  aspectRatio:'16 / 10',
  minHeight:180,
  maxHeight:230,
  position:'relative' as const,
  display:'grid',
  placeItems:'center',
  borderRadius:14,
  background:'radial-gradient(circle at 50% 40%,#fffdf9 0%,#f5ede5 72%,#eadfd5 100%)',
  border:'1px solid var(--mq-border,#dfd0c0)',
  overflow:'hidden' as const,
};

export function ModuleThumbnail({preset,previewUrl,bridgeVersion}:Props){
  if(previewUrl){
    return <div aria-hidden="true" title={`Makster Asset Bridge · READY${bridgeVersion?` · V${bridgeVersion}`:''}`} style={thumbnailFrameStyle}>
      <img src={previewUrl} alt="" style={{width:'100%',height:'100%',objectFit:'contain',objectPosition:'center center',display:'block',boxSizing:'border-box',padding:10,filter:'contrast(1.06) saturate(.96)'}}/>
      <span style={{position:'absolute',right:8,bottom:8,padding:'3px 7px',borderRadius:999,background:'rgba(43,29,22,.76)',color:'#fff',fontSize:9,fontWeight:700,letterSpacing:'.06em'}}>BLENDER{bridgeVersion?` · V${bridgeVersion}`:''}</span>
    </div>;
  }

  const isTall=preset.heightMm>=1400;
  const isLow=preset.heightMm<=500;
  const ratio=Math.max(.48,Math.min(1.35,preset.widthMm/Math.max(1,preset.heightMm)));
  const width=Math.round((isTall?82:104)*ratio+42);
  const drawerCount=preset.moduleKey==='b-drawer'?Math.max(1,preset.drawers):0;
  const doorCount=drawerCount?0:Math.max(0,preset.doors);
  const open=preset.moduleKey==='open';
  return <div aria-hidden="true" style={thumbnailFrameStyle}>
    <div style={{position:'relative',width, height:isTall?156:isLow?86:122,border:'3px solid var(--mq-button,#2b1d16)',borderRadius:5,background:'var(--mq-surface,#fffdfa)',boxShadow:'0 10px 22px rgba(62,36,22,.11)'}}>
      {drawerCount?Array.from({length:drawerCount}).map((_,i)=><span key={i} style={{position:'absolute',left:4,right:4,top:`${(i/drawerCount)*100+2}%`,height:`${Math.max(8,100/drawerCount-4)}%`,border:'1px solid var(--mq-copper,#b86e3e)',borderRadius:3}}/>):null}
      {doorCount?Array.from({length:doorCount}).map((_,i)=><span key={i} style={{position:'absolute',top:4,bottom:4,left:`${(i/doorCount)*100+2}%`,width:`${Math.max(12,100/doorCount-4)}%`,border:'1px solid var(--mq-copper,#b86e3e)',borderRadius:3}}/>):null}
      {open?Array.from({length:Math.min(6,Math.max(1,preset.shelfCount))}).map((_,i)=><span key={i} style={{position:'absolute',left:5,right:5,top:`${((i+1)/(Math.min(6,Math.max(1,preset.shelfCount))+1))*100}%`,borderTop:'2px solid var(--mq-copper,#b86e3e)'}}/>):null}
      {preset.group==='appliance'?<span style={{position:'absolute',left:'18%',right:'18%',top:'32%',height:'34%',border:'2px solid var(--mq-brass,#d79a66)',borderRadius:4,background:'var(--mq-bg-secondary,#eee2d5)'}}/>:null}
      {preset.group==='corner'?<span style={{position:'absolute',right:-12,top:12,bottom:12,width:18,border:'3px solid var(--mq-button,#2b1d16)',borderLeft:0,borderRadius:'0 4px 4px 0'}}/>:null}
    </div>
  </div>;
}
