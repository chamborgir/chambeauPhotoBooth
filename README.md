# Online Web Photobooth

A lightweight, minimal client-side web application that transforms your browser into a vintage four-panel photobooth. Capture, compile, and print your memories with zero server-side storage overhead.

## Features

- **Four-Shot Sequence:** Features an automated countdown timer that triggers a 4-picture capture burst using your system's native webcam.
- **Instant Photostrip Compilation:** Automatically arranges the captured frames into a traditional vertical `4-pic photostrip` template.
- **Client-Side Generation:** Processes images entirely on the client side inside an HTML5 Canvas, ensuring complete user privacy.
- **Save & Print Pipeline:** One-click functionality to download the high-resolution photostrip directly to your device or trigger the local system printer layout.

## Tech Stack

- **Frontend Interface:** HTML5 / CSS3 / JavaScript (ES6+)
- **Media API:** WebRTC MediaDevices (Camera API)
- **Image Processing:** HTML5 Canvas API
