'use client';

import { useActionState, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { getDeliveryMessages } from '@/lib/i18n-delivery';
import { generateClientLink, sendQuoteEmail, type DeliveryActionState } from './delivery-actions';

type Props={projectId:string;quoteId:string;defaultEmail:string;emailConfigured:boolean;locale:Locale};
const initialDeliveryState:DeliveryActionState={status:'idle',message:''};

function Result({state,locale}:{state:DeliveryActionState;locale:Locale}){const [copied,setCopied]=useState(false);const m=getDeliveryMessages(locale);if(state.status==='idle')return null;return <div className={`deliveryResult ${state.status}`}><strong>{state.message}</strong>{state.publicUrl?<div className="shareLine"><input readOnly value={state.publicUrl}/><button type="button" className="secondary" onClick={async()=>{await navigator.clipboard.writeText(state.publicUrl!);setCopied(true);}}>{copied?m.copied:m.copy}</button></div>:null}{state.warning?<small>{state.warning}</small>:null}</div>;}

export function ClientDeliveryPanel({projectId,quoteId,defaultEmail,emailConfigured,locale}:Props){
  const m=getDeliveryMessages(locale); const [linkState,linkAction,linkPending]=useActionState(generateClientLink,initialDeliveryState); const [mailState,mailAction,mailPending]=useActionState(sendQuoteEmail,initialDeliveryState);
  return <section className="deliveryPanel"><div className="deliveryColumns">
    <div><h3>{m.secureLink}</h3><p>{m.secureLinkHelp}</p><form action={linkAction}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="quoteId" value={quoteId}/><button className="secondary" type="submit" disabled={linkPending}>{linkPending?m.creating:m.createLink}</button></form><Result state={linkState} locale={locale}/></div>
    <div><h3>{m.emailSend}</h3><p>{m.emailSendHelp}</p>{!emailConfigured?<div className="deliveryConfig">{m.emailNotConfigured}</div>:null}<form action={mailAction} className="mailForm"><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="quoteId" value={quoteId}/><input type="email" name="recipientEmail" required defaultValue={defaultEmail} placeholder="client@example.com"/><button className="primary" type="submit" disabled={mailPending||!emailConfigured}>{mailPending?m.sending:m.sendQuote}</button></form><Result state={mailState} locale={locale}/></div>
  </div></section>;
}
