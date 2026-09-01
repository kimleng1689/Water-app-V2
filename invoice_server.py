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
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))
SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'true').strip().lower() in ('1', 'true', 'yes', 'on')
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER)
PORT = int(os.getenv('PORT', '5001'))
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '7333913194:AAGRlt0taKxivhRjbkISqVzWJygOJs3n5pw')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '-1002860171047')


def send_invoice_email(to_email: str, subject: str, html_body: str, text_body: str):
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError('SMTP credentials are missing. Set SMTP_USER and SMTP_PASS in your environment.')

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM or SMTP_USER
    msg['To'] = to_email
    msg.set_content(text_body or 'Dara Pichmony Digital Invoice')
    msg.add_alternative(html_body or text_body, subtype='html')

    errors = []
    connection_attempts = []

    if SMTP_USE_SSL or SMTP_PORT == 465:
        connection_attempts.append(('SSL', lambda: smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT)))
    else:
        connection_attempts.append(('STARTTLS', lambda: smtplib.SMTP(SMTP_HOST, SMTP_PORT)))

    if not SMTP_USE_SSL and SMTP_PORT != 465:
        connection_attempts.append(('STARTTLS_FALLBACK', lambda: smtplib.SMTP(SMTP_HOST, 587)))
        connection_attempts.append(('SSL_FALLBACK', lambda: smtplib.SMTP_SSL(SMTP_HOST, 465)))

    for mode, factory in connection_attempts:
        try:
            with factory() as server:
                if mode.startswith('STARTTLS'):
                    try:
                        server.starttls()
                    except Exception:
                        pass
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            return True
        except Exception as exc:
            errors.append(f'{mode}: {exc}')

    raise RuntimeError('SMTP delivery failed: ' + ' | '.join(errors) if errors else 'SMTP delivery failed')


def send_telegram_alert(message: str, reply_markup=None):
    token = os.getenv('TELEGRAM_BOT_TOKEN', TELEGRAM_BOT_TOKEN)
    chat_id = os.getenv('TELEGRAM_CHAT_ID', TELEGRAM_CHAT_ID)
    if not token or not chat_id:
        raise RuntimeError('Telegram settings are missing. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.')

    url = f'https://api.telegram.org/bot{token}/sendMessage'
    try:
        chat_id_val = int(chat_id)
    except ValueError:
        chat_id_val = chat_id

    default_markup = {
        'inline_keyboard': [[{'text': '📞 ទំនាក់ទំនងជំនួយ (Support)', 'url': 'https://t.me/moung_kimleng'}]]
    }
    request_markup = reply_markup or default_markup

    for body in (
        {
            'chat_id': chat_id_val,
            'text': message,
            'parse_mode': 'HTML',
            'disable_web_page_preview': True,
            'reply_markup': request_markup,
        },
        {
            'chat_id': chat_id_val,
            'text': message,
            'parse_mode': 'HTML',
            'disable_web_page_preview': True,
        },
        {
            'chat_id': chat_id_val,
            'text': message,
            'disable_web_page_preview': True,
        },
    ):
        payload = json.dumps(body).encode('utf-8')
        request = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                result = json.loads(response.read().decode('utf-8'))
            if result.get('ok'):
                return True
        except Exception:
            continue

    raise RuntimeError('Telegram rejected the message. Please verify the bot token and chat ID.')


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
        if parsed.path not in ('/api/send-invoice', '/api/send-telegram'):
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
        send_telegram = str(data.get('sendTelegram', True)).strip().lower() not in ('false', '0', 'no', 'off', 'none', '')

        email_error = None
        telegram_error = None
        email_attempted = bool(to_email)
        email_sent = False

        if to_email and SMTP_USER and SMTP_PASS:
            try:
                send_invoice_email(to_email, subject, html_body, text_body)
                email_sent = True
            except Exception as exc:
                email_error = str(exc)
        elif to_email:
            email_error = 'Company SMTP credentials not set (skipped)'
        elif parsed.path == '/api/send-invoice':
            email_error = 'No recipient email provided (skipped)'

        if send_telegram:
            try:
                send_telegram_alert(telegram_message)
                telegram_success = True
            except Exception as exc:
                telegram_error = str(exc)
                telegram_success = False
        else:
            telegram_success = True
            telegram_error = None

        email_success = (not email_attempted) or email_sent
        is_success = email_success and telegram_success
        status_code = 200 if is_success else 400

        if not email_attempted:
            message = 'Telegram notification sent successfully' if telegram_success else f'Telegram notification failed: {telegram_error}'
        elif email_success and telegram_success:
            message = 'Email and Telegram notifications sent successfully'
        elif email_success and not telegram_success:
            message = f'Email sent successfully, but Telegram failed: {telegram_error}'
        elif not email_success and telegram_success:
            message = f'Email failed: {email_error}'
        else:
            message = f'Email failed: {email_error}; Telegram failed: {telegram_error}'

        self._send_json_response(status_code, {
            'success': is_success,
            'telegramSent': telegram_success,
            'emailSent': email_success,
            'message': message,
            'emailError': email_error,
            'telegramError': telegram_error
        })

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
