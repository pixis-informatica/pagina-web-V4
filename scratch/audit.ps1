Get-ChildItem -Path '.' -File | Sort-Object LastWriteTime -Descending | Format-Table Name, LastWriteTime, Length -AutoSize
Write-Host ""
Write-Host "=== DATA FILES ==="
Get-ChildItem -Path 'data' -File | Sort-Object LastWriteTime -Descending | Format-Table Name, LastWriteTime, Length -AutoSize
