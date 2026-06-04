/**
 * PIXIS LIVE EDITOR — overlay.js
 * Capa visual del editor: UI, modals, toolbar flotante, panel lateral
 */

'use strict';

// ── NAMESPACE GLOBAL ──────────────────────────────────────
window.PixisOverlay = (() => {

  /* ────────────────────────────────────────────────────────
     TOPBAR
  ──────────────────────────────────────────────────────── */
  function buildTopbar() {
    const bar = document.createElement('div');
    bar.id = 'pixis-editor-topbar';
    bar.innerHTML = `
      <div class="editor-logo">
        <div class="logo-icon">P</div>
        <span>PIXIS LIVE EDITOR</span>
      </div>

      <div class="editor-divider"></div>

      <div class="editor-mode-indicator">
        <div class="mode-dot"></div>
        MODO EDICIÓN ACTIVO
      </div>

      <div class="editor-divider"></div>

      <div class="editor-tools">
        <button class="editor-tool-btn" id="editorBtnTexts" title="Resaltar textos editables">
          <span class="btn-icon">✏️</span> Textos
        </button>
        <button class="editor-tool-btn" id="editorBtnImages" title="Resaltar imágenes editables">
          <span class="btn-icon">🖼️</span> Imágenes
        </button>
        <button class="editor-tool-btn" id="editorBtnSections" title="Resaltar secciones">
          <span class="btn-icon">📦</span> Secciones
        </button>
        <button class="editor-tool-btn" id="editorBtnProducts" title="Gestionar productos">
          <span class="btn-icon">🛒</span> Productos
        </button>
        <button class="editor-tool-btn" id="editorBtnSiteData" title="Datos del sitio">
          <span class="btn-icon">⚙️</span> Sitio
        </button>
        <button class="editor-tool-btn" id="editorBtnFinanzas" title="Configuración de Cuotas y Optimización">
          <span class="btn-icon">💰</span> Finanzas
        </button>
        <button class="editor-tool-btn" id="editorBtnAdmin" title="Configuración de acceso admin" style="border-color:rgba(245,197,24,0.4);color:#f5c518;">
          <span class="btn-icon">🔐</span> Admin
        </button>
      </div>

      <div class="editor-actions">
        <button class="editor-tool-btn" id="editorBtnBackups" title="Historial de Respaldos / Puntos de Restauración">
          <span class="btn-icon">🛡️</span> Respaldos
        </button>
        <div class="editor-divider"></div>
        <button class="editor-tool-btn undo-btn" id="editorBtnUndo" disabled title="Deshacer último cambio (Ctrl+Z)">
          <span class="btn-icon">↩️</span> Deshacer
        </button>
        <div id="pixis-unsaved-badge" title="Tienes cambios sin guardar">
          ● Sin guardar
        </div>
        <label class="editor-autosave-toggle" title="Guardar automáticamente cada 30 segundos">
          <input type="checkbox" id="editorAutosave"> Autosave
        </label>
        <button class="editor-btn-save" id="editorBtnSave">
          <span>💾</span> Aplicar cambios
        </button>
        <button class="editor-btn-exit" id="editorBtnExit" title="Salir del modo edición">
          ✕ Salir
        </button>
      </div>
    `;
    document.body.prepend(bar);
    document.body.classList.add('pixis-edit-mode');
  }

  /* ────────────────────────────────────────────────────────
     ELEMENT TOOLBAR (flotante)
  ──────────────────────────────────────────────────────── */
  function buildElementToolbar() {
    const tb = document.createElement('div');
    tb.id = 'pixis-element-toolbar';
    tb.innerHTML = `
      <span class="element-tb-label" id="etbLabel">Elemento</span>
      <div class="element-tb-sep"></div>
      <button class="element-tb-btn" id="etbEdit" title="Editar">✏️</button>
      <button class="element-tb-btn" id="etbAlign" title="Alineación">≡</button>
      <button class="element-tb-btn" id="etbDuplicate" title="Duplicar">⧉</button>
      <button class="element-tb-btn" id="etbMoveUp" title="Mover arriba">↑</button>
      <button class="element-tb-btn" id="etbMoveDown" title="Mover abajo">↓</button>
      <div class="element-tb-sep"></div>
      <button class="element-tb-btn danger" id="etbDelete" title="Eliminar">🗑️</button>
    `;
    document.body.appendChild(tb);
  }

  /* ────────────────────────────────────────────────────────
     SIDE PANEL
  ──────────────────────────────────────────────────────── */
  function buildSidePanel() {
    const panel = document.createElement('div');
    panel.id = 'pixis-side-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3 id="panelTitle">Panel de edición</h3>
        <button class="panel-close" id="panelClose">✕</button>
      </div>
      <div class="panel-body" id="panelBody">
        <div class="panel-empty-state">
          <div class="empty-icon">👆</div>
          <p>Hace click en cualquier elemento de la página para editarlo,<br>o usa los botones de la barra superior.</p>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('panelClose').addEventListener('click', closePanel);

    // 🔥 Soporte para tecla ENTER en el Panel Lateral (Búsqueda inteligente)
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.target.tagName === 'TEXTAREA') return;

        const buttons = [...panel.querySelectorAll('button')];
        const primaryBtn = 
          panel.querySelector('#saveSiteDataBtn') ||
          panel.querySelector('#addProductBtn') ||
          buttons.reverse().find(b => b.textContent.includes('Guardar') || b.textContent.includes('Aplicar')) ||
          panel.querySelector('.panel-btn-primary');

        if (primaryBtn) {
          e.preventDefault();
          primaryBtn.click();
        }
      }
    });
  }

  /* ────────────────────────────────────────────────────────
     TOAST
  ──────────────────────────────────────────────────────── */
  function buildToast() {
    const t = document.createElement('div');
    t.id = 'pixis-editor-toast';
    document.body.appendChild(t);
  }

  /* ────────────────────────────────────────────────────────
     BACKUPS SIDEBAR (PERMANENTE)
  ──────────────────────────────────────────────────────── */
  function buildBackupsSidebar() {
    const bar = document.createElement('div');
    bar.id = 'pixis-backups-sidebar';
    bar.innerHTML = `
      <div class="sidebar-header">
        <span>🛡️ Historial de Respaldos</span>
        <span class="sidebar-close" id="sidebarClose">&times;</span>
      </div>
      <div class="sidebar-content" id="pixis-backups-list">
        <div class="panel-empty-state"><p>Cargando historial...</p></div>
      </div>
      <div class="sidebar-footer">
        <div class="panel-section" style="margin:0">
          <input type="text" id="sidebarBackupName" class="panel-input" placeholder="Nombre del punto..." style="margin-bottom:8px">
          <button class="panel-btn-primary" id="btnSidebarCreate">Crear Punto de Control</button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);

    // 🔥 Soporte para tecla ENTER al crear Respaldos
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const input = document.getElementById('sidebarBackupName');
        const createBtn = document.getElementById('btnSidebarCreate');
        if (document.activeElement === input && createBtn) {
          e.preventDefault();
          createBtn.click();
        }
      }
    });
  }

  let toastTimer = null;

  function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('pixis-editor-toast');
    if (!toast) return;

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span> ${message}`;
    toast.className = `show ${type}`;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /* ────────────────────────────────────────────────────────
     PANEL HELPERS
  ──────────────────────────────────────────────────────── */
  function openPanel(title, htmlContent) {
    const panel = document.getElementById('pixis-side-panel');
    const titleEl = document.getElementById('panelTitle');
    const body = document.getElementById('panelBody');

    if (titleEl) titleEl.textContent = title;
    if (body) body.innerHTML = htmlContent;
    if (panel) panel.classList.add('open');
  }

  function closePanel() {
    const panel = document.getElementById('pixis-side-panel');
    if (panel) panel.classList.remove('open');
  }

  /* ────────────────────────────────────────────────────────
     MODAL SYSTEM
  ──────────────────────────────────────────────────────── */
  function openModal(title, bodyHTML, footerHTML = '') {
    // Remove existing
    const existing = document.getElementById('pixis-active-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pixis-active-modal';
    overlay.className = 'pixis-modal-overlay';
    overlay.innerHTML = `
      <div class="pixis-modal">
        <div class="pixis-modal-header">
          <h2 class="pixis-modal-title">${title}</h2>
          <button class="pixis-modal-close" id="pixisModalClose">✕</button>
        </div>
        <div class="pixis-modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="pixis-modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('open');
    });

    // Close triggers
    document.getElementById('pixisModalClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // 🔥 Soporte para tecla ENTER (Confirmar/Guardar automáticamente)
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.target.tagName === 'TEXTAREA') return;

        // Estrategia de búsqueda inteligente:
        // 1. Prioridad: Botones en el footer (son los oficiales del modal)
        // 2. Botones con ID específico de guardado
        // 3. Cualquier botón que diga "Guardar" o "Aplicar" (priorizamos el último encontrado)
        const buttons = [...overlay.querySelectorAll('button')];
        const primaryBtn = 
          overlay.querySelector('.pixis-modal-footer .panel-btn-primary') || 
          overlay.querySelector('.pixis-modal-footer .editor-btn-save') ||
          overlay.querySelector('#saveSiteDataBtn') ||
          overlay.querySelector('#applyCardBtn') ||
          buttons.reverse().find(b => b.textContent.includes('Guardar') || b.textContent.includes('Aplicar')) ||
          overlay.querySelector('.panel-btn-primary:last-of-type');

        if (primaryBtn) {
          e.preventDefault();
          primaryBtn.click();
        }
      }
    });

    return overlay;
  }

  function closeModal() {
    const modal = document.getElementById('pixis-active-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 200);
  }

  /* ────────────────────────────────────────────────────────
     UNSAVED INDICATOR
  ──────────────────────────────────────────────────────── */
  function markUnsaved() {
    const badge = document.getElementById('pixis-unsaved-badge');
    if (badge) badge.classList.add('visible');
  }

  function markSaved() {
    const badge = document.getElementById('pixis-unsaved-badge');
    if (badge) badge.classList.remove('visible');
  }

  /* ────────────────────────────────────────────────────────
     ELEMENT TOOLBAR POSITIONING
  ──────────────────────────────────────────────────────── */
  function positionToolbar(element) {
    const tb = document.getElementById('pixis-element-toolbar');
    if (!tb || !element) return;

    const rect = element.getBoundingClientRect();
    const tbH = 44;
    const margin = 8;

    let top = rect.top + window.scrollY - tbH - margin;
    let left = rect.left + window.scrollX;

    // Keep inside viewport
    if (top < 60) top = rect.bottom + window.scrollY + margin;
    if (left + 280 > window.innerWidth) left = window.innerWidth - 290;
    if (left < 8) left = 8;

    tb.style.top = `${top}px`;
    tb.style.left = `${left}px`;
    tb.classList.add('visible');
  }

  function hideToolbar() {
    const tb = document.getElementById('pixis-element-toolbar');
    if (tb) tb.classList.remove('visible');
  }

  /* ────────────────────────────────────────────────────────
     PUBLIC API
  ──────────────────────────────────────────────────────── */
  return {
    buildTopbar,
    buildElementToolbar,
    buildSidePanel,
    buildToast,
    showToast,
    openPanel,
    closePanel,
    openModal,
    closeModal,
    markUnsaved,
    markSaved,
    positionToolbar,
    hideToolbar,
    updateUndoButton(enabled) {
      const btn = document.getElementById('editorBtnUndo');
      if (btn) {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.4';
        btn.style.pointerEvents = enabled ? 'auto' : 'none';
      }
    },

    buildBackupsSidebar,
    toggleBackupsSidebar(force) {
      const sidebar = document.getElementById('pixis-backups-sidebar');
      if (!sidebar) return;
      if (force === true) sidebar.classList.add('active');
      else if (force === false) sidebar.classList.remove('active');
      else sidebar.classList.toggle('active');
    },
    updateBackupsSidebar(checkpoints, { onCreate, onRestore, onDelete, onDeleteMany }) {
      const listContainer = document.getElementById('pixis-backups-list');
      const createBtn = document.getElementById('btnSidebarCreate');

      if (!listContainer) return;

      if (checkpoints.length === 0) {
        listContainer.innerHTML = '<div class="panel-empty-state"><p>No hay respaldos guardados.</p></div>';
      } else {
        // Barra de selección múltiple
        listContainer.innerHTML = `
          <div class="backup-multiselect-bar" id="backupMultiselectBar" style="display:none;">
            <span id="backupSelectedCount">0 seleccionados</span>
            <button class="bi-btn delete-many" id="btnDeleteSelected">🗑️ Eliminar seleccionados</button>
          </div>
          ${checkpoints.map(cp => `
            <div class="backup-item" data-backup-id="${cp.id}">
              <label class="bi-checkbox-wrap" title="Seleccionar para eliminar">
                <input type="checkbox" class="bi-checkbox" data-id="${cp.id}">
              </label>
              <div class="bi-info">
                <div class="bi-name">${cp.name}</div>
                <div class="bi-date">${cp.timestamp}</div>
              </div>
              <div class="bi-actions">
                <button class="bi-btn restore" onclick="window._pixisRestore('${cp.id}')">🔄 Restaurar</button>
                <button class="bi-btn delete" onclick="window._pixisDeleteBackup('${cp.id}')">🗑️</button>
              </div>
            </div>
          `).join('')}
        `;

        // Lógica de checkboxes
        const bar = document.getElementById('backupMultiselectBar');
        const countEl = document.getElementById('backupSelectedCount');
        const deleteSelectedBtn = document.getElementById('btnDeleteSelected');

        listContainer.querySelectorAll('.bi-checkbox').forEach(chk => {
          chk.addEventListener('change', () => {
            const selected = listContainer.querySelectorAll('.bi-checkbox:checked');
            const n = selected.length;
            if (n > 0) {
              bar.style.display = 'flex';
              countEl.textContent = `${n} seleccionado${n > 1 ? 's' : ''}`;
            } else {
              bar.style.display = 'none';
            }
            // Marcar visualmente el item
            chk.closest('.backup-item').classList.toggle('selected', chk.checked);
          });
        });

        deleteSelectedBtn?.addEventListener('click', () => {
          const selected = [...listContainer.querySelectorAll('.bi-checkbox:checked')].map(c => Number(c.dataset.id));
          if (selected.length === 0) return;
          if (!confirm(`¿Eliminar ${selected.length} respaldo${selected.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
          onDeleteMany(selected);
        });
      }

      // Re-vincular callbacks globales
      window._pixisRestore = onRestore;
      window._pixisDeleteBackup = onDelete;

      if (createBtn && !createBtn.dataset.bound) {
        createBtn.addEventListener('click', () => {
          const input = document.getElementById('sidebarBackupName');
          const name = input.value.trim() || 'Punto manual';
          onCreate(name);
          input.value = '';
        });
        createBtn.dataset.bound = "true";
      }
    }
  };

})();
