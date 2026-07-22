# 🚛 ELD Trip Planner

**HOS-Compliant Electronic Logging Device Trip Planner for Property-Carrying Interstate Truck Drivers**

> Automatically generates FMCSA-compliant Hours of Service (HOS) schedules, ELD log sheets, and route maps for multi-day truck trips — built as a full-stack assessment project.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Running the Backend](#-running-the-backend-django)
- [Running the Frontend](#-running-the-frontend-react)
- [API Reference](#-api-reference)
- [HOS Rules Implemented](#-hos-rules-implemented)
- [Running Tests](#-running-tests)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **JWT Authentication** | Real register/login/logout with `djangorestframework-simplejwt` |
| 🗺️ **Interactive Route Map** | React-Leaflet + OpenStreetMap with custom pin markers for every stop |
| 📊 **ELD Log Sheets** | Auto-generated SVG 24-hour graph grid per day, with numbered segment badges |
| 📅 **Multi-Day Scheduling** | Full FMCSA HOS simulation across unlimited days |
| 🗃️ **Trip History** | All trips saved to DB; expandable history cards with full details |
| 🖨️ **Print & PDF Export** | Print log sheets natively or download as PDF via jsPDF |
| 🚨 **Custom Modals** | No native `window.confirm` — all dialogs use custom dark-glassmorphic modals |

---

## 🛠 Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Django | ≥ 5.0 | Web framework |
| Django REST Framework | latest | API layer |
| djangorestframework-simplejwt | latest | JWT auth tokens |
| django-cors-headers | latest | Cross-origin request handling |
| requests | latest | Nominatim + OSRM HTTP calls |
| python-decouple | latest | Environment variable management |
| gunicorn | latest | Production WSGI server |
| whitenoise | latest | Static file serving |
| SQLite | built-in | Development database |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | ^18.3.1 | UI framework |
| Vite | ^5.4.1 | Build tool & dev server |
| React Router DOM | ^6.26.0 | Client-side routing |
| Axios | ^1.7.3 | HTTP client with interceptors |
| React-Leaflet | ^4.2.1 | Interactive map component |
| Leaflet | ^1.9.4 | Map engine (OpenStreetMap tiles) |
| react-to-print | ^2.15.1 | Print log sheets |
| jsPDF + html2canvas | ^2.5.1 / ^1.4.1 | PDF export |
| react-hot-toast | ^2.4.1 | Toast notifications |
| lucide-react | ^0.436.0 | Icon library |
| Tailwind CSS | ^3.4.10 | Utility-first styling |

### External APIs (Free, No Key Required)
| API | Purpose |
|---|---|
| **Nominatim (OpenStreetMap)** | Address geocoding & autocomplete |
| **OSRM (public demo)** | Real driving route geometry, distance, and duration |

---

## 📁 Project Structure

```
internship/
├── backend/                    # Django project
│   ├── accounts/               # User model & JWT auth endpoints
│   │   ├── views.py            # Register, Login, Logout, Me
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── trips/                  # Trip planning & HOS engine
│   │   ├── models.py           # Trip model
│   │   ├── views.py            # PlanTripView, TripListView, TripDetailView
│   │   ├── serializers.py      # Input + List + Detail serializers
│   │   └── services/
│   │       ├── hos_engine.py   # FMCSA HOS simulation engine
│   │       └── routing.py      # Nominatim geocoding + OSRM routing
│   ├── eld_project/            # Django settings & URL config
│   │   ├── settings.py
│   │   └── urls.py
│   ├── test_hos_matrix.py      # Automated HOS rule test matrix (9 tests)
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                   # React + Vite project
    ├── public/
    │   └── e-logo.svg          # App favicon (custom E logo)
    ├── src/
    │   ├── api/
    │   │   └── tripApi.js      # Axios client + JWT interceptors
    │   ├── context/
    │   │   └── AuthContext.jsx # Global auth state (React Context)
    │   ├── components/
    │   │   ├── DailyLogSheet.jsx   # SVG ELD 24-hour grid component
    │   │   ├── RouteMap.jsx        # React-Leaflet route map
    │   │   └── ConfirmModal.jsx    # Custom confirm modal
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── PlannerPage.jsx     # Main trip planner
    │   │   └── HistoryPage.jsx     # Trip history list
    │   ├── App.jsx             # Routes + AuthProvider
    │   └── index.css           # Design system (dark glassmorphic theme)
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🔧 Prerequisites

Make sure the following are installed on your machine:

- **Python** 3.10 or higher → [Download](https://www.python.org/downloads/)
- **Node.js** 18 or higher → [Download](https://nodejs.org/)
- **npm** (bundled with Node.js)
- **Git** (optional)

---

## 🐍 Running the Backend (Django)

### 1. Navigate to the backend directory
```bash
cd d:\internship\backend
```

### 2. Create a virtual environment
```bash
python -m venv venv
```

### 3. Activate the virtual environment
```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (CMD)
venv\Scripts\activate.bat

# macOS / Linux
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Apply database migrations
```bash
python manage.py migrate
```

### 6. (Optional) Create an admin superuser
```bash
python manage.py createsuperuser
```

### 7. Start the development server
```bash
python manage.py runserver
```

> ✅ Backend is now running at **http://localhost:8000**

---

## ⚛️ Running the Frontend (React)

### 1. Open a new terminal and navigate to frontend
```bash
cd d:\internship\frontend
```

### 2. Install npm dependencies
```bash
npm install
```

### 3. Start the Vite dev server
```bash
npm run dev
```

> ✅ Frontend is now running at **http://localhost:5173**

Open your browser and go to **http://localhost:5173** to use the app.

---

## 🔌 API Reference

All API endpoints are prefixed with `/api/`.

### Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Create a new account | ❌ |
| `POST` | `/api/auth/login/` | Login and receive JWT tokens | ❌ |
| `POST` | `/api/auth/logout/` | Blacklist the refresh token | ✅ |
| `GET` | `/api/auth/me/` | Get current user info | ✅ |
| `POST` | `/api/auth/token/refresh/` | Refresh the access token | ❌ |

### Trip Planning

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/plan-trip/` | Plan a trip, run HOS simulation, save to DB | ✅ |
| `GET` | `/api/trips/` | List all trips for the current user | ✅ |
| `GET` | `/api/trips/{id}/` | Get full details of a single trip | ✅ |
| `DELETE` | `/api/trips/{id}/` | Delete a trip | ✅ |

### POST `/api/plan-trip/` — Request Body

```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Dallas, TX",
  "dropoff_location": "Houston, TX",
  "current_cycle_used": 20.0
}
```

---

## ⏱ HOS Rules Implemented

Based on **FMCSA 49 CFR Part 395** (April 2022 Guide):

| Rule | Limit | Trigger |
|---|---|---|
| **11-Hour Driving Limit** | Max 11h driving per shift | Forces 10-hour rest |
| **14-Hour Window** | 14 consecutive hours from shift start | No more driving after hour 14 |
| **30-Minute Break** | After 8 cumulative driving hours | Schedules 30-min off-duty break |
| **70-Hour/8-Day Cycle** | 70 total on-duty hours in 8 days | Triggers 34-hour restart |
| **34-Hour Restart** | 34 consecutive off-duty hours | Resets the 70-hour cycle to 0 |
| **Fuel Stop** | Every 1,000 miles | Schedules 1-hour on-duty fuel stop |
| **24-Hour Day Boundary** | Midnight split | Overnight segments auto-split at 00:00 |
| **Shift Alignment** | Start at 08:00 AM | Day 1 begins with 00:00–08:00 Off Duty |

---

## 🧪 Running Tests

The backend includes an automated HOS rule test matrix covering 9 scenarios:

```bash
cd d:\internship\backend
python test_hos_matrix.py
```

### Test Scenarios Covered

| # | Scenario | What It Verifies |
|---|---|---|
| 1 | Short trip (~2h) | No rest stop, single day |
| 2 | Medium trip (~12h) | One 10-hour rest, two log days |
| 3 | Long trip (1,200+ miles) | Multi-day, fuel stop, multiple rests |
| 4 | Cycle near 70h | 34-hour restart instead of 10-hour rest |
| 5 | Distance < 1,000 miles | No fuel stop |
| 6 | Distance > 1,000 miles | Fuel stop appears |
| 7 | Invalid inputs | 400 error returned |
| 8 | Unauthenticated request | 401 error returned |
| 9 | Trip saved to DB | History endpoint returns saved trips |

> All 9 tests must pass: **9/9 ✅**

---

## 🌐 Environment Variables

The backend uses `python-decouple`. Create a `.env` file inside `backend/` if needed:

```env
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

The frontend uses Vite's `.env` system. The file `frontend/.env` already contains:

```env
VITE_API_BASE=http://localhost:8000/api
```

---

## 🧑‍💻 Author

Built as a graded technical assessment project implementing real-world FMCSA HOS compliance simulation with a modern full-stack architecture.
