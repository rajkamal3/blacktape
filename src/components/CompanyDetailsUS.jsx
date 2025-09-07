"use client";

import { useEffect, useState, useTransition } from "react";
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

  console.log(data);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    axios
      .get(`${base}/api/proxy?id=${companyId}&type=usChart`)
      .then((res) => {
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        const transformedPriceData = {
          ...res.data.data.chartData,
          priceBars: res.data.data.chartData.priceBars
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

        const supports = findSupportLevels(transformedPriceData.priceBars);
        setSupportLevels(supports);
      })
      .catch((error) => setErr(error.message));
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
      content: `${formatUSCurrency(zone.zone)}`,
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
      </div>
    </div>
  );
}
