import json, urllib.request, urllib.error

payload = {
    "to": "darapichmony@dpws.com.kh",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "text": "Test",
    "sendTelegram": False
}

url = 'http://localhost:5001/api/send-invoice'
data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req, timeout=10)
    result = json.loads(response.read().decode('utf-8'))
    print("SUCCESS" if result.get('emailSent') else "FAILED")
    print(json.dumps(result))
except Exception as e:
    print("ERROR:", str(e))
