import { createClient } from 'npm:@supabase/supabase-js@2';

const bucketName = 'private-language-modules';
const signedUrlLifetimeSeconds = 300;

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

interface DownloadRequest {
  moduleId?: unknown;
  grantToken?: unknown;
  paths?: unknown;
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

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return response({ error: 'Method not allowed.' }, 405);
  }

  let payload: DownloadRequest;
  try {
    payload = await request.json();
  } catch {
    return response({ error: 'A JSON request body is required.' }, 400);
  }

  const { moduleId, grantToken, paths } = payload;
  if (
    typeof moduleId !== 'string' ||
    typeof grantToken !== 'string' ||
    !Array.isArray(paths) ||
    paths.length === 0 ||
    paths.some(path => typeof path !== 'string')
  ) {
    return response({ error: 'moduleId, grantToken, and paths are required.' }, 400);
  }

  const modulePrefix = `${moduleId}/`;
  const requestedPaths = paths as string[];
  const hasUnsafePath = requestedPaths.some(path =>
    !path.startsWith(modulePrefix) ||
    path.includes('..') ||
    path.includes('\\') ||
    path.length > 500,
  );

  if (hasUnsafePath) {
    return response({ error: 'Requested asset path is not allowed.' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase server credentials are not configured.');
    return response({ error: 'Server configuration error.' }, 500);
  }

  // This client stays inside the Edge Function. Its service-role key is never
  // sent to or stored by the Angular application.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: grant, error: grantError } = await supabaseAdmin
    .from('module_access_grants')
    .select('language_module_id, expires_at, revoked_at')
    .eq('language_module_id', moduleId)
    .eq('grant_token_hash', await sha256(grantToken))
    .is('revoked_at', null)
    .maybeSingle();

  if (grantError) {
    console.error('Could not validate module access grant.', grantError);
    return response({ error: 'Could not validate module access.' }, 500);
  }

  if (!grant || (grant.expires_at && new Date(grant.expires_at) <= new Date())) {
    return response({ error: 'Module access is not valid.' }, 403);
  }

  const { data: signedUrls, error: signedUrlError } = await supabaseAdmin.storage
    .from(bucketName)
    .createSignedUrls(requestedPaths, signedUrlLifetimeSeconds);

  if (signedUrlError) {
    console.error('Could not create private-module signed URLs.', signedUrlError);
    return response({ error: 'Could not prepare private module files.' }, 500);
  }

  return response({
    expiresIn: signedUrlLifetimeSeconds,
    urls: signedUrls.map(item => ({ path: item.path, url: item.signedUrl })),
  });
});
