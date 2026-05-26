# Updates API + mobile .env with your LAN IPv4 (run after network changes).
$root = Split-Path $PSScriptRoot -Parent
$mobileEnv = Join-Path $root 'apps\mobile\.env'
$apiEnv = Join-Path $root 'services\api\.env'
$webEnv = Join-Path $root 'apps\web\.env.local'

function Set-EnvLine($path, $key, $value) {
  $lines = Get-Content $path
  $found = $false
  $newLines = foreach ($line in $lines) {
    if ($line -match "^$key=") {
      $found = $true
      "$key=$value"
    } else {
      $line
    }
  }
  if (-not $found) { $newLines += "$key=$value" }
  Set-Content -Path $path -Value $newLines
}

$candidates = @()
try {
  Get-NetIPConfiguration -ErrorAction Stop | ForEach-Object {
    $alias = $_.InterfaceAlias
  if ($alias -match 'vEthernet|Hyper-V|WSL|Default Switch|Loopback') { return }
    $ip = $_.IPv4Address.IPAddress
    if (-not $ip) { return }
    if ($ip -like '127.*' -or $ip -like '169.254.*') { return }
    $isWifi = $alias -match 'Wi-?Fi|WLAN|Wireless'
    $isHotspot = $ip -like '172.20.10.*' -or $ip -like '172.16.*'
    $candidates += [pscustomobject]@{
      IP = $ip
      Alias = $alias
      IsWifi = $isWifi
      IsHotspot = $isHotspot
    }
  }
} catch {
  # Fallback: ipconfig parse
  $lines = ipconfig
  $currentAlias = ''
  foreach ($line in $lines) {
    if ($line -match 'adapter (.+):') { $currentAlias = $matches[1].Trim() }
    if ($line -match 'IPv4.*:\s*(\d+\.\d+\.\d+\.\d+)') {
      $ip = $matches[1]
      if ($ip -notlike '127.*' -and $ip -notlike '169.254.*' -and $currentAlias -notmatch 'vEthernet|Hyper-V') {
        $candidates += [pscustomobject]@{
          IP = $ip
          Alias = $currentAlias
          IsWifi = ($currentAlias -match 'Wi-?Fi|WLAN|Wireless')
          IsHotspot = ($ip -like '172.20.10.*')
        }
      }
    }
  }
}

if ($candidates.Count -eq 0) {
  Write-Host 'Could not detect IPv4. Run ipconfig and set IP manually in apps/mobile/.env'
  exit 1
}

# Prefer home/office Wi-Fi (192.168.x) over iPhone hotspot, then any Wi-Fi adapter
$wifiIp = (
  $candidates | Where-Object { $_.IsWifi -and $_.IP -like '192.168.*' } | Select-Object -First 1
).IP
if (-not $wifiIp) {
  $wifiIp = ($candidates | Where-Object { $_.IsWifi } | Select-Object -First 1).IP
}
if (-not $wifiIp) {
  $wifiIp = ($candidates | Where-Object { -not $_.IsHotspot } | Select-Object -First 1).IP
}
if (-not $wifiIp) {
  $wifiIp = $candidates[0].IP
}

$chosen = $candidates | Where-Object { $_.IP -eq $wifiIp } | Select-Object -First 1

Set-EnvLine $mobileEnv 'EXPO_PUBLIC_API_URL' "http://${wifiIp}:4000/api/v1"
Set-EnvLine $mobileEnv 'EXPO_PUBLIC_SOCKET_URL' "http://${wifiIp}:4000"
Set-EnvLine $apiEnv 'API_PUBLIC_URL' "http://${wifiIp}:4000"
# Web dashboard runs in the PC browser — localhost avoids timeouts when Wi-Fi IP changes
if (Test-Path $webEnv) {
  Set-EnvLine $webEnv 'NEXT_PUBLIC_API_URL' 'http://localhost:4000/api/v1'
}

Write-Host "Updated LAN IP to $wifiIp ($($chosen.Alias))"
Write-Host "  apps/mobile/.env"
Write-Host "  services/api/.env"
if (Test-Path $webEnv) { Write-Host "  apps/web/.env.local" }
Write-Host ""
if ($chosen.IsHotspot) {
  Write-Host "NOTE: PC is on iPhone hotspot ($wifiIp)."
  Write-Host "  Your phone must be the SAME hotspot (or use home Wi-Fi on both PC and phone)."
}
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Allow firewall (Admin PowerShell):  npm run firewall:api"
Write-Host "  2. Start API:  npm run dev:api"
Write-Host "  3. On phone Safari, open:  http://${wifiIp}:4000/api/v1/health"
Write-Host "     (must show JSON with ok:true before the app will work)"
Write-Host "  4. Restart Expo:  cd apps/mobile && npx expo start -c"
Write-Host "  5. Restart web:   npm run dev:web  (Ctrl+C then restart — required after .env change)"
Write-Host ""
Write-Host "Web uses http://localhost:4000 (same PC). Phone app uses http://${wifiIp}:4000"
