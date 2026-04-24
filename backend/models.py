from sqlalchemy import Column, Integer, String ,Float,ForeignKey,Boolean
from sqlalchemy import DateTime

from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role= Column(String) # only parent,student
    school_id= Column(Integer)

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True)
    subject = Column(String)   # math, coding, PMOB
    name = Column(String)      # arrays, recursion, etc.
    type = Column(String)      # theory / numerical / coding

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, ForeignKey('topics.id'))
    difficulty = Column(Integer)  #1/2/3
    question_text = Column(String)
    correct_answer = Column(String)
    concept = Column(String)     # what concept it tests
    explanation = Column(String) # explanation of answer
    hint = Column(String)        # small help for fallback
    tags = Column(String)  


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    question_id = Column(Integer, ForeignKey('questions.id'))
    is_correct = Column(Boolean)  # 1 or 0
    time_taken = Column(Integer)  # seconds
    attempt_number = Column(Integer)  # 1st try, 2nd try


class TopicPerformance(Base):
    __tablename__ = "topic_performance"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    topic_id = Column(Integer, ForeignKey('topics.id'))
    accuracy = Column(Float)
    attempts = Column(Integer)
    last_updated = Column(DateTime)


class StudyPlan(Base):
    __tablename__ = "study_plan"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    topic_id = Column(Integer)
    scheduled_time = Column(DateTime)
    status = Column(String)   # pending / completed


class TopicContent(Base):
    __tablename__ = "topic_content"

    id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, ForeignKey('topics.id'))
    content_type = Column(String)  # text / video / animation
    file_path = Column(String)      # path to file: content/C/(1)intro.md or videos/(1)intro.mp4
    order_index = Column(Integer)   # sequence order
    duration_mins = Column(Integer)  # for video/animation


