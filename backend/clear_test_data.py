import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load the environment variables to connect to the same DB as the server
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def clear_data():
    # Remove all expenses
    res_exp = await db.expenses.delete_many({})
    print(f"Deleted {res_exp.deleted_count} expenses.")
    
    # Remove all members (including testing ones)
    res_mem = await db.members.delete_many({})
    print(f"Deleted {res_mem.deleted_count} members.")
    
    # Remove all payments
    res_pay = await db.payments.delete_many({})
    print(f"Deleted {res_pay.deleted_count} payments.")

    # Remove all attendance records (since they belong to members)
    res_att = await db.attendance.delete_many({})
    print(f"Deleted {res_att.deleted_count} attendance records.")

if __name__ == "__main__":
    asyncio.run(clear_data())
