// State Management
const state = {
    view: 'auth', // modes: auth, dashboard, roster, form
    selectedEquipment: null,
    currentUser: null,
    isLoginMode: true
};

const appContainer = document.getElementById('app-container');

// Render Navigation Framework
function renderNav() {
    const offlineCount = MOCK_DATA.recentInspections.filter(i => i.syncStatus === 'Local Cache').length;
    let syncBtn = '';
    
    if (offlineCount > 0) {
        syncBtn = `<button class="btn" style="background:var(--state-warning); color:black; border:none; padding:0.5rem 1rem; font-size:0.8rem; font-weight:600" onclick="syncOfflineToSharePoint()"><i class="fa-solid fa-cloud-arrow-up"></i> Sync ${offlineCount} Pending to SharePoint</button>`;
    }

    return `
        <nav class="top-nav">
            <div class="nav-brand">
                <i class="fa-solid fa-shield-halved" style="color:var(--accent-blue)"></i>
                MAT Inspect Pro
            </div>
            <div class="nav-profile">
                ${syncBtn}
                <button class="btn btn-outline" onclick="changeView(state.currentUser.role === 'manager' ? 'roster' : 'dashboard')" style="font-size: 0.8rem; padding: 0.5rem 1rem; margin-right:10px;">
                    ${state.currentUser.role === 'manager' ? '<i class="fa-solid fa-mobile-screen"></i> Field Operations (Lab Tech)' : '<i class="fa-solid fa-chart-pie"></i> SharePoint Analytics (Manager)'}
                <div class="avatar" title="${state.currentUser.name} (${state.currentUser.role})">
                    ${state.currentUser.name.charAt(0)}
                </div>
                <button class="btn btn-icon" onclick="logout()" title="Secure Logout" style="margin-left: 8px; color:var(--state-danger); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.4rem 0.6rem;">
                    <i class="fa-solid fa-power-off"></i>
                </button>
            </div>
        </nav>
    `;
}

// Render Core App
function renderApp() {
    if (!state.currentUser) {
        state.view = 'auth';
    }

    if (state.view === 'auth') {
        appContainer.innerHTML = renderAuth();
        return;
    }

    let content = '';

    if (state.view === 'dashboard') {
        content = renderDashboard();
    } else if (state.view === 'roster') {
        content = renderRoster();
    } else if (state.view === 'form' && state.selectedEquipment) {
        content = renderForm();
    } else if (state.view === 'scanner') {
        content = renderScanner();
    } else if (state.view === 'assetTags') {
        content = renderAssetTags();
    }

    appContainer.innerHTML = `
        ${renderNav()}
        <main class="view-container">
            ${content}
        </main>
    `;
}

window.capturedImagesQueue = [];

// Routing Function
window.changeView = function(newView, equipId = null) {
    if (newView === 'form') {
        window.capturedImagesQueue = [];
    }
    
    // Auth role protection ensures users stay in their correct scope during general navigation
    if (!state.currentUser && newView !== 'auth') {
        newView = 'auth';
    }

    state.view = newView;
    if (equipId) {
        state.selectedEquipment = MOCK_DATA.fleet.find(e => e.id === equipId);
    } else {
        state.selectedEquipment = null;
    }
    
    renderApp();
    window.scrollTo(0, 0); // Reset scroll position
    
    if (newView === 'scanner') {
        setTimeout(initScanner, 100);
    } else {
        stopScanner();
    }
    
    // Always tear down active form camera if leaving
    if (typeof stopFormCamera === 'function') {
        stopFormCamera();
    }
}

function getStatusClass(status) {
    if (status === 'Green') return 'status-safe';
    if (status === 'Red') return 'status-danger';
    return 'status-warning';
}

function getBadgeClass(status) {
    if (status === 'Green' || status === 'Pass') return 'badge-success';
    if (status === 'Red' || status === 'Fail') return 'badge-danger';
    return 'badge-warning';
}

