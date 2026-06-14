import { scrapeBombo } from "@/scrapers/scraper";
import { getCachedData, saveCache } from "@/lib/cache";

export const runtime = "nodejs";

function isVehicular(text) {
  const low = text.toLowerCase();

  return [
    "motorcycle accident",
    "motorcycle crash",
    "vehicular accident",
    "road accident",
    "car crash",
    "truck accident",
    "collision",
    "crash",
    "overturned",
    "ran over",
  ].some((w) => low.includes(w));
}

export async function GET() {
  // 1. CHECK CACHE FIRST
  const cached = getCachedData();

  if (cached?.vehicular) {
    return Response.json({
      success: true,
      cached: true,
      type: "vehicular",
      count: cached.vehicular.length,
      data: cached.vehicular,
    });
  }

  // 2. SCRAPE ONLY IF NO CACHE
  const data = await scrapeBombo();

  // 3. FILTER VEHICULAR
  const vehicular = data.filter((item) =>
    isVehicular(`${item.title} ${item.snippet}`)
  );

  // 4. ALSO BUILD INCIDENTS (so cache stays complete)
  const incidents = data;

  // 5. SAVE BOTH INTO JSON CACHE
  saveCache({
    vehicular
  });

  // 6. RETURN RESPONSE
  return Response.json({
    success: true,
    cached: false,
    type: "vehicular",
    count: vehicular.length,
    data: vehicular,
    fetched_at: new Date().toISOString(),
  });
}