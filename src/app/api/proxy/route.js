const allowedOrigins = [
  "https://blacktape.vercel.app",
  "https://dev-blacktape.vercel.app"
];

function getCORSHeaders(origin) {
  const isAllowed = allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export async function GET(req) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  const { searchParams } = new URL(req.url, "http://localhost");
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id || !type) {
    return new Response(JSON.stringify({ error: "Missing id or type" }), {
      status: 400,
      headers: corsHeaders
    });
  }

  let url;

  if (type === "chart") {
    url = `https://api.tickertape.in/stocks/charts/inter/${id}?duration=5y`;
  } else if (type === "financials") {
    url = `https://api.tickertape.in/stocks/financials/income/${id}/annual/normal?count=10`;
  } else {
    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const rawData = await response.text();

    try {
      const data = JSON.parse(rawData);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: corsHeaders
      });
    } catch (err) {
      console.error("❌ JSON parse failed:", err);

      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 500,
        headers: corsHeaders
      });
    }
  } catch (err) {
    console.error("❌ Proxy fetch failed:", err);

    return new Response(JSON.stringify({ error: "Proxy failure" }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}
