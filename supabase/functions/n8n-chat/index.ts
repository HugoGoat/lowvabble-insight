import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_CHAT_WEBHOOK = 'https://n8n.srv755107.hstgr.cloud/webhook/baa3f90a-7116-440a-9d5f-06e44505094e';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 50;

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

    // Parse and validate request body
    const body = await req.json();
    const { text, conversation_history } = body;

    // Validate message length
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate and limit conversation history
    let validatedHistory: { role: string; content: string }[] = [];
    if (Array.isArray(conversation_history)) {
      validatedHistory = conversation_history
        .slice(-MAX_HISTORY_MESSAGES)
        .filter((msg: any) => 
          msg && 
          typeof msg.role === 'string' && 
          typeof msg.content === 'string' &&
          msg.content.length <= MAX_MESSAGE_LENGTH
        )
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content.slice(0, MAX_MESSAGE_LENGTH),
        }));
    }

    console.log(`Processing chat request for user ${user.id}, message length: ${text.length}`);

    // Forward to n8n with verified user_id
    const response = await fetch(N8N_CHAT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        user_id: user.id, // Use authenticated user ID
        conversation_history: validatedHistory,
      }),
    });

    if (!response.ok) {
      console.error('n8n webhook error:', response.status);
      throw new Error('Failed to communicate with chatbot');
    }

    const data = await response.json();
    console.log('Chat response received successfully');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in n8n-chat function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
