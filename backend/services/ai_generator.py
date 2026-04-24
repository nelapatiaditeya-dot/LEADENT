

def build_prompt(text: str, level: str):
    prompt = f"""
You are a tutor.

Content:
{text}

Generate 3 MCQs.

Return ONLY valid JSON like this:
[
  {{
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "answer": "...",
    "explanation": "..."
  }}
]

Do NOT add extra text.
"""
    return prompt


