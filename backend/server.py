from datetime import datetime, timedelta, timezone
from pathlib import Path
import logging
import os
import secrets
import uuid
from typing import Any, Dict, List, Optional

import bcrypt
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="EduVibe School App API")
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

SESSION_TTL_DAYS = 7
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "student"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class LeaveCreate(BaseModel):
    start_date: str
    end_date: str
    reason: str


class ContentCreate(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    value: Optional[str] = ""
    meta: Optional[Dict[str, Any]] = None


class LeaveStatusUpdate(BaseModel):
    status: str  # Approved / Rejected / Pending


# ---------- Modules metadata ----------
MODULES: List[Dict[str, Any]] = [
    {"key": "attendance", "title": "Attendance", "hi": "उपस्थिति", "icon": "calendar-outline", "category": "quick", "badge": "94%"},
    {"key": "homework", "title": "Homework", "hi": "गृहकार्य", "icon": "book-outline", "category": "quick", "badge": "4"},
    {"key": "live_class", "title": "Live Class", "hi": "लाइव कक्षा", "icon": "videocam-outline", "category": "quick", "badge": "LIVE"},
    {"key": "exam_schedule", "title": "Exam Schedule", "hi": "परीक्षा समय-सारणी", "icon": "clipboard-outline", "category": "quick", "badge": None},
    {"key": "timetable", "title": "Time Table", "hi": "समय-सारणी", "icon": "grid-outline", "category": "academics", "badge": None},
    {"key": "syllabus", "title": "Syllabus", "hi": "पाठ्यक्रम", "icon": "list-outline", "category": "academics", "badge": None},
    {"key": "teachers", "title": "My Teachers", "hi": "मेरे शिक्षक", "icon": "people-outline", "category": "academics", "badge": None},
    {"key": "exam_report", "title": "Exam Report", "hi": "परीक्षा रिपोर्ट", "icon": "bar-chart-outline", "category": "academics", "badge": None},
    {"key": "projects", "title": "Projects", "hi": "प्रोजेक्ट", "icon": "construct-outline", "category": "academics", "badge": "2"},
    {"key": "activity", "title": "Activity", "hi": "गतिविधि", "icon": "walk-outline", "category": "academics", "badge": None},
    {"key": "book_search", "title": "Book Search", "hi": "पुस्तक खोज", "icon": "search-outline", "category": "library", "badge": None},
    {"key": "books_history", "title": "Books History", "hi": "पुस्तक इतिहास", "icon": "time-outline", "category": "library", "badge": "2"},
    {"key": "book_request", "title": "Book Request", "hi": "पुस्तक अनुरोध", "icon": "add-circle-outline", "category": "library", "badge": None},
    {"key": "new_books", "title": "New Books", "hi": "नई पुस्तकें", "icon": "library-outline", "category": "library", "badge": "8"},
    {"key": "circulars", "title": "Circulars", "hi": "परिपत्र", "icon": "document-text-outline", "category": "updates", "badge": "3"},
    {"key": "events", "title": "Events", "hi": "कार्यक्रम", "icon": "sparkles-outline", "category": "updates", "badge": None},
    {"key": "news_events", "title": "News & Events", "hi": "समाचार", "icon": "newspaper-outline", "category": "updates", "badge": "2"},
    {"key": "birthdays", "title": "Birthdays", "hi": "जन्मदिन", "icon": "gift-outline", "category": "updates", "badge": "2"},
    {"key": "notifications", "title": "Notifications", "hi": "सूचनाएं", "icon": "notifications-outline", "category": "updates", "badge": "4"},
    {"key": "fee_summary", "title": "Fee Summary", "hi": "फीस सारांश", "icon": "wallet-outline", "category": "account", "badge": None},
    {"key": "fee_payment", "title": "Fee Payment", "hi": "फीस भुगतान", "icon": "card-outline", "category": "account", "badge": None},
    {"key": "fee_paid", "title": "Fee Paid Details", "hi": "भुगतान विवरण", "icon": "receipt-outline", "category": "account", "badge": None},
    {"key": "fee_due", "title": "Fee Due Details", "hi": "बकाया फीस", "icon": "alert-circle-outline", "category": "account", "badge": "₹4,500"},
    {"key": "leaves", "title": "Leaves", "hi": "अवकाश", "icon": "airplane-outline", "category": "account", "badge": None},
    {"key": "transport", "title": "Transport", "hi": "परिवहन", "icon": "bus-outline", "category": "account", "badge": "42"},
    {"key": "messages", "title": "Messages", "hi": "संदेश", "icon": "chatbubble-ellipses-outline", "category": "account", "badge": "5"},
    {"key": "sms_history", "title": "SMS History", "hi": "SMS इतिहास", "icon": "chatbox-outline", "category": "account", "badge": None},
    {"key": "diary", "title": "My Diary", "hi": "मेरी डायरी", "icon": "journal-outline", "category": "account", "badge": "1"},
    {"key": "profile", "title": "My Profile", "hi": "प्रोफ़ाइल", "icon": "person-outline", "category": "account", "badge": None},
    {"key": "help", "title": "Help", "hi": "सहायता", "icon": "help-circle-outline", "category": "account", "badge": None},
]


# ---------- Demo seed data ----------
DEMO_STUDENT_PROFILE = {
    "name": "Aarav Sharma",
    "initials": "AS",
    "student_id": "EV-10A-018",
    "class_name": "Class 10-A",
    "roll_no": "18",
    "house": "Emerald",
    "school": "EduVibe Academy",
}

DEMO_SEED: Dict[str, List[Dict[str, Any]]] = {
    "circulars": [
        {"title": "Inter-school science exhibition registrations open", "subtitle": "Academic", "value": "Today", "meta": {"unread": True}},
        {"title": "Parent-teacher meeting on Saturday", "subtitle": "Notice", "value": "Yesterday", "meta": {"unread": True}},
        {"title": "Winter uniform guidelines", "subtitle": "General", "value": "12 Jan", "meta": {"unread": False}},
    ],
    "homework": [
        {"title": "Quadratic equations worksheet", "subtitle": "Mathematics · Mr. Mehta", "value": "Pending", "meta": {"due": "Tomorrow"}},
        {"title": "Cell diagram lab record", "subtitle": "Biology · Dr. Sen", "value": "Pending", "meta": {"due": "26 Jan"}},
        {"title": "Book review: The Alchemist", "subtitle": "English · Mrs. D'Souza", "value": "Submitted", "meta": {"due": "28 Jan"}},
    ],
    "events": [
        {"title": "Annual Sports Day", "subtitle": "School Ground", "value": "02 Feb"},
        {"title": "Science Exhibition", "subtitle": "Innovation Lab", "value": "14 Feb"},
    ],
    "news_events": [
        {"title": "Robotics club wins state championship", "subtitle": "Highlight", "value": "This week"},
        {"title": "Annual day performances announced", "subtitle": "Culture", "value": "Soon"},
    ],
    "notifications": [
        {"title": "New circular published", "subtitle": "school", "value": "10 min ago"},
        {"title": "Homework due tomorrow", "subtitle": "academic", "value": "1 hr ago"},
        {"title": "Bus route 42 is on time", "subtitle": "transport", "value": "Today"},
        {"title": "Fee receipt generated", "subtitle": "finance", "value": "Yesterday"},
    ],
    "teachers": [
        {"title": "Mr. Rohan Mehta", "subtitle": "Mathematics", "value": "Message", "meta": {"initials": "RM"}},
        {"title": "Ms. Kavita Rao", "subtitle": "Physics", "value": "Message", "meta": {"initials": "KR"}},
        {"title": "Mrs. Anne D'Souza", "subtitle": "English", "value": "Message", "meta": {"initials": "AD"}},
    ],
    "timetable": [
        {"title": "Monday", "subtitle": "Mathematics · Physics · English · Computer Science", "value": "View"},
        {"title": "Tuesday", "subtitle": "Biology · Hindi · Mathematics · Games", "value": "View"},
        {"title": "Wednesday", "subtitle": "English · Chemistry · History · Art", "value": "View"},
    ],
    "exam_schedule": [
        {"title": "English", "subtitle": "03 Feb · Main Hall", "value": "09:00-12:00"},
        {"title": "Mathematics", "subtitle": "05 Feb · Main Hall", "value": "09:00-12:00"},
        {"title": "Science", "subtitle": "07 Feb · Main Hall", "value": "09:00-12:00"},
    ],
    "exam_report": [
        {"title": "Mid-term · Mathematics", "subtitle": "Nov 2024", "value": "A"},
        {"title": "Mid-term · Science", "subtitle": "Nov 2024", "value": "A-"},
        {"title": "Mid-term · English", "subtitle": "Nov 2024", "value": "A+"},
    ],
    "projects": [
        {"title": "Solar-powered irrigation", "subtitle": "Physics", "value": "In progress", "meta": {"due": "12 Feb"}},
        {"title": "Heritage walk report", "subtitle": "History", "value": "Submitted", "meta": {"due": "20 Jan"}},
    ],
    "activity": [
        {"title": "Chess club meet", "subtitle": "Activity", "value": "Fri"},
        {"title": "Painting workshop", "subtitle": "Art", "value": "Sat"},
    ],
    "syllabus": [
        {"title": "Mathematics", "subtitle": "Term progress", "value": "72%"},
        {"title": "Science", "subtitle": "Term progress", "value": "64%"},
        {"title": "English", "subtitle": "Term progress", "value": "80%"},
    ],
    "book_search": [
        {"title": "The Blue Umbrella", "subtitle": "Ruskin Bond · Available", "value": "Borrow"},
        {"title": "Physics: Concepts", "subtitle": "HC Verma · Available", "value": "Borrow"},
        {"title": "Introduction to Robotics", "subtitle": "New arrival · 8 copies", "value": "Request"},
    ],
    "new_books": [
        {"title": "Introduction to Robotics", "subtitle": "Technology · 8 copies", "value": "New"},
        {"title": "Modern Indian History", "subtitle": "History · 6 copies", "value": "New"},
    ],
    "books_history": [
        {"title": "The Blue Umbrella", "subtitle": "Ruskin Bond", "value": "Due 28 Jan"},
        {"title": "Physics: Concepts", "subtitle": "HC Verma", "value": "Due 04 Feb"},
    ],
    "book_request": [
        {"title": "Introduction to Robotics", "subtitle": "Library request", "value": "Pending"},
    ],
    "transport": [
        {"title": "Route 42 · Morning", "subtitle": "Green Park Gate", "value": "07:30 AM"},
        {"title": "Route 42 · Evening", "subtitle": "Green Park Gate", "value": "02:45 PM"},
        {"title": "Driver: Ramesh Kumar", "subtitle": "+91 98765 43210", "value": "Call"},
    ],
    "messages": [
        {"title": "PTM confirmation", "subtitle": "Class Teacher · Today", "value": "New", "meta": {"preview": "Please confirm your preferred time slot."}},
        {"title": "Science club update", "subtitle": "Dr. Sen · Yesterday", "value": "Read"},
    ],
    "sms_history": [
        {"title": "Fee receipt generated", "subtitle": "18 Jan", "value": "Delivered"},
        {"title": "Bus route reminder", "subtitle": "15 Jan", "value": "Delivered"},
    ],
    "diary": [
        {"title": "Bring geometry box for practical", "subtitle": "Mr. Mehta · Today", "value": "New"},
    ],
    "birthdays": [
        {"title": "Riya Verma", "subtitle": "Class 10-A", "value": "28 Jan"},
        {"title": "Kabir Shah", "subtitle": "Class 10-A", "value": "30 Jan"},
    ],
    "attendance": [
        {"title": "24 Jan", "subtitle": "School attendance", "value": "Present"},
        {"title": "23 Jan", "subtitle": "School attendance", "value": "Present"},
        {"title": "22 Jan", "subtitle": "School attendance", "value": "Absent"},
        {"title": "21 Jan", "subtitle": "School attendance", "value": "Present"},
    ],
    "fee_summary": [
        {"title": "Tuition Fee", "subtitle": "Term 1", "value": "₹18,000 · Paid"},
        {"title": "Transport Fee", "subtitle": "Term 1", "value": "₹6,000 · Paid"},
        {"title": "Library & Lab", "subtitle": "Term 1", "value": "₹4,500 · Paid"},
        {"title": "Activity Fee", "subtitle": "Term 1", "value": "₹4,500 · Due"},
    ],
    "fee_paid": [
        {"title": "Tuition Fee", "subtitle": "Paid 05 Jan", "value": "₹18,000"},
        {"title": "Transport Fee", "subtitle": "Paid 05 Jan", "value": "₹6,000"},
        {"title": "Library & Lab", "subtitle": "Paid 10 Jan", "value": "₹4,500"},
    ],
    "fee_due": [
        {"title": "Activity Fee", "subtitle": "Due 10 Feb", "value": "₹4,500"},
    ],
    "fee_payment": [
        {"title": "Online payment", "subtitle": "Pay via UPI / Card / Netbanking", "value": "₹4,500"},
    ],
    "live_class": [
        {"title": "Physics · Light and reflection", "subtitle": "Ms. Kavita Rao · Lab 2", "value": "10:30"},
        {"title": "Chemistry · Periodic table", "subtitle": "Mr. Rao · Lab 1", "value": "Fri 11:00"},
    ],
    "help": [
        {"title": "Using the student dashboard", "subtitle": "Guide", "value": "Read"},
        {"title": "Payments and receipts", "subtitle": "Guide", "value": "Read"},
        {"title": "Library requests", "subtitle": "Guide", "value": "Read"},
        {"title": "Contact support", "subtitle": "support@eduvibe.example", "value": "+91 1800 123 456"},
    ],
    "profile": [
        {"title": "Class", "subtitle": "Section A", "value": "Class 10-A"},
        {"title": "Roll number", "subtitle": "Academic", "value": "18"},
        {"title": "House", "subtitle": "Sports", "value": "Emerald"},
        {"title": "School", "subtitle": "Academy", "value": "EduVibe"},
    ],
}


# ---------- Helpers ----------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return f"id_{uuid.uuid4().hex[:16]}"


def new_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def normalize_tz(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "student"),
        "picture": user.get("picture"),
        "student_profile": user.get("student_profile"),
    }


