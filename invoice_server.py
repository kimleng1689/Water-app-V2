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
PORT = int(os.getenv('PORT', '5001'))
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '7333913194:AAGRlt0taKxivhRjbkISqVzWJygOJs3n5pw')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '-1002860171047')


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


def send_telegram_alert(message: str, reply_markup=None):
    token = os.getenv('TELEGRAM_BOT_TOKEN', '7333913194:AAGRlt0taKxivhRjbkISqVzWJygOJs3n5pw')
    chat_id = os.getenv('TELEGRAM_CHAT_ID', '-1002860171047')
    if not token or not chat_id:
        raise RuntimeError('Telegram settings are missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.')

    url = f'https://api.telegram.org/bot{token}/sendMessage'
    try:
        chat_id_val = int(chat_id)
    except ValueError:
        chat_id_val = chat_id

    # Default reply markup button if none provided
    if reply_markup is None:
        reply_markup = {
            'inline_keyboard': [
                [
                    {'text': '📞 ទំនាក់ទំនងជំនួយ (Support)', 'url': 'https://t.me/moung_kimleng'}
                ]
            ]
        }

    # 1. Try HTML formatting with buttons
    try:
        body = {
            'chat_id': chat_id_val,
            'text': message,
            'parse_mode': 'HTML',
            'disable_web_page_preview': True
        }
        if reply_markup:
            body['reply_markup'] = reply_markup
        payload = json.dumps(body).encode('utf-8')
        request = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
        if result.get('ok'):
            return True
    except Exception:
        pass

    # 2. Try HTML formatting without buttons (in case button URL was invalid)
    try:
        body = {
            'chat_id': chat_id_val,
            'text': message,
            'parse_mode': 'HTML',
            'disable_web_page_preview': True
        }
        payload = json.dumps(body).encode('utf-8')
        request = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
        if result.get('ok'):
            return True
    except Exception:
        pass

    # 3. Fallback to plain text
    payload = json.dumps({
        'chat_id': chat_id_val,
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

    def _send_json_response(self, status_code, data):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self._send_json_response(200, {'ok': True, 'message': 'Dara Pichmony invoice server is running'})
            return

        self._send_json_response(404, {'ok': False, 'message': 'Not found'})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/send-invoice' and parsed.path != '/api/send-telegram':
            self._send_json_response(404, {'success': False, 'message': 'Endpoint not found'})
            return

        content_length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(content_length)

        try:
            data = json.loads(raw.decode('utf-8'))
        except Exception:
            self._send_json_response(400, {'success': False, 'message': 'Invalid JSON payload'})
            return

        to_email = (data.get('to') or '').strip()
        subject = (data.get('subject') or 'Dara Pichmony Digital Invoice').strip()
        html_body = data.get('html', '')
        text_body = data.get('text', '')
        telegram_message = data.get('telegramMessage') or text_body or f'Dara Pichmony invoice: {subject}'

        email_error = None
        telegram_error = None

        if to_email and SMTP_USER and SMTP_PASS:
            try:
                send_invoice_email(to_email, subject, html_body, text_body)
            except Exception as exc:
                email_error = str(exc)
        else:
            if not (SMTP_USER and SMTP_PASS):
                email_error = 'Gmail SMTP credentials not set (skipped)'
            elif not to_email:
                email_error = 'No recipient email provided (skipped)'

        try:
            send_telegram_alert(telegram_message)
        except Exception as exc:
            telegram_error = str(exc)

        is_success = (telegram_error is None)
        status_code = 200 if is_success else 400
        self._send_json_response(status_code, {
            'success': is_success,
            'telegramSent': telegram_error is None,
            'emailSent': email_error is None and bool(to_email and SMTP_USER and SMTP_PASS),
            'message': 'Telegram notification sent successfully' if is_success else f'Telegram notification failed: {telegram_error}',
            'emailError': email_error,
            'telegramError': telegram_error
        })


if __name__ == '__main__':
    print(f'Dara Pichmony invoice backend starting on http://localhost:{PORT}')
    server = HTTPServer(('0.0.0.0', PORT), InvoiceHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping Dara Pichmony invoice backend...')
    finally:
        server.server_close()
