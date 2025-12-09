import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_UPLOAD_WEBHOOK = 'https://n8n.flowfyr.com/webhook/ffbbfdb5-c92b-4ee1-8ada-6065344c4925';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('data') as File | null;
    const filePath = formData.get('file_path') as string | null;
    const fileName = formData.get('file_name') as string | null;

    // Validate required fields
    if (!file || !filePath || !fileName) {
      return new Response(JSON.stringify({ error: 'Missing required fields: data, file_path, file_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 50MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file path starts with user's ID (security check)
    if (!filePath.startsWith(user.id)) {
      console.error(`File path mismatch: expected ${user.id}, got ${filePath}`);
      return new Response(JSON.stringify({ error: 'Invalid file path' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing upload for user ${user.id}, file: ${fileName}, size: ${file.size}`);

    // Forward to n8n with verified user_id
    const n8nFormData = new FormData();
    n8nFormData.append('data', file);
    n8nFormData.append('user_id', user.id); // Use authenticated user ID
    n8nFormData.append('file_path', filePath);
    n8nFormData.append('file_name', fileName);

    await fetch(N8N_UPLOAD_WEBHOOK, {
      method: 'POST',
      body: n8nFormData,
    });

    console.log('Upload forwarded to n8n successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in n8n-upload function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