async def get_user_from_token(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    token = authorization.split(" ", 1)[1].strip()
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = normalize_tz(session.get("expires_at"))
    if expires_at and expires_at < utcnow():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: Dict[str, Any]) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def create_session(user_id: str, token: Optional[str] = None) -> str:
    session_token = token or new_session_token()
    doc = {
        "session_token": session_token,
        "user_id": user_id,
        "created_at": utcnow(),
        "expires_at": utcnow() + timedelta(days=SESSION_TTL_DAYS),
    }
    await db.user_sessions.insert_one(doc)
    return session_token


# ---------- Startup ----------
@app.on_event("startup")
async def startup() -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.content_entries.create_index([("module_key", 1), ("created_at", -1)])
    await db.leaves.create_index([("created_at", -1)])

    await seed_demo_users()
    await seed_demo_content()


async def seed_demo_users() -> None:
    demos = [
        {
            "user_id": "user_demo_student",
            "email": "student@eduvibe.com",
            "password": "student123",
            "name": "Aarav Sharma",
            "role": "student",
            "student_profile": DEMO_STUDENT_PROFILE,
        },
        {
            "user_id": "user_demo_admin",
            "email": "admin@eduvibe.com",
            "password": "admin123",
            "name": "Priya Admin",
            "role": "admin",
            "student_profile": None,
        },
    ]
    for demo in demos:
        existing = await db.users.find_one({"email": demo["email"]}, {"_id": 0})
        if existing:
            continue
        await db.users.insert_one(
            {
                "user_id": demo["user_id"],
                "email": demo["email"],
                "password_hash": hash_password(demo["password"]),
                "name": demo["name"],
                "role": demo["role"],
                "picture": None,
                "student_profile": demo["student_profile"],
                "created_at": utcnow(),
            }
        )


