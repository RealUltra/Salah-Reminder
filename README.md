# Salah-Reminder

A simple Electron app that reminds users of Islamic prayer times in **Muscat, Oman** or **Kelowna, B.C., Canada**.

## Motivation & Purpose

This app was built for me to:

- Learn Electron
- Practice my React skills
- Replace an old python program that would do the same thing

The app sends periodic reminders for salah (the islamic prayers) at appropriate times so that the user is reminded to go to the mosque, or pray at home if it is too late to go to the mosque.

## Features

- Detects your location and displays salah times through the UI (if the location is supported).
- Allows the user to see yesterday & tomorrow's prayer times as well.
- Sends the user reminders at set intervals to remind them to go to the mosque or pray at home if they are late.
  - Keeps track of whether the user has prayed already or not.

## Limitations

- Iqamah timings are variable based on the mosque, so the app's mosque reminder functionality would only work for me and others in my neighborhood.
- At the moment, the app can only retrieve salah times for **Muscat, Oman** and **Kelowna, B.C., Canada**.
- While adhaan timings are fairly consistent in Muscat, they may vary from mosque to mosque in other places.

## Next Steps

- Add a tray icon menu to allow the user to quit the app from tray, as well as still open it.
- Add a countdown on the UI for the upcoming prayer.
- Add a marker on the UI that signifies the upcoming prayer.
- Improve the UI with bootstrap.
- Add **Karachi, Pakistan** to the app as that is another city I often live in.
- Allow the user to switch between cities manually.
- Remind the user based on the local time at the selected location.

## Further Steps

These are features that would be cool to implement, but I probably won't do them until a lot later.

- Allow the user to modify the iqamah times in the UI for compatibility with different mosques.
- Allow the prayer times for any location to be used.
- Create a settings page in the UI to allow toggling reminders.

## Active Bugs

- The **Muscat, Oman** prayer times are not being scraped appropriately due to changes in the **muslimpro** website. This must be fixed by either scraping the website differently **(preferred)** or scraping a different website.
