export const findSupportLevels = (
  data,
  bounceThreshold = 0.1,
  zonePercent = 0.05,
  minTouches = 3
) => {
  const zones = [];

  for (let i = 0; i < data.length - 1; i++) {
    const candidate = data[i].lp;
    const lowerBound = candidate * (1 - zonePercent);
    const upperBound = candidate * (1 + zonePercent);
    let touches = 0;

    for (let j = i + 1; j < data.length; j++) {
      const lp = data[j].lp;

      // Price comes into the zone
      if (lp >= lowerBound && lp <= upperBound) {
        const bounceTarget = lp * (1 + bounceThreshold);

        for (let k = j + 1; k < data.length; k++) {
          if (data[k].lp >= bounceTarget) {
            touches++;
            j = k; // Skip to after bounce
            break;
          }
        }
      }
    }

    if (touches >= minTouches) {
      // Check if this zone already exists
      const alreadyAdded = zones.some((z) => {
        return Math.abs(z - candidate) / z < zonePercent;
      });

      if (!alreadyAdded) {
        zones.push(candidate);
      }
    }
  }

  return zones.sort((a, b) => a - b);
};
