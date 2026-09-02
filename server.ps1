# Dara Pichmony Water Station - Reliable Web Server Runner
$port = 5500
$invoicePort = 5001
$path = $PSScriptRoot

function Test-LocalPort([int]$testPort) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.BeginConnect('127.0.0.1', $testPort, $null, $null)
        return $connection.AsyncWaitHandle.WaitOne(300) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# The front end sends receipts to the local invoice service. Start it with the
# static site unless it is already running, so registration alerts work too.
if (-not (Test-LocalPort $invoicePort)) {
    $pythonPaths = @(
        (Get-Command python.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
        (Get-ChildItem "$env:LOCALAPPDATA\Programs\Python" -Filter python.exe -Recurse -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty FullName)
    ) | Where-Object { $_ -and (Test-Path $_) }
    $pythonPath = $pythonPaths | Select-Object -First 1
    if ($pythonPath) {
        Start-Process -FilePath $pythonPath -ArgumentList 'invoice_server.py' -WorkingDirectory $path -WindowStyle Hidden
        Write-Host "Invoice notification service starting on http://localhost:$invoicePort/" -ForegroundColor Cyan
    } else {
        Write-Warning 'Python was not found. Email and Telegram notifications will be unavailable.'
    }
}

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Net;
using System.Text;

public class AquaServer {
    public static void Run(string root, int port) {
        var listener = new HttpListener();
        listener.Prefixes.Add("http://localhost:" + port + "/");
        listener.Start();
        Console.WriteLine("DARA_PICHMONY_STARTED:" + port);

        while (listener.IsListening) {
            HttpListenerContext ctx;
            try { ctx = listener.GetContext(); }
            catch { break; }

            var req = ctx.Request;
            var res = ctx.Response;

            try {
                string urlPath = req.Url.LocalPath;
                if (urlPath == "/") urlPath = "/index.html";

                string filePath = Path.Combine(root, urlPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

                if (File.Exists(filePath)) {
                    byte[] bytes = File.ReadAllBytes(filePath);
                    string ext = Path.GetExtension(filePath).ToLower();
                    switch (ext) {
                        case ".html": res.ContentType = "text/html; charset=utf-8"; break;
                        case ".css":  res.ContentType = "text/css; charset=utf-8"; break;
                        case ".js":   res.ContentType = "application/javascript; charset=utf-8"; break;
                        case ".json": res.ContentType = "application/json; charset=utf-8"; break;
                        case ".png":  res.ContentType = "image/png"; break;
                        case ".jpg":  res.ContentType = "image/jpeg"; break;
                        case ".svg":  res.ContentType = "image/svg+xml"; break;
                        default:      res.ContentType = "application/octet-stream"; break;
                    }
                    res.ContentLength64 = bytes.LongLength;
                    // Only write body for non-HEAD requests
                    if (!req.HttpMethod.Equals("HEAD", StringComparison.OrdinalIgnoreCase)) {
                        res.OutputStream.Write(bytes, 0, bytes.Length);
                    }
                } else {
                    res.StatusCode = 404;
                    byte[] buf = Encoding.UTF8.GetBytes("404 Not Found");
                    res.ContentLength64 = buf.LongLength;
                    if (!req.HttpMethod.Equals("HEAD", StringComparison.OrdinalIgnoreCase)) {
                        res.OutputStream.Write(buf, 0, buf.Length);
                    }
                }
            } catch (Exception ex) {
                Console.WriteLine("Request error: " + ex.Message);
            } finally {
                try { res.OutputStream.Close(); } catch {}
                try { res.Close(); } catch {}
            }
        }
    }
}
"@

Write-Host "💧 Dara Pichmony Water Station starting on http://localhost:$port/" -ForegroundColor Cyan
Start-Process "http://localhost:$port/"
[AquaServer]::Run($path, $port)
