import type {Shot,Take} from '../core/pipeline';import type {QaResult} from './premium-qa';import {AssetRegistry} from '../core/assets';
export function reviewTake(assets:AssetRegistry,brand:'MAKSTER_ATELIER'|'VYTA',take:Take,qa:QaResult):Take{assets.get(take.asset_id,brand);return{...take,qa_status:qa.passed?'PASS':'FAIL'};}
export function attachTake(shot:Shot,take:Take):Shot{if(shot.takes.some(t=>t.id===take.id))throw new Error('TAKE_ALREADY_ATTACHED');return{...shot,takes:[...shot.takes,take]};}
