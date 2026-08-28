# Dara Pichmony Water Station Customer Payment & Piped Water Supply Portal

Professional web portal for managing direct piped water connections, automated meter reading (AMR), and customer billing in Cambodia (1 m³ = 2,500 ៛).

## Project Structure
```
├── index.html        # Main entry point & Single Page Application views
├── styles.css        # Modern design system (Dark & Light theme, glassmorphism)
├── app.js            # Core application state, billing engine, and dashboard logic
├── server.ps1        # Local PowerShell HTTP listener
├── src/
│   ├── css/          # Modular stylesheets
│   └── js/           # Modular components & utilities
├── assets/           # Images, logos, and badges
└── docs/             # API & User guides
```

## Running the Application
Run the PowerShell server script:
```powershell
.\server.ps1
```
Then open `http://localhost:5500` in your browser.

## Real Gmail Invoice Delivery
This project can send real digital invoices by calling a Python SMTP backend.

1. Copy `.env.example` to `.env` and fill in your Gmail app password.
2. Start the backend:
```powershell
$env:SMTP_USER="your-gmail@gmail.com"
$env:SMTP_PASS="your-16-char-app-password"
$env:TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
$env:TELEGRAM_CHAT_ID="your-channel-chat-id"
$env:FRONTEND_ORIGIN="https://your-frontend-domain.com"
python .\invoice_server.py
```
3. Add your bot as an administrator of the Telegram channel, then open the app in the browser and register or pay. The invoice will be emailed and a notification will be posted to Telegram automatically.

Important: Gmail requires an App Password, not your normal account password.

### Telegram Bot Setup
1. Open Telegram and message `@BotFather`.
2. Run `/newbot` and copy the generated bot token.
3. Add the bot to your channel as an administrator with permission to post messages.
4. Set `TELEGRAM_CHAT_ID` to the channel ID, usually formatted like `-1001234567890`.
