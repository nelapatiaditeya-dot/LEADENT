def load_md(file_name: str):
    with open(f"content/{file_name}", "r", encoding="utf-8") as f:
        return f.read()
    
