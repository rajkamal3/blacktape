export const transformNasdaqChartData = (apiResponse) => {
  if (!apiResponse || !apiResponse.data) {
    throw new Error("Invalid API response");
  }

  const data = apiResponse.data;

  const chartData = Array.isArray(data.chart) ? data.chart : [];

  const priceBars = chartData
    .filter((item) => item && item.z && item.y != null && item.x != null)
    .map((item) => {
      let ts;
      if (item.z.dateTime) {
        const parsed = new Date(item.z.dateTime);
        ts = isNaN(parsed.getTime())
          ? new Date(item.x).toISOString()
          : parsed.toISOString().split("T")[0] + "T00:00:00.000Z";
      } else {
        ts = new Date(item.x).toISOString().split("T")[0] + "T00:00:00.000Z";
      }

      return {
        ts,
        lp:
          typeof item.y === "number"
            ? item.y
            : parseFloat(item.z.lastSalePrice) || 0,
        v: typeof item.x === "number" ? item.x : 0
      };
    });

  const lastValue =
    chartData.length > 0 ? chartData[chartData.length - 1].y : 0;

  return {
    symbol: data.symbol || "UNKNOWN",
    timeRange: "5Y",
    allSymbols: [
      {
        symbol: data.symbol || "UNKNOWN",
        name: data.company || "Unknown Company",
        shortName: data.symbol || "UNKNOWN",
        last: lastValue,
        __typename: "QuoteFields"
      }
    ],
    priceBars,
    __typename: "chartdata"
  };
};

export const getDateRange = (yearsBack) => {
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const today = new Date();
  const nYearsAgo = new Date();
  nYearsAgo.setFullYear(today.getFullYear() - yearsBack);

  return {
    fromDate: formatDate(nYearsAgo),
    toDate: formatDate(today)
  };
};

export const formatDetailedChartData = (data) => {
  return {
    points: data.map((item) => ({
      ts: new Date(item.x).toISOString(),
      lp: item.y,
      v: 0
    }))
  };
};
