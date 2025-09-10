"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { findSupportLevels } from "@/utils/findSupportLevels";
import Spinner from "@/components/Spinner";
import { formatUSCurrency } from "@/utils/formatUSCurrency";
import { Line } from "react-chartjs-2";
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
import annotationPlugin from "chartjs-plugin-annotation";
import { transformNasdaqChartData, getDateRange } from "@/utils/utils";

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

export default function CompanyDetailsUS({ companyId }) {
  const [data, setData] = useState(null);
  const [supportLevels, setSupportLevels] = useState({
    supportZones: [],
    resistanceZones: [],
    highlightedZones: []
  });
  const [err, setErr] = useState(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const chartCacheKey = `cache_us_chart_${companyId}`;

    const { fromDate, toDate } = getDateRange(5);

    if (companyId === "NDX") {
      axios
        .get(
          `${base}/api/proxy?id=${companyId}&type=nasdaqChart&fromDate=${fromDate}&toDate=${toDate}`
        )
        .then((res) => {
          const transformedData = transformNasdaqChartData(res?.data);

          setSupportLevels(findSupportLevels(transformedData.priceBars));
          setData(transformedData);
        });

      return;
    }

    const readCache = () => {
      try {
        const s = localStorage.getItem(chartCacheKey);

        return s ? JSON.parse(s) : null;
      } catch (e) {
        console.error("readCache error", e);

        return null;
      }
    };

    const writeCache = (data) => {
      try {
        localStorage.setItem(
          chartCacheKey,
          JSON.stringify({ data, savedAt: Date.now() })
        );
      } catch (e) {
        console.error("writeCache error", e);
      }
    };

    const estNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const isWeekend = estNow.getDay() === 0 || estNow.getDay() === 6;
    const today10amEst = new Date(
      estNow.getFullYear(),
      estNow.getMonth(),
      estNow.getDate(),
      10,
      0,
      0
    ).getTime();

    const cached = readCache();

    if (cached && cached.data) {
      try {
        setData(cached.data);
        setSupportLevels(findSupportLevels(cached.data.priceBars));
      } catch (e) {
        console.error("apply cache error", e);
      }
    }

    const needFetch = (() => {
      if (!cached || !cached.data) return true;
      if (isWeekend) return false;
      if (estNow.getTime() < today10amEst) return false;

      const savedAt = cached.savedAt || 0;

      return savedAt < today10amEst;
    })();

    if (!needFetch) return;

    let cancelled = false;

    axios
      .get(`${base}/api/proxy?id=${companyId}&type=usChart`)
      .then((res) => {
        if (cancelled) return;

        const chart = res?.data?.data?.chartData;

        if (!chart || !Array.isArray(chart.priceBars)) {
          throw new Error("Invalid chart data");
        }

        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        const transformedPriceData = {
          ...chart,
          priceBars: chart.priceBars
            .filter(
              (item) => Number(item.tradeTimeinMills) >= fiveYearsAgo.getTime()
            )
            .map((item) => ({
              ts:
                new Date(Number(item.tradeTimeinMills))
                  .toISOString()
                  .split("T")[0] + "T00:00:00.000Z",
              lp: parseFloat(item.close),
              v: parseInt(item.volume, 10)
            }))
        };

        setData(transformedPriceData);
        setSupportLevels(findSupportLevels(transformedPriceData.priceBars));
        writeCache(transformedPriceData);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("fetch usChart failed", err);
          setErr(err.message || "usChart fetch failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (err) return <div>Error: {err}</div>;

  if (!data) {
    return (
      <div
        className="flex justify-center items-center bg-[var(--background)]"
        style={{
          height: "calc(100vh - 50px)"
        }}
      >
        <Spinner />
      </div>
    );
  }

  const labels = data.priceBars.map((d) =>
    new Date(d.ts).toLocaleDateString("en-IN")
  );

  const prices = data.priceBars.map((d) => d.lp);

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
      content: `${formatUSCurrency(Number(zone.zone))}`,
      position: "start",
      backgroundColor: "rgba(0, 0, 0, 0.0)",
      color: "#000",
      font: { size: 7 }
    }
  }));

  return (
    <div className="p-4 bg-[var(--background)]">
      <div>
        <div>
          <h2 className="text-2xl font-bold">
            {data.allSymbols[0].name || companyId}
          </h2>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4">
            {formatUSCurrency(data.allSymbols[0].last)}
          </h2>
        </div>

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
                      return `$ ${price}`;
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

        <div className="py-4 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Support Zones</h2>
          <div className="overflow-x-auto rounded-lg">
            <table className="table-auto w-full border-green-500 text-gray-100">
              <thead className="bg-[#2d2d2d]">
                <tr>
                  <th className="px-4 py-2 text-left">Zone</th>
                  <th className="px-4 py-2 text-left">Fall</th>
                </tr>
              </thead>
              <tbody className="bg-[#101010]">
                {supportLevels.supportZones.map((zone, index) => (
                  <tr
                    key={index}
                    className={`${
                      zone.confirmedResistance
                        ? "border-3 border-[#8cff5c]"
                        : "border-t border-[#2d2d2d]"
                    }`}
                  >
                    <td className="px-4 py-2">
                      {formatUSCurrency(Number(zone.zone))}
                    </td>

                    <td className="px-4 py-2">
                      {Number(data.allSymbols[0].last)
                        ? `${(
                            ((Number(data.allSymbols[0].last) - zone.zone) /
                              Number(data.allSymbols[0].last)) *
                            100
                          ).toFixed(2)}%`
                        : `-`}
                    </td>
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
