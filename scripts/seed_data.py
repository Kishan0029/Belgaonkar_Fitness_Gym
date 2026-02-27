import sys
sys.path.append('/app/backend')

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import uuid
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_data():
    print("Seeding database with demo data...")
    
    # Create admin and staff users
    users = [
        {
            "id": str(uuid.uuid4()),
            "email": "admin@belgaonkar.com",
            "password": pwd_context.hash("admin123"),
            "full_name": "Admin User",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "staff@belgaonkar.com",
            "password": pwd_context.hash("staff123"),
            "full_name": "Staff User",
            "role": "staff",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Clear existing users
    await db.users.delete_many({})
    await db.users.insert_many(users)
    print(f"✓ Created {len(users)} users")
    
    # Create packages
    packages = [
        {
            "id": str(uuid.uuid4()),
            "package_name": "1 Month",
            "duration_days": 30,
            "price": 1500.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "package_name": "3 Months",
            "duration_days": 90,
            "price": 4000.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "package_name": "6 Months",
            "duration_days": 180,
            "price": 7500.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "package_name": "1 Year",
            "duration_days": 365,
            "price": 12000.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.packages.delete_many({})
    await db.packages.insert_many(packages)
    print(f"✓ Created {len(packages)} packages")
    
    # Create sample members
    now = datetime.now(timezone.utc)
    members = []
    
    # Active member
    member1 = {
        "id": str(uuid.uuid4()),
        "full_name": "Rajesh Kumar",
        "phone_number": "9876543210",
        "join_date": (now - timedelta(days=10)).isoformat(),
        "package_id": packages[0]["id"],
        "expiry_date": (now + timedelta(days=20)).isoformat(),
        "payment_status": "Paid",
        "total_amount": 1500.0,
        "amount_paid": 1500.0,
        "assigned_trainer": "Trainer A",
        "date_of_birth": (now - timedelta(days=365*28)).isoformat(),
        "last_visit_date": (now - timedelta(days=1)).isoformat(),
        "created_at": now.isoformat()
    }
    members.append(member1)
    
    # Expiring soon member
    member2 = {
        "id": str(uuid.uuid4()),
        "full_name": "Priya Sharma",
        "phone_number": "9876543211",
        "join_date": (now - timedelta(days=87)).isoformat(),
        "package_id": packages[1]["id"],
        "expiry_date": (now + timedelta(days=3)).isoformat(),
        "payment_status": "Paid",
        "total_amount": 4000.0,
        "amount_paid": 4000.0,
        "assigned_trainer": "Trainer B",
        "date_of_birth": (now - timedelta(days=365*25)).isoformat(),
        "last_visit_date": (now - timedelta(days=2)).isoformat(),
        "created_at": now.isoformat()
    }
    members.append(member2)
    
    # Inactive member
    member3 = {
        "id": str(uuid.uuid4()),
        "full_name": "Amit Desai",
        "phone_number": "9876543212",
        "join_date": (now - timedelta(days=50)).isoformat(),
        "package_id": packages[2]["id"],
        "expiry_date": (now + timedelta(days=130)).isoformat(),
        "payment_status": "Paid",
        "total_amount": 7500.0,
        "amount_paid": 7500.0,
        "assigned_trainer": None,
        "date_of_birth": (now - timedelta(days=365*32)).isoformat(),
        "last_visit_date": (now - timedelta(days=10)).isoformat(),
        "created_at": now.isoformat()
    }
    members.append(member3)
    
    # Pending payment member
    member4 = {
        "id": str(uuid.uuid4()),
        "full_name": "Sneha Patil",
        "phone_number": "9876543213",
        "join_date": (now - timedelta(days=5)).isoformat(),
        "package_id": packages[0]["id"],
        "expiry_date": (now + timedelta(days=25)).isoformat(),
        "payment_status": "Partial",
        "total_amount": 1500.0,
        "amount_paid": 500.0,
        "assigned_trainer": "Trainer A",
        "date_of_birth": (now - timedelta(days=365*22)).isoformat(),
        "last_visit_date": (now - timedelta(hours=12)).isoformat(),
        "created_at": now.isoformat()
    }
    members.append(member4)
    
    # Birthday today member
    member5 = {
        "id": str(uuid.uuid4()),
        "full_name": "Vikram Singh",
        "phone_number": "9876543214",
        "join_date": (now - timedelta(days=100)).isoformat(),
        "package_id": packages[3]["id"],
        "expiry_date": (now + timedelta(days=265)).isoformat(),
        "payment_status": "Paid",
        "total_amount": 12000.0,
        "amount_paid": 12000.0,
        "assigned_trainer": "Trainer C",
        "date_of_birth": datetime(now.year - 30, now.month, now.day, tzinfo=timezone.utc).isoformat(),
        "last_visit_date": now.isoformat(),
        "created_at": now.isoformat()
    }
    members.append(member5)
    
    await db.members.delete_many({})
    await db.members.insert_many(members)
    print(f"✓ Created {len(members)} members")
    
    # Create some attendance records
    attendance_records = []
    for member in members[:3]:  # First 3 members
        for days_ago in range(1, 8):  # Last 7 days
            attendance_records.append({
                "id": str(uuid.uuid4()),
                "member_id": member["id"],
                "checkin_time": (now - timedelta(days=days_ago)).isoformat()
            })
    
    await db.attendance.delete_many({})
    await db.attendance.insert_many(attendance_records)
    print(f"✓ Created {len(attendance_records)} attendance records")
    
    # Create some payment records
    payments = []
    for member in members:
        if member["amount_paid"] > 0:
            payment = {
                "id": str(uuid.uuid4()),
                "member_id": member["id"],
                "amount_paid": member["amount_paid"],
                "payment_mode": "Cash",
                "payment_date": member["join_date"],
                "invoice_number": f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}",
                "created_at": member["join_date"]
            }
            payments.append(payment)
    
    await db.payments.delete_many({})
    await db.payments.insert_many(payments)
    print(f"✓ Created {len(payments)} payment records")
    
    print("\n✅ Database seeded successfully!")
    print("\nDemo Credentials:")
    print("Admin: admin@belgaonkar.com / admin123")
    print("Staff: staff@belgaonkar.com / staff123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
