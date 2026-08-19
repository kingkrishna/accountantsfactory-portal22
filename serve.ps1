$port = 3000
$webRoot = "c:\Users\RAMA\Downloads\accountantsfactory-portal-main\accountantsfactory-portal-main\web"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host "Server running at http://localhost:$port/"
} catch {
    Write-Host "Failed to start listener on port $port : $_"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

$aliases = @{
    "/private-limited-registration.html" = "/private-limited-company-registration-in-india.html"
    "/llp-registration.html" = "/llp-registration-in-india.html"
    "/opc-registration.html" = "/one-person-company-registration-in-india.html"
    "/section-8-ngo.html" = "/start-up-india-registrations-in-india.html"
    "/startup-india-dpiit.html" = "/start-up-india-registrations-in-india.html"
    "/registrations.html" = "/gst-registrations-in-india.html"

    "/outsourced-bookkeeping.html" = "/outsourced-accounting.html"
    "/gst-filing.html" = "/gst-filing-in-india.html"
    "/tds-payroll.html" = "/tds-return-filing-in-india.html"
    "/year-end-itr.html" = "/itr-in-india.html"
    "/roc-compliance.html" = "/aoc4-mgt-7-in-india.html"

    "/zoho-books.html" = "/zoho-books-ecosystem.html"
    "/zoho-crm.html" = "/zoho-books-ecosystem.html"
    "/zoho-people.html" = "/zoho-books-ecosystem.html"
    "/zoho-erp.html" = "/zoho-books-ecosystem.html"
    "/tally-to-zoho.html" = "/zoho-books-ecosystem.html"
    "/zoho-training.html" = "/zoho-books-ecosystem.html"

    "/mis-dashboards.html" = "/virtual-cfo-services-in-india.html"
    "/cash-flow.html" = "/cashflow-tool.html"
    "/bank-funding.html" = "/virtual-cfo-services-in-india.html"
    "/tools.html" = "/incometax-cal.html"
    "/training.html" = "/zoho-books-ecosystem.html"
    "/global.html" = "/outsourced-accounting.html"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawUrl = $request.RawUrl
        $path = $rawUrl.Split('?')[0]
        # URL decode to handle spaces and encoded characters
        $path = [System.Uri]::UnescapeDataString($path)

        if ($aliases.ContainsKey($path.ToLower())) {
            $path = $aliases[$path.ToLower()]
        }

        if ($path -eq "/" -or $path -eq "") {
            $path = "/index.html"
        }

        # Normalize relative path
        $relPath = $path.TrimStart('/').Replace('/', '\')
        $filePath = Join-Path $webRoot $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }

            $response.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200

            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("<html><body><h2>404 Not Found: $path</h2></body></html>")
            $response.ContentType = "text/html"
            $response.ContentLength64 = $notFoundBytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }
        }

        $response.OutputStream.Close()
    } catch {
        # ignore client disconnects
    }
}