async def seed_demo_content() -> None:
    for module_key, entries in DEMO_SEED.items():
        existing = await db.content_entries.count_documents({"module_key": module_key})
        if existing:
            continue
        for entry in entries:
            await db.content_entries.insert_one(
                {
                    "id": new_id(),
                    "module_key": module_key,
                    "title": entry.get("title", ""),
                    "subtitle": entry.get("subtitle", ""),
                    "value": entry.get("value", ""),
                    "meta": entry.get("meta") or {},
                    "created_at": utcnow(),
                }
            )


# ---------- Auth routes ----------
@api_router.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@api_router.post("/auth/register")
async def register(payload: RegisterIn) -> Dict[str, Any]:
    existing = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    role = "admin" if payload.role == "admin" else "student"
    user_id = new_user_id()
    student_profile = None
    if role == "student":
        student_profile = {
            **DEMO_STUDENT_PROFILE,
            "name": payload.name,
            "initials": "".join([p[0].upper() for p in payload.name.split()[:2]]) or "ST",
            "student_id": f"EV-{secrets.token_hex(3).upper()}",
        }
    await db.users.insert_one(
        {
            "user_id": user_id,
            "email": payload.email,
            "password_hash": hash_password(payload.password),
            "name": payload.name,
            "role": role,
            "picture": None,
            "student_profile": student_profile,
            "created_at": utcnow(),
        }
    )
    token = await create_session(user_id)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"session_token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(payload: LoginIn) -> Dict[str, Any]:
    user = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = await create_session(user["user_id"])
    return {"session_token": token, "user": public_user(user)}


