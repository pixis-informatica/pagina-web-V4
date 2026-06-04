$raw = [System.IO.File]::ReadAllText('data/products.json', [System.Text.Encoding]::UTF8)

Write-Host "=== VALIDITY CHECK ==="
Write-Host "File length (chars): $($raw.Length)"
Write-Host "First byte: $([int][char]$raw[0]) (91=[ is correct)"
Write-Host "Last non-whitespace: $([int][char]$raw.TrimEnd()[$raw.TrimEnd().Length-1]) (93=] is correct)"

# Check for literal control characters (unescaped newlines inside strings)
$lineNum = 0
$inString = $false
$prevChar = ''
$problems = @()
foreach ($ch in $raw.ToCharArray()) {
    $lineNum += ($ch -eq "`n")
    if ($ch -eq '"' -and $prevChar -ne '\') { $inString = -not $inString }
    if ($inString -and ($ch -eq "`n" -or $ch -eq "`r" -or $ch -eq "`t" -and $ch -ne "`t")) {
        if ($ch -ne "`t") {  # tabs are ok inside strings technically
            $problems += "Line ~$lineNum : unescaped control char $([int][char]$ch)"
        }
    }
    $prevChar = $ch
}

if ($problems.Count -gt 0) {
    Write-Host "CRITICAL PROBLEMS FOUND:"
    $problems | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "No unescaped control chars found inside strings."
}

# Test json_decode simulation via PowerShell
Write-Host ""
Write-Host "=== POWERSHELL JSON PARSE TEST ==="
try {
    $data = $raw | ConvertFrom-Json
    Write-Host "Parse SUCCESS: $($data.Count) products"
} catch {
    Write-Host "Parse FAILED: $($_.Exception.Message)"
}

# Check for products with NULL id
Write-Host ""
Write-Host "=== PRODUCTS WITH NULL OR MISSING ID ==="
$noIdProds = @()
foreach ($p in $data) {
    if (-not $p.id) {
        $noIdProds += $p.title
    }
}
if ($noIdProds.Count -gt 0) {
    Write-Host "Found $($noIdProds.Count) without id:"
    $noIdProds | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "All products have id field."
}

# Show all uppercase IDs (PROD-MP... format)
Write-Host ""
Write-Host "=== UPPERCASE IDs (PROD-MP... format) ==="
$data | Where-Object { $_.id -like "PROD-*" } | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.id)"
}
$upperCount = ($data | Where-Object { $_.id -like "PROD-*" }).Count
Write-Host "Total PROD-* format: $upperCount"

# Check for URL-encoding issues in IDs
Write-Host ""
Write-Host "=== IDs with percent-encoded chars ==="
$data | Where-Object { $_.id -match '%[0-9A-Fa-f]{2}' } | ForEach-Object {
    Write-Host "  ENCODED ID: $($_.id)"
}

# Show priceNum field types
Write-Host ""
Write-Host "=== priceNum field type samples ==="
$data | Select-Object -First 5 | ForEach-Object {
    $pn = $_.priceNum
    $type = if ($pn -ne $null) { $pn.GetType().Name } else { "NULL" }
    Write-Host "  priceNum=[$pn] type=[$type]"
}
