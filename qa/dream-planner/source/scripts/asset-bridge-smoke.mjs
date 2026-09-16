const projectUrl = (process.env.NEXT_PUBLIC_MAKSTER_SUPABASE_URL || '').replace(/\/$/, '');
const publishableKey = process.env.NEXT_PUBLIC_MAKSTER_SUPABASE_PUBLISHABLE_KEY || '';

if (!projectUrl || !publishableKey) {
  console.error('ASSET BRIDGE FAIL: missing NEXT_PUBLIC_MAKSTER_SUPABASE_URL or NEXT_PUBLIC_MAKSTER_SUPABASE_PUBLISHABLE_KEY');
  process.exit(2);
}

const fields = [
  'module_code','template_code','display_name','version','release_status',
  'width_mm','depth_mm','body_height_mm','leg_height_mm',
  'glb_bucket','glb_path','glb_sha256','motion_json_bucket','motion_json_path','motion_json_sha256'
].join(',');

const apiHeaders = {
  apikey: publishableKey,
  Accept: 'application/json',
};

function publicAssetUrl(bucket, path) {
  const encodedPath = String(path).split('/').map(encodeURIComponent).join('/');
  return `${projectUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

function parseGlbJson(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes.length < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('invalid GLB magic');
  const totalLength = view.getUint32(8, true);
  if (totalLength !== bytes.length) throw new Error(`GLB length mismatch ${totalLength} != ${bytes.length}`);
  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a) throw new Error('first GLB chunk is not JSON');
  const jsonBytes = bytes.slice(20, 20 + jsonLength);
  return JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\u0000+$/g, '').trim());
}

function expectedActionNames(motion) {
  if (motion.kind === 'ROTATION') return [`${motion.pivot_code}_OPEN`];
  if (motion.kind === 'TRANSLATION') return [`${motion.object_code}_OPEN`];
  return [];
}

const registryUrl = `${projectUrl}/rest/v1/ready_module_library?select=${encodeURIComponent(fields)}&release_status=eq.READY&order=module_code.asc`;
const registryResponse = await fetch(registryUrl, { headers: apiHeaders, cache: 'no-store' });
if (!registryResponse.ok) throw new Error(`Registry HTTP ${registryResponse.status}: ${await registryResponse.text()}`);
const rows = await registryResponse.json();
if (!Array.isArray(rows) || rows.length === 0) throw new Error('Registry returned no READY modules');

console.log(`ASSET BRIDGE: ${rows.length} READY module(s)`);
const results = [];
for (const row of rows) {
  if (row.release_status !== 'READY') throw new Error(`${row.module_code}: non-READY row escaped registry`);
  if (!row.glb_bucket || !row.glb_path) throw new Error(`${row.module_code}: missing GLB asset`);
  if (!row.motion_json_bucket || !row.motion_json_path) throw new Error(`${row.module_code}: missing motion contract`);

  const glbUrl = publicAssetUrl(row.glb_bucket, row.glb_path);
  const motionUrl = publicAssetUrl(row.motion_json_bucket, row.motion_json_path);

  const [glbResponse, motionResponse] = await Promise.all([
    fetch(glbUrl, { cache: 'no-store' }),
    fetch(motionUrl, { cache: 'no-store' }),
  ]);
  if (!glbResponse.ok) throw new Error(`${row.module_code}: GLB HTTP ${glbResponse.status}`);
  if (!motionResponse.ok) throw new Error(`${row.module_code}: motion HTTP ${motionResponse.status}`);

  const contentType = glbResponse.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('model/gltf-binary') && !String(row.glb_path).toLowerCase().endsWith('.glb')) {
    throw new Error(`${row.module_code}: unexpected GLB content-type ${contentType}`);
  }

  const [glbBuffer, motion] = await Promise.all([glbResponse.arrayBuffer(), motionResponse.json()]);
  if (motion.module_code !== row.module_code) throw new Error(`${row.module_code}: motion contract module_code mismatch`);
  if (!Array.isArray(motion.motions) || motion.motions.length === 0) throw new Error(`${row.module_code}: motion contract has no motions`);

  const gltf = parseGlbJson(glbBuffer);
  const animationNames = new Set((gltf.animations || []).map((animation) => animation.name).filter(Boolean));
  const requiredActions = motion.motions.flatMap(expectedActionNames);
  const missingActions = requiredActions.filter((name) => !animationNames.has(name));
  if (missingActions.length) throw new Error(`${row.module_code}: GLB missing action(s): ${missingActions.join(', ')}`);

  const result = {
    moduleCode: row.module_code,
    version: Number(row.version),
    glbBytes: glbBuffer.byteLength,
    motions: motion.motions.length,
    actions: requiredActions,
  };
  results.push(result);
  console.log(`PASS ${result.moduleCode} V${result.version}: GLB ${result.glbBytes} bytes · ${result.motions} motion(s) · ${result.actions.join(', ')}`);
}

const requiredCurrent = [
  'KITCHEN_BASE_001_BASE_DOOR',
  'KITCHEN_BASE_001_TANDEMBOX',
  'KITCHEN_BASE_001_WOOD_DRAWER',
];
for (const code of requiredCurrent) {
  if (!rows.some((row) => row.module_code === code)) throw new Error(`Current QA module missing from READY registry: ${code}`);
}

console.log('ASSET BRIDGE LIVE QA PASS');
console.log(JSON.stringify(results, null, 2));
