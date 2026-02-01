import axios from "axios";
import * as cheerio from "cheerio";
import { MONTH_NAMES } from "./salah-times-utils.js";

async function getSalahTimesForToday(): Promise<SalahTimes | null> {
  try {
    const url = "https://org.thebcma.com/kelowna";
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const [table] = $("table.table");

    const thead = $(table).find("thead");
    const displayDate = $(thead).find("th").first().text();
    const date = parseDisplayDate(displayDate);

    if (date === null) return null;

    const tbody = $(table).find("tbody");
    const rows = tbody.find("tr");

    const salahTimesMap = new Map<string, Salah | Date | null>([
      ["fajr", null],
      ["sunrise", null],
      ["dhuhr", null],
      ["asr", null],
      ["maghrib", null],
      ["ishaa", null],
    ]);

    rows.each((_, element) => {
      const columns = $(element).find("td");

      if (columns.length !== 3) return;

      const rawSalahName = $(columns[0]).text();
      const rawAdhaanTime = $(columns[1]).text();
      const rawIqamahTime = $(columns[2]).text().trim();

      const salahName = parseSalahName(rawSalahName, isFriday(date));
      const adhaanTime = parseTime(rawAdhaanTime, date)!;

      if (salahName === "sunrise") {
        salahTimesMap.set(salahName, adhaanTime);
      } else if (salahName) {
        const iqamahTime =
          parseTime(rawIqamahTime, date) ??
          getIqamahTime(salahName as "dhuhr" | "maghrib", adhaanTime);

        const salah: Salah = {
          name: salahName as SalahName,
          adhaanTime: adhaanTime,
          iqamahTime: iqamahTime,
        };

        salahTimesMap.set(salahName, salah);
      }
    });

    const salahTimes: SalahTimes = {
      fajr: salahTimesMap.get("fajr") as Salah,
      sunrise: salahTimesMap.get("sunrise") as Date,
      dhuhr: salahTimesMap.get("dhuhr") as Salah,
      asr: salahTimesMap.get("asr") as Salah,
      maghrib: salahTimesMap.get("maghrib") as Salah,
      ishaa: salahTimesMap.get("ishaa") as Salah,
    };

    return salahTimes;
  } catch (e) {
    console.error("Error in getSalahTimesForToday:", e);
    return null;
  }
}

export async function getSalahTimesPayload(): Promise<SalahTimesPayload | null> {
  const todaySalahTimes = await getSalahTimesForToday();

  if (!todaySalahTimes) return null;

  const yesterdaySalahTimes: SalahTimes = structuredClone(todaySalahTimes);
  const tomorrowSalahTimes: SalahTimes = structuredClone(todaySalahTimes);

  for (const [key, value] of Object.entries(yesterdaySalahTimes)) {
    if (key === "sunrise") {
      value.setDate(value.getDate() - 1);
    } else {
      value.adhaanTime.setDate(value.adhaanTime.getDate() - 1);
      value.iqamahTime.setDate(value.iqamahTime.getDate() - 1);
    }
  }

  for (const [key, value] of Object.entries(tomorrowSalahTimes)) {
    if (key === "sunrise") {
      value.setDate(value.getDate() + 1);
    } else {
      value.adhaanTime.setDate(value.adhaanTime.getDate() + 1);
      value.iqamahTime.setDate(value.iqamahTime.getDate() + 1);
    }
  }

  return {
    yesterday: yesterdaySalahTimes,
    today: todaySalahTimes,
    tomorrow: tomorrowSalahTimes,
  };
}

function parseDisplayDate(rawDate: string): Date | null {
  const match = rawDate.match(/(\w+) (\d{1,2})\, (\d{4})/);

  if (!match) return null;

  const monthName = match[1];
  const dayNum = parseInt(match[2]);
  const year = parseInt(match[3]);

  const monthIndex = MONTH_NAMES.indexOf(monthName.toLowerCase());

  if (monthIndex === -1) return null;

  return new Date(year, monthIndex, dayNum);
}

function parseTime(rawTime: string, date: Date): Date | null {
  const match = rawTime.match(/(\d{1,2})\:(\d{1,2})\:(\d{1,2}) (AM|PM)/);

  if (!match) return null;

  var hours = parseInt(match[1]);
  var minutes = parseInt(match[2]);
  var seconds = parseInt(match[3]);
  const meridiem = match[4];

  if (meridiem === "AM") {
    if (hours === 12) {
      hours = 0;
    }
  } else {
    if (hours !== 12) {
      hours += 12;
    }
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
  );
}

function parseSalahName(
  rawSalahName: string,
  jummah: boolean = false,
): string | null {
  const SALAH_NAMES = {
    fajr: "fajr",
    sunrise: "sunrise",
    dhur: "dhuhr",
    asr: "asr",
    magreb: "maghrib",
    isha: "ishaa",
    jummah: "jummah",
  };

  rawSalahName = rawSalahName.toLowerCase().trim();

  if (!(rawSalahName in SALAH_NAMES)) return null;

  var salahName = SALAH_NAMES[rawSalahName as keyof typeof SALAH_NAMES];

  if (salahName === "dhuhr") {
    return jummah ? null : salahName;
  }

  if (salahName === "jummah") {
    return jummah ? "dhuhr" : null;
  }

  return salahName;
}

function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

function getIqamahTime(salahName: "dhuhr" | "maghrib", salahTime: Date): Date {
  return salahTime;
}