function renderDashboard() {
    const totalEquip = MOCK_DATA.fleet.length;
    const safeEquip = MOCK_DATA.fleet.filter(e => e.status === 'Green').length;
    const issueEquip = totalEquip - safeEquip;
    
    // Rendering the most recent inspections
    const recentRender = MOCK_DATA.recentInspections.slice(0, 5).map(ins => {
        const eqData = MOCK_DATA.fleet.find(e => e.id === ins.equipmentId);
        return `
            <div class="checklist-item" style="border-left: 4px solid ${ins.result === 'Green' ? 'var(--state-success)' : (ins.result === 'Red' ? 'var(--state-danger)' : 'var(--state-warning)')}">
                <div style="flex:1">
                    <strong style="color:white">${eqData ? eqData.name : 'Unknown'} <span style="font-size:0.75rem; color:var(--accent-blue); margin-left:10px">[${ins.syncStatus || 'Local Cache'}]</span></strong>
                    <div style="font-size:0.875rem; margin-top:4px; color:var(--text-muted)">
                        <span title="Operator ID"><i class="fa-regular fa-user" style="margin-right:5px"></i> ${ins.inspector}</span>
                        &nbsp;&nbsp;&bull;&nbsp;&nbsp; 
                        <span title="Extracted Metadata Location"><i class="fa-solid fa-location-dot" style="margin-right:5px"></i> ${ins.location || 'SAIT Campus'}</span>
                        &nbsp;&nbsp;&bull;&nbsp;&nbsp;
                        <span title="Timestamp"><i class="fa-regular fa-clock" style="margin-right:5px"></i> ${new Date(ins.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <span class="badge ${getBadgeClass(ins.result)}">${ins.result} Severity</span>
            </div>
        `;
    }).join('');

    return `
        <div class="glass-panel" style="animation-delay: 0.1s;">
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h2 style="color:white; margin-bottom:0.5rem;"><i class="fa-solid fa-chart-line" style="color:var(--accent-blue); margin-right:10px;"></i> SharePoint DB & Analytics Dashboard</h2>
                    <p>KPIs & Trends overview for MAT facility predictive maintenance. Model Used: YOLOv8 + CNN.</p>
                </div>
                <button class="btn btn-outline" onclick="changeView('assetTags')"><i class="fa-solid fa-qrcode"></i> Print Asset Tags</button>
            </div>
            
            <div class="dashboard-grid">
                <div class="stat-card">
                    <i class="fa-solid fa-shield-check icon" style="color:var(--state-success)"></i>
                    <div class="stat-value">${safeEquip}/${totalEquip}</div>
                    <div class="stat-label">Equipment Safe to Use</div>
                </div>
                <div class="stat-card" style="border-color:${issueEquip > 0 ? 'var(--state-warning)' : 'var(--border-light)'}">
                    <i class="fa-solid fa-triangle-exclamation icon" style="color:${issueEquip > 0 ? 'var(--state-warning)' : 'var(--accent-blue)'}"></i>
                    <div class="stat-value" style="color:${issueEquip > 0 ? 'var(--state-warning)' : 'white'}">${issueEquip}</div>
                    <div class="stat-label">Predictive Maintenance Queue</div>
                </div>
                <div class="stat-card">
                    <i class="fa-solid fa-database icon" style="color:var(--accent-blue)"></i>
                    <div class="stat-value">${MOCK_DATA.recentInspections.length}</div>
                    <div class="stat-label">Inspection History DB</div>
                </div>
            </div>
            
            <h3 style="margin-top: 3rem; margin-bottom: 1rem; color:white">Inspection History Logs</h3>
            <div class="recent-list">
                ${recentRender}
            </div>
        </div>
    `;
}

function renderRoster() {
    // Rendering the equipment available for the Lab Tech
    const rosterRender = MOCK_DATA.fleet.map(eq => `
        <div class="equip-card ${getStatusClass(eq.status)}" onclick="changeView('form', '${eq.id}')">
            <div class="equip-header">
                <div>
                    <h3 class="equip-title">${eq.name}</h3>
                    <div class="equip-type"><i class="fa-solid fa-truck-moving" style="margin-right:5px"></i> ${eq.type}</div>
                </div>
                <span class="badge ${getBadgeClass(eq.status)}">${eq.status}</span>
            </div>
            
            <div style="margin: 1.5rem 0;">
                <p style="font-size:0.875rem; color:var(--text-muted);"><i class="fa-regular fa-clock" style="margin-right:5px"></i> Last Inspected:</p>
                <div style="color:white; font-weight:500;">${new Date(eq.lastInspection).toLocaleString()}</div>
            </div>
            
            <button class="btn btn-primary" style="width:100%">Verify Pre-Use Safe <i class="fa-solid fa-arrow-right" style="margin-left:5px"></i></button>
        </div>
    `).join('');

    return `
        <div style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem;">
            <div>
                <h2 style="color:white; margin-bottom:0.5rem;"><i class="fa-solid fa-clipboard-user" style="color:var(--accent-blue); margin-right:10px;"></i> Duty Roster: Select Machine</h2>
                <p>Select machinery below or scan its QR code to execute safe pre-use checks.</p>
            </div>
            <button class="btn btn-primary" onclick="changeView('scanner')"><i class="fa-solid fa-qrcode"></i> Scan Asset Tag</button>
        </div>
        <div class="equipment-list">
            ${rosterRender}
        </div>
    `;
}

