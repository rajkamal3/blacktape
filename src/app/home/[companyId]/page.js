export default async function CompanyPage({ params }) {
  const { companyId } = await params;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/proxy?id=${companyId}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    console.error("❌ Failed to fetch:", res.status);
    throw new Error("Upstream fetch failed");
  }

  const data = await res.json();
  console.log("🔥 Fetched Company Data:", data);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{data?.SC_FULLNM || "Company Details"}</h1>
      <p>Price: ₹{data?.pricecurrent}</p>
      <p>52W Low: ₹{data?.weekLow}</p>
      <p>52W High: ₹{data?.weekHigh}</p>
    </div>
  );
}
