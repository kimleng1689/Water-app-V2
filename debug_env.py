#!/usr/bin/env python3
"""Debug script to check if .env credentials are loaded correctly."""

import os
from pathlib import Path

print("=" * 70)
print("🔍 DEBUGGING .env CREDENTIAL LOADING")
print("=" * 70)

# Read .env file
env_file = Path('.env')
if env_file.exists():
    print("\n✅ .env file found at:", env_file.absolute())
    content = env_file.read_text()
    print("\n📄 .env file content:")
    print("-" * 70)
    print(content)
    print("-" * 70)
    
    # Parse .env manually
    print("\n🔄 Parsing .env file:")
    for line in content.splitlines():
        if line.strip() and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()
            if 'SMTP' in k or 'PASS' in k or 'USER' in k:
                print(f"  ✓ {k.strip()} = {v.strip()[:20]}...")
else:
    print("\n❌ .env file not found!")

# Check loaded values
print("\n📋 Loaded SMTP Configuration:")
print("-" * 70)
smtp_user = os.getenv('SMTP_USER', 'NOT SET')
smtp_pass = os.getenv('SMTP_PASS', 'NOT SET')
smtp_host = os.getenv('SMTP_HOST', 'NOT SET')
smtp_port = os.getenv('SMTP_PORT', 'NOT SET')

print(f"SMTP_HOST  = {smtp_host}")
print(f"SMTP_PORT  = {smtp_port}")
print(f"SMTP_USER  = {smtp_user}")
print(f"SMTP_PASS  = {'[SET]' if smtp_pass != 'NOT SET' else 'NOT SET'} (length: {len(smtp_pass)})")
print(f"EMAIL_FROM = {os.getenv('EMAIL_FROM', 'NOT SET')}")

# Test SMTP connection
print("\n" + "=" * 70)
print("🔗 TESTING SMTP CONNECTION")
print("=" * 70)

if smtp_user != 'NOT SET' and smtp_pass != 'NOT SET':
    try:
        import smtplib
        print(f"\n📞 Attempting SMTP_SSL connection to {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP_SSL(smtp_host, int(smtp_port), timeout=10)
        print(f"✅ Connection established!")
        
        print(f"🔐 Attempting login as {smtp_user}...")
        server.login(smtp_user, smtp_pass)
        print(f"✅ Login successful!")
        
        server.quit()
        print(f"\n✅ SMTP CREDENTIALS ARE VALID!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
else:
    print(f"\n❌ SMTP credentials not set!")
    print(f"   SMTP_USER is {'NOT SET' if smtp_user == 'NOT SET' else 'set'}")
    print(f"   SMTP_PASS is {'NOT SET' if smtp_pass == 'NOT SET' else 'set'}")

print("\n" + "=" * 70 + "\n")
