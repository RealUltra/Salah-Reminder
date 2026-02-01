import { app, BrowserWindow, dialog } from "electron";
import { ipcMainHandle } from "./utils.js";
import { getSalahTimesPayloadFunction } from "./salah-times-utils.js";

var getSalahTimesPayload: SalahTimesPayloadFunction;

export async function handleEvents(
  mainWindow: BrowserWindow,
  locationId: string,
) {
  getSalahTimesPayload = await getSalahTimesPayloadFunction(locationId);
  mainWindow.on("minimize", () => mainWindow.hide());
  handleCloseEvent(mainWindow);
  ipcMainHandle("getSalahTimes", () => getSalahTimesPayload());
}

function handleCloseEvent(mainWindow: BrowserWindow) {
  let isQuitting = false;

  mainWindow.on("close", async (e) => {
    if (isQuitting) {
      return;
    }

    e.preventDefault();

    const options = {
      buttons: ["Yes", "No"],
      title: "Confirm",
      message: "Are you sure you want to close the app?",
      detail: "Press Yes to continue and No to cancel.",
    };

    const result = await dialog.showMessageBox(mainWindow, options);
    const yes = result.response === 0;

    if (yes) {
      isQuitting = true;
      app.quit();
    }
  });
}
