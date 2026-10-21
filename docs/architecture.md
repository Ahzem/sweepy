# Sweepy System Architecture

Sweepy is a local-first, AI-assisted downloads and folder organization utility. It is architected around a strict core principle:

> **AI recommends; deterministic application code executes; the user stays in control.**

---

## 1. Monorepo Organization

The project is structured as a pnpm monorepo containing decoupled frontend and backend applications:

```text
sweepy/
├── apps/
│   ├── web/                     # Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS)
│   │   ├── src/
│   │   │   ├── app/             # App Router layout and pages
│   │   │   ├── components/      # UI components (Dashboard, Organizer, Activity, Settings)
│   │   │   ├── lib/             # api-client.ts, utils.ts
│   │   │   └── types/           # TypeScript contracts
│   │   ├── tests/               # Vitest test suite
│   │   └── package.json
│   └── api/                     # Python 3.11+ with FastAPI & Pydantic v2
│       ├── app/
│       │   ├── api/             # Versioned REST router (/api/v1)
│       │   ├── core/            # Config, centralized logging, custom exceptions
│       │   ├── repositories/    # Atomic JSON operation log repository
│       │   ├── schemas/         # Pydantic v2 request/response models
│       │   ├── services/        # FolderService, AIService, FileService, OrganizationService
│       │   └── utils/           # Windows path safety and file categorization
│       ├── tests/               # Pytest test suite
│       └── pyproject.toml
├── docs/                        # Architecture and reference documentation
├── scripts/                     # Windows 11 PowerShell developer scripts (dev.ps1)
├── package.json                 # Monorepo root scripts
├── pnpm-workspace.yaml          # Workspace definition
└── README.md                    # Setup and usage guide
```

---

## 2. Component Responsibilities

### Backend (`apps/api`)
- **FastAPI Core**: Binds strictly to `127.0.0.1:8000` with CORS restricted to local origins.
- **FolderService**: Resolves and validates directory paths. Performs file enumeration without reading file contents. Respects exclusion lists (`.git`, `node_modules`, `.venv`) and ignores hidden/system files.
- **AIService**: Manages communication with the local Ollama instance (`http://localhost:11434`) using model `gemma3:1b`. Enforces JSON format mode (`format: "json"`). Implements automatic, deterministic rule-based fallback when Ollama or the model is offline.
- **FileService & OrganizationService**: Executes deterministic filesystem moves and renames using Python `shutil` and `pathlib`. Enforces strict directory confinement, collision prevention, and logs operations for rollback.
- **OperationLogRepository**: Thread-safe atomic JSON repository that persists completed operations to `~/.sweepy/operations_log.json`.

### Frontend (`apps/web`)
- **Next.js App Router**: Modern desktop-first interface styled with Tailwind CSS and Lucide icons.
- **State Management**: React state maintaining scanned files, active suggestions, operation history, and connection health.
- **Inline Editing**: Allows users to override AI-generated filenames or destination folders before approving changes.
- **Safety Modal**: Mandatory preview dialog displaying exact path transforms and collision warnings prior to execution.

---

## 3. Security and Path Safety Model

Because Sweepy manipulates files on the host computer, it enforces a defense-in-depth safety model:

1. **Root Directory Confinement**: All file operations require a validated root folder. Target paths are verified with `target.resolve().relative_to(root.resolve())`. Any traversal sequences (`../`, absolute paths, symlinks escaping the root) are rejected with `PathSecurityException`.
2. **Drive & System Root Protection**: Scanning drive roots (`C:\`) or the Windows directory (`C:\Windows`) is explicitly forbidden.
3. **No File Deletions**: Sweepy's codebase contains no deletion or unlinking calls for user files.
4. **Collision Avoidance**: If a destination path already exists on disk, Sweepy generates an incremental unique suffix (e.g. `document (1).pdf`) rather than overwriting existing files.
5. **Windows Filesystem Compliance**: Validates and sanitizes filenames against Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) and forbidden characters (`< > : " / \ | ? *`).
6. **No Arbitrary Execution**: Never invokes external shells (`powershell`, `cmd`, `bash`) to execute file moves; uses native Python filesystem APIs.

---

## 4. AI Inference and Fallback Strategy

Sweepy integrates with Ollama's local HTTP API:
- **Model**: `gemma3:1b` (Google Gemma 3 1B parameters).
- **Prompt Isolation**: Prompts contain only metadata (filename, extension, size, modification date, and extension-derived category). Document bodies or file contents are never transmitted.
- **Context Management**: Files are batched in chunks of 15 items to stay well within Gemma 1B's optimal context window and ensure sub-second response times.
- **Deterministic Rule Fallback**: If Ollama is offline, unreachable, or times out, Sweepy immediately falls back to deterministic rule-based suggestions (keyword detection + category grouping). The user experience is never blocked.

---

## 5. Safe Undo Architecture

Every completed file move produces an immutable `OperationRecord`:
- Stores original relative path, resulting relative path, target folder, timestamp, and unique batch ID.
- Reversal validates that the file still exists at the current location and that the original location is vacant before executing the reverse move.
- If an operation cannot be undone safely (e.g. original location was recreated or destination was manually deleted), the operation is rejected with a clear explanation, leaving the filesystem untouched.
