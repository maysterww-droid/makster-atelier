import styles from './module-schematic.module.css';

type Props={moduleKey:string;name?:string;widthMm?:number|string;heightMm?:number|string;className?:string};

function visualType(moduleKey:string,name=''){
  const haystack=`${moduleKey} ${name}`.toLowerCase();
  if(haystack.includes('sink')||haystack.includes('мой')||haystack.includes('dřez')||haystack.includes('spül')||haystack.includes('zlew'))return 'sink';
  if(haystack.includes('dishwasher')||haystack.includes('пмм')||haystack.includes('myčk')||haystack.includes('geschirr')||haystack.includes('zmyw'))return 'dishwasher';
  if(haystack.includes('fridge')||haystack.includes('холод')||haystack.includes('lednic')||haystack.includes('kühl')||haystack.includes('lodów'))return 'fridge';
  if(haystack.includes('oven')||haystack.includes('духов')||haystack.includes('troub')||haystack.includes('backofen')||haystack.includes('piekarnik'))return moduleKey.includes('tall')||moduleKey.startsWith('t-')?'tall-oven':'oven';
  if(haystack.includes('drawer')||haystack.includes('ящик')||haystack.includes('zásuv')||haystack.includes('schublad')||haystack.includes('szuflad'))return 'drawer';
  if(haystack.includes('wall')||moduleKey.startsWith('w-'))return 'wall';
  if(haystack.includes('tall')||moduleKey.startsWith('t-'))return 'tall';
  if(haystack.includes('corner')||haystack.includes('угол')||haystack.includes('roh')||haystack.includes('ecke')||haystack.includes('naroż'))return 'corner';
  return 'door';
}

export function ModuleSchematic({moduleKey,name='',widthMm=600,heightMm=720,className=''}:Props){
  const type=visualType(moduleKey,name);
  const w=Math.max(1,Number(widthMm)||600); const h=Math.max(1,Number(heightMm)||720);
  const ratio=Math.max(.55,Math.min(1.45,w/h));
  const bodyW=58*ratio; const x=(120-bodyW)/2;
  const tall=type==='tall'||type==='tall-oven'||type==='fridge';
  const wall=type==='wall';
  const bodyH=tall?92:wall?58:68; const y=tall?14:wall?23:38;
  const midY=y+bodyH/2;
  const stroke='#4a3327'; const fill='#fffaf5'; const front='#f0e0d2';
  return <svg className={`${styles.root} ${className}`} viewBox="0 0 120 120" role="img" aria-label={name||moduleKey}>
    <polygon points={`${x},${y} ${x+7},${y-6} ${x+bodyW+7},${y-6} ${x+bodyW},${y}`} fill="#f6eadf" stroke={stroke} strokeWidth="1.5"/>
    <polygon points={`${x+bodyW},${y} ${x+bodyW+7},${y-6} ${x+bodyW+7},${y+bodyH-6} ${x+bodyW},${y+bodyH}`} fill="#e7d3c1" stroke={stroke} strokeWidth="1.5"/>
    <rect x={x} y={y} width={bodyW} height={bodyH} rx="1.5" fill={fill} stroke={stroke} strokeWidth="1.7"/>
    {type==='drawer'?<>{[1,2].map((n)=><line key={n} x1={x+2} x2={x+bodyW-2} y1={y+(bodyH*n/3)} y2={y+(bodyH*n/3)} stroke={stroke} strokeWidth="1.5"/>)}{[1,2,3].map((n)=><line key={`h${n}`} x1={x+bodyW/2-5} x2={x+bodyW/2+5} y1={y+(bodyH*(n-.5)/3)} y2={y+(bodyH*(n-.5)/3)} stroke={stroke} strokeWidth="1.7"/>)}</>:null}
    {type==='door'||type==='wall'||type==='tall'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill={front} stroke={stroke} strokeWidth="1"/><line x1={x+bodyW-8} x2={x+bodyW-8} y1={midY-4} y2={midY+4} stroke={stroke} strokeWidth="1.8"/></>:null}
    {type==='sink'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill={front} stroke={stroke} strokeWidth="1"/><ellipse cx={x+bodyW/2} cy={y+7} rx={Math.max(8,bodyW*.22)} ry="3.5" fill="#d9c5b4" stroke={stroke} strokeWidth="1.2"/><line x1={x+bodyW-8} x2={x+bodyW-8} y1={midY-4} y2={midY+4} stroke={stroke} strokeWidth="1.8"/></>:null}
    {type==='oven'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill="#f5eee8" stroke={stroke} strokeWidth="1"/><rect x={x+8} y={y+16} width={bodyW-16} height={bodyH-27} rx="2" fill="#4b4039"/><rect x={x+11} y={y+22} width={bodyW-22} height={bodyH-39} rx="1" fill="#9c8f85"/><circle cx={x+bodyW/2-8} cy={y+10} r="1.8" fill={stroke}/><circle cx={x+bodyW/2+8} cy={y+10} r="1.8" fill={stroke}/></>:null}
    {type==='tall-oven'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill={front} stroke={stroke} strokeWidth="1"/><line x1={x+3} x2={x+bodyW-3} y1={y+24} y2={y+24} stroke={stroke}/><rect x={x+8} y={y+30} width={bodyW-16} height="34" rx="2" fill="#4b4039"/><rect x={x+11} y={y+37} width={bodyW-22} height="20" fill="#9c8f85"/><line x1={x+3} x2={x+bodyW-3} y1={y+72} y2={y+72} stroke={stroke}/></>:null}
    {type==='fridge'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill={front} stroke={stroke} strokeWidth="1"/><line x1={x+3} x2={x+bodyW-3} y1={y+bodyH*.67} y2={y+bodyH*.67} stroke={stroke} strokeWidth="1.4"/><line x1={x+bodyW-8} x2={x+bodyW-8} y1={y+18} y2={y+33} stroke={stroke} strokeWidth="1.8"/><line x1={x+bodyW-8} x2={x+bodyW-8} y1={y+bodyH*.77} y2={y+bodyH*.87} stroke={stroke} strokeWidth="1.8"/></>:null}
    {type==='dishwasher'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill="#eee5dd" stroke={stroke}/><rect x={x+7} y={y+8} width={bodyW-14} height="5" rx="1" fill="#9c8f85"/><circle cx={x+bodyW-11} cy={y+10.5} r="1.3" fill={stroke}/></>:null}
    {type==='corner'?<><rect x={x+3} y={y+3} width={bodyW-6} height={bodyH-6} fill={front} stroke={stroke}/><path d={`M ${x+bodyW*.55} ${y+3} L ${x+bodyW*.55} ${y+bodyH-3} M ${x+bodyW*.55} ${y+3} L ${x+bodyW-3} ${y+bodyH*.32}`} stroke={stroke} strokeWidth="1.3" fill="none"/></>:null}
    {!wall?<><line x1={x+5} x2={x+5} y1={y+bodyH} y2={y+bodyH+7} stroke={stroke} strokeWidth="2"/><line x1={x+bodyW-5} x2={x+bodyW-5} y1={y+bodyH} y2={y+bodyH+7} stroke={stroke} strokeWidth="2"/></>:null}
  </svg>;
}
