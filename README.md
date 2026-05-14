# NeuroCraft

**Road Vision** (Expo / React Native) talks to **EasyRoad API** (FastAPI): road crack detection (YOLO) and traffic sign classification (YOLO crop + PyTorch CNN). Run the backend first, then the mobile app.

## Prerequisites

- **Node.js** 20+ (LTS recommended) and npm
- **Python** 3.10 or 3.11 (match what your PyTorch build supports)
- **Expo CLI** is pulled in via npm scripts (`npx expo`); install [Expo Go](https://expo.dev/go) on a phone for quick testing, or use iOS Simulator / Android Emulator
- **GPU (optional):** `back-end/requirements.txt` installs PyTorch **CUDA 12.1** wheels. Without a matching NVIDIA driver/GPU, use the CPU install path below

## Repository layout

| Path | Role |
|------|------|
| `back-end/` | FastAPI app (`app.py`), models, `requirements.txt` |
| `front-end/` | Expo app (“Road Vision”), `expo-router` |

## 1. Backend (EasyRoad API)

### Windows (quick path)

From `back-end/`:

1. Run `setup.bat` — creates `venv` and installs dependencies
2. Run `run_server.bat` — serves the API at **http://0.0.0.0:8000** (reload on code changes)

### Manual (any OS)

```bash
cd back-end
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs: **http://localhost:8000/docs**
Health / model status: **GET** `http://localhost:8000/health`

### Model weights

Place files under `back-end/models/` (the directory is created on startup if missing):

| File | Purpose |
|------|---------|
| `cracks.pt` | YOLO crack detector (via Ultralytics). If missing, crack detection stays unavailable |
| `signs_classificator.pth` | State dict for the GTSRB-style CNN. If missing, sign classification stays unavailable |

The sign **detector** currently loads `yolov8n.pt` via Ultralytics (downloaded on first use if not cached). Adjust `app.py` if you ship a custom `yolov8_signs.pt`.

### CPU-only or no CUDA

The pinned `torch==2.5.1+cu121` line expects CUDA 12.1 wheels. On machines without a compatible GPU, create a separate venv and install CPU PyTorch from [pytorch.org](https://pytorch.org/get-started/locally/), then install the rest of the stack (FastAPI, uvicorn, ultralytics, opencv-python, pillow, numpy, pydantic, python-multipart) with versions compatible with your environment. The server falls back to CPU automatically when CUDA is not available.

## 2. Frontend (Road Vision)

```bash
cd front-end
npm install
npm start
```

Then press `i` / `a` / `w` in the terminal for iOS simulator, Android emulator, or web (Expo will prompt as usual).

### Pointing the app at your API

The app calls **`POST /process/all`** on a configurable base URL.
**API configuration is now centralized in [`front-end/config.ts`](front-end/config.ts).** All API endpoints are defined as constants for easy reuse. See [front-end/API_CONFIG.md](front-end/API_CONFIG.md) for detailed setup instructions.
- **Development default:**
  - iOS simulator / web: `http://localhost:8000`
  - Android emulator: `http://10.0.2.2:8000` (maps to the host machine)
- **Override (recommended for physical devices or custom hosts):** set **`EXPO_PUBLIC_API_URL`** before starting Expo, e.g.
  `http://192.168.1.50:8000` (use your PC’s LAN IP; no trailing slash required)

Examples:

```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_URL="http://192.168.1.50:8000"; npm start
```

```bash
# macOS / Linux
EXPO_PUBLIC_API_URL=http://192.168.1.50:8000 npm start
```

Release builds must set `EXPO_PUBLIC_API_URL`; in production without it, the app will not call the API.

### Useful scripts (`front-end/package.json`)

- `npm start` — Expo dev server
- `npm run android` / `npm run ios` — native run after prebuild when applicable
- `npm run web` — web target

## 3. Verify end-to-end

1. Backend running; open `http://localhost:8000/health` and confirm expected models show as loaded.
2. Frontend running with a reachable `EXPO_PUBLIC_API_URL` (or dev defaults).
3. In the app, use **Choose image and scan** — grant photo access when prompted.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Short JSON with links to docs |
| GET | `/health` | Status and which models loaded |
| POST | `/detect/cracks` | Multipart image → crack detections |
| POST | `/classify/signs` | Multipart image → sign pipeline |
| POST | `/process/all` | Multipart image → cracks + signs (used by the app) |

---

If something fails, check the backend terminal for import errors, missing weights, or CUDA messages, and confirm the phone/emulator can reach the host IP and port (firewall rules on Windows may block inbound port 8000).
