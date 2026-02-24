"use client";

import { useEffect, useState, useTransition } from "react";
import axios from "axios";
import { Line, Bar } from "react-chartjs-2";
import { Button } from "primereact/button";
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
import { formatDetailedChartData } from "@/utils/utils";
import annotationPlugin from "chartjs-plugin-annotation";
import { useGlobalStore } from "@/store/globalStore";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/navigation";
import { nifty50 } from "@/data/nifty50";
import { niftyNext50 } from "@/data/niftyNext50";
import { niftyMidcap150 } from "@/data/niftyMidcap150";
import { niftySmallcap250 } from "@/data/niftySmallcap250";
import ChartDataLabels from "chartjs-plugin-datalabels";

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

const quarterIndicatorPlugin = {
  id: "quarterIndicator",
  afterDraw(chart, args, pluginOptions) {
    if (!pluginOptions?.enabled) return;

    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;

    if (!xScale) return;

    const labels = chart.data.labels;

    const QUARTER_COLORS = {
      MAR: "#a5a5a5",
      JUN: "#a5a5a5",
      SEP: "#a5a5a5",
      DEC: "#a5a5a5"
    };

    const groups = {};

    labels.forEach((label, index) => {
      const rawQuarter = label.split(" ")[0];

      const upperQuarter = rawQuarter.toUpperCase();
      const displayQuarter =
        rawQuarter.toLowerCase().charAt(0).toUpperCase() +
        rawQuarter.toLowerCase().slice(1);

      if (!groups[upperQuarter]) {
        groups[upperQuarter] = {
          indices: [],
          display: displayQuarter
        };
      }

      groups[upperQuarter].indices.push(index);
    });

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "500 9px Inter, sans-serif";

    const y = chartArea.bottom + 25;

    Object.entries(groups).forEach(([quarterKey, group]) => {
      const { indices, display } = group;

      const firstIndex = indices[0];
      const lastIndex = indices[indices.length - 1];

      const startX = xScale.getPixelForTick(firstIndex);
      const endX = xScale.getPixelForTick(lastIndex);

      ctx.strokeStyle = QUARTER_COLORS[quarterKey] || "#999";
      ctx.fillStyle = QUARTER_COLORS[quarterKey] || "#999";
      ctx.lineWidth = 2;

      const horizontalPadding = 15;

      ctx.beginPath();
      ctx.moveTo(startX - horizontalPadding, y);
      ctx.lineTo(endX + horizontalPadding, y);
      ctx.stroke();

      ctx.fillText(display, (startX + endX) / 2, y + 4);
    });

    ctx.restore();
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
  quarterIndicatorPlugin,
  annotationPlugin,
  ChartDataLabels
);

export default function Chart({ companyId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [supportLevels, setSupportLevels] = useState({
    supportZones: [],
    resistanceZones: [],
    highlightedZones: []
  });
  const [financials, setFinancials] = useState(null);
  const [financialsQuarterly, setFinancialsQuarterly] = useState(null);
  const [summary, setSummary] = useState(null);
  const [info, setInfo] = useState(null);

  const companySummary = useGlobalStore((state) => state.companySummary);
  const setCompanySummary = useGlobalStore((state) => state.setCompanySummary);
  const displayRandomButtonInDetailsPage = useGlobalStore(
    (state) => state.displayRandomButtonInDetailsPage
  );

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const nifty500 = [
    ...nifty50,
    ...niftyNext50,
    ...niftyMidcap150,
    ...niftySmallcap250
  ];

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const shouldRefresh = (key, ruleFn) => {
      const cached = localStorage.getItem(key);

      if (!cached) return true;

      const { timestamp } = JSON.parse(cached);

      return ruleFn(new Date(timestamp));
    };

    const setCache = (key, data) => {
      localStorage.setItem(
        key,
        JSON.stringify({ data, timestamp: new Date().toISOString() })
      );
    };

    // refreshes every 7 days based on last point date
    const chartKey = `${companyId}_chart`;

    if (
      shouldRefresh(chartKey, (ts) => {
        const lastPointDate = new Date(data?.points?.at(-1)?.ts || ts);
        const diffDays =
          (new Date() - new Date(lastPointDate)) / (1000 * 60 * 60 * 24);

        return diffDays >= 7;
      })
    ) {
      const companyData = nifty500.find(
        (company) => company.detailsId === companyId
      );

      // if (companySummary.detailedChartId || companyData?.bseId) {
      if (false) {
        axios
          .get(
            `${base}/api/proxy?id=${
              companySummary.detailedChartId || companyData.bseId
            }&type=chartDetailed`
          )
          .then((res) => {
            const chartDataDetailed = res.data;
            const formattedChartDataDetailed = chartDataDetailed
              ? formatDetailedChartData(chartDataDetailed)
              : null;

            if (
              !formattedChartDataDetailed ||
              !formattedChartDataDetailed.points ||
              formattedChartDataDetailed.points.length === 0
            ) {
              return axios
                .get(`${base}/api/proxy?id=${companyId}&type=chart`)
                .then((res) => {
                  const chartData = res.data?.data?.[0];

                  setData(chartData);
                  setCache(chartKey, chartData);

                  const supports = findSupportLevels(chartData.points);
                  setSupportLevels(supports);
                });
            }

            setData(formattedChartDataDetailed);
            setCache(chartKey, formattedChartDataDetailed);

            const supports = findSupportLevels(
              formattedChartDataDetailed.points
            );
            setSupportLevels(supports);
          })
          .catch((error) => setErr(error.message));
      } else {
        axios
          .get(`${base}/api/proxy?id=${companyId}&type=chart`)
          .then((res) => {
            const chartData = res.data?.data?.[0];

            setData(chartData);
            setCache(chartKey, chartData);

            const supports = findSupportLevels(chartData.points);
            setSupportLevels(supports);
          })
          .catch((error) => setErr(error.message));
      }
    } else {
      const cached = JSON.parse(localStorage.getItem(chartKey));

      setData(cached.data);

      const supports = findSupportLevels(cached.data.points);

      setSupportLevels(supports);
    }

    if (
      companyId === "NBES" ||
      companyId === "JBES" ||
      companyId === "NTFM" ||
      companyId === ".NSEI" ||
      companyId === ".NN50" ||
      companyId === ".NIMI150" ||
      companyId === ".NISM250"
    )
      return;

    // refresh on 15th every 2 months
    const twoMonthRule = (ts) => {
      const now = new Date();
      const last = new Date(ts);

      return (
        now.getMonth() % 2 === 0 &&
        now.getDate() >= 15 &&
        (last.getMonth() !== now.getMonth() ||
          last.getFullYear() !== now.getFullYear())
      );
    };

    const financialsKey = `${companyId}_financials`;

    if (shouldRefresh(financialsKey, twoMonthRule)) {
      axios
        .get(`${base}/api/proxy?id=${companyId}&type=financials`)
        .then((res) => {
          const trimmed = res.data?.data?.map((item) => ({
            displayPeriod: item.displayPeriod,
            incTrev: item.incTrev,
            incNinc: item.incNinc
          }));

          setFinancials(trimmed);
          setCache(financialsKey, trimmed);
        })
        .catch((error) => setErr(error.message));
    } else {
      const cached = JSON.parse(localStorage.getItem(financialsKey)).data;

      setFinancials(cached);
    }

    const qFinancialsKey = `${companyId}_financialsQuarterly`;

    if (shouldRefresh(qFinancialsKey, twoMonthRule)) {
      axios
        .get(`${base}/api/proxy?id=${companyId}&type=financialsQuarterly`)
        .then((res) => {
          const trimmed = res.data?.data?.map((item) => ({
            displayPeriod: item.displayPeriod,
            qIncTrev: item.qIncTrev,
            qIncNinc: item.qIncNinc
          }));

          setFinancialsQuarterly(trimmed);
          setCache(qFinancialsKey, trimmed);
        })
        .catch((error) => setErr(error.message));
    } else {
      const cached = JSON.parse(localStorage.getItem(qFinancialsKey)).data;

      setFinancialsQuarterly(cached);
    }

    // refresh every 3 days
    const summaryKey = `${companyId}_summary`;

    if (
      shouldRefresh(summaryKey, (ts) => {
        const diffDays = (new Date() - new Date(ts)) / (1000 * 60 * 60 * 24);
        return diffDays >= 3;
      })
    ) {
      axios
        .get(`${base}/api/proxy?id=${companyId}&type=summary`)
        .then((res) => {
          const raw = res.data?.data;

          const trimmed = {
            holdings: {
              holdings: raw?.holdings?.holdings?.map((h) => ({
                date: h.date,
                data: {
                  pmPctT: h.data.pmPctT,
                  fiPctT: h.data.fiPctT,
                  othDiPctT: h.data.othDiPctT,
                  mfPctT: h.data.mfPctT,
                  rOthPctT: h.data.rOthPctT
                }
              }))
            },
            aboutAndPeers: raw?.aboutAndPeers?.map((p) => ({
              name: p.name,
              sid: p.sid,
              ratios: {
                "52wpct": p.ratios["52wpct"],
                marketCap: p.ratios.marketCap,
                apef: p.ratios.apef,
                pbr: p.ratios.pbr
              }
            })),
            brands: raw?.brands
          };

          setSummary(trimmed);
          setCache(summaryKey, trimmed);
        })
        .catch((error) => setErr(error.message));
    } else {
      setSummary(JSON.parse(localStorage.getItem(summaryKey)).data);
    }

    // refresh at 9:30 AM Mon–Fri only
    const infoKey = `${companyId}_info`;

    if (
      shouldRefresh(infoKey, (ts) => {
        const now = new Date();
        const last = new Date(ts);
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        const passed930 =
          now.getHours() > 9 ||
          (now.getHours() === 9 && now.getMinutes() >= 30);

        return (
          !isWeekend && passed930 && now.toDateString() !== last.toDateString()
        );
      })
    ) {
      axios
        .get(`${base}/api/proxy?id=${companyId}&type=info`)
        .then((res) => {
          const raw = res.data?.data;

          const trimmed = {
            info: {
              name: raw?.info?.name,
              sector: raw?.info?.sector
            },
            ratios: {
              lastPrice: raw?.ratios?.lastPrice,
              apef: raw?.ratios?.apef,
              ["52wLow"]: raw?.ratios?.["52wLow"],
              ["52wHigh"]: raw?.ratios?.["52wHigh"],
              marketCap: raw?.ratios?.marketCap,
              indpe: raw?.ratios?.indpe,
              pb: raw?.ratios?.pb
            }
          };

          setInfo(trimmed);
          setCache(infoKey, trimmed);
        })
        .catch((error) => setErr(error.message));
    } else {
      setInfo(JSON.parse(localStorage.getItem(infoKey)).data);
    }
  }, [companyId]);

  if (err) return <div>Error: {err}</div>;

  if (
    companyId === "NBES" ||
    companyId === "JBES" ||
    companyId === "NTFM" ||
    companyId === ".NSEI" ||
    companyId === ".NN50" ||
    companyId === ".NIMI150" ||
    companyId === ".NISM250"
      ? !data
      : !data || !summary || !info || isPending
  ) {
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
    labels: financials?.map((d) => d.displayPeriod),
    datasets: [
      {
        label: "Revenue",
        data: financials?.map((d) => d.incTrev),
        backgroundColor: "#696969"
      },
      {
        label: "Net Income",
        data: financials?.map((d) => d.incNinc),
        backgroundColor: "#cbcbcb"
      }
    ]
  };

  const groupByQuarterOrder = (data) => {
    if (!Array.isArray(data)) return [];

    const QUARTER_ORDER = ["MAR", "JUN", "SEP", "DEC"];

    return [...data]
      .filter(
        (item) =>
          item &&
          typeof item.displayPeriod === "string" &&
          item.displayPeriod.trim().split(" ").length === 2
      )
      .sort((a, b) => {
        const [qA, yA] = a.displayPeriod.trim().toUpperCase().split(" ");
        const [qB, yB] = b.displayPeriod.trim().toUpperCase().split(" ");

        const quarterIndexA = QUARTER_ORDER.indexOf(qA);
        const quarterIndexB = QUARTER_ORDER.indexOf(qB);

        if (quarterIndexA === -1 && quarterIndexB === -1) {
          return Number(yA) - Number(yB);
        }
        if (quarterIndexA === -1) return 1;
        if (quarterIndexB === -1) return -1;

        if (quarterIndexA !== quarterIndexB) {
          return quarterIndexA - quarterIndexB;
        }

        return Number(yA) - Number(yB);
      });
  };

  const formatShortLabel = (displayPeriod) => {
    if (!displayPeriod || typeof displayPeriod !== "string") return "";

    const [month, year] = displayPeriod.trim().split(" ");

    if (month === "TTM") return "TTM";

    if (!month || !year) return "";

    const shortMonth =
      month.charAt(0).toUpperCase() + month?.slice(1).toLowerCase();
    const shortYear = year.slice(-2);

    return `${shortMonth} ${shortYear}`;
  };

  const financialsQuarterlyTransformed =
    groupByQuarterOrder(financialsQuarterly);

  const financialsQuarterlyData = {
    labels: financialsQuarterlyTransformed?.map((d) => d.displayPeriod),
    datasets: [
      {
        label: "Revenue",
        data: financialsQuarterlyTransformed?.map((d) => d.qIncTrev),
        backgroundColor: "#696969"
      },
      {
        label: "Net Income",
        data: financialsQuarterlyTransformed?.map((d) => d.qIncNinc),
        backgroundColor: "#cbcbcb"
      }
    ]
  };

  const financialsOptions = (type) => {
    return {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          displayColors: false,
          mode: "index",
          intersect: false,
          callbacks: {
            label: function (context) {
              const revenue =
                context.chart.data.datasets[0].data[context.dataIndex];
              const netProfit =
                context.chart.data.datasets[1].data[context.dataIndex];

              let percentage = 0;
              if (revenue && netProfit) {
                percentage = ((netProfit / revenue) * 100).toFixed(2);
              }

              return context.dataset.label === "Revenue"
                ? `Revenue: ${formatIndianCurrency(revenue)} Cr`
                : `Net Profit: ${formatIndianCurrency(
                    netProfit
                  )} Cr (${percentage}% of revenue)`;
            }
          },
          titleFont: { family: "Inter, sans-serif" },
          bodyFont: { family: "Inter, sans-serif" }
        },
        quarterIndicator: {
          enabled: type === "quarterly"
        },
        datalabels: {
          anchor: "end",
          align: "end",
          font: {
            size: 8,
            family: "Inter"
          },
          color: (context) => {
            const data = context.dataset.data;
            const index = context.dataIndex;

            if (index === 0) return "transparent";

            const diff = data[index] - data[index - 1];
            return diff >= 0 ? "#83ff83" : "#ff7f7f";
          },
          formatter: (value, context) => {
            const data = context.dataset.data;
            const labels = context.chart.data.labels;
            const i = context.dataIndex;

            if (i === 0 || context.dataset.label === "Net Income") return "";

            const currentLabel = labels[i];
            const prevLabel = labels[i - 1];

            const currentQuarter = currentLabel.split(" ")[0];
            const prevQuarter = prevLabel.split(" ")[0];

            if (currentQuarter !== prevQuarter && currentQuarter !== "TTM")
              return "";

            const prev = data[i - 1];
            const pct = ((value - prev) / prev) * 100;
            const sign = pct > 0 ? "+" : "";

            return `${sign}${pct.toFixed(2)}%`;
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            callback: function (value) {
              const label = this.getLabelForValue(value);

              return type === "quarterly"
                ? formatShortLabel(label)
                : formatShortLabel(label).toUpperCase();
            },
            font: {
              size: 8
            }
          }
        },
        y: {
          beginAtZero: true,
          display: false,
          grace: "50%"
        }
      },
      layout: {
        padding: {
          bottom: type === "quarterly" ? 18 : 0
        }
      }
    };
  };

  const holdingsData = {
    labels: summary?.holdings?.holdings?.map((h) => h.date),
    datasets: [
      {
        label: "Promoter",
        data: summary?.holdings?.holdings?.map((h) => h.data.pmPctT),
        backgroundColor: "#525252"
      },
      {
        label: "FIIs",
        data: summary?.holdings?.holdings?.map((h) => h.data.fiPctT),
        backgroundColor: "#727272"
      },
      {
        label: "DIIs",
        data: summary?.holdings?.holdings?.map((h) => h.data.othDiPctT),
        backgroundColor: "#929292"
      },
      {
        label: "MFs",
        data: summary?.holdings?.holdings?.map((h) => h.data.mfPctT),
        backgroundColor: "#a5a5a5"
      },
      {
        label: "Retail",
        data: summary?.holdings?.holdings?.map((h) => h.data.rOthPctT),
        backgroundColor: "#b5b5b5"
      }
    ]
  };

  const holdingsOptions = {
    responsive: true,
    plugins: {
      datalabels: {
        anchor: "end",
        align: "top",
        font: {
          size: 7,
          family: "Inter"
        },
        formatter: (value, context) => {
          const data = context.dataset.data;
          const label = context.dataset.label;
          const i = context.dataIndex;

          if (i === 0) return "";

          const prev = data[i - 1];
          const diff = value - prev;
          const sign = diff >= 0 ? "+" : "";

          console.log(diff);

          if (
            label === "Promoter" &&
            diff.toFixed(2) !== Number("0.00").toFixed(2)
          ) {
            return `${sign}${diff.toFixed(2)}%`;
          } else {
            return "";
          }
        },

        color: (context) => {
          const data = context.dataset.data;
          const i = context.dataIndex;

          if (i === 0) return "transparent";

          const diff = data[i] - data[i - 1];
          return diff >= 0 ? "#83ff83" : "#ff7f7f";
        },
        clip: false,
        clamp: true
      },
      legend: {
        display: false
      },
      tooltip: {
        displayColors: false,
        mode: "index",
        intersect: false,
        callbacks: {
          title: (tooltipItems) => {
            const date = new Date(tooltipItems[0].label);

            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric"
            });
          },
          label: (context) => {
            const value = context.parsed.y;

            return `${context.dataset.label || "Value"}: ${value.toFixed(2)}%`;
          }
        },
        titleFont: { family: "Inter, sans-serif" },
        bodyFont: { family: "Inter, sans-serif" }
      }
    },
    scales: {
      x: {
        stacked: false,
        display: true,
        ticks: {
          callback: function (value) {
            const rawLabel = this.getLabelForValue(value);
            const date = new Date(rawLabel);

            const month = date.getUTCMonth();
            const year = date.getUTCFullYear().toString();

            const quarter = Math.floor(month / 3) + 1;

            return `Q${quarter} ${year}`;
          },
          font: {
            size: 8
          }
        }
      },
      y: {
        stacked: false,
        beginAtZero: true,
        display: false,
        grace: "25%"
      }
    }
  };

  const handleCardClick = async (detailsId) => {
    startTransition(() => {
      router.push(`/home/${detailsId}`);
    });
  };

  return (
    <div className="p-4 bg-[var(--background)]">
      {displayRandomButtonInDetailsPage && (
        <div
          style={{
            position: "fixed",
            zIndex: 999,
            right: "10px",
            bottom: "10px",
            height: "60px",
            width: "60px",
            backgroundColor: "#d60017",
            borderRadius: "100px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
          onClick={() =>
            handleCardClick(nifty500[Math.floor(Math.random() * 500)].detailsId)
          }
        >
          <Button
            icon="pi pi-step-forward"
            text
            style={{ color: "#ededed" }}
            size="large"
          />
        </div>
      )}

      <div>
        <div>
          {companyId === "NBES" ||
          companyId === "JBES" ||
          companyId === "NTFM" ||
          companyId === ".NSEI" ||
          companyId === ".NN50" ||
          companyId === ".NIMI150" ||
          companyId === ".NISM250" ? (
            <>
              {companyId === "NBES" && (
                <h2 className="text-2xl font-bold">NIFTYBEES</h2>
              )}
              {companyId === "JBES" && (
                <h2 className="text-2xl font-bold">JUNIORBEES</h2>
              )}
              {companyId === "NTFM" && (
                <h2 className="text-2xl font-bold">MID150BEES</h2>
              )}
              {companyId === ".NSEI" && (
                <h2 className="text-2xl font-bold">Nifty 50</h2>
              )}
              {companyId === ".NN50" && (
                <h2 className="text-2xl font-bold">Nifty Next 50</h2>
              )}
              {companyId === ".NIMI150" && (
                <h2 className="text-2xl font-bold">Nifty Midcap 150</h2>
              )}
              {companyId === ".NISM250" && (
                <h2 className="text-2xl font-bold">Nifty Smallcap 250</h2>
              )}
            </>
          ) : (
            <h2 className="text-2xl font-bold">
              {info.info.name.replace("Ltd", "") || data.sid || "Invalid name"}
            </h2>
          )}
        </div>

        <div>
          {[".NSEI", ".NN50", ".NIMI150", ".NISM250"].includes(companyId) ? (
            <h2 className="text-lg font-bold mb-4">
              {formatIndianCurrency(
                data.points[data.points.length - 1].lp,
                false
              )}
            </h2>
          ) : ["NBES", "JBES", "NTFM"].includes(companyId) ? (
            <h2 className="text-lg font-bold mb-4">
              {formatIndianCurrency(
                data.points[data.points.length - 1].lp,
                true
              )}
            </h2>
          ) : (
            <h2 className="text-lg font-bold mb-4">
              {formatIndianCurrency(info.ratios.lastPrice)}
              {companySummary.pricepercentchange &&
                ` (${Number(companySummary.pricepercentchange).toFixed(2)}%)`}
            </h2>
          )}
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
                datalabels: false,
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

        <div className="py-4 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Support Zones</h2>
          <div className="overflow-x-auto rounded-lg">
            <table className="table-auto w-full border-green-500 text-gray-100">
              <thead className="bg-[#2d2d2d]">
                <tr>
                  <th className="px-4 py-2 text-left">Zone</th>
                  <th className="px-4 py-2 text-left">Fall</th>
                  {!(
                    companyId === "NBES" ||
                    companyId === "JBES" ||
                    companyId === "NTFM" ||
                    companyId === ".NSEI" ||
                    companyId === ".NN50" ||
                    companyId === ".NIMI150" ||
                    companyId === ".NISM250"
                  ) && <th className="px-4 py-2 text-left">PE</th>}
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
                    {companyId === ".NSEI" ||
                    companyId === ".NN50" ||
                    companyId === ".NIMI150" ||
                    companyId === ".NISM250" ? (
                      <td className="px-4 py-2">
                        {formatIndianCurrency(zone.zone, false)}
                      </td>
                    ) : (
                      <td className="px-4 py-2">
                        {formatIndianCurrency(zone.zone)}
                      </td>
                    )}

                    {companyId === "NBES" ||
                    companyId === "JBES" ||
                    companyId === "NTFM" ||
                    companyId === ".NSEI" ||
                    companyId === ".NN50" ||
                    companyId === ".NIMI150" ||
                    companyId === ".NISM250" ? (
                      <td className="px-4 py-2">
                        {data.points[data.points.length - 1].lp
                          ? `${(
                              ((data.points[data.points.length - 1].lp -
                                zone.zone) /
                                data.points[data.points.length - 1].lp) *
                              100
                            ).toFixed(2)}%`
                          : `-`}
                      </td>
                    ) : (
                      <td className="px-4 py-2">
                        {info.ratios.lastPrice
                          ? `${(
                              ((info.ratios.lastPrice - zone.zone) /
                                info.ratios.lastPrice) *
                              100
                            ).toFixed(2)}%`
                          : `-`}
                      </td>
                    )}

                    {!(
                      companyId === "NBES" ||
                      companyId === "JBES" ||
                      companyId === "NTFM" ||
                      companyId === ".NSEI" ||
                      companyId === ".NN50" ||
                      companyId === ".NIMI150" ||
                      companyId === ".NISM250"
                    ) && (
                      <td className="px-4 py-2 text-left">
                        {(
                          info.ratios.apef.toFixed(2) -
                          (info.ratios.apef.toFixed(2) *
                            (info.ratios.lastPrice - zone.zone)) /
                            info.ratios.lastPrice
                        ).toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {companyId === "NBES" ||
      companyId === "JBES" ||
      companyId === "NTFM" ||
      companyId === ".NSEI" ||
      companyId === ".NN50" ||
      companyId === ".NIMI150" ||
      companyId === ".NISM250" ? (
        <></>
      ) : (
        <div>
          <div className="py-4">
            <h2 className="text-2xl font-bold mb-4">Yearly Financials</h2>

            <Bar data={financialsData} options={financialsOptions("yearly")} />
          </div>

          <div className="py-4">
            <h2 className="text-2xl font-bold mb-4">Quarterly Financials</h2>

            <Bar
              data={financialsQuarterlyData}
              options={financialsOptions("quarterly")}
            />
          </div>

          <div className="py-4">
            <h2 className="text-2xl font-bold mb-4">Snapshot</h2>

            <div className="bg-[#101010] text-white p-6 rounded-xl shadow-lg">
              <h2 className="text-l font-bold mb-1">
                {info.info.name.replace("Ltd", "") || data.sid}
              </h2>

              <h2 className="text-sm font-bold mb-1">
                {formatIndianCurrency(info.ratios.lastPrice)}
                {companySummary.pricepercentchange &&
                  ` (${Number(companySummary.pricepercentchange).toFixed(2)}%)`}
              </h2>

              <table className="w-full text-xs">
                <tbody>
                  <tr className="border-b border-zinc-700">
                    <td className="py-3 w-1/3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">52W Low</span>
                        <span>
                          {formatIndianCurrency(info.ratios["52wLow"])}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 w-1/3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">
                          From 52W Low
                        </span>
                        <span>
                          {(
                            ((info.ratios.lastPrice - info.ratios["52wLow"]) /
                              info.ratios["52wLow"]) *
                            100
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                    </td>

                    <td className="py-3 w-1/3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">52W High</span>
                        <span>
                          {formatIndianCurrency(info.ratios["52wHigh"])}
                        </span>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-zinc-700">
                    <td className="py-3 w-1/3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">
                          Valuation (Cr)
                        </span>
                        <span>
                          {formatIndianCurrency(info.ratios.marketCap)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 w-1/3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">PE</span>
                        <span>{info.ratios.apef.toFixed(2)}</span>
                      </div>
                    </td>

                    <td className="py-3 w-1/3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">
                          Sector PE
                        </span>
                        <span>{info.ratios.indpe.toFixed(2)}</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="border-b border-zinc-700">
                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">
                          P/B Valuation (Cr)
                        </span>
                        <span>
                          {formatIndianCurrency(
                            info.ratios.marketCap / info.ratios.pb
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">
                          Book Value
                        </span>
                        <span>
                          {formatIndianCurrency(
                            info.ratios.lastPrice / info.ratios.pb
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">
                          P/B Ratio
                        </span>
                        <span>{formatIndianCurrency(info.ratios.pb)}</span>
                      </div>
                    </td>
                  </tr>

                  {companySummary.SC_FULLNM && (
                    <>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 w-1/3">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">
                              1 Month
                            </span>
                            <span>
                              {Number(companySummary.cl1mPerChange).toFixed(2)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 w-1/3">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">
                              3 Months
                            </span>
                            <span>
                              {Number(companySummary.cl3mPerChange).toFixed(2)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 w-1/3">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">
                              1 Year
                            </span>
                            <span>
                              {Number(companySummary.cl1yPerChange).toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 w-1/4">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">3Y</span>
                            <span>
                              {Number(companySummary.cagr3Y)
                                ? `${Number(companySummary.cagr3Y).toFixed(2)}%`
                                : "-"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 w-1/4">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">5Y</span>
                            <span>
                              {Number(companySummary.cagr5Y)
                                ? `${Number(companySummary.cagr5Y).toFixed(2)}%`
                                : "-"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 w-1/4">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">7Y</span>
                            <span>
                              {Number(companySummary.cagr7Y)
                                ? `${Number(companySummary.cagr7Y).toFixed(2)}%`
                                : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 w-1/4">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xxs">10Y</span>
                            <span>
                              {Number(companySummary.cagr10Y)
                                ? `${Number(companySummary.cagr10Y).toFixed(
                                    2
                                  )}%`
                                : "-"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td colSpan={6} className="py-3 pb-0">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-xxs">Sector</span>
                        <span>{info.info.sector}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="py-4">
            <h2 className="text-2xl font-bold mb-4">Holding</h2>

            <Bar data={holdingsData} options={holdingsOptions} />
          </div>

          {summary?.aboutAndPeers.length > 0 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-4">Peers</h2>

              <div className="overflow-x-auto rounded-lg shadow text-xs">
                <table className="min-w-full table-fixed bg-gray-900 text-gray-100 border-collapse w-[850px]">
                  <thead className="bg-[#2d2d2d]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-[#2d2d2d] z-10 w-[35px]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-right font-semibold w-[20px]">
                        Valuation (Cr)
                      </th>
                      <th className="px-4 py-3 text-right font-semibold w-[20px]">
                        P/B Valuation (Cr)
                      </th>
                      <th className="px-4 py-3 text-right font-semibold w-[20px]">
                        P/B Ratio
                      </th>
                      <th className="px-4 py-3 text-right font-semibold w-[20px]">
                        PE
                      </th>
                      <th className="px-4 py-3 text-right font-semibold w-[20px]">
                        1 Year Returns
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#101010]">
                    {summary.aboutAndPeers.map((stock, index) => (
                      <tr
                        key={stock.sid}
                        className={`border-t border-[#2d2d2d] ${
                          index === 0
                            ? "bg-[#5d5d5d] hover:bg-[#5d5d5d]"
                            : "hover:bg-[#101010]"
                        }`}
                        onClick={() => {
                          if (index === 0) return;

                          handleCardClick(stock.sid);
                          setCompanySummary({});
                        }}
                      >
                        <td
                          className={`px-4 py-3 sticky left-0 z-10 border-t border-[#2d2d2d] truncate ${
                            index === 0
                              ? "bg-[#5d5d5d] hover:bg-[#5d5d5d]"
                              : "bg-[#101010] hover:bg-[#101010]"
                          }`}
                        >
                          {stock.name.replace("Ltd", "")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatIndianCurrency(stock.ratios.marketCap / 10)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatIndianCurrency(
                            stock.ratios.marketCap / 10 / stock.ratios.pbr
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stock.ratios.pbr?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stock.ratios.apef.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {stock.ratios["52wpct"].toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {summary?.brands.length > 0 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-4">Brands</h2>

              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary?.brands.map((brand) => (
                  <div
                    key={brand.brandId}
                    className="rounded-2xl p-4 bg-[#101010] text-white"
                  >
                    <h2 className="text-m font-semibold">{brand.name}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {brand.description}
                    </p>
                  </div>
                ))}
              </div> */}
              <div className="overflow-x-auto rounded-lg shadow text-xs">
                <table className="min-w-full bg-gray-900 text-gray-100">
                  <thead className="bg-[#2d2d2d]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#101010]">
                    {summary?.brands.map((brand) => (
                      <tr
                        key={brand.brandId}
                        className="border-t border-[#2d2d2d]"
                      >
                        <td className="px-4 py-3">{brand.name}</td>
                        <td className="px-4 py-3 text-left">
                          {brand.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
