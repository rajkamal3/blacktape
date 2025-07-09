import axios from "axios";

export default async function CompanyPage({ params }) {
  const { companyId } = await params;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  let data = null;

  try {
    const res = await axios.get(`${base}/api/proxy?id=${companyId}`, {
      headers: {
        Accept: "application/json"
      }
    });

    data = res.data;
    console.log("🔥 Company Data:", data);
  } catch (err) {
    console.error("❌ Axios fetch error:", err.message);
    throw new Error("Failed to load company data");
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{data?.data?.[0]?.r || "No name"}</h1>
      <h1>{data?.data?.[0]?.sid || "No SID"}</h1>
      <p>Price: ₹{data?.pricecurrent}</p>
      <p>52W Low: ₹{data?.weekLow}</p>
      <p>52W High: ₹{data?.weekHigh}</p>
    </div>
  );
}
