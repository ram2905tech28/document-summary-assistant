# Document Summary Assistant Backend — Groq migration

Preserves `/`, `/upload`, `/summarize`, and `/process` FastAPI routes and response shapes.

## Setup

1. Open a terminal in this folder.
2. `python -m venv .venv`
3. Windows PowerShell: `.venv\Scripts\Activate.ps1` (or use `.venv\Scripts\python.exe` directly).
4. `python -m pip install -r requirements.txt`
5. Copy `.env.example` to `.env`, and set your **new** `GROQ_API_KEY`. Do not commit `.env`.
6. `python -m uvicorn main:app --reload`
7. Visit `http://127.0.0.1:8000/docs`.

For OCR, install the separate Tesseract executable. If Windows cannot find it, set `TESSERACT_CMD` in `.env`. Linux deployment also needs OS-level Tesseract installed for scanned PDFs/images.

## Deployment

Set `GROQ_API_KEY` as a secret/environment variable on the **backend hosting service**, then redeploy. This backend does not automatically deploy when only the frontend is deployed to Vercel. Ensure your frontend points to the deployed backend URL.

## Notes

- Groq free access has rate and token limits; long files may exceed limits.
- Summary request/response formats remain unchanged.
- No live API test was performed because no new Groq key was provided.
- Do not include `.env` or local virtual environments in Git/ZIP uploads. Rotate any secret previously shared in archives or committed publicly.
