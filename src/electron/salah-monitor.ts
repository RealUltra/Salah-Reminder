import { BrowserWindow, dialog, Notification } from "electron";
import { formatTime, getSalahEndTime } from "./salah-times-utils.js";
import { getSalahTimesPayloadFunction } from "./salah-times-utils.js";

// We will load the appropriate function here based on the location
var getSalahTimesPayload: SalahTimesPayloadFunction;

const IQAMAH_REMINDER_INTERVALS: number[] = [25, 20, 15, 10, 5]; // in minutes
const SALAH_END_REMINDER_INTERVALS: number[] = [60, 45, 30, 25, 20, 15, 10, 5]; // in minutes

// When the app starts up, if there is a prayer that is approaching the end of its time, remind me of it.
// Remind me 25, 20, 15, 10 & 5 minutes before iqamah.
// If the 25 minute mark has been exceeded, a reminder should be sent immediately.
// We must keep track of the current prayer. This is because a reminder for fajr should not be sent at asr time. Similarly, in the case of maghrib, a reminder for asr should not be sent within the 25 minutes before maghrib iqamaah as the reminders being sent will be for maghrib.
// After the iqamah has ended, reminders must be sent at 60, 45, 30, 25, 20, 15, 10, 5 minutes before salah time ends.
// We must keep track of if the user has already prayed to stop reminding.

/*
> How to get current salah?
- Loop backwards from ishaa time. Check which adhaan has happened. For example, if it is past ishaa but before 12am, ishaa will be selected.
- If no prayer is selected, it is yesterday's ishaa time.
- Then, we check if we are still within the selected prayer's time frame. If not, the current prayer is null. For example, time for fajr does not last until dhuhr, only until sunrise.

> 

*/

// Sometimes, reminders will be sent for the next prayer instead of the current prayer.
// For example: 25 minutes before Maghrib, it is Asr time, but a Maghrib reminder will be sent.
// This interface is used to store info about the current salah by `getCurrentSalahInfo`.
// This info will be parsed by `getCurrentReminder` to determine whether to remind the user of the current prayer or the next one.
interface SalahReminderInfo {
  salah: Salah;
  endTime: Date;
  next: Salah;
}

interface Reminder {
  salah: Salah;
  deadline: Date; // If forIqamah is true, this is the iqamah time. Otherwise, this is the salah end time.
  forIqamah: boolean; // false if the iqamah has happened, true if it is still going to happen.
  current: boolean; // Whether the reminder is for right now, or for later.
}

interface SalahRecord {
  salah: Salah | null; // Last handled salah. Could be the current.
  prayed: boolean; // Whether the user prayed or not.
}

const userRecord: SalahRecord = { salah: null, prayed: false };

/* Call the first remind() and get the infinite chain of scheduled reminders started. */
export async function scheduleReminders(
  mainWindow: BrowserWindow,
  locationId: string,
) {
  getSalahTimesPayload = await getSalahTimesPayloadFunction(locationId);
  const payload = await waitForSalahTimesPayload();
  remind(payload, mainWindow);
}

