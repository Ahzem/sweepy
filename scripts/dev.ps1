<#
.SYNOPSIS
    Sweepy Local Development Launcher for Windows 11 (PowerShell)
.DESCRIPTION
    Starts the FastAPI backend and Next.js frontend services.
.PARAMETER Service
    Target service to launch: 'all' (default), 'api', or 'web'.
.EXAMPLE
    .\scripts\dev.ps1
    .\scripts\dev.ps1 -Service api
    .\scripts\dev.ps1 -Service web
#>

param (
    [ValidateSet("all", "api", "web")]
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Sweepy — Local-First AI File Organizer  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Project Root: $Root" -ForegroundColor Gray

# Check Ollama
try {
    $ollamaTags = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction SilentlyContinue
    $gemmaFound = ($ollamaTags.models | Where-Object { $_.name -like "*gemma3:1b*" })
    if ($gemmaFound) {
        Write-Host "[✓] Ollama is running and gemma3:1b model is ready." -ForegroundColor Green
    } else {
        Write-Host "[!] Ollama is running, but gemma3:1b was not detected. Run: 'ollama pull gemma3:1b'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[!] Ollama is not running on port 11434. Sweepy will operate in deterministic rule fallback mode." -ForegroundColor Yellow
}

function Start-Backend {
    Write-Host "`nStarting FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Green
    $venvPython = Join-Path $Root "apps\api\.venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        Write-Host "Virtualenv not found at $venvPython. Creating..." -ForegroundColor Yellow
        python -m venv "$Root\apps\api\.venv"
        & "$Root\apps\api\.venv\Scripts\python.exe" -m pip install -e "$Root\apps\api[dev]"
    }
    
    $apiDir = Join-Path $Root "apps\api"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$apiDir'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WindowStyle Normal
    Write-Host "[✓] Backend process launched. Documentation: http://127.0.0.1:8000/docs" -ForegroundColor Green
}

function Start-Frontend {
    Write-Host "`nStarting Next.js frontend on http://localhost:3000..." -ForegroundColor Green
    $webDir = Join-Path $Root "apps\web"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$webDir'; pnpm dev" -WindowStyle Normal
    Write-Host "[✓] Frontend process launched. UI: http://localhost:3000" -ForegroundColor Green
}

switch ($Service) {
    "all" {
        Start-Backend
        Start-Sleep -Seconds 1
        Start-Frontend
        Write-Host "`nSweepy services launched in separate windows!" -ForegroundColor Cyan
        Write-Host "Web Interface: http://localhost:3000" -ForegroundColor White
        Write-Host "API Swagger:   http://localhost:8000/docs" -ForegroundColor White
    }
    "api" {
        $apiDir = Join-Path $Root "apps\api"
        Set-Location $apiDir
        & ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    }
    "web" {
        $webDir = Join-Path $Root "apps\web"
        Set-Location $webDir
        pnpm dev
    }
}
