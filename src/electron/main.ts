import { app, BrowserWindow, Menu, Notification } from "electron";
import path from "path";

import { isDev, SUPPORTED_LOCATIONS } from "./utils.js";
import { getAssetsPath, getPreloadPath, getUIPath } from "./path-resolver.js";
import { scheduleReminders } from "./salah-monitor.js";
import { createTray } from "./tray.js";
import { handleEvents } from "./event-handler.js";
import { getCurrentLocationId, getCityName } from "./locator.js";

app.setName("Salah Reminder");

app.setAppUserModelId("com.codealyst.salah-reminder");

Menu.setApplicationMenu(null);

app.on("ready", async () => {
  var loc = await getCurrentLocationId();

  if (!loc || !SUPPORTED_LOCATIONS.includes(loc)) {
    loc = SUPPORTED_LOCATIONS[0];
    const notification = new Notification({
      title: loc
        ? "Your current location is not supported"
        : "Could not find location",
      body: `Defaulting to ${loc}.`,
    });
    notification.show();
  }

  const mainWindow = new BrowserWindow({
    title: `Salah Reminder (${getCityName(loc)})`,
    webPreferences: {
      preload: getPreloadPath(),
    },
    width: 400,
    height: 650,
    resizable: false,
    alwaysOnTop: true,
    icon: path.join(getAssetsPath(), "icons", "icon_32.png"),
  });

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:7000");
  } else {
    mainWindow.loadFile(getUIPath());

    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath("exe"),
    });
  }

  createTray(mainWindow);

  await handleEvents(mainWindow, loc);

  await scheduleReminders(mainWindow, loc);
});
