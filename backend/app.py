from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
import models
from dotenv import load_dotenv
import os
import json
from auth import verify_password, create_access_token, decode_token, hash_password

from typing import List, Annotated
import hashlib
from datetime import datetime
from pathlib import Path

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

# Startup: Sync subjects and topics from content folders
@app.on_event("startup")
def on_startup():
    from content_loader import get_all_subjects, sync_topics_to_db
    db = SessionLocal()
    try:
        # Sync subjects from content folders
        content_subjects = get_all_subjects()
        for i, subject_name in enumerate(content_subjects):
            existing = db.query(models.Subject).filter(models.Subject.name == subject_name).first()
            if not existing:
                subject = models.Subject(
                    name=subject_name,
                    description=f"Learn and master {subject_name}",
                    difficulty="Intermediate",
                    color="#dc2626",
                    icon="📚",
                    order_index=i
                )
                db.add(subject)
                print(f"📚 Added subject: {subject_name}")
        db.commit()

        # Sync topics
        topic_count = sync_topics_to_db(db)
        print(f"✅ Synced {topic_count} topics from content folders")
    finally:
        db.close()

load_dotenv()
print("🔑 GEMINI KEY:", os.getenv("GEMINI_API_KEY"))

# CORS - allow frontend from environment variable
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],  # fallback for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve video files from content folder
CONTENT_DIR = Path(__file__).parent / "content"

@app.get("/api/content/{subject}/{filename}")
def serve_content(subject: str, filename: str):
    """Serve video/content files from content folder"""
    file_path = CONTENT_DIR / subject / "videos" / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Determine MIME type
    ext = file_path.suffix.lower()
    mime_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
    }
    media_type = mime_types.get(ext, "application/octet-stream")

    return FileResponse(file_path, media_type=media_type)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Pydantic Models ──
class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str
    school_id: int

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    level: int = 1
    xp: int = 0
    avatar: str = "default"

class SubjectResponse(BaseModel):
    id: int
    name: str
    description: str
    total_topics: int
    completed_topics: int
    progress: int
    status: str
    difficulty: str
    color: str

def generate_questions_with_gemini(content: str, topic_name: str, num_questions: int = 3):
    try:
        prompt = f"""
You are a system that outputs ONLY JSON.

Generate EXACTLY {num_questions} MCQs.

Topic: {topic_name}

Content:
{content[:3000]}

STRICT RULES:
- Output MUST be valid JSON
- NO markdown
- NO explanation outside JSON

FORMAT:
[
  {{
    "question_text": "string",
    "correct_answer": "A",
    "explanation": "string",
    "hint": "string",
    "difficulty": 1,
    "concept": "string",
    "tags": "string"
  }}
]
"""

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )

        # 🔥 SAFE extraction
        raw_text = ""
        if hasattr(response, "text") and response.text:
            raw_text = response.text
        else:
            raw_text = response.candidates[0].content.parts[0].text

        print("🔥 GEMINI RAW:", raw_text)

        cleaned = raw_text.replace("```json", "").replace("```", "").strip()

        questions = json.loads(cleaned)

        if isinstance(questions, list):
            return questions
        return [questions]

    except Exception as e:
        print("❌ Gemini error:", e)

        # 🔥 fallback
        return [
            {
                "question_text": f"What is {topic_name}?",
                "correct_answer": "A",
                "explanation": "Basic concept.",
                "hint": "Think about definition",
                "difficulty": 1,
                "concept": topic_name,
                "tags": "basic"
            },
            {
                "question_text": f"Why is {topic_name} important?",
                "correct_answer": "A",
                "explanation": "Core understanding.",
                "hint": "Think about usage",
                "difficulty": 1,
                "concept": topic_name,
                "tags": "basic"
            }
        ]


# ── Auth Helper ──
def get_current_user(request: Request, db: Session):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(" ")[1]
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# ── Routes ──
@app.get("/")
def home():
    return {"message": "Backend working"}


@app.get("/api/config")
def get_app_config(request: Request, db: Session = Depends(get_db)):
    """Get app configuration from DB"""
    configs = db.query(models.AppConfig).all()
    return {
        config.key: config.value
        for config in configs
    }


@app.get("/api/config/{key}")
def get_config_value(key: str, request: Request, db: Session = Depends(get_db)):
    """Get a specific config value"""
    config = db.query(models.AppConfig).filter(models.AppConfig.key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"key": config.key, "value": config.value}


@app.post("/api/config")
def set_config_value(key: str, value: str, request: Request, db: Session = Depends(get_db)):
    """Set a config value (admin only in production)"""
    config = db.query(models.AppConfig).filter(models.AppConfig.key == key).first()
    if config:
        config.value = value
        config.updated_at = datetime.utcnow()
    else:
        config = models.AppConfig(key=key, value=value)
        db.add(config)
    db.commit()
    return {"message": "Config updated", "key": key, "value": value}


@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    hashed_password = hash_password(request.password)
    user = models.User(
        username=request.username,
        password=hashed_password,
        role=request.role,
        school_id=request.school_id
    )
    db.add(user)
    db.commit()
    return {"message": "User registered successfully", "user_id": user.id}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()

    if not user or not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/user", response_model=UserResponse)
def get_user(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        level=user.level or 1,
        xp=user.xp or 0,
        avatar=user.avatar or "default"
    )


