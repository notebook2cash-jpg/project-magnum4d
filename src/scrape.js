const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

const SOURCE_URL = "https://www.magnum4d.my/";
const RESULTS_API = "https://www.magnum4d.my/results/latest";
const OUTPUT_PATH = path.join(__dirname, "..", "data", "latest.json");

const MONTH_EN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_TH_SHORT = {
  Jan: "ม.ค.",
  Feb: "ก.พ.",
  Mar: "มี.ค.",
  Apr: "เม.ย.",
  May: "พ.ค.",
  Jun: "มิ.ย.",
  Jul: "ก.ค.",
  Aug: "ส.ค.",
  Sep: "ก.ย.",
  Oct: "ต.ค.",
  Nov: "พ.ย.",
  Dec: "ธ.ค.",
};

const DAY_TH_FULL = {
  MON: "จันทร์",
  TUE: "อังคาร",
  WED: "พุธ",
  THU: "พฤหัสบดี",
  FRI: "ศุกร์",
  SAT: "เสาร์",
  SUN: "อาทิตย์",
};

function toTitleCase(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function parseDrawDate(drawDateRaw, drawDayRaw) {
  const match = (drawDateRaw || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`รูปแบบ DrawDate ไม่ถูกต้อง: ${drawDateRaw}`);
  }

  const day = match[1];
  const monthIndex = Number(match[2]) - 1;
  const year = Number(match[3]);

  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`เดือนใน DrawDate ไม่ถูกต้อง: ${drawDateRaw}`);
  }

  const monthEn = MONTH_EN_SHORT[monthIndex];
  const monthTh = MONTH_TH_SHORT[monthEn];
  const dayKey = (drawDayRaw || "").toUpperCase();
  const dayEn = toTitleCase(drawDayRaw || "");
  const dayTh = DAY_TH_FULL[dayKey] || dayEn;

  return {
    drawDateText: `${Number(day)} ${monthEn} ${year} (${dayEn})`,
    drawDateTextTh: `${Number(day)} ${monthTh} ${year + 543} (${dayTh})`,
  };
}

function pickNumbers(record, prefix, count) {
  const result = [];
  for (let i = 1; i <= count; i++) {
    const value = record[`${prefix}${i}`];
    if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
      throw new Error(
        `ข้อมูล ${prefix}${i} ไม่ถูกต้อง: ${value === undefined ? "ไม่มีฟิลด์" : value}`
      );
    }
    result.push(value);
  }
  return result;
}

function buildClassicResult(record) {
  for (const key of ["FirstPrize", "SecondPrize", "ThirdPrize"]) {
    if (typeof record[key] !== "string" || !/^\d{4}$/.test(record[key])) {
      throw new Error(`ข้อมูล ${key} ไม่ถูกต้อง: ${record[key]}`);
    }
  }

  return {
    firstPrize: record.FirstPrize,
    secondPrize: record.SecondPrize,
    thirdPrize: record.ThirdPrize,
    special: pickNumbers(record, "Special", 10),
    consolation: pickNumbers(record, "Console", 10),
  };
}

async function fetchLatestResult() {
  const response = await axios.get(RESULTS_API, {
    timeout: 30000,
    headers: {
      "User-Agent": "magnum4d-classic-bot/1.0",
      Accept: "application/json, text/plain, */*",
      Referer: SOURCE_URL,
    },
  });

  const payload = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!payload || typeof payload !== "object") {
    throw new Error("ไม่ได้รับข้อมูลจาก /results/latest");
  }

  if (!payload.DrawID || !payload.DrawDate) {
    throw new Error("ข้อมูลจาก /results/latest ไม่มี DrawID หรือ DrawDate");
  }

  const { drawDateText, drawDateTextTh } = parseDrawDate(payload.DrawDate, payload.DrawDay);
  const fourDClassic = buildClassicResult(payload);

  return {
    source: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    drawId: payload.DrawID,
    drawDateText,
    drawDateTextTh,
    fourDClassic,
  };
}

async function saveLatestResult(result) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2) + "\n", "utf8");
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
