from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
import models
from auth import verify_password, create_access_token, decode_token, hash_password

from typing import List
import hashlib
from datetime import datetime
from pathlib import Path

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    return UserResponse(id=user.id, username=user.username, role=user.role)


@app.get("/api/subjects", response_model=List[SubjectResponse])
def get_subjects(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    topics = db.query(models.Topic).all()

    # Dynamically get subjects from content folders
    from content_loader import get_all_subjects
    all_subjects = get_all_subjects()

    # If no content folders, fall back to DB subjects
    if not all_subjects:
        all_subjects = list(set(t.subject for t in topics))

    # Generate colors dynamically based on subject name
    def get_subject_color(subject: str) -> str:
        colors = ["#dc2626", "#2563eb", "#059669", "#7c3aed", "#db2777", "#0891b2"]
        hash_val = sum(ord(c) for c in subject)
        return colors[hash_val % len(colors)]

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
    for subject_name in all_subjects:
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

        result.append(SubjectResponse(
            id=int(hashlib.md5(subject_name.encode()).hexdigest()[:8], 16) % 1000000,
            name=subject_name,
            description=f"Learn and master {subject_name}",
            total_topics=total,
            completed_topics=completed,
            progress=progress,
            status=status,
            difficulty="Intermediate",
            color=get_subject_color(subject_name)
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

    result = []
    for i, topic in enumerate(topics):
        perf = perf_map.get(topic.id)
        completed = perf and perf.accuracy and perf.accuracy >= 70

        # Topic is locked if previous topic isn't completed (except first)
        is_first = i == 0
        prev_completed = False
        if i > 0:
            prev_perf = perf_map.get(topics[i-1].id)
            prev_completed = prev_perf and prev_perf.accuracy and prev_perf.accuracy >= 70

        is_locked = not is_first and not prev_completed and not completed

        # Get content availability
        from content_loader import get_content_for_topic
        content = get_content_for_topic(subject, i + 1)

        result.append({
            "id": topic.id,
            "name": topic.name,
            "type": topic.type,
            "completed": completed,
            "locked": is_locked,
            "accuracy": perf.accuracy if perf else None,
            "attempts": perf.attempts if perf else 0,
            "has_text": bool(content["text"]),
            "has_video": content["has_video"],
            "level": i + 1  # Candy crush style level number
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
def update_topic_progress(topic_id: int, request: ProgressRequest, db: Session = Depends(get_db)):
    user = get_current_user(request, db)

    perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == user.id,
        models.TopicPerformance.topic_id == topic_id
    ).first()

    if perf:
        perf.accuracy = request.accuracy
        perf.attempts = request.attempts
        perf.last_updated = datetime.utcnow()
    else:
        perf = models.TopicPerformance(
            user_id=user.id,
            topic_id=topic_id,
            accuracy=request.accuracy,
            attempts=request.attempts,
            last_updated=datetime.utcnow()
        )
        db.add(perf)

    db.commit()
    return {"message": "Progress updated", "accuracy": request.accuracy}


@app.get("/api/topic/{topic_id}/questions")
def get_topic_questions(topic_id: int, request: Request, db: Session = Depends(get_db)):
    questions = db.query(models.Question).filter(
        models.Question.topic_id == topic_id
    ).all()

    return [
        {
            "id": q.id,
            "question_text": q.question_text,
            "correct_answer": q.correct_answer,
            "difficulty": q.difficulty,
            "concept": q.concept,
            "explanation": q.explanation,
            "hint": q.hint,
            "tags": q.tags.split(",") if q.tags else []
        }
        for q in questions
    ]


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


@app.post("/api/topic/{topic_id}/generate-questions")
def generate_questions(topic_id: int, request: Request, db: Session = Depends(get_db)):
    """Auto-generate 2-3 quiz questions using Gemini AI based on topic content."""
    user = get_current_user(request, db)
    topic = db.query(models.Topic).filter(models.Topic.id == topic_id).first()

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Find topic order
    all_subject_topics = db.query(models.Topic).filter(
        models.Topic.subject == topic.subject
    ).order_by(models.Topic.id).all()
    topic_order = next((i + 1 for i, t in enumerate(all_subject_topics) if t.id == topic_id), 1)

    # Load content from file
    from content_loader import get_content_for_topic
    content_data = get_content_for_topic(topic.subject, topic_order)

    # Check if questions already exist
    existing_questions = db.query(models.Question).filter(
        models.Question.topic_id == topic_id
    ).count()

    if existing_questions > 0:
        # Return existing questions
        questions = db.query(models.Question).filter(
            models.Question.topic_id == topic_id
        ).all()
        return {
            "message": "Questions already exist",
            "count": existing_questions,
            "questions": [
                {
                    "id": q.id,
                    "question_text": q.question_text,
                    "correct_answer": q.correct_answer,
                    "difficulty": q.difficulty,
                    "concept": q.concept,
                    "explanation": q.explanation,
                    "hint": q.hint,
                    "tags": q.tags.split(",") if q.tags else []
                }
                for q in questions
            ]
        }

    # Generate new questions using Gemini
    from gemini_generator import generate_questions_from_content
    questions_data = generate_questions_from_content(
        content=content_data["text"],
        topic_name=topic.name,
        num_questions=3
    )

    # Save questions to database
    saved_questions = []
    for q_data in questions_data:
        question = models.Question(
            topic_id=topic_id,
            difficulty=q_data.get("difficulty", 1),
            question_text=q_data["question_text"],
            correct_answer=q_data["correct_answer"],
            concept=q_data.get("concept", topic.name),
            explanation=q_data.get("explanation", ""),
            hint=q_data.get("hint", ""),
            tags=q_data.get("tags", "")
        )
        db.add(question)
        saved_questions.append(question)

    db.commit()

    return {
        "message": f"Generated {len(saved_questions)} questions",
        "count": len(saved_questions),
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "correct_answer": q.correct_answer,
                "difficulty": q.difficulty,
                "concept": q.concept,
                "explanation": q.explanation,
                "hint": q.hint,
                "tags": q.tags.split(",") if q.tags else []
            }
            for q in saved_questions
        ]
    }


@app.post("/api/topic/{topic_id}/generate-all-questions")
def generate_all_questions(request: Request, db: Session = Depends(get_db)):
    """Generate questions for all topics in all subjects."""
    user = get_current_user(request, db)

    topics = db.query(models.Topic).all()
    from content_loader import get_content_for_topic, get_subject_topics, get_all_subjects
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