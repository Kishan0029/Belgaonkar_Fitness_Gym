$baseUrl = "http://127.0.0.1:8000/api"

Write-Host "Registering admin..."
$regBody = @{
    email = "renewtester@belgaonkar.com"
    password = "admin"
    full_name = "Admin Tester"
    role = "admin"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json" | Out-Null
} catch {}

$loginBody = @{
    email = "renewtester@belgaonkar.com"
    password = "admin"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# 1. Create Package
$pkgBody = @{
    package_name = "Test Renew Package"
    duration_days = 30
    price = 1000
} | ConvertTo-Json
$pkg = Invoke-RestMethod -Uri "$baseUrl/packages" -Method Post -Body $pkgBody -Headers $headers
$pkgId = $pkg.id
Write-Host "Created Package: $pkgId"

# 2. Add Member (with dues)
$today = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
$memberBody = @{
    full_name = "Renew Member"
    phone_number = "9988776655"
    package_id = $pkgId
    join_date = $today
    membership_start_date = $today
    total_amount = 1000
    amount_paid = 500
    payment_mode = "Cash"
} | ConvertTo-Json
$member = Invoke-RestMethod -Uri "$baseUrl/members" -Method Post -Body $memberBody -Headers $headers
$memberId = $member.id
Write-Host "Created Member: $memberId with Total=1000 Paid=500"

# 3. Renew (Should fail due to dues)
$renewBody = @{
    package_id = $pkgId
    duration_days = 30
    total_amount = 1000
    amount_paid = 1000
    payment_mode = "Cash"
} | ConvertTo-Json

Write-Host "Triggering Renewal (Expect Error 400)..."
try {
    Invoke-RestMethod -Uri "$baseUrl/members/$memberId/renew" -Method Post -Body $renewBody -Headers $headers
} catch {
    Write-Host "Caught expected error: $_"
}

# 4. Clear Dues
$payBody = @{
    member_id = $memberId
    amount_paid = 500
    payment_mode = "Cash"
    payment_date = $today
} | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/payments" -Method Post -Body $payBody -Headers $headers
Write-Host "Cleared dues!"

# 5. Renew Early
$renewRes = Invoke-RestMethod -Uri "$baseUrl/members/$memberId/renew" -Method Post -Body $renewBody -Headers $headers
Write-Host "Early renewed member join_date = $($renewRes.member.join_date)"
Write-Host "Early renewed member expiry = $($renewRes.member.expiry_date)"
Write-Host "History Count: $($renewRes.member.membership_history.Count)"

