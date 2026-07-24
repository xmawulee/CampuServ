$content = Get-Content $args[0]
$newContent = @()
foreach ($line in $content) {
    $newLine = $line -replace '^first commit\s*$', 'Admin'
    $newLine = $newLine -replace '^Commit Admin files\s*$', 'Admin files'
    $newContent += $newLine
}
Set-Content -Path $args[0] -Value $newContent
