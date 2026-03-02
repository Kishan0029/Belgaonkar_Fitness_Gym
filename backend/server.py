from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO
from fastapi.responses import StreamingResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from weasyprint import HTML

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "belgaonkar_fitness_secret_key_2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Create the main app without a prefix
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Scheduler for background jobs
scheduler = AsyncIOScheduler()

# =============== MODELS ===============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "staff"  # admin or staff

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PackageCreate(BaseModel):
    package_name: str
    duration_days: int
    price: float

class Package(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    package_name: str
    duration_days: int
    price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MemberCreate(BaseModel):
    full_name: str
    phone_number: str
    package_id: str
    join_date: datetime
    membership_start_date: datetime
    payment_status: str = "Pending"  # Paid, Partial, Pending
    total_amount: float
    discount_amount: float = 0.0
    amount_paid: float = 0.0
    assigned_trainer: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    pt_plan: Optional[str] = None  # None, alternate_day, daily
    pt_price: float = 0.0

class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    package_id: Optional[str] = None
    membership_start_date: Optional[datetime] = None
    payment_status: Optional[str] = None
    total_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    amount_paid: Optional[float] = None
    assigned_trainer: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    pt_plan: Optional[str] = None
    pt_price: Optional[float] = None

class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    phone_number: str
    join_date: datetime
    membership_start_date: datetime
    package_id: str
    expiry_date: datetime
    payment_status: str
    total_amount: float
    discount_amount: float
    amount_paid: float
    assigned_trainer: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    pt_plan: Optional[str] = None
    pt_price: float
    last_visit_date: Optional[datetime] = None
    extension_days: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceCreate(BaseModel):
    member_id: str

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    checkin_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    member_id: str
    amount_paid: float
    payment_mode: str  # Cash, UPI, Card
    payment_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    amount_paid: float
    payment_mode: str
    payment_date: datetime
    invoice_number: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    member_id: str
    type: str  # Expiry Reminder, Birthday, Inactive
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str

class DashboardStats(BaseModel):
    total_members: int
    active_members: int
    expiring_in_5_days: int
    todays_collection: float
    pending_payments: float
    inactive_members: int

# =============== AUTH HELPERS ===============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# =============== BACKGROUND JOBS ===============

async def check_expiring_members():
    """Check for members expiring in 5 days and log notifications"""
    five_days_from_now = datetime.now(timezone.utc) + timedelta(days=5)
    expiring = await db.members.find({
        "expiry_date": {
            "$gte": datetime.now(timezone.utc).isoformat(),
            "$lte": five_days_from_now.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    for member in expiring:
        # Check if notification already sent today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing = await db.notifications_log.find_one({
            "member_id": member["id"],
            "type": "Expiry Reminder",
            "sent_at": {"$gte": today_start.isoformat()}
        })
        
        if not existing:
            notification = NotificationLog(
                member_id=member["id"],
                type="Expiry Reminder",
                status="pending"
            )
            await db.notifications_log.insert_one(notification.model_dump())

async def check_inactive_members():
    """Check for members not visited in 7 days"""
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    inactive = await db.members.find({
        "last_visit_date": {"$lt": seven_days_ago.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    for member in inactive:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing = await db.notifications_log.find_one({
            "member_id": member["id"],
            "type": "Inactive",
            "sent_at": {"$gte": today_start.isoformat()}
        })
        
        if not existing:
            notification = NotificationLog(
                member_id=member["id"],
                type="Inactive",
                status="pending"
            )
            await db.notifications_log.insert_one(notification.model_dump())

async def check_birthdays():
    """Check for members with birthdays today"""
    today = datetime.now(timezone.utc)
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    
    for member in members:
        if member.get("date_of_birth"):
            dob = datetime.fromisoformat(member["date_of_birth"]) if isinstance(member["date_of_birth"], str) else member["date_of_birth"]
            if dob.month == today.month and dob.day == today.day:
                existing = await db.notifications_log.find_one({
                    "member_id": member["id"],
                    "type": "Birthday",
                    "sent_at": {"$gte": today.replace(hour=0, minute=0, second=0).isoformat()}
                })
                
                if not existing:
                    notification = NotificationLog(
                        member_id=member["id"],
                        type="Birthday",
                        status="pending"
                    )
                    await db.notifications_log.insert_one(notification.model_dump())

# =============== AUTH ROUTES ===============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict["password"] = get_password_hash(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    user_obj = User(**user)
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# =============== PACKAGE ROUTES ===============

@api_router.post("/packages", response_model=Package)
async def create_package(package_data: PackageCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create packages")
    
    package = Package(**package_data.model_dump())
    package_dict = package.model_dump()
    package_dict["created_at"] = package_dict["created_at"].isoformat()
    
    await db.packages.insert_one(package_dict)
    return package

@api_router.get("/packages", response_model=List[Package])
async def get_packages(current_user: User = Depends(get_current_user)):
    packages = await db.packages.find({}, {"_id": 0}).to_list(1000)
    for pkg in packages:
        if isinstance(pkg["created_at"], str):
            pkg["created_at"] = datetime.fromisoformat(pkg["created_at"])
    return packages

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete packages")
    
    result = await db.packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted successfully"}

# =============== MEMBER ROUTES ===============

@api_router.post("/members", response_model=Member)
async def create_member(member_data: MemberCreate, current_user: User = Depends(get_current_user)):
    # Check if phone number exists
    existing = await db.members.find_one({"phone_number": member_data.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Get package to calculate expiry
    package = await db.packages.find_one({"id": member_data.package_id}, {"_id": 0})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    expiry_date = member_data.membership_start_date + timedelta(days=package["duration_days"])
    
    member = Member(
        full_name=member_data.full_name,
        phone_number=member_data.phone_number,
        join_date=member_data.join_date,
        membership_start_date=member_data.membership_start_date,
        package_id=member_data.package_id,
        expiry_date=expiry_date,
        payment_status=member_data.payment_status,
        total_amount=member_data.total_amount,
        discount_amount=member_data.discount_amount,
        amount_paid=member_data.amount_paid,
        assigned_trainer=member_data.assigned_trainer,
        date_of_birth=member_data.date_of_birth,
        pt_plan=member_data.pt_plan,
        pt_price=member_data.pt_price,
        extension_days=0
    )
    
    member_dict = member.model_dump()
    member_dict["join_date"] = member_dict["join_date"].isoformat()
    member_dict["membership_start_date"] = member_dict["membership_start_date"].isoformat()
    member_dict["expiry_date"] = member_dict["expiry_date"].isoformat()
    member_dict["created_at"] = member_dict["created_at"].isoformat()
    if member_dict.get("date_of_birth"):
        member_dict["date_of_birth"] = member_dict["date_of_birth"].isoformat()
    
    await db.members.insert_one(member_dict)
    
    # Create payment record if amount paid
    if member_data.amount_paid > 0:
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        payment = Payment(
            member_id=member.id,
            amount_paid=member_data.amount_paid,
            payment_mode="Cash",
            payment_date=member_data.join_date,
            invoice_number=invoice_number
        )
        payment_dict = payment.model_dump()
        payment_dict["payment_date"] = payment_dict["payment_date"].isoformat()
        payment_dict["created_at"] = payment_dict["created_at"].isoformat()
        await db.payments.insert_one(payment_dict)
    
    return member

@api_router.get("/members", response_model=List[Member])
async def get_members(current_user: User = Depends(get_current_user)):
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    for member in members:
        if isinstance(member.get("join_date"), str):
            member["join_date"] = datetime.fromisoformat(member["join_date"])
        if isinstance(member.get("membership_start_date"), str):
            member["membership_start_date"] = datetime.fromisoformat(member["membership_start_date"])
        if isinstance(member.get("expiry_date"), str):
            member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
        if isinstance(member.get("created_at"), str):
            member["created_at"] = datetime.fromisoformat(member["created_at"])
        if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
            member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
        if member.get("date_of_birth") and isinstance(member["date_of_birth"], str):
            member["date_of_birth"] = datetime.fromisoformat(member["date_of_birth"])
        # Set defaults for new fields if missing
        if "discount_amount" not in member:
            member["discount_amount"] = 0.0
        if "pt_plan" not in member:
            member["pt_plan"] = None
        if "pt_price" not in member:
            member["pt_price"] = 0.0
        if "extension_days" not in member:
            member["extension_days"] = 0
        if "membership_start_date" not in member:
            member["membership_start_date"] = member["join_date"]
    return members

@api_router.get("/members/{member_id}", response_model=Member)
async def get_member(member_id: str, current_user: User = Depends(get_current_user)):
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if isinstance(member.get("join_date"), str):
        member["join_date"] = datetime.fromisoformat(member["join_date"])
    if isinstance(member.get("membership_start_date"), str):
        member["membership_start_date"] = datetime.fromisoformat(member["membership_start_date"])
    if isinstance(member.get("expiry_date"), str):
        member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
    if isinstance(member.get("created_at"), str):
        member["created_at"] = datetime.fromisoformat(member["created_at"])
    if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
        member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
    if member.get("date_of_birth") and isinstance(member["date_of_birth"], str):
        member["date_of_birth"] = datetime.fromisoformat(member["date_of_birth"])
    
    # Set defaults for new fields if missing
    if "discount_amount" not in member:
        member["discount_amount"] = 0.0
    if "pt_plan" not in member:
        member["pt_plan"] = None
    if "pt_price" not in member:
        member["pt_price"] = 0.0
    if "extension_days" not in member:
        member["extension_days"] = 0
    if "membership_start_date" not in member:
        member["membership_start_date"] = member["join_date"]
    
    return Member(**member)

@api_router.get("/members/{member_id}/attendance-stats")
async def get_member_attendance_stats(member_id: str, current_user: User = Depends(get_current_user)):
    """Check if member qualifies for extension due to low attendance"""
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Get attendance for last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    attendance_records = await db.attendance.find({
        "member_id": member_id,
        "checkin_time": {"$gte": thirty_days_ago.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    attendance_count = len(attendance_records)
    qualifies_for_extension = attendance_count <= 2
    
    return {
        "member_id": member_id,
        "attendance_last_30_days": attendance_count,
        "qualifies_for_extension": qualifies_for_extension,
        "extension_eligible": qualifies_for_extension,
        "message": "Member attended only 1-2 days. Eligible for extension." if qualifies_for_extension else "Regular attendance. No extension needed."
    }

@api_router.patch("/members/{member_id}", response_model=Member)
async def update_member(member_id: str, member_data: MemberUpdate, current_user: User = Depends(get_current_user)):
    member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    update_dict = {k: v for k, v in member_data.model_dump(exclude_unset=True).items() if v is not None}
    
    # If package changed or membership_start_date changed, recalculate expiry
    if "package_id" in update_dict or "membership_start_date" in update_dict:
        package_id = update_dict.get("package_id", member["package_id"])
        package = await db.packages.find_one({"id": package_id}, {"_id": 0})
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Use new membership_start_date if provided, otherwise use existing
        if "membership_start_date" in update_dict:
            start_date = update_dict["membership_start_date"]
        elif isinstance(member.get("membership_start_date"), str):
            start_date = datetime.fromisoformat(member["membership_start_date"])
        else:
            start_date = member.get("membership_start_date", member.get("join_date"))
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date)
        
        update_dict["expiry_date"] = (start_date + timedelta(days=package["duration_days"])).isoformat()
    
    # Convert datetime fields to ISO format for storage
    for field in ["membership_start_date"]:
        if field in update_dict and isinstance(update_dict[field], datetime):
            update_dict[field] = update_dict[field].isoformat()
    
    if update_dict:
        await db.members.update_one({"id": member_id}, {"$set": update_dict})
    
    updated_member = await db.members.find_one({"id": member_id}, {"_id": 0})
    if isinstance(updated_member.get("join_date"), str):
        updated_member["join_date"] = datetime.fromisoformat(updated_member["join_date"])
    if isinstance(updated_member.get("membership_start_date"), str):
        updated_member["membership_start_date"] = datetime.fromisoformat(updated_member["membership_start_date"])
    if isinstance(updated_member.get("expiry_date"), str):
        updated_member["expiry_date"] = datetime.fromisoformat(updated_member["expiry_date"])
    if isinstance(updated_member.get("created_at"), str):
        updated_member["created_at"] = datetime.fromisoformat(updated_member["created_at"])
    if updated_member.get("last_visit_date") and isinstance(updated_member["last_visit_date"], str):
        updated_member["last_visit_date"] = datetime.fromisoformat(updated_member["last_visit_date"])
    if updated_member.get("date_of_birth") and isinstance(updated_member["date_of_birth"], str):
        updated_member["date_of_birth"] = datetime.fromisoformat(updated_member["date_of_birth"])
    
    # Set defaults for new fields if missing
    if "discount_amount" not in updated_member:
        updated_member["discount_amount"] = 0.0
    if "pt_plan" not in updated_member:
        updated_member["pt_plan"] = None
    if "pt_price" not in updated_member:
        updated_member["pt_price"] = 0.0
    if "extension_days" not in updated_member:
        updated_member["extension_days"] = 0
    if "membership_start_date" not in updated_member:
        updated_member["membership_start_date"] = updated_member["join_date"]
    
    return Member(**updated_member)

@api_router.get("/members/search/{query}")
async def search_members(query: str, current_user: User = Depends(get_current_user)):
    members = await db.members.find({
        "$or": [
            {"full_name": {"$regex": query, "$options": "i"}},
            {"phone_number": {"$regex": query, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    
    for member in members:
        if isinstance(member.get("join_date"), str):
            member["join_date"] = datetime.fromisoformat(member["join_date"])
        if isinstance(member.get("membership_start_date"), str):
            member["membership_start_date"] = datetime.fromisoformat(member["membership_start_date"])
        if isinstance(member.get("expiry_date"), str):
            member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
        if isinstance(member.get("created_at"), str):
            member["created_at"] = datetime.fromisoformat(member["created_at"])
        if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
            member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
        if member.get("date_of_birth") and isinstance(member["date_of_birth"], str):
            member["date_of_birth"] = datetime.fromisoformat(member["date_of_birth"])
    
    return members

@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete members")
    
    result = await db.members.delete_one({"id": member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Delete related data
    await db.attendance.delete_many({"member_id": member_id})
    await db.payments.delete_many({"member_id": member_id})
    
    return {"message": "Member deleted successfully"}

# =============== ATTENDANCE ROUTES ===============

@api_router.post("/attendance")
async def mark_attendance(attendance_data: AttendanceCreate, current_user: User = Depends(get_current_user)):
    # Check if already checked in today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    existing = await db.attendance.find_one({
        "member_id": attendance_data.member_id,
        "checkin_time": {"$gte": today_start.isoformat()}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")
    
    attendance = Attendance(member_id=attendance_data.member_id)
    attendance_dict = attendance.model_dump()
    attendance_dict["checkin_time"] = attendance_dict["checkin_time"].isoformat()
    
    await db.attendance.insert_one(attendance_dict)
    
    # Update member's last_visit_date
    await db.members.update_one(
        {"id": attendance_data.member_id},
        {"$set": {"last_visit_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Attendance marked successfully"}

@api_router.get("/attendance/member/{member_id}")
async def get_member_attendance(member_id: str, current_user: User = Depends(get_current_user)):
    attendance = await db.attendance.find({"member_id": member_id}, {"_id": 0}).sort("checkin_time", -1).to_list(1000)
    for record in attendance:
        if isinstance(record.get("checkin_time"), str):
            record["checkin_time"] = datetime.fromisoformat(record["checkin_time"])
    return attendance

# =============== PAYMENT ROUTES ===============

@api_router.post("/payments", response_model=Payment)
async def record_payment(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    # Generate invoice number
    invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    payment = Payment(
        member_id=payment_data.member_id,
        amount_paid=payment_data.amount_paid,
        payment_mode=payment_data.payment_mode,
        payment_date=payment_data.payment_date,
        invoice_number=invoice_number
    )
    
    payment_dict = payment.model_dump()
    payment_dict["payment_date"] = payment_dict["payment_date"].isoformat()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    
    await db.payments.insert_one(payment_dict)
    
    # Update member's amount_paid and payment_status
    member = await db.members.find_one({"id": payment_data.member_id}, {"_id": 0})
    if member:
        new_amount_paid = member["amount_paid"] + payment_data.amount_paid
        payment_status = "Paid" if new_amount_paid >= member["total_amount"] else "Partial" if new_amount_paid > 0 else "Pending"
        
        await db.members.update_one(
            {"id": payment_data.member_id},
            {"$set": {"amount_paid": new_amount_paid, "payment_status": payment_status}}
        )
    
    return payment

@api_router.get("/payments/member/{member_id}")
async def get_member_payments(member_id: str, current_user: User = Depends(get_current_user)):
    payments = await db.payments.find({"member_id": member_id}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    for payment in payments:
        if isinstance(payment.get("payment_date"), str):
            payment["payment_date"] = datetime.fromisoformat(payment["payment_date"])
        if isinstance(payment.get("created_at"), str):
            payment["created_at"] = datetime.fromisoformat(payment["created_at"])
    return payments

@api_router.get("/payments")
async def get_all_payments(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all payments")
    
    payments = await db.payments.find({}, {"_id": 0}).sort("payment_date", -1).to_list(10000)
    for payment in payments:
        if isinstance(payment.get("payment_date"), str):
            payment["payment_date"] = datetime.fromisoformat(payment["payment_date"])
        if isinstance(payment.get("created_at"), str):
            payment["created_at"] = datetime.fromisoformat(payment["created_at"])
    return payments

# =============== DASHBOARD ROUTES ===============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_members = await db.members.count_documents({})
    
    # Active members (not expired)
    now = datetime.now(timezone.utc)
    active_members = await db.members.count_documents({
        "expiry_date": {"$gte": now.isoformat()}
    })
    
    # Expiring in 5 days
    five_days = now + timedelta(days=5)
    expiring = await db.members.count_documents({
        "expiry_date": {
            "$gte": now.isoformat(),
            "$lte": five_days.isoformat()
        }
    })
    
    # Today's collection
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_payments = await db.payments.find({
        "payment_date": {"$gte": today_start.isoformat()}
    }, {"_id": 0}).to_list(10000)
    todays_collection = sum(p["amount_paid"] for p in today_payments)
    
    # Pending payments (members with balance)
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    pending_payments = sum(max(0, m["total_amount"] - m["amount_paid"]) for m in members)
    
    # Inactive members (not visited in 7 days)
    seven_days_ago = now - timedelta(days=7)
    inactive = await db.members.count_documents({
        "last_visit_date": {"$lt": seven_days_ago.isoformat()}
    })
    
    return DashboardStats(
        total_members=total_members,
        active_members=active_members,
        expiring_in_5_days=expiring,
        todays_collection=todays_collection,
        pending_payments=pending_payments,
        inactive_members=inactive
    )

@api_router.get("/dashboard/expiring-members")
async def get_expiring_members(current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    five_days = now + timedelta(days=5)
    
    members = await db.members.find({
        "expiry_date": {
            "$gte": now.isoformat(),
            "$lte": five_days.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    for member in members:
        if isinstance(member.get("join_date"), str):
            member["join_date"] = datetime.fromisoformat(member["join_date"])
        if isinstance(member.get("expiry_date"), str):
            member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
        if isinstance(member.get("created_at"), str):
            member["created_at"] = datetime.fromisoformat(member["created_at"])
        if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
            member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
        if member.get("date_of_birth") and isinstance(member["date_of_birth"], str):
            member["date_of_birth"] = datetime.fromisoformat(member["date_of_birth"])
    
    return members

@api_router.get("/dashboard/inactive-members")
async def get_inactive_members(current_user: User = Depends(get_current_user)):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    members = await db.members.find({
        "last_visit_date": {"$lt": seven_days_ago.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    for member in members:
        if isinstance(member.get("join_date"), str):
            member["join_date"] = datetime.fromisoformat(member["join_date"])
        if isinstance(member.get("expiry_date"), str):
            member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
        if isinstance(member.get("created_at"), str):
            member["created_at"] = datetime.fromisoformat(member["created_at"])
        if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
            member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
        if member.get("date_of_birth") and isinstance(member["date_of_birth"], str):
            member["date_of_birth"] = datetime.fromisoformat(member["date_of_birth"])
    
    return members

@api_router.get("/dashboard/pending-payments")
async def get_pending_payments(current_user: User = Depends(get_current_user)):
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    pending = [m for m in members if m["amount_paid"] < m["total_amount"]]
    
    for member in pending:
        if isinstance(member.get("join_date"), str):
            member["join_date"] = datetime.fromisoformat(member["join_date"])
        if isinstance(member.get("expiry_date"), str):
            member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
        if isinstance(member.get("created_at"), str):
            member["created_at"] = datetime.fromisoformat(member["created_at"])
        if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
            member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
        if member.get("date_of_birth") and isinstance(member["date_of_birth"], str):
            member["date_of_birth"] = datetime.fromisoformat(member["date_of_birth"])
    
    return pending

@api_router.get("/dashboard/birthday-today")
async def get_birthday_members(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    members = await db.members.find({}, {"_id": 0}).to_list(10000)
    
    birthday_members = []
    for member in members:
        if member.get("date_of_birth"):
            dob = datetime.fromisoformat(member["date_of_birth"]) if isinstance(member["date_of_birth"], str) else member["date_of_birth"]
            if dob.month == today.month and dob.day == today.day:
                if isinstance(member.get("join_date"), str):
                    member["join_date"] = datetime.fromisoformat(member["join_date"])
                if isinstance(member.get("expiry_date"), str):
                    member["expiry_date"] = datetime.fromisoformat(member["expiry_date"])
                if isinstance(member.get("created_at"), str):
                    member["created_at"] = datetime.fromisoformat(member["created_at"])
                if member.get("last_visit_date") and isinstance(member["last_visit_date"], str):
                    member["last_visit_date"] = datetime.fromisoformat(member["last_visit_date"])
                birthday_members.append(member)
    
    return birthday_members

# =============== INVOICE PDF GENERATION ===============

@api_router.get("/invoice/{payment_id}")
async def generate_invoice(payment_id: str, current_user: User = Depends(get_current_user)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    member = await db.members.find_one({"id": payment["member_id"]}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    package = await db.packages.find_one({"id": member["package_id"]}, {"_id": 0})
    
    # Get all previous payments
    all_payments = await db.payments.find({"member_id": payment["member_id"]}, {"_id": 0}).sort("payment_date", 1).to_list(100)
    
    # Calculate previous paid and current payment
    previous_paid = sum(p["amount_paid"] for p in all_payments if p["id"] != payment_id)
    current_paid = payment["amount_paid"]
    total_paid_so_far = previous_paid + current_paid
    balance_remaining = member["total_amount"] - total_paid_so_far
    
    # Prepare dates
    payment_date = datetime.fromisoformat(payment["payment_date"]) if isinstance(payment["payment_date"], str) else payment["payment_date"]
    start_date = datetime.fromisoformat(member.get("membership_start_date", member["join_date"])) if isinstance(member.get("membership_start_date", member["join_date"]), str) else member.get("membership_start_date", member["join_date"])
    end_date = datetime.fromisoformat(member["expiry_date"]) if isinstance(member["expiry_date"], str) else member["expiry_date"]
    
    # Payment breakdown rows
    breakdown_rows = ""
    if previous_paid > 0:
        breakdown_rows += f"<tr><td>Previous Payments</td><td>₹{previous_paid:.2f}</td></tr>"
    breakdown_rows += f"<tr><td>Current Payment</td><td>₹{current_paid:.2f}</td></tr>"
    breakdown_rows += f"<tr style='font-weight:bold;'><td>Total Paid</td><td>₹{total_paid_so_far:.2f}</td></tr>"
    if balance_remaining > 0:
        breakdown_rows += f"<tr style='color:#dc2626;'><td>Balance Due</td><td>₹{balance_remaining:.2f}</td></tr>"
    
    # HTML Template
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice</title>
<style>
body {{
    font-family: 'Inter', Arial, sans-serif;
    background: #f4f6f8;
    padding: 30px;
}}

.invoice-box {{
    max-width: 800px;
    margin: auto;
    background: #ffffff;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}}

.header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 20px;
}}

.logo img {{
    height: 60px;
}}

.title {{
    text-align: right;
}}

.title h1 {{
    margin: 0;
    color: #111;
    letter-spacing: 1px;
}}

.meta {{
    margin-top: 25px;
    display: flex;
    justify-content: space-between;
}}

.section {{
    margin-top: 30px;
}}

.section h3 {{
    margin-bottom: 10px;
    color: #555;
    font-size: 14px;
    text-transform: uppercase;
}}

.details {{
    background: #fafafa;
    padding: 20px;
    border-radius: 8px;
}}

table {{
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}}

table th {{
    background: #111;
    color: white;
    padding: 12px;
    text-align: left;
}}

table td {{
    padding: 12px;
    border-bottom: 1px solid #eee;
}}

.total {{
    text-align: right;
    margin-top: 20px;
    font-size: 20px;
    font-weight: bold;
}}

.footer {{
    margin-top: 40px;
    text-align: center;
    color: #888;
    font-size: 13px;
}}
</style>
</head>

<body>
<div class="invoice-box">

<div class="header">
    <div class="logo">
        <img src="https://customer-assets.emergentagent.com/job_870dffc5-d23e-4d9b-9a17-fd80e664523e/artifacts/bpacos33_Belgaonkar%20Fitness%20Gym.png" />
    </div>
    <div class="title">
        <h1>INVOICE</h1>
        <p>{payment['invoice_number']}</p>
    </div>
</div>

<div class="meta">
    <div>
        <strong>Belgaonkar Fitness</strong><br>
        Phone: +91 9876543210
    </div>
    <div>
        Payment Date:<br>
        <strong>{payment_date.strftime('%d %B %Y')}</strong>
    </div>
</div>

<div class="section">
<h3>Member Details</h3>
<div class="details">
{member['full_name']}<br>
Phone: {member['phone_number']}
</div>
</div>

<div class="section">
<h3>Membership Information</h3>
<table>
<tr>
<th>Package</th>
<th>Start Date</th>
<th>End Date</th>
<th>Total Amount</th>
</tr>
<tr>
<td>{package['package_name'] if package else 'N/A'}</td>
<td>{start_date.strftime('%d %B %Y')}</td>
<td>{end_date.strftime('%d %B %Y')}</td>
<td>₹{member['total_amount']:.2f}</td>
</tr>
</table>
</div>

<div class="section">
<h3>Payment Breakdown</h3>
<table>
<tr>
<th>Description</th>
<th>Amount</th>
</tr>
{breakdown_rows}
</table>
</div>

<div class="total">
Paid via {payment['payment_mode']}
</div>

<div class="footer">
Thank you for choosing Belgaonkar Fitness.<br>
Stay consistent. Stay strong.
</div>

</div>
</body>
</html>"""
    
    # Generate PDF from HTML
    pdf = HTML(string=html).write_pdf()
    
    return StreamingResponse(BytesIO(pdf), media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=invoice_{payment['invoice_number']}.pdf"
    })

# =============== NOTIFICATIONS ===============

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications_log.find({}, {"_id": 0}).sort("sent_at", -1).to_list(1000)
    for notif in notifications:
        if isinstance(notif.get("sent_at"), str):
            notif["sent_at"] = datetime.fromisoformat(notif["sent_at"])
    return notifications

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Schedule background jobs
    scheduler.add_job(check_expiring_members, 'cron', hour=9, minute=0)  # Daily at 9 AM
    scheduler.add_job(check_inactive_members, 'cron', hour=9, minute=0)  # Daily at 9 AM
    scheduler.add_job(check_birthdays, 'cron', hour=0, minute=0)  # Daily at midnight
    scheduler.start()
    logger.info("Background scheduler started")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()
