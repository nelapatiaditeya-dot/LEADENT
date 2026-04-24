"""
Seed script - Basic database setup only.
For full initialization (topics + questions), use init_topics.py instead.

Run with: python seed.py
"""
import sys
sys.path.insert(0, '.')

from database import SessionLocal, engine, Base
import models
from auth import hash_password
from datetime import datetime
from content_loader import sync_topics_to_db

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Sync topics from content folder
count = sync_topics_to_db(db)
print(f"Synced {count} topics from content folders")

# Create sample users only if none exist
existing_users = db.query(models.User).first()
if not existing_users:
    users_data = [
        {"username": "demo", "password": "demo123", "role": "student", "school_id": 1},
    ]
    for u in users_data:
        user = models.User(
            username=u["username"],
            password=hash_password(u["password"]),
            role=u["role"],
            school_id=u["school_id"]
        )
        db.add(user)
    db.commit()
    print(f"Created {len(users_data)} users (demo/demo123)")
else:
    print("Users already exist")

print("Seeding complete!")
db.close()
