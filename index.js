export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/webhook/payment" && request.method === "POST") {
      try {
        const data = await request.json();
        const incomingAmount = parseFloat(data.amount);
        const rawText = data.raw_text || "";

        if (!incomingAmount) {
          return new Response(JSON.stringify({ success: false, error: "Invalid amount" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const kvKey = `order_${incomingAmount}`;
        const orderDataStr = await env.PAYMENTS_KV.get(kvKey);

        if (orderDataStr) {
          const order = JSON.parse(orderDataStr);
          order.status = "PAID";
          order.paid_at = new Date().toISOString();
          order.raw_text = rawText;

          await env.PAYMENTS_KV.put(kvKey, JSON.stringify(order), { expirationTtl: 600 });

          return new Response(JSON.stringify({ success: true, message: "Payment confirmed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/create-order" && request.method === "POST") {
      try {
        const body = await request.json();
        const baseAmount = parseFloat(body.amount || 50000);
        
        const randomCents = Math.floor(Math.random() * 90) + 10; 
        const uniqueAmount = baseAmount + randomCents;

        const kvKey = `order_${uniqueAmount}`;
        const orderData = {
          amount: uniqueAmount,
          status: "PENDING",
          created_at: new Date().toISOString()
        };

        await env.PAYMENTS_KV.put(kvKey, JSON.stringify(orderData), { expirationTtl: 900 });

        return new Response(JSON.stringify({ success: true, amount: uniqueAmount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/check-status" && request.method === "GET") {
      const amount = url.searchParams.get("amount");
      if (!amount) {
        return new Response(JSON.stringify({ status: "ERROR" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const kvKey = `order_${amount}`;
      const orderDataStr = await env.PAYMENTS_KV.get(kvKey);

      if (!orderDataStr) {
        return new Response(JSON.stringify({ status: "EXPIRED" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const order = JSON.parse(orderDataStr);
      return new Response(JSON.stringify({ status: order.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("ARSLAN BOOST Gateway is active!", { headers: corsHeaders });
  }
};
