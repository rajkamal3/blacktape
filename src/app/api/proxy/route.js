export async function GET(req) {
  const { searchParams } = new URL(req.url, "http://localhost");
  const id = searchParams.get("id");

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing ID" }), {
      status: 400
    });
  }

  try {
    const url = `https://api.tickertape.in/stocks/charts/inter/${id}?duration=5y`;
    console.log("🔍 Proxying to:", url);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const rawData = await response.text();
    console.log("📦 Raw Response:", rawData);

    try {
      const data = JSON.parse(rawData);
      return Response.json(data);
    } catch (err) {
      console.error("❌ Failed to parse JSON");
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 500
      });
    }
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return new Response(JSON.stringify({ error: "Proxy failure" }), {
      status: 500
    });
  }
}
