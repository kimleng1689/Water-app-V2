import json
import os
import smtplib
import urllib.request
import urllib.error
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse


def load_env_file(path='.env'):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_env_file()

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER)
PORT = int(os.getenv('PORT', '5000'))
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')


def send_invoice_email(to_email: str, subject: str, html_body: str, text_body: str):
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError('Gmail credentials are missing. Set SMTP_USER and SMTP_PASS in your environment.')

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM or SMTP_USER
    msg['To'] = to_email
    msg.set_content(text_body or 'Dara Pichmony Digital Invoice')
    msg.add_alternative(html_body or text_body, subtype='html')

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)

    return True


def send_telegram_alert(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        raise RuntimeError('Telegram settings are missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.')

    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    payload = json.dumps({
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'disable_web_page_preview': True
    }).encode('utf-8')
    request = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=15) as response:
        result = json.loads(response.read().decode('utf-8'))
    if not result.get('ok'):
        raise RuntimeError(result.get('description', 'Telegram rejected the message.'))
    return True


class InvoiceHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', os.getenv('FRONTEND_ORIGIN', '*'))
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True, 'message': 'Dara Pichmony invoice server is running'}).encode('utf-8'))
            return

        self.send_response(404)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'ok': False, 'message': 'Not found'}).encode('utf-8'))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/send-invoice':
            self.send_response(404)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'message': 'Endpoint not found'}).encode('utf-8'))
            return

        content_length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(content_length)

        try:
            data = json.loads(raw.decode('utf-8'))
        except Exception:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'message': 'Invalid JSON payload'}).encode('utf-8'))
            return

        to_email = (data.get('to') or '').strip()
        subject = (data.get('subject') or 'Dara Pichmony Digital Invoice').strip()
        html_body = data.get('html', '')
        text_body = data.get('text', '')
        telegram_message = data.get('telegramMessage') or text_body or f'Dara Pichmony invoice: {subject}'

        if not to_email:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'message': 'Recipient email is required'}).encode('utf-8'))
            return

        email_error = None
        telegram_error = None
        try:
            send_invoice_email(to_email, subject, html_body, text_body)
        except Exception as exc:
            email_error = str(exc)

        try:
            send_telegram_alert(telegram_message)
        except Exception as exc:
            telegram_error = str(exc)

        notification_success = not email_error and not telegram_error
        self.send_response(200 if notification_success else 207)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        if notification_success:
            self.wfile.write(json.dumps({'success': True, 'message': 'Invoice email and Telegram alert sent successfully'}).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({
                'success': False,
                'message': 'One or more notifications failed',
                'emailError': email_error,
                'telegramError': telegram_error
            }).encode('utf-8'))

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    print(f'Dara Pichmony invoice backend starting on http://localhost:{PORT}')
    server = HTTPServer(('0.0.0.0', PORT), InvoiceHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping Dara Pichmony invoice backend...')
    finally:
        server.server_close()
