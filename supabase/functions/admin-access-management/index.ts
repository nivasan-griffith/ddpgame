import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type Action = 'list_modules' | 'list_codes' | 'generate_code' | 'disable_code' | 'update_module';

interface AdminRequest {
  action?: Action;
  moduleId?: unknown;
  codeId?: unknown;
  label?: unknown;
  expiresInDays?: unknown;
  maxRedemptions?: unknown;
  name?: unknown;
  accessType?: unknown;
}

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function generateAccessCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const characters = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  return `IND-${characters.slice(0, 4)}-${characters.slice(4, 8)}-${characters.slice(8, 12)}`;
}

function positiveInteger(value: unknown, field: string, maximum: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${field} must be a whole number between 1 and ${maximum}.`);
  }
  return value;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response({ error: 'Server configuration error.' }, 500);
  }
  if (!authorization?.startsWith('Bearer ')) return response({ error: 'Administrator login is required.' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userResult, error: userError } = await authClient.auth.getUser();
  if (userError || !userResult.user) return response({ error: 'Administrator login is required.' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: administrator, error: administratorError } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userResult.user.id)
    .maybeSingle();
  if (administratorError) {
    console.error('Could not check administrator role.', administratorError);
    return response({ error: 'Could not verify administrator permissions.' }, 500);
  }
  if (!administrator) return response({ error: 'This account is not an administrator.' }, 403);

  let payload: AdminRequest;
  try {
    payload = await request.json();
  } catch {
    return response({ error: 'A JSON request body is required.' }, 400);
  }

  try {
    switch (payload.action) {
      case 'list_modules': {
        const { data, error } = await adminClient
          .from('language_modules')
          .select('id, name, access_type, created_at')
          .order('name');
        if (error) throw error;
        return response({ modules: data });
      }

      case 'list_codes': {
        const query = adminClient
          .from('access_codes')
          .select('id, language_module_id, label, is_active, expires_at, max_redemptions, redemption_count, created_at')
          .order('created_at', { ascending: false });
        const { data, error } = typeof payload.moduleId === 'string'
          ? await query.eq('language_module_id', payload.moduleId)
          : await query;
        if (error) throw error;
        return response({ codes: data });
      }

      case 'generate_code': {
        if (typeof payload.moduleId !== 'string' || payload.moduleId.length === 0) {
          return response({ error: 'Choose a language module.' }, 400);
        }
        const { data: module, error: moduleError } = await adminClient
          .from('language_modules')
          .select('access_type')
          .eq('id', payload.moduleId)
          .maybeSingle();
        if (moduleError) throw moduleError;
        if (!module) return response({ error: 'That language module does not exist.' }, 400);
        if (module.access_type !== 'private') {
          return response({ error: 'Access codes can only be generated for private language modules.' }, 400);
        }
        const expiresInDays = positiveInteger(payload.expiresInDays, 'Expiry', 3650) ?? 30;
        const maxRedemptions = positiveInteger(payload.maxRedemptions, 'Usage limit', 100000) ?? 1;
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const code = generateAccessCode();
          const { error } = await adminClient.from('access_codes').insert({
            language_module_id: payload.moduleId,
            code_hash: await sha256(code),
            label: typeof payload.label === 'string' ? payload.label.trim().slice(0, 120) || null : null,
            is_active: true,
            expires_at: expiresAt,
            max_redemptions: maxRedemptions,
          });
          if (!error) return response({ code, expiresAt, maxRedemptions });
          if (error.code !== '23505') throw error;
        }
        return response({ error: 'Could not generate a unique access code. Try again.' }, 500);
      }

      case 'disable_code': {
        if (typeof payload.codeId !== 'string') return response({ error: 'A code is required.' }, 400);
        const { error } = await adminClient
          .from('access_codes')
          .update({ is_active: false })
          .eq('id', payload.codeId);
        if (error) throw error;
        // Future private-file requests from grants created by this code are also denied.
        const { error: grantError } = await adminClient
          .from('module_access_grants')
          .update({ revoked_at: new Date().toISOString() })
          .eq('access_code_id', payload.codeId)
          .is('revoked_at', null);
        if (grantError) throw grantError;
        return response({ disabled: true });
      }

      case 'update_module': {
        if (typeof payload.moduleId !== 'string' || typeof payload.name !== 'string') {
          return response({ error: 'A module and display name are required.' }, 400);
        }
        const { data: currentModule, error: currentModuleError } = await adminClient
          .from('language_modules')
          .select('access_type')
          .eq('id', payload.moduleId)
          .maybeSingle();
        if (currentModuleError) throw currentModuleError;
        if (!currentModule) return response({ error: 'That language module does not exist.' }, 400);
        // A public/private change also requires files to be published to the
        // corresponding location. Do not let a label-only update accidentally
        // expose or break a module before the publishing workflow exists.
        if (payload.accessType !== undefined && payload.accessType !== currentModule.access_type) {
          return response({ error: 'Access type changes require the module publishing workflow and are not available yet.' }, 400);
        }
        const { error } = await adminClient
          .from('language_modules')
          .update({ name: payload.name.trim().slice(0, 120) })
          .eq('id', payload.moduleId);
        if (error) throw error;
        return response({ updated: true });
      }

      default:
        return response({ error: 'Unknown administrator action.' }, 400);
    }
  } catch (error) {
    console.error('Administrator request failed.', error);
    return response({ error: error instanceof Error ? error.message : 'Administrator request failed.' }, 500);
  }
});
