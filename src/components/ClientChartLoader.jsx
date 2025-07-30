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
  Legend,
  Filler
} from "chart.js";
import { findSupportLevels } from "@/utils/findSupportLevels";

const horizontalLinePlugin = {
  id: "horizontalLine",
  afterDraw: (chart) => {
    if (chart.tooltip?._active && chart.tooltip._active.length) {
      const ctx = chart.ctx;
      const y = chart.tooltip._active[0].element.y;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chart.chartArea.left, y);
      ctx.lineTo(chart.chartArea.right, y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "green";
      ctx.stroke();
      ctx.restore();
    }
  }
};

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  horizontalLinePlugin
);

export default function Chart({ companyId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [supportLevels, setSupportLevels] = useState([]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    axios
      .get(`${base}/api/proxy?id=${companyId}`)
      .then((res) => {
        setData(res.data?.data?.[0]);
        return res.data?.data?.[0];
      })
      .then((res) => {
        const supports = findSupportLevels(res.points);
        setSupportLevels(supports);
      })
      .catch((error) => setErr(error.message));
  }, [companyId]);

  if (err) return <div>Error: {err}</div>;
  if (!data) return <div>Loading...</div>;

  const labels = data.points.map((d) =>
    new Date(d.ts).toLocaleDateString("en-IN")
  );

  const prices = data.points.map((d) => d.lp);

  return (
    <div>
      <div>
        <h2>{data.sid}</h2>
        {supportLevels.map((supportLevel) => {
          return <h1 key={supportLevel}>{supportLevel}</h1>;
        })}
      </div>

      <div className="p-4 bg-white rounded-xl shadow-xl">
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
                pointRadius: 0,
                pointHoverRadius: 0,
                borderWidth: 2
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: { mode: "index", intersect: false }
            },
            scales: {
              x: {
                display: false
              },
              y: {
                beginAtZero: false,
                display: false
              }
            }
          }}
        />
      </div>
    </div>
  );
}