function renderForm() {
    const eq = state.selectedEquipment;
    const checklist = MOCK_DATA.checklists[eq.type] || [];
    
    // Rendering the dynamic checklist fields based on Equipment Type
    const checklistRender = checklist.map((item, idx) => `
        <div class="checklist-item" id="item-${idx}">
            <div style="flex: 1">
                <i class="fa-regular fa-circle-check item-icon" style="margin-right:10px; color:var(--text-muted)"></i>
                <span style="font-weight:500">${item.text} ${item.isRequired ? '<span style="color:var(--state-danger)" title="Mandatory">*</span>' : ''}</span>
            </div>
            <div class="check-options">
                <input type="radio" class="radio-btn" name="check-${idx}" id="pass-${idx}" value="pass" onchange="updateItemStyle(${idx}, 'pass')">
                <label class="radio-label" for="pass-${idx}"><i class="fa-solid fa-check"></i> PASS</label>
                
                <input type="radio" class="radio-btn" name="check-${idx}" id="fail-${idx}" value="fail" onchange="updateItemStyle(${idx}, 'fail')">
                <label class="radio-label" for="fail-${idx}"><i class="fa-solid fa-xmark"></i> FAIL</label>
            </div>
        </div>
    `).join('');

    return `
        <div class="glass-panel" style="max-width: 800px; margin: 0 auto;">
            <button class="btn btn-icon" onclick="changeView('roster')" style="margin-bottom:1rem; font-size:1.5rem;" title="Go Back"><i class="fa-solid fa-arrow-left"></i></button>
            
            <div class="inspection-header">
                <span class="badge badge-success" style="margin-bottom:1rem; display:inline-block">${eq.type} Checklist</span>
                <h2 style="color:white; margin:0;">${eq.name}</h2>
                <p style="margin-top:10px;">Complete this form prior to operation. Ensure all specific items are verified visually. Falsifying this report is an OHS violation.</p>
            </div>

            <form id="inspection-form" onsubmit="submitForm(event)">
                <h3 style="margin-bottom: 1.5rem; color:white"><i class="fa-solid fa-list-check" style="margin-right:8px; color:var(--accent-blue)"></i> Action Items</h3>
                ${checklistRender}

                <div class="form-group" style="margin-top:2.5rem">
                    <label class="form-label" style="font-weight:600">Inspector Comments / Observations</label>
                    <textarea class="form-control" rows="4" placeholder="Describe any leaks, damage, hydraulic concerns, or strange noises..."></textarea>
                </div>
                
                <div class="form-group" id="photo-capture-section">
                    <label class="form-label" style="font-weight:600"><i class="fa-solid fa-camera" style="color:var(--accent-blue); margin-right:5px"></i> Multi-Angle Photo Verification <span style="color:var(--state-danger)" title="Min 3 Required">*</span></label>
                    
                    <div id="camera-interface-btn" style="border: 2px dashed rgba(255,255,255,0.2); transition:all 0.3s; padding:2.5rem; text-align:center; border-radius:var(--radius-md); background:rgba(0,0,0,0.2); cursor:pointer" onclick="startFormCamera()">
                        <i class="fa-solid fa-video" style="font-size:2.5rem; color:var(--accent-blue); margin-bottom:15px"></i>
                        <p style="color:white; font-weight:500; margin-bottom:5px">Initialize device camera for batch capture</p>
                        <p style="font-size:0.875rem"><i class="fa-solid fa-microchip"></i> Min. 3 images required for YOLOv8 batch inferencing.</p>
                    </div>

                    <div id="active-camera-interface" style="display:none; text-align:center; background:#050505; border:1px solid var(--border-light); padding:1rem; border-radius:var(--radius-md);">
                        <video id="form-video-feed" autoplay playsinline style="width:100%; max-width:500px; border-radius:var(--radius-md); display:block; margin:0 auto; background:black;"></video>
                        <div style="display:flex; justify-content:center; gap:10px; margin-top:15px">
                            <button type="button" class="btn btn-primary" style="font-size:1.1rem; padding: 0.8rem 2rem;" onclick="captureFormSnapshot()"><i class="fa-solid fa-camera-viewfinder"></i> Snap Photo</button>
                            <button type="button" class="btn btn-outline" style="padding: 0.8rem 1rem;" onclick="closeFormCamera()"><i class="fa-solid fa-xmark"></i> Close</button>
                        </div>
                    </div>
                    
                    <div id="snapshot-gallery-wrapper" style="display:none; padding:1.5rem; border:2px solid var(--border-light); border-radius:var(--radius-md); background:var(--bg-panel); margin-top:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                            <h4 style="color:white; margin:0;"><i class="fa-solid fa-images"></i> Queue: <span id="gallery-count">0</span>/3 Photos</h4>
                            <span id="gallery-status-badge" class="badge badge-danger">INCOMPLETE</span>
                        </div>
                        <div id="snapshot-gallery-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:10px; margin-bottom:15px;">
                            <!-- Thumbnails injected here -->
                        </div>
                        <button type="button" id="add-more-photos-btn" class="btn btn-outline" style="width:100%; border-style:dashed;" onclick="startFormCamera()"><i class="fa-solid fa-plus"></i> Capture Another Angle</button>
                    </div>
                </div>

                <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div>
                        <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:5px">Verified by:</p>
                        <div style="font-weight:600; color:white; display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-fingerprint" style="color:var(--accent-blue)"></i> Digital Signature: ${state.currentUser.name}
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary" style="font-size:1.1rem; padding:1rem 2rem;">
                        <i class="fa-solid fa-file-shield" style="margin-right:8px"></i> Submit Secure Report
                    </button>
                </div>
            </form>
        </div>
    `;
}

