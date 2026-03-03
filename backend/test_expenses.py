import requests
import pprint

BASE_URL = "http://127.0.0.1:8000"

# Register a test admin to get token
requests.post(f"{BASE_URL}/api/auth/register", json={
    "email": "expense_tester@example.com",
    "password": "pass",
    "full_name": "Tester",
    "role": "admin"
})

login = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "expense_tester@example.com",
    "password": "pass"
})

token = login.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

print("\n--- 1. POST /api/expenses (Valid Expense) ---")
res = requests.post(f"{BASE_URL}/api/expenses", json={
    "amount": 1000.0,
    "category": "Maintenance",
    "description": "Fixing treadmill",
    "payment_mode": "Card",
    "expense_date": "2026-03-03T10:00:00"
}, headers=headers)
print("Status:", res.status_code)
pprint.pprint(res.json())
expense_id = res.json().get("id")

print("\n--- 1.1 POST /api/expenses (amount <= 0 validation) ---")
res2 = requests.post(f"{BASE_URL}/api/expenses", json={
    "amount": 0,
    "category": "Maintenance",
    "payment_mode": "Cash",
    "expense_date": "2026-03-03T10:00:00"
}, headers=headers)
print("Status:", res2.status_code)
pprint.pprint(res2.json())

print("\n--- 2. GET /api/expenses ---")
res3 = requests.get(f"{BASE_URL}/api/expenses", headers=headers)
print("Status:", res3.status_code)
print(f"Total expenses returned: {len(res3.json())}")

print(f"\n--- 3. PATCH /api/expenses/{expense_id} ---")
res4 = requests.patch(f"{BASE_URL}/api/expenses/{expense_id}", json={
    "amount": 1200.0
}, headers=headers)
print("Status:", res4.status_code)
pprint.pprint(res4.json())

print("\n--- 4. GET /api/financial-summary (Current Month) ---")
res5 = requests.get(f"{BASE_URL}/api/financial-summary", headers=headers)
print("Status:", res5.status_code)
pprint.pprint(res5.json())

print(f"\n--- 5. PATCH /api/expenses/{expense_id}/cancel ---")
res6 = requests.patch(f"{BASE_URL}/api/expenses/{expense_id}/cancel", headers=headers)
print("Status:", res6.status_code)
pprint.pprint(res6.json())

print("\n--- 6. GET /api/financial-summary (After cancel) ---")
res7 = requests.get(f"{BASE_URL}/api/financial-summary", headers=headers)
print("Status:", res7.status_code)
pprint.pprint(res7.json())
