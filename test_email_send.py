#!/usr/bin/env python3
"""Test script to verify Gmail email send via the backend API."""

import json
import urllib.request
import urllib.error

def test_gmail_send():
    """Send a test email through the backend API."""
    
    # Test payload - Gmail only, no Telegram
    payload = {
        "to": "darapichmony@dpws.com.kh",
        "subject": "✅ Dara Pichmony Invoice - Email Test (New App Password)",
        "html": """
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 10px;">
                <h1 style="color: #0284c7; text-align: center;">💧 Dara Pichmony Water Station</h1>
                <h2 style="text-align: center; color: #064e3b;">Email Test - Invoice System Verification</h2>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>✅ SUCCESS! Your email configuration is working!</strong></p>
                    <p>This test email was sent using:</p>
                    <ul>
                        <li>Gmail SMTP (smtp.gmail.com:465)</li>
                        <li>Your generated Google app password</li>
                        <li>Gmail-only mode (Telegram disabled)</li>
                    </ul>
                    <p><strong>What this means:</strong> The "Send to Email" button in your water billing app will now send invoices directly to customer inboxes via Gmail.</p>
                </div>
                
                <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Test Details:</strong></p>
                    <p>Recipient: darapichmony@dpws.com.kh<br/>
                    Method: Gmail SMTP with App Password<br/>
                    Telegram: Disabled (Gmail-only)</p>
                </div>
                
                <p style="text-align: center; color: #999; font-size: 12px;">© 2026 Dara Pichmony Water Station</p>
            </div>
        </body>
        </html>
        """,
        "text": "Test Email - Dara Pichmony Water Station. If you receive this, the Gmail email configuration is working correctly with the new app password!",
        "sendTelegram": False
    }
    
    # Send to backend
    url = 'http://localhost:5001/api/send-invoice'
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    print("=" * 70)
    print("📧 TESTING GMAIL EMAIL SEND VIA BACKEND API")
    print("=" * 70)
    print(f"\n🔄 Sending to: {payload['to']}")
    print(f"📋 Subject: {payload['subject']}")
    print(f"📱 Telegram: Disabled (Gmail-only)\n")
    
    try:
        response = urllib.request.urlopen(req, timeout=10)
        result = json.loads(response.read().decode('utf-8'))
        
        print("=" * 70)
        print("✅ BACKEND RESPONSE RECEIVED")
        print("=" * 70)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULT SUMMARY")
        print("=" * 70)
        print(f"✉️  Email Sent: {'✅ YES' if result.get('emailSent') else '❌ NO'}")
        print(f"📱 Telegram Sent: {'✅ YES' if result.get('telegramSent') else '⏭️  SKIPPED (Gmail-only)'}")
        print(f"✅ Overall Success: {'✅ YES' if result.get('success') else '❌ NO'}")
        
        if not result.get('emailSent') and result.get('emailError'):
            print(f"\n⚠️  Email Error: {result['emailError']}")
        
        print("\n" + "=" * 70)
        if result.get('emailSent'):
            print("🎉 SUCCESS! Check your email inbox for the test message.")
        else:
            print("❌ Email send failed. Check the error message above.")
        print("=" * 70 + "\n")
        
        return result.get('emailSent', False)
        
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}:")
        print(e.read().decode('utf-8'))
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_gmail_send()
    exit(0 if success else 1)
