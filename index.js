export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS заголовки для Mini App
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Обработка вебхука от юзербота с Render для автоплатежей Uzcard / Humo
    if (url.pathname === "/api/webhook/payment" && request.method === "POST") {
      try {
        const data = await request.json();
        // data должна содержать данные о платеже (сумма, карта, пользователь)
        
        // Сохраняем в KV (PAYMENTS_KV)
        if (env.PAYMENTS_KV) {
          await env.PAYMENTS_KV.put(`payment:${data.id || Date.now()}`, JSON.stringify(data));
        }

        return new Response(JSON.stringify({ success: true, message: "Payment processed" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }

    // Главная страница воркера (если кто-то открыл бэкенд напрямую)
    return new Response(JSON.stringify({ status: "XON STORE Backend Active", timestamp: Date.now() }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
