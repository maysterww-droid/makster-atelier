MAKSTER AI 2.6 - STAGING ACCEPTANCE

1. Extract these files into the root of Makster_AI_2.6_Persistent_Unified_Core_2.6,
   next to package.json and the dist folder.
2. In Supabase Dashboard open Makster-Staging -> Project Settings / API Keys.
3. Copy the Secret API key (sb_secret_...). DO NOT send it in chat and do not save it in source control.
4. Right-click VERIFY_MAKSTER_STAGING_2_6.ps1 -> Run with PowerShell.
5. Paste the secret only into the secure PowerShell prompt.
6. Expected final line: STAGING ACCEPTANCE: PASS

The script:
- reads the persisted Contract / Change Order / Authorization through the real SupabaseUnifiedBusinessStore;
- starts Core API 2.6 twice and verifies businessPersistence=supabase;
- reads the same persisted state again in a new Node process;
- removes the secret from the script environment when finished.

Staging project ref: gkqntgfrbngspvrsqvmx
Staging API URL: https://gkqntgfrbngspvrsqvmx.supabase.co
Acceptance data is synthetic only; no real client data is used.
