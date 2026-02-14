const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE_URL = "https://www.magnum4d.my/";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "latest.json");

function parseDrawMeta(pageText) {
  const drawMatch = pageText.match(
    /Draw Results\s*([0-9/]+)\s*:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4}\s+\([A-Za-z]{3}\))/i
  );

  if (!drawMatch) {
    throw new Error("ไม่พบ Draw ID/Draw Date บนหน้าเว็บ");
  }

  return {
    drawId: drawMatch[1],
    drawDateText: drawMatch[2],
  };
}

function parseFourDClassic(pageText) {
  const sectionMatch = pageText.match(
    /4D Classic[\s\S]*?Tap a number to see its meaning\.[\s\S]*?1st prize\s*(\d{4})[\s\S]*?2nd Prize\s*(\d{4})[\s\S]*?3rd Prize\s*(\d{4})[\s\S]*?Special([\s\S]*?)Consolation([\s\S]*?)(?:4d jackpot|4D Jackpot)/i
  );

  if (!sectionMatch) {
    throw new Error("ไม่พบ section ของ 4D Classic ในหน้าเว็บ");
  }

  const special = (sectionMatch[4].match(/\b\d{4}\b/g) || []).slice(0, 10);
  const consolation = (sectionMatch[5].match(/\b\d{4}\b/g) || []).slice(0, 10);

  if (special.length < 10 || consolation.length < 10) {
    throw new Error("อ่านเลข Special/Consolation ได้ไม่ครบ 10 ตัว");
  }

  return {
    firstPrize: sectionMatch[1],
    secondPrize: sectionMatch[2],
    thirdPrize: sectionMatch[3],
    special,
    consolation,
  };
}

async function fetchLatestResult() {
  const response = await axios.get(SOURCE_URL, {
    timeout: 30000,
    headers: {
      "User-Agent": "magnum4d-classic-bot/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const $ = cheerio.load(response.data);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const drawMeta = parseDrawMeta(text);
  const classicResult = parseFourDClassic(text);

  return {
    source: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    drawId: drawMeta.drawId,
    drawDateText: drawMeta.drawDateText,
    fourDClassic: classicResult,
  };
}

async function saveLatestResult(result) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");
}

async function run() {
  const result = await fetchLatestResult();
  await saveLatestResult(result);
  return result;
}

if (require.main === module) {
  run()
    .then((result) => {
      console.log("Scrape success:");
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error("Scrape failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  fetchLatestResult,
  saveLatestResult,
  run,
  OUTPUT_PATH,
};
