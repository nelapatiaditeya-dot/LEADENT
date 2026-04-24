"""
Gemini AI Question Generator
Uses Google Gemini 2.5 Flash to generate questions from .md content files.
"""
import json
import httpx
from typing import List, Dict
import config

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

def generate_questions_from_content(content: str, topic_name: str, num_questions: int = 3) -> List[Dict]:
    """
    Generate quiz questions from markdown content using Gemini AI.

    Args:
        content: The markdown text content
        topic_name: Name of the topic for context
        num_questions: Number of questions to generate (default 3)

    Returns:
        List of question dictionaries with: question_text, correct_answer, explanation, hint, difficulty, concept, tags
    """
    api_key = config.Config.GEMINI_API_KEY

    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        return generate_fallback_questions(topic_name)

    prompt = f"""You are a quiz generator for a coding education platform. Based on the following learning content about "{topic_name}", generate {num_questions} multiple choice or short-answer questions.

Requirements:
- Questions should test understanding of key concepts
- Include difficulty level (1=easy, 2=medium, 3=hard)
- Include a brief explanation for each answer
- Include a helpful hint
- Return as JSON array

Learning Content:
{content[:2000]}

Return ONLY valid JSON in this exact format:
[
  {{
    "question_text": "What is...?",
    "correct_answer": "answer",
    "explanation": "Why this is correct...",
    "hint": "Think about...",
    "difficulty": 1,
    "concept": "key concept name",
    "tags": "basics,intro"
  }}
]"""

    try:
        response = httpx.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json={
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2048,
                }
            },
            timeout=30.0
        )

        if response.status_code == 200:
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

            # Extract JSON from response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            questions = json.loads(text.strip())
            return questions
        else:
            print(f"Gemini API error: {response.status_code}")
            return generate_fallback_questions(topic_name)

    except Exception as e:
        print(f"Error generating questions: {e}")
        return generate_fallback_questions(topic_name)


def generate_fallback_questions(topic_name: str) -> List[Dict]:
    """Generate basic placeholder questions when Gemini is not available."""
    return [
        {
            "question_text": f"What is a key concept covered in {topic_name}?",
            "correct_answer": "understanding",
            "explanation": f"This tests basic understanding of {topic_name} concepts.",
            "hint": "Review the study material carefully.",
            "difficulty": 1,
            "concept": topic_name,
            "tags": "basics"
        },
        {
            "question_text": f"Which statement about {topic_name} is TRUE?",
            "correct_answer": "learning",
            "explanation": "Understanding this concept is fundamental to progressing.",
            "hint": "Think about the main points covered.",
            "difficulty": 2,
            "concept": topic_name,
            "tags": "intermediate"
        }
    ]