// QR Code Subsystems
let html5QrCode = null;

function renderScanner() {
    return `
        <div class="glass-panel" style="max-width: 600px; margin: 0 auto; text-align:center;">
            <button class="btn btn-icon" onclick="changeView('roster')" style="margin-bottom:1rem; font-size:1.5rem; float:left;"><i class="fa-solid fa-arrow-left"></i></button>
            <div style="clear:both;"></div>
            <h2 style="color:white; margin-bottom:1rem;"><i class="fa-solid fa-qrcode" style="color:var(--accent-blue); margin-right:10px"></i> Scan Asset Tag</h2>
            <p style="margin-bottom:2rem;">Point your device camera at the QR code mounted on the machinery to instantly fetch its checklist.</p>
            
            <div id="qr-reader"></div>
            <div id="qr-reader-fallback" style="display:none;"></div>
            
            <div style="margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border-light)">
                <h3 style="font-size:1.1rem; color:white; margin-bottom:1rem;"><i class="fa-solid fa-shield-halved" style="color:var(--state-warning)"></i> Capture Fallbacks</h3>
                <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">Capture the precise QR image if the live scan fails</p>

                <div style="display:flex; flex-direction:column; gap:15px; align-items:center;">
                    <div style="display:flex; width:100%; max-width:300px; gap:10px;">
                        <input type="file" id="qr-upload-file" accept="image/*" capture="environment" class="form-control" style="padding: 0.5rem; font-size: 0.8rem">
                        <button class="btn btn-primary" onclick="processCapturedImage()"><i class="fa-solid fa-upload"></i> Process</button>
                    </div>

                    <div style="display:flex; width:100%; max-width:300px; gap:10px;">
                        <input type="text" id="manual-equip-id" class="form-control" placeholder="Enter ID (e.g. eq-c1)" style="flex:1;">
                        <button class="btn btn-outline" onclick="manualScan()">Go</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initScanner() {
    if (html5QrCode) {
        try { html5QrCode.clear(); } catch(e) {}
    }
    
    // Using Html5QrcodeScanner for better stability and built-in camera selection logic
    html5QrCode = new Html5QrcodeScanner(
        "qr-reader", 
        { fps: 15, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true }, 
        /* verbose= */ false
    );
    
    html5QrCode.render(
        (decodedText, decodedResult) => {
            // handle success instantly
            stopScanner();
            
            // Try formatting precise info payload (JSON)
            let parsedId = decodedText;
            try {
                const preciseObj = JSON.parse(decodedText);
                if (preciseObj && preciseObj.id) parsedId = preciseObj.id;
            } catch (err) {}
            
            if (MOCK_DATA.fleet.find(e => e.id === parsedId)) {
                changeView('form', parsedId);
            } else {
                showToast('Unknown precise QR Code Payload Scanned.', 'error');
                setTimeout(() => changeView('roster'), 2000);
            }
        },
        (errorMessage) => {
            // parse errors silently
        }
    );
}

function stopScanner() {
    if (html5QrCode) {
        try {
            html5QrCode.clear();
            html5QrCode = null;
        } catch(e) {}
    }
}

window.manualScan = function() {
    const val = document.getElementById('manual-equip-id').value.trim();
    if(val && MOCK_DATA.fleet.find(e => e.id === val)) {
        changeView('form', val);
    } else {
        showToast('Invalid Equipment ID entered.', 'error');
    }
}

window.processCapturedImage = function() {
    const fileInput = document.getElementById('qr-upload-file');
    if (!fileInput.files.length) {
        showToast('Please capture or select an image file first.', 'warning');
        return;
    }
    
    const file = fileInput.files[0];
    // Create an invisible secondary scanner for file extraction
    const fileScanner = new Html5Qrcode("qr-reader-fallback"); 
    
    fileScanner.scanFile(file, true)
        .then(decodedText => {
            let parsedId = decodedText;
            try {
                const preciseObj = JSON.parse(decodedText);
                if (preciseObj && preciseObj.id) parsedId = preciseObj.id;
            } catch(e) {}
            
            if (MOCK_DATA.fleet.find(e => e.id === parsedId)) {
                stopScanner(); // stop active live scanner
                changeView('form', parsedId);
                showToast('Pre-capture accepted. Unique Info loaded.', 'success');
            } else {
                showToast('Captured image contains unknown equipment info.', 'error');
            }
        })
        .catch(err => {
             showToast('Failed. No scannable QR structure found in this image.', 'error');
        });
}

function renderAssetTags() {
    const tagsRender = MOCK_DATA.fleet.map(eq => {
        // Embed precise and unique JSON info payload directly into QR
        const precisePayload = JSON.stringify({ id: eq.id });
        const encodedUrl = encodeURIComponent(precisePayload);
        
        return `
        <div class="asset-tag">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedUrl}" alt="QR code" />
            <h4>${eq.name}</h4>
            <p style="font-size:0.875rem; color:#555">Precise Info ID: ${eq.id}</p>
        </div>
        `;
    }).join('');

    return `
        <div class="glass-panel">
            <button class="btn btn-icon" onclick="changeView('dashboard')" style="margin-bottom:1rem; font-size:1.5rem;"><i class="fa-solid fa-arrow-left"></i></button>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem;">
                <div>
                    <h2 style="color:white; margin:0;"><i class="fa-solid fa-print" style="color:var(--accent-blue)"></i> Equipment Asset Tags</h2>
                    <p>Print this sheet and affix the QR labels to the corresponding physical machinery.</p>
                </div>
                <button class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Sheet</button>
            </div>
            
            <div class="asset-tags-grid">
                ${tagsRender}
            </div>
        </div>
    `;
}

// User Interactions
window.updateItemStyle = function(idx, result) {
    const item = document.getElementById('item-' + idx);
    const icon = item.querySelector('.item-icon');
    
    // Clear old state
    item.classList.remove('pass', 'fail');
    icon.className = 'item-icon fa-solid';
    
    // Set New State
    if(result === 'pass') {
        item.classList.add('pass');
        icon.classList.add('fa-check-circle');
        icon.style.color = "var(--state-success)";
    } else {
        item.classList.add('fail');
        icon.classList.add('fa-circle-exclamation');
        icon.style.color = "var(--state-danger)";
    }
}

let formVideoStream = null;

window.startFormCamera = function() {
    document.getElementById('camera-interface-btn').style.display = 'none';
    document.getElementById('snapshot-gallery-wrapper').style.display = 'none';
    document.getElementById('active-camera-interface').style.display = 'block';
    
    const video = document.getElementById('form-video-feed');
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            formVideoStream = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                formVideoStream = stream;
                video.srcObject = stream;
            }).catch(e => {
                showToast("Camera access denied or device has no camera.", "error");
                document.getElementById('camera-interface-btn').style.display = 'block';
                document.getElementById('active-camera-interface').style.display = 'none';
            });
        });
}

window.captureFormSnapshot = function() {
    const video = document.getElementById('form-video-feed');
    if (!formVideoStream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/png');
    
    // Add to multiple images queue
    if (!window.capturedImagesQueue) window.capturedImagesQueue = [];
    window.capturedImagesQueue.push(dataUrl);
    
    // Render Gallery
    const grid = document.getElementById('snapshot-gallery-grid');
    const countText = document.getElementById('gallery-count');
    const badge = document.getElementById('gallery-status-badge');
    const wrapper = document.getElementById('snapshot-gallery-wrapper');
    
    grid.innerHTML = window.capturedImagesQueue.map((src, i) => `
        <div style="position:relative; width:100%; aspect-ratio:1; border-radius:var(--radius-sm); overflow:hidden; border:2px solid var(--border-focus);">
            <img src="${src}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; bottom:0; right:0; background:rgba(0,0,0,0.7); color:white; font-size:12px; font-weight:bold; padding:2px 6px; border-top-left-radius:var(--radius-sm);">#${i+1}</div>
        </div>
    `).join('');
    
    countText.innerText = window.capturedImagesQueue.length;
    
    if (window.capturedImagesQueue.length >= 3) {
        badge.className = 'badge badge-success';
        badge.innerText = 'MINIMUM MET';
        wrapper.style.borderColor = 'var(--state-success)';
    } else {
        badge.className = 'badge badge-danger';
        badge.innerText = 'INCOMPLETE';
        wrapper.style.borderColor = 'var(--border-light)';
    }
    
    window.closeFormCamera();
    showToast(`Angle ${window.capturedImagesQueue.length} captured and placed in queue.`, 'success');
}

window.closeFormCamera = function() {
    stopFormCamera();
    document.getElementById('active-camera-interface').style.display = 'none';
    
    // Return to appropriate UI
    if (window.capturedImagesQueue && window.capturedImagesQueue.length > 0) {
        document.getElementById('snapshot-gallery-wrapper').style.display = 'block';
    } else {
        document.getElementById('camera-interface-btn').style.display = 'block';
    }
}

window.stopFormCamera = function() {
    if (formVideoStream) {
        formVideoStream.getTracks().forEach(track => track.stop());
        formVideoStream = null;
    }
}

window.submitForm = function(e) {
    e.preventDefault();
    
    const eq = state.selectedEquipment;
    const checklist = MOCK_DATA.checklists[eq.type] || [];
    let allFilled = true;
    let failCount = 0;

    // Validate that required items are completed
    for (let i = 0; i < checklist.length; i++) {
        if (!checklist[i].isRequired) continue;
        const pass = document.getElementById('pass-'+i).checked;
        const fail = document.getElementById('fail-'+i).checked;
        if (!pass && !fail) {
            allFilled = false;
            document.getElementById('item-'+i).style.border = '1px solid var(--state-danger)';
        } else {
             document.getElementById('item-'+i).style.border = '1px solid var(--border-light)';
        }
        if (fail) failCount++;
    }

    if (!allFilled) {
        showToast('Action required: Please complete all mandatory inspection items.', 'error');
        return;
    }
    
    if (!window.capturedImagesQueue || window.capturedImagesQueue.length < 3) {
        showToast('<i class="fa-solid fa-triangle-exclamation"></i> Action required: Please capture at least 3 distinct machine angles.', 'error');
        
        // Highlight the box
        const section = document.getElementById('photo-capture-section');
        if (section) {
            section.style.border = '2px solid var(--state-danger)';
            section.style.padding = '10px';
            section.style.borderRadius = 'var(--radius-md)';
            setTimeout(() => { section.style.border = 'none'; section.style.padding = '0'; }, 3000);
        }
        return;
    }
    
    // Extract Metadata Location 
    let locStr = "SAIT Main Campus";
    if (navigator.geolocation && location.protocol !== 'file:') {
        navigator.geolocation.getCurrentPosition(pos => {
            locStr = `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`;
        }, () => {});
    }

    // AI Pipeline Simulation Engine Overlay
    const overlayHtml = `
        <div id="ai-sim-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.90); backdrop-filter:blur(5px); z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white;">
            <i class="fa-solid fa-layer-group fa-fade" style="font-size:4rem; color:var(--accent-blue); margin-bottom:2rem;"></i>
            <h2 id="ai-stage-text" style="margin-bottom:1rem">AI Batch Pipeline Triggered...</h2>
            <div style="width: 300px; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow:hidden;">
                <div id="ai-progress-bar" style="width: 5%; height: 100%; background: var(--accent-blue); transition: width 0.5s;"></div>
            </div>
            <p id="ai-sub-text" style="color:var(--text-muted); margin-top:2rem">Constructing Tensor Array for [Batch Size: ${window.capturedImagesQueue.length}] images...</p>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    
    setTimeout(() => {
        document.getElementById('ai-stage-text').innerText = 'Preprocessing Tensor Array';
        document.getElementById('ai-sub-text').innerText = `Formatting batch of ${window.capturedImagesQueue.length} captured images for model ingest...`;
        document.getElementById('ai-progress-bar').style.width = '35%';
    }, 1500);
    
    setTimeout(() => {
        document.getElementById('ai-stage-text').innerText = 'Parallel Batch Inference Starting';
        document.getElementById('ai-sub-text').innerText = 'YOLOv8 Component & Defect Detection Matrix Active...';
        document.getElementById('ai-progress-bar').style.width = '60%';
    }, 3000);
    
    setTimeout(() => {
        document.getElementById('ai-stage-text').innerText = 'CNN Defect Classification';
        document.getElementById('ai-sub-text').innerText = 'Cross-referencing limits against rules/thresholds...';
        document.getElementById('ai-progress-bar').style.width = '90%';
    }, 4500);

    setTimeout(() => {
        // Decision Engine logic implementation
        const overlay = document.getElementById('ai-sim-overlay');
        if (overlay) overlay.remove();
        
        let severity = 'Green';
        if (failCount === 1) severity = 'Yellow';
        if (failCount >= 2) severity = 'Red';
        
        // Mock Add to Offline Cache Database
        const newRecord = {
            id: 'ins-' + Math.floor(Math.random() * 100000),
            timestamp: new Date().toISOString(),
            inspector: state.currentUser.name,
            equipmentId: state.selectedEquipment.id,
            result: severity,
            location: locStr,
            syncStatus: 'Local Cache'
        };
        MOCK_DATA.recentInspections.unshift(newRecord);
        
        // Update local equipment state to reflect the new severity output
        const targetEq = MOCK_DATA.fleet.find(e => e.id === state.selectedEquipment.id);
        targetEq.lastInspection = new Date().toISOString();
        targetEq.status = severity;
        
        if (window.persistLocalCache) window.persistLocalCache();

        // Alerts & Reports Triggers
        if (severity === 'Red') {
            showToast('Decision Engine: Severity RED. Defect Classified.', 'error');
            setTimeout(() => showToast('<i class="fa-solid fa-bolt" style="color:#fdba74"></i> Power Automate: Maintenance Ticket Created & HSE Emailed!', 'error'), 1500);
        } else if (severity === 'Yellow') {
            showToast('Decision Engine: Severity YELLOW. Uploading to Predictive Maintenance queue.', 'warning');
        } else {
            showToast('Decision Engine: SAFE. Annotated Image stored to local cache.', 'success');
        }
        
        // Redirect back to roster view
        setTimeout(() => {
            changeView('roster');
        }, severity === 'Red' ? 4500 : 2500);

    }, 6000);
}

