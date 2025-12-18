import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGIN = 'https://mozstore.netlify.app';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GIBRAPAY_API_KEY = Deno.env.get('GIBRAPAY_API_KEY');
const GIBRAPAY_WALLET_ID = Deno.env.get('GIBRAPAY_WALLET_ID');
const BASE_URL = "https://gibrapay.online";

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  // Reject requests from unauthorized origins (except for preflight)
  if (origin && origin !== ALLOWED_ORIGIN) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Origem não autorizada' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, amount, number_phone, transactionId } = await req.json();

    console.log(`GibraPay action: ${action}`);

    if (!GIBRAPAY_API_KEY || !GIBRAPAY_WALLET_ID) {
      console.error('GibraPay credentials not configured');
      return new Response(
        JSON.stringify({ status: 'error', message: 'Credenciais não configuradas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response;

    switch (action) {
      case 'transfer':
        if (!amount || !number_phone) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'Dados incompletos para transferência' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Processing transfer: ${amount} to ${number_phone}`);
        
        response = await fetch(`${BASE_URL}/v1/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'API-Key': GIBRAPAY_API_KEY,
          },
          body: JSON.stringify({
            wallet_id: GIBRAPAY_WALLET_ID,
            amount,
            number_phone,
          }),
        });
        break;

      case 'status':
        if (!transactionId) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'ID da transação não fornecido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Checking status for transaction: ${transactionId}`);
        
        response = await fetch(`${BASE_URL}/transaction/status/${transactionId}`, {
          method: 'GET',
          headers: {
            'API-Key': GIBRAPAY_API_KEY,
          },
        });
        break;

      case 'transactions':
        console.log('Fetching transactions');
        
        response = await fetch(`${BASE_URL}/v1/transactions/${GIBRAPAY_WALLET_ID}`, {
          method: 'GET',
          headers: {
            'API-Key': GIBRAPAY_API_KEY,
          },
        });
        break;

      default:
        return new Response(
          JSON.stringify({ status: 'error', message: 'Ação inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const data = await response.json();
    console.log(`GibraPay response:`, JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('GibraPay edge function error:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Erro de conexão com o servidor de pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
