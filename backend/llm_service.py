import os
import google.generativeai as genai

def generate_summary(transcript: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
         raise ValueError("GEMINI_API_KEY missing.")
         
    genai.configure(api_key=api_key)
    
    
    model = genai.GenerativeModel('gemini-3.5-flash')
    
    prompt = f"""
    You are an expert executive assistant. Analyze the following audio transcript and provide a highly structured summary.
    
    Format your response with the following sections:
    1. Overview: A concise 2-sentence summary of the main topic.
    2. Key Points: Bullet points of the most important information discussed.
    3. Action Items: Any explicit or implicit tasks or follow-ups mentioned. If none, write "None identified."
    
    Transcript:
    {transcript}
    """

    response = model.generate_content(prompt)
    return response.text