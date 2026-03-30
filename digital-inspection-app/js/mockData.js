// MAT Inspection System - Offline Cache / DB State Simulator 
// Incorporates Local Storage caching as defined in the Architecture Diagram

const DEFAULT_MOCK_DATA = {
    users: [
        { id: 'u1', name: 'Monu', role: 'lab_tech', email: 'lab@mat.ca', password: 'password123' },
        { id: 'u2', name: 'Jane Smith', role: 'manager', email: 'manager@mat.ca', password: 'password123' },
    ],
    
    fleet: [
        { id: 'eq-c1', name: 'Overhead Crane Alpha', type: 'Crane', lastInspection: '2023-10-25T08:00:00Z', status: 'Green' }, // Green/Yellow/Red severity mapping
        { id: 'eq-c2', name: 'Overhead Crane Beta', type: 'Crane', lastInspection: '2023-10-23T14:30:00Z', status: 'Green' },
        { id: 'eq-c3', name: 'Overhead Crane Gamma', type: 'Crane', lastInspection: '2023-10-24T09:15:00Z', status: 'Yellow' },
        { id: 'eq-c4', name: 'Overhead Crane Delta', type: 'Crane', lastInspection: '2023-10-20T10:00:00Z', status: 'Red' },
        { id: 'eq-f1', name: 'Forklift Heavy H1', type: 'Forklift', lastInspection: '2023-10-25T07:45:00Z', status: 'Green' },
        { id: 'eq-f2', name: 'Forklift Agile F2', type: 'Forklift', lastInspection: '2023-10-26T08:00:00Z', status: 'Green' },
        { id: 'eq-f3', name: 'Forklift Reach R1', type: 'Forklift', lastInspection: '2023-10-26T08:30:00Z', status: 'Green' },
        { id: 'eq-t1', name: 'Transport Truck T1', type: 'Truck', lastInspection: '2023-10-21T00:00:00Z', status: 'Yellow' },
        { id: 'eq-t2', name: 'Transport Truck T2', type: 'Truck', lastInspection: '2023-10-26T06:00:00Z', status: 'Green' },
        { id: 'eq-p1', name: 'Electric Pallet Jack', type: 'Pallet Jack', lastInspection: '2023-10-25T11:00:00Z', status: 'Green' },
    ],

    checklists: {
        'Crane': [
            { id: 'c_h1', text: 'Inspect wire rope for kinks, broken wires, or corrosion', isRequired: true },
            { id: 'c_h2', text: 'Test limit switches (upper and lower)', isRequired: true },
            { id: 'c_h3', text: 'Check hook for deformation, cracks, or missing safety latch', isRequired: true },
            { id: 'c_h4', text: 'Verify pendant control buttons function smoothly without sticking', isRequired: true },
        ],
        'Forklift': [
            { id: 'f_h1', text: 'Check tire condition and pressure (if pneumatic)', isRequired: true },
            { id: 'f_h2', text: 'Inspect mast and forks for cracks, bending, or excessive wear', isRequired: true },
            { id: 'f_h3', text: 'Test horn, backup alarm, and lights', isRequired: true },
            { id: 'f_h4', text: 'Check fluid levels (hydraulic, brake, coolant, oil)', isRequired: true },
        ],
        'Truck': [
            { id: 't_h1', text: 'Perform 360-degree walkaround (lights, tires, body damage)', isRequired: true },
            { id: 't_h2', text: 'Test air brakes (if applicable) and parking brake', isRequired: true },
            { id: 't_h3', text: 'Check all mirrors are intact and adjusted properly', isRequired: true },
        ],
        'Pallet Jack': [
            { id: 'p_h1', text: 'Verify battery charge level is sufficient', isRequired: true },
            { id: 'p_h2', text: 'Check lifting mechanism raises and lowers smoothly', isRequired: true },
            { id: 'p_h3', text: 'Inspect wheels for chunking or flat spots', isRequired: true },
        ]
    },

    recentInspections: [
        { id: 'ins-1234', timestamp: '2023-10-26T08:30:00Z', inspector: 'Monu', equipmentId: 'eq-f3', result: 'Green', syncStatus: 'SharePoint Online' },
        { id: 'ins-1233', timestamp: '2023-10-26T08:00:00Z', inspector: 'Jane Smith', equipmentId: 'eq-f2', result: 'Green', syncStatus: 'SharePoint Online' },
        { id: 'ins-1232', timestamp: '2023-10-25T11:00:00Z', inspector: 'Monu', equipmentId: 'eq-p1', result: 'Green', syncStatus: 'SharePoint Online' },
        { id: 'ins-1231', timestamp: '2023-10-24T09:15:00Z', inspector: 'John Doe', equipmentId: 'eq-c3', result: 'Yellow', syncStatus: 'SharePoint Online' },
    ],
    
    offlineCache: [] // Unsynced data
};

// Auto-load or Bootstrap Local Storage
let MOCK_DATA = JSON.parse(localStorage.getItem('MAT_INSPECT_DB'));
if (!MOCK_DATA) {
    MOCK_DATA = DEFAULT_MOCK_DATA;
    localStorage.setItem('MAT_INSPECT_DB', JSON.stringify(MOCK_DATA));
}

// Ensure pre-existing LocalStorage instances get the Auth Upgrade
MOCK_DATA.users.forEach(u => {
    if (!u.email) u.email = u.role === 'manager' ? 'manager@mat.ca' : 'lab@mat.ca';
    if (!u.password) u.password = 'password123';
});

// Global hook to persist data back to local cache
window.persistLocalCache = function() {
    localStorage.setItem('MAT_INSPECT_DB', JSON.stringify(MOCK_DATA));
}
