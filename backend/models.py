from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, Text, JSON
from sqlalchemy import DateTime as SQLDateTime
from database import Base

import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    school_id = Column(Integer)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    avatar = Column(String, default="default")


class Subject(Base):
    """Subjects with configurable appearance and metadata from DB"""
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    difficulty = Column(String)  # "Beginner", "Intermediate", "Advanced"
    color = Column(String)  # Hex color code e.g., "#dc2626"
    icon = Column(String)  # Emoji or icon name
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class AppConfig(Base):
    """Global app configuration stored in DB"""
    __tablename__ = "app_config"

    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, index=True)
    value = Column(Text)
    updated_at = Column(SQLDateTime, default=datetime.datetime.utcnow)


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)
    subject = Column(String)
    name = Column(String)
    type = Column(String)


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, ForeignKey('topics.id'))
    difficulty = Column(Integer)
    question_text = Column(String)
    correct_answer = Column(String)
    options = Column(JSON)  # Store options as JSON: {"A": "...", "B": "...", "C": "...", "D": "..."}
    concept = Column(String)
    explanation = Column(String)
    hint = Column(String)
    tags = Column(String)


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    question_id = Column(Integer, ForeignKey('questions.id'))
    is_correct = Column(Boolean)
    time_taken = Column(Integer)
    attempt_number = Column(Integer)


class TopicPerformance(Base):
    __tablename__ = "topic_performance"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    topic_id = Column(Integer, ForeignKey('topics.id'))
    accuracy = Column(Float)
    attempts = Column(Integer)
    suggested_difficulty = Column(Integer, default=1)  # 1=Easy, 3=Medium, 5=Hard
    last_updated = Column(SQLDateTime, default=datetime.datetime.utcnow)


class StudyPlan(Base):
    __tablename__ = "study_plan"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    topic_id = Column(Integer)
    scheduled_time = Column(SQLDateTime)
    status = Column(String)


class TopicContent(Base):
    __tablename__ = "topic_content"

    id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, ForeignKey('topics.id'))
    content_type = Column(String)
    file_path = Column(String)
    order_index = Column(Integer)
    duration_mins = Column(Integer)


# ── Memory Profile Models ──

class QuestionAttempt(Base):
    """Detailed tracking of each question attempt"""
    __tablename__ = "question_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), index=True)
    question_id = Column(Integer, ForeignKey('questions.id'), index=True)
    selected_answer = Column(String)
    correct_answer = Column(String)
    is_correct = Column(Boolean, index=True)
    time_taken_ms = Column(Integer)
    hint_used = Column(Boolean, default=False)
    attempt_number = Column(Integer)
    timestamp = Column(SQLDateTime, default=datetime.datetime.utcnow, index=True)


class ConceptPerformance(Base):
    """Aggregated performance per concept"""
    __tablename__ = "concept_performance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    concept = Column(String, index=True)
    subject = Column(String, index=True)

    total_attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    avg_time_ms = Column(Integer, default=0)
    accuracy_percentage = Column(Float, default=0.0)

    last_attempted = Column(SQLDateTime)
    consecutive_correct = Column(Integer, default=0)
    worst_performance = Column(Float, default=0.0)

    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    next_review = Column(SQLDateTime)

    is_weak = Column(Boolean, default=False)
    is_strong = Column(Boolean, default=False)
    needs_review = Column(Boolean, default=False)

    updated_at = Column(SQLDateTime, default=datetime.datetime.utcnow)


class MistakePattern(Base):
    """Tracks mistake types and patterns"""
    __tablename__ = "mistake_patterns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    concept = Column(String, index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'))

    question_text = Column(Text)
    wrong_answer_selected = Column(String)
    correct_answer = Column(String)

    mistake_type = Column(String)
    confidence_level = Column(String)

    frequency = Column(Integer, default=1)
    last_occurred = Column(SQLDateTime, default=datetime.datetime.utcnow)
    first_occurred = Column(SQLDateTime, default=datetime.datetime.utcnow)

    recommended_review = Column(Boolean, default=False)
    review_count = Column(Integer, default=0)


class LearningSession(Base):
    """Groups question attempts into learning sessions"""
    __tablename__ = "learning_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), index=True)

    started_at = Column(SQLDateTime, default=datetime.datetime.utcnow)
    ended_at = Column(SQLDateTime)
    duration_ms = Column(Integer)

    questions_attempted = Column(Integer, default=0)
    questions_correct = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)

    avg_time_per_question = Column(Integer, default=0)
    hints_used = Column(Integer, default=0)

    topic_before_accuracy = Column(Float)
    topic_after_accuracy = Column(Float)


# ── Conversational AI (1-on-1 Personal Tutor) ──

class UserPersonalContext(Base):
    """Stores personal learning context for each user"""
    __tablename__ = "user_personal_context"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, index=True)

    # Personal learning history
    strong_subjects = Column(JSON)  # ["math", "coding"]
    weak_subjects = Column(JSON)  # ["physics"]
    learning_style = Column(String)  # "visual", "reading", "practical"
    preferred_difficulty = Column(String)  # "easy", "medium", "hard"

    # Personal examples and experiences (extracted from conversations)
    personal_examples = Column(JSON)  # {"recursion": "I struggled with recursive sorting", ...}
    real_world_connections = Column(JSON)  # {"photosynthesis": "My garden plants..."}

    # Goals and preferences
    learning_goals = Column(Text)
    motivation_notes = Column(Text)

    updated_at = Column(SQLDateTime, default=datetime.datetime.utcnow)


class ConversationSession(Base):
    """Groups messages into a tutoring conversation"""
    __tablename__ = "conversation_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), index=True)

    started_at = Column(SQLDateTime, default=datetime.datetime.utcnow)
    ended_at = Column(SQLDateTime)
    duration_minutes = Column(Integer)

    # Context for the conversation
    topic_name = Column(String)
    subject = Column(String)

    # Session quality metrics
    messages_count = Column(Integer, default=0)
    user_satisfaction = Column(Integer)  # 1-5 rating after session
    helped_understanding = Column(Boolean, default=False)

    is_active = Column(Boolean, default=True)


class ConversationMessage(Base):
    """Individual messages in a tutoring conversation"""
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey('conversation_sessions.id'), index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)

    role = Column(String)  # "user", "assistant", "system"

    content = Column(Text)
    timestamp = Column(SQLDateTime, default=datetime.datetime.utcnow)

    # Optional: link to related question/topic
    related_topic_id = Column(Integer, ForeignKey('topics.id'))
    concept_discussed = Column(String)

    # Message quality tracking
    was_helpful = Column(Boolean)
    user_feedback = Column(String)  # optional text feedback