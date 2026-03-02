import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os, sys
sys.path.append('/app/backend')
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def update():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    result = await db.members.update_many(
        {'discount_amount': {'$exists': False}},
        {'$set': {'discount_amount': 0.0, 'pt_plan': None, 'pt_price': 0.0, 'extension_days': 0}}
    )
    print(f'✓ Updated {result.modified_count} members with new fields')
    
    count = 0
    async for member in db.members.find({'membership_start_date': {'$exists': False}}):
        await db.members.update_one(
            {'id': member['id']},
            {'$set': {'membership_start_date': member['join_date']}}
        )
        count += 1
    print(f'✓ Set membership_start_date for {count} members')
    
    client.close()

asyncio.run(update())
