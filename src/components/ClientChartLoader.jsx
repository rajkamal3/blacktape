"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  Title
} from "chart.js";
import { findSupportLevels } from "@/utils/findSupportLevels";
import { formatIndianCurrency } from "@/utils/formatIndianCurrency";
import annotationPlugin from "chartjs-plugin-annotation";
import { useGlobalStore } from "@/store/globalStore";

const crosshairLinePlugin = {
  id: "crosshairLine",
  afterDraw: (chart) => {
    if (chart.tooltip?._active && chart.tooltip._active.length) {
      const ctx = chart.ctx;
      const activePoint = chart.tooltip._active[0].element;

      if (!activePoint) return;

      const x = activePoint.x;
      const y = activePoint.y;

      ctx.save();

      ctx.beginPath();
      ctx.moveTo(chart.chartArea.left, y);
      ctx.lineTo(chart.chartArea.right, y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#505050";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, chart.chartArea.top);
      ctx.lineTo(x, chart.chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#505050";
      ctx.stroke();

      ctx.restore();
    }
  }
};

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  crosshairLinePlugin,
  annotationPlugin
);

export default function Chart({ companyId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [supportLevels, setSupportLevels] = useState({
    supportZones: [],
    resistanceZones: [],
    highlightedZones: []
  });
  const [financals, setFinancials] = useState(null);
  const [financalsQuarterly, setFinancialsQuarterly] = useState(null);

  const companySummary = useGlobalStore((state) => state.companySummary);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    axios
      .get(`${base}/api/proxy?id=${companyId}&type=chart`)
      .then((res) => {
        setData(res.data?.data?.[0]);
        return res.data?.data?.[0];
      })
      .then((res) => {
        const supports = findSupportLevels(res.points);
        setSupportLevels(supports);
      })
      .catch((error) => setErr(error.message));

    axios
      .get(`${base}/api/proxy?id=${companyId}&type=financials`)
      .then((res) => {
        setFinancials(res.data?.data);
      })
      .catch((error) => setErr(error.message));

    axios
      .get(`${base}/api/proxy?id=${companyId}&type=financialsQuarterly`)
      .then((res) => {
        setFinancialsQuarterly(res.data?.data);
      })
      .catch((error) => setErr(error.message));
  }, [companyId]);

  if (err) return <div>Error: {err}</div>;
  if (!data) return <div>Loading...</div>;

  const labels = data.points.map((d) =>
    new Date(d.ts).toLocaleDateString("en-IN")
  );

  const prices = data.points.map((d) => d.lp);

  const supportAnnotations = supportLevels.supportZones.map((zone, idx) => ({
    type: "line",
    yMin: parseFloat(zone.zone),
    yMax: parseFloat(zone.zone),
    borderColor: zone.confirmedResistance
      ? "rgba(0, 0, 0, 0.5)"
      : "rgba(0, 0, 0, 0.25)",
    borderWidth: zone.confirmedResistance ? 1 : 0.5,
    label: {
      display: true,
      content: `${formatIndianCurrency(zone.zone)}`,
      position: "start",
      backgroundColor: "rgba(0, 0, 0, 0.0)",
      color: "#000",
      font: { size: 7 }
    }
  }));

  const financialsData = {
    labels: financals?.map((d) => d.displayPeriod),
    datasets: [
      {
        label: "Revenue",
        data: financals?.map((d) => d.incTrev),
        backgroundColor: "#696969"
      },
      {
        label: "Net Income",
        data: financals?.map((d) => d.incNinc),
        backgroundColor: "#cbcbcb"
      }
    ]
  };

  const financialsQuarterlyData = {
    labels: financalsQuarterly?.map((d) => d.displayPeriod),
    datasets: [
      {
        label: "Revenue",
        data: financalsQuarterly?.map((d) => d.qIncTrev),
        backgroundColor: "#696969"
      },
      {
        label: "Net Income",
        data: financalsQuarterly?.map((d) => d.qIncNinc),
        backgroundColor: "#cbcbcb"
      }
    ]
  };

  const financialsOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
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
  };

  return (
    <div className="p-4">
      <div>
        <h2 className="font-bold">
          {companySummary.SC_FULLNM || data.sid}&nbsp;&nbsp;
          {companySummary.pricecurrent ||
            formatIndianCurrency(data.points[data.points.length - 1].lp)}
        </h2>

        <div className="bg-white rounded-xl shadow-xl">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Closing Price (₹)",
                  data: prices,
                  borderColor: "#000000",
                  backgroundColor: "rgba(30, 0, 0, 0.1)",
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
                tooltip: {
                  mode: "index",
                  intersect: false,
                  displayColors: false,
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  titleColor: "#fff",
                  bodyColor: "#fff",
                  titleFont: {
                    family: "Inter",
                    size: 10
                  },
                  bodyFont: {
                    family: "Inter",
                    size: 10
                  },
                  callbacks: {
                    label: function (context) {
                      const price = context.formattedValue;
                      return `₹${price}`;
                    }
                  }
                },
                annotation: {
                  annotations: {
                    ...supportAnnotations.reduce((acc, cur, i) => {
                      acc[`support_${i}`] = cur;
                      return acc;
                    }, {})
                  }
                }
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
          <h2 className="text-2xl font-bold mb-4">Support Zones</h2>
          <div className="overflow-x-auto mb-8">
            <table className="table-auto w-full border border-green-500 text-black">
              <thead>
                <tr className="bg-green-200">
                  <th className="border px-4 py-2">Zone</th>
                  <th className="border px-4 py-2">Bounce Count</th>
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
                    <td className="border px-4 py-2">
                      {formatIndianCurrency(zone.zone)}
                    </td>
                    <td className="border px-4 py-2">{zone.bounceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Yearly Financials</h2>

        <Bar data={financialsData} options={financialsOptions} />
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Quarterly Financials</h2>

        <Bar data={financialsQuarterlyData} options={financialsOptions} />
      </div>

      {companySummary.SC_FULLNM && (
        <div className="p-4">
          <div className="bg-zinc-900 text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">
              {companySummary.SC_FULLNM}
            </h2>
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">Price</td>
                  <td className="py-2 font-semibold">
                    {formatIndianCurrency(companySummary.pricecurrent)} (
                    {Number(companySummary.pricepercentchange).toFixed(2)}%)
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">52W High</td>
                  <td className="py-2">
                    <div className="flex items-center justify-between">
                      <span>{formatIndianCurrency(companySummary["52H"])}</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">52W Low</td>
                  <td className="py-2">
                    <div className="flex items-center justify-between">
                      <span>{formatIndianCurrency(companySummary["52L"])}</span>
                      <span className="ml-2 text-xs text-gray-400 bg-zinc-800 px-2 py-0.5 rounded">
                        Near Low: {companySummary.closenessToLowPct.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">Valuation</td>
                  <td className="py-2">
                    {formatIndianCurrency(companySummary.MKTCAP)} Cr
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">PE | S. PE</td>
                  <td className="py-2">
                    {companySummary.PE} | {companySummary.IND_PE}
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">PB</td>
                  <td className="py-2">
                    {formatIndianCurrency(companySummary.PB)}
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">BV</td>
                  <td className="py-2">
                    {formatIndianCurrency(companySummary.BV)}
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">1M | 3M | 1Y</td>
                  <td className="py-2">
                    {Number(companySummary.cl1mPerChange).toFixed(2)}% |{" "}
                    {Number(companySummary.cl3mPerChange).toFixed(2)}% |{" "}
                    {Number(companySummary.cl1yPerChange).toFixed(2)}%
                  </td>
                </tr>
                <tr className="border-b border-zinc-700">
                  <td className="py-2 text-gray-400">5Y CAGR</td>
                  <td className="py-2">
                    {Number(companySummary.cagr5Y).toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
