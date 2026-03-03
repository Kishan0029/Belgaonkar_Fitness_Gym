import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import pprint

load_dotenv()
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

async def main():
    exps = await db.expenses.find({}).to_list(10)
    pprint.pprint(exps)
    pays = await db.payments.find({}).to_list(1)
    pprint.pprint(pays)
    
asyncio.run(main())
