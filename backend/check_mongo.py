import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import pprint
from datetime import datetime, timezone

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["belgaonkar_dev"]

async def main():
    print("ALL EXPENSES:")
    all_exp = await db.expenses.find({}).to_list(None)
    pprint.pprint(all_exp)
    print("TEST MATCH:")
    start_date = datetime(2026, 3, 1, tzinfo=timezone.utc).isoformat()
    end_date = datetime(2026, 4, 1, tzinfo=timezone.utc).isoformat()
    print("Start:", start_date)
    print("End:", end_date)
    matches = await db.expenses.find({
        "expense_date": {"$gte": start_date, "$lt": end_date},
        "status": "active"
    }).to_list(None)
    pprint.pprint(matches)

asyncio.run(main())
