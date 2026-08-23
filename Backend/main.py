from fastapi import FastAPI, UploadFile, File, HTTPException
from pypdf import PdfReader
from PIL import Image
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import pytesseract
import fitz
import io
import os

load_dotenv()

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=api_key)

app = FastAPI(
    title="Document Summary Assistant",
    description="Upload documents and generate AI-powered summaries.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
@app.get("/")
def home():
    return {
        "message": "Document Summary Assistant Backend is running"
    }

def extract_pdf_text(file_data):
    extracted_text = ""

    try:
        pdf = PdfReader(io.BytesIO(file_data))

        for page in pdf.pages:
            text = page.extract_text()

            if text:
                extracted_text += text + "\n"

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read PDF: {str(e)}"
        )

    return extracted_text

def ocr_pdf(file_data):
    extracted_text = ""

    try:
        pdf = fitz.open(stream=file_data, filetype="pdf")

        for page in pdf:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

            image = Image.frombytes(
                "RGB",
                [pix.width, pix.height],
                pix.samples
            )

            text = pytesseract.image_to_string(image)

            if text:
                extracted_text += text + "\n"

        pdf.close()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not OCR PDF: {str(e)}"
        )

    return extracted_text

def extract_image_text(file_data):
    try:
        image = Image.open(io.BytesIO(file_data))
        extracted_text = pytesseract.image_to_string(image)
        return extracted_text

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not process image: {str(e)}"
        )

def extract_document_text(file_data, content_type):

    if content_type == "application/pdf":
        text = extract_pdf_text(file_data)

        if not text.strip():
            text = ocr_pdf(file_data)

        return text

    elif content_type in [
        "image/jpeg",
        "image/png",
        "image/jpg"
    ]:
        return extract_image_text(file_data)

    else:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG and PNG files are supported."
        )

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    allowed_types = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG and PNG files are supported."
        )

    file_data = await file.read()

    extracted_text = extract_document_text(
        file_data,
        file.content_type
    )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the document."
        )

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "text": extracted_text,
        "message": "Document processed successfully"
    }

def generate_summary(text, length):

    allowed_lengths = [
        "short",
        "medium",
        "long"
    ]

    if length.lower() not in allowed_lengths:
        raise HTTPException(
            status_code=400,
            detail="Length must be short, medium, or long."
        )

    if not text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text provided for summarization."
        )

    length_instructions = {
        "short": "Give a concise summary in about 3-5 sentences.",
        "medium": "Give a clear summary in about 1-2 paragraphs.",
        "long": "Give a detailed summary covering the major sections and important information."
    }

    prompt = f"""
You are a professional document summarization assistant.

Analyze the document text below.

Create the following:

1. SUMMARY
{length_instructions[length.lower()]}

2. KEY POINTS
Give 5-8 important points from the document.

3. MAIN IDEAS
Explain the central ideas or conclusions.

4. IMPROVEMENT SUGGESTIONS
Suggest practical improvements, missing information,
unclear areas, or ways the document could be made better.

Important:
- Base your response only on the supplied document.
- Do not invent facts.
- Keep the response clear and well structured.
- Use headings and bullet points where appropriate.

DOCUMENT TEXT:

{text}
"""

    try:

        models = [
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash"
        ]

        last_error = None

        for model_name in models:

            try:
                print(f"Trying model: {model_name}")

                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )

                print(f"Success with: {model_name}")

                return response.text

            except Exception as e:
                print(f"{model_name} failed: {e}")
                last_error = e

        raise last_error

    except Exception as e:

        print("========== GEMINI ERROR ==========")
        print(type(e).__name__)
        print(str(e))
        print("===================================")

        raise HTTPException(
            status_code=500,
            detail=f"Summary generation failed: {str(e)}"
        )

@app.post("/summarize")
async def summarize_document(
    text: str,
    length: str = "medium"
):

    result = generate_summary(
        text,
        length
    )

    return {
        "length": length.lower(),
        "result": result
    }

@app.post("/process")
async def process_document(
    file: UploadFile = File(...),
    length: str = "medium"
):

    allowed_types = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg"
    ]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG and PNG files are supported."
        )

    file_data = await file.read()

    extracted_text = extract_document_text(
        file_data,
        file.content_type
    )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the document."
        )

    summary = generate_summary(
        extracted_text,
        length
    )

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "extracted_text": extracted_text,
        "length": length.lower(),
        "summary": summary,
        "message": "Document processed and summarized successfully"
    }