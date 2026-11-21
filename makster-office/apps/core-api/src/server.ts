import { SmmService } from './smm-service.js';
import { createServer } from 'node:http';
import { randomUUID, createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import {
  applyProjectChangeSet,
  validateProjectModel,
  mm,
  type Room,
  type ProjectChangeSet,
  type ProjectType,
} from '../../../packages/project-model/src/index.js';
import {
  AiIntakeService,
  DeterministicIntakeProvider,
  OpenAIResponsesIntakeProvider,
} from '../../../packages/ai-intake/src/index.js';
import { ImportedManufacturingDataProvider, MaksterEngineeringCompiler, ManualVerifiedFixtureManufacturingDataProvider, generateAndRankKitchenDesigns, materializeKitchenDesignVariant, searchHardwareCatalog, searchApplianceCatalog, HARDWARE_MANUFACTURERS, APPLIANCE_MANUFACTURERS, evaluateHardwareCatalogId, evaluateApplianceCatalogId, autoSelectHardware, autoSelectAppliances, analyzeProjectCatalogSelections, applyApprovedCatalogAssignment, analyzeProjectAutoComplete, analyzeProductionReadiness, analyzeRoomMeasurementCompleteness, analyzeInstallationCollisions, buildConflictResolutionReport, completeInstallationDecision, resolveInstallationSiteIssue, applyApprovedSiteChange, signInstallationHandover, setJobMilestone, receivePurchaseLine, deleteProjectCostEntry, cancelClientApproval, listClientShareLinks, createClientShareLink, revokeClientShareLink, validateClientShareToken, buildProjectLifecycleReleaseGate, respondToClientApproval, createClientApprovalRequest, updateClientPortal, buildClientPortalView, addProjectCostEntry, buildCostingReport, updatePurchaseOrderStatus, createPurchaseOrder, buildPurchasingReport, updateJobControl, buildJobControlReport, closePunchItem, addPunchItem, buildInstallationCloseoutReport, reviewSiteChange, proposeSiteChange, reportInstallationSiteIssue, buildInstallerModeReport, recordInstallationDecision, importCatalogSource, promoteCatalogCandidate, registerHardwareCatalogRecord, registerApplianceCatalogRecord, type KitchenDesignVariant } from '../../../packages/engineering-engine/src/index.js';
import { inspectBxf, MaksterFixtureBxfAdapter } from '../../../packages/bxf-intelligence/src/index.js';
import { buildReleasePackage, type ReleaseSigner } from '../../../packages/manufacturing-release/src/index.js';
import {
  createProductionApprovalRequest,
  decideProductionApproval,
  enqueueProduction,
  MaksterNeutralCncPostprocessor,
  TestVerifiedMachinePostprocessor,
  type ApprovedReleaseAuthorization,
  type ProductionApprovalRequest,
  type ProductionMachineProfile,
} from '../../../packages/production-control/src/index.js';
import { buildProductionPack, type OutsourcePreset, type ProductionRoute } from '../../../packages/production-pack/src/index.js';
import {
  COMMERCIAL_ENGINE_VERSION,
  buildCommercialEstimate,
  buildCommercialPackage,
  decimalToMinor,
  type BuiltCommercialPackage,
  type ClientCommercialQuote,
  type ClientQuoteTerms,
  type CommercialPricingProfile,
  type CommercialQuoteStatus,
} from '../../../packages/commercial-engine/src/index.js';
import {
  buildReworkPack,
  createReceipt,
  createSupplierOrder,
  receivingSummary,
  updateSupplierOrderStatus,
  type SupplierOrder,
  type SupplierReceipt,
} from '../../../packages/supplier-operations/src/index.js';
import {
  awardSupplierQuote,
  calculateSupplierPerformance,
  compareSupplierQuotes,
  createSupplierRfq,
  validateQuote,
  type ProcurementComparison,
  type ProcurementStrategy,
  type SupplierCapabilityProfile,
  type SupplierQuote,
  type SupplierRfq,
} from '../../../packages/procurement-intelligence/src/index.js';
import {
  MemoryEmailProvider,
  GmailApiEmailProvider,
  composeRfqInvitation,
  createCommunicationThread,
  dueReminderCandidates,
  composeReminder,
  parseSupplierReply,
  sendThreadMessage,
  sha256Text,
  type SupplierCommunicationThread,
  type SupplierCommunicationMessage,
  type CommunicationProvider,
} from '../../../packages/supplier-communication/src/index.js';
import {
  GMAIL_CONNECTIONS_VERSION,
  MAKSTER_GMAIL_SCOPES,
  GmailApiClient,
  GoogleOAuthClient,
  MemoryGmailConnectionStore,
  SupabaseGmailConnectionStore,
  decryptSecret,
  encryptSecret,
  parseAes256Key,
  parseGmailPushNotification,
  sha256Secret,
  signOauthState,
  syncGmailConnection,
  verifyOauthState,
  type GmailConnectionRecord,
  type GmailConnectionStore,
  type GmailSyncCursor,
} from '../../../packages/connections-gmail/src/index.js';
import {
  PROCUREMENT_INBOX_VERSION,
  assessGmailConnectionHealth,
  buildProcurementInbox,
  ownerNotificationsFromInbox,
  updateInboxDisposition,
  type OwnerNotification,
  type ProcurementInboxDisposition,
} from '../../../packages/procurement-inbox/src/index.js';
import { VISUAL_PRODUCT_VERSION, buildVisualScene, compileVisualCommand, type VisualEditorCommand } from '../../../packages/visual-product/src/index.js';
import {
  CHANGE_INTELLIGENCE_VERSION,
  compareRevisions,
  requote,
  buildCustomerChangeSummary,
  customerChangeSummaryHtml,
  type ChangeImpactReport,
} from '../../../packages/change-intelligence/src/index.js';
import {
  CLIENT_CHANGE_ORDER_VERSION,
  applyAcceptedChangeOrder,
  clientChangeOrderHtml,
  commercialContractHtml,
  createClientChangeOrder,
  createCommercialContract,
  customerSafeChangeOrder,
  decideClientChangeOrder,
  issueChangeOrderToken,
  markInstallmentPaid,
  productionCommercialGate,
  viewClientChangeOrder,
  verifyChangeOrderToken,
  type ClientChangeOrder,
  type ClientRevisionAuthorization,
  type PaymentScheduleTemplateItem,
  type ProjectCommercialContract,
} from '../../../packages/client-change-order/src/index.js';
import { buildOwnerCommandCenter, supplierRanking, buildBomAllocationPlan, compareSupplierQuotesForShortage, buildPaymentCalendar, buildProductionCapacityPlan, buildCapacityLearning, buildCashGapForecast, buildReplenishmentPlan, buildPredictiveOwnerControl, buildOwnerScenarioPlanner, evaluateOwnerScenario, createDecisionPlanFromScenario, refreshDecisionPlanStatus, decisionPlanSummary, defaultProductionWorkCenters, buildOperationsControlTower, syncProductionOperations, transitionProductionOperation, buildProcurementAutomationCenter, createMaterialRfq, makeMaterialCommunicationDraft, parseMaterialRfqReply, materialRfqComparison, materialRfqReminderCandidates, buildOwnerFinanceReport, buildFinanceTrend, buildBusinessOperatingSystem, validateBusinessProjectClose, buildMaksterOfficeDashboard, createOfficeCampaign, createOfficeLead, createOfficeApproval, runMaksterOfficeCycle, advanceOfficeLead, connectGrowthProvider, applyGrowthProviderSync, reconcileProjectRevenueAttribution, buildGrowthAutopilot, autopilotApprovalForDecision, executeApprovedAutopilotDecision, createGrowthExecution, executeGrowthProviderMutation, auditEntry, ingestGrowthLeadEvent, defaultGrowthGuardrail, addCreativeAsset, buildProjectContentDrafts, createPublishJob, queueApprovedPublishJob, recordContentPerformance, buildContentStudioDashboard, createPilotRun, evaluatePilotProject, defaultRolePolicies, roleCan, buildProductionReadiness, buildApplicationBackupPayload, makeBackupManifest, validateBackupPayload } from '../../../packages/owner-operations/src/index.js';
import { OwnerOperationsStore } from './owner-operations-store.js';
import { SupabaseOwnerOperationsStore } from './supabase-owner-operations-store.js';
import { bearer, json, readJson } from './http-utils.js';
import { MemoryProjectRepository, type ProjectRepository } from './repository.js';
import { SupabaseProjectRepository } from './supabase-repository.js';
import { MemoryUnifiedBusinessStore, type UnifiedBusinessStore } from './business-store.js';
import { SupabaseUnifiedBusinessStore } from './supabase-business-store.js';
import { MemoryCatalogRegistryStore, SupabaseCatalogRegistryStore, type CatalogRegistryStore } from './catalog-registry-store.js';


function roomSceneToRoom(scene:any):Room {
  const width=Math.max(1,Number(scene?.widthMm)||1),depth=Math.max(1,Number(scene?.depthMm)||1);
  const roomHeight=scene?.heightMm==null||scene.heightMm===''?null:Math.max(1,Number(scene.heightMm)||1);
  const measured=(value:number|null,state:'confirmed'|'observed'|'estimated'|'unknown'='confirmed')=>({value:value==null?null:mm(value),state});
  const wallH=roomHeight==null?measured(null,'unknown'):measured(roomHeight,'confirmed');
  const southId=randomUUID(),eastId=randomUUID(),northId=randomUUID(),westId=randomUUID();
  const wallIds:Record<string,string>={south:southId,east:eastId,north:northId,west:westId};
  const walls=[
    {id:southId,start:{x:mm(0),y:mm(0),z:mm(0)},end:{x:mm(width),y:mm(0),z:mm(0)},height:wallH},
    {id:eastId,start:{x:mm(width),y:mm(0),z:mm(0)},end:{x:mm(width),y:mm(depth),z:mm(0)},height:wallH},
    {id:northId,start:{x:mm(width),y:mm(depth),z:mm(0)},end:{x:mm(0),y:mm(depth),z:mm(0)},height:wallH},
    {id:westId,start:{x:mm(0),y:mm(depth),z:mm(0)},end:{x:mm(0),y:mm(0),z:mm(0)},height:wallH},
  ];
  const vertical=(o:any)=>o?.verticalState==='confirmed'&&o?.zMm!=null&&o?.heightMm!=null;
  const openings=(Array.isArray(scene?.features)?scene.features:[]).filter((f:any)=>f.kind==='door'||f.kind==='window').map((f:any)=>{
    const confirmed=vertical(f),side=String(f.side??'south');
    return {id:randomUUID(),kind:f.kind,hostWallId:wallIds[side],
      bounds:{origin:{x:mm(Number(f.xMm)||0),y:mm(Number(f.yMm)||0),z:mm(confirmed?Number(f.zMm):0)},size:{width:measured(Math.max(1,Number(f.widthMm)||1)),depth:measured(Math.max(1,Number(f.depthMm)||1)),height:confirmed?measured(Math.max(1,Number(f.heightMm)||1),'confirmed'):measured(null,'unknown')}},
      note:`Visual Room Setup source id ${String(f.id??'')}; wall ${side}; vertical ${confirmed?`Z ${Number(f.zMm)} mm, H ${Number(f.heightMm)} mm CONFIRMED`:'UNKNOWN'}.`};
  });
  const featureObstacles=(Array.isArray(scene?.features)?scene.features:[]).filter((f:any)=>!['door','window'].includes(f.kind)).map((f:any)=>{
    const confirmed=vertical(f),side=f.side?String(f.side):undefined;
    return {id:randomUUID(),kind:f.kind==='shaft'?'duct':f.kind,...(side&&wallIds[side]?{hostWallId:wallIds[side]}:{}),
      bounds:{origin:{x:mm(Number(f.xMm)||0),y:mm(Number(f.yMm)||0),z:mm(confirmed?Number(f.zMm):0)},size:{width:measured(Math.max(1,Number(f.widthMm)||1)),depth:measured(Math.max(1,Number(f.depthMm)||1)),height:confirmed?measured(Math.max(1,Number(f.heightMm)||1),'confirmed'):measured(null,'unknown')}},
      note:`Visual Room Setup source id ${String(f.id??'')}; clearance ${Number(f.clearanceMm)||0} mm; vertical ${confirmed?`Z ${Number(f.zMm)} mm, H ${Number(f.heightMm)} mm CONFIRMED`:'UNKNOWN'}.`};
  });
  const utilityObstacles=(Array.isArray(scene?.utilities)?scene.utilities:[]).map((u:any)=>{
    const side=String(u.side??'south'),offset=Math.max(0,Number(u.offsetMm)||0),confirmed=vertical(u);
    const x=side==='south'||side==='north'?offset:side==='east'?width:0;
    const y=side==='west'||side==='east'?offset:side==='north'?depth:0;
    const kind=u.kind==='power'?'socket':u.kind==='hood_vent'?'vent':'pipe';
    return {id:randomUUID(),kind,hostWallId:wallIds[side],bounds:{origin:{x:mm(x),y:mm(y),z:mm(confirmed?Number(u.zMm):0)},size:{width:measured(40),depth:measured(40),height:confirmed?measured(Math.max(1,Number(u.heightMm)||1),'confirmed'):measured(null,'unknown')}},note:`Utility ${String(u.kind)} on ${side}, offset ${offset} mm, tolerance ${Number(u.toleranceMm)||0} mm; vertical ${confirmed?`Z ${Number(u.zMm)} mm, H ${Number(u.heightMm)} mm CONFIRMED`:'UNKNOWN'}.`};
  });
  return {id:randomUUID(),name:'Kitchen Studio Room',origin:{x:mm(0),y:mm(0),z:mm(0)},dimensions:{width:measured(width),depth:measured(depth),height:roomHeight==null?measured(null,'unknown'):measured(roomHeight,'confirmed')},walls,openings,obstacles:[...featureObstacles,...utilityObstacles]};
}

const PORT = Number(process.env.PORT ?? 8787);
const DEMO_ORG_ID = process.env.DEMO_ORGANIZATION_ID ?? '00000000-0000-4000-8000-000000000001';

function growthProviderForChannel(channel:string):'google_ads'|'meta_ads'|'tiktok_ads'|null{
  if(channel==='google_ads')return 'google_ads';
  if(channel==='facebook_ads'||channel==='instagram_ads')return 'meta_ads';
  if(channel==='tiktok_ads')return 'tiktok_ads';
  return null;
}

function makeServerGrowthAdapter(connection:any){
  const executorUrl=process.env.MAKSTER_GROWTH_EXECUTOR_URL?.replace(/\/+$/,'');
  const token=process.env.MAKSTER_GROWTH_EXECUTOR_TOKEN;
  const ref=connection?.executorConnectionRef;
  if(!executorUrl||!token||!ref){
    return {provider:connection?.provider??'google_ads',status:'ready_for_connection' as const,async execute(){throw new Error('growth_provider_not_connected')}};
  }
  return {
    provider:connection.provider,status:'connected' as const,
    async execute(input:any){
      const r=await fetch(`${executorUrl}/execute`,{
        method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},
        body:JSON.stringify({connectionRef:ref,provider:connection.provider,...input})
      });
      const body:any=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(String(body.error??`growth_executor_http_${r.status}`));
      return {providerRequestId:String(body.providerRequestId??body.requestId??randomUUID()),providerStatus:String(body.providerStatus??body.status??'accepted')};
    }
  };
}

function verifyGrowthIngestSignature(raw:string,signature:string|undefined){
  const secret=process.env.MAKSTER_GROWTH_INGEST_SECRET;
  if(!secret||!signature)return false;
  const expected=createHmac('sha256',secret).update(raw,'utf8').digest('hex');
  const got=signature.replace(/^sha256=/,'').trim().toLowerCase();
  if(got.length!==expected.length)return false;
  try{return timingSafeEqual(Buffer.from(got,'hex'),Buffer.from(expected,'hex'))}catch{return false}
}


function makeRepository(): ProjectRepository {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseProjectRepository({ url, publishableKey: key, ...(secretKey ? { secretKey } : {}) });
  return new MemoryProjectRepository();
}

function makeIntakeService(): AiIntakeService {
  const key = process.env.OPENAI_API_KEY;
  if (key) return new AiIntakeService(process.env.OPENAI_MODEL ? new OpenAIResponsesIntakeProvider(key, process.env.OPENAI_MODEL) : new OpenAIResponsesIntakeProvider(key));
  return new AiIntakeService(new DeterministicIntakeProvider());
}

function makeBusinessStore():UnifiedBusinessStore {
  if (process.env.MAKSTER_BUSINESS_STORE === 'memory') return new MemoryUnifiedBusinessStore();
  const url=process.env.SUPABASE_URL;
  const secretKey=process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(url && secretKey && publishableKey) return new SupabaseUnifiedBusinessStore({url,secretKey});
  return new MemoryUnifiedBusinessStore();
}

const repository = makeRepository();
const businessStore = makeBusinessStore();
const intake = makeIntakeService();
const engineering = new MaksterEngineeringCompiler();
function makeOwnerOperationsStore(){
  const url=process.env.SUPABASE_URL;
  const secretKey=process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(process.env.MAKSTER_OWNER_OPERATIONS_STORE!=='file'&&url&&secretKey){
    return new SupabaseOwnerOperationsStore({url,secretKey,organizationId:DEMO_ORG_ID});
  }
  return new OwnerOperationsStore(process.env.MAKSTER_OWNER_OPERATIONS_FILE ?? join(process.cwd(), '.makster-owner-operations.json'));
}
const ownerOperationsStore = makeOwnerOperationsStore();
const smmService=new SmmService(ownerOperationsStore);
const smmReady=smmService.bootstrap();smmReady.catch(()=>{});
const smmSessions=new Map<string,number>();
const smmKey=process.env.MAKSTER_SMM_OWNER_KEY;
let smmLoginAttempts:{at:number,count:number}={at:Date.now(),count:0};


function makeGmailConnectionStore(): GmailConnectionStore {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && secretKey) return new SupabaseGmailConnectionStore({ url, secretKey });
  return new MemoryGmailConnectionStore();
}

const gmailConnectionStore = makeGmailConnectionStore();

function makeCatalogRegistryStore():CatalogRegistryStore {
  const url=process.env.SUPABASE_URL;
  const secretKey=process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(url && secretKey) return new SupabaseCatalogRegistryStore({url,secretKey});
  return new MemoryCatalogRegistryStore();
}
const catalogRegistryStore=makeCatalogRegistryStore();

async function restorePromotedCatalogRegistry(){
  for(const record of await catalogRegistryStore.listPromoted()){
    if('family' in record) registerHardwareCatalogRecord(record);
    else registerApplianceCatalogRecord(record);
  }
}


function gmailEncryptionKey(): Buffer {
  const encoded = process.env.MAKSTER_CONNECTION_ENCRYPTION_KEY_B64;
  if (!encoded) throw new Error('gmail_connection_encryption_not_configured');
  return parseAes256Key(encoded);
}

function googleOAuthClient(): GoogleOAuthClient {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('google_oauth_not_configured');
  return new GoogleOAuthClient({ clientId, clientSecret, redirectUri });
}

function oauthStateSecret(): string {
  const value = process.env.MAKSTER_OAUTH_STATE_SECRET;
  if (!value) throw new Error('oauth_state_secret_not_configured');
  return value;
}

async function gmailAccessToken(connectionId: string): Promise<{ connection:GmailConnectionRecord; accessToken:string }> {
  const connection = await gmailConnectionStore.getConnection(connectionId);
  if (!connection) throw new Error('gmail_connection_not_found');
  if (connection.status !== 'connected') throw new Error(`gmail_connection_not_connected:${connection.status}`);
  const secret = await gmailConnectionStore.getSecret(connectionId);
  if (!secret) {
    const updated = { ...connection, status:'reauth_required' as const, lastError:'gmail_refresh_token_not_found', updatedAt:new Date().toISOString() };
    await gmailConnectionStore.updateConnection(updated);
    throw new Error('gmail_refresh_token_not_found');
  }
  try {
    const refreshToken = decryptSecret(secret.refreshToken, gmailEncryptionKey());
    const token = await googleOAuthClient().refreshAccessToken(refreshToken);
    return { connection, accessToken:token.accessToken };
  } catch (error) {
    const updated = { ...connection, status:'reauth_required' as const, lastError:String((error as Error).message), updatedAt:new Date().toISOString() };
    await gmailConnectionStore.updateConnection(updated);
    throw error;
  }
}
const publicRoot = process.env.MAKSTER_PUBLIC_DIR ?? join(process.cwd(), 'apps/web-demo/public');

const approvalRequests = new Map<string, ProductionApprovalRequest>();
const approvalAuthorizations = new Map<string, ApprovedReleaseAuthorization>();
const approvalContexts = new Map<string, { engineering: ReturnType<MaksterEngineeringCompiler['compile']>; bxfReport?: ReturnType<typeof inspectBxf>; releaseId: string }>();
const productionJobs = new Map<string, ReturnType<typeof enqueueProduction>>();
const signedReleases = new Map<string, { release: ReturnType<typeof buildReleasePackage>; engineering: ReturnType<MaksterEngineeringCompiler['compile']> }>();
const supplierOrders = new Map<string, SupplierOrder>();
const supplierReceipts = new Map<string, SupplierReceipt[]>();
const procurementRfqs = new Map<string, SupplierRfq>();
const procurementQuotes = new Map<string, SupplierQuote[]>();
const procurementComparisons = new Map<string, ProcurementComparison>();
const procurementPackContexts = new Map<string, ReturnType<typeof buildProductionPack>>();
const communicationThreads = new Map<string, SupplierCommunicationThread>();
const communicationMessages = new Map<string, SupplierCommunicationMessage[]>();
const communicationThreadByRfqSupplier = new Map<string, string>();
const procurementInboxDispositions = new Map<string, ProcurementInboxDisposition>();
const ownerNotifications = new Map<string, OwnerNotification>();
const memoryEmailProvider = new MemoryEmailProvider();
async function communicationProvider(kind: string, connectionId?:string): Promise<CommunicationProvider> {
  if (kind === 'gmail') {
    if (!connectionId) throw new Error('gmail_connection_id_required');
    const auth = await gmailAccessToken(connectionId);
    return new GmailApiEmailProvider(auth.accessToken);
  }
  if (kind === 'memory') return memoryEmailProvider;
  throw new Error('unsupported_communication_provider');
}
function communicationKey(rfqId:string,supplierId:string){ return `${rfqId}:${supplierId}`; }

function clientQuoteTermsFromQuote(quote:ClientCommercialQuote):ClientQuoteTerms {
  const validityDays=Math.max(1,Math.round((Date.parse(quote.validUntil)-Date.parse(quote.issuedAt))/86_400_000));
  return {clientName:quote.clientName,...(quote.clientCompany?{clientCompany:quote.clientCompany}:{}),validityDays,...(quote.leadTimeText?{leadTimeText:quote.leadTimeText}:{}),paymentTerms:quote.paymentSchedule.map(x=>({label:x.label,bps:x.bps})),inclusions:[...quote.inclusions],exclusions:[...quote.exclusions],notes:[...quote.notes],sellerName:quote.seller.name,...(quote.seller.email?{sellerEmail:quote.seller.email}:{}),...(quote.seller.phone?{sellerPhone:quote.seller.phone}:{})};
}
function quoteTransitionAllowed(from:CommercialQuoteStatus,to:CommercialQuoteStatus):boolean {
  if(from===to) return true;
  const transitions:Record<CommercialQuoteStatus,CommercialQuoteStatus[]>={draft:['approved','sent','rejected','expired'],approved:['sent','rejected','expired'],sent:['accepted','rejected','expired'],accepted:['superseded'],rejected:[],expired:[],superseded:[]};
  return transitions[from].includes(to);
}

async function requireProjectAccess(projectId:string,req:import('node:http').IncomingMessage){
  const project=await repository.getProject(projectId,bearer(req));
  if(!project) throw new Error('project_not_found');
  return project;
}

async function currentProcurementInbox(organizationId=DEMO_ORG_ID, now?:string) {
  const connections=await gmailConnectionStore.listConnections(organizationId);
  const connectionContexts=await Promise.all(connections.map(async connection=>({connection,cursor:await gmailConnectionStore.getCursor(connection.connectionId)})));
  const summary=buildProcurementInbox({organizationId,threads:[...communicationThreads.values()],messagesByThread:communicationMessages,quotesByRfq:procurementQuotes,connections:connectionContexts,dispositions:procurementInboxDispositions,...(now?{now}:{})});
  for(const notification of ownerNotificationsFromInbox(summary)) if(!ownerNotifications.has(notification.notificationId)) ownerNotifications.set(notification.notificationId,notification);
  return summary;
}

async function runGmailConnectionOperations(organizationId=DEMO_ORG_ID, now=new Date().toISOString()) {
  const results:any[]=[];
  const connections=await gmailConnectionStore.listConnections(organizationId);
  for(const connection of connections){
    let cursor=await gmailConnectionStore.getCursor(connection.connectionId);
    const before=assessGmailConnectionHealth({connection,cursor,now});
    const actions:string[]=[];
    try {
      if(connection.status==='connected' && before.syncDue){ await runGmailSync(connection.connectionId,now); actions.push('sync'); cursor=await gmailConnectionStore.getCursor(connection.connectionId); }
      if(connection.status==='connected' && before.watchRenewDue){
        const topic=cursor?.watchTopic??process.env.GOOGLE_GMAIL_PUBSUB_TOPIC;
        if(topic){ const auth=await gmailAccessToken(connection.connectionId); const watch=await new GmailApiClient(auth.accessToken).watch(topic); const latest=await gmailConnectionStore.getCursor(connection.connectionId); cursor={connectionVersion:GMAIL_CONNECTIONS_VERSION,connectionId:connection.connectionId,historyId:latest?.historyId??watch.historyId,watchTopic:topic,watchExpirationAt:new Date(Number(watch.expiration)).toISOString(),lastWatchRenewAt:now,syncStatus:'idle',...(latest?.lastSyncAt?{lastSyncAt:latest.lastSyncAt}:{}),...(latest?.lastFullSyncAt?{lastFullSyncAt:latest.lastFullSyncAt}:{}),updatedAt:now}; await gmailConnectionStore.saveCursor(cursor); actions.push('watch_renewal'); }
      }
      const latestConnection=await gmailConnectionStore.getConnection(connection.connectionId)??connection; const after=assessGmailConnectionHealth({connection:latestConnection,cursor:await gmailConnectionStore.getCursor(connection.connectionId),now}); results.push({connectionId:connection.connectionId,status:'ok',actions,before,after});
    } catch(error){ const latestConnection=await gmailConnectionStore.getConnection(connection.connectionId)??connection; const after=assessGmailConnectionHealth({connection:latestConnection,cursor:await gmailConnectionStore.getCursor(connection.connectionId),now}); results.push({connectionId:connection.connectionId,status:'error',actions,error:String((error as Error).message),before,after}); }
  }
  await currentProcurementInbox(organizationId,now);
  return {inboxVersion:PROCUREMENT_INBOX_VERSION,organizationId,runAt:now,connections:results};
}

