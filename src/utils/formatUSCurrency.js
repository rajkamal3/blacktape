export const formatUSCurrency = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "-";

  const absNum = Math.abs(num);
  let formatted;

  if (absNum >= 1e12) {
    formatted = (num / 1e12).toFixed(2) + " Trillion";
  } else if (absNum >= 1e9) {
    formatted = (num / 1e9).toFixed(2) + " Billion";
  } else if (absNum >= 1e6) {
    formatted = (num / 1e6).toFixed(2) + " Million";
  } else if (absNum >= 1e3) {
    formatted = num.toLocaleString("en-US");
  } else {
    formatted = num.toString();
  }

  return "$ " + formatted;
};