@app.get("/api/subjects", response_model=List[SubjectResponse])
def get_subjects(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    topics = db.query(models.Topic).all()

    # Get subjects from DB with colors and metadata
    subjects = db.query(models.Subject).filter(
        models.Subject.is_active == True
    ).order_by(models.Subject.order_index).all()

    subject_map = {s.name: s for s in subjects}
    all_subject_names = [s.name for s in subjects]

    # If no subjects in DB, sync from content folders
    if not all_subject_names:
        from content_loader import get_all_subjects, sync_topics_to_db
        all_subject_names = get_all_subjects()
        # Add to DB
        for i, subject_name in enumerate(all_subject_names):
            existing = db.query(models.Subject).filter(models.Subject.name == subject_name).first()
            if not existing:
                subject = models.Subject(
                    name=subject_name,
                    description=f"Learn and master {subject_name}",
                    difficulty="Intermediate",
                    color="#dc2626",
                    icon="📚",
                    order_index=i
                )
                db.add(subject)
        db.commit()
        sync_topics_to_db(db)
        # Refresh
        subjects = db.query(models.Subject).filter(models.Subject.is_active == True).order_by(models.Subject.order_index).all()
        subject_map = {s.name: s for s in subjects}
        all_subject_names = [s.name for s in subjects]

    subject_groups = {}
    for topic in topics:
        if topic.subject not in subject_groups:
            subject_groups[topic.subject] = []
        subject_groups[topic.subject].append(topic)

    performances = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id
    ).all()
    perf_map = {p.topic_id: p for p in performances}

    result = []
    for subject_name in all_subject_names:
        topics_list = subject_groups.get(subject_name, [])
        completed = 0
        for topic in topics_list:
            perf = perf_map.get(topic.id)
            if perf and perf.accuracy and perf.accuracy >= 70:
                completed += 1

        total = len(topics_list)
        progress = int((completed / total) * 100) if total > 0 else 0

        if progress == 0:
            status = "locked"
        elif progress == 100:
            status = "completed"
        else:
            status = "in_progress"

        # Get subject metadata from DB
        db_subject = subject_map.get(subject_name)

        result.append(SubjectResponse(
            id=int(hashlib.md5(subject_name.encode()).hexdigest()[:8], 16) % 1000000,
            name=subject_name,
            description=db_subject.description if db_subject else f"Learn and master {subject_name}",
            total_topics=total,
            completed_topics=completed,
            progress=progress,
            status=status,
            difficulty=db_subject.difficulty if db_subject else "Intermediate",
            color=db_subject.color if db_subject else "#dc2626"
        ))

    result.sort(key=lambda s: (0 if s.status == "in_progress" else 1 if s.status == "locked" else 2))
    return result


# ── Learning Routes ──
@app.get("/api/topics/{subject}")
def get_subject_topics(subject: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    # Get topics from database
    topics = db.query(models.Topic).filter(models.Topic.subject == subject).order_by(models.Topic.id).all()

    # Get performances
    performances = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id
    ).all()
    perf_map = {p.topic_id: p for p in performances}

    # Unlock threshold - topic unlocks if previous topic has at least this accuracy
    UNLOCK_THRESHOLD = 30  # 30% accuracy to unlock next topic

    result = []
    for i, topic in enumerate(topics):
        perf = perf_map.get(topic.id)
        accuracy = perf.accuracy if perf else 0
        completed = accuracy >= 70

        # Topic is unlocked if:
        # 1. It's the first topic (index 0), OR
        # 2. Previous topic has at least UNLOCK_THRESHOLD accuracy, OR
        # 3. User has attempted the topic before
        is_first = i == 0
        prev_perf = perf_map.get(topics[i-1].id) if i > 0 else None
        prev_has_minimum = prev_perf and prev_perf.accuracy and prev_perf.accuracy >= UNLOCK_THRESHOLD
        has_attempts = perf and perf.attempts and perf.attempts > 0

        is_locked = not is_first and not prev_has_minimum and not has_attempts and not completed

        # Get content availability
        from content_loader import get_content_for_topic
        content = get_content_for_topic(subject, i + 1)

        result.append({
            "id": topic.id,
            "name": topic.name,
            "type": topic.type,
            "completed": completed,
            "locked": is_locked,
            "accuracy": accuracy,
            "attempts": perf.attempts if perf else 0,
            "has_text": bool(content["text"]),
            "has_video": content["has_video"],
            "level": i + 1,
            "unlock_requirement": f"Complete previous topic (min {UNLOCK_THRESHOLD}% accuracy)" if not is_first else None
        })

    return result


@app.get("/api/topic/{topic_id}")
def get_topic(topic_id: int, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Get user's performance
    perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.topic_id == topic_id
    ).first()

    # Load content from file system
    from content_loader import get_content_for_topic

    # Find topic order within subject
    all_subject_topics = db.query(models.Topic).filter(
        models.Topic.subject == topic.subject
    ).order_by(models.Topic.id).all()
    topic_order = next((i + 1 for i, t in enumerate(all_subject_topics) if t.id == topic_id), 1)

    content = get_content_for_topic(topic.subject, topic_order)

    return {
        "id": topic.id,
        "name": topic.name,
        "subject": topic.subject,
        "type": topic.type,
        "completed": perf and perf.accuracy and perf.accuracy >= 70 if perf else False,
        "accuracy": perf.accuracy if perf else None,
        "level": topic_order,
        "text_content": content["text"],
        "video_filename": content["video_filename"],
        "has_video": content["has_video"]
    }


class ContentRequest(BaseModel):
    content_type: str  # text / video / animation
    content: str
    order_index: int
    duration_mins: int = 0


