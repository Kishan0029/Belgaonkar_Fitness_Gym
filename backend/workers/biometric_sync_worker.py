import asyncio
import logging
from datetime import datetime, timezone
import uuid
import sys
from pathlib import Path

# Fix python path for imports in case this is run as a standalone script
sys.path.append(str(Path(__file__).parent.parent))
from integrations.biometric_service import BiometricService

logger = logging.getLogger(__name__)

async def test_connection(ip_address: str, port: int):
    """Test connection to a biometric device"""
    # ZK package operations are synchronous, so we run them in an executor loop to not block async flow
    loop = asyncio.get_event_loop()
    
    def _test():
        service = BiometricService(ip_address, port)
        return service.test_connection()
        
    return await loop.run_in_executor(None, _test)

async def start_biometric_sync(db):
    """Background worker loop to sync biometric attendance every 10 seconds"""
    logger.info("Biometric sync worker starting...")
    while True:
        try:
            await process_sync(db)
        except Exception as e:
            logger.error(f"Error in biometric sync loop: {e}")
        
        # Wait 10 seconds before next poll
        await asyncio.sleep(10)

async def process_sync(db):
    # Fetch all active devices
    devices = await db.biometric_devices.find({"status": {"$ne": "Disabled"}}).to_list(100)
    if not devices:
        return
        
    loop = asyncio.get_event_loop()
        
    for device in devices:
        def _fetch_records():
            service = BiometricService(device["ip_address"], device["port"])
            if not service.connect()[0]:
                return None, "Disconnected"
            records = service.get_attendance()
            # We clear attendance after fetching to keep device memory clean and avoid duplicates
            if records:
                service.clear_attendance()
            service.disconnect()
            return records, "Connected"
            
        records, status = await loop.run_in_executor(None, _fetch_records)
        
        # Update device status and sync time
        await db.biometric_devices.update_one(
            {"id": device["id"]},
            {
                "$set": {
                    "status": status,
                    "last_sync": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if records:
            logger.info(f"Fetched {len(records)} records from device {device['device_name']}")
            await process_attendance_records(db, records)

async def process_attendance_records(db, records):
    for record in records:
        # User ID from the device (usually a string corresponding to fingerprint ID)
        device_user_id = str(record.user_id)
        
        # Find member with this device_user_id and biometric_enabled
        member = await db.members.find_one({
            "device_user_id": device_user_id,
            "biometric_enabled": True
        })
        
        if not member:
            logger.warning(f"No active member linked to device_user_id {device_user_id}")
            continue
            
        # Parse timestamp from device record
        # ZK record.timestamp is usually a datetime object
        checkin_time = record.timestamp.replace(tzinfo=timezone.utc)
        
        # Validation
        now_utc = datetime.now(timezone.utc)
        expiry_date = datetime.fromisoformat(member["expiry_date"])
        
        if expiry_date.tzinfo is None:
            expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
        access_status = "granted"
        access_denied_reason = None
        
        if now_utc > expiry_date:
            access_status = "denied"
            access_denied_reason = "membership_expired"
        
        # Check if already recorded recently (prevent double-taps within 5 mins for instance)
        # Using a simple 10 minute threshold
        import datetime as dt
        threshold_time = checkin_time - dt.timedelta(minutes=10)
        
        existing = await db.attendance.find_one({
            "member_id": member["id"],
            "checkin_time": {"$gte": threshold_time.isoformat(), "$lte": checkin_time.isoformat()}
        })
        
        if existing:
            continue # Skip double tap
            
        # Record attendance
        attendance_record = {
            "id": str(uuid.uuid4()),
            "member_id": member["id"],
            "checkin_time": checkin_time.isoformat(),
            "attendance_source": "biometric",
            "access_status": access_status,
            "access_denied_reason": access_denied_reason
        }
        
        await db.attendance.insert_one(attendance_record)
        
        # Update member last visit
        if access_status == "granted":
            await db.members.update_one(
                {"id": member["id"]},
                {"$set": {"last_visit_date": checkin_time.isoformat()}}
            )
