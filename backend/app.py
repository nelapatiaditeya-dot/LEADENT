from fastapi import FastAPI,Depends
from sqlalchemy.orm import Session
from database import SessionLocal,Base,engine
import models


models.Base.metadata.create_all(bind=engine)
app=FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"message": "Backend working"}




