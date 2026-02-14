# project-magnum4d

โปรเจกต์แบบ `data-only` สำหรับดึงผลหวยมาเลย์ `4D Classic` จาก `https://www.magnum4d.my/` แล้วอัปเดตไฟล์ `data/latest.json` อัตโนมัติผ่าน GitHub Actions โดยไม่ต้องรันเซิร์ฟเวอร์

## สิ่งที่โปรเจกต์นี้ทำ

- ดึงข้อมูล:
  - วันที่ออกผล (`drawDateText`)
  - งวด (`drawId`)
  - รางวัล `1st / 2nd / 3rd`
  - เลข `Special` 10 ตัว
  - เลข `Consolation` 10 ตัว
- บันทึกข้อมูลล่าสุดไว้ที่ `data/latest.json`
- รันอัตโนมัติด้วย GitHub Actions แล้ว commit ไฟล์กลับเข้า repo
- ให้แอปเรียกข้อมูลตรงจาก GitHub Raw URL

## ติดตั้งและรัน scrape ในเครื่อง

```bash
npm install
npm run scrape
```

## โครงสร้างข้อมูล `data/latest.json`

ตัวอย่าง response ในไฟล์:

```json
{
  "source": "https://www.magnum4d.my/",
  "fetchedAt": "2026-02-14T10:31:10.000Z",
  "drawId": "326/26",
  "drawDateText": "11 Feb 2026 (Wed)",
  "fourDClassic": {
    "firstPrize": "9674",
    "secondPrize": "9187",
    "thirdPrize": "4914",
    "special": [
      "6771",
      "8059",
      "9369",
      "6541",
      "3909",
      "8681",
      "9258",
      "9569",
      "5171",
      "0447"
    ],
    "consolation": [
      "5190",
      "0911",
      "2414",
      "2647",
      "8618",
      "3038",
      "7087",
      "0559",
      "6869",
      "8454"
    ]
  }
}
```

## วิธีเรียกข้อมูลจาก GitHub Raw URL

หลังจาก push ขึ้น GitHub แล้ว ให้แอปเรียก URL นี้:

`https://raw.githubusercontent.com/<github-username>/<repo-name>/main/data/latest.json`

ตัวอย่าง JavaScript:

```js
const url =
  "https://raw.githubusercontent.com/<github-username>/<repo-name>/main/data/latest.json";

async function getLatestMagnum4D() {
  const res = await fetch(`${url}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```

## GitHub Actions schedule

ไฟล์ workflow: `.github/workflows/scrape-magnum4d.yml`

- รันทุกวัน `พุธ / เสาร์ / อาทิตย์`
- เวลา `18:31` และ `18:45` (Malaysia time, `UTC+8`)
- ใน cron (UTC) คือ `10:31` และ `10:45`

> หมายเหตุ: GitHub Actions เวลาอาจคลาดเคลื่อนได้เล็กน้อย 1-5 นาทีตามคิวรันเนอร์

## หมายเหตุ

- เว็บไซต์ต้นทางอาจเปลี่ยนโครงสร้างได้ในอนาคต หาก parse ไม่ได้ ให้ปรับ regex ใน `src/scrape.js`
