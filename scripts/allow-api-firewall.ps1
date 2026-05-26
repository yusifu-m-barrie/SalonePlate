# Run PowerShell as Administrator:
#   cd "c:\Users\usifu\Videos\mobile app"
#   powershell -ExecutionPolicy Bypass -File scripts\allow-api-firewall.ps1

$ruleName = 'SalonePlate API 4000'
$existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Firewall rule already exists: $ruleName"
  exit 0
}

netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=4000
if ($LASTEXITCODE -eq 0) {
  Write-Host "OK — inbound TCP port 4000 is allowed. Retry the app on your phone."
} else {
  Write-Host "Failed. Right-click PowerShell → Run as administrator, then run this script again."
  exit 1
}
