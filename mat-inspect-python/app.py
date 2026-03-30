"""
MAT Inspection System - Python / Flask Backend
Digital Transformation of Heavy Equipment Inspection Protocols
School of Manufacturing, Automation, and Transportation (MAT)
"""

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import uuid
import json
import os
import io
import qrcode
import qrcode.image.svg

app = Flask(__name__)
app.secret_key = 'mat-inspect-capstone-secret-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mat_inspect.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy()
db.init_app(app)

# ──────────────────────────────────────────────
# Database Models
# ──────────────────────────────────────────────

class User(db.Model):
    id       = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name     = db.Column(db.String(120), nullable=False)
    email    = db.Column(db.String(120), unique=True, nullable=False)
    role     = db.Column(db.String(30), nullable=False)  # 'manager' | 'lab_tech'
    created  = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Equipment(db.Model):
    id              = db.Column(db.String(36), primary_key=True)
    name            = db.Column(db.String(120), nullable=False)
    type            = db.Column(db.String(60), nullable=False)
    status          = db.Column(db.String(20), default='Green')   # Green/Yellow/Red
    last_inspection = db.Column(db.String(40), default='Never')


class Inspection(db.Model):
    id           = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = db.Column(db.String(36), db.ForeignKey('equipment.id'), nullable=False)
    inspector    = db.Column(db.String(120), nullable=False)
    result       = db.Column(db.String(20), nullable=False)        # Green/Yellow/Red
    notes        = db.Column(db.Text, default='')
    fail_count   = db.Column(db.Integer, default=0)
    photo_count  = db.Column(db.Integer, default=0)
    sync_status  = db.Column(db.String(40), default='Local Cache')
    timestamp    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    equipment    = db.relationship('Equipment', backref='inspections')


# ──────────────────────────────────────────────
# Auth Helpers
# ──────────────────────────────────────────────

def current_user():
    uid = session.get('user_id')
    return db.session.get(User, uid) if uid else None

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user():
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated


# ──────────────────────────────────────────────
# Checklist Data (embedded — no DB needed)
# ──────────────────────────────────────────────

CHECKLISTS = {
    'Crane': [
        {'id': 'c1', 'text': 'Inspect wire rope for kinks, broken wires, or corrosion'},
        {'id': 'c2', 'text': 'Test limit switches (upper and lower)'},
        {'id': 'c3', 'text': 'Check hook for deformation, cracks, or missing safety latch'},
        {'id': 'c4', 'text': 'Verify pendant control buttons function smoothly without sticking'},
    ],
    'Forklift': [
        {'id': 'f1', 'text': 'Check tire condition and pressure (if pneumatic)'},
        {'id': 'f2', 'text': 'Inspect mast and forks for cracks, bending, or excessive wear'},
        {'id': 'f3', 'text': 'Test horn, backup alarm, and lights'},
        {'id': 'f4', 'text': 'Check fluid levels (hydraulic, brake, coolant, oil)'},
    ],
    'Truck': [
        {'id': 't1', 'text': 'Perform 360-degree walkaround (lights, tires, body damage)'},
        {'id': 't2', 'text': 'Test air brakes (if applicable) and parking brake'},
        {'id': 't3', 'text': 'Check all mirrors are intact and adjusted properly'},
    ],
    'Pallet Jack': [
        {'id': 'p1', 'text': 'Verify battery charge level is sufficient'},
        {'id': 'p2', 'text': 'Check lifting mechanism raises and lowers smoothly'},
        {'id': 'p3', 'text': 'Inspect wheels for chunking or flat spots'},
    ],
}


# ──────────────────────────────────────────────
# Routes — Authentication
# ──────────────────────────────────────────────

@app.route('/', methods=['GET'])
def index():
    if current_user():
        u = current_user()
        return redirect(url_for('dashboard') if u.role == 'manager' else url_for('roster'))
    return redirect(url_for('auth'))

@app.route('/auth', methods=['GET'])
def auth():
    if current_user():
        return redirect(url_for('index'))
    mode = request.args.get('mode', 'login')
    return render_template('auth.html', mode=mode)

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '').strip().lower()
    user  = User.query.filter_by(email=email).first()
    if user:
        session['user_id'] = user.id
        flash(f'Welcome back, {user.name}!', 'success')
        return redirect(url_for('dashboard') if user.role == 'manager' else url_for('roster'))
    flash('No identity found for that email. Please register.', 'error')
    return redirect(url_for('auth'))

