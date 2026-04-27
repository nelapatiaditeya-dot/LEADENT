"""
Seed script to populate initial data from content folders into the database.
Run this after migration to set up subjects.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from database import SessionLocal, engine
import models
from content_loader import get_all_subjects, get_subject_topics


def seed():
    """Seed subjects and topics from content folders"""
    db = SessionLocal()

    try:
        # Get subjects from content folders
        subject_names = get_all_subjects()
        print(f"Found {len(subject_names)} subjects in content folders")

        default_colors = ["#dc2626", "#2563eb", "#059669", "#7c3aed", "#db2777", "#0891b2"]

        for idx, subject_name in enumerate(subject_names):
            # Check if subject already exists
            existing = db.query(models.Subject).filter(
                models.Subject.name == subject_name
            ).first()

            if not existing:
                subject = models.Subject(
                    name=subject_name,
                    description=f"Learn and master {subject_name}",
                    difficulty="Intermediate",
                    color=default_colors[idx % len(default_colors)],
                    icon="📚",
                    order_index=idx
                )
                db.add(subject)
                print(f"  Added subject: {subject_name}")
            else:
                print(f"  Subject exists: {subject_name}")

            # Sync topics for this subject
            topics = get_subject_topics(subject_name)
            print(f"    {len(topics)} topics found")

            for topic_data in topics:
                existing_topic = db.query(models.Topic).filter(
                    models.Topic.subject == subject_name,
                    models.Topic.name == topic_data["name"]
                ).first()

                if not existing_topic:
                    topic = models.Topic(
                        subject=subject_name,
                        name=topic_data["name"],
                        type="theory"
                    )
                    db.add(topic)
                    print(f"      Added topic: {topic_data['name']}")

        db.commit()
        print("\nSeeding completed!")

        # Print summary
        subject_count = db.query(models.Subject).count()
        topic_count = db.query(models.Topic).count()
        print(f"Total subjects in DB: {subject_count}")
        print(f"Total topics in DB: {topic_count}")

    except Exception as e:
        print(f"Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
