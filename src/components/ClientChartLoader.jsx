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
import Spinner from "@/components/Spinner";

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
  const [summary, setSummary] = useState(null);

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

    axios
      .get(`${base}/api/proxy?id=${companyId}&type=holding`)
      .then((res) => {
        setSummary(res.data?.data);
      })
      .catch((error) => setErr(error.message));
  }, [companyId]);

  if (err) return <div>Error: {err}</div>;
  if (!data)
    return (
      <div
        className="flex justify-center items-center"
        style={{
          height: "calc(100vh - 50px)"
        }}
      >
        <Spinner />
      </div>
    );

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
      }
    },
    scales: {
      x: {
        stacked: true,
        display: false
      },
      y: {
        stacked: true,
        beginAtZero: true,
        display: false
      }
    }
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
        display: false
      },
      y: {
        stacked: false,
        beginAtZero: true,
        display: false
      }
    }
  };

  return (
    <div className="p-4">
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
              {companySummary.SC_FULLNM || data.sid}&nbsp;&nbsp;
            </h2>
          )}
        </div>

        <div>
          {companyId === ".NSEI" ||
          companyId === ".NN50" ||
          companyId === ".NIMI150" ||
          companyId === ".NISM250" ? (
            <h2 className="text-lg font-bold mb-4">
              {formatIndianCurrency(
                data.points[data.points.length - 1].lp,
                false
              )}
            </h2>
          ) : (
            <h2 className="text-lg font-bold mb-4">
              {companySummary.pricecurrent
                ? `${formatIndianCurrency(
                    companySummary.pricecurrent
                  )} (${Number(companySummary.pricepercentchange).toFixed(2)}%)`
                : formatIndianCurrency(data.points[data.points.length - 1].lp)}
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
          <div className="overflow-x-auto">
            <table className="table-auto w-full border border-green-500 text-black">
              <thead>
                <tr className="bg-green-200">
                  <th className="border px-4 py-2">Zone</th>
                  <th className="border px-4 py-2">Fall</th>
                  {!(
                    companyId === "NBES" ||
                    companyId === "JBES" ||
                    companyId === "NTFM" ||
                    companyId === ".NSEI" ||
                    companyId === ".NN50" ||
                    companyId === ".NIMI150" ||
                    companyId === ".NISM250"
                  ) && <th className="border px-4 py-2">PE</th>}
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
                    {companyId === ".NSEI" ||
                    companyId === ".NN50" ||
                    companyId === ".NIMI150" ||
                    companyId === ".NISM250" ? (
                      <td className="border px-4 py-2">
                        {formatIndianCurrency(zone.zone, false)}
                      </td>
                    ) : (
                      <td className="border px-4 py-2">
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
                      <td className="border px-4 py-2">
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
                      <td className="border px-4 py-2">
                        {companySummary.pricecurrent
                          ? `${(
                              ((companySummary.pricecurrent - zone.zone) /
                                companySummary.pricecurrent) *
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
                      <td className="border px-4 py-2">
                        {(
                          companySummary.PE -
                          (companySummary.PE *
                            (companySummary.pricecurrent - zone.zone)) /
                            companySummary.pricecurrent
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

            <Bar data={financialsData} options={financialsOptions} />
          </div>

          <div className="py-4">
            <h2 className="text-2xl font-bold mb-4">Quarterly Financials</h2>

            <Bar data={financialsQuarterlyData} options={financialsOptions} />
          </div>

          {companySummary.SC_FULLNM && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-4">Snapshot</h2>

              <div className="bg-zinc-900 text-white p-6 rounded-xl shadow-lg">
                <h2 className="text-l font-bold mb-1">
                  {companySummary.SC_FULLNM}
                </h2>

                <h2 className="text-sm font-bold mb-1">
                  {companySummary.pricecurrent
                    ? `${formatIndianCurrency(
                        companySummary.pricecurrent
                      )} (${Number(companySummary.pricepercentchange).toFixed(
                        2
                      )}%)`
                    : formatIndianCurrency(
                        data.points[data.points.length - 1].lp
                      )}
                </h2>

                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-zinc-700">
                      <td className="py-3 w-1/3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">
                            Valuation (Cr)
                          </span>
                          <span>
                            {formatIndianCurrency(companySummary.MKTCAP)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 w-1/3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">PE</span>
                          <span>{companySummary.PE}</span>
                        </div>
                      </td>

                      <td className="py-3 w-1/3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">
                            Sector PE
                          </span>
                          <span>{companySummary.IND_PE}</span>
                        </div>
                      </td>
                    </tr>

                    <tr className="border-b border-zinc-700">
                      <td className="py-3 w-1/3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">
                            52W High
                          </span>
                          <span>
                            {formatIndianCurrency(companySummary["52H"])}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 w-1/3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">
                            52W Low
                          </span>
                          <span>
                            {formatIndianCurrency(companySummary["52L"])}
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
                              ((companySummary.pricecurrent -
                                companySummary["52L"]) /
                                companySummary["52L"]) *
                              100
                            ).toFixed(2)}
                            %
                          </span>
                        </div>
                      </td>
                    </tr>

                    <tr className="border-b border-zinc-700">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">PB</span>
                          <span>{formatIndianCurrency(companySummary.PB)}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">BV</span>
                          <span>{formatIndianCurrency(companySummary.BV)}</span>
                        </div>
                      </td>
                    </tr>
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
                          <span className="text-gray-400 text-xxs">1 Year</span>
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
                              ? `${Number(companySummary.cagr10Y).toFixed(2)}%`
                              : "-"}
                          </span>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={6} className="py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xxs">Sector</span>
                          <span>{companySummary.SC_SUBSEC}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="py-4">
            <h2 className="text-2xl font-bold mb-4">Holding</h2>

            <Bar data={holdingsData} options={holdingsOptions} />
          </div>

          {summary?.brands.length > 0 && (
            <div className="py-4">
              <h2 className="text-2xl font-bold mb-4">Brands</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary?.brands.map((brand) => (
                  <div
                    key={brand.brandId}
                    className="rounded-2xl p-4 bg-zinc-900 text-white"
                  >
                    <h2 className="text-m font-semibold">{brand.name}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {brand.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
