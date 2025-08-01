export const findSupportLevels = (priceData) => {
  const supportZones = [];
  const resistanceZones = [];
  const confirmedZones = [];
  const checkedSupports = new Set();
  const checkedResistances = new Set();

  function trendLineMatch(baseIndex, range = 10, type = "support") {
    const base = priceData[baseIndex];
    let count = 0;
    for (
      let i = baseIndex + 1;
      i < baseIndex + range && i < priceData.length;
      i++
    ) {
      const expected =
        type === "support"
          ? base.lp - base.lp * 0.01 * (i - baseIndex)
          : base.lp + base.lp * 0.01 * (i - baseIndex);
      const actual = priceData[i].lp;
      if (Math.abs(actual - expected) / expected <= 0.03) count++;
    }
    return count >= 3;
  }

  function actedAsResistanceBefore(index, price) {
    for (let i = 0; i < index; i++) {
      const prevPrice = priceData[i].lp;
      if (Math.abs(prevPrice - price) / price <= 0.05) {
        for (let j = i + 1; j < index; j++) {
          const dropPrice = priceData[j].lp;
          if ((prevPrice - dropPrice) / prevPrice >= 0.1) {
            return true;
          }
        }
      }
    }
    return false;
  }

  for (let i = 0; i < priceData.length; i++) {
    const basePrice = priceData[i].lp;

    if (
      ![...checkedSupports].some(
        (p) => Math.abs(p - basePrice) / basePrice < 0.05
      )
    ) {
      let bounceCount = 0;
      for (let j = i + 1; j < priceData.length; j++) {
        const nearSupport =
          Math.abs(priceData[j].lp - basePrice) / basePrice <= 0.05;
        if (nearSupport) {
          for (let k = j + 1; k < priceData.length; k++) {
            const bouncePrice = priceData[k].lp;
            if ((bouncePrice - priceData[j].lp) / priceData[j].lp >= 0.1) {
              if (trendLineMatch(i, 10, "support")) bounceCount++;
              break;
            }
          }
        }
      }
      const confirmed = actedAsResistanceBefore(i, basePrice);
      if (bounceCount >= 3) {
        const support = {
          zone: basePrice.toFixed(2),
          bounceCount,
          confirmedResistance: confirmed
        };
        supportZones.push(support);
        if (confirmed) confirmedZones.push(support);
        checkedSupports.add(basePrice);
      }
    }

    if (
      ![...checkedResistances].some(
        (p) => Math.abs(p - basePrice) / basePrice < 0.05
      )
    ) {
      let dropCount = 0;
      for (let j = i + 1; j < priceData.length; j++) {
        const nearResistance =
          Math.abs(priceData[j].lp - basePrice) / basePrice <= 0.05;
        if (nearResistance) {
          for (let k = j + 1; k < priceData.length; k++) {
            const dropPrice = priceData[k].lp;
            if ((priceData[j].lp - dropPrice) / priceData[j].lp >= 0.1) {
              if (trendLineMatch(i, 10, "resistance")) dropCount++;
              break;
            }
          }
        }
      }
      if (dropCount >= 3) {
        const resistance = {
          zone: basePrice.toFixed(2),
          dropCount
        };
        resistanceZones.push(resistance);
        checkedResistances.add(basePrice);
      }
    }
  }

  // Merge zones where support ≈ resistance (within 5%)
  const highlightedZones = [];
  supportZones.forEach((support) => {
    resistanceZones.forEach((resistance) => {
      const sPrice = parseFloat(support.zone);
      const rPrice = parseFloat(resistance.zone);
      if (Math.abs(sPrice - rPrice) / ((sPrice + rPrice) / 2) <= 0.05) {
        highlightedZones.push({
          zone: ((sPrice + rPrice) / 2).toFixed(2),
          support,
          resistance
        });
      }
    });
  });

  return { supportZones, resistanceZones, highlightedZones };
};
// export const findSupportLevels = (
//   data,
//   bounceThreshold = 0.1,
//   zonePercent = 0.05,
//   minTouches = 3
// ) => {
//   const zones = [];

//   for (let i = 0; i < data.length - 1; i++) {
//     const candidate = data[i].lp;
//     const lowerBound = candidate * (1 - zonePercent);
//     const upperBound = candidate * (1 + zonePercent);
//     let touches = 0;

//     for (let j = i + 1; j < data.length; j++) {
//       const lp = data[j].lp;

//       // Price comes into the zone
//       if (lp >= lowerBound && lp <= upperBound) {
//         const bounceTarget = lp * (1 + bounceThreshold);

//         for (let k = j + 1; k < data.length; k++) {
//           if (data[k].lp >= bounceTarget) {
//             touches++;
//             j = k; // Skip to after bounce
//             break;
//           }
//         }
//       }
//     }

//     if (touches >= minTouches) {
//       // Check if this zone already exists
//       const alreadyAdded = zones.some((z) => {
//         return Math.abs(z - candidate) / z < zonePercent;
//       });

//       if (!alreadyAdded) {
//         zones.push(candidate);
//       }
//     }
//   }

//   return zones.sort((a, b) => a - b);
// };
