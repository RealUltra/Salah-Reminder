import { BrowserWindow, nativeImage, NativeImage, Tray } from "electron";
import path from "path";

import { getAssetsPath } from "./path-resolver.js";

export function createTray(mainWindow: BrowserWindow): Tray {
  const trayIcon = getTrayIcon();

  const tray = new Tray(trayIcon);

  tray.setToolTip("Salah Reminder");

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

function getTrayIcon(): NativeImage {
  const sizes = [16, 22, 32, 48, 1024];

  const iconPaths = sizes.map((s) =>
    path.join(getAssetsPath(), "icons", `icon_${s}.png`),
  );
  const images = iconPaths.map((p) => nativeImage.createFromPath(p));

  const appIcon = images[0];

  for (let i = 1; i < sizes.length; i++) {
    appIcon.addRepresentation({
      scaleFactor: sizes[i] / sizes[0],
      buffer: images[i].toPNG(),
    });
  }

  return appIcon;
}
