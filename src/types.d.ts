declare module "*";

interface SalahTimes {
  fajr: Salah;
  sunrise: Date;
  dhuhr: Salah;
  asr: Salah;
  maghrib: Salah;
  ishaa: Salah;
}

type SalahName = "fajr" | "dhuhr" | "asr" | "maghrib" | "ishaa";

interface Salah {
  name: SalahName;
  adhaanTime: Date;
  iqamahTime: Date;
}

interface SalahTimesPayload {
  yesterday: SalahTimes;
  today: SalahTimes;
  tomorrow: SalahTimes;
}

interface EventPayloadMapping {
  getSalahTimes: Promise<SalahTimesPayload | null>;
}

interface Window {
  electron: {
    getSalahTimes: () => Promise<SalahTimesPayload | null>;
  };
}

interface GeoPoint {
  city: string | null;
  country: string;
}

type SalahTimesPayloadFunction = () => Promise<SalahTimesPayload | null>