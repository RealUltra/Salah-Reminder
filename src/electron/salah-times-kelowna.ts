import axios from "axios";
import { getIsoDate } from "./salah-times-utils.js";

async function getSalahTimesForDate(date: Date): Promise<SalahTimes | null> {
  // https://org.thebcma.com/api/Prayertimes/GetPrayertimeByDate?organizationId=7&dt=2026-04-03

  /*
  {
    '$id': '1',
    id: 6300,
    prayerDate: '04/04/2022',
    fajr: '04:34 AM',
    fajrIqama: '5:45:00 AM',
    sunrise: '06:29 AM',
    zawal: '',
    duhr: '1:10:00 PM',
    duhrIqama: '1:30:00 PM',
    asr: '05:33 PM',
    asrIqama: '5:45:00 PM',
    maghreb: '7:38:00 PM',
    maghrebIqama: '',
    isha: '09:08 PM',
    ishaIqama: '9:20:00 PM',
    organizationID: 7,
    calendarDate: '2026-04-04T00:00:00',
    firstJumma: '1:30:00 PM',
    secondJumma: '',
    traveeh: '',
    disclaimer: null,
    cacheKey: 'Prayertime_7_4/4/2026 12:00:00 AM'
  }
  */

  try {
    const dateStr = getIsoDate(date);
    const url = `https://org.thebcma.com/api/Prayertimes/GetPrayertimeByDate?organizationId=7&dt=${dateStr}`;

    const { data } = await axios.get(url);

    if (!data) return null;

    const salahTimes: SalahTimes = {
      fajr: {
        name: "fajr",
        adhaanTime: parseTime(data.fajr, date)!,
        iqamahTime: parseTime(data.fajrIqama || data.fajr, date)!,
      },

      sunrise: parseTime(data.sunrise, date)!,

      dhuhr: {
        name: "dhuhr",
        adhaanTime: parseTime(data.duhr, date)!,
        iqamahTime: parseTime(data.duhrIqama || data.duhr, date)!,
      },

      asr: {
        name: "asr",
        adhaanTime: parseTime(data.asr, date)!,
        iqamahTime: parseTime(data.asrIqama || data.asr, date)!,
      },

      maghrib: {
        name: "maghrib",
        adhaanTime: parseTime(data.maghreb, date)!,
        iqamahTime: parseTime(data.maghrebIqama || data.maghreb, date)!,
      },

      ishaa: {
        name: "ishaa",
        adhaanTime: parseTime(data.isha, date)!,
        iqamahTime: parseTime(data.ishaIqama || data.isha, date)!,
      },
    };

    return salahTimes;
  } catch (e) {
    console.error("Error in getSalahTimesForDate:", e);
    return null;
  }
}

export async function getSalahTimesPayload(): Promise<SalahTimesPayload | null> {
  const today = new Date();
  const yesterday = new Date(today);
  const tomorrow = new Date(today);

  yesterday.setDate(yesterday.getDate() - 1);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySalahTimes = await getSalahTimesForDate(today);
  //const todaySalahTimes = null;
  const yesterdaySalahTimes = await getSalahTimesForDate(yesterday);
  const tomorrowSalahTimes = await getSalahTimesForDate(tomorrow);

  if (!todaySalahTimes || !yesterdaySalahTimes || !tomorrowSalahTimes) {
    return null;
  }

  return {
    yesterday: yesterdaySalahTimes,
    today: todaySalahTimes,
    tomorrow: tomorrowSalahTimes,
  };
}

function parseTime(rawTime: string, date: Date): Date | null {
  const match = rawTime.match(/(\d{1,2})\:(\d{1,2})(:(\d{1,2}))? (AM|PM)/);

  if (!match) return null;

  var hours = parseInt(match[1]);
  var minutes = parseInt(match[2]);
  var seconds = match[3] ? parseInt(match[4]) : 0;

  const meridiem = match[5];

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
