# CampusServ DDL-Auto Guard Script (PowerShell)
# Enforces that hibernate.ddl-auto is strictly set to 'validate' or 'none' across all microservices.

$ErrorActionPreference = "Stop"
$failed = $false

$ymlFiles = Get-ChildItem -Path $PSScriptRoot -Recurse -Include "application*.yml", "application*.yaml"

foreach ($file in $ymlFiles) {
    $lines = Get-Content $file.FullName
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match "ddl-auto:\s*([a-zA-Z0-9_-]+)") {
            $val = $matches[1].ToLower()
            if ($val -ne "validate" -and $val -ne "none") {
                Write-Host "[ERROR] Invalid ddl-auto setting '$val' found in $($file.FullName):$lineNum. Must be 'validate' or 'none'." -ForegroundColor Red
                $failed = $true
            }
        }
    }
}

if ($failed) {
    Write-Host "[FAIL] One or more microservices violate the ddl-auto resilience rule." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[SUCCESS] All microservices comply with ddl-auto: validate/none rules." -ForegroundColor Green
    exit 0
}
