import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type Action = 'list_modules' | 'list_codes' | 'generate_code' | 'disable_code' | 'update_module' | 'publish_access_type';

type AccessType = 'public' | 'private';

interface StorageListItem {
  name: string;
  id: string | null;
}

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

function accessType(value: unknown): AccessType {
  if (value === 'public' || value === 'private') return value;
  throw new Error('Access type must be public or private.');
}

async function listModuleFiles(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];

  const walk = async (folder: string): Promise<void> => {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) throw error;
    for (const item of (data ?? []) as StorageListItem[]) {
      const path = `${folder}/${item.name}`;
      if (item.id === null) {
        await walk(path);
      } else {
        files.push(path);
        if (files.length > 5000) throw new Error('A module cannot contain more than 5,000 files.');
      }
    }
  };

  await walk(prefix);
  if (!files.includes(`${prefix}/manifest.json`) || !files.includes(`${prefix}/words.json`)) {
    throw new Error('The module must contain manifest.json and words.json before it can be published.');
  }
  return files;
}

async function copyModuleFiles(
  client: ReturnType<typeof createClient>,
  sourceBucket: string,
  destinationBucket: string,
  files: string[],
): Promise<void> {
  for (const path of files) {
    const { data, error } = await client.storage.from(sourceBucket).download(path);
    if (error || !data) throw error ?? new Error(`Could not read ${path}.`);
    const { error: uploadError } = await client.storage
      .from(destinationBucket)
      .upload(path, data, { upsert: true, contentType: data.type || undefined });
    if (uploadError) throw uploadError;
  }
}

async function removeModuleFiles(
  client: ReturnType<typeof createClient>,
  bucket: string,
  files: string[],
): Promise<void> {
  for (let index = 0; index < files.length; index += 100) {
    const { error } = await client.storage.from(bucket).remove(files.slice(index, index + 100));
    if (error) throw error;
  }
}

async function readPublishedVersion(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string | null> {
  const { data, error } = await client.storage.from(bucket).download(`${prefix}/manifest.json`);
  if (error || !data) throw error ?? new Error('Could not read the module manifest.');
  const manifest = JSON.parse(await data.text()) as { version?: unknown };
  return typeof manifest.version === 'string' ? manifest.version : null;
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
          .select('id, name, access_type, content_bucket, content_prefix, published_version, published_at, created_at')
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

      case 'publish_access_type': {
        if (typeof payload.moduleId !== 'string' || payload.moduleId.length === 0) {
          return response({ error: 'Choose a language module.' }, 400);
        }
        const nextAccessType = accessType(payload.accessType);
        const { data: currentModule, error: currentModuleError } = await adminClient
          .from('language_modules')
          .select('id, name, access_type, content_bucket, content_prefix')
          .eq('id', payload.moduleId)
          .maybeSingle();
        if (currentModuleError) throw currentModuleError;
        if (!currentModule) return response({ error: 'That language module does not exist.' }, 400);
        if (!currentModule.content_bucket || !currentModule.content_prefix) {
          return response({ error: 'This module has no published Storage location.' }, 400);
        }
        if (currentModule.access_type === nextAccessType) {
          return response({ published: false, accessType: nextAccessType, message: 'This module already has that access type.' });
        }

        const previousAccessType = accessType(currentModule.access_type);
        const sourceBucket = currentModule.content_bucket;
        const destinationBucket = nextAccessType === 'public'
          ? 'public-language-modules'
          : 'private-language-modules';
        const prefix = currentModule.content_prefix;
        const files = await listModuleFiles(adminClient, sourceBucket, prefix);
        const publishedVersion = await readPublishedVersion(adminClient, sourceBucket, prefix);

        // Copy first. A failed copy never changes the live module setting.
        await copyModuleFiles(adminClient, sourceBucket, destinationBucket, files);

        if (nextAccessType === 'private') {
          // Do not mark a module private while an old public copy remains.
          // If removal fails, the database stays public and the caller is told
          // that the publish action was not completed.
          try {
            await removeModuleFiles(adminClient, sourceBucket, files);
          } catch (error) {
            await removeModuleFiles(adminClient, destinationBucket, files).catch(() => undefined);
            throw error;
          }
        }

        const { error: updateError } = await adminClient
          .from('language_modules')
          .update({
            access_type: nextAccessType,
            content_bucket: destinationBucket,
            content_prefix: prefix,
            published_version: publishedVersion,
            published_at: new Date().toISOString(),
          })
          .eq('id', currentModule.id);

        if (updateError) {
          // Restore the public source when a public-to-private transition could
          // not be recorded, so the configured public module still works.
          if (nextAccessType === 'private') {
            await copyModuleFiles(adminClient, destinationBucket, sourceBucket, files).catch(() => undefined);
          } else {
            await removeModuleFiles(adminClient, destinationBucket, files).catch(() => undefined);
          }
          throw updateError;
        }

        if (nextAccessType === 'public') {
          // Old codes/grants no longer provide a separate private-access path.
          // They remain auditable but cannot be reused if this module becomes
          // private again later.
          const now = new Date().toISOString();
          const { error: codeError } = await adminClient
            .from('access_codes')
            .update({ is_active: false })
            .eq('language_module_id', currentModule.id)
            .eq('is_active', true);
          if (codeError) throw codeError;
          const { error: grantError } = await adminClient
            .from('module_access_grants')
            .update({ revoked_at: now })
            .eq('language_module_id', currentModule.id)
            .is('revoked_at', null);
          if (grantError) throw grantError;
          // A leftover private copy is not publicly accessible. Remove it only
          // after the new public configuration is live.
          await removeModuleFiles(adminClient, sourceBucket, files).catch(error =>
            console.error('Published public module but could not remove old private copy.', error)
          );
        }

        const { error: logError } = await adminClient.from('module_access_change_log').insert({
          language_module_id: currentModule.id,
          changed_by: userResult.user.id,
          previous_access_type: previousAccessType,
          new_access_type: nextAccessType,
          source_bucket: sourceBucket,
          destination_bucket: destinationBucket,
          file_count: files.length,
          published_version: publishedVersion,
        });
        if (logError) throw logError;

        return response({
          published: true,
          accessType: nextAccessType,
          fileCount: files.length,
          publishedVersion,
        });
      }

      default:
        return response({ error: 'Unknown administrator action.' }, 400);
    }
  } catch (error) {
    console.error('Administrator request failed.', error);
    return response({ error: error instanceof Error ? error.message : 'Administrator request failed.' }, 500);
  }
});
