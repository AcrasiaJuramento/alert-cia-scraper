const geoCache = new Map();

export async function geocode(query) {
  const key = query.toLowerCase();

  if (geoCache.has(key)) {
    return geoCache.get(key);
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
      encodeURIComponent(query);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "AlertCIA/1.0",
      },
    });

    const data = await res.json();

    if (!data.length) {
      geoCache.set(key, null);
      return null;
    }

    const result = {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
      display_name: data[0].display_name,
    };

    geoCache.set(key, result);

    return result;
  } catch {
    return null;
  }
}

export function extractLocation(text) {
  const towns = [
    "Ilagan",
    "Santiago",
    "Cauayan",
    "Tumauini",
    "Alicia",
    "Roxas",
    "Cabatuan",
    "Jones",
    "San Mateo",
    "Echague",
    "Ramon",
    "Naguilian",
    "San Mariano",
    "Delfin Albano",
    "Maconacon",
    "Palanan",
    "Dinapigue",
    "Cabagan",
    "Reina Mercedes",
  ];

  // First: look for known municipalities
  const lower = text.toLowerCase();

  for (const town of towns) {
    if (lower.includes(town.toLowerCase())) {
      return `${town}, Isabela, Philippines`;
    }
  }

  // Fallback regex
  const match = text.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*Isabela\b/
  );

  if (match) {
    return `${match[1]}, Isabela, Philippines`;
  }

  return null;
}