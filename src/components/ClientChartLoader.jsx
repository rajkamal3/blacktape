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
    <div className="p-4">
      <div>
        <h2>
          {data.sid} {data.points[data.points.length - 1].lp}
        </h2>

        <div className="bg-white rounded-xl shadow-xl">
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

        <div className="p-4 max-w-6xl mx-auto">
          {/* Highlighted Zones Table */}
          <h2 className="text-2xl font-bold mb-4">
            Highlighted Zones (Support + Resistance)
          </h2>
          <div className="overflow-x-auto mb-8">
            <table className="table-auto w-full border border-yellow-500 text-black">
              <thead>
                <tr className="bg-yellow-200">
                  <th className="border px-4 py-2">Zone (₹)</th>
                  <th className="border px-4 py-2">Support Bounces</th>
                  <th className="border px-4 py-2">Resistance Drops</th>
                  {/* <th className="border px-4 py-2">Type</th> */}
                </tr>
              </thead>
              <tbody>
                {supportLevels.highlightedZones.map((zone, index) => (
                  <tr key={index} className="bg-yellow-100 text-black">
                    <td className="border px-4 py-2">{zone.zone}</td>
                    <td className="border px-4 py-2">
                      {zone.supportBounceCount}
                    </td>
                    <td className="border px-4 py-2">
                      {zone.resistanceDropCount}
                    </td>
                    {/* <td className="border px-4 py-2">{zone.type}</td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Support Zones Table */}
          <h2 className="text-2xl font-bold mb-4">Support Zones</h2>
          <div className="overflow-x-auto mb-8">
            <table className="table-auto w-full border border-green-500 text-black">
              <thead>
                <tr className="bg-green-200">
                  <th className="border px-4 py-2">Zone (₹)</th>
                  <th className="border px-4 py-2">Bounce Count</th>
                  <th className="border px-4 py-2">Was Resistance?</th>
                </tr>
              </thead>
              <tbody>
                {supportLevels.supportZones.map((zone, index) => (
                  <tr
                    key={index}
                    className={`bg-green-100 text-black ${
                      zone.confirmedResistance
                        ? "border-4 border-green-600"
                        : ""
                    }`}
                  >
                    <td className="border px-4 py-2">{zone.zone}</td>
                    <td className="border px-4 py-2">{zone.bounceCount}</td>
                    <td className="border px-4 py-2">
                      {zone.confirmedResistance ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resistance Zones Table */}
          <h2 className="text-2xl font-bold mb-4">Resistance Zones</h2>
          <div className="overflow-x-auto">
            <table className="table-auto w-full border border-red-500 text-black">
              <thead>
                <tr className="bg-red-200">
                  <th className="border px-4 py-2">Zone (₹)</th>
                  <th className="border px-4 py-2">Drop Count</th>
                </tr>
              </thead>
              <tbody>
                {supportLevels.resistanceZones.map((zone, index) => (
                  <tr key={index} className="bg-red-100 text-black">
                    <td className="border px-4 py-2">{zone.zone}</td>
                    <td className="border px-4 py-2">{zone.dropCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
