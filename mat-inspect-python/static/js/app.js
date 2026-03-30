/**
 * MAT Inspect Pro — Python/Flask Edition
 * Global JS utilities (camera helper called from form.html inline scripts,
 * AI-engine ONNX bootstrap, and global toast helper)
 */

// ── ONNX / YOLOv8 AI Engine Bootstrap ──
window.AI_ENGINE = {
    isInitialized: false,
    async initialize() {
        if (typeof ort === 'undefined') return;
        console.log('🚀 [AI ENGINE] Bootstrapping YOLOv8 ONNX Runtime...');
        console.log('✅ [AI ENGINE] ONNX Runtime Web active — YOLOv8 Batch Interface Ready');
        console.log('ℹ️  [AI ENGINE] Awaiting .onnx weight files in /static/models/ — Simulation Mode active');
        this.isInitialized = true;
    },
    async predict(imageData) {
        // Production: load ort.InferenceSession from yolov8_custom.onnx
        // const session = await ort.InferenceSession.create('/static/models/yolov8_custom_defect.onnx', { executionProviders: ['webgl','wasm'] });
        // const tensor  = new ort.Tensor('float32', imageData, [1, 3, 640, 640]);
        // return await session.run({ images: tensor });
        return 'SIMULATION_BYPASS';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.AI_ENGINE.initialize();
});

// ── Global Toast helper (usable from any page) ──
window.showToast = function(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 4000);
};
