$raw = [System.IO.File]::ReadAllText('data/products.json', [System.Text.Encoding]::UTF8)
$data = $raw | ConvertFrom-Json

Write-Host "=== AUDITORIA COMPLETA DE CAMPO 'img' EN $($data.Count) PRODUCTOS ==="
Write-Host ""

$noImg       = @()
$backslash   = @()
$withSpaces  = @()
$clean       = @()
$noImgGallery = @()

foreach ($p in $data) {
    $imgVal = $p.img
    $id     = $p.id

    if (-not $imgVal -or $imgVal -eq "") {
        # Tiene gallery?
        if ($p.gallery -and $p.gallery -ne "") {
            $noImgGallery += [PSCustomObject]@{ id=$id; gallery_start=$p.gallery.Substring(0,[Math]::Min(60,$p.gallery.Length)) }
        } else {
            $noImg += $id
        }
    } elseif ($imgVal -match '\\') {
        $backslash += [PSCustomObject]@{ id=$id; img=$imgVal }
    } elseif ($imgVal -match ' ') {
        $withSpaces += [PSCustomObject]@{ id=$id; img=$imgVal }
    } else {
        $clean += $id
    }
}

Write-Host "--- LIMPIAS (forward slash, sin espacios): $($clean.Count) ---"
Write-Host ""

Write-Host "--- CON BACKSLASH (conversion necesaria): $($backslash.Count) ---"
$backslash | ForEach-Object { Write-Host "  [$($_.id)] => $($_.img.Substring(0,[Math]::Min(70,$_.img.Length)))" }
Write-Host ""

Write-Host "--- CON ESPACIOS EN LA RUTA (URL encoding necesario): $($withSpaces.Count) ---"
$withSpaces | ForEach-Object { Write-Host "  [$($_.id)] => $($_.img)" }
Write-Host ""

Write-Host "--- SIN img PERO CON gallery (fallback necesario): $($noImgGallery.Count) ---"
$noImgGallery | ForEach-Object { Write-Host "  [$($_.id)] => gallery: $($_.gallery_start)..." }
Write-Host ""

Write-Host "--- SIN img Y SIN gallery (sin imagen posible): $($noImg.Count) ---"
$noImg | ForEach-Object { Write-Host "  [$_]" }
Write-Host ""

# Extra: mostrar ejemplos de backslash para ver doble-backslash vs simple
Write-Host "=== MUESTRA RAW de los primeros 3 con backslash (ver escaping exacto) ==="
$backslash | Select-Object -First 3 | ForEach-Object {
    Write-Host "ID: $($_.id)"
    Write-Host "img (raw PS): [$($_.img)]"
    Write-Host "img (len): $($_.img.Length)"
    Write-Host ""
}

# Verificar gallery: ?es string simple o array?
Write-Host "=== TIPO DE CAMPO gallery (primeros 5 con gallery) ==="
$data | Where-Object { $_.gallery } | Select-Object -First 5 | ForEach-Object {
    $gType = $_.gallery.GetType().Name
    Write-Host "id=$($_.id) | gallery type=[$gType] | start=[$($_.gallery.ToString().Substring(0,[Math]::Min(60,$_.gallery.ToString().Length)))]"
}