@app.post("/api/topic/{topic_id}/content")
def add_topic_content(topic_id: int, request: ContentRequest, db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    content = models.TopicContent(
        topic_id=topic_id,
        content_type=request.content_type,
        content=request.content,
        order_index=request.order_index,
        duration_mins=request.duration_mins
    )
    db.add(content)
    db.commit()
    db.refresh(content)

    return {"message": "Content added", "id": content.id}


class ProgressRequest(BaseModel):
    accuracy: float
    attempts: int = 1


@app.post("/api/topic/{topic_id}/progress")
async def update_topic_progress(topic_id: int, http_request: Request, db: Session = Depends(get_db)):
    user = get_current_user(http_request, db)

    body = await http_request.json()
    accuracy = body.get("accuracy")
    attempts = body.get("attempts", 1)

    perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.topic_id == topic_id
    ).first()

    if perf:
        perf.accuracy = accuracy
        perf.attempts = attempts
        perf.last_updated = datetime.utcnow()
    else:
        perf = models.TopicPerformance(
            user_id=user.id,
            topic_id=topic_id,
            accuracy=accuracy,
            attempts=attempts,
            last_updated=datetime.utcnow()
        )
        db.add(perf)

    db.commit()
    return {"message": "Progress updated", "accuracy": Request.accuracy}


# ── Subject Management (Admin) ──

class SubjectRequest(BaseModel):
    name: str
    description: str = ""
    difficulty: str = "Intermediate"
    color: str = "#dc2626"
    icon: str = "📚"
    order_index: int = 0


@app.post("/api/admin/subjects")
def create_subject(request: SubjectRequest, db: Session = Depends(get_db)):
    """Create a new subject"""
    existing = db.query(models.Subject).filter(models.Subject.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject already exists")

    subject = models.Subject(
        name=request.name,
        description=request.description,
        difficulty=request.difficulty,
        color=request.color,
        icon=request.icon,
        order_index=request.order_index
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)

    return {"message": "Subject created", "id": subject.id}


@app.post("/api/admin/sync-content")
def sync_content(request: Request, db: Session = Depends(get_db)):
    """Manually sync subjects and topics from content folders"""
    user = get_current_user(request, db)

    from content_loader import get_all_subjects, sync_topics_to_db

    # Sync subjects
    content_subjects = get_all_subjects()
    added_subjects = 0
    for i, subject_name in enumerate(content_subjects):
        existing = db.query(models.Subject).filter(models.Subject.name == subject_name).first()
        if not existing:
            subject = models.Subject(
                name=subject_name,
                description=f"Learn and master {subject_name}",
                difficulty="Intermediate",
                color="#dc2626",
                icon="📚",
                order_index=i
            )
            db.add(subject)
            added_subjects += 1
    db.commit()

    # Sync topics
    topic_count = sync_topics_to_db(db)

    return {
        "message": "Content synced successfully",
        "subjects_added": added_subjects,
        "topics_synced": topic_count
    }


@app.get("/api/admin/subjects")
def list_subjects(db: Session = Depends(get_db)):
    """List all subjects"""
    subjects = db.query(models.Subject).order_by(models.Subject.order_index).all()
    return {
        "subjects": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "difficulty": s.difficulty,
                "color": s.color,
                "icon": s.icon,
                "order_index": s.order_index,
                "is_active": s.is_active
            }
            for s in subjects
        ]
    }


@app.put("/api/admin/subjects/{subject_id}")
def update_subject(subject_id: int, request: SubjectRequest, db: Session = Depends(get_db)):
    """Update a subject"""
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    subject.name = request.name
    subject.description = request.description
    subject.difficulty = request.difficulty
    subject.color = request.color
    subject.icon = request.icon
    subject.order_index = request.order_index

    db.commit()
    return {"message": "Subject updated"}