@app.route('/signup', methods=['POST'])
def signup():
    name  = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()
    role  = request.form.get('role', 'lab_tech')

    if User.query.filter_by(email=email).first():
        flash('An identity with this email already exists.', 'error')
        return redirect(url_for('auth', mode='signup'))

    user = User(name=name, email=email, role=role)
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    flash(f'Identity provisioned. Welcome to MAT Inspect, {name}!', 'success')
    return redirect(url_for('dashboard') if role == 'manager' else url_for('roster'))

@app.route('/logout')
def logout():
    session.clear()
    flash('Securely logged out.', 'success')
    return redirect(url_for('auth'))


# ──────────────────────────────────────────────
# Routes — Core Views
# ──────────────────────────────────────────────

@app.route('/dashboard')
@login_required
def dashboard():
    user = current_user()
    fleet = Equipment.query.all()
    inspections = Inspection.query.order_by(Inspection.timestamp.desc()).limit(10).all()
    
    stats = {
        'total_equipment' : len(fleet),
        'total_inspections': Inspection.query.count(),
        'safe'            : sum(1 for e in fleet if e.status == 'Green'),
        'warning'         : sum(1 for e in fleet if e.status == 'Yellow'),
        'danger'          : sum(1 for e in fleet if e.status == 'Red'),
        'offline_pending' : Inspection.query.filter_by(sync_status='Local Cache').count(),
    }
    return render_template('dashboard.html', user=user, fleet=fleet,
                           inspections=inspections, stats=stats)

@app.route('/roster')
@login_required
def roster():
    user  = current_user()
    fleet = Equipment.query.all()
    return render_template('roster.html', user=user, fleet=fleet)

@app.route('/form/<equipment_id>', methods=['GET'])
@login_required
def form(equipment_id):
    user = current_user()
    equipment = db.get_or_404(Equipment, equipment_id)
    checklist = CHECKLISTS.get(equipment.type, [])
    return render_template('form.html', user=user, equipment=equipment, checklist=checklist)

@app.route('/submit_inspection', methods=['POST'])
@login_required
def submit_inspection():
    user         = current_user()
    equipment_id = request.form.get('equipment_id')
    notes        = request.form.get('notes', '')
    photo_count  = int(request.form.get('photo_count', 0))
    fail_count   = int(request.form.get('fail_count', 0))

    # Decision engine: severity mapping
    if fail_count == 0:
        result = 'Green'
    elif fail_count == 1:
        result = 'Yellow'
    else:
        result = 'Red'

    inspection = Inspection(
        equipment_id=equipment_id,
        inspector=user.name,
        result=result,
        notes=notes,
        fail_count=fail_count,
        photo_count=photo_count,
        sync_status='Local Cache',
    )
    db.session.add(inspection)

    # Update equipment status
    equipment = db.session.get(Equipment, equipment_id)
    if equipment:
        equipment.status = result
        equipment.last_inspection = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    db.session.commit()
    flash(f'Inspection submitted. Severity: {result}', 'success')
    return redirect(url_for('roster'))


# ──────────────────────────────────────────────
# REST API — for AJAX / JS camera integration
# ──────────────────────────────────────────────

@app.route('/api/sync', methods=['POST'])
@login_required
def api_sync():
    """Simulate pushing Local Cache records to SharePoint Online."""
    pending = Inspection.query.filter_by(sync_status='Local Cache').all()
    count = 0
    for ins in pending:
        ins.sync_status = 'SharePoint Online (Cloud)'
        count += 1
    db.session.commit()
    return jsonify({'synced': count, 'message': f'Synced {count} records to SharePoint Online.'})

@app.route('/api/equipment')
@login_required
def api_equipment():
    fleet = Equipment.query.all()
    return jsonify([{
        'id': e.id, 'name': e.name, 'type': e.type,
        'status': e.status, 'last_inspection': e.last_inspection
    } for e in fleet])

@app.route('/api/inspections')
@login_required
def api_inspections():
    inspections = Inspection.query.order_by(Inspection.timestamp.desc()).all()
    return jsonify([{
        'id': i.id, 'equipment_id': i.equipment_id,
        'inspector': i.inspector, 'result': i.result,
        'sync_status': i.sync_status,
        'timestamp': i.timestamp.isoformat()
    } for i in inspections])


# ──────────────────────────────────────────────
# Routes — QR Code System
# ──────────────────────────────────────────────

@app.route('/qr/image/<equipment_id>')
@login_required
def qr_image(equipment_id):
    """Generate and return a PNG QR code for a piece of equipment."""
    equipment = db.get_or_404(Equipment, equipment_id)
    payload = json.dumps({
        'id':   equipment.id,
        'name': equipment.name,
        'type': equipment.type,
        'url':  f'/form/{equipment.id}',
        'system': 'MAT-Inspect-Pro'
    })
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=4,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png',
                     download_name=f'QR_{equipment.id}.png')


