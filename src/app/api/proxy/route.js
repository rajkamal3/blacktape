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
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!id || !type) {
    return new Response(JSON.stringify({ error: "Missing id or type" }), {
      status: 400,
      headers: corsHeaders
    });
  }

  let url;

  if (type === "chart") {
    url = `https://api.tickertape.in/stocks/charts/inter/${id}?duration=5y`;
  } else if (type === "chartDetailed") {
    url = `https://api.univest.in/resources/stock-details/${id}/prices/NSE/5Y`;
  } else if (type === "financials") {
    url = `https://api.tickertape.in/stocks/financials/income/${id}/annual/normal?count=10`;
  } else if (type === "financialsQuarterly") {
    url = `https://api.tickertape.in/stocks/financials/income/${id}/interim/normal?count=10`;
  } else if (type === "summary") {
    url = `https://analyze.api.tickertape.in/v2/stocks/summary/${id}`;
  } else if (type === "info") {
    url = `https://api.tickertape.in/stocks/info/${id}`;
  } else if (type === "usSummary") {
    url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${id}`;
  } else if (type === "usChart") {
    url = `https://webql-redesign.cnbcfm.com/graphql?operationName=getQuoteChartData&variables=%7B%22symbol%22%3A%22${id}%22%2C%22timeRange%22%3A%225Y%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%229e1670c29a10707c417a1efd327d4b2b1d456b77f1426e7e84fb7d399416bb6b%22%7D%7D`;
  } else if (type === "nasdaqChart") {
    url = `https://api.nasdaq.com/api/quote/${id}/chart?assetclass=index&fromdate=${fromDate}&todate=${toDate}`;
  } else {
    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
