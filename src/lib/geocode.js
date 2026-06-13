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
  const clean = text.replace(/\s+/g, " ");

  // -----------------------------
  // 1. Barangay-level detection
  // -----------------------------
  const brgyMatch = clean.match(
    /\b(?:Brgy\.?|Barangay)\s*([A-Z][a-zA-Z0-9\s-]{2,40})/i
  );

  if (brgyMatch) {
    return `Barangay ${brgyMatch[1].trim()}, Isabela, Philippines`;
  }

  // -----------------------------
  // 2. Purok / Sitio detection
  // -----------------------------
  const purokMatch = clean.match(
    /\b(?:Purok|Sitio)\s*([A-Z0-9][a-zA-Z0-9\s-]{1,40})/i
  );

  if (purokMatch) {
    return `${purokMatch[0].trim()}, Isabela, Philippines`;
  }

  // -----------------------------
  // 3. Municipality detection (BEST SIGNAL)
  // -----------------------------
  const municipalities = [
    "Ilagan",
    "Santiago",
    "Cauayan",
    "Jones",
    "San Mateo",
    "Tumauini",
    "Alicia",
    "Roxas",
    "Echague",
    "Cabatuan",
    "Ramon",
    "Reina Mercedes",
    "San Mariano",
    "Delfin Albano",
    "Naguilian",
    "Gamu",
  ];

  const lower = clean.toLowerCase();

  for (const m of municipalities) {
    if (lower.includes(m.toLowerCase())) {
      return `${m}, Isabela, Philippines`;
    }
  }

  // -----------------------------
  // 4. "in/at/near" pattern fallback
  // -----------------------------
  const phraseMatch = clean.match(
    /\b(?:in|at|near|along|within)\s+([A-Z][a-zA-Z\s]{2,40}),?\s*Isabela/i
  );

  if (phraseMatch) {
    return `${phraseMatch[1].trim()}, Isabela, Philippines`;
  }

  return null;
}