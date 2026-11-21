import {createHandler} from './handler.mjs';
Deno.serve(createHandler({bridgeHash:'520b6d87638ed7c7df705fa170fa26a8fb1fa7950e5078f260d8ef8b11ff067c',url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}));
