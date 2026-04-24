"""
Script to generate questions for all topics using Gemini AI.
Run with: python generate_all_questions.py
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal, engine, Base
import models
from content_loader import get_content_for_topic
from gemini_generator import generate_questions_from_content
from datetime import datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("🎮 Generating Questions for All Topics...")
print("=" * 50)

# Get all topics
topics = db.query(models.Topic).order_by(models.Topic.subject, models.Topic.id).all()

# Group by subject
subject_topics = {}
for topic in topics:
    if topic.subject not in subject_topics:
        subject_topics[topic.subject] = []
    subject_topics[topic.subject].append(topic)

total_generated = 0
current_subject = None

for subject, topic_list in subject_topics.items():
    if current_subject != subject:
        current_subject = subject
        print(f"\n📚 Subject: {subject}")
        print("-" * 40)

    for i, topic in enumerate(topic_list):
        # Check if questions already exist
        existing = db.query(models.Question).filter(
            models.Question.topic_id == topic.id
        ).count()

        if existing > 0:
            print(f"  ✓ Level {i+1}: {topic.name} (already has {existing} questions)")
            continue

        # Get content
        content_data = get_content_for_topic(subject, i + 1)

        if not content_data["text"]:
            print(f"  ⚠ Level {i+1}: {topic.name} (no content found)")
            continue

        print(f"  🔄 Level {i+1}: {topic.name} - Generating questions...")

        # Generate questions
        questions_data = generate_questions_from_content(
            content=content_data["text"],
            topic_name=topic.name,
            num_questions=3
        )

        # Save to database
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

        db.commit()
        total_generated += len(questions_data)
        print(f"    ✅ Generated {len(questions_data)} questions")

print("\n" + "=" * 50)
print(f"✨ Done! Generated {total_generated} questions for {len(topics)} topics")
db.close()