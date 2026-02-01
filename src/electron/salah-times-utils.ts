export const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function getIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSalahEndTime(
  payload: SalahTimesPayload,
  salahName: SalahName,
): Date {
  switch (salahName) {
    case "fajr": {
      return payload.today.sunrise;
    }

    case "dhuhr": {
      return payload.today.asr.adhaanTime;
    }

    case "asr": {
      return payload.today.maghrib.adhaanTime;
    }

    case "maghrib": {
      return payload.today.ishaa.adhaanTime;
    }

    case "ishaa": {
      return payload.tomorrow.fajr.adhaanTime;
    }
  }
}

export function formatTime(date: Date, includeSeconds: boolean = false) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}` + (includeSeconds ? `:${seconds}` : "");
}