@app.route('/asset-tags')
@login_required
def asset_tags():
    """Manager view: printable QR asset tag sheet for all equipment."""
    user  = current_user()
    fleet = Equipment.query.all()
    return render_template('asset_tags.html', user=user, fleet=fleet)


@app.route('/scanner')
@login_required
def scanner():
    """Lab-tech view: camera + file-upload QR scanner."""
    user = current_user()
    return render_template('scanner.html', user=user)


@app.route('/api/scan', methods=['POST'])
@login_required
def api_scan():
    """Resolve a scanned QR payload → redirect target URL."""
    data = request.get_json(force=True)
    raw  = data.get('raw', '')
    try:
        payload = json.loads(raw)
        equip_id = payload.get('id')
        equipment = db.session.get(Equipment, equip_id)
        if equipment:
            return jsonify({'ok': True, 'redirect': f'/form/{equip_id}',
                            'name': equipment.name, 'type': equipment.type,
                            'status': equipment.status})
    except Exception:
        pass
    # Fallback: treat raw string as direct equipment id
    equipment = db.session.get(Equipment, raw.strip())
    if equipment:
        return jsonify({'ok': True, 'redirect': f'/form/{equipment.id}',
                        'name': equipment.name, 'type': equipment.type,
                        'status': equipment.status})
    return jsonify({'ok': False, 'message': 'Unknown QR code — no matching equipment found.'})


def seed_database():
    """Populate DB with default fleet and test users if empty."""
    users = [
        User(id='u1', name='Monu',       email='lab@mat.ca',     role='lab_tech'),
        User(id='u2', name='Jane Smith', email='manager@mat.ca', role='manager'),
    ]
    for u in users:
        if not db.session.get(User, u.id):
            db.session.add(u)

    fleet = [
        Equipment(id='eq-c1', name='Overhead Crane Alpha', type='Crane',       status='Green',  last_inspection='2023-10-25T08:00:00Z'),
        Equipment(id='eq-c2', name='Overhead Crane Beta',  type='Crane',       status='Green',  last_inspection='2023-10-23T14:30:00Z'),
        Equipment(id='eq-c3', name='Overhead Crane Gamma', type='Crane',       status='Yellow', last_inspection='2023-10-24T09:15:00Z'),
        Equipment(id='eq-c4', name='Overhead Crane Delta', type='Crane',       status='Red',    last_inspection='2023-10-20T10:00:00Z'),
        Equipment(id='eq-f1', name='Forklift Heavy H1',    type='Forklift',    status='Green',  last_inspection='2023-10-25T07:45:00Z'),
        Equipment(id='eq-f2', name='Forklift Agile F2',    type='Forklift',    status='Green',  last_inspection='2023-10-26T08:00:00Z'),
        Equipment(id='eq-f3', name='Forklift Reach R1',    type='Forklift',    status='Green',  last_inspection='2023-10-26T08:30:00Z'),
        Equipment(id='eq-t1', name='Transport Truck T1',   type='Truck',       status='Yellow', last_inspection='2023-10-21T00:00:00Z'),
        Equipment(id='eq-t2', name='Transport Truck T2',   type='Truck',       status='Green',  last_inspection='2023-10-26T06:00:00Z'),
        Equipment(id='eq-p1', name='Electric Pallet Jack', type='Pallet Jack', status='Green',  last_inspection='2023-10-25T11:00:00Z'),
    ]
    for e in fleet:
        if not db.session.get(Equipment, e.id):
            db.session.add(e)

    sample = [
        Inspection(id='ins-1234', equipment_id='eq-f3', inspector='Monu',       result='Green',  sync_status='SharePoint Online (Cloud)', fail_count=0, photo_count=3),
        Inspection(id='ins-1233', equipment_id='eq-f2', inspector='Jane Smith',  result='Green',  sync_status='SharePoint Online (Cloud)', fail_count=0, photo_count=3),
        Inspection(id='ins-1232', equipment_id='eq-p1', inspector='Monu',        result='Green',  sync_status='SharePoint Online (Cloud)', fail_count=0, photo_count=4),
        Inspection(id='ins-1231', equipment_id='eq-c3', inspector='Jane Smith',  result='Yellow', sync_status='SharePoint Online (Cloud)', fail_count=1, photo_count=3),
    ]
    for ins in sample:
        if not db.session.get(Inspection, ins.id):
            db.session.add(ins)

    db.session.commit()
    print("✅ Database seeded successfully.")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if Equipment.query.count() == 0:
            seed_database()
    app.run(debug=True, port=5000)
