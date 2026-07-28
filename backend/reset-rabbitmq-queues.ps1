#!/usr/bin/env pwsh
# reset-rabbitmq-queues.ps1
# Deletes stale RabbitMQ queues that have conflicting declarations (no DLX),
# so services can re-declare them correctly with DLX support on startup.
#
# Run this once BEFORE starting all services after a clean environment reset.
# Requires RabbitMQ management plugin enabled (default: http://localhost:15672)

param(
    [string]$RabbitHost = "localhost",
    [int]$Port = 15672,
    [string]$User = "guest",
    [string]$Pass = "guest",
    [string]$Vhost = "/"
)

$BaseUrl = "http://${RabbitHost}:${Port}/api"
$Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${User}:${Pass}"))
$Headers = @{ "Authorization" = "Basic $Auth"; "Content-Type" = "application/json" }
$VhostEncoded = [Uri]::EscapeDataString($Vhost)

# Queues that must be recreated with DLX
$QueuesToDelete = @(
    "provider.verification",
    "provider.verification.dlq",
    "provider_verification_queue",
    "provider_verification_queue.dlq",
    "user.status.updated",
    "user.status.updated.dlq",
    "provider.review.submitted",
    "provider.review.submitted.dlq",
    "admin_notifications_queue",
    "admin_notifications_queue.dlq",
    "job-status-queue",
    "job-status-queue.dlq"
)

Write-Host "=== CampusServ RabbitMQ Queue Reset ===" -ForegroundColor Cyan
Write-Host "Target: http://${RabbitHost}:${Port} | Vhost: $Vhost" -ForegroundColor Cyan
Write-Host ""

foreach ($q in $QueuesToDelete) {
    $qEncoded = [Uri]::EscapeDataString($q)
    $url = "$BaseUrl/queues/$VhostEncoded/$qEncoded"
    try {
        $response = Invoke-RestMethod -Uri $url -Method DELETE -Headers $Headers -ErrorAction Stop
        Write-Host "[DELETED] $q" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "[SKIPPED] $q (not found, already clean)" -ForegroundColor Yellow
        } else {
            Write-Host "[ERROR]   $q -> $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Done. Start all services now — they will re-declare queues with DLX." -ForegroundColor Cyan
