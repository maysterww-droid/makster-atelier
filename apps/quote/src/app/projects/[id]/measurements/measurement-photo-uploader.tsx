'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { registerMeasurementPhoto, removeMeasurementPhoto } from './actions';
import styles from './measurements.module.css';

const BUCKET = 'quote-measurements';
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 40;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);

type Copy = { upload:string; uploadHint:string; uploading:string; uploadFailed:string; invalidPhoto:string; remove:string; noPhotos:string; photos:string };
type Photo = { path:string; name:string; url:string };
type Props = { organizationId:string; projectId:string; photos:Photo[]; copy:Copy };

function mimeFor(file:File) {
  const current = file.type.toLowerCase();
  if (ALLOWED.has(current)) return current;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return '';
}
function extensionFor(file:File,mime:string) {
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g,'');
  if (ext && ext.length <= 8) return ext;
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  return 'heif';
}

export function MeasurementPhotoUploader({ organizationId, projectId, photos, copy }:Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy,setBusy] = useState(false);
  const [removing,setRemoving] = useState('');
  const [error,setError] = useState('');

  async function choose(files:FileList|null) {
    if (!files?.length || busy) return;
    setError('');
    setBusy(true);
    const supabase = createClient();
    let count = photos.length;
    try {
      for (const file of Array.from(files)) {
        if (count >= MAX_PHOTOS) { setError(copy.uploadFailed); break; }
        const mime = mimeFor(file);
        if (!mime || file.size <= 0 || file.size > MAX_BYTES) { setError(copy.invalidPhoto); continue; }
        const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path = `${organizationId}/${projectId}/${random}.${extensionFor(file,mime)}`;
        const { error:uploadError } = await supabase.storage.from(BUCKET).upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});
        if (uploadError) { setError(copy.uploadFailed); continue; }

        const data = new FormData();
        data.set('projectId',projectId);
        data.set('path',path);
        data.set('name',file.name);
        data.set('mime',mime);
        data.set('size',String(file.size));
        const result = await registerMeasurementPhoto(data);
        if (!result.ok) {
          await supabase.storage.from(BUCKET).remove([path]);
          setError(result.error === 'invalid-photo' ? copy.invalidPhoto : copy.uploadFailed);
          continue;
        }
        count += 1;
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(path:string) {
    if (removing) return;
    setRemoving(path);
    const data = new FormData();
    data.set('projectId',projectId);
    data.set('path',path);
    try {
      await removeMeasurementPhoto(data);
      router.refresh();
    } finally {
      setRemoving('');
    }
  }

  return <div className={styles.photoArea}>
    <div className={styles.photoToolbar}>
      <div><strong>{copy.photos}: {photos.length}</strong><small>{copy.uploadHint}</small></div>
      <div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(event)=>void choose(event.target.files)}/>
        <button type="button" className="secondary" disabled={busy || photos.length>=MAX_PHOTOS} onClick={()=>inputRef.current?.click()}>{busy?copy.uploading:copy.upload}</button>
      </div>
    </div>
    {error?<div className="notice error">{error}</div>:null}
    {!photos.length?<div className={styles.emptyPhotos}>{copy.noPhotos}</div>:null}
    {photos.length?<div className={styles.photoGrid}>{photos.map((photo)=><article key={photo.path} className={styles.photoCard}>
      {photo.url?<img src={photo.url} alt={photo.name} className={styles.photoImage}/>:<div className={styles.photoFallback}>{photo.name}</div>}
      <div className={styles.photoMeta}><span title={photo.name}>{photo.name}</span><button type="button" className="textLink" disabled={Boolean(removing)} onClick={()=>void remove(photo.path)}>{removing===photo.path?'…':copy.remove}</button></div>
    </article>)}</div>:null}
  </div>;
}
