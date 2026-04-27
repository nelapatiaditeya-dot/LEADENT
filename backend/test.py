from google import genai
from dotenv import load_dotenv
import os
import json
import re

load_dotenv()

client = genai.Client()


def build_prompt(text: str, level: str):
    return f"""
You are a system that outputs ONLY JSON.

Generate exactly 3 MCQs with 4 options each.

Content:
{text[:2000]}

STRICT RULES:
- Output must be valid JSON
- No markdown
- No explanation outside JSON
- Must start with [ and end with ]
- Each question MUST have exactly 4 options: A, B, C, D
- Only ONE correct answer

FORMAT:
[
  {{
    "question": "string",
    "options": {{
      "A": "string",
      "B": "string",
      "C": "string",
      "D": "string"
    }},
    "answer": "A",

    "explanation": "string"
  }}
]
"""


def load_md(file_name: str):
    with open(f"content/C/{file_name}", "r", encoding="utf-8") as f:
        return f.read()


def generate_questions(file_name: str, level: str = "beginner"):
    from google import genai
    client=genai.Client()
    text = load_md(file_name)
    prompt = build_prompt(text, level)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    raw = response.text or ""
    print("🔥 RAW GEMINI:", raw)

    # 🔥 Extract JSON safely
    match = re.search(r"\[.*\]", raw, re.DOTALL)

    if not match:
        print("❌ No JSON found")
        return []

    cleaned = match.group(0)

    try:
        questions = json.loads(cleaned)
        return questions
    except Exception as e:
        print("❌ JSON PARSE ERROR:", e)
        print("BAD JSON:", cleaned)
        return []