@app.delete("/api/admin/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    """Delete (deactivate) a subject"""
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    subject.is_active = False
    db.commit()
    return {"message": "Subject deactivated"}


@app.get("/api/topic/{topic_id}/questions")
def get_topic_questions(topic_id: int, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    # Check user's performance on this topic
    perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.topic_id == topic_id
    ).first()

    # Determine difficulty: use suggested difficulty if topic was previously attempted and failed
    target_difficulty = 5  # Default to hardest
    if perf and perf.attempts and perf.attempts > 0:
        if perf.accuracy < 70:
            # Failed - use suggested lower difficulty
            target_difficulty = perf.suggested_difficulty or 3
        else:
            # Passed - keep at max difficulty for challenge
            target_difficulty = 5

    # Get questions at target difficulty, fall back to easier if none found
    questions = db.query(models.Question).filter(
        models.Question.topic_id == topic_id
    ).filter(
        models.Question.difficulty <= target_difficulty
    ).order_by(models.Question.difficulty.desc()).all()

    # If no questions at target difficulty, get easier ones
    if not questions:
        questions = db.query(models.Question).filter(
            models.Question.topic_id == topic_id
        ).all()

    return {
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "correct_answer": q.correct_answer,
                "difficulty": q.difficulty,
                "concept": q.concept,
                "explanation": q.explanation,
                "hint": q.hint,
                "tags": q.tags.split(",") if q.tags else [],
                "options": q.options if hasattr(q, 'options') and q.options else None
            }
            for q in questions
        ],
        "difficulty": target_difficulty,
        "suggested_difficulty": perf.suggested_difficulty if perf else 5
    }


class QuestionRequest(BaseModel):
    difficulty: int = 1
    question_text: str
    correct_answer: str
    concept: str
    explanation: str
    hint: str = ""
    tags: str = ""


@app.post("/api/topic/{topic_id}/questions")
def add_question(topic_id: int, request: QuestionRequest, db: Session = Depends(get_db)):
    question = models.Question(
        topic_id=topic_id,
        difficulty=request.difficulty,
        question_text=request.question_text,
        correct_answer=request.correct_answer,
        concept=request.concept,
        explanation=request.explanation,
        hint=request.hint,
        tags=request.tags
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return {"message": "Question added", "id": question.id}

from test import generate_questions  # make sure this is correct import

@app.post("/generate-questions")
def generate_questions_api():
    # ✅ USE YOUR WORKING FUNCTION
    questions_data = generate_questions("(1)intro.md")

    print("✅ GENERATED:", questions_data)

    saved_questions = []

    # for q in questions_data:
    #     question = models.Question(
    #         topic_id=topic_id,
    #         question_text=q["question"],
    #         correct_answer=q["answer"],
    #         explanation=q["explanation"],
    #         difficulty=1,
    #         concept=topic.name,
    #         hint="",
    #         tags=""
    #     )
    #     db.add(question)
    #     saved_questions.append(question)

    # db.commit()

    return {
        "questions": [
            {
                "id": q.id,
                "question": q.question_text,
                "answer": q.correct_answer,
                "explanation": q.explanation
            }
            for i, q in enumerate(saved_questions)
        ]
    }


@app.post("/api/topic/{topic_id}/generate-all-questions")
def generate_all_questions(request: Request, db: Session = Depends(get_db)):
    """Generate questions for all topics in all subjects."""
    user = get_current_user(request, db)

    topics = db.query(models.Topic).all()
    from content_loader import get_content_for_topic
    from gemini_generator import generate_questions_from_content

    results = []
    for topic in topics:
        # Check if questions already exist
        existing = db.query(models.Question).filter(
            models.Question.topic_id == topic.id
        ).first()

        if existing:
            continue

        # Find topic order
        all_subject = db.query(models.Topic).filter(
            models.Topic.subject == topic.subject
        ).order_by(models.Topic.id).all()
        topic_order = next((i + 1 for i, t in enumerate(all_subject) if t.id == topic.id), 1)

        # Get content
        content_data = get_content_for_topic(topic.subject, topic_order)

        if not content_data["text"]:
            continue

        # Generate questions
        questions_data = generate_questions_from_content(
            content=content_data["text"],
            topic_name=topic.name,
            num_questions=3
        )

        # Save
        for q_data in questions_data:
            question = models.Question(
                topic_id=topic.id,
                difficulty=q_data.get("difficulty", 1),
                question_text=q_data["question_text"],
                correct_answer=q_data["correct_answer"],
                concept=q_data.get("concept", topic.name),
                explanation=q_data.get("explanation", ""),
                hint=q_data.get("hint", ""),
                tags=q_data.get("tags", "")
            )
            db.add(question)

        results.append({"topic": topic.name, "questions": len(questions_data)})

    db.commit()

    return {
        "message": f"Generated questions for {len(results)} topics",
        "results": results
    }

@app.get("/generate")
def generate(request: Request, db: Session = Depends(get_db)):
    """Generate questions for the current topic."""
    user = get_current_user(request, db)

    # Get the topic from query param or default to first topic
    topic_id = request.query_params.get("topic_id")

    if topic_id:
        topic = db.query(models.Topic).filter(models.Topic.id == int(topic_id)).first()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
    else:
        # Get first available topic
        topic = db.query(models.Topic).first()
        if not topic:
            raise HTTPException(status_code=404, detail="No topics found")

    # Find topic order within subject
    all_subject = db.query(models.Topic).filter(
        models.Topic.subject == topic.subject
    ).order_by(models.Topic.id).all()
    topic_order = next((i + 1 for i, t in enumerate(all_subject) if t.id == topic.id), 1)

    # Load content using content_loader
    from content_loader import get_content_for_topic
    content_data = get_content_for_topic(topic.subject, topic_order)

    if not content_data["text"]:
        raise HTTPException(status_code=404, detail="No content found for topic")

    # Generate questions using test.py function
    # test.py's load_md expects just filename like "(1)intro.md" in content/C/ folder
    import re
    from content_loader import get_subject_topics
    topics = get_subject_topics(topic.subject)
    topic_data = next((t for t in topics if t["order"] == topic_order), None)
    if not topic_data:
        raise HTTPException(status_code=500, detail="Topic content not found")
    md_filename = topic_data["filename"]  # e.g., "(1)intro.md"
    questions_data = generate_questions(md_filename)

    if not questions_data:
        return {"questions": [], "error": "Failed to generate questions"}

    # Transform to match frontend expected format
    questions = []
    for i, q in enumerate(questions_data):
        questions.append({
            "id": i + 1,
            "question_text": q.get("question", ""),
            "options": q.get("options", {"A": "", "B": "", "C": "", "D": ""}),
            "correct_answer": q.get("answer", "A"),
            "explanation": q.get("explanation", ""),
            "hint": q.get("hint", ""),
            "difficulty": q.get("difficulty", 1),
            "concept": topic.name,
            "tags": q.get("tags", "")
        })

    return {"questions": questions}


# ── Quiz Submission & Performance Tracking ──

class QuizSubmission(BaseModel):
    topic_id: int
    session_start_ms: int  # When user started the quiz (timestamp)
    answers: list[dict]  # Each answer: {question_id, selected_answer, is_correct, time_taken_ms, hint_used, attempt_number}


@app.post("/api/quiz/submit")
async def submit_quiz(http_request: Request, db: Session = Depends(get_db)):
    """Submit detailed quiz results for performance tracking"""
    user = get_current_user(http_request, db)

    body = await http_request.json()
    topic_id = body.get("topic_id")
    session_start_ms = body.get("session_start_ms")
    answers = body.get("answers", [])

    session_start_time = datetime.fromtimestamp(session_start_ms / 1000)

    # Get previous accuracy for this topic
    prev_perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.topic_id == topic_id
    ).first()
    topic_before_accuracy = prev_perf.accuracy if prev_perf else 0.0

    # Process each answer
    correct_count = 0
    total_count = len(answers)
    total_time = 0
    hints_used = 0

    for answer in answers:
        # Record question attempt
        attempt = models.QuestionAttempt(
            user_id=user.id,
            topic_id=topic_id,
            question_id=answer.get("question_id"),
            selected_answer=answer.get("selected_answer"),
            correct_answer=answer.get("correct_answer"),
            is_correct=answer.get("is_correct"),
            time_taken_ms=answer.get("time_taken_ms", 0),
            hint_used=answer.get("hint_used", False),
            attempt_number=answer.get("attempt_number", 1),
            timestamp=datetime.utcnow()
        )
        db.add(attempt)

        if answer.get("is_correct"):
            correct_count += 1
        total_time += answer.get("time_taken_ms", 0)
        if answer.get("hint_used"):
            hints_used += 1

        # Update concept performance
        concept = answer.get("concept", "general")
        if concept:
            concept_perf = db.query(models.ConceptPerformance).filter(
                models.ConceptPerformance.user_id == user.id,
                models.ConceptPerformance.concept == concept
            ).first()

            if concept_perf:
                concept_perf.total_attempts += 1
                if answer.get("is_correct"):
                    concept_perf.correct_attempts += 1
                concept_perf.avg_time_ms = (concept_perf.avg_time_ms + answer.get("time_taken_ms", 0)) // 2
                concept_perf.accuracy_percentage = (concept_perf.correct_attempts / concept_perf.total_attempts) * 100
                concept_perf.last_attempted = datetime.utcnow()

                # Update strength/weakness flags
                concept_perf.is_weak = concept_perf.accuracy_percentage < 60
                concept_perf.is_strong = concept_perf.accuracy_percentage >= 85
            else:
                concept_perf = models.ConceptPerformance(
                    user_id=user.id,
                    concept=concept,
                    subject=answer.get("subject", ""),
                    total_attempts=1,
                    correct_attempts=1 if answer.get("is_correct") else 0,
                    avg_time_ms=answer.get("time_taken_ms", 0),
                    accuracy_percentage=100 if answer.get("is_correct") else 0,
                    last_attempted=datetime.utcnow(),
                    is_weak=not answer.get("is_correct"),
                    is_strong=answer.get("is_correct")
                )
                db.add(concept_perf)

        # Record mistake patterns for wrong answers
        if not answer.get("is_correct"):
            # Determine mistake type based on time and attempt
            time_taken = answer.get("time_taken_ms", 0)
            attempt_num = answer.get("attempt_number", 1)

            if time_taken < 5000 and attempt_num == 1:
                mistake_type = "careless"  # Fast but wrong = careless
            elif attempt_num > 2:
                mistake_type = "misunderstanding"  # Multiple attempts = fundamental misunderstanding
            elif time_taken > 30000:
                mistake_type = "time_pressure"  # Very slow = rushed under time pressure
            else:
                mistake_type = "misunderstanding"

            # Check if similar mistake already exists
            existing_mistake = db.query(models.MistakePattern).filter(
                models.MistakePattern.user_id == user.id,
                models.MistakePattern.concept == concept,
                models.MistakePattern.wrong_answer_selected == answer.get("selected_answer")
            ).first()

            if existing_mistake:
                existing_mistake.frequency += 1
                existing_mistake.last_occurred = datetime.utcnow()
            else:
                mistake = models.MistakePattern(
                    user_id=user.id,
                    concept=concept,
                    topic_id=topic_id,
                    question_text=answer.get("question_text", ""),
                    wrong_answer_selected=answer.get("selected_answer"),
                    correct_answer=answer.get("correct_answer"),
                    mistake_type=mistake_type,
                    confidence_level="low" if mistake_type == "misunderstanding" else "medium"
                )
                db.add(mistake)

    # Calculate session metrics
    accuracy = (correct_count / total_count) * 100 if total_count > 0 else 0
    avg_time = total_time // total_count if total_count > 0 else 0

    # Save learning session
    session = models.LearningSession(
        user_id=user.id,
        topic_id=topic_id,
        started_at=session_start_time,
        ended_at=datetime.utcnow(),
        duration_ms=total_time,
        questions_attempted=total_count,
        questions_correct=correct_count,
        accuracy=accuracy,
        avg_time_per_question=avg_time,
        hints_used=hints_used,
        topic_before_accuracy=topic_before_accuracy,
        topic_after_accuracy=accuracy
    )
    db.add(session)

    # Update topic performance
    topic_perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.topic_id == topic_id
    ).first()

    # Calculate average difficulty of questions attempted
    total_difficulty = sum(answer.get("difficulty", 1) for answer in answers if answer.get("difficulty"))
    avg_question_difficulty = total_difficulty // total_count if total_count > 0 else 1

    if topic_perf:
        topic_perf.accuracy = accuracy
        topic_perf.attempts += 1
        topic_perf.last_updated = datetime.utcnow()

        # If failed (< 70%), suggest lower difficulty for next attempt
        if accuracy < 70:
            # Reduce difficulty: if avg was 5, suggest 3; if 3, suggest 1
            suggested = max(1, avg_question_difficulty - 2)
            topic_perf.suggested_difficulty = suggested
        else:
            # Passed - keep difficulty the same or increase slightly
            topic_perf.suggested_difficulty = avg_question_difficulty
    else:
        # First attempt - default to medium
        suggested_diff = 3 if avg_question_difficulty > 1 else 1
        topic_perf = models.TopicPerformance(
            user_id=user.id,
            topic_id=topic_id,
            accuracy=accuracy,
            attempts=1,
            suggested_difficulty=suggested_diff,
            last_updated=datetime.utcnow()
        )
        db.add(topic_perf)

    db.commit()

    return {
        "message": "Quiz submitted successfully",
        "accuracy": accuracy,
        "correct": correct_count,
        "total": total_count,
        "avg_time_ms": avg_time,
        "suggested_difficulty": topic_perf.suggested_difficulty if topic_perf else 1
    }


@app.get("/api/performance/memory-profile")
def get_memory_profile(request: Request, db: Session = Depends(get_db)):
    """Get comprehensive memory profile for a student"""
    user = get_current_user(request, db)

    # Get concept performance summary
    concepts = db.query(models.ConceptPerformance).filter(
        models.ConceptPerformance.user_id == user.id
    ).order_by(models.ConceptPerformance.accuracy_percentage).all()

    # Get weak concepts (need review)
    weak_concepts = [c for c in concepts if c.is_weak or c.accuracy_percentage < 60]

    # Get strong concepts (mastered)
    strong_concepts = [c for c in concepts if c.is_strong or c.accuracy_percentage >= 85]

    # Get mistake patterns
    mistakes = db.query(models.MistakePattern).filter(
        models.MistakePattern.user_id == user.id
    ).order_by(models.MistakePattern.frequency.desc()).limit(10).all()

    # Get recent sessions
    recent_sessions = db.query(models.LearningSession).filter(
        models.LearningSession.user_id == user.id
    ).order_by(models.LearningSession.ended_at.desc()).limit(5).all()

    # Calculate overall stats
    total_attempts = sum(c.total_attempts for c in concepts) if concepts else 0
    total_correct = sum(c.correct_attempts for c in concepts) if concepts else 0
    overall_accuracy = (total_correct / total_attempts * 100) if total_attempts > 0 else 0

    # Get topics needing review (accuracy < 70 or not attempted recently)
    topic_perfs = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id
    ).all()

    topics_needing_review = []
    for tp in topic_perfs:
        if tp.accuracy and tp.accuracy < 70:
            topic = db.query(models.Topic).filter(models.Topic.id == tp.topic_id).first()
            if topic:
                topics_needing_review.append({
                    "id": topic.id,
                    "name": topic.name,
                    "subject": topic.subject,
                    "accuracy": tp.accuracy
                })

    return {
        "overall_accuracy": round(overall_accuracy, 1),
        "total_questions_attempted": total_attempts,
        "total_correct": total_correct,
        "concepts_weak": [
            {
                "concept": c.concept,
                "accuracy": round(c.accuracy_percentage, 1),
                "attempts": c.total_attempts,
                "avg_time_ms": c.avg_time_ms
            }
            for c in weak_concepts[:5]
        ],
        "concepts_strong": [
            {
                "concept": c.concept,
                "accuracy": round(c.accuracy_percentage, 1),
                "attempts": c.total_attempts
            }
            for c in strong_concepts[:5]
        ],
        "recent_mistakes": [
            {
                "concept": m.concept,
                "question": m.question_text[:100] + "..." if len(m.question_text or "") > 100 else m.question_text,
                "wrong_answer": m.wrong_answer_selected,
                "correct_answer": m.correct_answer,
                "mistake_type": m.mistake_type,
                "frequency": m.frequency
            }
            for m in mistakes
        ],
        "topics_to_review": topics_needing_review,
        "recent_sessions": [
            {
                "topic_id": s.topic_id,
                "accuracy": round(s.accuracy, 1),
                "questions": s.questions_attempted,
                "duration_ms": s.duration_ms,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None
            }
            for s in recent_sessions
        ]
    }


@app.get("/api/performance/concepts")
def get_concept_analysis(request: Request, db: Session = Depends(get_db)):
    """Get detailed concept-by-concept analysis"""
    user = get_current_user(request, db)

    concepts = db.query(models.ConceptPerformance).filter(
        models.ConceptPerformance.user_id == user.id
    ).order_by(models.ConceptPerformance.accuracy_percentage).all()

    return {
        "concepts": [
            {
                "concept": c.concept,
                "subject": c.subject,
                "accuracy": round(c.accuracy_percentage, 1),
                "total_attempts": c.total_attempts,
                "correct_attempts": c.correct_attempts,
                "avg_time_ms": c.avg_time_ms,
                "last_attempted": c.last_attempted.isoformat() if c.last_attempted else None,
                "is_weak": c.is_weak,
                "is_strong": c.is_strong,
                "needs_review": c.needs_review
            }
            for c in concepts
        ]
    }


@app.get("/api/performance/analytics")
def get_performance_analytics(request: Request, db: Session = Depends(get_db)):
    """Get overall performance analytics"""
    user = get_current_user(request, db)

    # Total questions attempted
    total_attempts = db.query(models.QuestionAttempt).filter(
        models.QuestionAttempt.user_id == user.id
    ).count()

    # Average accuracy
    concept_perfs = db.query(models.ConceptPerformance).filter(
        models.ConceptPerformance.user_id == user.id
    ).all()

    if concept_perfs:
        total_correct = sum(c.correct_attempts for c in concept_perfs)
        total_tried = sum(c.total_attempts for c in concept_perfs)
        avg_accuracy = (total_correct / total_tried * 100) if total_tried > 0 else 0
        avg_time = sum(c.avg_time_ms * c.total_attempts for c in concept_perfs) // total_tried if total_tried > 0 else 0
    else:
        avg_accuracy = 0
        avg_time = 0

    # Sessions count
    sessions = db.query(models.LearningSession).filter(
        models.LearningSession.user_id == user.id
    ).count()

    # Topics completed (accuracy >= 70)
    completed_topics = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.accuracy >= 70
    ).count()

    # Total topics
    total_topics = db.query(models.Topic).count()

    # Mistake distribution
    mistakes = db.query(models.MistakePattern).filter(
        models.MistakePattern.user_id == user.id
    ).all()

    mistake_types = {}
    for m in mistakes:
        mistake_types[m.mistake_type] = mistake_types.get(m.mistake_type, 0) + m.frequency

    return {
        "total_questions_attempted": total_attempts,
        "average_accuracy": round(avg_accuracy, 1),
        "average_time_ms": avg_time,
        "total_sessions": sessions,
        "topics_completed": completed_topics,
        "total_topics": total_topics,
        "completion_percentage": round((completed_topics / total_topics * 100) if total_topics > 0 else 0, 1),
        "mistake_distribution": mistake_types
    }


# ── Conversational AI Tutor (1-on-1 Personal) ──

class ChatMessage(BaseModel):
    content: str
    topic_id: int | None = None


class ChatResponse(BaseModel):
    message: str
    session_id: int
    concepts_mentioned: list[str] = []
    suggested_topic: str | None = None
    personal_example_used: bool = False


@app.post("/api/chat/session")
def start_chat_session(request: Request, db: Session = Depends(get_db)):
    """Start a new chat session"""
    user = get_current_user(request, db)

    # Check for active session
    active_session = db.query(models.ConversationSession).filter(
        models.ConversationSession.user_id == user.id,
        models.ConversationSession.is_active == True
    ).first()

    if active_session:
        return {"session_id": active_session.id, "resumed": True}

    # Create new session
    session = models.ConversationSession(
        user_id=user.id,
        is_active=True,
        started_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {"session_id": session.id, "resumed": False}


@app.post("/api/chat")
async def chat(http_request: Request, db: Session = Depends(get_db)):
    """Send a message and get AI tutor response"""
    user = get_current_user(http_request, db)

    body = await http_request.json()
    content = body.get("content", "")
    topic_id = body.get("topic_id")

    # Get or create active session
    session = db.query(models.ConversationSession).filter(
        models.ConversationSession.user_id == user.id,
        models.ConversationSession.is_active == True
    ).first()

    if not session:
        session = models.ConversationSession(
            user_id=user.id,
            topic_id=topic_id,
            is_active=True,
            started_at=datetime.utcnow()
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Update session topic if provided
    if topic_id:
        session.topic_id = topic_id
        topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
        if topic:
            session.topic_name = topic.name
            session.subject = topic.subject

    # Save user message
    user_msg = models.ConversationMessage(
        session_id=session.id,
        user_id=user.id,
        role="user",
        content=content,
        timestamp=datetime.utcnow()
    )
    db.add(user_msg)

    # Get user's personal context
    context = db.query(models.UserPersonalContext).filter(
        models.UserPersonalContext.user_id == user.id
    ).first()

    # Get relevant topic content
    topic_content = ""
    topic_name = ""
    if topic_id:
        topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()
        if topic:
            topic_name = topic.name
            all_subject = db.query(models.Topic).filter(
                models.Topic.subject == topic.subject
            ).order_by(models.Topic.id).all()
            topic_order = next((i + 1 for i, t in enumerate(all_subject) if t.id == topic_id), 1)

            from content_loader import get_content_for_topic
            content_data = get_content_for_topic(topic.subject, topic_order)
            topic_content = content_data["text"][:1500] if content_data["text"] else ""

    # Build context prompt
    context_parts = []

    if context:
        if context.strong_subjects:
            context_parts.append(f"Student is strong in: {', '.join(context.strong_subjects)}")
        if context.weak_subjects:
            context_parts.append(f"Student struggles with: {', '.join(context.weak_subjects)}")
        if context.learning_style:
            context_parts.append(f"Preferred learning style: {context.learning_style}")
        if context.personal_examples:
            context_parts.append(f"Personal experiences to reference: {json.dumps(context.personal_examples)}")

    # Get previous conversation
    previous_messages = db.query(models.ConversationMessage).filter(
        models.ConversationMessage.session_id == session.id
    ).order_by(models.ConversationMessage.timestamp).limit(10).all()

    conversation_history = "\n".join([
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
        for m in previous_messages
    ])

    # Build tutor prompt
    tutor_prompt = f"""You are a warm, patient personal tutor having a 1-on-1 conversation with a student.

STUDENT PROFILE:
{chr(10).join(context_parts) if context_parts else "No profile data yet - adapt to a general learner."}

CURRENT TOPIC: {topic_name if topic_name else "General learning"}
TOPIC CONTENT (use this to answer accurately):
{topic_content if topic_content else "No content loaded."}

CONVERSATION HISTORY:
{conversation_history if conversation_history else "Starting fresh - introduce yourself warmly."}

STUDENT'S QUESTION: {content}

TEACHING GUIDELINES:
1. Be conversational and warm - like talking to a friend who wants to help you learn
2. Use REAL, CONCRETE examples from everyday life (not abstract ones)
3. Break complex concepts into tiny, bite-sized steps
4. After each explanation, check understanding with a simple question
5. If they say "I don't understand", try a DIFFERENT approach - use an analogy, visual description, or simpler words
6. Be encouraging and patient - celebrate small wins
7. Use the topic content above to give accurate answers
8. If showing code or formulas, explain EACH part step by step
9. Connect concepts to things they already know when possible
10. Keep responses conversational - not lecture-like

Remember: Your goal is to help them have an "aha!" moment through patient, example-rich conversation."""

    try:
        from google import genai
        client = genai.Client()

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=tutor_prompt
        )

        ai_response = response.text or "I'm here to help! Ask me anything."

    except Exception as e:
        print("AI Tutor error:", e)
        ai_response = "I'm having trouble right now. Can you try again?"

    # Save assistant message
    assistant_msg = models.ConversationMessage(
        session_id=session.id,
        user_id=user.id,
        role="assistant",
        content=ai_response,
        timestamp=datetime.utcnow()
    )
    db.add(assistant_msg)

    session.messages_count += 1
    db.commit()

    personal_example_used = "example" in ai_response.lower() or "like when" in ai_response.lower()

    # Extract learning insights from this conversation
    try:
        user_context = db.query(models.UserPersonalContext).filter(
            models.UserPersonalContext.user_id == user.id
        ).first()

        if not user_context:
            user_context = models.UserPersonalContext(user_id=user.id)
            db.add(user_context)

        # Detect learning patterns from conversation
        msg_lower = content.lower() + " " + ai_response.lower()

        # Detect struggles (they asked for help, didn't understand)
        struggle_phrases = ["don't understand", "confused", "hard to", "still not", "don't get", "what do you mean", "explain again", "simpler"]
        if any(phrase in msg_lower for phrase in struggle_phrases):
            user_context.weak_subjects = user_context.weak_subjects or []
            if isinstance(user_context.weak_subjects, list) and topic_name not in user_context.weak_subjects:
                user_context.weak_subjects.append(topic_name)

        # Detect success (they got it, understood)
        success_phrases = ["got it", "understand now", "makes sense", "thanks", "oh!", "i see", "perfect"]
        if any(phrase in msg_lower for phrase in success_phrases):
            user_context.strong_subjects = user_context.strong_subjects or []
            if isinstance(user_context.strong_subjects, list) and topic_name not in user_context.strong_subjects:
                user_context.strong_subjects.append(topic_name)

        # Detect personal examples mentioned
        if personal_example_used and "personal_examples" not in str(user_context.personal_examples):
            user_context.personal_examples = user_context.personal_examples or {}
            if isinstance(user_context.personal_examples, dict) and topic_name:
                user_context.personal_examples[topic_name] = "shared during tutor session"

        user_context.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        print("Error updating learning insights:", e)

    return ChatResponse(
        message=ai_response,
        session_id=session.id,
        concepts_mentioned=[],
        personal_example_used=personal_example_used
    )


@app.get("/api/chat/history/{session_id}")
def get_chat_history(session_id: int, request: Request, db: Session = Depends(get_db)):
    """Get chat history for a session"""
    user = get_current_user(request, db)

    session = db.query(models.ConversationSession).filter(
        models.ConversationSession.id == session_id,
        models.ConversationSession.user_id == user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.query(models.ConversationMessage).filter(
        models.ConversationMessage.session_id == session_id
    ).order_by(models.ConversationMessage.timestamp).all()

    return {
        "session_id": session.id,
        "topic_name": session.topic_name,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp.isoformat()
            }
            for m in messages
        ]
    }


@app.post("/api/chat/end")
def end_chat_session(request: Request, db: Session = Depends(get_db)):
    """End the current chat session"""
    user = get_current_user(request, db)

    session = db.query(models.ConversationSession).filter(
        models.ConversationSession.user_id == user.id,
        models.ConversationSession.is_active == True
    ).first()

    if not session:
        return {"message": "No active session"}

    session.is_active = False
    session.ended_at = datetime.utcnow()

    if session.started_at:
        duration = datetime.utcnow() - session.started_at
        session.duration_minutes = int(duration.total_seconds() // 60)

    db.commit()

    return {
        "message": "Session ended",
        "duration_minutes": session.duration_minutes
    }


@app.get("/api/chat/sessions")
def get_chat_sessions(request: Request, db: Session = Depends(get_db)):
    """Get all chat sessions"""
    user = get_current_user(request, db)

    sessions = db.query(models.ConversationSession).filter(
        models.ConversationSession.user_id == user.id
    ).order_by(models.ConversationSession.started_at.desc()).limit(20).all()

    return {
        "sessions": [
            {
                "id": s.id,
                "topic_name": s.topic_name,
                "subject": s.subject,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "messages_count": s.messages_count,
                "is_active": s.is_active
            }
            for s in sessions
        ]
    }