async function runGmailSync(connectionId:string, now?:string) {
  const auth=await gmailAccessToken(connectionId);
  const client=new GmailApiClient(auth.accessToken);
  const cursor=await gmailConnectionStore.getCursor(connectionId);
  const threads=[...communicationThreads.values()].filter(t=>t.provider==='gmail' && t.providerAccountRef===connectionId);
  const seen=new Set<string>();
  for(const thread of threads) for(const message of communicationMessages.get(thread.threadId)??[]) if(message.providerMessageId) seen.add(message.providerMessageId);
  const sync=await syncGmailConnection({connectionId,client,cursor,threads,seenProviderMessageIds:seen,...(now?{now}:{})});
  const imported:any[]=[];
  for(const matched of sync.result.matchedInbound){
    const message=matched.message;
    if(seen.has(message.id)) continue;
    const thread=communicationThreads.get(matched.communicationThreadId);
    if(!thread) continue;
    const rfq=procurementRfqs.get(thread.rfqId);
    const supplier=procurementSuppliers.find(s=>s.id===thread.supplierId);
    if(!rfq||!supplier) { imported.push({providerMessageId:message.id,status:'needs_context'}); continue; }
    const receivedAt=message.internalDate ? new Date(Number(message.internalDate)).toISOString() : (now??new Date().toISOString());
    const parsed=parseSupplierReply({rfq,supplier,text:message.text||message.snippet||'',fromEmail:message.from,receivedAt});
    const inbound:SupplierCommunicationMessage={communicationVersion:'1.3.0',messageId:randomUUID(),threadId:thread.threadId,direction:'inbound',kind:parsed.classification==='quote_candidate'?'quote_received':parsed.classification==='declined'?'decline':'supplier_reply',status:'received',subject:message.subject||thread.subject,bodyText:message.text||message.snippet||'',payloadSha256:sha256Text(message.text||message.snippet||''),providerMessageId:message.id,providerThreadId:message.threadId,...(message.inReplyTo?{inReplyToRfcMessageId:message.inReplyTo}:{}),receivedAt};
    const messages=communicationMessages.get(thread.threadId)??[];messages.push(inbound);communicationMessages.set(thread.threadId,messages);
    communicationThreads.set(thread.threadId,{...thread,status:parsed.classification==='declined'?'declined':'replied',lastInboundAt:receivedAt,providerThreadId:message.threadId});
    let quoteImported=false;
    if(parsed.classification==='quote_candidate'&&parsed.quote){const quotes=procurementQuotes.get(rfq.rfqId)??[];if(!quotes.some(q=>q.quoteId===parsed.quote!.quoteId)){quotes.push(parsed.quote);procurementQuotes.set(rfq.rfqId,quotes);}quoteImported=true;}
    imported.push({providerMessageId:message.id,threadId:thread.threadId,supplierId:thread.supplierId,classification:parsed.classification,quoteImported,warnings:parsed.warnings});
  }
  await gmailConnectionStore.saveCursor(sync.cursor);
  const {lastError:_previousError,...connectionBase}=auth.connection;
  const updated:GmailConnectionRecord={...connectionBase,updatedAt:now??new Date().toISOString()};
  await gmailConnectionStore.updateConnection(updated);
  return {sync:sync.result,imported};
}

function demoCommercialPricing(currency:string, body:any): CommercialPricingProfile {
  if(currency!=='EUR') throw new Error('demo_commercial_pricing_eur_only');
  const markupBps=Number.isInteger(body.markupBps)?Number(body.markupBps):3500;
  const discountBps=Number.isInteger(body.discountBps)?Number(body.discountBps):0;
  const taxBps=Number.isInteger(body.taxBps)?Number(body.taxBps):2100;
  const workshopMinutes=Math.round(Number(body.workshopHours??28)*60);
  const installationMinutes=Math.round(Number(body.installationHours??10)*60);
  return {
    profileId:'TEST_ONLY_atelier_demo_eur_v1', name:'TEST ONLY Atelier demo pricing', currency,
    materialPrices:[
      {materialSelectionId:'44444444-4444-4444-8444-444444444441',label:'Light oak board 18 mm',pricingMode:'per_sheet',thicknessMm:18,unitCostMinor:9200,sheetLengthMm:2800,sheetWidthMm:2070,wasteBps:1200},
      {materialSelectionId:'44444444-4444-4444-8444-444444444441',label:'Light oak board 16 mm',pricingMode:'per_sheet',thicknessMm:16,unitCostMinor:8200,sheetLengthMm:2800,sheetWidthMm:2070,wasteBps:1200},
      {materialSelectionId:'44444444-4444-4444-8444-444444444441',label:'Light oak board 8 mm',pricingMode:'per_sheet',thicknessMm:8,unitCostMinor:4500,sheetLengthMm:2800,sheetWidthMm:2070,wasteBps:1200},
      {materialSelectionId:'44444444-4444-4444-8444-444444444442',label:'Graphite front',pricingMode:'per_m2',thicknessMm:18,unitCostMinor:11500},
      {materialSelectionId:'44444444-4444-4444-8444-444444444443',label:'HDF back',pricingMode:'per_m2',thicknessMm:8,unitCostMinor:1700},
      {materialSelectionId:'44444444-4444-4444-8444-444444444445',label:'TEST ONLY Compact worktop 38 mm',pricingMode:'per_m2',thicknessMm:38,unitCostMinor:16500},
    ],
    edgePrices:[{materialSelectionId:'44444444-4444-4444-8444-444444444444',unitCostPerMeterMinor:75}],
    hardwarePrices:[
      {role:'rail',unitCostMinor:2400},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888881',unitCostMinor:680},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888882',unitCostMinor:6200},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888883',unitCostMinor:8900},
      {hardwareSelectionId:'88888888-8888-4888-8888-888888888884',unitCostMinor:550},
    ],
    labor:[
      {id:'workshop',label:'Workshop fabrication and assembly',minutes:workshopMinutes,hourlyCostMinor:2600},
      {id:'installation',label:'On-site installation',minutes:installationMinutes,hourlyCostMinor:2900,category:'installation'},
    ],
    fixedCosts:[{id:'transport',label:'Transport and handling',category:'transport',costMinor:12000}],
    overheadBps:800, markupBps, discountBps, taxBps, commercialRoundingMinor:1000,
  };
}
function commercialPricingFromBody(currency:string, body:any): CommercialPricingProfile {
  if(body.useDemoPricing===true) return demoCommercialPricing(currency,body);
  if(!body.pricing || typeof body.pricing!=='object') throw new Error('commercial_pricing_profile_required');
  const pricing=body.pricing as CommercialPricingProfile;
  if(pricing.currency!==currency) throw new Error(`pricing_currency_mismatch:${pricing.currency}:${currency}`);
  return pricing;
}
function findSupplierQuoteById(quoteId:string|undefined): SupplierQuote|undefined {
  if(!quoteId) return undefined;
  for(const quotes of procurementQuotes.values()) { const quote=quotes.find(q=>q.quoteId===quoteId); if(quote) return quote; }
  return undefined;
}
function enrichPricingWithSupplierQuote(pricing:CommercialPricingProfile, quoteId:string|undefined):CommercialPricingProfile {
  const quote=findSupplierQuoteById(quoteId); if(!quote) return pricing;
  const supplier=procurementSuppliers.find(s=>s.id===quote.supplierId);
  return {...pricing,supplierQuote:{quoteId:quote.quoteId,supplierId:quote.supplierId,supplierName:supplier?.name??quote.supplierId,totalPriceMinor:decimalToMinor(quote.totalPrice),services:quote.services}};
}
const procurementSuppliers: SupplierCapabilityProfile[] = [
  { id:'demo-supplier-prague-cut', name:'Prague Cut Service', email:'quotes@prague-cut.example', active:true, currencies:['EUR','CZK'], services:['cutting','edging'], deliveryModes:['pickup','supplier_delivery'], minimumOrder:100, typicalLeadDays:5 },
  { id:'demo-supplier-quick-panel', name:'QuickPanel', email:'rfq@quickpanel.example', active:true, currencies:['EUR','CZK'], services:['cutting','edging','drilling'], deliveryModes:['supplier_delivery','carrier'], minimumOrder:120, typicalLeadDays:2 },
  { id:'demo-supplier-budget-board', name:'Budget Board', email:'orders@budget-board.example', active:true, currencies:['EUR'], services:['cutting','edging'], deliveryModes:['pickup'], minimumOrder:80, typicalLeadDays:7 },
];

const neutralPostprocessor = new MaksterNeutralCncPostprocessor();
const testPostprocessor = new TestVerifiedMachinePostprocessor();
const demoMachines: ProductionMachineProfile[] = [
  {
    id: 'makster-neutral-preview', organizationId: DEMO_ORG_ID, name: 'Makster Neutral Preview',
    manufacturer: 'Makster', model: 'Neutral CNC IR', trust: 'test_only', postprocessorId: neutralPostprocessor.id,
    capability: { operations: ['drill','hinge_cup','groove'], maxPartLengthMm10: 50000, maxPartWidthMm10: 30000, maxPartThicknessMm10: 1000 },
  },
  ...(process.env.MAKSTER_ENABLE_TEST_MACHINE === '1' ? [{
    id: 'TEST-ONLY-MACHINE-001', organizationId: DEMO_ORG_ID, name: 'TEST ONLY Virtual CNC',
    manufacturer: 'Makster Test Lab', model: 'Virtual CNC 0.9', trust: 'test_only', postprocessorId: testPostprocessor.id,
    capability: { operations: ['drill','hinge_cup','groove'], maxPartLengthMm10: 50000, maxPartWidthMm10: 30000, maxPartThicknessMm10: 1000 },
  } as ProductionMachineProfile] : []),
];

function signerFromEnv(): ReleaseSigner | undefined {
  const privateKey = process.env.MAKSTER_CNC_SIGNING_PRIVATE_KEY_PEM;
  const keyId = process.env.MAKSTER_CNC_SIGNING_KEY_ID;
  if (!privateKey || !keyId) return undefined;
  return { keyId, privateKeyPem: privateKey.replaceAll('\\n', '\n') };
}

function compileManufacturingContext(snapshot: any, body: any) {
  let report: ReturnType<typeof inspectBxf> | undefined;
  let compiler: MaksterEngineeringCompiler = engineering;
  const xml = String(body?.xml ?? '');
  if (xml) {
    report = inspectBxf({ fileName: String(body?.fileName ?? 'upload.bxf'), xml, adapters: [new MaksterFixtureBxfAdapter()] });
    const profiles = report.adapter?.manufacturingProfiles ?? [];
    if (profiles.length > 0) compiler = new MaksterEngineeringCompiler(new ImportedManufacturingDataProvider(profiles));
  } else if (body?.testManualVerified === true && process.env.MAKSTER_ENABLE_TEST_MACHINE === '1') {
    compiler = new MaksterEngineeringCompiler(new ManualVerifiedFixtureManufacturingDataProvider());
  }
  return { engineering: compiler.compile(snapshot), ...(report ? { bxfReport: report } : {}) };
}

function routeMatch(pathname: string, pattern: RegExp): RegExpMatchArray | null {
  return pathname.match(pattern);
}

async function serveStatic(pathname: string, res: any): Promise<boolean> {
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safe = normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(publicRoot, safe);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.js' ? 'text/javascript; charset=utf-8'
      : 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}



const clientShareRate=new Map<string,{windowStart:number;count:number}>();
function allowClientShareRequest(req:import('node:http').IncomingMessage,limit:number):boolean{
  const key=req.socket.remoteAddress??'unknown',now=Date.now(),windowMs=60_000;
  const current=clientShareRate.get(key);
  if(!current||now-current.windowStart>=windowMs){clientShareRate.set(key,{windowStart:now,count:1});return true}
  current.count++;return current.count<=limit;
}

