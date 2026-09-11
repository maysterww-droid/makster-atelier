'use client';

import { useActionState, useState } from 'react';
import { generateClientLink, sendQuoteEmail, type DeliveryActionState } from './delivery-actions';

type Props = {
  projectId: string;
  quoteId: string;
  defaultEmail: string;
  emailConfigured: boolean;
};

const initialDeliveryState: DeliveryActionState = { status:'idle', message:'' };

function Result({ state }: { state: DeliveryActionState }) {
  const [copied, setCopied] = useState(false);
  if (state.status === 'idle') return null;
  return <div className={`deliveryResult ${state.status}`}>
    <strong>{state.message}</strong>
    {state.publicUrl ? <div className="shareLine"><input readOnly value={state.publicUrl}/><button type="button" className="secondary" onClick={async () => { await navigator.clipboard.writeText(state.publicUrl!); setCopied(true); }}>{copied ? 'Скопировано' : 'Копировать'}</button></div> : null}
    {state.warning ? <small>{state.warning}</small> : null}
  </div>;
}

export function ClientDeliveryPanel({ projectId, quoteId, defaultEmail, emailConfigured }: Props) {
  const [linkState, linkAction, linkPending] = useActionState(generateClientLink, initialDeliveryState);
  const [mailState, mailAction, mailPending] = useActionState(sendQuoteEmail, initialDeliveryState);

  return <section className="deliveryPanel">
    <div className="deliveryColumns">
      <div>
        <h3>Защищённая ссылка клиенту</h3>
        <p>Создаётся отдельный bearer-токен. В базе хранится только его SHA-256 hash. Клиент увидит только эту выпущенную версию и сможет принять или отклонить её.</p>
        <form action={linkAction}>
          <input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="quoteId" value={quoteId}/>
          <button className="secondary" type="submit" disabled={linkPending}>{linkPending ? 'Создаю…' : 'Создать ссылку'}</button>
        </form>
        <Result state={linkState}/>
      </div>
      <div>
        <h3>Отправить по email</h3>
        <p>Письмо содержит защищённую ссылку и PDF. Статус «Отправлено» фиксируется только после успешного ответа почтового провайдера.</p>
        {!emailConfigured ? <div className="deliveryConfig">Почтовый адаптер готов, но на сервере ещё нет <code>RESEND_API_KEY</code> и/или <code>QUOTE_EMAIL_FROM</code>.</div> : null}
        <form action={mailAction} className="mailForm">
          <input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="quoteId" value={quoteId}/>
          <input type="email" name="recipientEmail" required defaultValue={defaultEmail} placeholder="client@example.com"/>
          <button className="primary" type="submit" disabled={mailPending || !emailConfigured}>{mailPending ? 'Отправляю…' : 'Отправить предложение'}</button>
        </form>
        <Result state={mailState}/>
      </div>
    </div>
  </section>;
}
