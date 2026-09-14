'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const variants=['base','standard','premium'] as const;

export function CommercialVariantEnhancer(){
  const pathname=usePathname();

  useEffect(()=>{
    const form=document.querySelector<HTMLFormElement>('form.commercialForm');
    if(!form)return;
    const select=form.querySelector<HTMLSelectElement>('select[name="selectedVariant"]');
    const grid=form.previousElementSibling as HTMLElement|null;
    if(!select||!grid?.classList.contains('metricGrid'))return;
    const cards=Array.from(grid.children).filter((node):node is HTMLElement=>node instanceof HTMLElement).slice(0,3);
    const cleanups:(()=>void)[]=[];

    cards.forEach((card,index)=>{
      const variant=variants[index];
      if(!variant)return;
      card.classList.add('variantQuickSelect');
      card.classList.toggle('variantQuickSelected',select.value===variant);
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-pressed',String(select.value===variant));
      const activate=()=>{
        if(select.value===variant)return;
        select.value=variant;
        cards.forEach((other)=>{other.classList.remove('variantQuickSelected');other.setAttribute('aria-pressed','false');});
        card.classList.add('variantQuickSelected');
        card.setAttribute('aria-pressed','true');
        form.requestSubmit();
      };
      const onClick=()=>activate();
      const onKey=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}};
      card.addEventListener('click',onClick);
      card.addEventListener('keydown',onKey);
      cleanups.push(()=>{card.removeEventListener('click',onClick);card.removeEventListener('keydown',onKey);card.classList.remove('variantQuickSelect','variantQuickSelected');card.removeAttribute('role');card.removeAttribute('tabindex');card.removeAttribute('aria-pressed');});
    });

    return()=>cleanups.forEach((cleanup)=>cleanup());
  },[pathname]);

  return null;
}
