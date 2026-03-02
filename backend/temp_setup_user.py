import asyncio, os, bcrypt, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(".env")
async def main():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    users_to_create = [
        {"email": "owner@belgaonkarfitness.com", "password": "Belgaonkar@123", "full_name": "Owner", "role": "admin"},
        {"email": "staff@belgaonkarfitness.com", "password": "Staff@123", "full_name": "Staff", "role": "staff"}
    ]
    
    for u in users_to_create:
        email = u["email"]
        password = u["password"]
        role = u["role"]
        full_name = u["full_name"]
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        existing = await db.users.find_one({"email": email})
        if existing:
            await db.users.update_one({"email": email}, {"$set": {"password": hashed, "role": role, "full_name": full_name}})
            print(f"Updated user: {email}")
        else:
            await db.users.insert_one({"id": str(uuid.uuid4()), "email": email, "password": hashed, "full_name": full_name, "role": role, "created_at": datetime.now(timezone.utc).isoformat()})
            print(f"Created user: {email}")

asyncio.run(main())
