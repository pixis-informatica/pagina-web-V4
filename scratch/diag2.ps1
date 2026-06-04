# Test exact htaccess rewrite simulation
# The htaccess rule: RewriteCond %{QUERY_STRING} (?:^|&)producto=([^&]+)
# and passes: share.php?producto=%1

# What arrives in $_GET['producto'] if the original URL is:
# index.html?producto=prod-ma530-mercusys-adaptador-bluet-14

Write-Host "=== SIMULATING HTACCESS REWRITE CAPTURE ==="
Write-Host ""

# Test 1: Simple ID match
$products_raw = Get-Content 'data/products.json' -Raw -Encoding UTF8
$products = $products_raw | ConvertFrom-Json

$test_queries = @(
    "prod-ma530-mercusys-adaptador-bluet-14",
    "PROD-MPEHG5FLALJP", 
    "prod-1778110392369",
    "auricular-gamer-raptor-inferno-pro-rgb-7-1-usb-negro",
    "adaptador-bluetooth-5-3-usb-nano-ma530-mercusys"
)

foreach ($q in $test_queries) {
    $found = $null
    foreach ($p in $products) {
        $pid = if ($p.id) { $p.id.Trim() } else { "" }
        $pslug = if ($p.slug) { $p.slug.Trim() } else { "" }
        
        if ($pid -eq $q -or $pid.ToLower() -eq $q.ToLower()) {
            $found = $p
            Write-Host "FOUND by ID [$q] => $($p.title)"
            break
        }
        if ($pslug -and ($pslug -eq $q -or $pslug.ToLower() -eq $q.ToLower())) {
            $found = $p
            Write-Host "FOUND by SLUG [$q] => $($p.title)"
            break
        }
    }
    if (-not $found) {
        Write-Host "NOT FOUND: [$q]"
    }
}

Write-Host ""
Write-Host "=== CHECKING FOR BOM IN products.json ==="
$bytes = [System.IO.File]::ReadAllBytes('data/products.json')
Write-Host "First 4 bytes: $($bytes[0]) $($bytes[1]) $($bytes[2]) $($bytes[3])"
if ($bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
    Write-Host "WARNING: UTF-8 BOM DETECTED! This may cause json_decode to return null in PHP!"
} else {
    Write-Host "No BOM detected."
}

Write-Host ""
Write-Host "=== CHECKING FILE SIZE ==="
$fi = Get-Item 'data/products.json'
Write-Host "File size: $($fi.Length) bytes ($([Math]::Round($fi.Length/1024, 1)) KB)"
Write-Host "This could hit PHP memory_limit on cheap hosting if limit is < 16MB"
