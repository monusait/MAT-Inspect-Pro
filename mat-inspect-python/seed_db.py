"""
Database seeder — populates the SQLite DB with the same mock fleet
and users as the vanilla JS mock data.
Run standalone: python seed_db.py
"""

from app import app, db, Equipment, User, Inspection

with app.app_context():

    # ── Users ──
    users = [
        User(id='u1', name='Monu',       email='lab@mat.ca',     role='lab_tech'),
        User(id='u2', name='Jane Smith', email='manager@mat.ca', role='manager'),
    ]
    for u in users:
        if not db.session.get(User, u.id):
            db.session.add(u)

    # ── Fleet ──
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

    # ── Sample Inspections ──
    sample_inspections = [
        Inspection(id='ins-1234', equipment_id='eq-f3', inspector='Monu',       result='Green',  sync_status='SharePoint Online (Cloud)', fail_count=0, photo_count=3),
        Inspection(id='ins-1233', equipment_id='eq-f2', inspector='Jane Smith',  result='Green',  sync_status='SharePoint Online (Cloud)', fail_count=0, photo_count=3),
        Inspection(id='ins-1232', equipment_id='eq-p1', inspector='Monu',        result='Green',  sync_status='SharePoint Online (Cloud)', fail_count=0, photo_count=4),
        Inspection(id='ins-1231', equipment_id='eq-c3', inspector='Jane Smith',  result='Yellow', sync_status='SharePoint Online (Cloud)', fail_count=1, photo_count=3),
    ]
    for ins in sample_inspections:
        if not db.session.get(Inspection, ins.id):
            db.session.add(ins)

    db.session.commit()
    print("✅ Database seeded successfully.")