@api_router.post("/auth/session")
async def auth_session(payload: SessionIn) -> Dict[str, Any]:
    if await db.user_sessions.find_one({"session_token": payload.session_id}, {"_id": 0}):
        raise HTTPException(status_code=401, detail="Session already used")
    try:
        async with httpx.AsyncClient(timeout=20) as http:
            resp = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
    except Exception as exc:
        logger.exception("Emergent session fetch failed")
        raise HTTPException(status_code=401, detail="Session verification failed") from exc
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    data = resp.json()
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Session missing email")
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data.get("session_token") or new_session_token()

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user is None:
        user_id = new_user_id()
        student_profile = {
            **DEMO_STUDENT_PROFILE,
            "name": name,
            "initials": "".join([p[0].upper() for p in name.split()[:2]]) or "ST",
            "student_id": f"EV-{secrets.token_hex(3).upper()}",
        }
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "password_hash": "",
                "name": name,
                "role": "student",
                "picture": picture,
                "student_profile": student_profile,
                "created_at": utcnow(),
            }
        )
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    else:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"picture": picture or user.get("picture")}})

    await create_session(user["user_id"], token=session_token)
    user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"session_token": session_token, "user": public_user(user)}


@api_router.get("/auth/me")
async def me(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    return {"user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)) -> Dict[str, str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"status": "ok"}


# ---------- Public modules metadata ----------
@api_router.get("/modules")
async def list_modules() -> Dict[str, Any]:
    return {"modules": MODULES}


# ---------- Content endpoints ----------
async def list_content(module_key: str) -> List[Dict[str, Any]]:
    cursor = db.content_entries.find({"module_key": module_key}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


@api_router.get("/content/{module_key}")
async def get_content(module_key: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    await get_user_from_token(authorization)
    return {"entries": await list_content(module_key)}


@api_router.get("/student/dashboard")
async def get_dashboard(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    circulars = await list_content("circulars")
    notifications = await list_content("notifications")
    events = await list_content("events")
    homework = await list_content("homework")
    fee_due_entries = await list_content("fee_due")
    fee_paid_entries = await list_content("fee_paid")
    live_class = await list_content("live_class")
    timetable = await list_content("timetable")

    fees_paid_total = 0
    for entry in fee_paid_entries:
        value = (entry.get("value") or "").replace("₹", "").replace(",", "").strip()
        try:
            fees_paid_total += int(float(value))
        except ValueError:
            pass
    fees_due_total = 0
    for entry in fee_due_entries:
        value = (entry.get("value") or "").replace("₹", "").replace(",", "").strip()
        try:
            fees_due_total += int(float(value))
        except ValueError:
            pass

    profile = user.get("student_profile") or DEMO_STUDENT_PROFILE
    student_summary = {
        "name": user.get("name") or profile.get("name"),
        "initials": profile.get("initials", "ST"),
        "student_id": profile.get("student_id", "EV-DEMO"),
        "class_name": profile.get("class_name", "Class 10-A"),
        "roll_no": profile.get("roll_no", "18"),
        "house": profile.get("house", "Emerald"),
        "school": profile.get("school", "EduVibe Academy"),
    }

    stats = {
        "attendance": 94.2,
        "fees_paid": fees_paid_total,
        "fees_due": fees_due_total,
        "homework_due": sum(1 for h in homework if (h.get("value") or "").lower() == "pending"),
    }

    upcoming = {"subject": "Physics", "teacher": "Ms. Kavita Rao", "time": "10:30 AM", "room": "Lab 2", "minutes_left": 42}
    if live_class:
        first = live_class[0]
        parts = (first.get("subtitle") or "").split("·")
        upcoming = {
            "subject": (first.get("title") or "").split("·")[0].strip(),
            "teacher": parts[0].strip() if parts else "Teacher",
            "time": first.get("value") or "10:30 AM",
            "room": parts[1].strip() if len(parts) > 1 else "Room",
            "minutes_left": 42,
        }

    return {
        "student": student_summary,
        "stats": stats,
        "upcoming_class": upcoming,
        "modules": MODULES,
        "circulars": circulars,
        "notifications": notifications,
        "events": events,
        "schedule": [
            {"time": "09:00", "subject": "Mathematics", "teacher": "Mr. Mehta", "room": "A-204"},
            {"time": "10:30", "subject": "Physics", "teacher": "Ms. Rao", "room": "Lab 2"},
            {"time": "12:00", "subject": "English", "teacher": "Mrs. D'Souza", "room": "A-204"},
        ],
        "timetable": timetable,
    }


@api_router.post("/student/leaves")
async def create_leave(payload: LeaveCreate, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    doc = {
        "id": new_id(),
        "user_id": user["user_id"],
        "student_name": user.get("name"),
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "reason": payload.reason,
        "status": "Pending",
        "created_at": utcnow(),
    }
    await db.leaves.insert_one(doc)
    return {"leave": {k: v for k, v in doc.items() if k not in ("_id", "created_at")}}


@api_router.get("/student/leaves")
async def list_my_leaves(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    cursor = db.leaves.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return {"leaves": await cursor.to_list(100)}


# ---------- Admin routes ----------
@api_router.get("/admin/stats")
async def admin_stats(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    await require_admin(user)
    students = await db.users.count_documents({"role": "student"})
    admins = await db.users.count_documents({"role": "admin"})
    pending_leaves = await db.leaves.count_documents({"status": "Pending"})
    entries = await db.content_entries.count_documents({})
    return {"students": students, "admins": admins, "pending_leaves": pending_leaves, "content_entries": entries}


@api_router.post("/admin/content/{module_key}")
async def create_entry(module_key: str, payload: ContentCreate, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    await require_admin(user)
    doc = {
        "id": new_id(),
        "module_key": module_key,
        "title": payload.title,
        "subtitle": payload.subtitle or "",
        "value": payload.value or "",
        "meta": payload.meta or {},
        "created_at": utcnow(),
    }
    await db.content_entries.insert_one(doc)
    return {"entry": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.put("/admin/content/{module_key}/{entry_id}")
async def update_entry(module_key: str, entry_id: str, payload: ContentCreate, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    await require_admin(user)
    update = {
        "title": payload.title,
        "subtitle": payload.subtitle or "",
        "value": payload.value or "",
        "meta": payload.meta or {},
    }
    result = await db.content_entries.update_one({"id": entry_id, "module_key": module_key}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry = await db.content_entries.find_one({"id": entry_id}, {"_id": 0})
    return {"entry": entry}


@api_router.delete("/admin/content/{module_key}/{entry_id}")
async def delete_entry(module_key: str, entry_id: str, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    await require_admin(user)
    result = await db.content_entries.delete_one({"id": entry_id, "module_key": module_key})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted"}


@api_router.get("/admin/leaves")
async def admin_list_leaves(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    await require_admin(user)
    cursor = db.leaves.find({}, {"_id": 0}).sort("created_at", -1)
    return {"leaves": await cursor.to_list(500)}


@api_router.put("/admin/leaves/{leave_id}")
async def admin_update_leave(leave_id: str, payload: LeaveStatusUpdate, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = await get_user_from_token(authorization)
    await require_admin(user)
    status_value = payload.status if payload.status in ("Approved", "Rejected", "Pending") else "Pending"
    result = await db.leaves.update_one({"id": leave_id}, {"$set": {"status": status_value}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found")
    return {"status": status_value}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("shutdown")
async def shutdown() -> None:
    client.close()