window.showToast = function(msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = type === 'success' 
        ? '<i class="fa-solid fa-circle-check" style="font-size:1.5rem"></i> ' + msg 
        : (type === 'error' ? '<i class="fa-solid fa-triangle-exclamation" style="font-size:1.5rem"></i> ' + msg : msg);
    
    container.appendChild(toast);
    
    // auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Data Architecture Integrations
window.syncOfflineToSharePoint = function() {
    showToast('<i class="fa-solid fa-rotate fa-spin"></i> Establishing secure SharePoint Online sync pipeline...', 'success');
    
    setTimeout(() => {
        let synced = 0;
        MOCK_DATA.recentInspections.forEach(ins => {
            if (ins.syncStatus === 'Local Cache') {
                ins.syncStatus = 'SharePoint Online (Cloud)';
                synced++;
            }
        });
        
        if (window.persistLocalCache) window.persistLocalCache();
        showToast(`Successfully synced ${synced} Offline Cache records to SharePoint DB!`, 'success');
        renderApp();
    }, 2500);
}

// ---------------------------------------------
// Authentication Framework Logic
// ---------------------------------------------

window.toggleAuthMode = function() {
    state.isLoginMode = !state.isLoginMode;
    renderApp();
}

window.logout = function() {
    state.currentUser = null;
    state.view = 'auth';
    showToast('Securely logged out of MAT Inspect.', 'success');
    renderApp();
}

window.handleLogin = function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    
    const user = MOCK_DATA.users.find(u => u.email === email && u.password === pass);
    if (user) {
        state.currentUser = user;
        state.view = user.role === 'manager' ? 'dashboard' : 'roster';
        showToast(`Welcome back, ${user.name}!`, 'success');
        renderApp();
    } else {
        showToast('Invalid credentials. Check your email and password.', 'error');
    }
}

