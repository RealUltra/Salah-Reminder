import { ipcMain, WebFrameMain } from "electron";
import { pathToFileURL } from "url";
import { getUIPath } from "./path-resolver.js";

export const SUPPORTED_LOCATIONS = ["Muscat, Oman", "Kelowna, Canada"];
export const LOCATION_LIBRARIES = [
  "./salah-times-muscat.js",
  "./salah-times-kelowna.js",
];

export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

export function ipcMainHandle<Key extends keyof EventPayloadMapping>(
  key: Key,
  handler: () => EventPayloadMapping[Key],
) {
  ipcMain.handle(key, (event) => {
    if (!event.senderFrame) return;
    validateEventFrame(event.senderFrame);
    return handler();
  });
}

export function validateEventFrame(frame: WebFrameMain) {
  const url = new URL(frame.url);

  if (isDev() && url.host == "localhost:7000") {
    return;
  }

  if (!isDev() && frame.url === pathToFileURL(getUIPath()).toString()) {
    return;
  }

  throw new Error("Malicious Event!");
}
