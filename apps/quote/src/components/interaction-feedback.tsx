'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n';

type BusyState={visible:boolean;label:string};

const defaultLabels:Record<Locale,string>={
  ru:'Обновляем…',
  en:'Updating…',
  cs:'Aktualizace…',
  de:'Wird aktualisiert…',
  pl:'Aktualizowanie…',
};

export function InteractionFeedback({locale}:{locale:Locale}){
  const [busy,setBusy]=useState<BusyState>({visible:false,label:defaultLabels[locale]});
  const busyRef=useRef(false);
  const ignoreMutationsUntil=useRef(0);
  const timerRef=useRef<number|null>(null);

  useEffect(()=>{
    const workspace=document.querySelector<HTMLElement>('.workspace');
    if(!workspace)return;

    const hide=()=>{
      busyRef.current=false;
      if(timerRef.current!==null){window.clearTimeout(timerRef.current);timerRef.current=null;}
      setBusy((current)=>current.visible?{...current,visible:false}:current);
    };
    const show=(label?:string|null)=>{
      busyRef.current=true;
      ignoreMutationsUntil.current=performance.now()+140;
      if(timerRef.current!==null)window.clearTimeout(timerRef.current);
      setBusy({visible:true,label:label?.trim()||defaultLabels[locale]});
      timerRef.current=window.setTimeout(hide,12000);
    };

    const onSubmit=(event:Event)=>{
      const form=event.target instanceof HTMLFormElement?event.target:null;
      if(!form||form.dataset.noLoading==='true')return;
      const submitEvent=event as SubmitEvent;
      const submitter=submitEvent.submitter instanceof HTMLElement?submitEvent.submitter:null;
      show(submitter?.dataset.loadingLabel||form.dataset.loadingLabel);
    };

    const onClick=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const target=event.target instanceof Element?event.target:null;
      const anchor=target?.closest<HTMLAnchorElement>('a[href]');
      if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download')||anchor.dataset.noLoading==='true')return;
      let url:URL;
      try{url=new URL(anchor.href,window.location.href);}catch{return;}
      if(url.origin!==window.location.origin)return;
      const sameDocument=url.pathname===window.location.pathname&&url.search===window.location.search;
      if(sameDocument&&url.hash)return;
      show(anchor.dataset.loadingLabel);
    };

    document.addEventListener('submit',onSubmit,true);
    document.addEventListener('click',onClick,true);
    const observer=new MutationObserver(()=>{
      if(busyRef.current&&performance.now()>ignoreMutationsUntil.current)hide();
    });
    observer.observe(workspace,{subtree:true,childList:true,characterData:true});

    return()=>{
      document.removeEventListener('submit',onSubmit,true);
      document.removeEventListener('click',onClick,true);
      observer.disconnect();
      if(timerRef.current!==null)window.clearTimeout(timerRef.current);
    };
  },[locale]);

  if(!busy.visible)return null;
  return <div className="interactionBusy" role="status" aria-live="polite" aria-atomic="true">
    <span className="interactionSpinner" aria-hidden="true"/>
    <span>{busy.label}</span>
  </div>;
}
