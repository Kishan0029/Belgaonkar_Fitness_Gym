$baseUrl = "http://127.0.0.1:8000/api"

Write-Host "Registering admin..."
$regBody = @{
    email = "exp_admin@belgaonkar.com"
    password = "admin"
    full_name = "Admin Expense"
    role = "admin"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json" | Out-Null
} catch {}

Write-Host "Logging in..."
$loginBody = @{
    email = "exp_admin@belgaonkar.com"
    password = "admin"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n--- 1. POST /api/expenses (Valid Expense) ---"
$expenseBody = @{
    amount = 2500.50
    category = "Equipment"
    description = "New dumbbells"
    payment_mode = "Card"
    expense_date = "2026-03-03T10:00:00Z"
} | ConvertTo-Json

$expense = Invoke-RestMethod -Uri "$baseUrl/expenses" -Method Post -Body $expenseBody -Headers $headers -ContentType "application/json"
$expense | ConvertTo-Json

$expenseId = $expense.id

Write-Host "`n--- 1.1 POST /api/expenses (Invalid Amount <= 0) ---"
$invalidExpenseBody = @{
    amount = -50.0
    category = "Maintenance"
    payment_mode = "Cash"
    expense_date = "2026-03-03T10:00:00Z"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/expenses" -Method Post -Body $invalidExpenseBody -Headers $headers -ContentType "application/json"
} catch {
    Write-Host "Failed as expected! Status: $_"
}

Write-Host "`n--- 2. GET /api/expenses ---"
$allExpenses = Invoke-RestMethod -Uri "$baseUrl/expenses" -Method Get -Headers $headers
$allExpenses | ConvertTo-Json

Write-Host "`n--- 3. PATCH /api/expenses/$expenseId ---"
$updateBody = @{
    amount = 2800.0
    description = "Premium dumbbells"
} | ConvertTo-Json

$updated = Invoke-RestMethod -Uri "$baseUrl/expenses/$expenseId" -Method Patch -Body $updateBody -Headers $headers -ContentType "application/json"
$updated | ConvertTo-Json

Write-Host "`n--- 4. GET /api/financial-summary (Current Month) ---"
$summary = Invoke-RestMethod -Uri "$baseUrl/financial-summary?month=2026-03" -Method Get -Headers $headers
$summary | ConvertTo-Json

Write-Host "`n--- 5. PATCH /api/expenses/$expenseId/cancel ---"
$cancelled = Invoke-RestMethod -Uri "$baseUrl/expenses/$expenseId/cancel" -Method Patch -Headers $headers -ContentType "application/json"
$cancelled | ConvertTo-Json

Write-Host "`n--- 6. GET /api/financial-summary (After Cancel) ---"
$summaryAfter = Invoke-RestMethod -Uri "$baseUrl/financial-summary?month=2026-03" -Method Get -Headers $headers
$summaryAfter | ConvertTo-Json