window.handleSignup = function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const role = document.getElementById('reg-role').value;
    
    if (MOCK_DATA.users.some(u => u.email === email)) {
        showToast('An active identity with this email already exists.', 'error');
        return;
    }
    
    const newUser = {
        id: 'u-' + Math.floor(Math.random()*100000),
        name, 
        email, 
        password: pass, 
        role
    };
    
    MOCK_DATA.users.push(newUser);
    if (window.persistLocalCache) window.persistLocalCache();
    
    state.currentUser = newUser;
    state.view = role === 'manager' ? 'dashboard' : 'roster';
    showToast(`Identity Provisioned. Welcome to MAT Inspect, ${name}!`, 'success');
    renderApp();
}

function renderAuth() {
    if (state.isLoginMode) {
        return `
            <div style="display:flex; justify-content:center; align-items:center; min-height:85vh">
                <div class="glass-panel" style="width:100%; max-width:420px; text-align:center; animation:fadeIn 0.5s ease-out">
                    <i class="fa-solid fa-shield-halved" style="font-size:3.5rem; color:var(--accent-blue); margin-bottom:1rem; text-shadow:0 0 15px var(--accent-glow);"></i>
                    <h2>Identity Portal</h2>
                    <p style="margin-bottom:2rem; color:var(--text-muted)">Secure Access to MAT Inspect Ecosystem</p>
                    
                    <form onsubmit="handleLogin(event)" style="text-align:left">
                        <div class="form-group">
                            <label class="form-label"><i class="fa-solid fa-envelope" style="color:var(--accent-blue); width:20px;"></i> Email Address</label>
                            <input type="email" id="auth-email" class="form-control" placeholder="lab@mat.ca" required value="lab@mat.ca">
                        </div>
                        <div class="form-group">
                            <label class="form-label"><i class="fa-solid fa-lock" style="color:var(--accent-blue); width:20px;"></i> Security Credential</label>
                            <input type="password" id="auth-pass" class="form-control" placeholder="password123" required value="password123">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1.5rem; padding:1rem; font-size:1.05rem;"><i class="fa-solid fa-right-to-bracket"></i> Authenticate Device</button>
                    </form>
                    
                    <p style="margin-top:2rem; cursor:pointer;" onclick="toggleAuthMode()">No identity clearance? <b style="color:var(--accent-blue)">Initialize profile here.</b></p>
                </div>
            </div>
        `;
    } else {
        return `
            <div style="display:flex; justify-content:center; align-items:center; min-height:85vh">
                <div class="glass-panel" style="width:100%; max-width:420px; text-align:center; animation:fadeIn 0.5s ease-out">
                    <i class="fa-solid fa-user-plus" style="font-size:3.5rem; color:var(--accent-blue); margin-bottom:1rem; text-shadow:0 0 15px var(--accent-glow);"></i>
                    <h2>Register Agent</h2>
                    <p style="margin-bottom:2rem; color:var(--text-muted)">Provision a fresh node connection constraint.</p>
                    
                    <form onsubmit="handleSignup(event)" style="text-align:left">
                        <div class="form-group">
                            <label class="form-label">Full Operator Name</label>
                            <input type="text" id="reg-name" class="form-control" placeholder="John Doe" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contact Node (Email)</label>
                            <input type="email" id="reg-email" class="form-control" placeholder="student@mat.ca" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Permission Vector (Role Function)</label>
                            <select id="reg-role" class="form-control" required style="background:rgba(11, 15, 25, 0.9);">
                                <option value="lab_tech">Field Operator (Lab Tech)</option>
                                <option value="manager">Central Command (Manager)</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-top:1rem;">
                            <label class="form-label">Encryption Key (Password)</label>
                            <input type="password" id="reg-pass" class="form-control" placeholder="Create a secure string..." required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1.5rem; padding:1rem; font-size:1.05rem;"><i class="fa-solid fa-user-check"></i> Provision clearance</button>
                    </form>
                    
                    <p style="margin-top:2rem; cursor:pointer;" onclick="toggleAuthMode()">Node active already? <b style="color:var(--accent-blue)">Return to portal.</b></p>
                </div>
            </div>
        `;
    }
}

// Initial Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
    state.view = 'auth';
    state.isLoginMode = true;
    renderApp();
});
