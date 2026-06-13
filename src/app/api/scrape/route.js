import * as cheerio from "cheerio";
import { geocode, extractLocation } from "../../../lib/geocode";

export const runtime = "nodejs"; // IMPORTANT for scraping

// ---------------- CONFIG ----------------//
const SOURCES = {
  bombo: "https://news.bomboradyo.com/?s=isabela"
};

const INCIDENT_TYPES = {
  motorcycle_accident: [
    "motorcycle accident",
    "motorcycle crash",
    "motorcycle collision",
  ],

  traffic_accident: [
    "accident",
    "collision",
    "crash",
    "vehicular accident",
    "road accident",
  ],

  robbery: [
    "robbery",
    "hold-up",
    "armed robbery",
    "riding-in-tandem",
  ],

  theft: [
    "theft",
    "stolen",
    "steal",
  ],

  fire: [
    "fire",
    "blaze",
  ],

  flood: [
    "flood",
    "flash flood",
    "inundation",
  ],

  earthquake: [
    "earthquake",
    "tremor",
  ],

  landslide: [
    "landslide",
    "slope failure",
  ],
};

// ---------------- HELPERS ----------------
async function fetchHTML(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (IsabelaScraper/1.0)",
      },
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(html, base) {
  const $ = cheerio.load(html);
  const links = new Set();

  $("a[href]").each((_, el) => {
    let href = $(el).attr("href");

    if (!href) return;
    if (href.startsWith("javascript:") || href.startsWith("mailto:"))
      return;

    try {
      const url = new URL(href, base).toString();
      links.add(url.split("#")[0]);
    } catch {}
  });

  return [...links];
}

function classify(text) {
  const low = text.toLowerCase();

  let bestMatch = null;
  let highestScore = 0;

  for (const [type, keywords] of Object.entries(INCIDENT_TYPES)) {
    let score = 0;

    for (const keyword of keywords) {
      if (low.includes(keyword.toLowerCase())) {
        score++;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = type;
    }
  }

  return highestScore > 0 ? bestMatch : null;
}

function isRelevant(text) {
  const low = text.toLowerCase();

  const hasIsabela =
    low.includes("isabela") ||
    [
      "ilagan",
      "santiago",
      "cauayan",
      "tumauini",
      "alicia",
      "roxas",
      "jones",
      "san mateo",
      "echague",
    ].some((t) => low.includes(t));

  if (!hasIsabela) return false;

  const incidentWords = [
    "accident",
    "collision",
    "crash",
    "fire",
    "robbery",
    "hold-up",
    "stolen",
    "theft",
    "earthquake",
    "flood",
    "landslide",
    "injured",
    "killed",
    "died",
    "victim",
  ];

  return incidentWords.some((word) =>
    low.includes(word)
  );
}

function extractArticle(html) {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").text() ||
    null;

  const paragraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 30);

  const snippet = paragraphs[0] || null;
  const body = paragraphs.slice(0, 10).join("\n\n");

  return { title, snippet, body };
}

// ---------------- MAIN API ----------------
export async function GET() {
  const results = [];
  const seen = new Set();

  for (const [sourceName, sourceUrl] of Object.entries(SOURCES)) {
    const listHTML = await fetchHTML(sourceUrl);
    if (!listHTML) continue;

    const links = extractLinks(listHTML, sourceUrl).slice(0, 20);

    for (const link of links) {
      if (seen.has(link)) continue;
      seen.add(link);

      const html = await fetchHTML(link);
      if (!html) continue;

      const article = extractArticle(html);
      const combined =
        `${article.title || ""}\n${article.snippet || ""}\n${article.body || ""}`;

      if (!isRelevant(combined)) continue;

      const type = classify(combined);
      if (!type) continue;

      const location =
        extractLocation(article.title || "") ||
        extractLocation(article.snippet || "") ||
        extractLocation(combined);

        let geo = null;

        if (location) {
        geo = await geocode(location);
        }

      results.push({
        title: article.title,
        snippet: article.snippet,
        source_url: link,
        source_site: sourceName,
        incident_type: type,

        location,
        lat: geo?.lat ?? null,
        lon: geo?.lon ?? null,
        display_name: geo?.display_name ?? null,
        });

      if (results.length >= 50) break;
    }

    if (results.length >= 50) break;
  }

  return Response.json({
    success: true,
    count: results.length,
    data: results,
    fetched_at: new Date().toISOString(),
  });
}