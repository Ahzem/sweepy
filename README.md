# Sweepy — Local-First AI Downloads Organizer

Sweepy is a desktop-first file organization tool that helps you organize messy folders (such as `Downloads`) without manual sorting.

Sweepy scans a folder, passes file metadata to a local AI model (**Gemma 3 1B** running via **Ollama**), and proposes clean destination folders and filenames. You review, edit, and approve suggestions before anything is moved.

> **Core Principle:** AI recommends; deterministic application code executes; the user stays in control.

---

## Key Features

- **Dashboard**: Track scanned files, pending reviews, generated suggestions, and completed operations. Live connection indicators for backend and Ollama.
- **Secure Folder Scanning**: Fast directory enumeration with Windows native folder picker dialog and quick-folder shortcuts. Automatically ignores hidden files and system/application folders (`.git`, `node_modules`, `.venv`). Never reads file contents.
- **Local AI Inference**: Powered by Ollama running Google's `gemma3:1b` model. Categorizes files into structured folders (`Documents/Invoices/`, `Images/2026-10/`, `Code/`, `Archives/`, etc.).
- **Automatic Fallback**: If Ollama is offline or busy, Sweepy seamlessly uses deterministic rule-based sorting so work is never interrupted.
- **Review Before Applying**: Checkbox selection, category filtering, search, and inline editing for proposed filenames and destination folders.
- **Collision & Traversal Protection**: Rejects `../` path escapes, symlink traversal, and Windows forbidden characters or reserved names. Appends unique counter suffixes (e.g. `file (1).pdf`) instead of overwriting existing files.
- **Safe 1-Click Undo**: Maintains an atomic local JSON log of all completed operations, allowing instant reversal back to the original paths.
- **Zero Cloud Leakage**: Binds strictly to `127.0.0.1`. Never uploads files or contents to external APIs.

---

## Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| **Icons & UI** | Lucide React, clean modern minimalist layout |
| **Backend** | Python 3.11+ with FastAPI, Pydantic v2 |
| **Local AI** | Ollama running `gemma3:1b` |
| **Testing** | Pytest for backend, Vitest for frontend |
| **Monorepo** | pnpm workspace (`apps/web`, `apps/api`) |

---

## Prerequisites

1. **Node.js**: v20 or v22+
2. **pnpm**: v9 or v12+ (`npm install -g pnpm`)
3. **Python**: v3.11, v3.12, 3.13, or 3.14
4. **Ollama**: [Download Ollama for Windows](https://ollama.com/download)

---

## Quick Start (Windows 11 PowerShell)

### 1. Pull the AI Model
Ensure Ollama is installed and running, then pull the Gemma 3 1B model:

```powershell
ollama pull gemma3:1b
```

### 2. Install Dependencies

In the project root:

```powershell
# Install frontend workspace dependencies
pnpm install

# Setup Python virtual environment for backend
python -m venv apps/api/.venv
.\apps\api\.venv\Scripts\python.exe -m pip install -e "apps/api[dev]"
```

### 3. Launch Development Environment

Run the bundled PowerShell launcher script:

```powershell
.\scripts\dev.ps1
```

Or start the services individually:

**Backend (FastAPI)**:
```powershell
cd apps/api
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend (Next.js)**:
```powershell
cd apps/web
pnpm dev
```

### 4. Open in Browser

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Ollama API**: [http://localhost:11434](http://localhost:11434)

---

## Running Automated Tests

Sweepy includes comprehensive test suites with 100% mocked AI responses and temporary filesystem isolation:

```powershell
# Run backend pytest suite (20 tests covering path safety, scanning, collisions, apply & undo)
cd apps/api
.\.venv\Scripts\pytest

# Run frontend vitest suite
cd ../web
pnpm test
```

Or from the root directory:
```powershell
pnpm --filter web test
```

---

## Local Security & Trust Model

1. **Filesystem Confinement**: Every target destination is strictly verified with `target.resolve().relative_to(root.resolve())`. Any attempt to escape the selected folder produces a `PathSecurityException`.
2. **Never Deletes**: The codebase contains zero file deletion calls. Files are only moved or renamed.
3. **Collision Resistance**: Existing files are never silently overwritten.
4. **Metadata Only**: Prompts sent to Ollama contain only filename, extension, file size, and timestamp. File contents are never read during scans.

---

## License

MIT
