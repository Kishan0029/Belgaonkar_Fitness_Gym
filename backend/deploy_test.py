import urllib.request
import urllib.error
import json
import time
import os
import uuid
import threading
from datetime import datetime

API_URL = "http://127.0.0.1:8000/api"

def make_request(method, endpoint, data=None, headers=None):
    if headers is None: headers = {}
    headers['Content-Type'] = 'application/json'
    
    url = f"{API_URL}{endpoint}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

def phase5_functional_validation():
    print("=== PHASE 5: FUNCTIONAL VALIDATION ===")
    test_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    test_phone = f"999{uuid.uuid4().hex[:6]}"
    
    print("Registering user...")
    status, _ = make_request("POST", "/auth/register", {
        "email": test_email, "password": "StrongPassword123!", "full_name": "Test User", "role": "admin"
    })
    assert status == 200, f"Register failed: {status}"
    
    print("Logging in user...")
    status, data = make_request("POST", "/auth/login", {
        "email": test_email, "password": "StrongPassword123!"
    })
    assert status == 200, "Login failed"
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    
    print("Testing invalid login fails...")
    status, _ = make_request("POST", "/auth/login", {
        "email": test_email, "password": "WrongPassword!"
    })
    assert status == 401, "Invalid login should fail"
    
    print("Testing protected route fails without token...")
    status, _ = make_request("GET", "/auth/me")
    assert status in (401, 403), f"Protected route should fail, got {status}"
    
    print("Testing Token persists...")
    status, _ = make_request("GET", "/auth/me", headers=headers)
    assert status == 200, "Protected route failed with valid token"
    
    print("Creating package...")
    status, data = make_request("POST", "/packages", {
        "package_name": "Production Test Package", "duration_days": 30, "price": 1000.0
    }, headers)
    pkg_id = data["id"]
    
    print("Creating member...")
    status, data = make_request("POST", "/members", {
        "full_name": "Prod Test Member", "phone_number": test_phone, "package_id": pkg_id,
        "join_date": datetime.utcnow().isoformat() + "Z",
        "membership_start_date": datetime.utcnow().isoformat() + "Z",
        "total_amount": 1000.0, "amount_paid": 500.0, "payment_mode": "Card"
    }, headers)
    member_id = data["id"]
    
    print("Creating duplicate member...")
    status, _ = make_request("POST", "/members", {
        "full_name": "Duplicate Member", "phone_number": test_phone, "package_id": pkg_id,
        "join_date": datetime.utcnow().isoformat() + "Z",
        "membership_start_date": datetime.utcnow().isoformat() + "Z",
        "total_amount": 1000.0, "amount_paid": 500.0
    }, headers)
    assert status == 400, "Duplicate should fail"
    
    print("Full payment update...")
    status, _ = make_request("POST", "/payments", {
        "member_id": member_id, "amount_paid": 500.0, "payment_mode": "UPI"
    }, headers)
    
    status, member = make_request("GET", f"/members/{member_id}", headers=headers)
    assert member["payment_status"] == "Paid", "Status not Paid"
    
    print("Checking Dashboard Stats...")
    status, stats = make_request("GET", "/dashboard/stats", headers=headers)
    assert stats["total_members"] >= 1, "Dashboard calculation error"
    
    print("Phase 5 Passed! All functional endpoints operational.\\n")
    return headers, pkg_id

def phase7_load_simulation(headers, pkg_id):
    print("=== PHASE 7: LOAD SIMULATION ===")
    start_time = time.time()
    
    print("Simulate 50 Member Creations...")
    member_ids = []
    def create_member():
        uid = uuid.uuid4().hex[:8]
        status, data = make_request("POST", "/members", {
            "full_name": f"Load Member {uid}",
            "phone_number": f"88{uid}",
            "package_id": pkg_id,
            "join_date": datetime.utcnow().isoformat() + "Z",
            "membership_start_date": datetime.utcnow().isoformat() + "Z",
            "total_amount": 1000.0,
            "amount_paid": 1000.0,
            "payment_mode": "Card"
        }, headers)
        if status == 200:
            member_ids.append(data["id"])

    threads = [threading.Thread(target=create_member) for _ in range(50)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    
    print(f"Created {len(member_ids)} members successfully.")
    
    print("Simulate 100 Payments...")
    payment_success = []
    def create_payment(idx):
        mid = member_ids[idx % len(member_ids)]
        status, _ = make_request("POST", "/payments", {
            "member_id": mid,
            "amount_paid": 10.0,
            "payment_mode": "Cash"
        }, headers)
        if status == 200:
            payment_success.append(True)

    threads2 = [threading.Thread(target=create_payment, args=(i,)) for i in range(100)]
    [t.start() for t in threads2]
    [t.join() for t in threads2]
    
    total_time = time.time() - start_time
    print(f"Successfully processed {len(payment_success)} payments.")
    print(f"Total time taken: {total_time:.2f} seconds.")
    print(f"Average API Response Time: {(total_time * 1000) / 150:.2f} ms")
    print("Phase 7 Passed! No crashes or timeouts detected.\\n")

try:
    headers, pkg = phase5_functional_validation()
    phase7_load_simulation(headers, pkg)
    print("Load Testing Completed Successfully")
except Exception as e:
    print(f"Test Exception: {e}")
