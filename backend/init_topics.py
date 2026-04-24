"""
Script to sync topics from content folder and generate questions.
Run with: python init_topics.py
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal, engine, Base
import models
from content_loader import get_all_subjects, get_subject_topics, sync_topics_to_db
from gemini_generator import generate_questions_from_content
from auth import hash_password
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("🚀 Leadent Learning Platform - Initialization")
print("=" * 60)

# Step 1: Sync topics from content folder
print("\n📂 Step 1: Syncing topics from content folder...")
count = sync_topics_to_db(db)
print(f"   ✅ Synced {count} topics")

# Step 2: Show discovered subjects and topics
print("\n📚 Step 2: Subjects & Topics:")
all_subjects = get_all_subjects()
for subject in all_subjects:
    topics = get_subject_topics(subject)
    print(f"\n   {subject} ({len(topics)} levels):")
    for t in topics:
        print(f"      Level {t['order']}: {t['name']}")

# Step 3: Generate questions
print("\n\n🎯 Step 3: Generating questions with Gemini AI...")

topics = db.query(models.Topic).all()
total_generated = 0

for topic in topics:
    # Check if questions already exist
    existing = db.query(models.Question).filter(
        models.Question.topic_id == topic.id
    ).count()

    if existing > 0:
        continue

    # Get content
    all_subject_topics = db.query(models.Topic).filter(
        models.Topic.subject == topic.subject
    ).order_by(models.Topic.id).all()
    topic_order = next((i + 1 for i, t in enumerate(all_subject_topics) if t.id == topic.id), 1)

    content_data = get_content_for_topic(topic.subject, topic_order)

    if not content_data["text"]:
        continue

    questions_data = generate_questions_from_content(
        content=content_data["text"],
        topic_name=topic.name,
        num_questions=3
    )

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

    total_generated += len(questions_data)

db.commit()

# Step 4: Create demo user with progress
print(f"   ✅ Generated {total_generated} questions")

print("\n👤 Step 4: Setting up demo user...")

# Check if demo user exists
demo_user = db.query(models.User).filter(models.User.username == "demo").first()

if not demo_user:
    demo_user = models.User(
        username="demo",
        password=hash_password("demo123"),
        role="student",
        school_id=1
    )
    db.add(demo_user)
    db.commit()
    print("   ✅ Created demo user (demo / demo123)")

# Give demo user progress on first topic (so it's completed)
first_topic = db.query(models.Topic).order_by(models.Topic.id).first()
if first_topic:
    existing_perf = db.query(models.TopicPerformance).filter(
        models.TopicPerformance.user_id == demo_user.id,
        models.TopicPerformance.topic_id == first_topic.id
    ).first()

    if not existing_perf:
        perf = models.TopicPerformance(
            user_id=demo_user.id,
            topic_id=first_topic.id,
            accuracy=85.0,  # Completed with good score
            attempts=1,
            last_updated=datetime.utcnow()
        )
        db.add(perf)
        db.commit()
        print(f"   ✅ Set level 1 '{first_topic.name}' as completed for demo user")

print("\n" + "=" * 60)
print("✨ Initialization complete!")
print("\n📋 Summary:")
print(f"   - Subjects: {len(all_subjects)}")
print(f"   - Topics: {len(topics)}")
print(f"   - Questions: {total_generated}")
print(f"   - Demo user: demo / demo123 (level 1 completed)")
db.close()