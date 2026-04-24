from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal, Base, engine
import models
from auth import verify_password, create_access_token
from utils.md_loader import load_md
from services.ai_generator import build_prompt
from dotenv import load_dotenv
from google import genai

from pydantic import BaseModel
from typing import List
import os
load_dotenv()

class QuestionSchema(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: str


client = genai.Client()

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str
    school_id: int

class LoginRequest(BaseModel):
    username: str
    password: str

@app.get("/")
def home():
    return {"message": "Backend working"}


@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    from auth import hash_password
    hashed_password = hash_password(request.password)
    user = models.User(username=request.username, password=hashed_password, role=request.role, school_id=request.school_id)
    db.add(user)
    db.commit()
    return {"message": "User registered successfully", "user_id": user.id}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not verify_password(request.password, user.password):
        return {"error": "Invalid credentials"}
    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/generate-from-md", response_model=List[QuestionSchema])
def generate_from_md(file_name: str, level: str):

    text = load_md(file_name)
    prompt = build_prompt(text, level)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    print("RAW RESPONSE:", response.text)

    import json
    try:
        questions = json.loads(response.text)
    except:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Invalid JSON from AI")
    return questions



