# MAT Inspect Pro — Python / Flask Edition

> Digital Transformation of Heavy Equipment Inspection Protocols  
> School of Manufacturing, Automation & Transportation (MAT / SAIT)

A **full-stack Python** rebuild of the capstone inspection web application using Flask, SQLAlchemy, and Jinja2 templates. Mirrors every feature of the original Vanilla JS version but runs on a real server with a persistent SQLite database.

---

## 🗂️ Project Structure

```
mat-inspect-python/
├── app.py              ← Flask routes, REST API, auth logic
├── seed_db.py          ← DB seeder with mock fleet & users
├── requirements.txt    ← Python dependencies
├── templates/
│   ├── base.html       ← Shared layout + toast system
│   ├── auth.html       ← Passwordless login / signup
│   ├── dashboard.html  ← Manager analytics view
│   ├── roster.html     ← Equipment duty roster
│   └── form.html       ← Inspection form (camera + AI pipeline)
├── static/
│   ├── css/styles.css  ← Glassmorphism design system
│   └── js/app.js       ← ONNX/YOLOv8 AI engine bootstrap
└── instance/
    └── mat_inspect.db  ← Auto-generated SQLite database
```

---

## 🚀 How to Run

### 1. Install dependencies
```powershell
cd E:\Capstone\mat-inspect-python
pip install -r requirements.txt
```

### 2. Start the Flask server
```powershell
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

---

## 🔑 Default Test Accounts (Passwordless)

| Role | Email |
|------|-------|
| Lab Tech (Field Operator) | `lab@mat.ca` |
| Manager (Central Command) | `manager@mat.ca` |

---

## ✨ Features

| Feature | Details |
|---------|---------|
| **Passwordless Auth** | Email-only login; Sign up provisions a new DB record |
| **Role-based Routing** | Lab Techs → Roster, Managers → Dashboard |
| **Equipment Roster** | Full fleet of 10 pieces of equipment with status indicators |
| **Inspection Form** | Dynamic checklists per equipment type, Pass/Fail radio buttons |
| **Multi-Angle Camera** | WebRTC live camera or file upload — min 3 images enforced |
| **AI Batch Simulation** | YOLOv8 ONNX overlay with batch size shown dynamically |
| **Decision Engine** | 0 fails → Green, 1 fail → Yellow, 2+ fails → Red severity |
| **SQLite Persistence** | All users, equipment, and inspections stored in real DB |
| **SharePoint Sync Sim** | AJAX `/api/sync` flips Local Cache records to Cloud status |
| **Glassmorphism UI** | Dark-mode design system with animated orbs and micro-animations |
