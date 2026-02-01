import axios from "axios";

/*
async function getLocation(lat: number, lon: number): Promise<GeoPoint | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "com.codalyst.salah-reminder",
      },
    });

    const { city, town, village, country } = response.data.address;

    const cityName = city || town || village || null;

    return { lat, lon, city: cityName, country };
  } catch (e) {
    console.error("Error fetching location:", e);
    return null;
  }
}

export async function getCurrentLocation(): Promise<string | null> {
  const coords = await getCurrentCoords();
  if (!coords) return null;
  const loc = await getLocation(coords.lat, coords.lon);
  if (!loc) return null;
  return loc.city ? `${loc.city}, ${loc.country}` : loc.country;
}
*/

export async function getCurrentLocationId(): Promise<string | null> {
  try {
    const response = await axios.get("https://ipapi.co/json/");
    const { lat, lon, city, country_name } = response.data;
    return `${city}, ${country_name}`;
  } catch (e) {
    console.error("Could not fetch coordinates:", e);
    return null;
  }
}

export function getCityName(locationId: string): string {
  return locationId.split(", ")[0];
}
