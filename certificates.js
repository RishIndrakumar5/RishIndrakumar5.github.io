(() => {
    const STORAGE_KEY = 'portfolio-certificates-v1';
    const SESSION_KEY = 'portfolio-certificates-unlocked';
    // SHA-256 of the editor passcode (plaintext is never stored in the repo)
    const PASSCODE_HASH = 'f2de1d0adc9d35f4f32d82a3dde7768fd587d0d453434a52eecc855d2b24e337';

    const board = document.getElementById('cert-board');
    const emptyMsg = document.getElementById('cert-empty');
    const unlockBtn = document.getElementById('unlock-btn');
    const editActions = document.getElementById('edit-actions');
    const addBtn = document.getElementById('add-cert-btn');
    const saveBtn = document.getElementById('save-btn');
    const lockBtn = document.getElementById('lock-btn');
    const modal = document.getElementById('passcode-modal');
    const passcodeInput = document.getElementById('passcode-input');
    const passcodeError = document.getElementById('passcode-error');
    const passcodeCancel = document.getElementById('passcode-cancel');
    const passcodeSubmit = document.getElementById('passcode-submit');
    const saveStatus = document.getElementById('save-status');
    const certHint = document.getElementById('cert-hint');

    // Always start locked — password required every time to edit or add
    let editing = false;
    sessionStorage.removeItem(SESSION_KEY);
    let data = loadData();
    let dragState = null;
    let resizeState = null;

    function defaultData() {
        const published = window.CERTIFICATES_DATA || { boardHeight: 700, items: [] };
        return {
            boardHeight: published.boardHeight || 700,
            items: Array.isArray(published.items) ? structuredClone(published.items) : []
        };
    }

    function loadData() {
        // Live page file (certificates-data.js) is the source of truth
        return defaultData();
    }

    function setSaveStatus(message, isError = false) {
        if (!saveStatus) return;
        saveStatus.textContent = message;
        saveStatus.classList.toggle('is-error', isError);
    }

    async function sha256Hex(text) {
        const bytes = new TextEncoder().encode(text);
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    function uid() {
        return `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function requireEdit() {
        if (editing) return true;
        showModal(true);
        setSaveStatus('Enter the passcode to edit or add certificates.', true);
        return false;
    }

    function setEditing(on, statusMessage) {
        editing = !!on;
        if (on) {
            sessionStorage.setItem(SESSION_KEY, '1');
        } else {
            sessionStorage.removeItem(SESSION_KEY);
            dragState = null;
            resizeState = null;
        }
        unlockBtn.hidden = on;
        editActions.hidden = !on;
        if (certHint) certHint.hidden = !on;
        board.classList.toggle('is-editing', on);
        if (typeof statusMessage === 'string') {
            setSaveStatus(statusMessage);
        } else {
            setSaveStatus(on ? 'Editing unlocked. Add or change certificates, then Save.' : '');
        }
        render();
    }

    function showModal(show) {
        modal.hidden = !show;
        passcodeError.hidden = true;
        if (show) {
            passcodeInput.value = '';
            passcodeInput.focus();
        }
    }

    async function tryUnlock() {
        const entered = passcodeInput.value;
        const hash = await sha256Hex(entered);
        if (hash === PASSCODE_HASH) {
            showModal(false);
            setEditing(true);
        } else {
            passcodeError.hidden = false;
            passcodeInput.select();
        }
    }

    function render() {
        board.style.minHeight = `${data.boardHeight}px`;
        board.querySelectorAll('.cert-card').forEach((el) => el.remove());

        emptyMsg.hidden = data.items.length > 0;

        data.items.forEach((item) => {
            board.appendChild(createCard(item));
        });
    }

    function createCard(item) {
        const card = document.createElement('article');
        card.className = 'cert-card';
        card.dataset.id = item.id;
        card.style.left = `${item.x}%`;
        card.style.top = `${item.y}px`;
        card.style.width = `${item.width}%`;
        card.style.zIndex = String(item.zIndex || 1);

        const imgWrap = document.createElement('div');
        imgWrap.className = 'cert-card-image';

        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.title || 'Certificate';
            img.draggable = false;
            imgWrap.appendChild(img);
        } else {
            const ph = document.createElement('div');
            ph.className = 'cert-card-placeholder';
            ph.textContent = editing ? 'Add image' : 'Certificate';
            imgWrap.appendChild(ph);
        }

        const body = document.createElement('div');
        body.className = 'cert-card-body';

        const title = document.createElement(editing ? 'div' : 'h3');
        title.className = 'cert-card-title';
        title.textContent = item.title || 'Untitled certificate';
        if (editing) {
            title.contentEditable = 'true';
            title.spellcheck = true;
            title.addEventListener('input', () => {
                item.title = title.textContent.trim();
            });
        }

        const desc = document.createElement('p');
        desc.className = 'cert-card-desc';
        desc.textContent = item.description || '';
        if (editing) {
            desc.contentEditable = 'true';
            desc.dataset.placeholder = 'Add a description…';
            if (!item.description) desc.classList.add('is-empty');
            desc.addEventListener('input', () => {
                item.description = desc.textContent.trim();
                desc.classList.toggle('is-empty', !item.description);
            });
            desc.addEventListener('focus', () => desc.classList.remove('is-empty'));
            desc.addEventListener('blur', () => {
                if (!desc.textContent.trim()) desc.classList.add('is-empty');
            });
        }

        body.appendChild(title);
        if (editing || item.description) body.appendChild(desc);

        card.appendChild(imgWrap);
        card.appendChild(body);

        if (editing) {
            const controls = document.createElement('div');
            controls.className = 'cert-card-controls';

            const imgBtn = document.createElement('button');
            imgBtn.type = 'button';
            imgBtn.className = 'cert-btn cert-btn-small';
            imgBtn.textContent = 'Image';
            imgBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pickImage(item);
            });

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'cert-btn cert-btn-small cert-btn-danger';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                data.items = data.items.filter((c) => c.id !== item.id);
                render();
            });

            controls.appendChild(imgBtn);
            controls.appendChild(delBtn);
            card.appendChild(controls);

            const handle = document.createElement('div');
            handle.className = 'cert-resize-handle';
            handle.title = 'Drag to resize';
            card.appendChild(handle);

            card.addEventListener('pointerdown', (e) => {
                if (e.target.closest('.cert-card-controls, .cert-resize-handle, [contenteditable]')) return;
                startDrag(e, item, card);
            });

            handle.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                startResize(e, item, card);
            });

            imgWrap.addEventListener('click', (e) => {
                if (!item.image) {
                    e.stopPropagation();
                    pickImage(item);
                }
            });
        }

        return card;
    }

    function startDrag(e, item, card) {
        if (!editing) return;
        e.preventDefault();
        const rect = board.getBoundingClientRect();
        dragState = {
            item,
            card,
            offsetX: e.clientX - rect.left - (item.x / 100) * rect.width,
            offsetY: e.clientY - rect.top - item.y
        };
        item.zIndex = maxZ() + 1;
        card.style.zIndex = String(item.zIndex);
        card.classList.add('is-dragging');
        card.setPointerCapture(e.pointerId);
    }

    function startResize(e, item, card) {
        if (!editing) return;
        e.preventDefault();
        const rect = board.getBoundingClientRect();
        resizeState = {
            item,
            card,
            startX: e.clientX,
            startWidth: item.width,
            boardWidth: rect.width
        };
        card.classList.add('is-resizing');
        card.setPointerCapture(e.pointerId);
    }

    function maxZ() {
        return data.items.reduce((m, i) => Math.max(m, i.zIndex || 1), 1);
    }

    function onPointerMove(e) {
        if (!editing) return;
        if (dragState) {
            const rect = board.getBoundingClientRect();
            let x = ((e.clientX - rect.left - dragState.offsetX) / rect.width) * 100;
            let y = e.clientY - rect.top - dragState.offsetY;
            x = Math.max(0, Math.min(100 - dragState.item.width, x));
            y = Math.max(0, y);
            dragState.item.x = Math.round(x * 10) / 10;
            dragState.item.y = Math.round(y);
            dragState.card.style.left = `${dragState.item.x}%`;
            dragState.card.style.top = `${dragState.item.y}px`;
            const needed = dragState.item.y + dragState.card.offsetHeight + 40;
            if (needed > data.boardHeight) {
                data.boardHeight = needed;
                board.style.minHeight = `${data.boardHeight}px`;
            }
        }
        if (resizeState) {
            const dx = e.clientX - resizeState.startX;
            let width = resizeState.startWidth + (dx / resizeState.boardWidth) * 100;
            width = Math.max(18, Math.min(90, width));
            if (resizeState.item.x + width > 100) width = 100 - resizeState.item.x;
            resizeState.item.width = Math.round(width * 10) / 10;
            resizeState.card.style.width = `${resizeState.item.width}%`;
        }
    }

    function onPointerUp(e) {
        if (dragState) {
            dragState.card.classList.remove('is-dragging');
            try { dragState.card.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            dragState = null;
        }
        if (resizeState) {
            resizeState.card.classList.remove('is-resizing');
            try { resizeState.card.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
            resizeState = null;
        }
    }

    function compressImage(file, maxWidth = 1400, quality = 0.82) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Could not read image'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Could not load image'));
                img.onload = () => {
                    const scale = Math.min(1, maxWidth / img.width);
                    const width = Math.round(img.width * scale);
                    const height = Math.round(img.height * scale);
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = String(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }

    function pickImage(item) {
        if (!requireEdit()) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async () => {
            if (!editing) return;
            const file = input.files && input.files[0];
            if (!file) return;
            try {
                item.image = await compressImage(file);
                render();
            } catch (_) {
                const reader = new FileReader();
                reader.onload = () => {
                    if (!editing) return;
                    item.image = String(reader.result);
                    render();
                };
                reader.readAsDataURL(file);
            }
        });
        input.click();
    }

    function addCertificate() {
        if (!requireEdit()) return;
        const count = data.items.length;
        data.items.push({
            id: uid(),
            title: 'New certificate',
            description: '',
            image: '',
            x: 5 + (count % 3) * 30,
            y: 20 + Math.floor(count / 3) * 280,
            width: 28,
            zIndex: maxZ() + 1
        });
        render();
    }

    function clearLocalCache() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (_) {
            /* ignore */
        }
    }

    async function saveViaServer() {
        const res = await fetch('/api/certificates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                passcodeHash: PASSCODE_HASH,
                data
            })
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(result.error || 'Server save failed');
        }
        window.CERTIFICATES_DATA = structuredClone(data);
        return result.message || 'Saved to the live certificates page.';
    }

    async function saveToPortfolio() {
        if (!requireEdit()) return;
        saveBtn.disabled = true;
        setSaveStatus('Saving to the live page…');

        try {
            if (!window.location.protocol.startsWith('http') || window.location.hostname === '') {
                throw new Error(
                    'Open http://localhost:4173/certificates.html with the local server to save to the live page.'
                );
            }

            const message = await saveViaServer();
            clearLocalCache();
            setEditing(false, message || 'Saved to the live page. Editing is locked.');
            saveBtn.textContent = 'Save';
        } catch (err) {
            const fallbackHint =
                ' Could not save to the live page. Run node server.js and use http://localhost:4173/certificates.html';
            setSaveStatus((err && err.message ? err.message : 'Save failed.') + fallbackHint, true);
        } finally {
            saveBtn.disabled = false;
        }
    }

    unlockBtn.addEventListener('click', () => showModal(true));
    lockBtn.addEventListener('click', () => setEditing(false));
    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addCertificate();
    });
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveToPortfolio();
    });
    passcodeCancel.addEventListener('click', () => showModal(false));
    passcodeSubmit.addEventListener('click', tryUnlock);
    passcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryUnlock();
        if (e.key === 'Escape') showModal(false);
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) showModal(false);
    });

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Display-only until the correct passcode is entered
    setEditing(false);
})();
