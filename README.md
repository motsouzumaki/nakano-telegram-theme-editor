# 🎨 TeleTheme Studio

An interactive, responsive web application for creating, previewing, and customizing **Telegram Android Themes (`.attheme`)** in real-time.

---

## 🚀 Quick Start

### 1. Run the Development Server
```bash
npm run dev
```
Open your browser at **[http://localhost:5173](http://localhost:5173)**.

### 2. Build for Production
```bash
npm run build
```
The optimized bundle is built to the `dist/` folder, ready for deployment to GitHub Pages, Vercel, Netlify, or Cloudflare Pages.

---

## ✨ Features

- **📱 Pixel-Perfect Android Simulator**:
  - Realistic Android status bar, curved bezels, and punch-hole camera.
  - Realistic incoming and outgoing message bubbles with authentic speech tails.
  - Pinned message banner, link previews, interactive voice note waveform player, timestamps, and read checkmarks (`chat_outSentCheck`).
  - Interactive test messaging: type any text into the message box on the phone and press Send to see your message in real-time.
  - Dual View: Switch between **Chat View** and **Chats List (Home Screen)** with unread badges and pencil FAB button.

- **🎯 "Inspect & Tap" Mode**:
  - Hover over any element on the phone screen to see its Telegram variable name (e.g. `chat_outBubble`, `actionBarDefault`, `chat_messagePanelBackground`).
  - Click on any element to instantly jump to that exact color parameter in the inspector editor!

- **⚡ Material You (Monet) Engine**:
  - Pick a single seed accent color or wallpaper tone.
  - Automatically computes harmonious surface colors, bubble shades, and WCAG text contrast for Light, Dark, or true **Pitch Black AMOLED** modes.
  - Sliders for bubble corner radius (0px to 24px) and speech bubble tails toggle.

- **🎨 10 Curated Presets**:
  - *Telegram Dark* (Official Classic)
  - *Pure AMOLED Black* (True `#000000` power-saving)
  - *Material You Sky* (Android 14/15 Monet Blue)
  - *Material You Sage Forest* (Monet Earthy Green)
  - *Catppuccin Mocha*
  - *Cyberpunk 2077* (Neon Yellow & Cyan)
  - *Telegram Light* (Official Classic Light)
  - *Nord Arctic Frost*
  - *Rosé Pine*
  - *Sunset Terracotta*

- **🖼️ Wallpaper Studio**:
  - Solid Color background
  - Linear Gradient generator with angle and dual-color stops
  - Telegram Doodle Pattern overlay
  - Custom image upload with blur (0–20px) and dimming overlay sliders.

- **💾 Universal `.attheme` Import & Export**:
  - **Export**: Generates standard Telegram Android `.attheme` files using signed 32-bit ARGB integers.
  - **Wallpaper Bundling**: If a custom background photo is used, bundles `colors.attheme` + `wallpaper.jpg` into a valid `.attheme` ZIP file via JSZip.
  - **Import**: Drag-and-drop any `.attheme` file (plain text or zipped) to parse and load it instantly.
  - **Telegram Desktop (.tdesktop-palette)**: Bonus 1-click export for desktop users.

---

## 📲 How to Apply a Theme on Telegram for Android

1. In **TeleTheme Studio**, click **Export Theme** and download your `.attheme` file.
2. Open the Telegram app on your Android phone.
3. Send the downloaded `.attheme` file to your **Saved Messages** chat.
4. Tap directly on the file inside Telegram and select **Apply Theme**.
5. Your custom colors and wallpaper are applied immediately!
