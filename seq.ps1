$content = Get-Content $args[0]
$newContent = @()
foreach ($line in $content) {
    if ($line -match 'first commit' -or $line -match 'Commit Admin files') {
        $newContent += ($line -replace '^pick', 'reword')
    } else {
        $newContent += $line
    }
}
Set-Content -Path $args[0] -Value $newContent
