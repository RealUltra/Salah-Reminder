import axios from "axios";
import * as cheerio from "cheerio";
import { MONTH_NAMES, getIsoDate } from "./salah-times-utils.js";

type MultipleSalahTimes = Record<string, SalahTimes>;

async function getSalahTimesForMonth(
  year: number | null = null,
  monthNum: number | null = null,
): Promise<MultipleSalahTimes | null> {
  const now = new Date(Date.now());

  monthNum ??= now.getMonth() + 1;
  year ??= now.getFullYear();

  try {
    const url = `https://prayer-times.muslimpro.com/en/Prayer-times-adhan-Muscat-Oman-287286?date=${year}-${monthNum}`;
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const displayMonth: string = $(".display-month").text();

    const rows = $("table.prayer-times > tbody > tr");

    const monthSalahTimes: MultipleSalahTimes = {};

    rows.each((_, element) => {
      const columns = $(element).find("td");

      if (columns.length !== 7) return;

      const rawDate: string = $(columns[0]).text();
      const rawFajrTime: string = $(columns[1]).text();
      const rawSunriseTime: string = $(columns[2]).text();
      const rawDhuhrTime: string = $(columns[3]).text();
      const rawAsrTime: string = $(columns[4]).text();
      const rawMaghribTime: string = $(columns[5]).text();
      const rawIshaaTime: string = $(columns[6]).text();

      const date = parseDate(rawDate, displayMonth);
      const fajrTime = parseTime(rawFajrTime, date!);
      const sunriseTime = parseTime(rawSunriseTime, date!);
      const dhuhrTime = parseTime(rawDhuhrTime, date!);
      const asrTime = parseTime(rawAsrTime, date!);
      const maghribTime = parseTime(rawMaghribTime, date!);
      const ishaaTime = parseTime(rawIshaaTime, date!);

      if (
        !(
          date &&
          fajrTime &&
          sunriseTime &&
          dhuhrTime &&
          asrTime &&
          maghribTime &&
          ishaaTime
        )
      ) {
        throw new Error("Could not fetch all the data!");
      }

      const salahTimes: SalahTimes = {
        fajr: {
          name: "fajr",
          adhaanTime: fajrTime,
          iqamahTime: getIqamahTime("fajr", fajrTime),
        },
        sunrise: sunriseTime,
        dhuhr: {
          name: "dhuhr",
          adhaanTime: dhuhrTime,
          iqamahTime: getIqamahTime("dhuhr", dhuhrTime),
        },
        asr: {
          name: "asr",
          adhaanTime: asrTime,
          iqamahTime: getIqamahTime("asr", asrTime),
        },
        maghrib: {
          name: "maghrib",
          adhaanTime: maghribTime,
          iqamahTime: getIqamahTime("maghrib", maghribTime),
        },
        ishaa: {
          name: "ishaa",
          adhaanTime: ishaaTime,
          iqamahTime: getIqamahTime("ishaa", ishaaTime),
        },
      };

      const isoDate = getIsoDate(date!);

      monthSalahTimes[isoDate] = salahTimes;
    });

    return monthSalahTimes;
  } catch (error) {
    console.error("Error in getSalahTimesForMonth:", error);
    return null;
  }
}

export async function getSalahTimesForDates(
  ...dates: Date[]
): Promise<MultipleSalahTimes | null> {
  const fetchedSalahTimes: Map<[number, number], MultipleSalahTimes> =
    new Map();

  const results: MultipleSalahTimes = {};

  for (const date of dates) {
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const key: [number, number] = [monthIndex, year];

    if (!fetchedSalahTimes.has(key)) {
      const monthSalahTimes = await getSalahTimesForMonth(monthIndex, year);
      if (!monthSalahTimes) return null;
      fetchedSalahTimes.set(key, monthSalahTimes);
    }

    const monthSalahTimes = fetchedSalahTimes.get(key)!;
    const isoDate = getIsoDate(date);
    results[isoDate] = monthSalahTimes[isoDate];
  }

  return results;
}

function getIqamahTime(salahName: SalahName, salahTime: Date): Date {
  const iqamahTime = new Date(salahTime);

  switch (salahName) {
    case "fajr": {
      iqamahTime.setMinutes(iqamahTime.getMinutes() + 25);
      return iqamahTime;
    }
    case "dhuhr": {
      iqamahTime.setMinutes(iqamahTime.getMinutes() + 15);
      return iqamahTime;
    }
    case "asr": {
      iqamahTime.setMinutes(iqamahTime.getMinutes() + 20);
      return iqamahTime;
    }
    case "maghrib": {
      iqamahTime.setMinutes(iqamahTime.getMinutes() + 5);
      return iqamahTime;
    }
    case "ishaa": {
      iqamahTime.setMinutes(iqamahTime.getMinutes() + 20);
      return iqamahTime;
    }
  }
}

export async function getSalahTimesPayload(): Promise<SalahTimesPayload | null> {
  const yesterday = new Date(Date.now());
  const today = new Date(Date.now());
  const tomorrow = new Date(Date.now());

  yesterday.setDate(today.getDate() - 1);
  tomorrow.setDate(today.getDate() + 1);

  const requiredSalahTimes = await getSalahTimesForDates(
    yesterday,
    today,
    tomorrow,
  );

  if (!requiredSalahTimes) {
    return null;
  }

  const yesterdaySalahTimes = requiredSalahTimes[getIsoDate(yesterday)];
  const todaySalahTimes = requiredSalahTimes[getIsoDate(today)];
  const tomorrowSalahTimes = requiredSalahTimes[getIsoDate(tomorrow)];

  return {
    yesterday: yesterdaySalahTimes,
    today: todaySalahTimes,
    tomorrow: tomorrowSalahTimes,
  };
}

function parseDate(rawDate: string, displayMonth: string): Date | null {
  const match = rawDate.match(/\d+/);

  if (!match) return null;

  const dayNum = parseInt(match[0]);

  const parts = displayMonth.trim().split(" ");

  if (parts.length !== 2) return null;

  const [monthName, yearStr] = parts;

  const monthIndex = MONTH_NAMES.indexOf(monthName.toLowerCase());

  if (monthIndex === -1) return null;

  const year = parseInt(yearStr);

  return new Date(year, monthIndex, dayNum);
}

function parseTime(rawTime: string, date: Date): Date | null {
  const match = rawTime.match(/(\d{1,2})\:(\d{1,2})/);

  if (!match) return null;

  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
  );
}
