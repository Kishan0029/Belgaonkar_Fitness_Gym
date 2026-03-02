$port = 8000
$tcpConns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($tcpConns) {
    foreach ($conn in $tcpConns) {
        $pidToKill = $conn.OwningProcess
        if ($pidToKill) {
            Write-Host "Killing Process ID: $pidToKill listening on port $port"
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2
if (Test-Path "venv") {
    Remove-Item -Recurse -Force "venv"
}
python -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
