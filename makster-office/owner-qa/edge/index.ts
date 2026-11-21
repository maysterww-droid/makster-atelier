import {createHandler} from './handler.mjs';
Deno.serve(createHandler({bridgeHash:'1c97e7d2003c419a5c935e4ac2371382c88f477cf2a0e3cc27e70533f34739b8',url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
