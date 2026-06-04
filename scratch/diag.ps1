$raw = Get-Content 'data/products.json' -Raw -Encoding UTF8
$data = $raw | ConvertFrom-Json
Write-Host "Total products: $($data.Count)"

# Count products with/without id, slug
$withId = ($data | Where-Object { $_.id -ne $null }).Count
$withSlug = ($data | Where-Object { $_.slug -ne $null -and $_.slug -ne "" }).Count
Write-Host "Products with id: $withId"
Write-Host "Products with slug: $withSlug"
Write-Host ""

# Show first 8 products
Write-Host "=== FIRST 8 PRODUCTS ==="
$data | Select-Object -First 8 | ForEach-Object {
    Write-Host "ID: [$($_.id)] | SLUG: [$($_.slug)] | TITLE_START: [$(if ($_.title) { $_.title.Substring(0, [Math]::Min(40, $_.title.Length)) } else { '(null)' })]"
}

# Test a specific search simulation
Write-Host ""
Write-Host "=== SEARCH TEST for 'prod-1778110392369' ==="
$found = $data | Where-Object { $_.id -eq "prod-1778110392369" } | Select-Object -First 1
if ($found) {
    Write-Host "FOUND: $($found.title)"
} else {
    Write-Host "NOT FOUND"
}

Write-Host ""
Write-Host "=== SEARCH TEST for slug 'auricular-gamer-raptor-inferno-pro-rgb-7-1-usb-negro' ==="
$found2 = $data | Where-Object { $_.slug -eq "auricular-gamer-raptor-inferno-pro-rgb-7-1-usb-negro" } | Select-Object -First 1
if ($found2) {
    Write-Host "FOUND by slug: $($found2.title)"
} else {
    Write-Host "NOT FOUND by slug"
}

# Check for products with img field
$withImg = ($data | Where-Object { $_.img -ne $null -and $_.img -ne "" }).Count
Write-Host ""
Write-Host "Products with img field: $withImg out of $($data.Count)"

# Check for JSON encoding issues
Write-Host ""
Write-Host "JSON byte check (first 50 bytes of raw):"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($raw.Substring(0, [Math]::Min(50, $raw.Length)))
Write-Host ($bytes -join " ")