/* Use getSalahTimesPayload() repeatedly until you get the payload, in case the WiFi is down. */
async function waitForSalahTimesPayload(): Promise<SalahTimesPayload> {
  let payload = null;

  while (!payload) {
    payload = await getSalahTimesPayload();

    if (!payload) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return payload;
}

/* Figure out what salah's time we are currently in i.e it was the last adhaan that happened and there is still time to pray. */
function getCurrentSalahInfo(
  payload: SalahTimesPayload,
): SalahReminderInfo | null {
  const salahNames: SalahName[] = ["ishaa", "maghrib", "asr", "dhuhr", "fajr"];

  const now = Date.now();

  for (const salahName of salahNames) {
    const salah = payload.today[salahName];
    const endTime = getSalahEndTime(payload, salahName);
    let nextSalah: Salah;

    if (salahName !== "ishaa") {
      const nextSalahName = salahNames[salahNames.indexOf(salahName) - 1];
      nextSalah = payload.today[nextSalahName];
    } else {
      nextSalah = payload.tomorrow.fajr;
    }

    if (now > salah.adhaanTime.getTime()) {
      if (now < endTime.getTime()) {
        return { salah, endTime, next: nextSalah };
      } else {
        return null;
      }
    }
  }

  return {
    salah: payload.yesterday.ishaa,
    endTime: payload.today.fajr.adhaanTime,
    next: payload.today.fajr,
  };
}

/* Determine what salah to remind the user of at this current time. */
function getCurrentReminder(payload: SalahTimesPayload): Reminder {
  const now = Date.now();

  const currentSalahInfo = getCurrentSalahInfo(payload);

  // The time between sunrise and dhuhr has no salah, so no reminders.
  if (!currentSalahInfo) {
    return {
      salah: payload.today.dhuhr,
      deadline: payload.today.dhuhr.iqamahTime,
      forIqamah: true,
      current: false,
    };
  }

  const current = currentSalahInfo.salah;
  const next = currentSalahInfo.next;
  const maxInterval = Math.max(...IQAMAH_REMINDER_INTERVALS) * 60 * 1000;

  // If the adhaan for the next salah has not happened but it is within the range of reminders.
  if (now > next.iqamahTime.getTime() - maxInterval) {
    return {
      salah: next,
      deadline: next.iqamahTime,
      forIqamah: true,
      current: true,
    };
  }

  // If the iqamah hasn't happened yet, remind the user of it.
  if (now < current.iqamahTime.getTime()) {
    return {
      salah: current,
      deadline: current.iqamahTime,
      forIqamah: true,
      current: true,
    };
  }

  // If the iqamah is already past but the salah's time has not ended, remind the user to pray.
  return {
    salah: current,
    deadline: currentSalahInfo.endTime,
    forIqamah: false,
    current: true,
  };
}

/* Determines whether the user must be reminded of this salah i.e have they already prayed? */
function hasPrayed(salah: Salah) {
  if (userRecord.salah === null) {
    return false;
  }

  if (userRecord.salah !== salah) {
    return false;
  }

  return userRecord.prayed;
}

/* Get the time left before the deadline of a reminder is reached. */
function getTimeLeft(reminder: Reminder) {
  return reminder.deadline.getTime() - Date.now();
}

/* Make the messagebox for the reminder appear. Send the appropriate notification. */
async function sendReminder(reminder: Reminder, mainWindow: BrowserWindow) {
  let salahName: string;

  if (reminder.salah.name === "ishaa") {
    salahName = "Isha'a";
  } else {
    salahName =
      reminder.salah.name[0].toUpperCase() + reminder.salah.name.substring(1);
  }

  const timeLeft = getTimeLeft(reminder);
  const minutesLeft = Math.round(timeLeft / 1000 / 60);
  const deadlineStr = formatTime(reminder.deadline);

  const title = `${reminder.forIqamah ? "Iqamah" : "Salah"} Reminder`;
  const message = reminder.forIqamah
    ? `${salahName} Iqamah happens in ${minutesLeft} minutes at ${deadlineStr}`
    : `${salahName} time ends in ${minutesLeft} minutes at ${deadlineStr}!`;
  const detail = reminder.forIqamah
    ? "Are you going to the mosque?"
    : "Have you prayed?";

  const options = {
    buttons: ["Yes", "No"],
    title: title,
    message: message,
    detail: detail,
  };

  const result = await dialog.showMessageBox(mainWindow, options);
  const yes = result.response === 0;

  if (yes && reminder.salah === userRecord.salah) {
    userRecord.prayed = true;
  }

  // Send a notification based on the response
  const yesNotif = {
    title: `You prayed ${salahName}!`,
    body: `Mashallah Brother! ${
      reminder.forIqamah
        ? "You went to the mosque!"
        : "Try to go to the mosque next time."
    }`,
  };

  const noNotif = {
    title: `${salahName} BRO!!!`,
    body: "Astaghfirullah Brother, repent.",
  };

  const notification = new Notification(yes ? yesNotif : noNotif);
  notification.show();
}

/* The reminder is sent and the next one is scheduled. */
async function remind(payload: SalahTimesPayload, mainWindow: BrowserWindow) {
  // Check if the payload needs to be refreshed
  const now = Date.now();

  if (now > payload.tomorrow.fajr.adhaanTime.getTime()) {
    console.log("Payload expired. Refreshing the payload.");
    payload = await waitForSalahTimesPayload();
  }
  //

  const reminder = getCurrentReminder(payload);

  // Remind the user
  if (reminder.current && !hasPrayed(reminder.salah)) {
    userRecord.salah = reminder.salah;
    await sendReminder(reminder, mainWindow);
  }

  // Schedule the next reminder

  const intervals = reminder.forIqamah
    ? IQAMAH_REMINDER_INTERVALS
    : SALAH_END_REMINDER_INTERVALS;

  // The reminder is for dhuhr, but dhuhr is hours away (sunrise - dhuhr time is a no pray time).
  if (!reminder.current) {
    const maxInterval = Math.max(...intervals) * 60 * 1000;
    const timeLeft = getTimeLeft(reminder);
    const delay = timeLeft - maxInterval;

    console.log(
      `Non-current salah detected. Scheduling for: ${Date.now() + delay}`,
    );

    setTimeout(() => remind(payload, mainWindow), delay);
    return;
  }

  for (const interval of intervals) {
    const intervalMs = interval * 60 * 1000;
    const timeLeft = getTimeLeft(reminder);

    if (timeLeft > intervalMs) {
      const delay = timeLeft - intervalMs;
      console.log(`Scheduling future reminder for: ${Date.now() + delay}`);
      setTimeout(() => remind(payload, mainWindow), delay);
      return;
    }
  }

  // If I run out of intervals, it means this salah must get no more reminders / no more reminders for the iqamah.

  // There will still be reminders for this salah, but according to the salah end reminder intervals.
  if (reminder.forIqamah) {
    const maxInterval = Math.max(...SALAH_END_REMINDER_INTERVALS) * 60 * 1000;
    const timeLeft =
      getSalahEndTime(payload, reminder.salah.name).getTime() - Date.now(); // Not using getTimeLeft() function because reminder.endTime is incorrect for our purposes.
    const delay = timeLeft - maxInterval;

    console.log(
      `Scheduling (late for iqamah) reminder for: ${Date.now() + delay}`,
    );

    setTimeout(() => remind(payload, mainWindow), delay);
    return;
  }

  // No more reminders for this salah, so let's check the reminder pool again for the next one.
  const delay = Math.min(...intervals) * 60 * 1000;
  setTimeout(() => remind(payload, mainWindow), delay);
}
