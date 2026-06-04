# Check IDs with special characters that could be URL-encoded by htaccess
$raw = Get-Content 'data/products.json' -Raw -Encoding UTF8
$data = $raw | ConvertFrom-Json

Write-Host "=== IDs that contain special chars (%, +, space, etc.) ==="
$data | ForEach-Object {
    if ($_.id -match '[%\+\s!@#]') {
        Write-Host "SPECIAL CHAR ID: [$($_.id)]"
    }
}

Write-Host ""
Write-Host "=== Checking if title-slug search would match anything ==="
# Simulate get_slug for the first product
$title = $data[0].title
Write-Host "Title: $title"
# Remove accents (simplified), lowercase, replace spaces with hyphens
$slug = $title.ToLower() -replace '[áàäâã]','a' -replace '[éèëê]','e' -replace '[íìïî]','i' -replace '[óòöôõ]','o' -replace '[úùüû]','u' -replace '[ñ]','n' -replace '[ç]','c'
$slug = $slug -replace '[^a-z0-9\s-]','' -replace '[\s-]+'  ,'-'
$slug = $slug.Trim('-')
Write-Host "Generated slug: $slug"
Write-Host "Stored ID:     $($data[0].id)"

Write-Host ""
Write-Host "=== CRITICAL: Testing if htaccess strips product ID correctly ==="
Write-Host "Original URL: ?producto=PROD-MPEHG5FLALJP"
Write-Host "htaccess regex: (?:^|&)producto=([^&]+)"
Write-Host "Captured value: PROD-MPEHG5FLALJP (no URL encoding issues)"
Write-Host ""

Write-Host "=== Checking IDs with UPPER vs LOWER case inconsistency ==="
$upperIds = $data | Where-Object { $_.id -cmatch '[A-Z]' }
Write-Host "Products with uppercase in ID: $($upperIds.Count)"
$upperIds | Select-Object -First 5 | ForEach-Object {
    Write-Host "  ID: $($_.id)"
}

Write-Host ""
Write-Host "=== Checking the REAL issue: does PHP memory_get_peak_usage warn? ==="
Write-Host "products.json size: $((Get-Item 'data/products.json').Length) bytes"
Write-Host "php json_decode needs ~5x file size in memory = $([Math]::Round((Get-Item 'data/products.json').Length * 5 / 1024 / 1024, 1)) MB"
Write-Host ""
Write-Host "=== The HTACCESS rule issue analysis ==="
Write-Host "Current rule: RewriteRule ^(index\.html)?$ share.php?producto=%1 [L]"
Write-Host "Problem: [L] flag stops processing BUT does NOT pass the original"
Write-Host "QUERY_STRING to share.php. Only 'producto=%1' is sent."
Write-Host "This means share.php gets: _GET['producto'] = '%1_value'"
Write-Host ""
Write-Host "HOWEVER: If the URL is /?producto=ID&banner=X"
Write-Host "The BANNER rule would match FIRST in htaccess (rule order matters!)"
Write-Host "and share.php would get banner=X but NOT producto=ID"
Write-Host ""
Write-Host "Current htaccess order:"
Write-Host "1. Productos (?producto=slug)"
Write-Host "2. Banners (?banner=id)"  
Write-Host "3. Categorias (?categoria=id)"
Write-Host "This order is CORRECT for priority."