function clientShareHtml(projectId:string):string {
  const project=JSON.stringify(projectId);
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Makster Client Portal</title>
  <style>
  body{font-family:Inter,system-ui,sans-serif;margin:0;background:#f5f8f7;color:#17201c}.wrap{max-width:860px;margin:0 auto;padding:24px}.card{background:#fff;border:1px solid #dfe7e3;border-radius:18px;padding:20px;margin:14px 0}.muted{opacity:.65}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric{padding:12px;border-radius:12px;background:#f7faf8}.approval{padding:14px 0;border-top:1px solid #e7ece9}.approval:first-child{border-top:0}.btn{border:0;border-radius:10px;padding:10px 14px;cursor:pointer}.ok{background:#153f32;color:white}.secondary{background:#e9efec}.bar{height:8px;background:#e6ece9;border-radius:999px;overflow:hidden}.bar>div{height:100%;background:#153f32}.error{background:#fff0ee;border-color:#f0c1ba}@media(max-width:640px){.metrics{grid-template-columns:1fr}}
  </style></head><body><div class="wrap"><div id="app" class="card">Загрузка…</div></div>
  <script>
  const PROJECT=${project},TOKEN=location.hash.slice(1);
  const apiBase='/api/v1/public/client/'+encodeURIComponent(PROJECT);
  const shareHeaders=()=>({'x-client-share-token':TOKEN});
  const money=(v,c)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:c||'EUR'}).format((Number(v)||0)/100);
  async function load(){
    if(!TOKEN){document.getElementById('app').className='card error';document.getElementById('app').textContent='Ссылка неполная.';return} const r=await fetch(apiBase,{cache:'no-store',headers:shareHeaders()});if(!r.ok){document.getElementById('app').className='card error';document.getElementById('app').textContent='Ссылка недействительна или срок её действия истёк.';return}
    const v=await r.json(),app=document.getElementById('app');
    const commercial=v.commercial?'<div class="metrics">'+
      (v.commercial.contractValueMinor!=null?'<div class="metric"><small>Договор</small><div><strong>'+money(v.commercial.contractValueMinor,v.commercial.currency)+'</strong></div></div>':'')+
      (v.commercial.receivedMinor!=null?'<div class="metric"><small>Оплачено</small><div><strong>'+money(v.commercial.receivedMinor,v.commercial.currency)+'</strong></div></div><div class="metric"><small>Остаток</small><div><strong>'+money(v.commercial.outstandingMinor,v.commercial.currency)+'</strong></div></div>':'')+'</div>':'';
    const approvals=(v.approvals||[]).map(a=>'<div class="approval"><strong>'+escapeHtml(a.title)+'</strong><p>'+escapeHtml(a.description)+'</p><small class="muted">'+escapeHtml(a.kind)+' · '+escapeHtml(a.status)+' · Revision '+a.sourceRevision+'</small>'+
      (a.clientAmountMinor!=null?'<p><strong>'+money(a.clientAmountMinor,v.commercial?.currency||'EUR')+'</strong></p>':'')+
      (a.status==='pending'&&v.sharePermissions?.allowApprovalResponses?'<div><button class="btn ok" onclick="respond(\\''+a.id+'\\',true)">Утвердить</button> <button class="btn secondary" onclick="respond(\\''+a.id+'\\',false)">Нужны изменения</button></div>':'')+'</div>').join('');
    app.innerHTML='<small class="muted">MAKSTER CLIENT PORTAL · REVISION '+v.revision+'</small><h1>'+escapeHtml(v.title)+'</h1>'+(v.welcomeText?'<p>'+escapeHtml(v.welcomeText)+'</p>':'')+
      '<div class="bar"><div style="width:'+v.stageProgressPercent+'%"></div></div><p><strong>Этап:</strong> '+escapeHtml(v.projectStage)+'</p><p><strong>Объект:</strong> '+escapeHtml(v.client?.objectAddress||'—')+'</p>'+commercial+
      '<div class="card"><h3>Согласования</h3>'+(approvals||'<p class="muted">Нет активных согласований.</p>')+'</div>';
    window.__revision=v.revision;window.__oneTime=Boolean(v.sharePermissions?.oneTime);
  }
  async function respond(id,approved){
    const comment=prompt(approved?'Комментарий (необязательно):':'Что нужно изменить:','')||'';
    const r=await fetch(apiBase+'/approvals/'+encodeURIComponent(id)+'/respond',{method:'POST',headers:{'content-type':'application/json',...shareHeaders()},body:JSON.stringify({expectedRevision:window.__revision,approved,respondedBy:'client',comment})});
    if(!r.ok){alert('Не удалось сохранить ответ. Возможно, проект уже изменился. Обновите страницу.');return}
    if(window.__oneTime){
      document.getElementById('app').innerHTML='<small class="muted">MAKSTER CLIENT PORTAL</small><h2>Ответ сохранён</h2><p>Спасибо. Эта одноразовая ссылка уже использована.</p>';
      return;
    }
    await load();
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  load();
  </script></body></html>`;
}


const observabilityState={
  startedAt:new Date().toISOString(),
  requests:0,errors:0,
  durationsMs:[] as number[],
  byStatus:{} as Record<string,number>,
  byMethod:{} as Record<string,number>
};
function observabilitySnapshot(){
  const xs=[...observabilityState.durationsMs].sort((a,b)=>a-b);
  const p=(q:number)=>xs.length?xs[Math.min(xs.length-1,Math.floor((xs.length-1)*q))]:0;
  return {
    version:'5.6.0',startedAt:observabilityState.startedAt,
    requests:observabilityState.requests,errors:observabilityState.errors,errorRate:observabilityState.requests?Number((observabilityState.errors/observabilityState.requests*100).toFixed(2)):0,
    p50Ms:Number(p(.5).toFixed(1)),p95Ms:Number(p(.95).toFixed(1)),p99Ms:Number(p(.99).toFixed(1)),
    byStatus:observabilityState.byStatus,byMethod:observabilityState.byMethod
  };
}

const server = createServer(async (req, res) => {
  const requestStarted=performance.now();
  observabilityState.requests+=1;
  observabilityState.byMethod[String(req.method??'UNKNOWN')]=(observabilityState.byMethod[String(req.method??'UNKNOWN')]??0)+1;
  res.once('finish',()=>{
    const ms=performance.now()-requestStarted;
    observabilityState.durationsMs.push(ms);if(observabilityState.durationsMs.length>5000)observabilityState.durationsMs.shift();
    const status=String(res.statusCode);observabilityState.byStatus[status]=(observabilityState.byStatus[status]??0)+1;
    if(res.statusCode>=500)observabilityState.errors+=1;
  });
  try {
    if (!req.url) return json(res, 400, { error: 'missing_url' });
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;
    if (req.method === 'OPTIONS') return json(res, 204, {});
    if(path.startsWith('/api/v1/smm')){
      res.setHeader('Cache-Control','no-store');
      if(req.method==='POST'){
        const origin=req.headers.origin;
        if(origin&&new URL(origin).host!==req.headers.host)return json(res,403,{error:'SMM_SAME_ORIGIN_REQUIRED'});
        if(req.headers['x-makster-smm']!=='1')return json(res,403,{error:'SMM_CLIENT_HEADER_REQUIRED'});
      }
      const qaLocal=process.env.MAKSTER_SMM_PREVIEW==='1'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress||'');
      if(path==='/api/v1/smm/capabilities'&&req.method==='GET')return json(res,200,{isolatedLocalQA:qaLocal});
      // This is a development-only session in the isolated local preview, with legacy
      // mutations disabled and all paid/production credentials removed by its launcher.
      // It is not available in normal Office/server deployments.
      if(path==='/api/v1/smm/qa-session'&&req.method==='POST'&&qaLocal){
        const token=randomUUID()+randomUUID();smmSessions.set(token,Date.now()+12*3600000);res.setHeader('Set-Cookie',`makster_smm=${token}; HttpOnly; SameSite=Strict; Path=/api/v1/smm; Max-Age=43200`);return json(res,200,{ok:true,mode:'ISOLATED_LOCAL_QA'});
      }
      if(path==='/api/v1/smm/login'&&req.method==='POST'){
        if(!smmKey)return json(res,503,{error:'SMM_OWNER_KEY_NOT_CONFIGURED'});
        if(Date.now()-smmLoginAttempts.at>600000)smmLoginAttempts={at:Date.now(),count:0};
        if(++smmLoginAttempts.count>10)return json(res,429,{error:'LOGIN_RATE_LIMIT'});
        const b=await readJson(req),candidate=String(b.key||'');
        if(candidate.length!==smmKey.length||!timingSafeEqual(Buffer.from(candidate),Buffer.from(smmKey)))return json(res,401,{error:'OWNER_KEY_INVALID'});
        const token=randomUUID()+randomUUID();smmSessions.set(token,Date.now()+12*3600000);res.setHeader('Set-Cookie',`makster_smm=${token}; HttpOnly; SameSite=Strict; Path=/api/v1/smm; Max-Age=43200`);return json(res,200,{ok:true});
      }
      const session=String(req.headers.cookie||'').match(/(?:^|; )makster_smm=([^;]+)/)?.[1];
      const direct=req.headers['x-makster-smm-key'];
      if(!smmKey||(!session||!smmSessions.has(session)||smmSessions.get(session)!<Date.now())&&direct!==smmKey)return json(res,401,{error:'SMM_OWNER_LOGIN_REQUIRED'});
      try{
        await smmReady;
        if(path==='/api/v1/smm/state'&&req.method==='GET')return json(res,200,await smmService.state());
        if(path==='/api/v1/smm/import'&&req.method==='POST')return json(res,200,await smmService.import(await readJson(req)));
        if(path==='/api/v1/smm/sync'&&req.method==='POST')return json(res,200,await smmService.sync());
        if(path==='/api/v1/smm/drafts'&&req.method==='POST')return json(res,201,await smmService.draft(await readJson(req),String(req.headers['idempotency-key']||'')));
        if(path==='/api/v1/smm/briefs'&&req.method==='POST')return json(res,201,await smmService.brief(await readJson(req),String(req.headers['idempotency-key']||'')));
        const exp=path.match(/^\/api\/v1\/smm\/drafts\/([a-f0-9-]+)\/export$/);
        if(exp&&req.method==='GET')return json(res,200,await smmService.exportDraft(exp[1]!));
        return json(res,404,{error:'SMM_ROUTE_NOT_FOUND_PUBLISHING_DISABLED'});
      }catch(e:any){return json(res,e.status||500,{error:e.status?e.message:'SMM_OPERATION_FAILED'})}
    }
    if(process.env.MAKSTER_SMM_PREVIEW==='1'&&req.method==='POST')return json(res,403,{error:'LEGACY_MUTATIONS_DISABLED_IN_SMM_OWNER_QA'});


    if(req.method==='GET'&&path==='/api/v1/system/observability'){
      return json(res,200,observabilitySnapshot());
    }
    if(req.method==='POST'&&path==='/api/v1/system/roles/bootstrap'){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const created=[];
      for(const p of defaultRolePolicies()){
        if(!ops.rolePolicies.some(x=>x.role===p.role)){await ownerOperationsStore.addRolePolicy(p);created.push(p)}
      }
      return json(res,201,{version:'5.6.0',created:created.length,policies:(await ownerOperationsStore.get()).rolePolicies});
    }
    const rolePolicyRoute=routeMatch(path,/^\/api\/v1\/system\/roles\/([^/]+)$/);
    if(req.method==='POST'&&rolePolicyRoute){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const role=String(rolePolicyRoute[1]) as any;
      const defaults=defaultRolePolicies(),base=ops.rolePolicies.find(x=>x.role===role)??defaults.find(x=>x.role===role);
      if(!base)return json(res,400,{error:'system_role_invalid'});
      const permissions=Array.isArray(b.permissions)?b.permissions.map(String) as any:base.permissions;
      const policy={...base,permissions,updatedAt:new Date().toISOString()};
      await ownerOperationsStore.upsertRolePolicy(policy);
      return json(res,200,{version:'5.6.0',policy});
    }
    if(req.method==='POST'&&path==='/api/v1/system/incidents'){
      const b=await readJson(req),now=new Date().toISOString();
      const incident={
        id:randomUUID(),severity:String(b.severity??'medium') as any,component:String(b.component??'other') as any,
        code:String(b.code??'MANUAL_INCIDENT'),message:String(b.message??'Operational incident'),
        status:'open' as const,firstSeenAt:now,lastSeenAt:now,
        ...(b.details&&typeof b.details==='object'?{details:b.details}:{})
      };
      await ownerOperationsStore.addOperationalIncident(incident);
      return json(res,201,{version:'5.6.0',incident});
    }
    const incidentResolve=routeMatch(path,/^\/api\/v1\/system\/incidents\/([^/]+)\/resolve$/);
    if(req.method==='POST'&&incidentResolve){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const incident=ops.operationalIncidents.find(x=>x.id===incidentResolve[1]!);if(!incident)return json(res,404,{error:'incident_not_found'});
      incident.status='resolved';incident.resolvedAt=new Date().toISOString();incident.lastSeenAt=incident.resolvedAt;
      await ownerOperationsStore.updateOperationalIncident(incident);
      return json(res,200,{version:'5.6.0',resolvedBy:String(b.resolvedBy??'owner'),incident});
    }

    if(req.method==='POST'&&path==='/api/v1/system/access/check'){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const role=String(b.role??'viewer') as any,permission=String(b.permission??'projects.read') as any;
      return json(res,200,{version:'5.6.0',role,permission,allowed:roleCan(role,permission,ops)});
    }
    if(req.method==='GET'&&path==='/api/v1/system/readiness'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      const ops=await ownerOperationsStore.get(),obs=observabilitySnapshot();
      const report=buildProductionReadiness({
        projects,state:ops,
        env:{
          nodeEnv:process.env.NODE_ENV,
          hasSupabase:Boolean(process.env.SUPABASE_URL),
          hasSupabaseServiceRole:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          hasGrowthExecutor:Boolean(process.env.MAKSTER_GROWTH_EXECUTOR_URL&&process.env.MAKSTER_GROWTH_EXECUTOR_TOKEN),
          hasGrowthIngestSecret:Boolean(process.env.MAKSTER_GROWTH_INGEST_SECRET),
          hasOpenAI:Boolean(process.env.OPENAI_API_KEY),
          hasPublicBaseUrl:Boolean(process.env.MAKSTER_PUBLIC_BASE_URL)
        },
        observability:{requests:obs.requests,errors:obs.errors,p95Ms:obs.p95Ms}
      });
      await ownerOperationsStore.addReadinessSnapshot(report);
      return json(res,200,report);
    }
    if(req.method==='GET'&&path==='/api/v1/system/backup/export'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      const ops=await ownerOperationsStore.get();
      const built=buildApplicationBackupPayload({organizationId,projects,ownerState:ops});
      const sha256=createHash('sha256').update(built.json,'utf8').digest('hex');
      const manifest=makeBackupManifest({organizationId,projectCount:projects.length,ownerStateVersion:ops.version,sha256,bytes:Buffer.byteLength(built.json)});
      await ownerOperationsStore.addBackupManifest(manifest);
      res.statusCode=200;res.setHeader('content-type','application/json; charset=utf-8');
      res.setHeader('content-disposition',`attachment; filename="makster_backup_${new Date().toISOString().slice(0,10)}.json"`);
      return res.end(JSON.stringify({...built.payload,manifest}));
    }
    if(req.method==='POST'&&path==='/api/v1/system/backup/validate'){
      const b=await readJson(req);return json(res,200,validateBackupPayload(b));
    }

    if (req.method === 'GET' && path === '/api/v1/health') {
      return json(res, 200, {
        ok: true,
        version: '5.6.0',
        businessPersistence: businessStore.mode,
        engineering: '0.7.0',
        bxfIntelligence: '0.7.0',
        manufacturingRelease: '0.8.0',
        productionControl: '0.9.0',
        productionWorker: '0.9.0',
        productionPack: '1.0.0',
        supplierOperations: '1.1.0',
        procurementIntelligence: '1.2.0',
        supplierCommunication: '1.3.0',
        connectionsGmail: '1.5.0',
        procurementInbox: '1.5.0',
        commercialEngine: COMMERCIAL_ENGINE_VERSION,
        changeIntelligence: CHANGE_INTELLIGENCE_VERSION,
        clientChangeOrder: CLIENT_CHANGE_ORDER_VERSION,
        visualProduct: VISUAL_PRODUCT_VERSION,
        repository: process.env.SUPABASE_URL ? 'supabase' : 'memory',
        ai: process.env.OPENAI_API_KEY ? 'openai' : 'deterministic',
      });
    }


    if (req.method === 'GET' && path === '/api/v1/catalogs/hardware') {
      const manufacturer=url.searchParams.get('manufacturer')??undefined;
      const q=url.searchParams.get('q')??undefined;
      const role=(url.searchParams.get('role')??undefined) as any;
      const productionReadyOnly=url.searchParams.get('productionReadyOnly')==='true';
      return json(res,200,{catalogVersion:'2.7.2',manufacturers:HARDWARE_MANUFACTURERS,items:searchHardwareCatalog({...(manufacturer?{manufacturer}:{}),...(q?{q}:{}),...(role?{role}:{}),...(productionReadyOnly?{productionReadyOnly}: {})})});
    }

    if (req.method === 'GET' && path === '/api/v1/catalogs/appliances') {
      const manufacturer=url.searchParams.get('manufacturer')??undefined;
      const q=url.searchParams.get('q')??undefined;
      const kind=(url.searchParams.get('kind')??undefined) as any;
      return json(res,200,{catalogVersion:'2.7.2',manufacturers:APPLIANCE_MANUFACTURERS,items:searchApplianceCatalog({...(manufacturer?{manufacturer}:{}),...(q?{q}:{}),...(kind?{kind}: {})})});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/hardware/compatibility') {
      const body=await readJson(req);
      const result=evaluateHardwareCatalogId(String(body.id??''),body.context??{});
      if(!result)return json(res,404,{error:'hardware_catalog_record_not_found'});
      return json(res,200,{compatibilityVersion:'2.7.3',...result});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/appliances/compatibility') {
      const body=await readJson(req);
      const result=evaluateApplianceCatalogId(String(body.id??''),body.context??{});
      if(!result)return json(res,404,{error:'appliance_catalog_record_not_found'});
      return json(res,200,{compatibilityVersion:'2.7.3',...result});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/hardware/auto-select') {
      const body=await readJson(req);
      const result=autoSelectHardware(body??{});
      return json(res,200,{autoSelectionVersion:'2.7.4',...result});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/appliances/auto-select') {
      const body=await readJson(req);
      const result=autoSelectAppliances(body??{});
      return json(res,200,{autoSelectionVersion:'2.7.4',...result});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/import') {
      const body=await readJson(req);
      const result=importCatalogSource(body);
      await catalogRegistryStore.saveImport(result);
      return json(res,200,{importPipelineVersion:'2.8.0',registryMode:catalogRegistryStore.mode,...result});
    }

    if (req.method === 'GET' && path === '/api/v1/catalogs/review-queue') {
      return json(res,200,{registryVersion:'2.8.0',registryMode:catalogRegistryStore.mode,candidates:await catalogRegistryStore.listReviewQueue()});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/import/promote') {
      const body=await readJson(req);
      const stored=await catalogRegistryStore.getCandidate(String(body.candidateId??body.candidate?.candidateId??''));
      const candidate=stored??body.candidate;
      if(!candidate)return json(res,404,{error:'catalog_candidate_not_found'});
      const record=promoteCatalogCandidate({...body,candidate});
      if('family' in record) registerHardwareCatalogRecord(record);
      else registerApplianceCatalogRecord(record);
      await catalogRegistryStore.promote(candidate.candidateId,record,String(body.reviewedBy??'reviewer'));
      return json(res,200,{importPipelineVersion:'2.8.0',registryMode:catalogRegistryStore.mode,record});
    }

    if (req.method === 'POST' && path === '/api/v1/catalogs/import/reject') {
      const body=await readJson(req);
      await catalogRegistryStore.reject(String(body.candidateId??''),String(body.reviewedBy??'reviewer'),body.reason?String(body.reason):undefined);
      return json(res,200,{registryVersion:'2.8.0',status:'rejected'});
    }

    if (req.method === 'POST' && path === '/api/v1/kitchen-design-studio/generate') {
      const body = await readJson(req);
      const result = generateAndRankKitchenDesigns(body);
      return json(res, 200, { studioVersion: '5.1.0', ...result });
    }

    const projectAutoCompleteRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/auto-complete$/);
    if(req.method==='GET'&&projectAutoCompleteRoute){
      const project=await repository.getProject(projectAutoCompleteRoute[1]!,bearer(req));
      if(!project?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,analyzeProjectAutoComplete(project.snapshot));
    }

    const projectCatalogAutoRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/catalog-auto-selection$/);
    if(req.method==='GET'&&projectCatalogAutoRoute){
      const project=await repository.getProject(projectCatalogAutoRoute[1]!,bearer(req));
      if(!project?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,analyzeProjectCatalogSelections(project.snapshot));
    }

    const catalogAssignmentRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/catalog-assignment\/apply$/);
    if(req.method==='POST'&&catalogAssignmentRoute){
      const body=await readJson(req);
      if(body.approved!==true)return json(res,409,{error:'explicit_catalog_assignment_approval_required'});
      const project=await repository.getProject(catalogAssignmentRoute[1]!,bearer(req));
      if(!project?.snapshot)return json(res,404,{error:'project_not_found'});
      const report=analyzeProjectCatalogSelections(project.snapshot);
      const recommendation=report.recommendations.find(r=>
        r.furnitureId===String(body.furnitureId??'')
        && r.moduleId===String(body.moduleId??'')
        && r.target===String(body.target??'')
        && (r.targetRefId??'')===String(body.targetRefId??'')
        && (r.applianceIndex??0)===Number(body.applianceIndex??0)
      );
      if(!recommendation)return json(res,409,{error:'catalog_recommendation_not_current'});
      const candidateId=String(body.candidateId??'');
      const candidate=recommendation.result.candidates.find(c=>c.record.id===candidateId);
      if(!candidate)return json(res,409,{error:'catalog_candidate_not_current'});
      if(candidate.compatibilityStatus==='incompatible'||candidate.compatibilityStatus==='unknown'){
        return json(res,409,{error:'catalog_candidate_not_confirmed_compatible',status:candidate.compatibilityStatus});
      }
      const selectionId=recommendation.target==='appliance'?undefined:randomUUID();
      const applied=applyApprovedCatalogAssignment(project.snapshot,{
        recommendation,candidateId,approvedBy:String(body.approvedBy??'user'),
        ...(selectionId?{selectionId}:{}),
        ...(body.procurementMode?{applianceProcurementMode:String(body.procurementMode) as any}:{}),
        ...(body.priceTier?{appliancePriceTier:String(body.priceTier) as any}:{}),
        ...(body.pricing?{appliancePricing:body.pricing}:{})
      });
      const validation=validateProjectModel(applied.snapshot);
      if(!validation.ok)return json(res,422,{error:'catalog_assignment_invalid_project',details:validation.errors});
      const saved=await repository.createRevision({
        organizationId:project.organizationId,projectId:project.id,parentRevisionId:project.currentRevisionId,
        snapshot:applied.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const visualScene=buildVisualScene(saved.snapshot!);
      const compiled=engineering.compile(saved.snapshot!);
      return json(res,200,{assignmentVersion:'2.7.6',project:saved,visualScene,engineering:compiled,assignment:applied.assignment});
    }

    const kitchenStudioApplyRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/kitchen-design-studio\/apply$/);
    if(req.method==='POST'&&kitchenStudioApplyRoute){
      const body=await readJson(req);
      const project=await repository.getProject(kitchenStudioApplyRoute[1]!,bearer(req));
      if(!project?.snapshot)return json(res,404,{error:'project_not_found'});
      const variant=body.variant as KitchenDesignVariant;
      if(!variant?.mixedHeight||!variant?.score)return json(res,400,{error:'kitchen_design_variant_required'});
      const snapshot=materializeKitchenDesignVariant(project.snapshot,variant,{title:String(body.title??project.snapshot.title),...(body.roomHeightMm==null?{}:{roomHeightMm:Number(body.roomHeightMm)})});
      if(body.roomScene){
        const room=roomSceneToRoom(body.roomScene);
        snapshot.site.rooms=[room];
        for(const furniture of snapshot.furniture) furniture.roomId=room.id;
        snapshot.notes.push({id:randomUUID(),text:`MAKSTER_ROOM_SCENE_V1:${JSON.stringify(body.roomScene)}`,authorType:'system',createdAt:new Date().toISOString()});
      }
      const validation=validateProjectModel(snapshot);
      if(!validation.ok)return json(res,422,{error:'materialized_kitchen_design_invalid',details:validation.errors});
      const saved=await repository.createRevision({organizationId:project.organizationId,projectId:project.id,parentRevisionId:project.currentRevisionId,snapshot,changeSet:null,source:'system'},bearer(req));
      const visualScene=buildVisualScene(saved.snapshot!);
      const compiled=engineering.compile(saved.snapshot!);
      return json(res,200,{project:saved,visualScene,engineering:compiled,selectedVariant:{id:variant.id,rank:variant.rank,score:variant.score}});
    }

    if (req.method === 'GET' && path === '/api/v1/connections/gmail') {
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const connections=await gmailConnectionStore.listConnections(organizationId);
      const enriched=await Promise.all(connections.map(async connection=>({connection,cursor:await gmailConnectionStore.getCursor(connection.connectionId)})));
      return json(res,200,{connectionVersion:GMAIL_CONNECTIONS_VERSION,connections:enriched});
    }

    if (req.method === 'POST' && path === '/api/v1/connections/gmail/oauth/start') {
      const body=await readJson(req);
      googleOAuthClient(); gmailEncryptionKey(); oauthStateSecret();
      const organizationId=String(body.organizationId??DEMO_ORG_ID);
      const returnUrl=String(body.returnUrl??'/?gmail=connected');
      if(!returnUrl.startsWith('/')||returnUrl.startsWith('//')) return json(res,400,{error:'oauth_return_url_must_be_relative'});
      const now=Date.now();
      const state=signOauthState({organizationId,returnUrl,nonce:randomUUID(),issuedAt:now,expiresAt:now+10*60_000},oauthStateSecret());
      const authorizationUrl=googleOAuthClient().buildAuthorizationUrl({state,...(body.loginHint?{loginHint:String(body.loginHint)}:{}),promptConsent:body.promptConsent===true});
      return json(res,200,{authorizationUrl,stateExpiresAt:new Date(now+10*60_000).toISOString(),scopes:[...MAKSTER_GMAIL_SCOPES]});
    }

    if (req.method === 'GET' && path === '/api/v1/connections/gmail/callback') {
      if(url.searchParams.get('error')) return json(res,400,{error:'google_oauth_denied',detail:url.searchParams.get('error')});
      const code=url.searchParams.get('code')??''; const stateToken=url.searchParams.get('state')??'';
      if(!code||!stateToken) return json(res,400,{error:'google_oauth_callback_missing_code_or_state'});
      const state=verifyOauthState(stateToken,oauthStateSecret());
      const token=await googleOAuthClient().exchangeCode(code);
      const gmail=new GmailApiClient(token.accessToken);
      const profile=await gmail.getProfile();
      const existing=(await gmailConnectionStore.listConnections(state.organizationId)).find(c=>c.provider==='gmail'&&c.accountEmail.toLowerCase()===profile.emailAddress.toLowerCase());
      const connectionId=existing?.connectionId??randomUUID(); const now=new Date().toISOString();
      const existingSecret=existing?await gmailConnectionStore.getSecret(existing.connectionId):null;
      let secretRecord=existingSecret;
      if(token.refreshToken){ const encrypted=encryptSecret(token.refreshToken,gmailEncryptionKey(),process.env.MAKSTER_CONNECTION_KEY_VERSION??'v1'); secretRecord={connectionId,refreshToken:encrypted,refreshTokenFingerprintSha256:sha256Secret(token.refreshToken),tokenUpdatedAt:now}; }
      if(!secretRecord) return json(res,409,{error:'google_refresh_token_missing_reconsent_required'});
      const scopes=(token.scope?token.scope.split(/\s+/).filter(Boolean):[...MAKSTER_GMAIL_SCOPES]);
      const connection:GmailConnectionRecord={connectionVersion:GMAIL_CONNECTIONS_VERSION,connectionId,organizationId:state.organizationId,provider:'gmail',accountEmail:profile.emailAddress,scopes,status:'connected',createdAt:existing?.createdAt??now,connectedAt:now,updatedAt:now};
      await gmailConnectionStore.saveConnection(connection,secretRecord);
      let cursor:GmailSyncCursor={connectionVersion:GMAIL_CONNECTIONS_VERSION,connectionId,historyId:profile.historyId,syncStatus:'idle',updatedAt:now};
      const topic=process.env.GOOGLE_GMAIL_PUBSUB_TOPIC;
      if(topic){ const watch=await gmail.watch(topic); cursor={...cursor,historyId:watch.historyId,watchTopic:topic,watchExpirationAt:new Date(Number(watch.expiration)).toISOString(),lastWatchRenewAt:now}; }
      await gmailConnectionStore.saveCursor(cursor);
      if(url.searchParams.get('format')==='json') return json(res,200,{connection,cursor});
      const separator=state.returnUrl.includes('?')?'&':'?'; res.writeHead(302,{location:`${state.returnUrl}${separator}gmailConnected=1&connectionId=${encodeURIComponent(connectionId)}`});res.end();return;
    }

    const gmailWatchRoute=routeMatch(path,/^\/api\/v1\/connections\/gmail\/([^/]+)\/watch$/);
    if(req.method==='POST'&&gmailWatchRoute){ const body=await readJson(req); const auth=await gmailAccessToken(gmailWatchRoute[1]!); const topic=String(body.topicName??process.env.GOOGLE_GMAIL_PUBSUB_TOPIC??''); if(!topic) return json(res,409,{error:'gmail_pubsub_topic_not_configured'}); const watch=await new GmailApiClient(auth.accessToken).watch(topic); const previous=await gmailConnectionStore.getCursor(auth.connection.connectionId); const now=new Date().toISOString(); const cursor={connectionVersion:GMAIL_CONNECTIONS_VERSION,connectionId:auth.connection.connectionId,historyId:previous?.historyId??watch.historyId,watchTopic:topic,watchExpirationAt:new Date(Number(watch.expiration)).toISOString(),lastWatchRenewAt:now,syncStatus:'idle' as const,...(previous?.lastSyncAt?{lastSyncAt:previous.lastSyncAt}:{}),...(previous?.lastFullSyncAt?{lastFullSyncAt:previous.lastFullSyncAt}:{}),updatedAt:now}; await gmailConnectionStore.saveCursor(cursor); return json(res,200,{connectionId:auth.connection.connectionId,cursor}); }

    const gmailSyncRoute=routeMatch(path,/^\/api\/v1\/connections\/gmail\/([^/]+)\/sync$/);
    if(req.method==='POST'&&gmailSyncRoute){ const body=await readJson(req); const result=await runGmailSync(gmailSyncRoute[1]!,body.now?String(body.now):undefined); return json(res,200,result); }

    const gmailDisconnectRoute=routeMatch(path,/^\/api\/v1\/connections\/gmail\/([^/]+)\/disconnect$/);
    if(req.method==='POST'&&gmailDisconnectRoute){ const connection=await gmailConnectionStore.getConnection(gmailDisconnectRoute[1]!); if(!connection) return json(res,404,{error:'gmail_connection_not_found'}); const secret=await gmailConnectionStore.getSecret(connection.connectionId); if(secret){ try{ const refresh=decryptSecret(secret.refreshToken,gmailEncryptionKey()); try{ const access=await googleOAuthClient().refreshAccessToken(refresh); await new GmailApiClient(access.accessToken).stopWatch(); }catch{} try{await googleOAuthClient().revokeToken(refresh);}catch{} }catch{} } const updated:GmailConnectionRecord={...connection,status:'revoked',updatedAt:new Date().toISOString()}; await gmailConnectionStore.updateConnection(updated); return json(res,200,{connection:updated}); }

    if(req.method==='POST'&&path==='/api/v1/connections/gmail/push'){
      const expected=process.env.MAKSTER_GMAIL_PUBSUB_SHARED_SECRET; if(!expected||req.headers['x-makster-pubsub-secret']!==expected) return json(res,401,{error:'gmail_push_unauthorized'});
      const body=await readJson(req); const signal=parseGmailPushNotification(body); const connections=(await gmailConnectionStore.listConnections()).filter(c=>c.status==='connected'&&c.accountEmail.toLowerCase()===signal.emailAddress); const synced=[]; for(const c of connections) synced.push({connectionId:c.connectionId,...await runGmailSync(c.connectionId)}); return json(res,200,{signal,synced});
    }

    if(req.method==='GET'&&path==='/api/v1/procurement/inbox'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      return json(res,200,await currentProcurementInbox(organizationId));
    }

    const inboxDispositionRoute=routeMatch(path,/^\/api\/v1\/procurement\/inbox\/([^/]+)\/disposition$/);
    if(req.method==='POST'&&inboxDispositionRoute){
      const body=await readJson(req); const disposition=String(body.disposition??'') as ProcurementInboxDisposition;
      if(!['new','acknowledged','resolved','dismissed'].includes(disposition)) return json(res,400,{error:'invalid_inbox_disposition'});
      const organizationId=String(body.organizationId??DEMO_ORG_ID); const inbox=await currentProcurementInbox(organizationId); const item=inbox.items.find(x=>x.itemId===inboxDispositionRoute[1]);
      if(!item) return json(res,404,{error:'procurement_inbox_item_not_found'});
      updateInboxDisposition(procurementInboxDispositions,item.sourceKey,disposition);
      return json(res,200,{item:{...item,disposition},summary:await currentProcurementInbox(organizationId)});
    }

    if(req.method==='GET'&&path==='/api/v1/operations/connections/gmail/health'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID; const inbox=await currentProcurementInbox(organizationId); return json(res,200,{inboxVersion:PROCUREMENT_INBOX_VERSION,generatedAt:inbox.generatedAt,connections:inbox.connectionHealth});
    }

    if(req.method==='POST'&&path==='/api/v1/operations/connections/gmail/run'){
      const body=await readJson(req); const organizationId=String(body.organizationId??DEMO_ORG_ID); const now=body.now?String(body.now):new Date().toISOString(); return json(res,200,await runGmailConnectionOperations(organizationId,now));
    }

    if(req.method==='GET'&&path==='/api/v1/owner/notifications'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID; await currentProcurementInbox(organizationId); const notifications=[...ownerNotifications.values()].filter(n=>n.organizationId===organizationId).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)); return json(res,200,{inboxVersion:PROCUREMENT_INBOX_VERSION,notifications});
    }

    const notificationReadRoute=routeMatch(path,/^\/api\/v1\/owner\/notifications\/([^/]+)\/read$/);
    if(req.method==='POST'&&notificationReadRoute){ const n=ownerNotifications.get(notificationReadRoute[1]!); if(!n) return json(res,404,{error:'owner_notification_not_found'}); const updated={...n,readAt:new Date().toISOString()}; ownerNotifications.set(updated.notificationId,updated); return json(res,200,updated); }

    if (req.method === 'POST' && path === '/api/v1/manufacturing/bxf/inspect') {
      const body = await readJson(req);
      const xml = String(body.xml ?? '');
      if (!xml) return json(res, 400, { error: 'missing_bxf_xml' });
      const report = inspectBxf({
        fileName: String(body.fileName ?? 'upload.bxf'),
        xml,
        adapters: [new MaksterFixtureBxfAdapter()],
      });
      return json(res, report.status === 'rejected' ? 422 : 200, report);
    }

    const engineeringWithBxf = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/engineering\/with-bxf$/);
    if (req.method === 'POST' && engineeringWithBxf) {
      const body = await readJson(req);
      const project = await repository.getProject(engineeringWithBxf[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const xml = String(body.xml ?? '');
      if (!xml) return json(res, 400, { error: 'missing_bxf_xml' });
      const report = inspectBxf({
        fileName: String(body.fileName ?? 'upload.bxf'),
        xml,
        adapters: [new MaksterFixtureBxfAdapter()],
      });
      const profiles = report.adapter?.manufacturingProfiles ?? [];
      const compiler = profiles.length > 0
        ? new MaksterEngineeringCompiler(new ImportedManufacturingDataProvider(profiles))
        : engineering;
      const result = compiler.compile(project.snapshot);
      return json(res, 200, { bxf: report, engineering: result });
    }



    const releasePreview = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/manufacturing\/release-preview$/);
    if (req.method === 'POST' && releasePreview) {
      const body = await readJson(req);
      const project = await repository.getProject(releasePreview[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const context = compileManufacturingContext(project.snapshot, body);
      const release = buildReleasePackage({ engineering: context.engineering, ...(context.bxfReport ? { bxfReport: context.bxfReport } : {}), ...(body.releaseId ? { releaseId: String(body.releaseId) } : {}) });
      return json(res, 200, { manifest: release.manifest, generatedFiles: Object.keys(release.files).sort() });
    }

    const lifecycleGateRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/lifecycle-release-gate$/);
    if(req.method==='GET'&&lifecycleGateRoute){
      const current=await repository.getProject(lifecycleGateRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      const eng=engineering.compile(current.snapshot);
      return json(res,200,buildProjectLifecycleReleaseGate(current.snapshot,eng));
    }

    const clientShareListRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/client-share-links$/);
    if(req.method==='GET'&&clientShareListRoute){
      const current=await repository.getProject(clientShareListRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,{version:'3.4.0',links:listClientShareLinks(current.snapshot)});
    }
    if(req.method==='POST'&&clientShareListRoute){
      const body=await readJson(req),current=await repository.getProject(clientShareListRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      if(!current.snapshot.clientPortal?.enabled)return json(res,409,{error:'client_portal_disabled'});
      if(body.expiresAt){
        const expires=Date.parse(String(body.expiresAt));
        if(!Number.isFinite(expires)||expires<=Date.now())return json(res,400,{error:'client_share_expiry_must_be_future'});
      }
      const result=createClientShareLink(current.snapshot,{
        createdBy:String(body.createdBy??'owner'),
        ...(body.expiresAt?{expiresAt:String(body.expiresAt)}:{}),
        oneTime:body.oneTime===true,
        allowApprovalResponses:body.allowApprovalResponses!==false,
        ...(body.label?{label:String(body.label)}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{
        clientShareVersion:'3.4.0',project:created,
        link:listClientShareLinks(result.snapshot).find(x=>x.id===result.link.id),
        rawToken:result.rawToken,
        sharePath:`/client/${encodeURIComponent(current.id)}#${result.rawToken}`
      });
    }
    const clientShareRevokeRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/client-share-links\/([^/]+)\/revoke$/);
    if(req.method==='POST'&&clientShareRevokeRoute){
      const body=await readJson(req),current=await repository.getProject(clientShareRevokeRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=revokeClientShareLink(current.snapshot,clientShareRevokeRoute[2]!);
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{clientShareVersion:'3.4.0',project:created,links:listClientShareLinks(result.snapshot)});
    }

    const publicClientPage=routeMatch(path,/^\/client\/([^/]+)$/);
    if(req.method==='GET'&&publicClientPage){
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"});
      res.end(clientShareHtml(publicClientPage[1]!));return;
    }

    const publicClientApi=routeMatch(path,/^\/api\/v1\/public\/client\/([^/]+)$/);
    if(req.method==='GET'&&publicClientApi){
      if(!allowClientShareRequest(req,60))return json(res,429,{error:'rate_limited'});
      try{
        const rawToken=String(req.headers['x-client-share-token']??'');
        const current=await repository.getProjectPrivileged(publicClientApi[1]!);
        if(!current?.snapshot||!rawToken)return json(res,404,{error:'invalid_share_link'});
        const validation=validateClientShareToken(current.snapshot,rawToken);
        if(!validation.ok)return json(res,404,{error:'invalid_share_link'});
        const view=buildClientPortalView(current.snapshot);
        const approvalScope=new Set(validation.link.approvalIds??[]);
        const approvals=validation.link.allowApprovalResponses?view.approvals.filter(a=>approvalScope.has(a.id)):view.approvals;
        return json(res,200,{...view,approvals,pendingApprovalCount:approvals.filter(a=>a.status==='pending').length,sharePermissions:{allowApprovalResponses:validation.link.allowApprovalResponses,oneTime:Boolean(validation.link.oneTime),approvalCount:approvalScope.size}});
      }catch{return json(res,404,{error:'invalid_share_link'})}
    }

    const publicClientRespond=routeMatch(path,/^\/api\/v1\/public\/client\/([^/]+)\/approvals\/([^/]+)\/respond$/);
    if(req.method==='POST'&&publicClientRespond){
      if(!allowClientShareRequest(req,12))return json(res,429,{error:'rate_limited'});
      try{
        const body=await readJson(req),rawToken=String(req.headers['x-client-share-token']??'');
        const current=await repository.getProjectPrivileged(publicClientRespond[1]!);
        if(!current?.snapshot||!rawToken)return json(res,404,{error:'invalid_share_link'});
        const validation=validateClientShareToken(current.snapshot,rawToken);
        if(!validation.ok||!validation.link.allowApprovalResponses)return json(res,404,{error:'invalid_share_link'});
        if(!(validation.link.approvalIds??[]).includes(publicClientRespond[2]!))return json(res,404,{error:'invalid_share_link'});
        if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
        const result=respondToClientApproval(current.snapshot,publicClientRespond[2]!,{
          approved:body.approved===true,
          respondedBy:current.snapshot.jobControl?.client.name??'client-via-share',
          ...(body.comment!=null?{comment:String(body.comment)}:{})
        });
        if(validation.link.oneTime){
          const link=result.snapshot.clientShareLinks?.find(x=>x.id===validation.link.id);
          if(link)link.usedAt=new Date().toISOString();
        }
        const created=await repository.createRevisionPrivileged({
          organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
          snapshot:result.snapshot,changeSet:null,source:'client'
        });
        return json(res,201,{clientShareVersion:'3.4.0',revision:created.snapshot?.revision,approval:result.request});
      }catch(e){
        const message=e instanceof Error?e.message:String(e);
        if(message==='client_approval_not_pending')return json(res,409,{error:message});
        return json(res,404,{error:'invalid_share_link'});
      }
    }

    const clientPortalRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/client-portal$/);
    if(req.method==='GET'&&clientPortalRoute){
      const current=await repository.getProject(clientPortalRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,buildClientPortalView(current.snapshot));
    }
    if(req.method==='POST'&&clientPortalRoute){
      const body=await readJson(req),current=await repository.getProject(clientPortalRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const snapshot=updateClientPortal(current.snapshot,{
        ...(body.enabled!=null?{enabled:body.enabled===true}:{}),
        ...(body.publicTitle!=null?{publicTitle:String(body.publicTitle)}:{}),
        ...(body.welcomeText!=null?{welcomeText:String(body.welcomeText)}:{}),
        ...(body.showContractValue!=null?{showContractValue:body.showContractValue===true}:{}),
        ...(body.showPayments!=null?{showPayments:body.showPayments===true}:{}),
        ...(body.showTargetDates!=null?{showTargetDates:body.showTargetDates===true}:{}),
        ...(body.showMilestones!=null?{showMilestones:body.showMilestones===true}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{clientPortalVersion:'3.4.0',project:created,clientPortal:buildClientPortalView(snapshot)});
    }

    const clientApprovalRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/client-approvals$/);
    if(req.method==='POST'&&clientApprovalRoute){
      const body=await readJson(req),current=await repository.getProject(clientApprovalRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=createClientApprovalRequest(current.snapshot,{
        kind:String(body.kind??'design') as any,
        title:String(body.title??''),
        description:String(body.description??''),
        requestedBy:String(body.requestedBy??'designer'),
        ...(body.clientAmountMinor!=null?{clientAmountMinor:Number(body.clientAmountMinor)}:{}),
        ...(Array.isArray(body.targetIds)?{targetIds:body.targetIds.map(String)}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{clientPortalVersion:'3.4.0',project:created,request:result.request,clientPortal:buildClientPortalView(result.snapshot)});
    }

    const clientApprovalRespondRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/client-approvals\/([^/]+)\/respond$/);
    if(req.method==='POST'&&clientApprovalRespondRoute){
      const body=await readJson(req),current=await repository.getProject(clientApprovalRespondRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=respondToClientApproval(current.snapshot,clientApprovalRespondRoute[2]!,{
        approved:body.approved===true,
        respondedBy:String(body.respondedBy??'client'),
        ...(body.comment!=null?{comment:String(body.comment)}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'client'
      },bearer(req));
      const eng=result.snapshot.furniture.length?engineering.compile(result.snapshot):null;
      return json(res,201,{
        clientPortalVersion:'3.4.0',project:created,request:result.request,
        clientPortal:buildClientPortalView(result.snapshot),
        jobControl:buildJobControlReport(result.snapshot,eng)
      });
    }

    const clientApprovalCancelRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/client-approvals\/([^/]+)\/cancel$/);
    if(req.method==='POST'&&clientApprovalCancelRoute){
      const body=await readJson(req),current=await repository.getProject(clientApprovalCancelRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=cancelClientApproval(current.snapshot,clientApprovalCancelRoute[2]!);
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{clientPortalVersion:'3.4.0',project:created,request:result.request,clientPortal:buildClientPortalView(result.snapshot)});
    }

    const costingRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/costing$/);
    if(req.method==='GET'&&costingRoute){
      const current=await repository.getProject(costingRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,buildCostingReport(current.snapshot));
    }
    const costEntryRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/cost-entries$/);
    if(req.method==='POST'&&costEntryRoute){
      const body=await readJson(req),current=await repository.getProject(costEntryRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=addProjectCostEntry(current.snapshot,{
        category:String(body.category??'other') as any,
        basis:body.basis==='actual'?'actual':'estimate',
        description:String(body.description??''),
        amountMinor:Number(body.amountMinor??0),
        createdBy:String(body.createdBy??'owner'),
        ...(body.note?{note:String(body.note)}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{costingVersion:'3.2.0',project:created,entry:result.entry,costing:result.report});
    }
    const costEntryDeleteRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/cost-entries\/([^/]+)\/delete$/);
    if(req.method==='POST'&&costEntryDeleteRoute){
      const body=await readJson(req),current=await repository.getProject(costEntryDeleteRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=deleteProjectCostEntry(current.snapshot,costEntryDeleteRoute[2]!);
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{costingVersion:'3.2.0',project:created,costing:result.report});
    }

    const purchasingRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/purchasing$/);
    if(req.method==='GET'&&purchasingRoute){
      const current=await repository.getProject(purchasingRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      const eng=engineering.compile(current.snapshot);
      return json(res,200,buildPurchasingReport(current.snapshot,eng));
    }
    const purchaseOrderRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/purchase-orders$/);
    if(req.method==='POST'&&purchaseOrderRoute){
      const body=await readJson(req),current=await repository.getProject(purchaseOrderRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=createPurchaseOrder(current.snapshot,{supplierName:String(body.supplierName??''),createdBy:String(body.createdBy??'buyer'),currency:body.currency?String(body.currency):undefined,lines:Array.isArray(body.lines)?body.lines:[],note:body.note?String(body.note):undefined,expectedAt:body.expectedAt?String(body.expectedAt):undefined});
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{purchasingVersion:'3.1.0',project:created,order:result.order,purchasing:buildPurchasingReport(result.snapshot,engineering.compile(result.snapshot))});
    }
    const purchaseStatusRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/purchase-orders\/([^/]+)\/status$/);
    if(req.method==='POST'&&purchaseStatusRoute){
      const body=await readJson(req),current=await repository.getProject(purchaseStatusRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=updatePurchaseOrderStatus(current.snapshot,purchaseStatusRoute[2]!,{status:String(body.status??'draft') as any,actor:String(body.actor??'buyer'),supplierReference:body.supplierReference?String(body.supplierReference):undefined,expectedAt:body.expectedAt?String(body.expectedAt):undefined});
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{purchasingVersion:'3.1.0',project:created,order:result.order,purchasing:buildPurchasingReport(result.snapshot,engineering.compile(result.snapshot))});
    }
    const receiveLineRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/purchase-orders\/([^/]+)\/lines\/([^/]+)\/receive$/);
    if(req.method==='POST'&&receiveLineRoute){
      const body=await readJson(req),current=await repository.getProject(receiveLineRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=receivePurchaseLine(current.snapshot,receiveLineRoute[2]!,receiveLineRoute[3]!,Number(body.quantity??0));
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{purchasingVersion:'3.1.0',project:created,order:result.order,purchasing:buildPurchasingReport(result.snapshot,engineering.compile(result.snapshot))});
    }

    const jobControlRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/job-control$/);
    if(req.method==='GET'&&jobControlRoute){
      const current=await repository.getProject(jobControlRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      const eng=current.snapshot.furniture.length?engineering.compile(current.snapshot):null;
      return json(res,200,buildJobControlReport(current.snapshot,eng));
    }
    if(req.method==='POST'&&jobControlRoute){
      const body=await readJson(req),current=await repository.getProject(jobControlRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const snapshot=updateJobControl(current.snapshot,{
        ...(body.stage?{stage:String(body.stage) as any}:{}),
        ...(body.client?{client:body.client}:{}),
        ...(body.money?{money:body.money}:{}),
        ...('targetDeliveryAt' in body?{targetDeliveryAt:body.targetDeliveryAt==null?null:String(body.targetDeliveryAt)}:{}),
        ...('targetInstallationAt' in body?{targetInstallationAt:body.targetInstallationAt==null?null:String(body.targetInstallationAt)}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const eng=snapshot.furniture.length?engineering.compile(snapshot):null;
      return json(res,201,{jobControlVersion:'3.0.0',project:created,jobControl:buildJobControlReport(snapshot,eng)});
    }

    const jobMilestoneRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/job-control\/milestones$/);
    if(req.method==='POST'&&jobMilestoneRoute){
      const body=await readJson(req),current=await repository.getProject(jobMilestoneRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const snapshot=setJobMilestone(current.snapshot,{code:String(body.code??''),title:String(body.title??''),status:String(body.status??'pending') as any,...(body.note?{note:String(body.note)}:{}),...(body.dueAt?{dueAt:String(body.dueAt)}:{})});
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const eng=snapshot.furniture.length?engineering.compile(snapshot):null;
      return json(res,201,{jobControlVersion:'3.0.0',project:created,jobControl:buildJobControlReport(snapshot,eng)});
    }

    const closeoutRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installation-closeout$/);
    if(req.method==='GET'&&closeoutRoute){
      const current=await repository.getProject(closeoutRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,buildInstallationCloseoutReport(current.snapshot));
    }
    const punchRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/punch-list$/);
    if(req.method==='POST'&&punchRoute){
      const body=await readJson(req),current=await repository.getProject(punchRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=addPunchItem(current.snapshot,{severity:body.severity==='major'?'major':'minor',title:String(body.title??''),detail:String(body.detail??''),createdBy:String(body.createdBy??'installer'),...(body.targetFurnitureId?{targetFurnitureId:String(body.targetFurnitureId)}:{})});
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{closeoutVersion:'2.9.3',project:created,item:result.item,closeout:buildInstallationCloseoutReport(result.snapshot)});
    }
    const punchCloseRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/punch-list\/([^/]+)\/close$/);
    if(req.method==='POST'&&punchCloseRoute){
      const body=await readJson(req),current=await repository.getProject(punchCloseRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=closePunchItem(current.snapshot,punchCloseRoute[2]!,String(body.closedBy??'installer'));
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{closeoutVersion:'2.9.3',project:created,item:result.item,closeout:buildInstallationCloseoutReport(result.snapshot)});
    }
    const handoverRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installation-handover\/sign$/);
    if(req.method==='POST'&&handoverRoute){
      const body=await readJson(req),current=await repository.getProject(handoverRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      try{
        const result=signInstallationHandover(current.snapshot,{signedBy:String(body.signedBy??'client'),...(body.installerName?{installerName:String(body.installerName)}:{}),...(body.clientName?{clientName:String(body.clientName)}:{}),...(body.notes?{notes:String(body.notes)}:{})});
        const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
        return json(res,201,{closeoutVersion:'2.9.3',project:created,handover:result.handover,closeout:buildInstallationCloseoutReport(result.snapshot)});
      }catch(e){return json(res,409,{error:e instanceof Error?e.message:String(e),closeout:buildInstallationCloseoutReport(current.snapshot)})}
    }

    const siteChangeRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/site-change-requests$/);
    if(req.method==='POST'&&siteChangeRoute){
      const body=await readJson(req),current=await repository.getProject(siteChangeRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=proposeSiteChange(current.snapshot,{title:String(body.title??''),reason:String(body.reason??''),requestedBy:String(body.requestedBy??'installer'),targetFurnitureId:String(body.targetFurnitureId??''),...(body.xMm!=null?{xMm:Number(body.xMm)}:{}),...(body.yMm!=null?{yMm:Number(body.yMm)}:{}),...(body.zMm!=null?{zMm:Number(body.zMm)}:{})});
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{siteChangeVersion:'2.9.2',project:created,visualScene:buildVisualScene(result.snapshot),request:result.request});
    }
    const siteChangeReviewRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/site-change-requests\/([^/]+)\/review$/);
    if(req.method==='POST'&&siteChangeReviewRoute){
      const body=await readJson(req),current=await repository.getProject(siteChangeReviewRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=reviewSiteChange(current.snapshot,siteChangeReviewRoute[2]!,{approved:body.approved===true,reviewedBy:String(body.reviewedBy??'designer')});
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      return json(res,201,{siteChangeVersion:'2.9.2',project:created,visualScene:buildVisualScene(result.snapshot),request:result.request});
    }
    const siteChangeApplyRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/site-change-requests\/([^/]+)\/apply$/);
    if(req.method==='POST'&&siteChangeApplyRoute){
      const body=await readJson(req),current=await repository.getProject(siteChangeApplyRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=applyApprovedSiteChange(current.snapshot,siteChangeApplyRoute[2]!,String(body.appliedBy??'installer'));
      const created=await repository.createRevision({organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,snapshot:result.snapshot,changeSet:null,source:'manual'},bearer(req));
      const eng=result.snapshot.furniture.length?engineering.compile(result.snapshot):null;
      return json(res,201,{siteChangeVersion:'2.9.2',project:created,visualScene:buildVisualScene(result.snapshot),engineering:eng,request:result.request,before:result.before,after:result.after});
    }

    const installerModeRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installer-mode$/);
    if(req.method==='GET'&&installerModeRoute){
      const project=await repository.getProject(installerModeRoute[1]!,bearer(req));
      if(!project?.snapshot)return json(res,404,{error:'project_not_found'});
      return json(res,200,buildInstallerModeReport(project.snapshot));
    }

    const installerIssueRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installer-issues$/);
    if(req.method==='POST'&&installerIssueRoute){
      const body=await readJson(req);
      const current=await repository.getProject(installerIssueRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=reportInstallationSiteIssue(current.snapshot,{
        severity:String(body.severity??'warning') as any,
        title:String(body.title??''),detail:String(body.detail??''),reportedBy:String(body.reportedBy??'installer'),
        ...(body.targetFurnitureId?{targetFurnitureId:String(body.targetFurnitureId)}:{}),
        ...(body.targetModuleId?{targetModuleId:String(body.targetModuleId)}:{})
      });
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const eng=result.snapshot.furniture.length?engineering.compile(result.snapshot):null;
      return json(res,201,{installerModeVersion:'2.9.1',project:created,visualScene:buildVisualScene(result.snapshot),engineering:eng,issue:result.issue,installerMode:buildInstallerModeReport(result.snapshot)});
    }

    const installerIssueResolveRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installer-issues\/([^/]+)\/resolve$/);
    if(req.method==='POST'&&installerIssueResolveRoute){
      const body=await readJson(req);
      const current=await repository.getProject(installerIssueResolveRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=resolveInstallationSiteIssue(current.snapshot,installerIssueResolveRoute[2]!,String(body.resolvedBy??'installer'));
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const eng=result.snapshot.furniture.length?engineering.compile(result.snapshot):null;
      return json(res,201,{installerModeVersion:'2.9.1',project:created,visualScene:buildVisualScene(result.snapshot),engineering:eng,issue:result.issue,installerMode:buildInstallerModeReport(result.snapshot)});
    }

    const installationDecisionRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installation-decisions$/);
    if(req.method==='POST'&&installationDecisionRoute){
      const body=await readJson(req);
      if(body.approved!==true)return json(res,409,{error:'explicit_installation_decision_approval_required'});
      const current=await repository.getProject(installationDecisionRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=recordInstallationDecision(current.snapshot,{
        suggestionId:String(body.suggestionId??''),approvedBy:String(body.approvedBy??'user'),
        ...(body.note?{note:String(body.note)}:{})
      });
      const validation=validateProjectModel(result.snapshot);
      if(!validation.ok)return json(res,422,{error:'installation_decision_invalid_project',details:validation.errors});
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const eng=result.snapshot.furniture.length?engineering.compile(result.snapshot):null;
      return json(res,201,{decisionVersion:'2.9.0',project:created,visualScene:buildVisualScene(result.snapshot),engineering:eng,decision:result.decision,installationCheck:analyzeInstallationCollisions(result.snapshot)});
    }

    const installationDecisionCompleteRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/installation-decisions\/([^/]+)\/complete$/);
    if(req.method==='POST'&&installationDecisionCompleteRoute){
      const body=await readJson(req);
      const current=await repository.getProject(installationDecisionCompleteRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const result=completeInstallationDecision(current.snapshot,installationDecisionCompleteRoute[2]!,String(body.completedBy??'user'));
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:result.snapshot,changeSet:null,source:'manual'
      },bearer(req));
      const eng=result.snapshot.furniture.length?engineering.compile(result.snapshot):null;
      return json(res,201,{decisionVersion:'2.9.0',project:created,visualScene:buildVisualScene(result.snapshot),engineering:eng,decision:result.decision});
    }

    const conflictResolutionRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/conflict-resolution$/);
    if (req.method === 'GET' && conflictResolutionRoute) {
      const project = await repository.getProject(conflictResolutionRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      return json(res, 200, buildConflictResolutionReport(project.snapshot));
    }

    const conflictResolutionApplyRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/conflict-resolution\/apply$/);
    if (req.method === 'POST' && conflictResolutionApplyRoute) {
      const body=await readJson(req);
      if(body.approved!==true)return json(res,409,{error:'explicit_conflict_resolution_approval_required'});
      const current=await repository.getProject(conflictResolutionApplyRoute[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(body.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const report=buildConflictResolutionReport(current.snapshot);
      const suggestion=report.suggestions.find(x=>x.id===String(body.suggestionId??''));
      if(!suggestion?.safeToAutoApply||!suggestion.visualCommand)return json(res,409,{error:'conflict_resolution_not_auto_applicable'});
      const changeSet=compileVisualCommand(current.snapshot,suggestion.visualCommand as VisualEditorCommand);
      const next=applyProjectChangeSet(current.snapshot,changeSet);
      const before=analyzeInstallationCollisions(current.snapshot);
      const after=analyzeInstallationCollisions(next);
      if(after.blockingCount>=before.blockingCount)return json(res,409,{error:'conflict_resolution_no_longer_improves_project'});
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot:next,changeSet,source:'manual'
      },bearer(req));
      const eng=next.furniture.length?engineering.compile(next):null;
      return json(res,201,{resolutionVersion:'2.8.9',project:created,visualScene:buildVisualScene(next),engineering:eng,before,after,suggestion});
    }

    const installationCheckRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/installation-check$/);
    if (req.method === 'GET' && installationCheckRoute) {
      const project = await repository.getProject(installationCheckRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      return json(res, 200, analyzeInstallationCollisions(project.snapshot));
    }

    const measurementCompletenessRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/room-measurement-completeness$/);
    if (req.method === 'GET' && measurementCompletenessRoute) {
      const project = await repository.getProject(measurementCompletenessRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      return json(res, 200, analyzeRoomMeasurementCompleteness(project.snapshot));
    }

    const productionReadinessRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/production-readiness$/);
    if (req.method === 'GET' && productionReadinessRoute) {
      const project = await repository.getProject(productionReadinessRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const context = compileManufacturingContext(project.snapshot, {});
      return json(res, 200, analyzeProductionReadiness(project.snapshot, context.engineering));
    }

    const productionPackRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/production-pack\/preview$/);
    if (req.method === 'POST' && productionPackRoute) {
      const body = await readJson(req);
      const project = await repository.getProject(productionPackRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const context = compileManufacturingContext(project.snapshot, body);
      const readiness = analyzeProductionReadiness(project.snapshot, context.engineering);
      if (!readiness.productionReady) {
        return json(res, 409, { error: 'production_readiness_hold', readiness });
      }
      const route = (body.route === 'outsource' ? 'outsource' : 'manual_workshop') as ProductionRoute;
      const outsourcePreset = String(body.outsourcePreset ?? 'cutting_edging_drilling') as OutsourcePreset;
      if (route === 'outsource' && outsourcePreset === 'cutting_edging_drilling' && !readiness.cncReady) {
        return json(res, 409, { error: 'cnc_readiness_hold', readiness });
      }
      const pack = buildProductionPack({
        project: project.snapshot,
        engineering: context.engineering,
        route,
        ...(route === 'outsource' ? { outsourcePreset } : {}),
        ...(body.supplierName ? { supplierName: String(body.supplierName) } : {}),
        ...(body.orderReference ? { orderReference: String(body.orderReference) } : {}),
      });
      return json(res, 200, {
        manifest: pack.manifest,
        generatedFiles: Object.keys(pack.files).sort(),
      });
    }


    const commercialEstimateRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/commercial\/estimate-preview$/);
    if (req.method === 'POST' && commercialEstimateRoute) {
      const body=await readJson(req);
      const project=await repository.getProject(commercialEstimateRoute[1]!,bearer(req));
      if(!project?.snapshot) return json(res,404,{error:'project_not_found'});
      const context=compileManufacturingContext(project.snapshot,body);
      const productionRoute=(body.productionRoute==='outsource'?'outsource':'manual_workshop') as ProductionRoute;
      const outsourcePreset=String(body.outsourcePreset??'cutting_edging') as OutsourcePreset;
      const pack=buildProductionPack({project:project.snapshot,engineering:context.engineering,route:productionRoute,...(productionRoute==='outsource'?{outsourcePreset}:{})});
      let pricing=commercialPricingFromBody(project.snapshot.currency,body);
      pricing=enrichPricingWithSupplierQuote(pricing,body.selectedSupplierQuoteId?String(body.selectedSupplierQuoteId):undefined);
      const estimate=buildCommercialEstimate({project:project.snapshot,engineering:context.engineering,productionPack:pack,pricing,estimateVersion:(await businessStore.countProjectQuotes(project.id))+1});
      return json(res,estimate.ready?200:409,{estimate,productionPack:pack.manifest,pricingProfile:{profileId:pricing.profileId,name:pricing.name,currency:pricing.currency,demo:pricing.profileId.startsWith('TEST_ONLY_')}});
    }

    const commercialQuoteCreateRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/commercial\/quotes$/);
    if (req.method === 'POST' && commercialQuoteCreateRoute) {
      const body=await readJson(req);
      const project=await repository.getProject(commercialQuoteCreateRoute[1]!,bearer(req));
      if(!project?.snapshot) return json(res,404,{error:'project_not_found'});
      const context=compileManufacturingContext(project.snapshot,body);
      const productionRoute=(body.productionRoute==='outsource'?'outsource':'manual_workshop') as ProductionRoute;
      const outsourcePreset=String(body.outsourcePreset??'cutting_edging') as OutsourcePreset;
      const pack=buildProductionPack({project:project.snapshot,engineering:context.engineering,route:productionRoute,...(productionRoute==='outsource'?{outsourcePreset}:{})});
      let pricing=commercialPricingFromBody(project.snapshot.currency,body);
      pricing=enrichPricingWithSupplierQuote(pricing,body.selectedSupplierQuoteId?String(body.selectedSupplierQuoteId):undefined);
      const quoteVersion=(await businessStore.countProjectQuotes(project.id))+1;
      const quoteTerms=body.quoteTerms??{};
      if(!quoteTerms.clientName) return json(res,422,{error:'client_name_required'});
      const built=buildCommercialPackage({project:project.snapshot,engineering:context.engineering,productionPack:pack,pricing,estimateVersion:quoteVersion,quoteVersion,quoteTerms:{clientName:String(quoteTerms.clientName),...(quoteTerms.clientCompany?{clientCompany:String(quoteTerms.clientCompany)}:{}),...(quoteTerms.validityDays!=null?{validityDays:Number(quoteTerms.validityDays)}:{}),...(quoteTerms.leadTimeText?{leadTimeText:String(quoteTerms.leadTimeText)}:{}),...(Array.isArray(quoteTerms.paymentTerms)?{paymentTerms:quoteTerms.paymentTerms}:{}),...(Array.isArray(quoteTerms.inclusions)?{inclusions:quoteTerms.inclusions.map(String)}:{}),...(Array.isArray(quoteTerms.exclusions)?{exclusions:quoteTerms.exclusions.map(String)}:{}),...(Array.isArray(quoteTerms.notes)?{notes:quoteTerms.notes.map(String)}:{}),sellerName:String(quoteTerms.sellerName??'Makster Atelier'),...(quoteTerms.sellerEmail?{sellerEmail:String(quoteTerms.sellerEmail)}:{}),...(quoteTerms.sellerPhone?{sellerPhone:String(quoteTerms.sellerPhone)}:{})}});
      if(!built.estimate.ready) return json(res,409,{error:'commercial_estimate_not_ready',estimate:built.estimate});
      await businessStore.saveCommercialPackage({organizationId:project.organizationId,built,status:'draft',context:{pricing:structuredClone(pricing),quoteTerms:clientQuoteTermsFromQuote(built.quote),productionRoute,...(productionRoute==='outsource'?{outsourcePreset}:{})}});
      return json(res,201,{quote:built.quote,lifecycleStatus:'draft',estimate:built.estimate,manifest:built.manifest,generatedFiles:Object.keys(built.files).sort(),pricingProfile:{profileId:pricing.profileId,name:pricing.name,demo:pricing.profileId.startsWith('TEST_ONLY_')}});
    }

    const commercialQuoteGetRoute = routeMatch(path, /^\/api\/v1\/commercial\/quotes\/([^/]+)$/);
    if (req.method === 'GET' && commercialQuoteGetRoute) {
      const built=await businessStore.getCommercialPackage(commercialQuoteGetRoute[1]!); if(!built) return json(res,404,{error:'commercial_quote_not_found'});
      await requireProjectAccess(built.quote.projectId,req);
      return json(res,200,{quote:built.quote,lifecycleStatus:await businessStore.getQuoteStatus(built.quote.quoteId)??'draft',manifest:built.manifest});
    }
    const commercialQuoteStatusRoute = routeMatch(path, /^\/api\/v1\/commercial\/quotes\/([^/]+)\/status$/);
    if (req.method === 'POST' && commercialQuoteStatusRoute) {
      const body=await readJson(req); const built=await businessStore.getCommercialPackage(commercialQuoteStatusRoute[1]!); if(!built) return json(res,404,{error:'commercial_quote_not_found'});
      const authorizedProject=await requireProjectAccess(built.quote.projectId,req);
      const next=String(body.status) as CommercialQuoteStatus; const allowed:CommercialQuoteStatus[]=['draft','approved','sent','accepted','rejected','expired','superseded']; if(!allowed.includes(next)) return json(res,422,{error:'invalid_commercial_quote_status'}); const current=await businessStore.getQuoteStatus(built.quote.quoteId)??'draft'; if(!quoteTransitionAllowed(current,next)) return json(res,409,{error:'invalid_commercial_quote_transition',from:current,to:next});
      await businessStore.setQuoteStatus({organizationId:authorizedProject.organizationId,quoteId:built.quote.quoteId,status:next,createdAt:new Date().toISOString()}); return json(res,200,{quoteId:built.quote.quoteId,status:next,quoteFingerprint:built.quote.quoteFingerprint});
    }
    const commercialFileRoute = routeMatch(path, /^\/api\/v1\/commercial\/quotes\/([^/]+)\/files\/([^/]+)$/);
    if (req.method === 'GET' && commercialFileRoute) {
      const built=await businessStore.getCommercialPackage(commercialFileRoute[1]!); if(!built) return json(res,404,{error:'commercial_quote_not_found'});
      await requireProjectAccess(built.quote.projectId,req);
      const name=decodeURIComponent(commercialFileRoute[2]!); const content=built.files[name]; if(content==null) return json(res,404,{error:'commercial_file_not_found'});
      const meta=built.manifest.files.find(f=>f.name===name); res.writeHead(200,{'content-type':meta?.mediaType??'text/plain; charset=utf-8','x-content-sha256':meta?.sha256??''}); res.end(content); return;
    }



    if (req.method === 'GET' && commercialQuoteCreateRoute) {
      const project=await repository.getProject(commercialQuoteCreateRoute[1]!,bearer(req));
      if(!project?.snapshot) return json(res,404,{error:'project_not_found'});
      const quotes=await businessStore.listProjectQuotes(project.id);
      return json(res,200,{projectId:project.id,quotes:quotes.map(x=>({quote:x.built.quote,lifecycleStatus:x.status,lineage:x.lineage??null}))});
    }

    const changeCompareRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/changes\/compare$/);
    if(req.method==='POST'&&changeCompareRoute){
      const body=await readJson(req); const project=await repository.getProject(changeCompareRoute[1]!,bearer(req)); if(!project?.snapshot)return json(res,404,{error:'project_not_found'});
      const toRevision=Number(body.toRevision??project.snapshot.revision); const fromRevision=Number(body.fromRevision??Math.max(1,toRevision-1));
      const beforeRecord=await repository.getRevision(project.id,fromRevision,bearer(req)); const afterRecord=await repository.getRevision(project.id,toRevision,bearer(req)); if(!beforeRecord||!afterRecord)return json(res,404,{error:'project_revision_not_found',fromRevision,toRevision});
      const beforeEngineering=engineering.compile(beforeRecord.snapshot),afterEngineering=engineering.compile(afterRecord.snapshot); const beforeQuote=body.baseQuoteId?await businessStore.getCommercialPackage(String(body.baseQuoteId)):undefined; const afterQuote=body.previewQuoteId?await businessStore.getCommercialPackage(String(body.previewQuoteId)):undefined;
      const report=compareRevisions({beforeProject:beforeRecord.snapshot,afterProject:afterRecord.snapshot,beforeEngineering,afterEngineering,...(beforeQuote?{beforeQuote}:{}),...(afterQuote?{afterQuote}:{}),generatedAt:new Date().toISOString()}); await businessStore.saveChangeReport({organizationId:project.organizationId,report,...(beforeQuote?{baseQuoteId:beforeQuote.quote.quoteId}:{}),...(afterQuote?{requoteId:afterQuote.quote.quoteId}:{})});
      const customerSummary=beforeQuote&&afterQuote?buildCustomerChangeSummary(report,beforeQuote,afterQuote):null;
      return json(res,200,{report,customerSummary,...(customerSummary?{customerSummaryHtml:customerChangeSummaryHtml(customerSummary)}:{})});
    }

    const requoteRoute=routeMatch(path,/^\/api\/v1\/commercial\/quotes\/([^/]+)\/requote$/);
    if(req.method==='POST'&&requoteRoute){
      const body=await readJson(req); const basePackage=await businessStore.getCommercialPackage(requoteRoute[1]!); if(!basePackage)return json(res,404,{error:'commercial_quote_not_found'}); const context=await businessStore.getQuoteContext(basePackage.quote.quoteId); if(!context)return json(res,409,{error:'commercial_quote_context_missing'});
      const project=await repository.getProject(basePackage.quote.projectId,bearer(req)); if(!project?.snapshot)return json(res,404,{error:'project_not_found'}); const toRevision=Number(body.toRevision??project.snapshot.revision); if(toRevision<=basePackage.quote.revision)return json(res,409,{error:'requote_requires_newer_revision',fromRevision:basePackage.quote.revision,toRevision});
      const beforeRecord=await repository.getRevision(project.id,basePackage.quote.revision,bearer(req)); const afterRecord=await repository.getRevision(project.id,toRevision,bearer(req)); if(!beforeRecord||!afterRecord)return json(res,404,{error:'project_revision_not_found'}); const beforeEngineering=engineering.compile(beforeRecord.snapshot),afterEngineering=engineering.compile(afterRecord.snapshot); if(!afterEngineering.readyForProduction)return json(res,409,{error:'target_revision_not_production_ready',engineering:afterEngineering});
      const pack=buildProductionPack({project:afterRecord.snapshot,engineering:afterEngineering,route:context.productionRoute,...(context.productionRoute==='outsource'&&context.outsourcePreset?{outsourcePreset:context.outsourcePreset}:{})}); const quoteVersion=(await businessStore.countProjectQuotes(project.id))+1;
      const rq=requote({basePackage,afterProject:afterRecord.snapshot,afterEngineering,pricing:structuredClone(context.pricing),quoteTerms:structuredClone(context.quoteTerms),productionPack:pack,quoteVersion,...(body.quoteId?{quoteId:String(body.quoteId)}:{}),generatedAt:new Date().toISOString()}); const next=rq.commercialPackage;
      const report=compareRevisions({beforeProject:beforeRecord.snapshot,afterProject:afterRecord.snapshot,beforeEngineering,afterEngineering,beforeQuote:basePackage,afterQuote:next,generatedAt:new Date().toISOString()}); const customerSummary=buildCustomerChangeSummary(report,basePackage,next);
      const lineage={supersedesQuoteId:basePackage.quote.quoteId,changeReportId:report.reportId,createdAt:new Date().toISOString()};
      await businessStore.saveChangeReport({organizationId:project.organizationId,report,baseQuoteId:basePackage.quote.quoteId,requoteId:next.quote.quoteId});
      await businessStore.saveCommercialPackage({organizationId:project.organizationId,built:next,status:'draft',context:structuredClone(context)});
      await businessStore.saveQuoteLineage({organizationId:project.organizationId,projectId:project.id,quoteId:next.quote.quoteId,lineage});
      return json(res,201,{quote:next.quote,lifecycleStatus:'draft',estimate:next.estimate,manifest:next.manifest,lineage,changeReport:report,customerSummary,customerSummaryHtml:customerChangeSummaryHtml(customerSummary),generatedFiles:Object.keys(next.files).sort()});
    }

    const changeReportRoute=routeMatch(path,/^\/api\/v1\/changes\/reports\/([^/]+)$/);
    if(req.method==='GET'&&changeReportRoute){const report=await businessStore.getChangeReport(changeReportRoute[1]!);if(!report)return json(res,404,{error:'change_report_not_found'});await requireProjectAccess(report.projectId,req);return json(res,200,report);}

    const contractCreateRoute=routeMatch(path,/^\/api\/v1\/commercial\/quotes\/([^/]+)\/contract$/);
    if(req.method==='POST'&&contractCreateRoute){
      const body=await readJson(req); const built=await businessStore.getCommercialPackage(contractCreateRoute[1]!); if(!built)return json(res,404,{error:'commercial_quote_not_found'}); const lifecycle=await businessStore.getQuoteStatus(built.quote.quoteId)??'draft'; if(lifecycle!=='accepted')return json(res,409,{error:'commercial_quote_not_accepted',status:lifecycle}); if(await businessStore.getContractByProject(built.quote.projectId))return json(res,409,{error:'commercial_contract_already_exists'}); const project=await repository.getProject(built.quote.projectId,bearer(req)); if(!project?.snapshot)return json(res,404,{error:'project_not_found'}); if(project.snapshot.revision!==built.quote.revision)return json(res,409,{error:'accepted_quote_revision_is_not_current_project_revision',quoteRevision:built.quote.revision,currentRevision:project.snapshot.revision});
      const paymentTemplate:PaymentScheduleTemplateItem[]=Array.isArray(body.paymentTemplate)?body.paymentTemplate.map((x:any,i:number)=>({id:String(x.id??`payment-${i+1}`),label:String(x.label??`Payment ${i+1}`),shareBps:Number(x.shareBps),...(x.dueTrigger?{dueTrigger:String(x.dueTrigger)}:{})})):built.quote.paymentSchedule.map((x,i)=>({id:`payment-${i+1}`,label:x.label,shareBps:x.bps}));
      const contract=createCommercialContract({projectId:built.quote.projectId,organizationId:project.organizationId,quoteId:built.quote.quoteId,revision:built.quote.revision,currency:built.quote.currency,agreedAmountMinor:built.quote.totalAmountMinor,paymentTemplate,...(body.contractId?{contractId:String(body.contractId)}:{}),now:new Date().toISOString()}); await businessStore.createContract(contract); return json(res,201,{contract,commercialGate:productionCommercialGate({projectId:contract.projectId,revision:contract.currentRevision,contract})});
    }

    const projectContractRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/commercial-contract$/);
    if(req.method==='GET'&&projectContractRoute){const project=await repository.getProject(projectContractRoute[1]!,bearer(req));if(!project?.snapshot)return json(res,404,{error:'project_not_found'});const contract=await businessStore.getContractByProject(project.id);if(!contract)return json(res,404,{error:'commercial_contract_not_found'});const authorization=await businessStore.getAuthorization(project.id,project.snapshot.revision);return json(res,200,{contract,currentProjectRevision:project.snapshot.revision,commercialGate:productionCommercialGate({projectId:project.id,revision:project.snapshot.revision,contract,...(authorization?{authorization}:{})})});}

    const contractDocumentRoute=routeMatch(path,/^\/api\/v1\/commercial\/contracts\/([^/]+)\/document$/);
    if(req.method==='GET'&&contractDocumentRoute){const contract=await businessStore.getContractById(contractDocumentRoute[1]!);if(!contract)return json(res,404,{error:'commercial_contract_not_found'});const project=await requireProjectAccess(contract.projectId,req);const html=commercialContractHtml(contract,project?.snapshot?.title??'Makster project');res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;}

    const paymentPaidRoute=routeMatch(path,/^\/api\/v1\/commercial\/contracts\/([^/]+)\/payments\/([^/]+)\/mark-paid$/);
    if(req.method==='POST'&&paymentPaidRoute){const body=await readJson(req);const contract=await businessStore.getContractById(paymentPaidRoute[1]!);if(!contract)return json(res,404,{error:'commercial_contract_not_found'});const updated=markInstallmentPaid(contract,paymentPaidRoute[2]!,body.paidAmountMinor==null?undefined:Number(body.paidAmountMinor),new Date().toISOString());await businessStore.updateContract(updated);return json(res,200,{contract:updated});}

    const changeOrderCreateRoute=routeMatch(path,/^\/api\/v1\/commercial\/quotes\/([^/]+)\/change-order$/);
    if(req.method==='POST'&&changeOrderCreateRoute){const body=await readJson(req);const next=await businessStore.getCommercialPackage(changeOrderCreateRoute[1]!);if(!next)return json(res,404,{error:'commercial_quote_not_found'});const lineage=await businessStore.getQuoteLineage(next.quote.quoteId);if(!lineage)return json(res,409,{error:'requote_lineage_required'});const base=await businessStore.getCommercialPackage(lineage.supersedesQuoteId);const report=await businessStore.getChangeReport(lineage.changeReportId);if(!base||!report)return json(res,409,{error:'requote_lineage_incomplete'});const contract=await businessStore.getContractByProject(next.quote.projectId);if(!contract)return json(res,409,{error:'commercial_contract_required'});if(contract.currentQuoteId!==base.quote.quoteId||contract.currentRevision!==base.quote.revision)return json(res,409,{error:'contract_requote_lineage_mismatch'});const project=await repository.getProject(next.quote.projectId,bearer(req));if(!project)return json(res,404,{error:'project_not_found'});const summary=buildCustomerChangeSummary(report,base,next);const order=createClientChangeOrder({baseQuote:base,newQuote:next,report,summary,...(body.changeOrderId?{changeOrderId:String(body.changeOrderId)}:{}),...(body.publicReference?{publicReference:String(body.publicReference)}:{}),validUntil:String(body.validUntil??next.quote.validUntil),createdAt:new Date().toISOString()});await businessStore.createChangeOrder({organizationId:project.organizationId,order});return json(res,201,{changeOrder:customerSafeChangeOrder(order),customerHtml:clientChangeOrderHtml(order)});}

    const projectChangeOrdersRoute=routeMatch(path,/^\/api\/v1\/projects\/([^/]+)\/change-orders$/);
    if(req.method==='GET'&&projectChangeOrdersRoute){const project=await repository.getProject(projectChangeOrdersRoute[1]!,bearer(req));if(!project?.snapshot)return json(res,404,{error:'project_not_found'});const orders=(await businessStore.listProjectChangeOrders(project.id)).map(customerSafeChangeOrder);return json(res,200,{projectId:project.id,changeOrders:orders});}

    const changeOrderSendRoute=routeMatch(path,/^\/api\/v1\/client\/change-orders\/([^/]+)\/send$/);
    if(req.method==='POST'&&changeOrderSendRoute){const order=await businessStore.getChangeOrder(changeOrderSendRoute[1]!);if(!order)return json(res,404,{error:'change_order_not_found'});const project=await repository.getProject(order.binding.projectId,bearer(req));if(!project)return json(res,404,{error:'project_not_found'});const issued=issueChangeOrderToken(order,new Date().toISOString());await businessStore.updateChangeOrder({organizationId:project.organizationId,order:issued.order});return json(res,200,{changeOrder:customerSafeChangeOrder(issued.order),approvalToken:issued.token,tokenReturnedOnce:true});}

    const changeOrderDocumentRoute=routeMatch(path,/^\/api\/v1\/client\/change-orders\/([^/]+)\/document$/);
    if(req.method==='GET'&&changeOrderDocumentRoute){const order=await businessStore.getChangeOrder(changeOrderDocumentRoute[1]!);if(!order)return json(res,404,{error:'change_order_not_found'});await requireProjectAccess(order.binding.projectId,req);res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(clientChangeOrderHtml(order));return;}

    const orgChangeOrderRoute=routeMatch(path,/^\/api\/v1\/client\/change-orders\/([^/]+)$/);
    if(req.method==='GET'&&orgChangeOrderRoute){const order=await businessStore.getChangeOrder(orgChangeOrderRoute[1]!);if(!order)return json(res,404,{error:'change_order_not_found'});await requireProjectAccess(order.binding.projectId,req);return json(res,200,{changeOrder:customerSafeChangeOrder(order),customerHtml:clientChangeOrderHtml(order)});}

    const publicChangeOrderDecisionRoute=routeMatch(path,/^\/api\/v1\/public\/change-orders\/([^/]+)\/decision$/);
    if(req.method==='POST'&&publicChangeOrderDecisionRoute){const body=await readJson(req);const order=await businessStore.getChangeOrder(publicChangeOrderDecisionRoute[1]!);if(!order)return json(res,404,{error:'change_order_not_found'});const token=String(body.token??'');if(!token)return json(res,403,{error:'change_order_token_required'});const decision=body.decision==='declined'?'declined':'accepted';if(order.status==='accepted'||order.status==='declined'){verifyChangeOrderToken(order,token,new Date().toISOString());if(order.decision?.decision!==decision)return json(res,409,{error:'change_order_already_decided',status:order.status});if(decision==='accepted'){const contract=await businessStore.getContractByProject(order.binding.projectId);const authorization=await businessStore.getAuthorization(order.binding.projectId,order.binding.toRevision);if(!contract||!authorization)return json(res,409,{error:'accepted_change_order_state_incomplete'});return json(res,200,{changeOrder:customerSafeChangeOrder(order),contract,authorization,commercialGate:productionCommercialGate({projectId:authorization.projectId,revision:authorization.revision,contract,authorization}),idempotentReplay:true});}return json(res,200,{changeOrder:customerSafeChangeOrder(order),idempotentReplay:true});}const decided=decideClientChangeOrder({order,token,decision,clientName:String(body.clientName??''),...(body.clientEmail?{clientEmail:String(body.clientEmail)}:{}),...(req.headers['user-agent']?{userAgent:String(req.headers['user-agent'])}:{}),now:new Date().toISOString()});const contract=await businessStore.getContractByProject(decided.binding.projectId);if(!contract)return json(res,409,{error:'commercial_contract_not_found'});const organizationId=contract.organizationId??DEMO_ORG_ID;if(decision==='accepted'){const applied=applyAcceptedChangeOrder({contract,order:decided,now:new Date().toISOString()});await businessStore.applyAcceptedChangeOrderAtomic({organizationId,order:decided,contract:applied.contract,authorization:applied.authorization,baseQuoteId:decided.binding.baseQuoteId,newQuoteId:decided.binding.newQuoteId});return json(res,200,{changeOrder:customerSafeChangeOrder(decided),contract:applied.contract,authorization:applied.authorization,commercialGate:productionCommercialGate({projectId:applied.authorization.projectId,revision:applied.authorization.revision,contract:applied.contract,authorization:applied.authorization})});}await businessStore.updateChangeOrder({organizationId,order:decided});return json(res,200,{changeOrder:customerSafeChangeOrder(decided)});}

    const publicChangeOrderRoute=routeMatch(path,/^\/api\/v1\/public\/change-orders\/([^/]+)$/);
    if(req.method==='GET'&&publicChangeOrderRoute){const order=await businessStore.getChangeOrder(publicChangeOrderRoute[1]!);if(!order)return json(res,404,{error:'change_order_not_found'});const token=url.searchParams.get('token')??'';if(!token)return json(res,403,{error:'change_order_token_required'});const viewed=viewClientChangeOrder(order,token,new Date().toISOString());const contract=await businessStore.getContractByProject(viewed.binding.projectId);if(!contract)return json(res,409,{error:'commercial_contract_not_found'});await businessStore.updateChangeOrder({organizationId:contract.organizationId??DEMO_ORG_ID,order:viewed});return json(res,200,{changeOrder:customerSafeChangeOrder(viewed),customerHtml:clientChangeOrderHtml(viewed)});}

    const communicationSendRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)\/communications\/send$/);
    if (req.method === 'POST' && communicationSendRoute) {
      const body = await readJson(req);
      const rfq = procurementRfqs.get(communicationSendRoute[1]!);
      if (!rfq) return json(res, 404, { error: 'rfq_not_found' });
      const requestedIds = Array.isArray(body.supplierIds) ? body.supplierIds.map(String) : rfq.invitedSupplierIds;
      const providerKind=String(body.provider ?? 'memory');
      const connectionId=body.connectionId?String(body.connectionId):undefined;
      const provider = await communicationProvider(providerKind,connectionId);
      const results:any[] = [];
      for (const supplierId of requestedIds) {
        if (!rfq.invitedSupplierIds.includes(supplierId)) { results.push({supplierId,status:'skipped',reason:'supplier_not_invited'}); continue; }
        const supplier = procurementSuppliers.find(s=>s.id===supplierId);
        if (!supplier?.email) { results.push({supplierId,status:'skipped',reason:'supplier_email_missing'}); continue; }
        const key = communicationKey(rfq.rfqId,supplierId);
        const existingId = communicationThreadByRfqSupplier.get(key);
        let thread: SupplierCommunicationThread;
        let draft;
        if (existingId) {
          thread = communicationThreads.get(existingId)!;
          draft = composeRfqInvitation(rfq,{supplierId,supplierName:supplier.name,email:supplier.email});
          if (thread.status !== 'draft' && body.forceResend !== true) { results.push({supplierId,status:'skipped',reason:'invitation_already_sent',threadId:thread.threadId}); continue; }
        } else {
          const created = createCommunicationThread({rfq,recipient:{supplierId,supplierName:supplier.name,email:supplier.email},provider:provider.kind,...(provider.kind==='gmail'&&connectionId?{providerAccountRef:connectionId}:{})});
          thread = created.thread; draft = created.draft;
          communicationThreadByRfqSupplier.set(key,thread.threadId);
        }
        const sent = await sendThreadMessage({provider,thread,kind:'rfq_invitation',bodyText:draft.bodyText,subject:draft.subject});
        communicationThreads.set(sent.thread.threadId,sent.thread);
        const messages=communicationMessages.get(sent.thread.threadId) ?? []; messages.push(sent.message); communicationMessages.set(sent.thread.threadId,messages);
        results.push({supplierId,status:'sent',thread:sent.thread,message:sent.message});
      }
      return json(res, 200, { rfqId:rfq.rfqId, provider:provider.kind, results });
    }

    const communicationGetRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)\/communications$/);
    if (req.method === 'GET' && communicationGetRoute) {
      const rfqId=communicationGetRoute[1]!;
      const threads=[...communicationThreads.values()].filter(t=>t.rfqId===rfqId);
      return json(res,200,{rfqId,threads:threads.map(t=>({thread:t,messages:communicationMessages.get(t.threadId)??[]}))});
    }

    const communicationInboundRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)\/communications\/inbound$/);
    if (req.method === 'POST' && communicationInboundRoute) {
      const body=await readJson(req);
      const rfq=procurementRfqs.get(communicationInboundRoute[1]!);
      if(!rfq) return json(res,404,{error:'rfq_not_found'});
      const supplierId=String(body.supplierId??'');
      const supplier=procurementSuppliers.find(s=>s.id===supplierId);
      if(!supplier) return json(res,404,{error:'supplier_not_found'});
      const text=String(body.text??'').trim();
      if(!text) return json(res,400,{error:'supplier_reply_text_required'});
      const fromEmail=String(body.fromEmail??'').trim();
      if(!fromEmail) return json(res,400,{error:'supplier_reply_from_email_required'});
      const parsed=parseSupplierReply({rfq,supplier,text,fromEmail,...(body.receivedAt?{receivedAt:String(body.receivedAt)}:{})});
      const threadId=communicationThreadByRfqSupplier.get(communicationKey(rfq.rfqId,supplierId));
      if(!threadId) return json(res,409,{error:'communication_thread_not_found'});
      const thread=communicationThreads.get(threadId)!;
      const receivedAt=String(body.receivedAt??new Date().toISOString());
      const inbound:SupplierCommunicationMessage={communicationVersion:'1.3.0',messageId:randomUUID(),threadId,direction:'inbound',kind:parsed.classification==='quote_candidate'?'quote_received':parsed.classification==='declined'?'decline':'supplier_reply',status:'received',subject:thread.subject,bodyText:text,payloadSha256:sha256Text(text),...(body.providerMessageId?{providerMessageId:String(body.providerMessageId)}:{}),...(body.providerThreadId?{providerThreadId:String(body.providerThreadId)}:{}),receivedAt};
      const messages=communicationMessages.get(threadId)??[]; messages.push(inbound); communicationMessages.set(threadId,messages);
      communicationThreads.set(threadId,{...thread,status:parsed.classification==='declined'?'declined':'replied',lastInboundAt:receivedAt,...(body.providerThreadId?{providerThreadId:String(body.providerThreadId)}:{})});
      let quoteImported=false;
      if(parsed.classification==='quote_candidate' && parsed.quote){ const quotes=procurementQuotes.get(rfq.rfqId)??[]; quotes.push(parsed.quote); procurementQuotes.set(rfq.rfqId,quotes); quoteImported=true; }
      return json(res,200,{parsed,quoteImported,thread:communicationThreads.get(threadId)});
    }

    if (req.method === 'POST' && path === '/api/v1/procurement/communications/reminders/run') {
      const body=await readJson(req);
      const providerKind=String(body.provider??'memory');
      const candidates=dueReminderCandidates({threads:[...communicationThreads.values()],...(body.now?{now:String(body.now)}:{})});
      const sent:any[]=[];
      for(const candidate of candidates){
        const thread=communicationThreads.get(candidate.threadId)!;
        const provider=await communicationProvider(providerKind,providerKind==='gmail'?thread.providerAccountRef:undefined);
        const result=await sendThreadMessage({provider,thread,kind:'reminder',bodyText:composeReminder(thread),subject:thread.subject,...(body.now?{now:String(body.now)}:{})});
        communicationThreads.set(thread.threadId,result.thread);
        const messages=communicationMessages.get(thread.threadId)??[];messages.push(result.message);communicationMessages.set(thread.threadId,messages);
        sent.push({candidate,thread:result.thread,message:result.message});
      }
      return json(res,200,{due:candidates.length,sent});
    }

    if (req.method === 'GET' && path === '/api/v1/procurement/suppliers') {
      return json(res, 200, procurementSuppliers);
    }

    const rfqCreateRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/procurement\/rfqs$/);
    if (req.method === 'POST' && rfqCreateRoute) {
      const body = await readJson(req);
      const project = await repository.getProject(rfqCreateRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const context = compileManufacturingContext(project.snapshot, body);
      const outsourcePreset = String(body.outsourcePreset ?? 'cutting_edging') as OutsourcePreset;
      const pack = buildProductionPack({
        project: project.snapshot,
        engineering: context.engineering,
        route: 'outsource',
        outsourcePreset,
      });
      if (!pack.manifest.ready) return json(res, 409, { error: 'production_pack_not_ready', manifest: pack.manifest });
      const requestedIds = Array.isArray(body.supplierIds) ? body.supplierIds.map(String) : [];
      const candidates = requestedIds.length ? procurementSuppliers.filter(s => s.id && requestedIds.includes(s.id)) : procurementSuppliers;
      const rfq = createSupplierRfq({
        pack,
        suppliers: candidates,
        currency: String(body.currency ?? project.snapshot.currency ?? 'EUR'),
        deliveryRequired: body.deliveryRequired === true,
        ...(body.responseDeadline ? { responseDeadline: String(body.responseDeadline) } : {}),
        ...(body.notes ? { notes: String(body.notes) } : {}),
      });
      procurementRfqs.set(rfq.rfqId, rfq);
      procurementQuotes.set(rfq.rfqId, []);
      procurementPackContexts.set(rfq.rfqId, pack);
      return json(res, 201, { rfq, productionPack: pack.manifest });
    }

    const rfqGetRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)$/);
    if (req.method === 'GET' && rfqGetRoute) {
      const rfq = procurementRfqs.get(rfqGetRoute[1]!);
      return rfq ? json(res, 200, { rfq, quotes: procurementQuotes.get(rfq.rfqId) ?? [], comparison: procurementComparisons.get(rfq.rfqId) }) : json(res, 404, { error: 'rfq_not_found' });
    }

    const quoteSubmitRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)\/quotes$/);
    if (req.method === 'POST' && quoteSubmitRoute) {
      const body = await readJson(req);
      const rfq = procurementRfqs.get(quoteSubmitRoute[1]!);
      if (!rfq) return json(res, 404, { error: 'rfq_not_found' });
      const supplierId = String(body.supplierId ?? '');
      const supplier = procurementSuppliers.find(s => s.id === supplierId);
      if (!supplier) return json(res, 404, { error: 'supplier_not_found' });
      const basePrice = Number(body.basePrice ?? 0);
      const deliveryPrice = Number(body.deliveryPrice ?? 0);
      const quote: SupplierQuote = {
        procurementVersion: '1.2.0',
        quoteId: String(body.quoteId ?? randomUUID()),
        rfqId: rfq.rfqId,
        supplierId,
        status: 'submitted',
        currency: String(body.currency ?? rfq.currency),
        basePrice,
        deliveryPrice,
        totalPrice: Math.round((basePrice + deliveryPrice) * 100) / 100,
        leadDays: Number(body.leadDays ?? supplier.typicalLeadDays ?? 5),
        ...(body.promisedAt ? { promisedAt: String(body.promisedAt) } : {}),
        ...(body.validUntil ? { validUntil: String(body.validUntil) } : {}),
        services: Array.isArray(body.services) ? body.services.map(String) as any : [...rfq.services],
        deliveryMode: String(body.deliveryMode ?? (supplier.deliveryModes.includes('supplier_delivery') ? 'supplier_delivery' : supplier.deliveryModes[0] ?? 'pickup')) as any,
        ...(Array.isArray(body.exclusions) ? { exclusions: body.exclusions.map(String) } : {}),
        ...(body.note ? { note: String(body.note) } : {}),
        submittedAt: new Date().toISOString(),
      };
      const errors = validateQuote(rfq, quote, supplier);
      if (errors.length) return json(res, 422, { error: 'invalid_supplier_quote', errors, quote });
      const quotes = procurementQuotes.get(rfq.rfqId) ?? [];
      quotes.push(quote);
      procurementQuotes.set(rfq.rfqId, quotes);
      return json(res, 201, quote);
    }

    const compareRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)\/compare$/);
    if (req.method === 'POST' && compareRoute) {
      const body = await readJson(req);
      const rfq = procurementRfqs.get(compareRoute[1]!);
      if (!rfq) return json(res, 404, { error: 'rfq_not_found' });
      const quotes = procurementQuotes.get(rfq.rfqId) ?? [];
      if (quotes.length === 0) return json(res, 409, { error: 'rfq_has_no_quotes' });
      const performance = procurementSuppliers.filter(s => s.id).map(s => calculateSupplierPerformance({
        supplierId: s.id!,
        orders: [...supplierOrders.values()],
        receiptsByOrder: supplierReceipts,
      }));
      const comparison = compareSupplierQuotes({
        rfq,
        quotes,
        suppliers: procurementSuppliers,
        performance,
        strategy: String(body.strategy ?? 'balanced') as ProcurementStrategy,
      });
      procurementComparisons.set(rfq.rfqId, comparison);
      return json(res, 200, comparison);
    }

    const awardRoute = routeMatch(path, /^\/api\/v1\/procurement\/rfqs\/([^/]+)\/award\/([^/]+)$/);
    if (req.method === 'POST' && awardRoute) {
      const rfq = procurementRfqs.get(awardRoute[1]!);
      if (!rfq) return json(res, 404, { error: 'rfq_not_found' });
      const quote = (procurementQuotes.get(rfq.rfqId) ?? []).find(q => q.quoteId === awardRoute[2]);
      if (!quote) return json(res, 404, { error: 'quote_not_found' });
      const supplier = procurementSuppliers.find(s => s.id === quote.supplierId);
      const pack = procurementPackContexts.get(rfq.rfqId);
      if (!supplier || !pack) return json(res, 409, { error: 'procurement_context_missing' });
      const order = awardSupplierQuote({ pack, rfq, quote, supplier });
      supplierOrders.set(order.orderId, order);
      supplierReceipts.set(order.orderId, []);
      const quotes = procurementQuotes.get(rfq.rfqId) ?? [];
      for (const q of quotes) q.status = q.quoteId === quote.quoteId ? 'awarded' : (q.status === 'submitted' ? 'not_selected' : q.status);
      procurementQuotes.set(rfq.rfqId, quotes);
      return json(res, 201, { order, awardedQuote: quote, rfq });
    }


    const supplierOrderCreate = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/supplier-orders$/);
    if (req.method === 'POST' && supplierOrderCreate) {
      const body = await readJson(req);
      const project = await repository.getProject(supplierOrderCreate[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const context = compileManufacturingContext(project.snapshot, body);
      const outsourcePreset = String(body.outsourcePreset ?? 'cutting_edging') as OutsourcePreset;
      const pack = buildProductionPack({
        project: project.snapshot,
        engineering: context.engineering,
        route: 'outsource',
        outsourcePreset,
        supplierName: String(body.supplier?.name ?? body.supplierName ?? 'Supplier'),
        ...(body.supplierReference ? { orderReference: String(body.supplierReference) } : {}),
      });
      if (!pack.manifest.ready) return json(res, 409, { error: 'production_pack_not_ready', manifest: pack.manifest });
      const supplier = body.supplier && typeof body.supplier === 'object'
        ? { ...body.supplier, name: String(body.supplier.name ?? 'Supplier') }
        : { name: String(body.supplierName ?? 'Supplier') };
      const order = createSupplierOrder({
        pack,
        supplier,
        currency: String(body.currency ?? project.snapshot.currency ?? 'EUR'),
        ...(body.quotedPrice != null ? { quotedPrice: Number(body.quotedPrice) } : {}),
        ...(body.promisedAt ? { promisedAt: String(body.promisedAt) } : {}),
        ...(body.supplierReference ? { supplierReference: String(body.supplierReference) } : {}),
        ...(body.notes ? { notes: String(body.notes) } : {}),
      });
      supplierOrders.set(order.orderId, order);
      supplierReceipts.set(order.orderId, []);
      return json(res, 201, { order, productionPack: pack.manifest });
    }

    if (req.method === 'GET' && path === '/api/v1/supplier-orders') {
      return json(res, 200, [...supplierOrders.values()]);
    }

    const supplierOrderGet = routeMatch(path, /^\/api\/v1\/supplier-orders\/([^/]+)$/);
    if (req.method === 'GET' && supplierOrderGet) {
      const order = supplierOrders.get(supplierOrderGet[1]!);
      return order ? json(res, 200, order) : json(res, 404, { error: 'supplier_order_not_found' });
    }

    const supplierOrderStatus = routeMatch(path, /^\/api\/v1\/supplier-orders\/([^/]+)\/status$/);
    if (req.method === 'POST' && supplierOrderStatus) {
      const body = await readJson(req);
      const order = supplierOrders.get(supplierOrderStatus[1]!);
      if (!order) return json(res, 404, { error: 'supplier_order_not_found' });
      const updated = updateSupplierOrderStatus(order, {
        status: String(body.status) as any,
        ...(body.at ? { at: String(body.at) } : {}),
        ...(body.quotedPrice != null ? { quotedPrice: Number(body.quotedPrice) } : {}),
        ...(body.promisedAt ? { promisedAt: String(body.promisedAt) } : {}),
        ...(body.supplierReference ? { supplierReference: String(body.supplierReference) } : {}),
        ...(body.note ? { note: String(body.note) } : {}),
      });
      supplierOrders.set(updated.orderId, updated);
      return json(res, 200, updated);
    }

    const supplierReceiptCreate = routeMatch(path, /^\/api\/v1\/supplier-orders\/([^/]+)\/receipts$/);
    if (req.method === 'POST' && supplierReceiptCreate) {
      const body = await readJson(req);
      const order = supplierOrders.get(supplierReceiptCreate[1]!);
      if (!order) return json(res, 404, { error: 'supplier_order_not_found' });
      if (!['ready','partially_received'].includes(order.status)) return json(res, 409, { error: 'supplier_order_not_ready_for_receiving', status: order.status });
      const existing = supplierReceipts.get(order.orderId) ?? [];
      const receipt = createReceipt({
        order,
        existingReceipts: existing,
        receivedBy: String(body.receivedBy ?? 'demo-receiver'),
        lines: Array.isArray(body.lines) ? body.lines : [],
        ...(body.note ? { note: String(body.note) } : {}),
      });
      existing.push(receipt);
      supplierReceipts.set(order.orderId, existing);
      const summary = receivingSummary(order, existing);
      const updated = { ...order, status: summary.status, ...(summary.complete ? { receivedAt: receipt.receivedAt } : {}) } as SupplierOrder;
      supplierOrders.set(order.orderId, updated);
      return json(res, 201, { receipt, summary, order: updated });
    }

    const supplierSummaryRoute = routeMatch(path, /^\/api\/v1\/supplier-orders\/([^/]+)\/receiving-summary$/);
    if (req.method === 'GET' && supplierSummaryRoute) {
      const order = supplierOrders.get(supplierSummaryRoute[1]!);
      if (!order) return json(res, 404, { error: 'supplier_order_not_found' });
      return json(res, 200, receivingSummary(order, supplierReceipts.get(order.orderId) ?? []));
    }

    const supplierReworkRoute = routeMatch(path, /^\/api\/v1\/supplier-orders\/([^/]+)\/rework-pack$/);
    if (req.method === 'POST' && supplierReworkRoute) {
      const order = supplierOrders.get(supplierReworkRoute[1]!);
      if (!order) return json(res, 404, { error: 'supplier_order_not_found' });
      const rework = buildReworkPack(order, supplierReceipts.get(order.orderId) ?? []);
      return json(res, rework.ready ? 200 : 409, rework.ready ? rework : { error: 'no_rework_needed', rework });
    }

    if (req.method === 'GET' && path === '/api/v1/production/machines') {
      return json(res, 200, demoMachines.map((machine) => ({ ...machine, safeForRealCnc: machine.trust === 'verified' })));
    }

    const approvalRequestRoute = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/manufacturing\/approval-request$/);
    if (req.method === 'POST' && approvalRequestRoute) {
      const body = await readJson(req);
      const project = await repository.getProject(approvalRequestRoute[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const contract=await businessStore.getContractByProject(project.id);
      const authorization=await businessStore.getAuthorization(project.id,project.snapshot.revision);
      const commercialGate=productionCommercialGate({projectId:project.id,revision:project.snapshot.revision,...(contract?{contract}:{}),...(authorization?{authorization}:{})});
      if(!commercialGate.allowed) return json(res,409,{error:'client_commercial_approval_required',commercialGate});
      const context = compileManufacturingContext(project.snapshot, body);
      const preview = buildReleasePackage({ engineering: context.engineering, ...(context.bxfReport ? { bxfReport: context.bxfReport } : {}), ...(body.releaseId ? { releaseId: String(body.releaseId) } : {}) });
      const request = createProductionApprovalRequest({
        manifest: preview.manifest,
        requestedBy: String(body.requestedBy ?? 'demo-user'),
        ...(body.reason ? { reason: String(body.reason) } : {}),
      });
      approvalRequests.set(request.id, request);
      approvalContexts.set(request.id, { engineering: context.engineering, ...(context.bxfReport ? { bxfReport: context.bxfReport } : {}), releaseId: preview.manifest.releaseId });
      return json(res, 201, { request, manifest: preview.manifest });
    }

    const approveRoute = routeMatch(path, /^\/api\/v1\/manufacturing\/approvals\/([^/]+)\/decision$/);
    if (req.method === 'POST' && approveRoute) {
      const body = await readJson(req);
      const request = approvalRequests.get(approveRoute[1]!);
      if (!request) return json(res, 404, { error: 'approval_not_found' });
      const decision = {
        requestId: request.id,
        decision: body.decision === 'rejected' ? 'rejected' as const : 'approved' as const,
        actorId: String(body.actorId ?? 'demo-technologist'),
        actorRole: String(body.actorRole ?? 'technologist') as any,
        decidedAt: new Date().toISOString(),
        ...(body.note ? { note: String(body.note) } : {}),
      };
      const authorization = decideProductionApproval({ request, decision });
      request.status = decision.decision === 'approved' ? 'approved' : 'rejected';
      approvalRequests.set(request.id, request);
      if (authorization) approvalAuthorizations.set(request.id, authorization);
      return json(res, 200, { request, authorization });
    }

    const authorizeRoute = routeMatch(path, /^\/api\/v1\/manufacturing\/approvals\/([^/]+)\/sign-release$/);
    if (req.method === 'POST' && authorizeRoute) {
      const authorization = approvalAuthorizations.get(authorizeRoute[1]!);
      const context = approvalContexts.get(authorizeRoute[1]!);
      if (!authorization || !context) return json(res, 404, { error: 'approved_release_not_found' });
      const signer = signerFromEnv();
      if (!signer) return json(res, 503, { error: 'cnc_signing_key_not_configured' });
      const release = buildReleasePackage({
        engineering: context.engineering,
        ...(context.bxfReport ? { bxfReport: context.bxfReport } : {}),
        releaseId: context.releaseId,
        approval: authorization,
        signer,
      });
      if (!release.manifest.canReleaseToCnc) return json(res, 409, { error: 'release_authorization_failed', manifest: release.manifest });
      signedReleases.set(authorization.approvalId, { release, engineering: context.engineering });
      return json(res, 200, { manifest: release.manifest, generatedFiles: Object.keys(release.files).sort() });
    }

    const machinePreviewRoute = routeMatch(path, /^\/api\/v1\/manufacturing\/approvals\/([^/]+)\/machine-package-preview$/);
    if (req.method === 'POST' && machinePreviewRoute) {
      const body = await readJson(req);
      const signed = signedReleases.get(machinePreviewRoute[1]!);
      if (!signed) return json(res, 404, { error: 'signed_release_not_found' });
      const machine = demoMachines.find((m) => m.id === String(body.machineId ?? 'makster-neutral-preview'));
      if (!machine) return json(res, 404, { error: 'machine_not_found' });
      const post = machine.postprocessorId === neutralPostprocessor.id ? neutralPostprocessor : testPostprocessor;
      const machinePackage = post.compile({ release: signed.release, engineering: signed.engineering, machine });
      return json(res, 200, { machinePackage: { ...machinePackage, files: machinePackage.files.map(({ content, ...meta }) => meta) } });
    }

    const enqueueRoute = routeMatch(path, /^\/api\/v1\/manufacturing\/approvals\/([^/]+)\/enqueue$/);
    if (req.method === 'POST' && enqueueRoute) {
      const body = await readJson(req);
      const signed = signedReleases.get(enqueueRoute[1]!);
      if (!signed) return json(res, 404, { error: 'signed_release_not_found' });
      const machine = demoMachines.find((m) => m.id === String(body.machineId ?? ''));
      if (!machine) return json(res, 404, { error: 'machine_not_found' });
      const post = machine.postprocessorId === neutralPostprocessor.id ? neutralPostprocessor : testPostprocessor;
      const queued = enqueueProduction({ organizationId: machine.organizationId, release: signed.release, engineering: signed.engineering, machine, postprocessor: post });
      productionJobs.set(queued.job.id, queued);
      return json(res, 201, { job: queued.job, machinePackage: { ...queued.machinePackage, files: queued.machinePackage.files.map(({ content, ...meta }) => meta) } });
    }

    if (req.method === 'GET' && path === '/api/v1/production/queue') {
      return json(res, 200, [...productionJobs.values()].map((item) => item.job));
    }

    if(req.method==='GET'&&path==='/api/v1/owner-command-center'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean);
      return json(res,200,buildOwnerCommandCenter(projects as any[],await ownerOperationsStore.get(),currency));
    }
    if(req.method==='GET'&&path==='/api/v1/warehouse'){
      return json(res,200,await ownerOperationsStore.get());
    }
    if(req.method==='POST'&&path==='/api/v1/warehouse/items'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.addWarehouseItem({
        sku:String(b.sku??''),name:String(b.name??''),manufacturer:b.manufacturer?String(b.manufacturer):undefined,
        unit:String(b.unit??'pcs') as any,onHand:Number(b.onHand??0),minStock:b.minStock!=null?Number(b.minStock):undefined,
        unitCostMinor:b.unitCostMinor!=null?Number(b.unitCostMinor):undefined,currency:String(b.currency??'EUR'),
        location:b.location?String(b.location):undefined
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    const warehouseAdjust=routeMatch(path,/^\/api\/v1\/warehouse\/items\/([^/]+)\/adjust$/);
    if(req.method==='POST'&&warehouseAdjust){
      const b=await readJson(req);
      try{return json(res,200,await ownerOperationsStore.adjustWarehouseItem(warehouseAdjust[1]!,Number(b.delta??0)))}
      catch(e){return json(res,409,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='POST'&&path==='/api/v1/warehouse/reservations'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.reserve({itemId:String(b.itemId??''),projectId:String(b.projectId??''),quantity:Number(b.quantity??0),priority:b.priority!=null?Number(b.priority):undefined,note:b.note?String(b.note):undefined}))}
      catch(e){return json(res,409,{error:e instanceof Error?e.message:String(e)})}
    }
    const warehouseReservationStatus=routeMatch(path,/^\/api\/v1\/warehouse\/reservations\/([^/]+)\/(consume|release)$/);
    if(req.method==='POST'&&warehouseReservationStatus){
      try{return json(res,200,await ownerOperationsStore.setReservationStatus(warehouseReservationStatus[1]!,warehouseReservationStatus[2]==='consume'?'consumed':'released'))}
      catch(e){return json(res,409,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='POST'&&path==='/api/v1/suppliers'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.addSupplier({
        name:String(b.name??''),currency:String(b.currency??'EUR'),leadTimeDays:Number(b.leadTimeDays??7),
        reliabilityPct:Number(b.reliabilityPct??90),defectPct:Number(b.defectPct??2),paymentTermsDays:Number(b.paymentTermsDays??14),
        priceIndex:Number(b.priceIndex??100),active:b.active!==false,email:b.email?String(b.email):undefined,
        categories:Array.isArray(b.categories)?b.categories.map(String):undefined,
        languages:Array.isArray(b.languages)?b.languages.map(String) as any:undefined
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='GET'&&path==='/api/v1/suppliers/ranking'){
      const mode=(url.searchParams.get('mode')??'optimal') as 'optimal'|'fastest'|'cheapest';
      return json(res,200,{version:'5.0.0',mode,ranking:supplierRanking((await ownerOperationsStore.get()).suppliers,mode)});
    }
    if(req.method==='GET'&&path==='/api/v1/content-studio'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      return json(res,200,buildContentStudioDashboard(projects,await ownerOperationsStore.get()));
    }
    if(req.method==='POST'&&path==='/api/v1/content-studio/assets'){
      const b=await readJson(req);
      const x=addCreativeAsset({projectId:String(b.projectId??''),kind:String(b.kind??'photo') as any,title:String(b.title??'Makster asset'),uri:b.uri?String(b.uri):undefined,tags:Array.isArray(b.tags)?b.tags.map(String):[],roomType:b.roomType?String(b.roomType):undefined,materialTags:Array.isArray(b.materialTags)?b.materialTags.map(String):[],approvedForMarketing:Boolean(b.approvedForMarketing),hero:Boolean(b.hero)});
      await ownerOperationsStore.addCreativeAsset(x);return json(res,201,{version:'5.6.0',asset:x});
    }
    const contentGenerate=routeMatch(path,/^\/api\/v1\/content-studio\/projects\/([^/]+)\/generate$/);
    if(req.method==='POST'&&contentGenerate){
      const rec=await repository.getProject(contentGenerate[1]!,bearer(req));if(!rec?.snapshot)return json(res,404,{error:'project_not_found'});
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      try{
        const out=buildProjectContentDrafts(rec.snapshot,ops,{channels:Array.isArray(b.channels)?b.channels.map(String) as any:undefined,audience:b.audience?String(b.audience):undefined,angle:b.angle?String(b.angle):undefined});
        await ownerOperationsStore.addContentDraftSet(out.set);
        for(const x of out.items)await ownerOperationsStore.addOfficeContent(x);
        for(const a of out.approvals)await ownerOperationsStore.addOfficeApproval(a);
        return json(res,201,{version:'5.6.0',...out});
      }catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    const contentQueue=routeMatch(path,/^\/api\/v1\/content-studio\/content\/([^/]+)\/queue$/);
    if(req.method==='POST'&&contentQueue){
      const b=await readJson(req),ops=await ownerOperationsStore.get(),content=ops.officeContent.find(x=>x.id===contentQueue[1]!);
      if(!content)return json(res,404,{error:'content_not_found'});
      const approval=ops.officeApprovals.find(x=>x.entityType==='content'&&x.entityId===content.id&&['approved','executed'].includes(x.status));
      if(!approval)return json(res,403,{error:'publish_owner_approval_required'});
      const job=createPublishJob(content,approval,{scheduledAt:b.scheduledAt?String(b.scheduledAt):undefined});
      const queued=queueApprovedPublishJob(job,content,approval);await ownerOperationsStore.addPublishJob(queued.job);await ownerOperationsStore.updateOfficeContent(queued.content);
      return json(res,201,{version:'5.6.0',...queued,externalPublish:false});
    }
    if(req.method==='POST'&&path==='/api/v1/content-studio/performance'){
      const b=await readJson(req),x=recordContentPerformance({contentId:String(b.contentId??''),channel:String(b.channel??'instagram_organic') as any,impressions:Number(b.impressions??0),views:Number(b.views??0),clicks:Number(b.clicks??0),engagements:Number(b.engagements??0),leads:Number(b.leads??0),qualifiedLeads:Number(b.qualifiedLeads??0),attributedRevenueMinor:Number(b.attributedRevenueMinor??0),capturedAt:b.capturedAt?String(b.capturedAt):undefined});
      await ownerOperationsStore.addContentPerformance(x);return json(res,201,{version:'5.6.0',performance:x});
    }
    if(req.method==='POST'&&path==='/api/v1/pilot-mode/start'){
      const b=await readJson(req),organizationId=String(b.organizationId??DEMO_ORG_ID),projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[],ops=await ownerOperationsStore.get();
      const out=createPilotRun(projects,ops,{name:b.name?String(b.name):undefined,count:Number(b.count??3),createdBy:String(b.createdBy??'owner')});
      await ownerOperationsStore.addPilotRun(out.run);for(const x of out.projects)await ownerOperationsStore.addPilotProject(x);
      return json(res,201,{version:'5.6.0',...out});
    }
    if(req.method==='GET'&&path==='/api/v1/ai-office'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      const ops=await ownerOperationsStore.get();reconcileProjectRevenueAttribution(projects,ops);
      return json(res,200,buildMaksterOfficeDashboard(projects,ops,currency,new Date()));
    }
    if(req.method==='POST'&&path==='/api/v1/ai-office/campaigns'){
      const b=await readJson(req);
      try{
        const c=createOfficeCampaign({
          name:String(b.name??''),channel:String(b.channel??'google_ads') as any,objective:String(b.objective??'leads') as any,
          market:String(b.market??'CZ'),budgetMinor:Number(b.budgetMinor??0),currency:String(b.currency??'EUR'),
          createdBy:String(b.createdBy??'owner'),startAt:b.startAt?String(b.startAt):undefined,endAt:b.endAt?String(b.endAt):undefined
        });
        await ownerOperationsStore.addOfficeCampaign(c);
        const approval=createOfficeApproval({kind:'campaign_budget',title:`Campaign budget · ${c.name}`,detail:`Approve budget before campaign may become ACTIVE.`,amountMinor:c.budgetMinor,currency:c.currency,entityType:'campaign',entityId:c.id,requestedBy:'Growth Director'});
        await ownerOperationsStore.addOfficeApproval(approval);
        return json(res,201,{version:'5.6.0',campaign:c,approval});
      }catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    const officeCampaignMetrics=routeMatch(path,/^\/api\/v1\/ai-office\/campaigns\/([^/]+)\/metrics$/);
    if(req.method==='POST'&&officeCampaignMetrics){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const c=ops.officeCampaigns.find(x=>x.id===officeCampaignMetrics[1]!);if(!c)return json(res,404,{error:'office_campaign_not_found'});
      for(const k of ['spentMinor','impressions','clicks','leads','qualifiedLeads','wonDeals','attributedRevenueMinor'] as const)if(b[k]!=null)(c as any)[k]=Math.max(0,Number(b[k]));
      c.updatedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeCampaign(c);return json(res,200,{version:'5.6.0',campaign:c});
    }
    if(req.method==='POST'&&path==='/api/v1/ai-office/leads'){
      const b=await readJson(req);
      try{
        const lead=createOfficeLead({name:String(b.name??''),source:String(b.source??'other') as any,currency:String(b.currency??'EUR'),
          company:b.company?String(b.company):undefined,email:b.email?String(b.email):undefined,phone:b.phone?String(b.phone):undefined,
          country:b.country?String(b.country):undefined,estimatedValueMinor:b.estimatedValueMinor!=null?Number(b.estimatedValueMinor):undefined,
          campaignId:b.campaignId?String(b.campaignId):undefined,note:b.note?String(b.note):undefined});
        await ownerOperationsStore.addOfficeLead(lead);return json(res,201,{version:'5.6.0',lead});
      }catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    const officeLeadStatus=routeMatch(path,/^\/api\/v1\/ai-office\/leads\/([^/]+)\/status$/);
    if(req.method==='POST'&&officeLeadStatus){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const lead=ops.officeLeads.find(x=>x.id===officeLeadStatus[1]!);if(!lead)return json(res,404,{error:'office_lead_not_found'});
      try{
        const updated=advanceOfficeLead(lead,{status:String(b.status??'') as any,nextFollowUpAt:b.nextFollowUpAt?String(b.nextFollowUpAt):undefined,lostReason:b.lostReason?String(b.lostReason):undefined,owner:b.owner?String(b.owner):undefined});
        await ownerOperationsStore.updateOfficeLead(updated);return json(res,200,{version:'5.6.0',lead:updated});
      }catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    const officeLeadConvert=routeMatch(path,/^\/api\/v1\/ai-office\/leads\/([^/]+)\/convert-to-project$/);
    if(req.method==='POST'&&officeLeadConvert){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const lead=ops.officeLeads.find(x=>x.id===officeLeadConvert[1]!);if(!lead)return json(res,404,{error:'office_lead_not_found'});
      if(lead.projectId)return json(res,409,{error:'office_lead_already_converted',projectId:lead.projectId});
      const organizationId=String(b.organizationId??DEMO_ORG_ID);
      const created=await repository.createProject({organizationId,name:String(b.projectName??lead.company??lead.name),projectType:String(b.projectType??'other') as any,currency:lead.currency,locale:'ru-CZ'},bearer(req));
      let snap=created.snapshot!;
      snap=updateJobControl(snap,{stage:'lead',client:{name:lead.name,...(lead.email?{email:lead.email}:{}),...(lead.phone?{phone:lead.phone}:{}),...(lead.company?{company:lead.company}:{})},money:{currency:lead.currency,...(lead.estimatedValueMinor?{contractValueMinor:lead.estimatedValueMinor}:{})}});
      const saved=await repository.createRevision({organizationId:created.organizationId,projectId:created.id,parentRevisionId:created.currentRevisionId,snapshot:snap,changeSet:null,source:'system'},bearer(req));
      lead.projectId=created.id;lead.status='qualified';lead.updatedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeLead(lead);
      return json(res,201,{version:'5.6.0',lead,project:saved});
    }
    if(req.method==='POST'&&path==='/api/v1/ai-office/growth/connections'){
      const b=await readJson(req);
      try{const c=connectGrowthProvider({provider:String(b.provider??'') as any,accountId:b.accountId?String(b.accountId):undefined,displayName:b.displayName?String(b.displayName):undefined});await ownerOperationsStore.addGrowthConnection(c);return json(res,201,{version:'5.6.0',connection:c})}
      catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='POST'&&path==='/api/v1/ai-office/growth/sync'){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      try{
        const result=applyGrowthProviderSync(ops,{provider:String(b.provider??'') as any,providerCampaignId:String(b.providerCampaignId??''),capturedAt:b.capturedAt?String(b.capturedAt):undefined,spendMinor:Number(b.spendMinor??0),impressions:Number(b.impressions??0),clicks:Number(b.clicks??0),leads:Number(b.leads??0),attributedRevenueMinor:Number(b.attributedRevenueMinor??0),raw:b.raw&&typeof b.raw==='object'?b.raw:undefined});
        await ownerOperationsStore.updateOfficeCampaign(result.campaign);await ownerOperationsStore.addGrowthSyncSnapshot(result.snapshot);
        return json(res,201,{version:'5.6.0',...result});
      }catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    const campaignProviderMap=routeMatch(path,/^\/api\/v1\/ai-office\/campaigns\/([^/]+)\/provider-map$/);
    if(req.method==='POST'&&campaignProviderMap){
      const b=await readJson(req),ops=await ownerOperationsStore.get(),c=ops.officeCampaigns.find(x=>x.id===campaignProviderMap[1]!);
      if(!c)return json(res,404,{error:'office_campaign_not_found'});
      c.providerCampaignId=String(b.providerCampaignId??'').trim();if(!c.providerCampaignId)return json(res,400,{error:'provider_campaign_id_required'});
      c.updatedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeCampaign(c);return json(res,200,{version:'5.6.0',campaign:c});
    }
    if(req.method==='POST'&&path==='/api/v1/ai-office/growth/guardrails'){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const existing=ops.growthSpendGuardrails.find(x=>x.currency===String(b.currency??'EUR')&&x.provider===(b.provider?String(b.provider):undefined));
      const g={
        ...(existing??defaultGrowthGuardrail(String(b.currency??'EUR'))),
        provider:b.provider?String(b.provider) as any:undefined,
        dailySpendLimitMinor:Math.max(0,Number(b.dailySpendLimitMinor??existing?.dailySpendLimitMinor??100000)),
        monthlySpendLimitMinor:Math.max(0,Number(b.monthlySpendLimitMinor??existing?.monthlySpendLimitMinor??1000000)),
        maxBudgetIncreasePercent:Math.max(0,Number(b.maxBudgetIncreasePercent??existing?.maxBudgetIncreasePercent??35)),
        maxBudgetDecreasePercent:Math.max(0,Number(b.maxBudgetDecreasePercent??existing?.maxBudgetDecreasePercent??80)),
        allowPause:b.allowPause!==false,requireOwnerApproval:true,enabled:b.enabled!==false,updatedAt:new Date().toISOString()
      };
      await ownerOperationsStore.upsertGrowthSpendGuardrail(g);
      await ownerOperationsStore.addGrowthAuditLog(auditEntry({category:'guardrail',action:'upsert_guardrail',entityType:'policy',entityId:g.id,actor:String(b.updatedBy??'owner'),status:'info',after:g as any,detail:'Growth spend guardrail updated.',...(g.provider?{provider:g.provider}:{})}));
      return json(res,201,{version:'5.6.0',guardrail:g});
    }

    const growthActivate=routeMatch(path,/^\/api\/v1\/ai-office\/growth\/connections\/([^/]+)\/activate$/);
    if(req.method==='POST'&&growthActivate){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const c=ops.growthConnections.find(x=>x.id===growthActivate[1]!);if(!c)return json(res,404,{error:'growth_connection_not_found'});
      const ref=String(b.executorConnectionRef??'').trim();if(!ref)return json(res,400,{error:'executor_connection_ref_required'});
      c.executorConnectionRef=ref;c.capabilities=Array.isArray(b.capabilities)?b.capabilities.map(String) as any:['read_metrics','change_budget','pause_campaign','lead_ingestion'];
      c.status=(process.env.MAKSTER_GROWTH_EXECUTOR_URL&&process.env.MAKSTER_GROWTH_EXECUTOR_TOKEN)?'connected':'configured';
      c.updatedAt=new Date().toISOString();await ownerOperationsStore.updateGrowthConnection(c);
      await ownerOperationsStore.addGrowthAuditLog(auditEntry({category:'connection',action:'activate_connection',entityType:'connection',entityId:c.id,actor:String(b.activatedBy??'owner'),status:c.status==='connected'?'executed':'info',after:{provider:c.provider,status:c.status,accountId:c.accountId,capabilities:c.capabilities},detail:c.status==='connected'?'Provider executor connection activated.':'Connection reference stored; executor service is not configured on this server.',provider:c.provider}));
      return json(res,200,{version:'5.6.0',connection:c,executorConfigured:Boolean(process.env.MAKSTER_GROWTH_EXECUTOR_URL&&process.env.MAKSTER_GROWTH_EXECUTOR_TOKEN)});
    }

    const providerExecute=routeMatch(path,/^\/api\/v1\/ai-office\/autopilot\/decisions\/([^/]+)\/execute-provider$/);
    if(req.method==='POST'&&providerExecute){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const d=ops.officeAutopilotDecisions.find(x=>x.id===providerExecute[1]!);if(!d)return json(res,404,{error:'autopilot_decision_not_found'});
      if(!d.approvalId)return json(res,409,{error:'autopilot_decision_has_no_approval'});
      const approval=ops.officeApprovals.find(x=>x.id===d.approvalId);if(!approval||!['approved','executed'].includes(approval.status))return json(res,403,{error:'owner_approval_required'});
      const c=ops.officeCampaigns.find(x=>x.id===d.campaignId);if(!c)return json(res,404,{error:'office_campaign_not_found'});
      const provider=growthProviderForChannel(c.channel);if(!provider)return json(res,409,{error:'campaign_channel_has_no_live_provider'});
      const prior=ops.growthProviderExecutions.find(x=>x.decisionId===d.id&&['executed','executing','queued'].includes(x.status));
      if(prior)return json(res,409,{error:'growth_execution_already_exists',execution:prior});
      let execution;
      try{execution=createGrowthExecution({state:ops,decision:d,campaign:c,approvalId:approval.id,provider,requestedBy:String(b.requestedBy??'owner'),now:new Date()})}
      catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
      await ownerOperationsStore.addGrowthProviderExecution(execution);
      if(execution.status==='blocked'){
        d.providerExecution='blocked';await ownerOperationsStore.updateOfficeAutopilotDecision(d);
        await ownerOperationsStore.addGrowthAuditLog(auditEntry({category:'guardrail',action:'provider_execution_blocked',entityType:'decision',entityId:d.id,actor:String(b.requestedBy??'owner'),status:'blocked',before:{budgetMinor:execution.beforeBudgetMinor},after:{targetBudgetMinor:execution.targetBudgetMinor},detail:execution.guardrailCheck.reasons.join(', ')||'Blocked by guardrail.',provider}));
        return json(res,409,{version:'5.6.0',error:'growth_execution_blocked_by_guardrail',execution});
      }
      const connection=ops.growthConnections.find(x=>x.provider===provider&&x.status==='connected');
      const adapter=makeServerGrowthAdapter(connection);
      execution=await executeGrowthProviderMutation(execution,adapter as any);
      await ownerOperationsStore.updateGrowthProviderExecution(execution);
      d.providerExecution=execution.status==='executed'?'executed':execution.status==='failed'?'failed':'pending_connection';
      await ownerOperationsStore.updateOfficeAutopilotDecision(d);
      await ownerOperationsStore.addGrowthAuditLog(auditEntry({
        category:'provider_execution',action:`provider_${d.action}`,entityType:'decision',entityId:d.id,actor:String(b.requestedBy??'owner'),
        status:execution.status==='executed'?'executed':execution.status==='failed'?'failed':'blocked',
        before:{budgetMinor:execution.beforeBudgetMinor},after:{targetBudgetMinor:execution.targetBudgetMinor,providerStatus:execution.providerStatus},
        detail:execution.status==='executed'?'Provider confirmed the external mutation.':execution.error??execution.status,provider
      }));
      return json(res,execution.status==='executed'?200:409,{version:'5.6.0',execution,decision:d});
    }

    if(req.method==='POST'&&path==='/api/v1/ai-office/growth/leads/ingest'){
      const b=await readJson(req);
      const canonical=JSON.stringify(b),sig=Array.isArray(req.headers['x-makster-signature'])?req.headers['x-makster-signature'][0]:req.headers['x-makster-signature'];
      const verified=verifyGrowthIngestSignature(canonical,sig);
      const ops=await ownerOperationsStore.get();
      const result=ingestGrowthLeadEvent(ops,{
        provider:String(b.provider??'website') as any,providerLeadId:String(b.providerLeadId??''),
        providerCampaignId:b.providerCampaignId?String(b.providerCampaignId):undefined,signatureVerified:verified,
        payload:b.payload&&typeof b.payload==='object'?b.payload:{},sourceIp:req.socket.remoteAddress,receivedAt:new Date().toISOString()
      });
      await ownerOperationsStore.addGrowthInboundLeadEvent(result.event);
      if(result.lead)await ownerOperationsStore.addOfficeLead(result.lead);
      await ownerOperationsStore.addGrowthAuditLog(auditEntry({
        category:'lead_ingestion',action:'ingest_lead',entityType:'lead',entityId:result.lead?.id??result.event.id,actor:'growth_gateway',
        status:result.event.status==='ingested'?'executed':result.event.status==='duplicate'?'duplicate':'blocked',
        after:{providerLeadId:result.event.providerLeadId,campaignId:result.lead?.campaignId,leadId:result.lead?.id},
        detail:result.event.status==='ingested'?'Inbound lead ingested into AI Office CRM.':result.event.error??result.event.status,
        ...(result.event.provider==='website'?{}:{provider:result.event.provider})
      }));
      return json(res,result.event.status==='ingested'?201:result.event.status==='duplicate'?200:403,{version:'5.6.0',event:result.event,lead:result.lead});
    }

    if(req.method==='GET'&&path==='/api/v1/ai-office/growth/audit'){
      const ops=await ownerOperationsStore.get();
      return json(res,200,{version:'5.6.0',entries:ops.growthAuditLog.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,500)});
    }

    if(req.method==='POST'&&path==='/api/v1/ai-office/autopilot/run'){
      const b=await readJson(req),currency=String(b.currency??'EUR'),ops=await ownerOperationsStore.get();
      const projects=(await repository.listProjects(String(b.organizationId??DEMO_ORG_ID),bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      reconcileProjectRevenueAttribution(projects,ops);
      const result=buildGrowthAutopilot(ops,currency,new Date());
      await ownerOperationsStore.addOfficeAutopilotRun(result.run);
      for(const d of result.decisions){
        if(d.action!=='hold'){
          const approval=autopilotApprovalForDecision(d);d.approvalId=approval.id;
          await ownerOperationsStore.addOfficeApproval(approval);
        }
        await ownerOperationsStore.addOfficeAutopilotDecision(d);
      }
      return json(res,201,{version:'5.6.0',mode:'recommend_only',...result});
    }
    const autopilotApprove=routeMatch(path,/^\/api\/v1\/ai-office\/autopilot\/decisions\/([^/]+)\/approve$/);
    if(req.method==='POST'&&autopilotApprove){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const d=ops.officeAutopilotDecisions.find(x=>x.id===autopilotApprove[1]!);if(!d)return json(res,404,{error:'autopilot_decision_not_found'});
      if(!d.approvalId)return json(res,409,{error:'autopilot_hold_requires_no_approval'});
      const approval=ops.officeApprovals.find(x=>x.id===d.approvalId);if(!approval)return json(res,404,{error:'autopilot_approval_not_found'});
      if(approval.status!=='pending')return json(res,409,{error:'autopilot_approval_not_pending'});
      approval.status='approved';approval.decidedBy=String(b.decidedBy??'owner');approval.decidedAt=new Date().toISOString();
      await ownerOperationsStore.updateOfficeApproval(approval);
      d.status='approved';d.decidedBy=approval.decidedBy;d.decidedAt=approval.decidedAt;
      const campaign=ops.officeCampaigns.find(x=>x.id===d.campaignId);if(!campaign)return json(res,404,{error:'office_campaign_not_found'});
      const executed=executeApprovedAutopilotDecision(d,campaign,approval);
      await ownerOperationsStore.updateOfficeCampaign(executed.campaign);await ownerOperationsStore.updateOfficeAutopilotDecision(executed.decision);
      approval.status='executed';approval.executedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeApproval(approval);
      return json(res,200,{version:'5.6.0',decision:executed.decision,campaign:executed.campaign,approval,
        externalProviderMutation:false,providerExecution:executed.decision.providerExecution});
    }
    const autopilotReject=routeMatch(path,/^\/api\/v1\/ai-office\/autopilot\/decisions\/([^/]+)\/reject$/);
    if(req.method==='POST'&&autopilotReject){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const d=ops.officeAutopilotDecisions.find(x=>x.id===autopilotReject[1]!);if(!d)return json(res,404,{error:'autopilot_decision_not_found'});
      if(d.approvalId){
        const approval=ops.officeApprovals.find(x=>x.id===d.approvalId);
        if(approval&&approval.status==='pending'){approval.status='rejected';approval.decidedBy=String(b.decidedBy??'owner');approval.decidedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeApproval(approval)}
      }
      d.status='rejected';d.decidedBy=String(b.decidedBy??'owner');d.decidedAt=new Date().toISOString();
      await ownerOperationsStore.updateOfficeAutopilotDecision(d);return json(res,200,{version:'5.6.0',decision:d});
    }
    if(req.method==='POST'&&path==='/api/v1/ai-office/cycles/run'){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const result=runMaksterOfficeCycle(ops,{title:b.title?String(b.title):undefined,market:String(b.market??'CZ'),currency:String(b.currency??'EUR'),monthlyBudgetMinor:Number(b.monthlyBudgetMinor??0),goal:b.goal?String(b.goal):undefined,createdBy:String(b.createdBy??'owner')});
      await ownerOperationsStore.addOfficeCycle(result.cycle);await ownerOperationsStore.addOfficeAgentRuns(result.runs);
      for(const a of result.approvals)await ownerOperationsStore.addOfficeApproval(a);
      await ownerOperationsStore.addOfficeOwnerBrief(result.brief);
      return json(res,201,{version:'5.6.0',...result});
    }
    const officeApprovalAction=routeMatch(path,/^\/api\/v1\/ai-office\/approvals\/([^/]+)\/(approve|reject)$/);
    if(req.method==='POST'&&officeApprovalAction){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const approval=ops.officeApprovals.find(x=>x.id===officeApprovalAction[1]!);if(!approval)return json(res,404,{error:'office_approval_not_found'});
      if(approval.status!=='pending')return json(res,409,{error:'office_approval_not_pending'});
      approval.status=officeApprovalAction[2]==='approve'?'approved':'rejected';approval.decidedBy=String(b.decidedBy??'owner');approval.decidedAt=new Date().toISOString();
      await ownerOperationsStore.updateOfficeApproval(approval);
      if(approval.status==='approved'&&approval.entityType==='campaign'){
        const c=ops.officeCampaigns.find(x=>x.id===approval.entityId);
        const auto=ops.officeAutopilotDecisions.find(x=>x.approvalId===approval.id);
        if(c&&auto){
          auto.status='approved';auto.decidedBy=approval.decidedBy;auto.decidedAt=approval.decidedAt;
          const executed=executeApprovedAutopilotDecision(auto,c,approval);
          await ownerOperationsStore.updateOfficeCampaign(executed.campaign);await ownerOperationsStore.updateOfficeAutopilotDecision(executed.decision);
          approval.status='executed';approval.executedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeApproval(approval);
        }else if(c&&approval.kind==='campaign_budget'){
          c.status='planned';c.updatedAt=new Date().toISOString();await ownerOperationsStore.updateOfficeCampaign(c)
        }
      }
      return json(res,200,{version:'5.6.0',approval});
    }
    if(req.method==='GET'&&path==='/api/v1/business-os'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const month=url.searchParams.get('month')??new Date().toISOString().slice(0,7);
      const records=await repository.listProjects(organizationId,bearer(req));
      const allProjects=records.map(x=>x.snapshot).filter(Boolean) as any[];
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,currency);
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      // Closed projects still need engineering context for lifecycle consistency if geometry exists.
      for(const rec of records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage==='closed')){
        try{rows.push({project:rec.snapshot!,engineering:engineering.compile(rec.snapshot!),queuePosition:9999})}catch{}
      }
      return json(res,200,buildBusinessOperatingSystem(rows,allProjects,ops,currency,month,new Date()));
    }

    const businessClose=routeMatch(path,/^\/api\/v1\/business-os\/projects\/([^/]+)\/close$/);
    if(req.method==='POST'&&businessClose){
      const b=await readJson(req),current=await repository.getProject(businessClose[1]!,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(b.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const gate=validateBusinessProjectClose(current.snapshot,await ownerOperationsStore.get());
      if(!gate.canClose)return json(res,409,{error:'business_close_gate_blocked',gate});
      const snapshot=updateJobControl(current.snapshot,{stage:'closed'});
      const created=await repository.createRevision({
        organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
        snapshot,changeSet:null,source:'manual'
      },bearer(req));
      return json(res,201,{version:'5.0.0',closedBy:String(b.closedBy??'owner'),project:created,gate});
    }

    if(req.method==='GET'&&path==='/api/v1/owner-finance'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const month=url.searchParams.get('month')??new Date().toISOString().slice(0,7);
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      return json(res,200,buildOwnerFinanceReport(projects,await ownerOperationsStore.get(),currency,month,new Date()));
    }
    if(req.method==='GET'&&path==='/api/v1/owner-finance/trend'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const month=url.searchParams.get('month')??new Date().toISOString().slice(0,7);
      const months=Math.max(1,Math.min(24,Number(url.searchParams.get('months')??6)));
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      return json(res,200,buildFinanceTrend(projects,await ownerOperationsStore.get(),currency,month,months));
    }
    if(req.method==='POST'&&path==='/api/v1/owner-finance/ledger'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.addFinanceLedgerEntry({
        type:String(b.type??'adjustment') as any,category:String(b.category??'other'),amountMinor:Number(b.amountMinor??0),
        currency:String(b.currency??'EUR'),effectiveAt:String(b.effectiveAt??new Date().toISOString()),
        projectId:b.projectId?String(b.projectId):undefined,counterparty:b.counterparty?String(b.counterparty):undefined,
        note:b.note?String(b.note):undefined,source:String(b.source??'manual') as any,
        sourceId:b.sourceId?String(b.sourceId):undefined,createdBy:String(b.createdBy??'owner')
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='POST'&&path==='/api/v1/owner-finance/settings'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.upsertFinanceSettings({
        currency:String(b.currency??'EUR'),targetGrossMarginPercent:Number(b.targetGrossMarginPercent??35),
        targetOperatingMarginPercent:Number(b.targetOperatingMarginPercent??15),taxReservePercent:Number(b.taxReservePercent??20),
        runwaySafetyMonths:Number(b.runwaySafetyMonths??3)
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }

    if(req.method==='GET'&&path==='/api/v1/procurement-automation-center'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const material=buildProcurementAutomationCenter(rows,ops,new Date());
      const outsource=[...procurementRfqs.values()].map(rfq=>({
        rfq,quotes:procurementQuotes.get(rfq.rfqId)??[],comparison:procurementComparisons.get(rfq.rfqId)??null,
        communications:[...communicationThreads.values()].filter(t=>t.rfqId===rfq.rfqId).length
      }));
      return json(res,200,{...material,outsourceRfqs:outsource});
    }

    if(req.method==='POST'&&path==='/api/v1/procurement-automation/rfqs/from-shortage'){
      const b=await readJson(req);
      const projectId=String(b.projectId??''),sku=String(b.sku??'');
      const organizationId=String(b.organizationId??DEMO_ORG_ID);
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,String(b.currency??'EUR'));
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const center=buildProcurementAutomationCenter(rows,ops,new Date());
      const demand=center.shortages.find(x=>x.projectId===projectId&&x.sku.trim().toLowerCase()===sku.trim().toLowerCase());
      if(!demand)return json(res,404,{error:'procurement_shortage_not_found'});
      if(demand.rfqId)return json(res,409,{error:'procurement_shortage_already_has_rfq',rfqId:demand.rfqId});
      const requested=Array.isArray(b.supplierIds)?b.supplierIds.map(String):[];
      const suppliers=requested.length?ops.suppliers.filter(x=>requested.includes(x.id)):ops.suppliers;
      try{
        const rfq=createMaterialRfq({
          projectId:demand.projectId,projectTitle:demand.projectTitle,sku:demand.sku,description:demand.description,
          quantity:demand.shortage,unit:demand.unit,currency:String(b.currency??'EUR'),suppliers,
          strategy:(String(b.strategy??'optimal') as any),responseDeadline:b.responseDeadline?String(b.responseDeadline):undefined,
          createdBy:String(b.createdBy??'owner'),note:b.note?String(b.note):undefined
        });
        await ownerOperationsStore.addMaterialRfq(rfq);
        return json(res,201,{version:'4.8.0',rfq});
      }catch(e){return json(res,409,{error:e instanceof Error?e.message:String(e)})}
    }

    const materialRfqDrafts=routeMatch(path,/^\/api\/v1\/procurement-automation\/rfqs\/([^/]+)\/drafts$/);
    if(req.method==='POST'&&materialRfqDrafts){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const rfq=ops.materialRfqs.find(x=>x.id===materialRfqDrafts[1]!);
      if(!rfq)return json(res,404,{error:'material_rfq_not_found'});
      const provider=(String(b.provider??'memory')==='gmail'?'gmail':'memory') as 'gmail'|'memory';
      const created:any[]=[];
      for(const supplierId of rfq.supplierIds){
        const supplier=ops.suppliers.find(x=>x.id===supplierId);if(!supplier)continue;
        const old=ops.materialRfqCommunications.find(x=>x.rfqId===rfq.id&&x.supplierId===supplierId&&x.kind==='rfq_invitation'&&x.direction==='outbound');
        if(old){created.push(old);continue}
        try{
          const draft=makeMaterialCommunicationDraft(rfq,supplier,provider);
          if(b.providerAccountRef)draft.providerAccountRef=String(b.providerAccountRef);
          await ownerOperationsStore.addMaterialRfqCommunication(draft);created.push(draft);
        }catch(e){created.push({supplierId,error:e instanceof Error?e.message:String(e)})}
      }
      return json(res,201,{version:'4.8.0',rfqId:rfq.id,drafts:created});
    }

    const materialRfqSend=routeMatch(path,/^\/api\/v1\/procurement-automation\/rfqs\/([^/]+)\/send$/);
    if(req.method==='POST'&&materialRfqSend){
      const b=await readJson(req);
      if(!String(b.approvedBy??'').trim())return json(res,403,{error:'owner_approval_required_to_send_rfq'});
      const ops=await ownerOperationsStore.get();
      const rfq=ops.materialRfqs.find(x=>x.id===materialRfqSend[1]!);
      if(!rfq)return json(res,404,{error:'material_rfq_not_found'});
      const providerKind=String(b.provider??'memory');
      const providerAccountRef=b.providerAccountRef?String(b.providerAccountRef):undefined;
      const provider=await communicationProvider(providerKind,providerAccountRef);
      const results:any[]=[];
      for(const supplierId of rfq.supplierIds){
        const supplier=ops.suppliers.find(x=>x.id===supplierId);if(!supplier)continue;
        let comm=ops.materialRfqCommunications.find(x=>x.rfqId===rfq.id&&x.supplierId===supplierId&&x.kind==='rfq_invitation'&&x.direction==='outbound');
        if(!comm){
          comm=makeMaterialCommunicationDraft(rfq,supplier,provider.kind);
          if(providerAccountRef)comm.providerAccountRef=providerAccountRef;
          await ownerOperationsStore.addMaterialRfqCommunication(comm);
        }
        if(comm.status==='sent'){results.push({supplierId,status:'already_sent'});continue}
        try{
          const sent=await provider.send({to:comm.supplierEmail,subject:comm.subject,text:comm.bodyText});
          comm={...comm,status:'sent',provider:provider.kind,...(providerAccountRef?{providerAccountRef}:{}),
            providerMessageId:sent.messageId,...(sent.threadId?{providerThreadId:sent.threadId}:{}),sentAt:sent.sentAt};
          await ownerOperationsStore.updateMaterialRfqCommunication(comm);
          results.push({supplierId,status:'sent',messageId:sent.messageId});
        }catch(e){
          comm={...comm,status:'failed',error:e instanceof Error?e.message:String(e)};
          await ownerOperationsStore.updateMaterialRfqCommunication(comm);
          results.push({supplierId,status:'failed',error:comm.error});
        }
      }
      rfq.status=results.some(x=>x.status==='sent'||x.status==='already_sent')?'sent':rfq.status;
      rfq.sentAt=new Date().toISOString();await ownerOperationsStore.updateMaterialRfq(rfq);
      return json(res,200,{version:'4.8.0',approvedBy:String(b.approvedBy),rfq,results});
    }

    const materialRfqReply=routeMatch(path,/^\/api\/v1\/procurement-automation\/rfqs\/([^/]+)\/replies$/);
    if(req.method==='POST'&&materialRfqReply){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const rfq=ops.materialRfqs.find(x=>x.id===materialRfqReply[1]!);
      if(!rfq)return json(res,404,{error:'material_rfq_not_found'});
      const supplierId=String(b.supplierId??''),supplier=ops.suppliers.find(x=>x.id===supplierId);
      if(!supplier)return json(res,404,{error:'supplier_not_found'});
      const text=String(b.text??'').trim(),fromEmail=String(b.fromEmail??'').trim();
      if(!text||!fromEmail)return json(res,400,{error:'supplier_reply_text_and_email_required'});
      const parsed=parseMaterialRfqReply({rfq,supplier,text,fromEmail,receivedAt:b.receivedAt?String(b.receivedAt):undefined});
      const related=ops.materialRfqCommunications.find(x=>x.rfqId===rfq.id&&x.supplierId===supplierId&&x.direction==='outbound');
      const inbound={
        id:randomUUID(),rfqId:rfq.id,supplierId,supplierName:supplier.name,supplierEmail:fromEmail,
        direction:'inbound' as const,kind:(parsed.classification==='quote_candidate'?'quote_received':parsed.classification==='declined'?'decline':'supplier_reply') as any,
        status:'received' as const,subject:related?.subject??`RFQ ${rfq.id}`,bodyText:text,responseToken:related?.responseToken??'',
        provider:related?.provider??'memory',...(related?.providerAccountRef?{providerAccountRef:related.providerAccountRef}:{}),
        createdAt:new Date().toISOString(),receivedAt:String(b.receivedAt??new Date().toISOString()),
        ...(parsed.quote?{parsedQuoteId:parsed.quote.id}:{})
      };
      await ownerOperationsStore.addMaterialRfqCommunication(inbound);
      if(parsed.quote)await ownerOperationsStore.addSupplierQuote({
        supplierId:parsed.quote.supplierId,rfqId:parsed.quote.rfqId,reference:parsed.quote.reference,currency:parsed.quote.currency,
        lines:parsed.quote.lines,leadTimeDays:parsed.quote.leadTimeDays,validUntil:parsed.quote.validUntil,
        deliveryCostMinor:parsed.quote.deliveryCostMinor
      });
      const latest=await ownerOperationsStore.get();
      const quoteCount=latest.supplierQuotes.filter(x=>x.rfqId===rfq.id).length;
      const responded=new Set(latest.materialRfqCommunications.filter(x=>x.rfqId===rfq.id&&x.direction==='inbound').map(x=>x.supplierId));
      rfq.status=responded.size>=rfq.supplierIds.length?(quoteCount>0?'quoted':'closed'):'partially_quoted';
      await ownerOperationsStore.updateMaterialRfq(rfq);
      return json(res,200,{version:'4.8.0',parsed,quoteImported:Boolean(parsed.quote),rfq});
    }

    if(req.method==='POST'&&path==='/api/v1/procurement-automation/reminders/run'){
      const b=await readJson(req);
      if(!String(b.approvedBy??'').trim())return json(res,403,{error:'owner_approval_required_to_send_reminders'});
      const ops=await ownerOperationsStore.get(),due=materialRfqReminderCandidates(ops,new Date(),Number(b.afterHours??24));
      const results:any[]=[];
      for(const c of due){
        const rfq=ops.materialRfqs.find(x=>x.id===c.rfqId),supplier=ops.suppliers.find(x=>x.id===c.supplierId);
        const original=ops.materialRfqCommunications.find(x=>x.id===c.communicationId);
        if(!rfq||!supplier||!original)continue;
        try{
          const provider=await communicationProvider(original.provider,original.providerAccountRef);
          const subject=`Reminder: ${original.subject}`;
          const bodyText=`Hello ${supplier.name},

Reminder about Makster material RFQ ${rfq.id}.
SKU: ${rfq.sku}
Quantity: ${rfq.quantity} ${rfq.unit}
Response deadline: ${rfq.responseDeadline}
Please reply in the original RFQ format.

Thank you.
Makster Procurement`;
          const sent=await provider.send({to:original.supplierEmail,subject,text:bodyText,...(original.providerThreadId?{threadId:original.providerThreadId}:{})});
          const comm={id:randomUUID(),rfqId:rfq.id,supplierId:supplier.id,supplierName:supplier.name,supplierEmail:original.supplierEmail,
            direction:'outbound' as const,kind:'reminder' as const,status:'sent' as const,subject,bodyText,responseToken:original.responseToken,
            provider:original.provider,...(original.providerAccountRef?{providerAccountRef:original.providerAccountRef}:{}),
            providerMessageId:sent.messageId,...(sent.threadId?{providerThreadId:sent.threadId}:{}),createdAt:new Date().toISOString(),sentAt:sent.sentAt};
          await ownerOperationsStore.addMaterialRfqCommunication(comm);results.push({rfqId:rfq.id,supplierId:supplier.id,status:'sent'});
        }catch(e){results.push({rfqId:c.rfqId,supplierId:c.supplierId,status:'failed',error:e instanceof Error?e.message:String(e)})}
      }
      return json(res,200,{version:'4.8.0',approvedBy:String(b.approvedBy),due:due.length,results});
    }

    const materialRfqCompare=routeMatch(path,/^\/api\/v1\/procurement-automation\/rfqs\/([^/]+)\/compare$/);
    if(req.method==='POST'&&materialRfqCompare){
      const b=await readJson(req),ops=await ownerOperationsStore.get();
      const rfq=ops.materialRfqs.find(x=>x.id===materialRfqCompare[1]!);
      if(!rfq)return json(res,404,{error:'material_rfq_not_found'});
      if(b.strategy)rfq.strategy=String(b.strategy) as any;
      const comparison=materialRfqComparison(rfq,ops);
      if(!comparison.ranking.length)return json(res,409,{error:'material_rfq_has_no_valid_quotes'});
      rfq.status='compared';rfq.recommendedQuoteId=comparison.recommendedQuoteId??undefined;
      await ownerOperationsStore.updateMaterialRfq(rfq);
      return json(res,200,{version:'4.8.0',rfq,comparison});
    }

    const materialRfqSelect=routeMatch(path,/^\/api\/v1\/procurement-automation\/rfqs\/([^/]+)\/select-winner$/);
    if(req.method==='POST'&&materialRfqSelect){
      const b=await readJson(req);
      if(!String(b.approvedBy??'').trim())return json(res,403,{error:'owner_approval_required_to_select_supplier'});
      const ops=await ownerOperationsStore.get(),rfq=ops.materialRfqs.find(x=>x.id===materialRfqSelect[1]!);
      if(!rfq)return json(res,404,{error:'material_rfq_not_found'});
      const quoteId=String(b.quoteId??rfq.recommendedQuoteId??'');
      const quote=ops.supplierQuotes.find(x=>x.id===quoteId&&x.rfqId===rfq.id);
      if(!quote)return json(res,404,{error:'material_rfq_quote_not_found'});
      rfq.selectedQuoteId=quote.id;rfq.status='winner_selected';await ownerOperationsStore.updateMaterialRfq(rfq);
      return json(res,200,{version:'4.8.0',approvedBy:String(b.approvedBy),rfq,awardReady:{
        quoteId:quote.id,projectId:rfq.projectId,sku:rfq.sku,quantity:rfq.quantity
      }});
    }

    if(req.method==='POST'&&path==='/api/v1/production-operations/sync'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const synced=syncProductionOperations(rows,ops,new Date());
      await ownerOperationsStore.replaceProductionOperations(synced.operations);
      return json(res,200,{version:'4.7.0',operationCount:synced.operations.length,operations:synced.operations});
    }
    if(req.method==='GET'&&path==='/api/v1/operations-control-tower'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      return json(res,200,buildOperationsControlTower(rows,ops,new Date()));
    }
    const productionOperationAction=routeMatch(path,/^\/api\/v1\/production-operations\/([^/]+)\/(assign|start|complete|block|unblock|skip)$/);
    if(req.method==='POST'&&productionOperationAction){
      const b=await readJson(req);
      const ops=await ownerOperationsStore.get();
      const current=ops.productionOperations.find(x=>x.id===productionOperationAction[1]!);
      if(!current)return json(res,404,{error:'production_operation_not_found'});
      try{
        const next=transitionProductionOperation(current,productionOperationAction[2] as any,{
          assignee:b.assignee?String(b.assignee):undefined,
          actualHours:b.actualHours!=null?Number(b.actualHours):undefined,
          reason:b.reason?String(b.reason):undefined,
          at:b.at?String(b.at):undefined
        });
        await ownerOperationsStore.updateProductionOperation(next);
        if(productionOperationAction[2]==='complete'){
          const actualHours=next.actualHours??next.plannedHours;
          await ownerOperationsStore.addProductionTimeEntry({
            projectId:next.projectId,centerKind:next.centerKind,plannedHours:next.plannedHours,
            actualHours,completedAt:next.actualFinish??new Date().toISOString(),recordedBy:String(b.recordedBy??'operator'),
            note:`Operations Control Tower completion · ${next.centerName}`
          });
          // Advance next operation to READY while preserving all facts.
          const fresh=await ownerOperationsStore.get();
          const projectOps=fresh.productionOperations.filter(x=>x.projectId===next.projectId).sort((a,b)=>a.sequence-b.sequence);
          const following=projectOps.find(x=>x.sequence===next.sequence+1&&x.status==='planned');
          if(following){
            following.status='ready';following.updatedAt=new Date().toISOString();
            await ownerOperationsStore.updateProductionOperation(following);
          }
        }
        return json(res,200,{version:'4.7.0',operation:next});
      }catch(e){return json(res,409,{error:e instanceof Error?e.message:String(e)})}
    }

    if(req.method==='GET'&&path==='/api/v1/decision-plans'){
      const ops=await ownerOperationsStore.get();
      return json(res,200,{version:'4.6.0',plans:(ops.decisionPlans??[]).slice().reverse()});
    }
    if(req.method==='POST'&&path==='/api/v1/decision-plans'){
      const b=await readJson(req);
      const scenarioId=String(b.scenarioId??''),currency=String(b.currency??'EUR');
      const organizationId=String(b.organizationId??DEMO_ORG_ID);
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,currency);
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const planner=buildOwnerScenarioPlanner(rows,ops,currency,new Date());
      const selected=scenarioId==='baseline'?planner.baseline:planner.scenarios.find(x=>x.scenario.id===scenarioId);
      if(!selected)return json(res,404,{error:'scenario_not_found'});
      const plan=createDecisionPlanFromScenario(selected,planner.baseline,String(b.createdBy??'owner'));
      await ownerOperationsStore.addDecisionPlan(plan);
      return json(res,201,{version:'4.6.0',plan,summary:decisionPlanSummary(plan)});
    }
    const decisionItemAction=routeMatch(path,/^\/api\/v1\/decision-plans\/([^/]+)\/items\/([^/]+)\/(approve|reject)$/);
    if(req.method==='POST'&&decisionItemAction){
      const b=await readJson(req);
      const ops=await ownerOperationsStore.get();
      const plan=ops.decisionPlans?.find(x=>x.id===decisionItemAction[1]!);
      if(!plan)return json(res,404,{error:'decision_plan_not_found'});
      const item=plan.items.find(x=>x.id===decisionItemAction[2]!);
      if(!item)return json(res,404,{error:'decision_plan_item_not_found'});
      if(!['pending_approval','approved'].includes(item.status))return json(res,409,{error:'decision_item_not_pending'});
      if(decisionItemAction[3]==='approve'){
        item.status='approved';item.approvedBy=String(b.approvedBy??'owner');item.approvedAt=new Date().toISOString();
      }else{
        item.status='rejected';item.approvedBy=String(b.approvedBy??'owner');item.approvedAt=new Date().toISOString();
      }
      refreshDecisionPlanStatus(plan);await ownerOperationsStore.updateDecisionPlan(plan);
      return json(res,200,{version:'4.6.0',plan,summary:decisionPlanSummary(plan)});
    }
    const decisionApply=routeMatch(path,/^\/api\/v1\/decision-plans\/([^/]+)\/apply$/);
    if(req.method==='POST'&&decisionApply){
      const ops=await ownerOperationsStore.get();
      const plan=ops.decisionPlans?.find(x=>x.id===decisionApply[1]!);
      if(!plan)return json(res,404,{error:'decision_plan_not_found'});
      const results:any[]=[];
      for(const item of plan.items){
        if(item.status!=='approved')continue;
        try{
          if(item.externalAction){
            item.status='ready_external';
            results.push({itemId:item.id,status:'ready_external',note:'Owner approved. External action is prepared but not auto-executed.'});
            continue;
          }
          if(item.type==='queue_priority'){
            const projectId=String(item.payload.projectId??item.projectId??''),priority=Number(item.payload.priority??0);
            if(!projectId||priority<=0)throw new Error('queue_priority_payload_invalid');
            await ownerOperationsStore.setQueuePriority({projectId,priority,sourcePlanId:plan.id});
          }else if(item.type==='capacity_change'){
            const centerKind=String(item.payload.centerKind??'assembly') as any,extra=Number(item.payload.extraHoursPerDay??0);
            if(extra<=0)throw new Error('capacity_change_payload_invalid');
            const latest=await ownerOperationsStore.get();
            const existing=latest.productionWorkCenters.find(x=>x.kind===centerKind);
            const fallback=defaultProductionWorkCenters().find(x=>x.kind===centerKind);
            if(!fallback&&!existing)throw new Error('capacity_center_unknown');
            const base=existing??fallback!;
            await ownerOperationsStore.upsertWorkCenter({
              id:base.id,name:base.name,kind:base.kind,dailyCapacityHours:base.dailyCapacityHours+extra,
              active:base.active,workdays:base.workdays
            });
          }else if(item.type==='margin_review'){
            // Internal acknowledgement only; no money or project mutation is performed here.
          }
          item.status='applied';item.appliedAt=new Date().toISOString();
          results.push({itemId:item.id,status:'applied'});
        }catch(e){
          item.status='failed';item.error=e instanceof Error?e.message:String(e);
          results.push({itemId:item.id,status:'failed',error:item.error});
        }
      }
      refreshDecisionPlanStatus(plan);await ownerOperationsStore.updateDecisionPlan(plan);
      return json(res,200,{version:'4.6.0',plan,summary:decisionPlanSummary(plan),results});
    }

    if(req.method==='GET'&&path==='/api/v1/owner-scenario-planner'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,currency);
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      return json(res,200,buildOwnerScenarioPlanner(rows,ops,currency,new Date()));
    }
    if(req.method==='POST'&&path==='/api/v1/owner-scenario-planner/evaluate'){
      const b=await readJson(req);
      const organizationId=String(b.organizationId??DEMO_ORG_ID),currency=String(b.currency??'EUR');
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,currency);
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const scenario={
        id:String(b.id??`custom-${Date.now()}`),name:String(b.name??'Custom Scenario'),
        description:b.description?String(b.description):undefined,
        queueOrder:Array.isArray(b.queueOrder)?b.queueOrder.map(String):undefined,
        extraCapacityHoursPerDay:b.extraCapacityHoursPerDay&&typeof b.extraCapacityHoursPerDay==='object'?b.extraCapacityHoursPerDay:undefined,
        acceleratedReceivables:Array.isArray(b.acceleratedReceivables)?b.acceleratedReceivables:undefined,
        cashInjectionMinor:b.cashInjectionMinor!=null?Number(b.cashInjectionMinor):undefined,
        cashInjectionDate:b.cashInjectionDate?String(b.cashInjectionDate):undefined,
        projectExtraCostMinor:b.projectExtraCostMinor&&typeof b.projectExtraCostMinor==='object'?b.projectExtraCostMinor:undefined
      };
      const baseline=buildOwnerScenarioPlanner(rows,ops,currency,new Date()).baseline;
      return json(res,200,evaluateOwnerScenario(rows,ops,scenario,currency,new Date(),baseline));
    }

    if(req.method==='GET'&&path==='/api/v1/predictive-owner-control'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,currency);
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      return json(res,200,buildPredictiveOwnerControl(rows,ops,currency,new Date()));
    }

    if(req.method==='GET'&&path==='/api/v1/capacity-learning'){
      return json(res,200,buildCapacityLearning(await ownerOperationsStore.get()));
    }
    if(req.method==='POST'&&path==='/api/v1/production-time-entries'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.addProductionTimeEntry({
        projectId:String(b.projectId??''),centerKind:String(b.centerKind??'assembly') as any,
        plannedHours:Number(b.plannedHours??0),actualHours:Number(b.actualHours??0),
        completedAt:String(b.completedAt??new Date().toISOString()),recordedBy:String(b.recordedBy??'owner'),
        note:b.note?String(b.note):undefined
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='POST'&&path==='/api/v1/treasury-balance'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.setTreasuryBalance({
        currency:String(b.currency??'EUR'),openingBalanceMinor:Number(b.openingBalanceMinor??0),
        asOf:String(b.asOf??new Date().toISOString())
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='GET'&&path==='/api/v1/cash-gap-forecast'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      return json(res,200,buildCashGapForecast(projects,await ownerOperationsStore.get(),currency));
    }
    if(req.method==='GET'&&path==='/api/v1/replenishment-plan'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      return json(res,200,buildReplenishmentPlan(rows,ops));
    }

    if(req.method==='GET'&&path==='/api/v1/production-capacity'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const ops=await ownerOperationsStore.get();
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],ops,'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const startAtText=url.searchParams.get('startAt');
      const startAt=startAtText&&Number.isFinite(Date.parse(startAtText))?new Date(startAtText):new Date();
      return json(res,200,buildProductionCapacityPlan(rows,ops,startAt));
    }
    if(req.method==='POST'&&path==='/api/v1/production-work-centers'){
      const b=await readJson(req);
      const kind=String(b.kind??'assembly') as any;
      const id=String(b.id??`wc-${kind}`);
      try{return json(res,201,await ownerOperationsStore.upsertWorkCenter({
        id,name:String(b.name??kind),kind,dailyCapacityHours:Number(b.dailyCapacityHours??8),
        active:b.active!==false,workdays:Array.isArray(b.workdays)?b.workdays.map(Number):[1,2,3,4,5]
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='POST'&&path==='/api/v1/production-capacity/overrides'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.setCapacityOverride({
        projectId:String(b.projectId??''),centerKind:String(b.centerKind??'assembly') as any,
        hours:Number(b.hours??0),note:b.note?String(b.note):undefined
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }

    if(req.method==='GET'&&path==='/api/v1/bom-allocation-plan'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],await ownerOperationsStore.get(),'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      return json(res,200,buildBomAllocationPlan(rows,await ownerOperationsStore.get()));
    }
    if(req.method==='POST'&&path==='/api/v1/bom-allocation-plan/apply'){
      const organizationId=DEMO_ORG_ID;
      const records=await repository.listProjects(organizationId,bearer(req));
      const active=records.filter(x=>x.snapshot&&x.snapshot.jobControl?.stage!=='closed');
      const owner=buildOwnerCommandCenter(active.map(x=>x.snapshot!) as any[],await ownerOperationsStore.get(),'EUR');
      const queuePos=new Map(owner.queue.map(x=>[x.projectId,x.queuePosition]));
      const state=await ownerOperationsStore.get();
      const rows=active.map(x=>({project:x.snapshot!,engineering:engineering.compile(x.snapshot!),queuePosition:queuePos.get(x.id)??999}));
      const plan=buildBomAllocationPlan(rows,state);
      const itemBySku=new Map(state.warehouseItems.map(i=>[i.sku.trim().toLowerCase(),i]));
      const created:any[]=[];
      for(const d of plan.demands){
        if(d.allocatedFromFreeStock<=1e-9)continue;
        const item=itemBySku.get(d.sku.trim().toLowerCase());if(!item)continue;
        created.push(await ownerOperationsStore.reserve({itemId:item.id,projectId:d.projectId,quantity:d.allocatedFromFreeStock,priority:d.queuePosition,note:`AUTO BOM allocation ${d.description}`}));
      }
      const after=await ownerOperationsStore.get();
      const afterPlan=buildBomAllocationPlan(rows,after);
      return json(res,201,{version:'5.0.0',createdReservations:created,plan:afterPlan});
    }
    if(req.method==='POST'&&path==='/api/v1/supplier-quotes'){
      const b=await readJson(req);
      try{return json(res,201,await ownerOperationsStore.addSupplierQuote({
        supplierId:String(b.supplierId??''),rfqId:b.rfqId?String(b.rfqId):undefined,reference:b.reference?String(b.reference):undefined,currency:String(b.currency??'EUR'),
        lines:Array.isArray(b.lines)?b.lines.map((x:any)=>({sku:String(x.sku??''),quantity:Number(x.quantity??0),unit:String(x.unit??'pcs') as any,unitPriceMinor:Number(x.unitPriceMinor??0)})):[],
        leadTimeDays:Number(b.leadTimeDays??7),validUntil:b.validUntil?String(b.validUntil):undefined,
        deliveryCostMinor:b.deliveryCostMinor!=null?Number(b.deliveryCostMinor):undefined
      }))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
    }
    if(req.method==='GET'&&path==='/api/v1/supplier-quotes/compare'){
      const sku=url.searchParams.get('sku')??'',quantity=Number(url.searchParams.get('quantity')??0),unit=(url.searchParams.get('unit')??'pcs') as any;
      const strategy=(url.searchParams.get('strategy')??'optimal') as 'optimal'|'fastest'|'cheapest';
      return json(res,200,{version:'5.0.0',strategy,ranking:compareSupplierQuotesForShortage(await ownerOperationsStore.get(),{sku,shortage:quantity,unit},strategy)});
    }
    if(req.method==='GET'&&path==='/api/v1/payment-calendar'){
      const organizationId=url.searchParams.get('organizationId')??DEMO_ORG_ID;
      const currency=url.searchParams.get('currency')??'EUR';
      const projects=(await repository.listProjects(organizationId,bearer(req))).map(x=>x.snapshot).filter(Boolean) as any[];
      return json(res,200,{version:'5.0.0',currency,rows:buildPaymentCalendar(projects,await ownerOperationsStore.get(),currency)});
    }

    const supplierQuoteAward=routeMatch(path,/^\/api\/v1\/supplier-quotes\/([^/]+)\/award$/);
    if(req.method==='POST'&&supplierQuoteAward){
      const b=await readJson(req);
      const projectId=String(b.projectId??''),sku=String(b.sku??''),quantity=Number(b.quantity??0);
      const current=await repository.getProject(projectId,bearer(req));
      if(!current?.snapshot)return json(res,404,{error:'project_not_found'});
      if(b.expectedRevision!==current.snapshot.revision)return json(res,409,{error:'revision_conflict',currentRevision:current.snapshot.revision});
      const ops=await ownerOperationsStore.get();
      const quote=ops.supplierQuotes.find(x=>x.id===supplierQuoteAward[1]!);
      if(!quote)return json(res,404,{error:'supplier_quote_not_found'});
      const supplier=ops.suppliers.find(x=>x.id===quote.supplierId&&x.active);
      if(!supplier)return json(res,409,{error:'supplier_unavailable'});
      if(quote.validUntil&&Date.parse(quote.validUntil)<Date.now())return json(res,409,{error:'supplier_quote_expired'});
      const line=quote.lines.find(x=>x.sku.trim().toLowerCase()===sku.trim().toLowerCase());
      if(!line)return json(res,422,{error:'supplier_quote_sku_not_found'});
      if(!Number.isFinite(quantity)||quantity<=0||quantity>line.quantity)return json(res,422,{error:'supplier_quote_quantity_invalid'});
      const duplicate=ops.procurementAwards?.find(x=>x.quoteId===quote.id&&x.projectId===projectId&&x.sku.trim().toLowerCase()===sku.trim().toLowerCase()&&['pending_project_order','ordered'].includes(x.status));
      if(duplicate)return json(res,409,{error:'supplier_quote_already_awarded',awardId:duplicate.id});

      const now=new Date(),addDays=(days:number)=>{const d=new Date(now);d.setUTCDate(d.getUTCDate()+Math.max(0,Math.ceil(days)));return d.toISOString()};
      const expectedAt=addDays(quote.leadTimeDays||supplier.leadTimeDays);
      const paymentDueAt=addDays(supplier.paymentTermsDays);
      const productTotal=Math.round(line.unitPriceMinor*quantity),delivery=Math.max(0,quote.deliveryCostMinor??0);
      const totalCostMinor=productTotal+delivery;
      const awardedBy=String(b.awardedBy??'owner');
      const award=await ownerOperationsStore.createProcurementAward({
        quoteId:quote.id,supplierId:supplier.id,projectId,sku,quantity,unit:line.unit,currency:quote.currency,
        totalCostMinor,paymentDueAt,expectedAt,awardedBy
      });
      try{
        const normalizedUnit=line.unit==='m'?'service':line.unit;
        const kind=(line.unit==='pcs'||line.unit==='set')?'hardware':line.unit==='service'?'service':'material';
        const poLines:any[]=[{
          kind,sourceKey:`supplier_quote:${quote.id}`,description:`${sku} · awarded quote ${quote.reference??quote.id}`,
          manufacturer:supplier.name,code:sku,quantity,unit:normalizedUnit,unitPriceMinor:line.unitPriceMinor
        }];
        if(delivery>0)poLines.push({
          kind:'service',sourceKey:`supplier_quote_delivery:${quote.id}`,description:`Delivery · ${supplier.name}`,
          quantity:1,unit:'service',unitPriceMinor:delivery
        });
        const createdPo=createPurchaseOrder(current.snapshot,{
          supplierName:supplier.name,createdBy:awardedBy,currency:quote.currency,lines:poLines,
          note:`Owner Procurement Award ${award.id} · quote ${quote.reference??quote.id}`,expectedAt
        });
        const approved=updatePurchaseOrderStatus(createdPo.snapshot,createdPo.order.id,{status:'approved',actor:awardedBy,expectedAt});
        const ordered=updatePurchaseOrderStatus(approved.snapshot,createdPo.order.id,{status:'ordered',actor:awardedBy,expectedAt});
        ordered.snapshot.revision=current.snapshot.revision+1;
        const created=await repository.createRevision({
          organizationId:current.organizationId,projectId:current.id,parentRevisionId:current.currentRevisionId,
          snapshot:ordered.snapshot,changeSet:null,source:'manual'
        },bearer(req));
        const cash=await ownerOperationsStore.addCashEvent({
          type:'outflow',category:'supplier',amountMinor:totalCostMinor,currency:quote.currency,dueAt:paymentDueAt,status:'committed',
          projectId,counterparty:supplier.name,note:`Procurement award ${award.id} · PO ${createdPo.order.id}`,
          source:'procurement_award',sourceId:createdPo.order.id
        });
        const finalAward=await ownerOperationsStore.updateProcurementAward(award.id,{
          status:'ordered',purchaseOrderId:createdPo.order.id,cashEventId:cash.id
        });
        if(quote.rfqId){
          const latestOps=await ownerOperationsStore.get();
          const materialRfq=latestOps.materialRfqs.find(x=>x.id===quote.rfqId);
          if(materialRfq){
            materialRfq.status='awarded';materialRfq.selectedQuoteId=quote.id;materialRfq.awardedPurchaseOrderId=createdPo.order.id;
            await ownerOperationsStore.updateMaterialRfq(materialRfq);
          }
        }
        return json(res,201,{
          version:'4.2.0',award:finalAward,project:created,order:ordered.order,cashCommitment:cash,
          purchasing:buildPurchasingReport(ordered.snapshot,engineering.compile(ordered.snapshot))
        });
      }catch(e){
        const message=e instanceof Error?e.message:String(e);
        await ownerOperationsStore.updateProcurementAward(award.id,{status:'failed',error:message});
        return json(res,500,{error:'procurement_award_failed',awardId:award.id,detail:message});
      }
    }

    if(req.method==='POST'&&path==='/api/v1/cash-flow/events'){
      const b=await readJson(req);
      return json(res,201,await ownerOperationsStore.addCashEvent({
        type:b.type==='inflow'?'inflow':'outflow',category:String(b.category??'other') as any,amountMinor:Number(b.amountMinor??0),
        currency:String(b.currency??'EUR'),dueAt:String(b.dueAt??new Date().toISOString()),status:String(b.status??'planned') as any,
        projectId:b.projectId?String(b.projectId):undefined,counterparty:b.counterparty?String(b.counterparty):undefined,note:b.note?String(b.note):undefined
      }));
    }
    if(req.method==='POST'&&path==='/api/v1/cash-flow/fixed-costs'){
      const b=await readJson(req);
      return json(res,201,await ownerOperationsStore.addFixedCost({category:String(b.category??'overhead'),amountMinor:Number(b.amountMinor??0),currency:String(b.currency??'EUR')}));
    }

    if (req.method === 'POST' && path === '/api/v1/projects') {
      const body = await readJson(req);
      const organizationId = body.organizationId ?? DEMO_ORG_ID;
      const projectType = body.projectType as ProjectType | undefined;
      const project = await repository.createProject({
        organizationId,
        name: body.name ?? 'Новый проект',
        ...(projectType ? { projectType } : {}),
        currency: body.currency ?? 'EUR',
        locale: body.locale ?? 'ru-CZ',
      }, bearer(req));
      return json(res, 201, project);
    }

    if (req.method === 'GET' && path === '/api/v1/projects') {
      const organizationId = url.searchParams.get('organizationId') ?? DEMO_ORG_ID;
      return json(res, 200, await repository.listProjects(organizationId, bearer(req)));
    }

    const projectGet = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)$/);
    if (req.method === 'GET' && projectGet) {
      const project = await repository.getProject(projectGet[1]!, bearer(req));
      return project ? json(res, 200, project) : json(res, 404, { error: 'project_not_found' });
    }

    const visualSceneGet = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/visual-scene$/);
    if (req.method === 'GET' && visualSceneGet) {
      const project = await repository.getProject(visualSceneGet[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      return json(res, 200, buildVisualScene(project.snapshot));
    }

    const visualCommandPost = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/visual-command$/);
    if (req.method === 'POST' && visualCommandPost) {
      const body = await readJson(req);
      const current = await repository.getProject(visualCommandPost[1]!, bearer(req));
      if (!current?.snapshot) return json(res, 404, { error: 'project_not_found' });
      if (body.expectedRevision !== current.snapshot.revision) {
        return json(res, 409, { error: 'revision_conflict', currentRevision: current.snapshot.revision });
      }
      const command = body.command as VisualEditorCommand;
      const changeSet = compileVisualCommand(current.snapshot, command);
      const next = applyProjectChangeSet(current.snapshot, changeSet);
      const created = await repository.createRevision({
        organizationId: current.organizationId,
        projectId: current.id,
        parentRevisionId: current.currentRevisionId,
        snapshot: next,
        changeSet,
        source: 'manual',
      }, bearer(req));
      const eng = next.furniture.length ? engineering.compile(next) : null;
      return json(res, 201, { project: created, visualScene: buildVisualScene(next), engineering: eng });
    }

    const visualRestorePost = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/visual-restore$/);
    if (req.method === 'POST' && visualRestorePost) {
      const body = await readJson(req);
      const current = await repository.getProject(visualRestorePost[1]!, bearer(req));
      if (!current?.snapshot) return json(res, 404, { error: 'project_not_found' });
      if (body.expectedRevision !== current.snapshot.revision) {
        return json(res, 409, { error: 'revision_conflict', currentRevision: current.snapshot.revision });
      }
      const targetRevision = Number(body.targetRevision);
      if (!Number.isInteger(targetRevision) || targetRevision < 1 || targetRevision === current.snapshot.revision) {
        return json(res, 422, { error: 'visual_invalid_restore_revision' });
      }
      const target = await repository.getRevision(current.id, targetRevision, bearer(req));
      if (!target) return json(res, 404, { error: 'revision_not_found' });
      const next = structuredClone(target.snapshot);
      next.revision = current.snapshot.revision + 1;
      const validation = validateProjectModel(next);
      if (!validation.ok) return json(res, 422, { error: 'invalid_project_model', details: validation.errors });
      const created = await repository.createRevision({
        organizationId: current.organizationId,
        projectId: current.id,
        parentRevisionId: current.currentRevisionId,
        snapshot: next,
        changeSet: null,
        source: 'manual',
      }, bearer(req));
      const eng = next.furniture.length ? engineering.compile(next) : null;
      return json(res, 201, { project: created, visualScene: buildVisualScene(next), engineering: eng, restoredFromRevision: targetRevision });
    }

    const engineeringGet = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/engineering$/);
    if (req.method === 'GET' && engineeringGet) {
      const project = await repository.getProject(engineeringGet[1]!, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const result = engineering.compile(project.snapshot);
      return json(res, 200, result);
    }

    const revisionPost = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/revisions$/);
    if (req.method === 'POST' && revisionPost) {
      const body = await readJson(req);
      const current = await repository.getProject(revisionPost[1]!, bearer(req));
      if (!current?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const snapshot = body.snapshot;
      const validation = validateProjectModel(snapshot);
      if (!validation.ok) return json(res, 422, { error: 'invalid_project_model', details: validation.errors });
      if (body.expectedRevision !== current.snapshot.revision) {
        return json(res, 409, { error: 'revision_conflict', currentRevision: current.snapshot.revision });
      }
      const created = await repository.createRevision({
        organizationId: current.organizationId,
        projectId: current.id,
        parentRevisionId: current.currentRevisionId,
        snapshot,
        changeSet: body.changeSet ?? null,
        source: body.source ?? 'manual',
      }, bearer(req));
      return json(res, 201, created);
    }

    if (req.method === 'POST' && path === '/api/v1/ai/intake') {
      const body = await readJson(req);
      const project = await repository.getProject(body.projectId, bearer(req));
      if (!project?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const result = await intake.analyze({
        text: String(body.text ?? ''),
        project: project.snapshot,
        imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : undefined,
        locale: body.locale,
      });
      return json(res, 200, result);
    }

    const applyChange = routeMatch(path, /^\/api\/v1\/projects\/([^/]+)\/apply-change$/);
    if (req.method === 'POST' && applyChange) {
      const body = await readJson(req);
      const current = await repository.getProject(applyChange[1]!, bearer(req));
      if (!current?.snapshot) return json(res, 404, { error: 'project_not_found' });
      const changeSet = body.changeSet as ProjectChangeSet;
      if (body.expectedRevision !== current.snapshot.revision) {
        return json(res, 409, { error: 'revision_conflict', currentRevision: current.snapshot.revision });
      }
      const next = applyProjectChangeSet(current.snapshot, changeSet);
      const created = await repository.createRevision({
        organizationId: current.organizationId,
        projectId: current.id,
        parentRevisionId: current.currentRevisionId,
        snapshot: next,
        changeSet,
        source: 'ai',
      }, bearer(req));
      return json(res, 201, created);
    }

    if (!path.startsWith('/api/')) {
      if (await serveStatic(path, res)) return;
    }
    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('revision_conflict') ? 409
      : message.includes('invalid_supplier_status_transition') ? 409
      : message.includes('invalid_receipt') ? 422
      : message.includes('missing_bearer_token') ? 401
      : message.includes('gmail_connection_not_found') ? 404
      : message.includes('gmail_connection_not_connected') ? 409
      : message.includes('google_refresh_token_missing_reconsent_required') ? 409
      : message.includes('gmail_pubsub_topic_not_configured') ? 409
      : message.includes('oauth_state_') || message.includes('google_oauth_callback_') ? 400
      : message.startsWith('visual_') ? 422
      : message.includes('change_order_token_invalid') || message.includes('change_order_token_not_issued') || message.includes('change_order_expired') ? 403
      : message.includes('commercial_estimate_not_ready') || message.includes('requote_') || message.includes('commercial_contract_') || message.includes('change_order_') || message.includes('revision_not_currently_contracted') ? 409
      : message.includes('payment_template_') || message.includes('payment_terms_') || message.includes('client_name_required') || message.includes('paid_amount_') || message.includes('contract_amount_below_paid_total') ? 422
      : message.includes('commercial_pricing_profile_required') || message.includes('demo_commercial_pricing_eur_only') ? 422
      : message.includes('google_oauth_not_configured') || message.includes('gmail_connection_encryption_not_configured') || message.includes('oauth_state_secret_not_configured') ? 503
      : 500;
    return json(res, status, { error: message });
  }
});

restorePromotedCatalogRegistry().catch(error=>console.error('Catalog registry restore failed:',error));
server.listen(PORT, process.env.MAKSTER_BIND_HOST||'127.0.0.1', () => {
  console.log(`Makster Core API + demo UI: http://localhost:${PORT}`);
  console.log(`Repository: ${process.env.SUPABASE_URL ? 'Supabase' : 'memory'}`);
  console.log(`AI Intake: ${process.env.OPENAI_API_KEY ? 'OpenAI Responses API' : 'deterministic fallback'}`);
});
