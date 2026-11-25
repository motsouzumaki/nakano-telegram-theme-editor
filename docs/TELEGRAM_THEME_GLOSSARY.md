# 📖 Comprehensive Telegram Android (.attheme) Theme Variables Glossary

> **An authoritative, exhaustive reference manual and database of Telegram for Android theming keys.**  
> Synthesized and expanded from:
> - [.attheme Glossary by snejugal](https://attheme-glossary.snejugal.ru/en)
> - [Telegram Theming Reference by ZeusOfTheCrows](https://gist.github.com/ZeusOfTheCrows/7b20cebc2d9e6cc755f92c64fc59cbdf)
> - [Telegram Android Source Code `Theme.java`](https://github.com/DrKLO/Telegram)
> - TeleTheme Studio Production Engine
>
> **Total Documented Variables:** **416**

---

## 📑 Table of Contents

- [Core Principles of Telegram Theming](#-core-principles-of-telegram-theming)
- [Color Format (.attheme Signed 32-bit ARGB)](#-color-format-attheme-signed-32-bit-argb)
- [Essential Anti-Default Rules (Preventing Ugly Green/Blue Defaults)](#-essential-anti-default-rules)
- [Categories Directory](#-categories-directory)
  - [1. Bubbles & Messages (69)](#bubbles_messages)
  - [2. Top Action Bar & Header (23)](#action_bar)
  - [3. Message Input Panel (19)](#input_panel)
  - [4. Chats List (Home Screen) (37)](#chats_list)
  - [5. Wallpaper & Canvases (9)](#wallpaper_background)
  - [6. Voice Notes & Audio Seekbars (34)](#audio_voice)
  - [7. Service Notifications & Dates (5)](#service_messages)
  - [8. Dialogs, Modals & Menus (24)](#dialogs_popups)
  - [9. Settings, Toggles & Forms (116)](#settings_controls)
  - [10. Navigation Drawer (Menu) (10)](#drawer_menu)
  - [11. Contacts & Calls (13)](#contacts_calls)
  - [12. In-App Music Player (5)](#in_app_player)
  - [13. Stickers & Emoji Sheet (17)](#stickers_emojis)
  - [14. Fullscreen Media Viewer (5)](#media_viewer)
  - [15. User & Channel Profile (12)](#profile)
  - [16. Avatars & Member Colors (18)](#avatars)

---

## 🎨 Core Principles of Telegram Theming

1. **Hierarchy & Contrast**: Telegram themes rely on distinct contrast between chat wallpaper, message bubbles (`chat_inBubble` vs `chat_outBubble`), and message texts (`chat_messageTextIn` vs `chat_messageTextOut`).
2. **Double Checkmark Quirks**: If `chat_outSentCheckRead` is not defined in your theme file, Telegram Android will automatically fall back to its hardcoded stock green checkmarks (`#45bd5e`), ignoring your custom theme palette!
3. **Voice Note Circles & Timers**: Missing `chat_outLoader` or `chat_outAudioDurationText` will similarly trigger default stock green audio player controls on sent voice notes.
4. **Group Sender Names in Chat List**: Keys such as `chats_nameMessage`, `chats_attachMessage`, and `chats_actionMessage` dictate snippet previews in your conversation list. Omitting them leads to bright default blues.

---

## 🔢 Color Format (.attheme Signed 32-bit ARGB)

In Telegram `.attheme` files, colors are stored as **signed 32-bit integers in ARGB format**:

```ini
chat_outBubble=-13938056
chat_inBubble=-15194573
chat_messageTextOut=-1
```

Hex to Signed 32-bit Integer conversion logic:
```javascript
function hexToAtthemeInt(hex) {
  // Hex format: #AARRGGBB or #RRGGBB (defaults alpha to FF)
  const clean = hex.replace('#', '');
  const argb = clean.length === 6 ? 'ff' + clean : clean;
  const uint = parseInt(argb, 16);
  return (uint > 0x7FFFFFFF) ? uint - 0x100000000 : uint;
}
```

---

## 🛡️ Essential Anti-Default Rules

To prevent Telegram's hardcoded fallbacks from spoiling your theme palette:

| Fallback Area | Danger Key If Omitted | What Happens | Fix / Override Key |
| :--- | :--- | :--- | :--- |
| **Sent Read Checks** | `chat_outSentCheckRead` | Reverts to harsh neon green double checks | Define `chat_outSentCheckRead` matching `chat_outSentCheck` |
| **Voice Button Circle** | `chat_outLoader` | Reverts to harsh green circle on voice bubbles | Define `chat_outLoader` |
| **Voice Note Duration** | `chat_outAudioDurationText` | Reverts to harsh green duration numbers | Define `chat_outAudioDurationText` |
| **Chat Snippet Senders** | `chats_nameMessage` | Reverts to default saturated blue author tags | Define `chats_nameMessage` matching theme accent |
| **Chat Attachments Tag** | `chats_attachMessage` | Reverts to default blue "Photo" / "Video" tags | Define `chats_attachMessage` matching theme accent |
| **Active Folder Tab Line** | `actionBarTabLine` | Reverts to default blue line | Define `actionBarTabLine` |
| **Pinned Bar Left Accent** | `chat_topPanelLine` | Reverts to default blue vertical bar | Define `chat_topPanelLine` |
| **Mini Music Player Bar** | `inappPlayerTitle` / `inappPlayerPerformer` | Reverts to black `#000000` text on dark mini-player bars, becoming completely invisible | Define `inappPlayerTitle` and `inappPlayerPerformer` with high contrast against `inappPlayerBackground` |
| **Expanded Music Player Sheet** | `player_background` | Reverts to glaring solid white bottom sheet on dark themes | Define `player_background` matching surface/dialog background |
| **Emoji Suggestion Tooltip** | `chat_stickersHintPanel` | Reverts to glaring solid white speech-bubble tooltip with arrow when typing keywords like "laugh" | Define `chat_stickersHintPanel` matching surface/popup background |

---

## <a id="bubbles_messages"></a>1. Bubbles & Messages (69 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `avatar_nameInMessageBlue` | **Avatar Name In Message Blue** | Author name text color in group chat message bubbles for users assigned the Blue color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `avatar_nameInMessageColour` | **Avatar Name In Message Colour** | user's name in message bubble (groups) | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `avatar_nameInMessageCyan` | **Avatar Name In Message Cyan** | Author name text color in group chat message bubbles for users assigned the Cyan color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `avatar_nameInMessageGreen` | **Forward / Peer Author (Green)** | Author name text color in group chat message bubbles for users assigned the Green color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | **CRITICAL**: Controls the forward arrow (`⤷`), date timestamp, and author name on forwarded messages for users/channels assigned the Green ID. If omitted in `.attheme`, Telegram Android falls back to an electric neon green (`#4fad4e`) that clashes with custom themes. |
| `avatar_nameInMessageOrange` | **Avatar Name In Message Orange** | Author name text color in group chat message bubbles for users assigned the Orange color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `avatar_nameInMessagePink` | **Avatar Name In Message Pink** | Author name text color in group chat message bubbles for users assigned the Pink color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `avatar_nameInMessageRed` | **Avatar Name In Message Red** | Author name text color in group chat message bubbles for users assigned the Red color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `avatar_nameInMessageViolet` | **Avatar Name In Message Violet** | Author name text color in group chat message bubbles for users assigned the Violet color ID. | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_adminTitle` | **Admin Badge Title Text** | Custom admin tag label text (e.g. "admin", "creator") displayed next to group member names. | Chat Screen > Group chat message header | `#7f93a5` / `#8596a5` | Must remain readable against the incoming bubble background. |
| `chat_inAdmin` | **Admin Badge Title (Incoming)** | Admin title text inside incoming messages in groups. | Chat Screen > Incoming message header | `#7f93a5` / `#8596a5` | Pair with avatar_nameInMessage colors for contrast. |
| `chat_inBubble` | **Incoming Bubble** | Sets the icon color of play/pause buttons on the list. (inbound message bubble background) | Chat Screen > Message Bubble | `#182533` / `#182533` | - |
| `chat_inBubbleSelected` | **Incoming Bubble (Selected)** | Background tint when an incoming message is selected. inbound message bubble background, when selecting multiple messages | Chat Screen > Message Bubble | `#1f2f40` / `#1f2f40` | - |
| `chat_inBubbleShadow` | **Incoming Bubble Shadow** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inInstant` | **Incoming Instant** | lightning icon in [inbound/outbound] instant article links | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inInstantSelected` | **Incoming Instant Selected** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inMenuSelected` | **Incoming Menu Selected** | unticked radio button on media (file/poll/etc.) [when message selected] | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inPreviewInstantSelectedText` | **Incoming Preview Instant Selected Text** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inPreviewInstantText` | **Link Preview (Incoming)** | Domain and link snippet text inside incoming bubbles. "Instant View" text + outline in [inbound/outbound] instant article links | Chat Screen > Message Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_inQuote` | **Quote Block (Incoming)** | Background color of quoted text blocks inside incoming messages | Chat Screen > Message Bubble | `#202f3e` / `#202f3e` | - |
| `chat_inReactionButtonBackground` | **Reaction Pill (Incoming)** | Background of emoji reaction pills under received messages | Chat Screen > Message Bubble | `#223244` / `#223244` | - |
| `chat_inReactionButtonText` | **Reaction Text (Incoming)** | Counter number text color in received reaction pills | Chat Screen > Message Bubble | `#64b5ef` / `#64b5ef` | - |
| `chat_inReplyLine` | **Reply Bar (Incoming)** | Vertical accent bar for replies on received messages. line to the left of quoted text in [inbound/outbound] reply messages | Chat Screen > Message Bubble | `#64b5ef` / `#64b5ef` | - |
| `chat_inReplyMediaMessage` | **Replied Media Snippet (Incoming)** | Snippet text indicating replied media type (e.g. "Photo", "Voice note") in incoming bubbles. | Chat Screen > Incoming reply preview | `#64b5ef` / `#3a8ecc` | Differentiates media reply quotes from regular text replies. |
| `chat_inReplyMessageText` | **Reply Snippet (Incoming)** | Message quote text snippet on received messages. contents of message replied to in [inbound/outbound] messages | Chat Screen > Message Bubble | `#8da6ba` / `#8da6ba` | - |
| `chat_inReplyName` | **Reply Author Alias (Incoming)** | Legacy alias for chat_inReplyNameText | Chat Screen > Message Bubble | `#64b5ef` / `#64b5ef` | - |
| `chat_inReplyNameText` | **Reply Author (Incoming)** | Author name in quote box on received messages. name of sender of message replied to in [inbound/outbound] messages | Chat Screen > Message Bubble | `#64b5ef` / `#64b5ef` | - |
| `chat_inSentClock` | **Incoming Sent Clock** | inbound message sending clock icon | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inSentClockSelected` | **Incoming Sent Clock Selected** | inbound message sending clock icon when selected | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_inTimeText` | **Received Message Time** | Timestamp font color on incoming messages | Chat Screen > Message Bubble | `#6d8397` / `#6d8397` | - |
| `chat_inViewsSelected` | **Incoming Views Selected** | views (eye) icon on message bubble in group chats [when message selected] | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_messageLinkIn` | **Link Color (Received Message)** | Hyperlink URL text color inside received message bubbles. inbound message bubble clickable link text | Chat Screen > Message Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_messageLinkOut` | **Link Color (Sent Message)** | Hyperlink URL text color inside sent message bubbles. outbound message bubble clickable link text | Chat Screen > Message Bubble | `#ffffff` / `#ffffff` | - |
| `chat_messageTextIn` | **Received Message Text** | Text color of incoming messages. inbound message bubble text | Chat Screen > Message Bubble | `#ffffff` / `#ffffff` | - |
| `chat_messageTextOut` | **Sent Message Text** | Text color of your sent messages. outbound message bubble text | Chat Screen > Message Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outAdmin` | **Admin Badge Title (Outgoing)** | Admin title text inside sent messages in groups. | Chat Screen > Outgoing message header | `#7099be` / `#6ca332` | Pair with chat_messageTextOut for contrast. |
| `chat_outBubble` | **Outgoing Bubble** | Background color of sent message bubbles. outbound message bubble background | Chat Screen > Message Bubble | `#2b5278` / `#2b5278` | - |
| `chat_outBubbleGradient` | **Outgoing Bubble Gradient** | background vertical gradient across all bubbles, set alpha to 0 to disable | Chat Screen > Message Bubble | `#ffffff` / `#000000` | Set alpha to 00 if you want solid message bubbles without gradient shading. |
| `chat_outBubbleGradient1` | **Outgoing Bubble Gradient Stop 1** | First color stop for vertical gradient message bubbles on sent messages. | Chat Screen > Outgoing message bubble | `#2b5278` / `#e1ffc7` | Set alpha to 00 or remove gradient keys if solid color bubbles are preferred. |
| `chat_outBubbleGradient2` | **Outgoing Bubble Gradient Stop 2** | Second color stop for vertical gradient message bubbles on sent messages. | Chat Screen > Outgoing message bubble | `#204060` / `#cbff99` | Forms continuous vertical wallpaper-like gradient spanning across stacked outgoing messages. |
| `chat_outBubbleGradient3` | **Outgoing Bubble Gradient Stop 3** | Third color stop for 3-stop vertical gradient message bubbles on sent messages. | Chat Screen > Outgoing message bubble | `#19334d` / `#b5ff6b` | Optional third gradient stop for complex multi-tone bubble gradients. |
| `chat_outBubbleGradientAnimated` | **Animated Bubble Gradient Toggle** | Controls animated shifting gradient on sent message bubbles when new messages are added. | Chat Screen > Outgoing message bubble | `#00000000` / `#00000000` | Usually transparent unless dynamic gradient animation is enabled. |
| `chat_outBubbleGradientSelectedOverlay` | **Outgoing Bubble Gradient Selected Overlay** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | Set alpha to 00 if you want solid message bubbles without gradient shading. |
| `chat_outBubbleSelected` | **Outgoing Bubble (Selected)** | Background tint when an outgoing message is selected. outbound message bubble background, when selecting multiple messages | Chat Screen > Message Bubble | `#356391` / `#356391` | - |
| `chat_outBubbleShadow` | **Outgoing Bubble Shadow** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outInstant` | **Outgoing Instant** | lightning icon in [inbound/outbound] instant article links | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outInstantSelected` | **Outgoing Instant Selected** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outMenuSelected` | **Outgoing Menu Selected** | unticked radio button on media (file/poll/etc.) [when message selected] | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outPreviewInstantSelectedText` | **Outgoing Preview Instant Selected Text** | /!\ unknown /!\ | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outPreviewInstantText` | **Link Preview (Outgoing)** | Domain and link snippet text inside outgoing bubbles. "Instant View" text + outline in [inbound/outbound] instant article links | Chat Screen > Message Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outQuote` | **Quote Block (Outgoing)** | Background color of quoted text blocks inside sent messages | Chat Screen > Message Bubble | `#356391` / `#356391` | - |
| `chat_outReactionButtonBackground` | **Reaction Pill (Outgoing)** | Background of emoji reaction pills under sent messages | Chat Screen > Message Bubble | `#3a6c9d` / `#3a6c9d` | - |
| `chat_outReactionButtonText` | **Reaction Text (Outgoing)** | Counter number text color in sent reaction pills | Chat Screen > Message Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outReplyLine` | **Reply Bar (Outgoing)** | Vertical accent bar for replies on sent messages. line to the left of quoted text in [inbound/outbound] reply messages | Chat Screen > Message Bubble | `#8bc4f7` / `#8bc4f7` | - |
| `chat_outReplyMediaMessage` | **Replied Media Snippet (Outgoing)** | Snippet text indicating replied media type (e.g. "Photo", "Voice note") in sent bubbles. | Chat Screen > Outgoing reply preview | `#8bc4f7` / `#6ca332` | Differentiates media reply quotes from regular text replies. |
| `chat_outReplyMessageText` | **Reply Snippet (Outgoing)** | Message quote text snippet on sent messages. contents of message replied to in [inbound/outbound] messages | Chat Screen > Message Bubble | `#9cc7ed` / `#9cc7ed` | - |
| `chat_outReplyName` | **Reply Author Alias (Outgoing)** | Legacy alias for chat_outReplyNameText | Chat Screen > Message Bubble | `#8bc4f7` / `#8bc4f7` | - |
| `chat_outReplyNameText` | **Reply Author (Outgoing)** | Author name in quote box on sent messages. name of sender of message replied to in [inbound/outbound] messages | Chat Screen > Message Bubble | `#8bc4f7` / `#8bc4f7` | - |
| `chat_outSentCheck` | **Sent Checkmark (Single Check)** | Single checkmark on sent messages. outbound message sent tickmark | Chat Screen > Message Bubble | `#4ea4f5` / `#4ea4f5` | Must be specified in custom themes; otherwise Telegram Android falls back to official bright green checkmarks. |
| `chat_outSentCheckRead` | **Read Checkmark (Double Check)** | Double checkmarks on read messages (prevents Telegram default green checks). outbound message read double tick | Chat Screen > Message Bubble | `#4ea4f5` / `#4ea4f5` | Must be specified in custom themes; otherwise Telegram Android falls back to official bright green checkmarks. |
| `chat_outSentCheckReadSelected` | **Outgoing Sent Check Read Selected** | outbound message read double tick when selected | Chat Screen > Message Bubble | `#ffffff` / `#000000` | Must be specified in custom themes; otherwise Telegram Android falls back to official bright green checkmarks. |
| `chat_outSentCheckSelected` | **Outgoing Sent Check Selected** | outbound message sent tick when selected | Chat Screen > Message Bubble | `#ffffff` / `#000000` | Must be specified in custom themes; otherwise Telegram Android falls back to official bright green checkmarks. |
| `chat_outSentClock` | **Outgoing Sent Clock** | outbound message sending clock icon | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outSentClockSelected` | **Outgoing Sent Clock Selected** | outbound message sending clock icon when selected | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_outTimeText` | **Sent Message Time** | Timestamp font color on outgoing messages | Chat Screen > Message Bubble | `#7099be` / `#7099be` | - |
| `chat_outViewsSelected` | **Outgoing Views Selected** | views (eye) icon on message bubble in group chats [when message selected] | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |
| `chat_secretTimeText` | **Secret Chat Lock Icon / Subtitle** | Timer text and security info color in secret chat headers. | Chat Screen > Header subtitle | `#7f93a5` / `#8596a5` | Matches chat_status in appearance. |
| `chat_secretTimerBackground` | **Secret Chat Self-Destruct Timer Circle** | Circular container behind the self-destruct countdown timer on secret chat media. | Chat Screen > Secret chat photo / video | `#cc000000` / `#cc000000` | Displays animated countdown arc indicating remaining view seconds. |
| `chat_secretTimerText` | **Secret Chat Self-Destruct Seconds Text** | Seconds number font color inside the secret chat self-destruct timer circle. | Chat Screen > Secret chat countdown | `#ffffff` / `#ffffff` | Contrasts against chat_secretTimerBackground. |
| `chat_selectedBackground` | **Chat Selected Background** | Sets the background underlay color when you selected a message by holding them. (background behind selected message bubbles) | Chat Screen > Message Bubble | `#ffffff` / `#000000` | - |

---

## <a id="action_bar"></a>2. Top Action Bar & Header (23 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `actionBarActionModeDefault` | **Action Mode Bar Background** | Sets the overlay color of the action mode panel when messages or chats are selected. | Top Action Bar / Navigation Header | `#0e1015` / `#527da3` | **CRITICAL (Seamless Header)**: To keep the top header seamless and avoid disjointed white cutouts between the status bar and folder tabs, this should match `actionBarDefault` (the header background). The icons (`actionBarActionModeDefaultIcon`) adapt to light (`#ffffff`) for contrast. |
| `actionBarActionModeDefaultIcon` | **Action Mode Icons & Counter** | Sets the colors of the 'X' cancel button, the selected count number ('1'), and the action buttons (Pin, Mute, Archive, Delete). | Top Action Bar / Navigation Header | `#e76a8f` / `#ffffff` | **ADAPTIVE LIGHT**: On dark or colored headers, icons must be adaptive light (`#ffffff` / soft luminous tint, min 3.5:1 ratio) rather than dark accents. On white headers, icons adapt to the dark/vibrant primary accent. |
| `actionBarActionModeDefaultSelector` | **Action Mode Selector** | Sets the color of the ripple/circle that appears when you tap an icon on the panel. | Top Action Bar / Navigation Header | `#cf5479` / `#e4edf6` | - |
| `actionBarActionModeDefaultTop` | **Action Mode Status Bar** | Sets the OS status bar background color when action mode is active. | Top Action Bar / Navigation Header | `#0e1015` / `#ffffff` | - |
| `actionBarDefault` | **Action Bar Background** | Sets the app header background color. The background of the status bar is generated automatically (on Android 5.0 and above). The in-app player header, header in Settings and chat info and the header that appears when you select any messages have another variables. (background of header bar) | Top Action Bar / Navigation Header | `#1c242d` / `#1c242d` | - |
| `actionBarDefaultIcon` | **Action Bar Icons** | Sets the color of icons on the action bar. (icons in header bar (hamburger/search/ellipse/etc.)) | Top Action Bar / Navigation Header | `#ffffff` / `#ffffff` | - |
| `actionBarDefaultSearch` | **Header Default Search Text** | Sets the color of the entered text in the search field (text typed into the searchbar, e.g. "Hello"). | Top Action Bar / Navigation Header | `#ffffff` / `#1c242d` | **CRITICAL (Anti-Default Rule)**: If omitted from `.attheme`, Telegram Android defaults this to `#000000` (black). On dark or colored headers, typed search queries (e.g. "Hello") become black and completely unreadable! Must adapt to `#ffffff` or light text on dark headers. |
| `actionBarDefaultSearchPlaceholder` | **Header Default Search Placeholder** | Sets the color of the hint text you can see before entering any search query ("Search" or "Search in chat"). | Top Action Bar / Navigation Header | `#7f93a5` / `#708291` | Should be a soft translucent tint (40-50% opacity) of `actionBarDefaultSearch` or match `actionBarDefaultSubtitle` for natural appearance. |
| `actionBarDefaultSelector` | **Header Default Selector** | Sets the color of the circle that appears when you tap an icon on the action bar. (/!\ unknown /!\) | Top Action Bar / Navigation Header | `#ffffff` / `#000000` | - |
| `actionBarDefaultSubmenuBackground` | **Dropdown Menu Background** | Sets the background of submenus, e. g. when you tap the reverse button. The icons there are set by player_button and player_buttonActive. (background of ellipsis/dropdown menu) | Top Action Bar / Navigation Header | `#1c242d` / `#1c242d` | - |
| `actionBarDefaultSubmenuItem` | **Dropdown Menu Item Text** | Sets the text color of submenu buttons. (text of ellipsis/dropdown menu items) | Top Action Bar / Navigation Header | `#ffffff` / `#ffffff` | - |
| `actionBarDefaultSubmenuItemIcon` | **Dropdown Menu Item Icons** | Icons color beside text inside top options dropdown menu. icons of ellipsis/dropdown menu items | Top Action Bar / Navigation Header | `#7f93a5` / `#7f93a5` | - |
| `actionBarDefaultSubtitle` | **Action Bar Subtitle** | Sets the color of the text that is below the title, like members amount, last seen time or “typing…” status. | Top Action Bar / Navigation Header | `#7f93a5` / `#7f93a5` | - |
| `actionBarDefaultTitle` | **Action Bar Title** | Sets the title color on the action bar. (main text in header bar) | Top Action Bar / Navigation Header | `#ffffff` / `#ffffff` | - |
| `actionBarTabActiveText` | **Active Folder Tab Text & Icon** | Folder tab title text (e.g. 'Rose') and folder icon for the currently selected folder. | Top Action Bar / Navigation Header | `#a855f7` / `#a855f7` | **ADAPTS TO ACCENT**: Should match your theme's primary accent (violet/rose) by default. In Telegram Android, this controls the highlighted tab name and its folder icon. |
| `actionBarTabLine` | **Active Folder Tab Pill / Underline** | Capsule pill background or underline highlight around the active folder tab (e.g. the rounded label around 'Rose'). | Top Action Bar / Navigation Header | `#a855f7` / `#a855f7` | In modern Telegram Android, this controls the pill capsule indicator around active folder chips. Use semi-transparent hex (e.g. 20% alpha) or solid accent to prevent harsh opaque white cutouts. |
| `actionBarTabUnactiveText` | **Inactive Folder Tab Text** | Folder tab title text for unselected folders | Top Action Bar / Navigation Header | `#7f93a5` / `#b8d6f3` | On colored headers in Light Mode, use soft light pastel/tint (e.g. `actionBarDefaultSubtitle`) rather than dark grey. |
| `actionBarWhiteSelector` | **Header White Selector** | Sets the circle color when you tap the back button. | Top Action Bar / Navigation Header | `#ffffff` / `#000000` | - |
| `chat_topPanelBackground` | **Pinned Message Bar** | Background color of the pinned message banner below header | Top Action Bar / Navigation Header | `#17212b` / `#17212b` | - |
| `chat_topPanelClose` | **Pinned Bar Close Icon** | Close (X) icon on the pinned message bar | Top Action Bar / Navigation Header | `#7f93a5` / `#7f93a5` | - |
| `chat_topPanelLine` | **Pinned Bar Accent Line** | Vertical accent bar on the left of the pinned message banner (prevents Telegram default blue line) | Top Action Bar / Navigation Header | `#4ea4f5` / `#4ea4f5` | - |
| `chat_topPanelMessage` | **Pinned Bar Snippet** | Snippet text of the pinned message | Top Action Bar / Navigation Header | `#7f93a5` / `#7f93a5` | - |
| `chat_topPanelTitle` | **Pinned Bar Title** | Title text ("Pinned Message") color | Top Action Bar / Navigation Header | `#4ea4f5` / `#4ea4f5` | - |

---

## <a id="input_panel"></a>3. Message Input Panel (19 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chat_botKeyboardButtonBackground` | **Chat Bot Keyboard Button Background** | Sets the background color of the buttons. | Chat Screen > Bottom Input Area | `#ffffff` / `#000000` | - |
| `chat_botKeyboardButtonBackgroundPressed` | **Chat Bot Keyboard Button Background Pressed** | Sets the button background color when tapped and is the selector of these buttons. it replaced the default color, so alpha channel less than 255 will make the button transparent. | Chat Screen > Bottom Input Area | `#ffffff` / `#000000` | - |
| `chat_botKeyboardButtonText` | **Chat Bot Keyboard Button Text** | Sets the text color on buttons in a panel below message bar, if programmed in a bot. | Chat Screen > Bottom Input Area | `#ffffff` / `#000000` | - |
| `chat_fieldOverlayText` | **Chat Field Overlay Text** | Sets the text color on message bar to join a channel or group or cancel a voice/video message or mute/unmute a chat. | Chat Screen > Bottom Input Area | `#ffffff` / `#000000` | - |
| `chat_messagePanelAttach` | **Attachment Paperclip Icon** | Paperclip file attachment icon on the bottom message bar | Chat Screen > Bottom Input Area | `#b0c4de` / `#b0c4de` | - |
| `chat_messagePanelBackground` | **Input Box Background** | Sets the color of the message panel background. | Chat Screen > Bottom Input Area | `#17212b` / `#17212b` | - |
| `chat_messagePanelHint` | **Input Placeholder Hint** | Sets the color of the placeholder in the message panel that says “Message” or “Broadcast”. | Chat Screen > Bottom Input Area | `#64788c` / `#64788c` | - |
| `chat_messagePanelIcons` | **Input Icons (Mic, Emoji, GIF)** | Sets the color of the icons inside the message panel. | Chat Screen > Bottom Input Area | `#b0c4de` / `#b0c4de` | - |
| `chat_messagePanelSend` | **Send Button / Airplane Icon** | Sets the color of the send icon in the message panel. | Chat Screen > Bottom Input Area | `#4ea4f5` / `#4ea4f5` | - |
| `chat_messagePanelText` | **Input Typed Text** | Sets the color of the text inside the message panel. | Chat Screen > Bottom Input Area | `#ffffff` / `#ffffff` | - |
| `chat_messagePanelVoice` | **Voice / Mic Icon** | Microphone recording icon in the bottom message panel (matches theme violet/rose) | Chat Screen > Bottom Input Area | `#e76a8f` / `#e76a8f` | - |
| `chat_messagePanelVoiceBackground` | **Voice/Video Button Circle** | Circle background behind the voice and round video recording button | Chat Screen > Bottom Input Area | `#4ea4f5` / `#4ea4f5` | - |
| `chat_messagePanelVoicePressed` | **Voice / Mic Icon Pressed** | Microphone icon color when pressed or holding to record | Chat Screen > Bottom Input Area | `#cf5479` / `#cf5479` | - |
| `chat_recordTime` | **Recording Timer Duration** | Duration timer text numbers while recording audio | Chat Screen > Bottom Input Area | `#ffffff` / `#ffffff` | - |
| `chat_recordVoiceCancel` | **Recording Cancel Button** | Slide to cancel indicator text and button color | Chat Screen > Bottom Input Area | `#7f93a5` / `#7f93a5` | - |
| `chat_recordedVoiceBackground` | **Recording Container Bubble** | Background container of voice recording bar | Chat Screen > Bottom Input Area | `#2b5278` / `#2b5278` | - |
| `chat_recordedVoiceDot` | **Recording Indicator Dot** | Flashing red recording circle when recording voice notes | Chat Screen > Bottom Input Area | `#ef4444` / `#ef4444` | - |
| `chat_recordedVoicePlayPause` | **Recording Play/Pause Button** | Play/Pause circle button inside recorded audio bubble | Chat Screen > Bottom Input Area | `#ffffff` / `#ffffff` | - |
| `chat_recordedVoiceProgress` | **Recording Waveform Progress** | Progress scrubber bar of recorded voice note | Chat Screen > Bottom Input Area | `#4ea4f5` / `#4ea4f5` | - |

---

## <a id="chats_list"></a>4. Chats List (Home Screen) (37 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chats_actionBackground` | **New Chat FAB Button** | Sets the background of the “New Message” button. ([icon/background/background when tapped] of floating action button (FAB) in chat/calls list screen) | Home Screen > Conversation List | `#4ea4f5` / `#4ea4f5` | - |
| `chats_actionFAB` | **FAB Button Alias** | Legacy alias for chats_actionBackground | Home Screen > Conversation List | `#4ea4f5` / `#4ea4f5` | - |
| `chats_actionFABIcon` | **FAB Icon Alias** | Legacy alias for chats_actionIcon | Home Screen > Conversation List | `#ffffff` / `#ffffff` | - |
| `chats_actionIcon` | **New Chat FAB Icon** | Sets the icon on the “New Message” button. ([icon/background/background when tapped] of floating action button (FAB) in chat/calls list screen) | Home Screen > Conversation List | `#ffffff` / `#ffffff` | - |
| `chats_actionMessage` | **Chat Action Message Snippet** | Sets the color of texts like “You joined the channel” and also attached message type (like photo, GIF, video etc) if the sender name is omitted. | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | Prevents Telegram default hardcoded blue text snippets in chat list previews. |
| `avatar_backgroundArchived` | **Archived Chats Avatar Background** | Background color of the archive circle placeholder avatar in the chats list. | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | Adapt to theme accent to prevent default slate gray archive circle. |
| `avatar_backgroundArchivedHidden` | **Archived Chats Hidden Avatar Background** | Background color of the archive circle placeholder when the archive folder is hidden/collapsed. | Home Screen > Conversation List | `#c7587a` / `#c7587a` | - |
| `chats_archiveIcon` | **Archived Chats Box Icon** | White box/download icon inside the archive circle avatar | Home Screen > Conversation List | `#ffffff` / `#ffffff` | - |
| `chats_archiveText` | **Chat List Archive Text** | Label text color for Archived Chats row | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `chats_attachMessage` | **Chat Attachment Snippet** | Sets the attached message type like photo, video, audio etc if the sender name is not omitted. | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | Prevents Telegram default hardcoded blue text snippets in chat list previews. |
| `chats_date` | **Chat Date/Time** | Sets the time or date color in the top right corner of a chat. | Home Screen > Conversation List | `#7f93a5` / `#7f93a5` | - |
| `chats_draft` | **Draft Message Snippet** | Sets the “Draft” text color that appears when you type some text and then close the chat without sending it. | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | - |
| `chats_mentionIcon` | **Chat List Mention (@) Icon** | At-symbol (@) badge indicating you were mentioned or replied to in a group. | Chats List > Unread badge position | `#ffffff` / `#ffffff` | Renders inside an unread badge circle on the right side of the row. |
| `chats_message` | **Chat Message Preview** | Sets the color of messages below the chat titles. | Home Screen > Conversation List | `#7f93a5` / `#7f93a5` | - |
| `chats_muteIcon` | **Chat List Mute Icon** | Crossed-out speaker icon indicating notifications are silenced for this chat. | Chats List > Chat title row | `#566675` / `#bdbebf` | Displays next to the conversation title or timestamp. |
| `chats_name` | **Chat Contact Name** | Sets the title color of a chat. | Home Screen > Conversation List | `#ffffff` / `#ffffff` | - |
| `chats_nameIcon` | **Chat List Name Icon** | Sets the icon color of a chat if the chat is a channel or a group. | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `chats_nameMessage` | **Chat Author Snippet (Groups)** | Sets the sender name color in groups. | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | Prevents Telegram default hardcoded blue text snippets in chat list previews. |
| `chats_nameMessageArchived` | **Archived Chats Author Snippet** | Author name in archived chats preview (prevents Telegram default blue) | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | Prevents Telegram default hardcoded blue text snippets in chat list previews. |
| `chats_nameMessage_threeLines` | **3-Line Layout Author Snippet** | Author name in 3-line chat list preview mode (prevents Telegram default blue) | Home Screen > Conversation List | `#e76a8f` / `#e76a8f` | Prevents Telegram default hardcoded blue text snippets in chat list previews. |
| `chats_onlineCircle` | **Online Status Dot** | Green circle indicator on avatar when user is online | Home Screen > Conversation List | `#10b981` / `#10b981` | - |
| `chats_pinnedIcon` | **Pinned Chat Pin Icon** | Pin icon displayed on the right edge of pinned chat list rows. | Chats List > Right side of pinned conversation row | `#7f93a5` / `#a8a8a8` | Replaces the unread counter badge when chat has no unread messages. |
| `chats_pinnedOverlay` | **Pinned Chat Background Overlay** | Subtle semi-transparent background tint highlighting pinned conversation rows in the chats list. | Chats List > Pinned conversation row | `#15ffffff` / `#0d000000` | Keep alpha low (10-15%) so contact avatars and texts remain clearly distinct. |
| `chats_secretIcon` | **Chat List Secret Icon** | Sets the color of a secret chat icon. | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `chats_secretName` | **Chat List Secret Name** | Sets the color of a secret chat title. | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `chats_sentCheck` | **Chat List Sent Tickmark** | Single checkmark indicating outgoing message was sent, shown in chats list previews. | Chats List > Last message snippet | `#4ea4f5` / `#46aa37` | Visible next to your last sent message preview in conversation list. |
| `chats_sentClock` | **Chat List Sending Clock** | Clock icon indicating your last message is currently sending, shown in chats list. | Chats List > Last message snippet | `#7f93a5` / `#757575` | Matches chat_outSentClock in appearance. |
| `chats_sentReadCheck` | **Chat List Read Checkmarks** | Double checkmarks indicating your last sent message was read by recipient, shown in chats list. | Chats List > Last message snippet | `#4ea4f5` / `#46aa37` | Ensure this matches chat_outSentCheckRead for design consistency. |
| `chats_tabUnreadActiveBackground` | **Active Folder Tab Badge** | Counter badge background on the active chat folder tab (e.g. the badge with '1' next to 'Rose'). | Home Screen > Conversation List | `#a855f7` / `#a855f7` | **ADAPTS TO ACCENT**: Adapts to theme primary accent by default. Never forced to white. |
| `chats_tabUnreadActiveText` | **Active Folder Tab Badge Text** | Unread number text color inside the active folder badge (e.g. number '1'). | Home Screen > Conversation List | `#ffffff` / `#ffffff` | Contrasts against `chats_tabUnreadActiveBackground`. |
| `chats_tabUnreadUnactiveBackground` | **Inactive Folder Tab Badge Background** | Background color of unread counter pill on unselected chat folder tabs. | Chats List > Folder tabs bar | `#283645` / `#c2c9d1` | Provides muted contrast for folders with unread messages that are not currently active. |
| `chats_tabUnreadUnactiveText` | **Inactive Folder Tab Badge Text** | Text color inside unread counter pills on inactive chat folder tabs. | Chats List > Folder tabs bar | `#7f93a5` / `#ffffff` | Keep readable against chats_tabUnreadUnactiveBackground. |
| `chats_unreadCounter` | **Unread Badge Background** | Sets the background color of unread counter background if the chat is not muted. Also it sets the background if the mention icon (“@”) if you've been mentioned in the chat. | Home Screen > Conversation List | `#4ea4f5` / `#4ea4f5` | - |
| `chats_unreadCounterMuted` | **Chat List Unread Counter Muted** | Sets the background color of unread counter background if the chat is muted. | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `chats_unreadCounterText` | **Unread Badge Text** | Sets the text color of unread counter, independently whether the chat is muted. | Home Screen > Conversation List | `#ffffff` / `#ffffff` | - |
| `chats_verifiedBackground` | **Chat List Verified Background** | Sets the background color of a verified icon. ("Verified" chat [tickmark/background] (same as profile_verified[…])) | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `chats_verifiedCheck` | **Chat List Verified Check** | Sets the check color inside a verified icon. ("Verified" chat [tickmark/background] (same as profile_verified[…])) | Home Screen > Conversation List | `#ffffff` / `#000000` | - |
| `windowBackgroundGray` | **App Canvas Base Background** | Sets the secondary background, e. g. in Settings, between sections or below calls log if it doesn't fill the screen fully. | Home Screen > Conversation List | `#0e1621` / `#0e1621` | - |
| `windowBackgroundWhite` | **Chats List Background** | Sets the background almost everywhere except the chat screen background. For example, it sets the background on the chats list screen or the background of sections in Settings. (main background colour) | Home Screen > Conversation List | `#17212b` / `#17212b` | - |

---

## <a id="wallpaper_background"></a>5. Wallpaper & Canvases (9 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chat_goDownButton` | **Scroll-to-Bottom Button** | Floating down arrow button background | Chat Screen > Background Canvas | `#1d2733` / `#1d2733` | - |
| `chat_goDownButtonCounter` | **Scroll Button Badge Text** | Unread counter badge text on scroll button | Chat Screen > Background Canvas | `#ffffff` / `#ffffff` | - |
| `chat_goDownButtonCounterBackground` | **Scroll Button Badge Background** | Unread counter badge background on scroll button | Chat Screen > Background Canvas | `#4ea4f5` / `#4ea4f5` | - |
| `chat_goDownButtonIcon` | **Scroll-to-Bottom Icon** | Arrow icon on the scroll-to-bottom button | Chat Screen > Background Canvas | `#7f93a5` / `#7f93a5` | - |
| `chat_goToEndButtonBackground` | **Scroll-to-Bottom Alias** | Legacy alias for chat_goDownButton | Chat Screen > Background Canvas | `#1d2733` / `#1d2733` | - |
| `chat_goToEndButtonCounter` | **Scroll Badge Alias** | Legacy alias for chat_goDownButtonCounterBackground | Chat Screen > Background Canvas | `#4ea4f5` / `#4ea4f5` | - |
| `chat_goToEndButtonCounterText` | **Scroll Badge Text Alias** | Legacy alias for chat_goDownButtonCounter | Chat Screen > Background Canvas | `#ffffff` / `#ffffff` | - |
| `chat_goToEndButtonIcon` | **Scroll Icon Alias** | Legacy alias for chat_goDownButtonIcon | Chat Screen > Background Canvas | `#7f93a5` / `#7f93a5` | - |
| `chat_wallpaper` | **Chat Screen Background** | Sets the background on the chat screen, accepts either an image or a color. You must change this variable so Telegram includes your wallpaper in your theme. Changing the wallpaper in Settings → Chat Wallpaper won't include it in your theme. Be careful: if you set an image as a wallpaper, Telegram will compress it every time you change any variable with the in-app editor. For this reason, you must set your image again before you share your theme. | Chat Screen > Background Canvas | `#0e1621` / `#0e1621` | You must set this variable so Telegram includes your wallpaper in your theme. Modifying wallpaper in in-app editor recompresses custom images lossily. |

---

## <a id="audio_voice"></a>6. Voice Notes & Audio Seekbars (34 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chat_inAudioCacheSeekbar` | **Voice / Audio Buffer (Incoming)** | Buffered audio waveform track on received voice notes | Chat Screen > Voice Note / Audio Player Bubble | `rgba(78,164,245,0.2)` / `rgba(78,164,245,0.2)` | - |
| `chat_inAudioDurationText` | **Voice Note Duration Text (Incoming)** | Duration timer text on received voice messages | Chat Screen > Voice Note / Audio Player Bubble | `#6d8397` / `#6d8397` | Prevents Telegram Android from falling back to hardcoded default green voice/audio buttons and file texts. |
| `chat_inAudioPerformerText` | **Received Audio Performer Text** | Artist / Performer name text on received music and audio | Chat Screen > Voice Note / Audio Player Bubble | `#6d8397` / `#6d8397` | - |
| `chat_inAudioProgress` | **Voice Note Bar (Incoming)** | Audio scrubber waveform progress on incoming voice notes | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_inAudioSeekbar` | **Incoming Audio Bar (Background)** | Waveform seekbar background track on received audio | Chat Screen > Voice Note / Audio Player Bubble | `#354556` / `#354556` | - |
| `chat_inAudioSeekbarFill` | **Incoming Audio Bar (Filled)** | Played portion color of received audio waveform | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_inAudioSeekbarFillSelected` | **Incoming Audio Seekbar Fill Selected** | foreground/dot of [inbound/outbound] music progress bar [when message selected] | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#000000` | - |
| `chat_inAudioSeekbarSelected` | **Incoming Audio Seekbar Selected** | dimmed darker line of [inbound/outbound] music progress bar [when message selected] | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#000000` | - |
| `chat_inAudioTitleText` | **Received Song / Audio Title** | Song/Audio track title text on received messages | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_inFileBackground` | **Audio & File Circle (Incoming)** | Circular container background behind audio/file icons on received messages | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_inFileInfoSelectedText` | **Received File Details (Selected)** | File size and extension text on selected received messages | Chat Screen > Voice Note / Audio Player Bubble | `#6d8397` / `#6d8397` | - |
| `chat_inFileInfoText` | **Received File Details Text** | File size and extension text on received file attachments | Chat Screen > Voice Note / Audio Player Bubble | `#6d8397` / `#6d8397` | - |
| `chat_inFileNameText` | **Received File Name Text** | File title name text color on received file attachments | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | Prevents Telegram Android from falling back to hardcoded default green voice/audio buttons and file texts. |
| `chat_inLoader` | **Voice Note Button Circle (Incoming)** | Sets the background color of play/pause buttons on the list. | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | Prevents Telegram Android from falling back to hardcoded default green voice/audio buttons and file texts. |
| `chat_inMediaIcon` | **Play Button Icon (Received Audio)** | Play/Pause circle button inside received voice & audio bubbles | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_inVoiceSeekbar` | **Received Voice Waveform (Track)** | Unplayed waveform scrubber lines on received voice messages | Chat Screen > Voice Note / Audio Player Bubble | `#354556` / `#354556` | - |
| `chat_inVoiceSeekbarFill` | **Received Voice Waveform (Filled)** | Played waveform scrubber lines on received voice messages | Chat Screen > Voice Note / Audio Player Bubble | `#4ea4f5` / `#4ea4f5` | - |
| `chat_outAudioCacheSeekbar` | **Voice / Audio Buffer (Outgoing)** | Buffered audio waveform track on sent voice notes | Chat Screen > Voice Note / Audio Player Bubble | `rgba(255,255,255,0.2)` / `rgba(255,255,255,0.2)` | - |
| `chat_outAudioDurationText` | **Voice Note Duration Text (Outgoing)** | Duration timer text ("00:03") on sent voice messages (prevents Telegram default green timer) | Chat Screen > Voice Note / Audio Player Bubble | `#7099be` / `#7099be` | Prevents Telegram Android from falling back to hardcoded default green voice/audio buttons and file texts. |
| `chat_outAudioPerformerText` | **Sent Audio Performer Text** | Artist / Performer name text on sent music and audio | Chat Screen > Voice Note / Audio Player Bubble | `#cfb5bd` / `#cfb5bd` | - |
| `chat_outAudioProgress` | **Voice Note Bar (Outgoing)** | Audio scrubber waveform progress on sent voice notes | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outAudioSeekbar` | **Outgoing Audio Bar (Background)** | Waveform seekbar background track on sent audio | Chat Screen > Voice Note / Audio Player Bubble | `#52789e` / `#52789e` | - |
| `chat_outAudioSeekbarFill` | **Outgoing Audio Bar (Filled)** | Played portion color of sent audio waveform | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outAudioSeekbarFillSelected` | **Outgoing Audio Seekbar Fill Selected** | foreground/dot of [inbound/outbound] music progress bar [when message selected] | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#000000` | - |
| `chat_outAudioSeekbarSelected` | **Outgoing Audio Seekbar Selected** | dimmed darker line of [inbound/outbound] music progress bar [when message selected] | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#000000` | - |
| `chat_outAudioTitleText` | **Sent Song / Audio Title** | Song/Audio track title text on sent messages (prevents Telegram default green text) | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outFileBackground` | **Audio & File Circle (Outgoing)** | Circular container background behind audio/file icons on sent messages | Chat Screen > Voice Note / Audio Player Bubble | `#2b5278` / `#2b5278` | - |
| `chat_outFileInfoSelectedText` | **Sent File Details (Selected)** | File size and extension text on selected sent messages | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outFileInfoText` | **Sent File Details Text** | File size and extension text (e.g. 73.6 MB APK) on sent messages (prevents green text) | Chat Screen > Voice Note / Audio Player Bubble | `#cfb5bd` / `#cfb5bd` | - |
| `chat_outFileNameText` | **Sent File Name Text** | File title name text color on sent file attachments (essential to prevent Telegram default green text) | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | Prevents Telegram Android from falling back to hardcoded default green voice/audio buttons and file texts. |
| `chat_outLoader` | **Voice Note Button Circle (Outgoing)** | Play/Pause circle button background in sent voice notes (prevents Telegram default green circle) | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | Prevents Telegram Android from falling back to hardcoded default green voice/audio buttons and file texts. |
| `chat_outMediaIcon` | **Play Button Icon (Sent Audio)** | Play/Pause circle button inside sent voice & audio bubbles | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | - |
| `chat_outVoiceSeekbar` | **Sent Voice Waveform (Track)** | Unplayed waveform scrubber lines on sent voice messages | Chat Screen > Voice Note / Audio Player Bubble | `#52789e` / `#52789e` | - |
| `chat_outVoiceSeekbarFill` | **Sent Voice Waveform (Filled)** | Played waveform scrubber lines on sent voice messages | Chat Screen > Voice Note / Audio Player Bubble | `#ffffff` / `#ffffff` | - |

---

## <a id="service_messages"></a>7. Service Notifications & Dates (5 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chat_serviceBackground` | **Chat Service Background** | message selected left hand tickbox (dimmed for some reason?) | Chat Screen > Service Pill / Date Badge | `#ffffff` / `#000000` | - |
| `chat_serviceBackgroundSelected` | **Chat Service Background Selected** | /!\ unknown /!\ | Chat Screen > Service Pill / Date Badge | `#ffffff` / `#000000` | - |
| `chat_serviceIcon` | **Chat Service Icon** | /!\ unknown /!\ - appears defunct | Chat Screen > Service Pill / Date Badge | `#ffffff` / `#000000` | - |
| `chat_serviceLink` | **Chat Service Link** | /!\ unknown /!\ - appears defunct | Chat Screen > Service Pill / Date Badge | `#ffffff` / `#000000` | - |
| `chat_serviceText` | **Chat Service Text** | /!\ unknown /!\ - appears defunct | Chat Screen > Service Pill / Date Badge | `#ffffff` / `#000000` | - |

---

## <a id="dialogs_popups"></a>8. Dialogs, Modals & Menus (24 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dialogBackground` | **Dialog Background** | Sets the background of dialogs. | Modal Dialogs / Popups / Bottom Sheets | `#17212b` / `#17212b` | - |
| `dialogBackgroundGray` | **Dialog Background Gray** | Sets the small space between sections in Supergroup settings → Event Log → Settings. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogBadgeBackground` | **Dialog Badge Background** | Sets the background color of a badge — the counter you see when you forward messages or add stickers. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogBadgeText` | **Dialog Badge Text** | Sets the text color on the badge when forwarding message but not when adding stickers — it's set by picker_badgeText. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogButton` | **Dialog Action Button** | Sets the text color of buttons on dialogs on those that appear in the middle of the screen — for example, when you're deleting a message. | Modal Dialogs / Popups / Bottom Sheets | `#4ea4f5` / `#4ea4f5` | - |
| `dialogButtonSelector` | **Dialog Button Selector** | Sets the button background color when you tap it. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogCheckboxSquareBackground` | **Dialog Checkbox Square Background** | Controls the color of dialog checkbox square background in Telegram Android UI. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogCheckboxSquareCheck` | **Dialog Checkbox Square Check** | Controls the color of dialog checkbox square check in Telegram Android UI. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogCheckboxSquareDisabled` | **Dialog Checkbox Square Disabled** | Controls the color of dialog checkbox square disabled in Telegram Android UI. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogCheckboxSquareUnchecked` | **Dialog Checkbox Square Unchecked** | Controls the color of dialog checkbox square unchecked in Telegram Android UI. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogGrayLine` | **Dialog Gray Line** | Sets the color of the border you can see in the in-app video player panel. You can open it by attaching a YouTube video link to your message, then tap the video preview image. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogIcon` | **Dialog Icon** | Sets the color of icons. For example, the ones that appear when you hold a chat on the chat list. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogInputField` | **Dialog Input Field** | Sets the text field bottom border when the field is inactive. Inactive state is seen when you rate a call for 4 or less stars; you can get the ”Rate Call” prompt when you hold a call in Calls Log. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogInputFieldActivated` | **Dialog Input Field Activated** | Sets the color of the bottom border below text fields when the field is active — almost all text fields on dialogs right after they appear. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogLineProgress` | **Dialog Line Progress** | Sets the color of the line that shows what percent has already been downloaded. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogLineProgressBackground` | **Dialog Line Progress Background** | Sets the background color of line progress you can see when you save to downloads any file (three dots beside a file on chat screen → Save to downloads). | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogLinkSelection` | **Dialog Link Selection** | Sets the link in sticker pack name underlay when you tap it. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogRadioButton` | **Dialog Radio Button** | Controls the color of dialog radio button in Telegram Android UI. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogRadioButtonChecked` | **Dialog Radio Button Checked** | Controls the color of dialog radio button checked in Telegram Android UI. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogRoundCheckBox` | **Dialog Round Check Box** | Sets the circle background that appears when you select chats you want to forward messages to on the forward panel. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogRoundCheckBoxCheck` | **Dialog Round Check Box Check** | Sets the color of the check mark on that circle. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogScrollGlow` | **Dialog Scroll Glow** | Sets the glow color you can see when you quickly scroll the attach panel. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |
| `dialogTextBlack` | **Dialog Primary Text** | Sets the color of almost all text on dialogs. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#ffffff` | - |
| `dialogTextGray2` | **Dialog Text Gray 2** | Sets the color of descriptions on the attach panel. | Modal Dialogs / Popups / Bottom Sheets | `#ffffff` / `#000000` | - |

---

## <a id="settings_controls"></a>9. Settings, Toggles & Forms (116 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `changephoneinfo_image` | **Changephoneinfo Image** | Sets the color of two SIM-cards and arrow between them in Settings → Phone. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachCameraIcon1` | **Chat Attach Camera Icon 1** | Controls the color of chat attach camera icon 1 in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachCameraIcon2` | **Chat Attach Camera Icon 2** | Controls the color of chat attach camera icon 2 in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachCameraIcon3` | **Chat Attach Camera Icon 3** | Controls the color of chat attach camera icon 3 in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachCameraIcon4` | **Chat Attach Camera Icon 4** | Controls the color of chat attach camera icon 4 in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachCameraIcon5` | **Chat Attach Camera Icon 5** | Controls the color of chat attach camera icon 5 in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachCameraIcon6` | **Chat Attach Camera Icon 6** | Controls the color of chat attach camera icon 6 in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachContactBackground` | **Chat Attach Contact Background** | Controls the color of chat attach contact background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachContactIcon` | **Chat Attach Contact Icon** | Controls the color of chat attach contact icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachFileBackground` | **Chat Attach File Background** | Controls the color of chat attach file background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachFileIcon` | **Chat Attach File Icon** | Controls the color of chat attach file icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachGalleryBackground` | **Chat Attach Gallery Background** | Controls the color of chat attach gallery background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachGalleryIcon` | **Chat Attach Gallery Icon** | Controls the color of chat attach gallery icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachHideBackground` | **Chat Attach Hide Background** | Controls the color of chat attach hide background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachHideIcon` | **Chat Attach Hide Icon** | Controls the color of chat attach hide icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachLocationBackground` | **Chat Attach Location Background** | Controls the color of chat attach location background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachLocationIcon` | **Chat Attach Location Icon** | Controls the color of chat attach location icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachMusicBackground` | **Chat Attach Music Background** | Controls the color of chat attach music background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachMusicIcon` | **Chat Attach Music Icon** | Controls the color of chat attach music icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachSendBackground` | **Chat Attach Send Background** | Controls the color of chat attach send background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachSendIcon` | **Chat Attach Send Icon** | Controls the color of chat attach send icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachVideoBackground` | **Chat Attach Video Background** | Controls the color of chat attach video background in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_attachVideoIcon` | **Chat Attach Video Icon** | Controls the color of chat attach video icon in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_lockIcon` | **Chat Lock Icon** | secret chat padlock icon | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_muteIcon` | **Chat Mute Icon** | "Muted" icon by recipient name | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `chat_status` | **Chat Status** | "Online" status below contact name in top bar | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `checkbox` | **Checkbox** | background of "selected" chat tickmark icon | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `checkboxSquareBackground` | **Checkbox Square Background** | Sets the background of a checkbox when it's checked. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `checkboxSquareCheck` | **Checkbox Square Check** | Sets the color of the check mark when the checkbox is checked. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `checkboxSquareDisabled` | **Checkbox Square Disabled** | Sets the background of a checkbox when it's disabled. Like in Settings of a group that's not converted to a supergroup. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `checkboxSquareUnchecked` | **Checkbox Square Unchecked** | Sets the border of a checkbox when it's unchecked. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `contextProgressInner1` | **Context Progress Inner 1** | Sets the progress indicator when an edited message is being saved. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `contextProgressInner2` | **Context Progress Inner 2** | Sets the progress indicator on the action bar when a group is being created or a game is being loaded. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `contextProgressInner3` | **Context Progress Inner 3** | Sets the progress indicator on the top bar when opening a link using Instant View. These variables can be changed only with .attheme editor. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `contextProgressOuter1` | **Context Progress Outer 1** | Sets the progress indicator when an edited message is being saved. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `contextProgressOuter2` | **Context Progress Outer 2** | Sets the progress indicator on the action bar when a group is being created or a game is being loaded. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `contextProgressOuter3` | **Context Progress Outer 3** | Sets the progress indicator on the top bar when opening a link using Instant View. These variables can be changed only with .attheme editor. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `divider` | **List Divider Lines** | Sets the color of gray lines that divide items of lists. (dividing line between clickable items) | Settings Screen & In-App Menus | `#111921` / `#111921` | - |
| `emptyListPlaceholder` | **Empty List Placeholder** | Sets the color of placeholder text — the text that you see if there's no content — when you open an empty list. You can see it in Chat screen → Attach — Music if you don't have any music. If you do, you can move them from the Music folder for a moment and move them back after you're done. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `files_folderIcon` | **Files Folder Icon** | Sets the folder icon. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `files_folderIconBackground` | **Files Folder Icon Background** | Sets the circle background below the folder icon. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `files_iconText` | **Files Icon Text** | Sets the file icon extension text. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `graySection` | **Gray Section** | Sets the header background color of divider bars in Search Results ("Global search", "Messages") and Settings/Contacts ("Contacts"). If omitted or left unset in dark themes, Telegram falls back to stock light mode, causing glaring solid white bars. The title on this header is set by windowBackgroundWhiteGrayText2 and key_graySectionText. (dark between cards in "Saved Messages"/"New Message" dialogue) | Settings Screen & In-App Menus | `#131b24` / `#f0f2f5` | - |
| `key_graySectionText` | **Gray Section Text** | Sets the text color inside section header bars (e.g. "Global search", "Messages", "Show more", "From all chats", and month headers in "Saved Messages"). Pairs directly with graySection. | Settings Screen & In-App Menus | `#7f93a5` / `#708291` | - |
| `graySectionText` | **Gray Section Text (Alias)** | Official Telegram theme alias for key_graySectionText across Android and forks. | Settings Screen & In-App Menus | `#7f93a5` / `#708291` | - |
| `listSelectorSDK21` | **List Selector SDK21** | Sets the color of the ripple effect when you tap a list item. (ripple overlay when pressing list/menu item (dimmed)) | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `location_markerX` | **Location Marker X** | Sets the color of the × below the red location icon when you move it across the map. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `location_sendLocationBackground` | **Location Send Location Background** | Sets the background of the button beside the “Send selected/your current location”. Important note: you must re-enter the screen to see the actual color of the button if you change the variable with the in-app editor. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `location_sendLocationIcon` | **Location Send Location Icon** | Set the icon on the button. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `login_progressInner` | **Login Progress Inner** | Sets the timer counting progress indicator when you're signing in and waiting for a call from Telegram that it will process automatically (usually Telegram makes a call when you're signed in another device but you can't access it to get the sign in code). | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `login_progressOuter` | **Login Progress Outer** | Sets the timer counting progress indicator when you're signing in and waiting for a call from Telegram that it will process automatically. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `musicPicker_buttonBackground` | **Music Picker Button Background** | The background of the icon from your music gallery. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `musicPicker_buttonIcon` | **Music Picker Button Icon** | The icon music inside musicPicker_buttonBackground. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `musicPicker_checkbox` | **Music Picker Checkbox** | The background of the check on the selected music. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `musicPicker_checkboxCheck` | **Music Picker Checkbox Check** | The check icon inside musicPicker_checkbox. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `picker_badge` | **Picker Badge** | The background of the send counter. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `picker_badgeText` | **Picker Badge Text** | The number inside the circle. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `picker_disabledButton` | **Picker Disabled Button** | The color of the “send” button when you haven't picked anything yet. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `picker_enabledButton` | **Picker Enabled Button** | the color of the “send” button when you have picked items. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_actionBar` | **Player Action Bar** | Set the same things actionBarDefault, actionBarDefaultIcon, actionBarDefaultTitle, actionBarDefaultSubtitle and actionBarDefaultSelector respectively do. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_actionBarItems` | **Player Header Items** | Controls the color of player header items in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_actionBarSelector` | **Player Header Selector** | Controls the color of player header selector in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_actionBarSubtitle` | **Player Header Subtitle** | Controls the color of player header subtitle in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_actionBarTitle` | **Player Header Title** | Controls the color of player header title in Telegram Android UI. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_actionBarTop` | **Player Header Top** | Sets the status bar background color on Android 5.0 and higher, and, unlike in any other case, it's not darkened by 20% (if you want to do it, set the value to 0, 0, 0, 51). Setting the alpha channel of this variable to zero fallbacks to player_actionBar. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_background` | **Player Background** | Sets the background of the panel and also the seekbar panel. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_button` | **Player Button** | Sets the color of non-pressed or inactive buttons. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_buttonActive` | **Player Button Active** | Sets the color of pressed or active buttons. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_placeholder` | **Player Placeholder** | Sets the color of the placeholder icon. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_placeholderBackground` | **Player Placeholder Background** | Sets the background color of the placeholder. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_progress` | **Player Progress** | Sets the played part indicator. (foreground/dot of all progress bars/sliders in settings) | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_progressBackground` | **Player Progress Background** | Sets the unplayed part indicator. (dimmed darker line of all progress bars/sliders in settings) | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `player_time` | **Player Time** | Sets the color of the track duration and the played part time. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `progressCircle` | **Progress Circle** | Sets the color of the loading indicator below lists. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `sessions_devicesImage` | **Sessions Devices Image** | Sets the color of phone and tablet image when you signed in only on one device, shown in Settings → Privacy and Security → Active Sessions. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `stickers_menu` | **Stickers Menu** | Sets the color of three dots icon beside a sticker pack or a theme. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `stickers_menuSelector` | **Stickers Menu Selector** | Sets the ripple color when you tap the three dots icon. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `switchThumb` | **Switch Thumb** | Sets the color of a switch thumb — the circle at the end of a switch — when the switch is turned off. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `switchThumbChecked` | **Toggle Switch (Active Thumb)** | Sets the color of a switch thumb when the switch is turned on. | Settings Screen & In-App Menus | `#ffffff` / `#ffffff` | - |
| `switchTrack` | **Switch Track** | Sets the color of a switch track — its background — when the switch is turned off. (toggle switch icon when disabled - also hue of 2/3 line preview in settings) | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `switchTrackChecked` | **Toggle Switch (Active Track)** | Sets the color of a switch track when it's turned on. (toggle switch icon when enabled) | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundGrayLine` | **Window Gray Line** | Sets the border color of this element. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundGrayShadow` | **Window Gray Shadow** | Sets the shadow color between sections in Settings. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteBlackText` | **Window White Black Text** | Sets the track title color. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | Sets primary text across the app. Also affects bot inline search query text inside chat panels. |
| `windowBackgroundWhiteBlueButton` | **Settings In-List Button** | In-list accent buttons across settings | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteBlueHeader` | **Settings Section Headers** | Sets the color of section header in Settings. (/!\ title of settings menu items) | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteBlueIcon` | **Settings Accent Icon** | Accent icons in settings rows and menus | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteBlueText` | **Settings Action Text / Icon** | Sets the color of the Online status text in Contacts. | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteBlueText2` | **Settings Action Text 2** | Secondary accent text in settings | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteBlueText3` | **Window White Blue Text 3** | Sets the color of the Online status text in search results. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteBlueText4` | **Settings Action Text 4** | Sets the color of the “Change Number” button in Settings → Phone and also sets the match highlights in search results. ("change chat background" text/icon) | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteBlueText5` | **Window White Blue Text 5** | Sets the color of “Create Channel” button in “What is a Channel?” screen that appears when you try to create a new channel (unless you already have one). If the screen doesn’t appear to you, then use .attheme editor to change this variable. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteBlueText6` | **Window White Blue Text 6** | Sets the color of the pay button after you entered all payment data when you’re buying something. You can make a fake pay with @ShopBot to see the button or use .attheme editor to add change the variable. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteBlueText7` | **Window White Blue Text 7** | Sets the “Send your current location” button color in location attachment screen. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText` | **Window White Gray Text** | Sets the last seen time color in Contacts. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText2` | **Window White Gray Text 2** | Sets the color of the performer's name. (subtitle text for text items with descriptors (mobile, username etc.)) | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText3` | **Window White Gray Text 3** | Sets the color of a session’s IP in Settings → Privacy and Security → Active Sessions. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText4` | **Window White Gray Text 4** | Sets the color of description texts below sections in Settings. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText5` | **Window White Gray Text 5** | Sets the color of Telegram version at the bottom in Settings. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText6` | **Window White Gray Text 6** | Sets the color of description texts below text fields like in Settings → Phone → Change Number and the color of the info text in “What is a Channel?” screen that appears when you try to create a channel (unless you already have one). Be careful: this variable sets the color of text like “Please enter your password” on the gray background in Settings → Privacy and Security → Two-step Verification/Passcode Lock when you have either a two-step or a passcode lock password when you have (one of) them set. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText7` | **Window White Gray Text 7** | Sets the color of a disabled item in Settings → Privacy and Security → Passcode Lock when you have no passcode lock. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGrayText8` | **Window White Gray Text 8** | Sets the color of the info text in Settings → Username. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGreenText` | **Window White Green Text** | Sets the color of success text below text fields like in Settings → Username when you take a username no one has and longer than 5 symbols. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteGreenText2` | **Window White Green Text 2** | Sets the color of green buttons like “Start Secret Chat” in the chat with a person info screen. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteHintText` | **Window White Hint Text** | Sets the color of an input's placeholder — it's the text that you see before you enter any text. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteIcon` | **Window White Icon** | Sets the color of icons. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteInputField` | **Window White Input Field** | Sets the bottom border color when the input is inactive. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteInputFieldActivated` | **Window White Input Field Activated** | Sets the bottom border color when the input is active. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteLinkSelection` | **Window White Link Selection** | Sets the overlay color that appears when you tap a link. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteLinkText` | **Settings Hyperlink Text** | Sets the color of links, like #hashtags, @usernames or just links in the chat info screen. | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |
| `windowBackgroundWhiteRedText` | **Window White Red Text** | Sets the color of red buttons on dialogs like the “Clear Cache” button in Settings → Data and Storage → Storage Usage → Clear Cache. You can’t change this variable with the in-app editor for unknown reasons, so you have to use .attheme editor to change this variable. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteRedText2` | **Window White Red Text 2** | Sets the color of red buttons in Settings like the “Terminate All Other Sessions” button in Settings → Privacy and Security → Active Sessions. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteRedText3` | **Window White Red Text 3** | Sets the color of the “Abort two-step verification setup” button in Settings → Privacy and Security → Two-step Verification while setting up a two-step password. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteRedText4` | **Window White Red Text 4** | Sets the color of warning text below a text field like in Settings → Username when you try to take a username less than 5 symbols or already taken. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteRedText5` | **Window White Red Text 5** | Sets the color of warning buttons like “Leave Channel” in the channel info screen. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteRedText6` | **Window White Red Text 6** | Sets the color of “Reset my account” button when you try to sign in your account that has a two-step verification password but you don’t remember it, try to restore it with your email but you can’t access it. This variable can’t be changed with the in-app editor (because it closes after you sign out), so you have to use .attheme editor to change this variable. | Settings Screen & In-App Menus | `#ffffff` / `#000000` | - |
| `windowBackgroundWhiteValueText` | **Settings Badge & Value Text** | Sets the option value color in Settings. | Settings Screen & In-App Menus | `#4ea4f5` / `#4ea4f5` | - |

---

## <a id="drawer_menu"></a>10. Navigation Drawer (Menu) (10 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chats_menuBackground` | **Chat List Menu Background** | Sets the background color of the left panel. (background of sidebar menu) | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuItemIcon` | **Chat List Menu Item Icon** | icons for elements in sidebar menu | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuItemText` | **Chat List Menu Item Text** | Sets the text color on the left panel. (text for elements in sidebar menu) | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuName` | **Chat List Menu Name** | username in sidebar menu (also day/night toggle) | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuPhone` | **Chat List Menu Phone** | phone number in sidebar menu | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuPhoneCats` | **Chat List Menu Phone Cats** | same as chats_menuPhone, sometimes? | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuTopBackground` | **Chat List Menu Top Background** | background for section of sidebar menu containing username | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuTopBackgroundCats` | **Chat List Menu Top Background Cats** | /!\ Unknown /!\ | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuTopShadow` | **Chat List Menu Top Shadow** | /!\ unknown /!\ | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |
| `chats_menuTopShadowCats` | **Chat List Menu Top Shadow Cats** | bottom "shadow" for section of sidebar menu containing username | Left Navigation Drawer (Hamburger) | `#ffffff` / `#000000` | - |

---

## <a id="contacts_calls"></a>11. Contacts & Calls (13 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `calls_callReceivedGreenIcon` | **Calls Call Received Green Icon** | Sets the color of successful call in calls log or chat screen. | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `calls_callReceivedRedIcon` | **Calls Call Received Red Icon** | Sets the color of failure call in calls log or chat screen. | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `calls_ratingStar` | **Calls Rating Star** | Sets the border color of unchosen stars on the prompt. | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `calls_ratingStarSelected` | **Calls Rating Star Selected** | Sets the fill color of chosen stars on the prompt. | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `chats_callRecievedGreenIcon` | **Chat List Call Recieved Green Icon** | arrow in calls screen of [failed/successful] calls | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `chats_callRecievedRedIcon` | **Chat List Call Recieved Red Icon** | arrow in calls screen of [failed/successful] calls | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `contacts_inviteBackground` | **Contacts Invite Background** | Sets the background of the bottom hint on the “Invite friends” screen. | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `contacts_inviteText` | **Contacts Invite Text** | Sets the text color of the hint. | Contacts & Call Logs Screen | `#ffffff` / `#000000` | - |
| `fastScrollActive` | **Contacts Alphabet Fast Scroll (Active)** | Sets the color of the scrollbar when you hold and move it and the bubble that contains the letter on where you are. (Color of alphabet index letter indicator while actively dragging the fast scroll bar in Contacts.) | Contacts Screen > Right edge alphabet scroll | `#4ea4f5` / `#527da3` | Shows floating popup balloon with currently selected letter. |
| `fastScrollInactive` | **Contacts Alphabet Fast Scroll (Inactive)** | Sets the color of the scrollbar when not pressed. (Color of vertical alphabet index scrubber strip when idle in Contacts.) | Contacts Screen > Right edge alphabet scroll | `#566675` / `#808080` | Subtle scroll strip on the far right. |
| `fastScrollText` | **Contacts Alphabet Fast Scroll Text** | Sets the color of the letter inside the bubble when you hold and move the scrollbar. (Font color of letter indicators on the fast scroll bubble in Contacts.) | Contacts Screen > Floating letter bubble | `#ffffff` / `#ffffff` | Contrasts against fastScrollActive indicator. |
| `returnToCallBackground` | **Return To Call Banner Background** | Green top banner background shown when navigating away from an ongoing voice or video call. | Global Top Header > Active call banner | `#388e3c` / `#44a542` | Allows user to return to ongoing call with 1 tap. |
| `returnToCallText` | **Return To Call Banner Text** | Title and call duration timer text inside the return to call top banner. | Global Top Header > Active call banner | `#ffffff` / `#ffffff` | High contrast against returnToCallBackground. |

---

## <a id="in_app_player"></a>12. In-App Music Player (5 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `inappPlayerBackground` | **In-App Player Background** | Sets the background color of the in-app player panel. (background of mini music player) | In-App Mini Music Player Bar | `#ffffff` / `#000000` | - |
| `inappPlayerClose` | **In-App Player Close** | Sets the color of the close button inside the in-app player panel. (close (x) icon of mini music player) | In-App Mini Music Player Bar | `#ffffff` / `#000000` | - |
| `inappPlayerPerformer` | **In-App Player Performer** | Sets the text color of who performed the audio/song playing on the in-app player panel. (artist of mini music player) | In-App Mini Music Player Bar | `#ffffff` / `#000000` | - |
| `inappPlayerPlayPause` | **In-App Player Play Pause** | Sets the color of the play/pause button of the in-app player panel. (play/pause icon of mini music player) | In-App Mini Music Player Bar | `#ffffff` / `#000000` | - |
| `inappPlayerTitle` | **In-App Player Title** | Sets the text color on the in-app player panel: for songs it sets the color song's name color, for voice messages shows when it was sent, for example yesterday at 08:05 A.M. (track title of mini music player) | In-App Mini Music Player Bar | `#ffffff` / `#000000` | - |

---

## <a id="stickers_emojis"></a>13. Stickers & Emoji Sheet (17 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chat_emojiPanelBackground` | **Chat Emoji Panel Background** | Sets the background color of panel for emojis, saved stickers, sticker packs in preview and bot keyboard below message panel with alpha value been layered on black. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelBackspace` | **Chat Emoji Panel Backspace** | Sets the color of the backspace icon to delete last emoji added in message while still editing. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelEmptyText` | **Chat Emoji Panel Empty Text** | Sets the color of the “No recent” text if no emoji is used or list cleared and recent list with clock icon is empty. To clear recent list, select and hold any recent emoji that doesn't have skin tones variations and confirm Clear in dialog. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelIcon` | **Chat Emoji Panel Icon** | Sets the color of all icons in horizontally scrollable row below message panel in emoji and sticker panel, except actually selected emoji set. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelIconSelected` | **Chat Emoji Panel Icon Selected** | Sets the color of the emoji set selected icon. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelIconSelector` | **Chat Emoji Panel Icon Selector** | Sets the color of a line that indicates actual emoji set on chat_emojiPanelShadowLine. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelStickerPackSelector` | **Chat Emoji Panel Sticker Pack Selector** | Sets the square background color on actual selected sticker pack. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelStickerSetName` | **Chat Emoji Panel Sticker Set Name** | Sets the color of sticker packs titles when scrolling. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `chat_emojiPanelStickerSetNameIcon` | **Chat Emoji Panel Sticker Set Name Icon** | Sets the color of the remove or setting icon beside group stickers title. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `featuredStickers_addButton` | **Primary Action Buttons** | Sets the background of the “Add” buttons. (/!\ also affects phone icon in calls list screen) | Emoji, Sticker & GIF Bottom Sheet | `#4ea4f5` / `#4ea4f5` | - |
| `featuredStickers_addButtonSelected` | **Featured Stickers Add Button Selected** | Sets the background of an “Add” button when you press the button. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `featuredStickers_addedIcon` | **Featured Stickers Added Icon** | Sets the color of the check mark you can see beside an added sticker pack or selected theme. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `featuredStickers_buttonProgress` | **Featured Stickers Button Progress** | Sets the color of the progress circle when a sticker pack is being added or removed (on chat emoji panel). | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `featuredStickers_buttonText` | **Action Button Text** | Sets the color of the “Add” or “Remove” (on chat emoji panel) text on buttons. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#ffffff` | - |
| `featuredStickers_delButton` | **Featured Stickers Del Button** | Sets the background of "Remove" button in Trending Stickers section. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `featuredStickers_delButtonPressed` | **Featured Stickers Del Button Pressed** | Sets the background of "Remove" button when pressed in Trending Stickers section. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |
| `featuredStickers_unread` | **Featured Stickers Unread** | Sets the blue dot color near the sticker pack title. | Emoji, Sticker & GIF Bottom Sheet | `#ffffff` / `#000000` | - |

---

## <a id="media_viewer"></a>14. Fullscreen Media Viewer (5 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chat_mediaMenu` | **Chat Media Menu** | /!\ unknown /!\ | Fullscreen Media Viewer Overlay | `#ffffff` / `#000000` | - |
| `chat_mediaSentCheck` | **Chat Media Sent Check** | outbound image sent tickmark | Fullscreen Media Viewer Overlay | `#ffffff` / `#000000` | Must be specified in custom themes; otherwise Telegram Android falls back to official bright green checkmarks. |
| `chat_mediaSentClock` | **Chat Media Sent Clock** | outbound image sending clock icon | Fullscreen Media Viewer Overlay | `#ffffff` / `#000000` | - |
| `chat_mediaTimeText` | **Chat Media Time Text** | sent timestamp on media messages (images etc.) | Fullscreen Media Viewer Overlay | `#ffffff` / `#000000` | - |
| `chat_mediaViews` | **Chat Media Views** | views (eye) icon on images in group chats | Fullscreen Media Viewer Overlay | `#ffffff` / `#000000` | - |

---

## <a id="profile"></a>15. User & Channel Profile (12 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `avatar_backgroundActionBarBlue` | **Avatar Background Header Blue** | top bar background (with profile pic and contact name) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `avatar_backgroundInProfileBlue` | **Avatar Background In Profile Blue** | Controls the color of avatar background in profile blue in Telegram Android UI. | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_actionBackground` | **Profile Action Background** | Sets the button background. ([icon/background/background when tapped] of FAB in profile/setttings screen) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_actionIcon` | **Profile Action Icon** | Sets the color of the icon near the profile. In groups where you are an admin this icon is “Set picture icon”, while looking at profiles it's “New Message” button or “Move to current location” on the location attach screen. ([icon/background/background when tapped] of FAB in profile/setttings screen) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_actionPressedBackground` | **Profile Action Pressed Background** | Sets the button overlay when it's pressed. ([icon/background/background when tapped] of FAB in profile/setttings screen) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_status` | **Profile Status** | text of contact [name/status]\(online, etc.) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_tabSelectedLine` | **Profile Tab Selected Line** | [text/line below] media type active tab - also in chats list when multiple chats selected | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_tabSelectedText` | **Profile Tab Selected Text** | [text/line below] media type active tab - also in chats list when multiple chats selected | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_tabText` | **Profile Tab Text** | name of media type inactive tab - also in chats list when multiple chats selected | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_title` | **Profile Title** | text of contact [name/status]\(online, etc.) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_verifiedBackground` | **Profile Verified Background** | "verified" chat [tickmark/background] (same as chats_verified[…]) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |
| `profile_verifiedCheck` | **Profile Verified Check** | "verified" chat [tickmark/background] (same as chats_verified[…]) | User / Channel / Group Profile Screen | `#ffffff` / `#000000` | - |

---

## <a id="avatars"></a>16. Avatars & Member Colors (18 variables)

| Key | Label | Description | UI Location | Default (Dark / Light) | Tips / Pitfalls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `avatar_background2Blue` | **Avatar Background 2Blue** | Secondary gradient stop for user placeholder avatar circle (Blue). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_background2Cyan` | **Avatar Background 2Cyan** | Secondary gradient stop for user placeholder avatar circle (Cyan). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_background2Green` | **Avatar Background 2Green** | Secondary gradient stop for user placeholder avatar circle (Green). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_background2Orange` | **Avatar Background 2Orange** | Secondary gradient stop for user placeholder avatar circle (Orange). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_background2Pink` | **Avatar Background 2Pink** | Secondary gradient stop for user placeholder avatar circle (Pink). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_background2Red` | **Avatar Background 2Red** | Secondary gradient stop for user placeholder avatar circle (Red). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_background2Saved` | **Saved Messages Avatar Gradient** | Secondary gradient stop for Saved Messages avatar icon | Default User Placeholder Avatars | `#3a8ecc` / `#3a8ecc` | - |
| `avatar_background2Violet` | **Avatar Background 2Violet** | Secondary gradient stop for user placeholder avatar circle (Violet). | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundBlue` | **Avatar Background Blue** | Background circle color for user placeholder avatar (Blue) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundColour` | **Avatar Background Colour** | background of placeholder avatar for contact with no profile pic | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundCyan` | **Avatar Background Cyan** | Background circle color for user placeholder avatar (Cyan) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundGreen` | **Avatar Background Green** | Background circle color for user placeholder avatar (Green) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundOrange` | **Avatar Background Orange** | Background circle color for user placeholder avatar (Orange) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundPink` | **Avatar Background Pink** | Background circle color for user placeholder avatar (Pink) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundRed` | **Avatar Background Red** | Background circle color for user placeholder avatar (Red) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_backgroundSaved` | **Saved Messages Avatar Background** | Bookmark avatar circle background color for Saved Messages (prevents default blue) | Default User Placeholder Avatars | `#4ea4f5` / `#4ea4f5` | - |
| `avatar_backgroundViolet` | **Avatar Background Violet** | Background circle color for user placeholder avatar (Violet) when user has no custom profile picture. | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |
| `avatar_text` | **Avatar Text** | Sets the color of the letters on unloaded avatars. (user initials of placeholder avatar for contact with no profile pic) | Default User Placeholder Avatars | `#ffffff` / `#000000` | - |

---

