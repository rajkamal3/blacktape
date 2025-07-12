"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export default function Chart({ companyId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    axios
      .get(`${base}/api/proxy?id=${companyId}`)
      .then((res) => setData(res.data?.data?.[0]))
      .catch((error) => setErr(error.message));
  }, [companyId]);

  if (err) return <div>Error: {err}</div>;
  if (!data) return <div>Loading...</div>;

  const labels = data.points.map((d) =>
    new Date(d.ts).toLocaleDateString("en-IN")
  );
  const prices = data.points.map((d) => d.lp);

  return (
    <div className="p-4 bg-white rounded-xl shadow-xl">
      <h1>{data.r}</h1>
      <h2>{data.sid}</h2>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Closing Price (₹)",
              data: prices,
              borderColor: "#36A2EB",
              backgroundColor: "rgba(54,162,235,0.2)",
              fill: true,
              tension: 0.4,
              pointRadius: 2,
              borderWidth: 2
            }
          ]
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: true, position: "top" },
            tooltip: { mode: "index", intersect: false }
          },
          scales: {
            x: {
              ticks: { maxTicksLimit: 10 },
              title: { display: true, text: "Date" }
            },
            y: {
              beginAtZero: false,
              title: { display: true, text: "Price (₹)" }
            }
          }
        }}
      />
    </div>
  );
}
