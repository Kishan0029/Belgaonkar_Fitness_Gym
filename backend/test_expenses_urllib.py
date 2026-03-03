import urllib.request
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

# Helper
def req(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    if data:
        req.data = json.dumps(data).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 500, str(e)

# Register / Login
auth_email = f"test_{uuid.uuid4()}@example.com"
req("POST", "/auth/register", {
    "email": auth_email,
    "password": "pass",
    "full_name": "Test User",
    "role": "admin"
})

_, login_data = req("POST", "/auth/login", {
    "email": auth_email,
    "password": "pass"
})

token = login_data.get("access_token")
print(f"Token acquired: {bool(token)}")

print("\n--- 1. POST /api/expenses (Valid Expense) ---")
status, data = req("POST", "/expenses", {
    "amount": 2500.50,
    "category": "Equipment",
    "description": "New dumbbells from Python",
    "payment_mode": "Card",
    "expense_date": "2026-03-03T10:00:00Z"
}, token)
print("Status:", status)
print(data)
expense_id = data.get("id")

print("\n--- 1.1 POST /api/expenses (Amount validation) ---")
status, data2 = req("POST", "/expenses", {
    "amount": -50.0,
    "category": "Maintenance",
    "payment_mode": "Cash",
    "expense_date": "2026-03-03T10:00:00Z"
}, token)
print("Status:", status)
print(data2)

print("\n--- 2. GET /api/expenses ---")
status, data3 = req("GET", "/expenses", None, token)
print("Status:", status)
print(f"Found {len(data3)} expenses")

print(f"\n--- 3. PATCH /api/expenses/{{expense_id}} ---")
status, data4 = req("PATCH", f"/expenses/{expense_id}", {
    "amount": 2800.0,
    "description": "Premium dumbbells"
}, token)
print("Status:", status)
print(data4)

print("\n--- 4. GET /api/financial-summary (Current Month) ---")
status, data5 = req("GET", "/financial-summary?month=2026-03", None, token)
print("Status:", status)
print(data5)

print(f"\n--- 5. PATCH /api/expenses/{{expense_id}}/cancel ---")
status, data6 = req("PATCH", f"/expenses/{expense_id}/cancel", None, token)
print("Status:", status)
print(data6)

print("\n--- 6. GET /api/financial-summary (After Cancel) ---")
status, data7 = req("GET", "/financial-summary?month=2026-03", None, token)
print("Status:", status)
print(data7)
