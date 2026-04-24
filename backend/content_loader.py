"""
Content loader utility - reads .md and video files from content folder.
Dynamically discovers subjects and topics from folder structure.

Folder structure:
  content/
  ├── [SubjectName]/
  │   ├── topics.md        # Topic list (auto-discovered)
  │   ├── (1)Topic.md     # Content files
  │   ├── (2)Topic.md
  │   └── videos/
  │       └── (1)Topic.mp4
"""
import os
import re
from pathlib import Path

BASE_CONTENT_PATH = Path(__file__).parent / "content"


def get_all_subjects() -> list[str]:
    """Discover all subjects by scanning content folder for directories with topics.md"""
    if not BASE_CONTENT_PATH.exists():
        return []

    subjects = []
    for item in BASE_CONTENT_PATH.iterdir():
        if item.is_dir() and (item / "topics.md").exists():
            subjects.append(item.name)
    return sorted(subjects)


def get_subject_topics(subject: str) -> list[dict]:
    """
    Scan content folder for .md files and match with topics.md for names.
    File naming: (N)Topic_Name.md
    topics.md contains ordered list of topic names (one per line).
    """
    subject_path = BASE_CONTENT_PATH / subject
    if not subject_path.exists():
        return []

    # Read topic names from topics.md (order = line number)
    topic_names = []
    topics_file = subject_path / "topics.md"
    if topics_file.exists():
        with open(topics_file, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                name = line.strip()
                if name:
                    topic_names.append(name)

    # Scan for .md files and match by number
    topics = []
    md_files = sorted(subject_path.glob("*.md"))

    for md_file in md_files:
        filename = md_file.name
        if filename == "topics.md":
            continue

        # Parse (N)Name.md pattern
        match = re.match(r"^\((\d+)\)(.+)\.md$", filename)
        if match:
            order = int(match.group(1))
            # name from topics.md if available, else from filename
            if order <= len(topic_names):
                name = topic_names[order - 1]
            else:
                name = match.group(2).replace('_', ' ').strip()

            topics.append({
                "order": order,
                "name": name,
                "filename": filename,
                "text_path": f"{subject}/{filename}",
                "video_path": f"{subject}/videos/{filename.replace('.md', '.mp4')}"
            })

    return sorted(topics, key=lambda x: x["order"])


def load_text_content(file_path: str) -> str:
    """Load markdown content from file path like 'C/(1)intro.md'"""
    full_path = BASE_CONTENT_PATH / file_path
    if not full_path.exists():
        return ""

    with open(full_path, "r", encoding="utf-8") as f:
        return f.read()


def load_video_path(file_path: str) -> str:
    """Check if video exists and return path, empty string if not found"""
    full_path = BASE_CONTENT_PATH / file_path
    if full_path.exists():
        return str(full_path)
    return ""


def get_content_for_topic(subject: str, topic_order: int) -> dict:
    """
    Get all content (text + video) for a specific topic by order number.
    Returns dict with text_content, video_filename, has_video, etc.
    """
    topics = get_subject_topics(subject)
    topic_data = next((t for t in topics if t["order"] == topic_order), None)

    if not topic_data:
        return {"text": "", "video_filename": "", "has_video": False, "name": ""}

    text = load_text_content(topic_data["text_path"])
    video_full_path = load_video_path(topic_data["video_path"])

    # Extract just the filename
    video_filename = topic_data["video_path"].split("/")[-1] if video_full_path else ""

    return {
        "text": text,
        "video_filename": video_filename,
        "has_video": bool(video_filename),
        "name": topic_data["name"]
    }


def sync_topics_to_db(db):
    """
    Sync topics from content folders to database.
    Dynamically discovers all subjects from content folder.
    """
    import models

    subjects = get_all_subjects()
    total_topics = 0

    for subject in subjects:
        topics = get_subject_topics(subject)
        for topic_data in topics:
            existing = db.query(models.Topic).filter(
                models.Topic.subject == subject,
                models.Topic.name == topic_data["name"]
            ).first()

            if not existing:
                topic = models.Topic(
                    subject=subject,
                    name=topic_data["name"],
                    type="theory"
                )
                db.add(topic)

        total_topics += len(topics)

    db.commit()
    return total_topics
