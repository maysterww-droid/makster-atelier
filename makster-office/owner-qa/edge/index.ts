import {createHandler} from './handler.mjs';
Deno.serve(createHandler({bridgeHash:'47a7dc1209b9980598c17c4c2ef1bbcd64abf1bc227754337fba800137be3a44',url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),openaiConfigured:Boolean(Deno.env.get('MAKSTER_OFFICE_OPENAI_API_KEY'))}));
