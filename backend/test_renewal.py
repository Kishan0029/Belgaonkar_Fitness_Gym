import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import datetime
import uuid

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

import urllib.request
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def req(method, path, data=None):
    url = f"{BASE_URL}{path}"
    request = urllib.request.Request(url, method=method)
    if data:
        data_bytes = json.dumps(data).encode('utf-8')
        request.add_header('Content-Type', 'application/json')
        request.data = data_bytes
    try:
        with urllib.request.urlopen(request) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body) if res_body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"HTTPError {e.code}: {err_body}")
        return json.loads(err_body)
    except Exception as e:
        print("Error:", e)
        return None

async def main():
    # 1. Create a Package
    pkg_res = req("POST", "/packages", {"package_name": "Test Package", "duration_days": 30, "price": 1000})
    if 'id' in pkg_res:
        pkg_id = pkg_res['id']
    else:
        pkgs = req("GET", "/packages")
        pkg_id = pkgs[0]['id']

    # 2. Create a Member with pending dues
    today = datetime.datetime.now(datetime.timezone.utc).isoformat()
    member_data = {
        "full_name": "Testing Renewal Worker",
        "phone_number": "9998887776",
        "package_id": pkg_id,
        "join_date": today,
        "membership_start_date": today,
        "total_amount": 1000.0,
        "amount_paid": 500.0,  # Pending 500
        "payment_mode": "Cash"
    }
    member_res = req("POST", "/members", member_data)
    member_id = member_res["id"]
    print(f"Created Member: {member_id}")

    # 3. Try to renew with pending dues -> should fail
    renew_data = {
        "package_name": "Test Package",
        "duration_days": 30,
        "total_amount": 1000.0,
        "amount_paid": 1000.0,
        "payment_mode": "Cash"
    }
    print("Testing Renewal with Pending Dues...")
    res1 = req("POST", f"/members/{member_id}/renew", renew_data)
    print("Result:", res1)

    # 4. Clear the dues
    req("POST", "/payments", {
        "member_id": member_id,
        "amount_paid": 500.0,
        "payment_mode": "Cash",
        "payment_date": today
    })
    print("Cleared Dues.")

    # 5. Renew Early (within expiry) -> should extend from expiry_date
    print("Testing Early Renewal...")
    res2 = req("POST", f"/members/{member_id}/renew", renew_data)
    mem_updated = res2["member"]
    print("Membership History Check:", "PASS" if len(mem_updated.get("membership_history", [])) == 1 else "FAIL")
    print("Early renewal Expiry Date:", mem_updated["expiry_date"])
    print("Invoice ID:", res2["invoice_id"])
    
    # 6. Manually change expiry to the past to test late renewal
    past_date = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=10)).isoformat()
    await db.members.update_one({"id": member_id}, {"$set": {"expiry_date": past_date}})
    
    print("Testing Late Renewal...")
    res3 = req("POST", f"/members/{member_id}/renew", renew_data)
    mem_late = res3["member"]
    print("Late renewal Expiry Date:", mem_late["expiry_date"])
    
if __name__ == "__main__":
    asyncio.run(main())
