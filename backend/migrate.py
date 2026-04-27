"""
Database migration script to add new columns for memory profile features.
Run this once to update the database schema.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from database import SessionLocal, engine, Base
import models


def migrate():
    """Run database migrations"""
    db = SessionLocal()

    try:
        # Create all tables (SQLAlchemy will only create missing ones)
        Base.metadata.create_all(bind=engine)

        # SQLite-specific: Add new columns if they don't exist
        from sqlalchemy import text

        conn = engine.connect()

        # Check if we're using SQLite
        is_sqlite = "sqlite" in str(engine.url).lower()

        if is_sqlite:
            # Get existing columns
            result = conn.execute(text("PRAGMA table_info(users)"))
            existing_cols = [row[1] for row in result]

            # Add missing columns to users table
            user_columns = {
                "level": "INTEGER DEFAULT 1",
                "xp": "INTEGER DEFAULT 0",
                "avatar": "TEXT DEFAULT 'default'"
            }

            for col_name, col_def in user_columns.items():
                if col_name not in existing_cols:
                    print(f"Adding column: users.{col_name}")
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))

            # Add subjects table if it doesn't exist
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='subjects'"))
            if not result.fetchone():
                print("Creating table: subjects")
                conn.execute(text("""
                    CREATE TABLE subjects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        description TEXT,
                        difficulty TEXT,
                        color TEXT,
                        icon TEXT,
                        order_index INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1
                    )
                """))

            # Add app_config table if it doesn't exist
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'"))
            if not result.fetchone():
                print("Creating table: app_config")
                conn.execute(text("""
                    CREATE TABLE app_config (
                        id INTEGER PRIMARY KEY,
                        key TEXT UNIQUE NOT NULL,
                        value TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))

            # Add memory profile tables
            tables_to_create = [
                ("question_attempts", """
                    CREATE TABLE IF NOT EXISTS question_attempts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER REFERENCES users(id),
                        topic_id INTEGER REFERENCES topics(id),
                        question_id INTEGER REFERENCES questions(id),
                        selected_answer TEXT,
                        correct_answer TEXT,
                        is_correct BOOLEAN,
                        time_taken_ms INTEGER,
                        hint_used BOOLEAN DEFAULT 0,
                        attempt_number INTEGER,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """),
                ("concept_performance", """
                    CREATE TABLE IF NOT EXISTS concept_performance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER REFERENCES users(id),
                        concept TEXT,
                        subject TEXT,
                        total_attempts INTEGER DEFAULT 0,
                        correct_attempts INTEGER DEFAULT 0,
                        avg_time_ms INTEGER DEFAULT 0,
                        accuracy_percentage REAL DEFAULT 0.0,
                        last_attempted TIMESTAMP,
                        consecutive_correct INTEGER DEFAULT 0,
                        worst_performance REAL DEFAULT 0.0,
                        ease_factor REAL DEFAULT 2.5,
                        interval_days INTEGER DEFAULT 1,
                        next_review TIMESTAMP,
                        is_weak BOOLEAN DEFAULT 0,
                        is_strong BOOLEAN DEFAULT 0,
                        needs_review BOOLEAN DEFAULT 0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """),
                ("mistake_patterns", """
                    CREATE TABLE IF NOT EXISTS mistake_patterns (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER REFERENCES users(id),
                        concept TEXT,
                        topic_id INTEGER REFERENCES topics(id),
                        question_text TEXT,
                        wrong_answer_selected TEXT,
                        correct_answer TEXT,
                        mistake_type TEXT,
                        confidence_level TEXT,
                        frequency INTEGER DEFAULT 1,
                        last_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        first_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        recommended_review BOOLEAN DEFAULT 0,
                        review_count INTEGER DEFAULT 0
                    )
                """),
                ("learning_sessions", """
                    CREATE TABLE IF NOT EXISTS learning_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER REFERENCES users(id),
                        topic_id INTEGER REFERENCES topics(id),
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        ended_at TIMESTAMP,
                        duration_ms INTEGER,
                        questions_attempted INTEGER DEFAULT 0,
                        questions_correct INTEGER DEFAULT 0,
                        accuracy REAL DEFAULT 0.0,
                        avg_time_per_question INTEGER DEFAULT 0,
                        hints_used INTEGER DEFAULT 0,
                        topic_before_accuracy REAL,
                        topic_after_accuracy REAL
                    )
                """),
                ("user_personal_context", """
                    CREATE TABLE IF NOT EXISTS user_personal_context (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER UNIQUE REFERENCES users(id),
                        strong_subjects TEXT,
                        weak_subjects TEXT,
                        learning_style TEXT,
                        preferred_difficulty TEXT,
                        personal_examples TEXT,
                        real_world_connections TEXT,
                        learning_goals TEXT,
                        motivation_notes TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """),
                ("conversation_sessions", """
                    CREATE TABLE IF NOT EXISTS conversation_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER REFERENCES users(id),
                        topic_id INTEGER REFERENCES topics(id),
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        ended_at TIMESTAMP,
                        duration_minutes INTEGER,
                        topic_name TEXT,
                        subject TEXT,
                        messages_count INTEGER DEFAULT 0,
                        user_satisfaction INTEGER,
                        helped_understanding BOOLEAN DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1
                    )
                """),
                ("conversation_messages", """
                    CREATE TABLE IF NOT EXISTS conversation_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id INTEGER REFERENCES conversation_sessions(id),
                        user_id INTEGER REFERENCES users(id),
                        role TEXT,
                        content TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        related_topic_id INTEGER REFERENCES topics(id),
                        concept_discussed TEXT,
                        was_helpful BOOLEAN,
                        user_feedback TEXT
                    )
                """)
            ]

            for table_name, create_sql in tables_to_create:
                result = conn.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"))
                if not result.fetchone():
                    print(f"Creating table: {table_name}")
                    conn.execute(text(create_sql))

            # Add columns to questions table if needed
            result = conn.execute(text("PRAGMA table_info(questions)"))
            existing_cols = [row[1] for row in result]
            if "options" not in existing_cols:
                print("Adding column: questions.options")
                conn.execute(text("ALTER TABLE questions ADD COLUMN options TEXT"))

            # Add columns to topic_performance table if needed
            result = conn.execute(text("PRAGMA table_info(topic_performance)"))
            existing_cols = [row[1] for row in result]
            if "suggested_difficulty" not in existing_cols:
                print("Adding column: topic_performance.suggested_difficulty")
                conn.execute(text("ALTER TABLE topic_performance ADD COLUMN suggested_difficulty INTEGER DEFAULT 1"))

        conn.commit()
        print("\nMigration completed successfully!")
        print("New tables/columns added:")
        print("  - users: level, xp, avatar")
        print("  - subjects: all columns")
        print("  - app_config: all columns")
        print("  - question_attempts: all columns")
        print("  - concept_performance: all columns")
        print("  - mistake_patterns: all columns")
        print("  - learning_sessions: all columns")
        print("  - user_personal_context: all columns")
        print("  - conversation_sessions: all columns")
        print("  - conversation_messages: all columns")
        print("  - topic_performance: suggested_difficulty")

    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()