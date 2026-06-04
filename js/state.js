function onPixisDOMReady(cb) {
  if (document.readyState !== 'loading') {
    cb();
  } else {
    document.addEventListener('DOMContentLoaded', cb);
  }
}

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   PIXIS STATE — js/state.js                                  ║
 * ║   Single Source of Truth: JSON → DOM                         ║
 * ║   TODO cambio pasa por PixisState.updateState()              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

window.PixisState = {
  state: {
    site: {},
    products: [],
    categories: [],
    ui: {}
  },
  history: [],
  maxHistory: 50,

  /* ─── OPTIMIZACIÓN DE IMÁGENES ───────────────────────────── */
  optimizeImageUrl(url, width) {
    const config = this.state.site?.imageOptimization;
    if (!config || !config.enabled) return url;
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;

    // EXCEPCIÓN: No optimizar banners ni imágenes del carrusel para mantener máxima nitidez
    const isBanner = url.toLowerCase().includes('carrusel') || 
                     url.toLowerCase().includes('banner') || 
                     url.toLowerCase().includes('img/des/');
    if (isBanner) return url;

    // Evitar optimizar en localhost o entornos locales (el proxy no puede acceder a estos archivos)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname.startsWith('192.168.')) {
      return url;
    }
    
    // Si ya está optimizada, no re-procesar
    if (url.includes('images.weserv.nl')) return url;

    // Asegurar que la URL sea absoluta para que el proxy pueda descargar la imagen
    let absoluteUrl = url;
    try {
      if (!url.startsWith('http') && !url.startsWith('//')) {
        absoluteUrl = new URL(url, window.location.origin + window.location.pathname).href;
      }
    } catch (e) {
      return url;
    }

    const proxy = config.proxyUrl || 'https://images.weserv.nl/?url=';
    let optUrl = `${proxy}${encodeURIComponent(absoluteUrl)}&output=webp`;
    if (width) optUrl += `&w=${width}`;
    return optUrl;
  },

  /* ─── CARGA ──────────────────────────────────────────────── */
  async loadState() {
    const nocache = { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } };
    const ts = Date.now();
    const [site, products, categories, ui] = await Promise.all([
      fetch('/data/site.json?_=' + ts, nocache).then(r => r.json()).catch(() => ({})),
      fetch('/data/products.json?_=' + ts, nocache).then(r => r.json()).catch(() => ([])),
      fetch('/data/categories.json?_=' + ts, nocache).then(r => r.json()).catch(() => ([])),
      fetch('/data/ui.json?_=' + ts, nocache).then(r => r.json()).catch(() => ({}))
    ]);
    this.state = { site, products, categories, ui };
    
    // Asegurar que existan las estructuras básicas
    if (!this.state.site.carouselTop) this.state.site.carouselTop = this.state.site.carousel || [];
    if (!this.state.site.carouselBottom) this.state.site.carouselBottom = [];
    
    console.log('[PixisState] Estado cargado ✓', {
      products: products.length,
      categories: categories.length,
      uiKeys: Object.keys(ui)
    });
  },

  /* ─── GUARDADO ATÓMICO ───────────────────────────────────── */
  async saveState() {
    // Incrementar cacheVersion para forzar recarga de scripts en navegadores
    if (this.state.site && typeof this.state.site.cacheVersion === 'number') {
      this.state.site.cacheVersion += 1;
    } else if (this.state.site) {
      this.state.site.cacheVersion = (this.state.site.cacheVersion || 0) + 1;
    }

    const files = [
      { name: 'site.json',       data: this.state.site       },
      { name: 'products.json',   data: this.state.products   },
      { name: 'categories.json', data: this.state.categories },
      { name: 'ui.json',         data: this.state.ui         }
    ];

    const results = await Promise.allSettled(
      files.map(({ name, data }) =>
        fetch(`/api/save-json?file=data/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data, null, 2)
        }).then(r => r.ok)
      )
    );

    const allOk = results.every(r => r.status === 'fulfilled' && r.value);
    if (!allOk) {
      console.warn('[PixisState] Algunos archivos no se guardaron en el servidor (modo sin servidor activo)');
    }
    return allOk;
  },


  /* ─── ACTUALIZACIÓN PRINCIPAL ────────────────────────────── */
  async updateState(change) {
    this.pushHistory();
    this.applyChange(change);
    const saved = await this.saveState();
    this.applyStateToDOM();
    return saved;
  },

  pushHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    if (this.history.length > this.maxHistory) this.history.shift();
    if (window.PixisOverlay?.updateUndoButton) window.PixisOverlay.updateUndoButton(true);
  },

  async undo() {
    if (this.history.length === 0) return false;
    const prevState = this.history.pop();
    
    // Actualizamos el contenido manteniendo la referencia para que PixisEditor.data no se desincronice
    this.state.site = prevState.site;
    this.state.products = prevState.products;
    this.state.categories = prevState.categories;
    this.state.ui = prevState.ui;

    this.applyStateToDOM();
    const saved = await this.saveState();
    if (window.PixisOverlay?.updateUndoButton) window.PixisOverlay.updateUndoButton(this.history.length > 0);
    return saved;
  },

  /* ─── APLICAR CAMBIO AL STATE ────────────────────────────── */
  applyChange({ type, path, value }) {
    if (!path || path.length === 0) {
      this.state[type] = value;
      return;
    }

    // Para arrays (products, categories): path[0] es el índice numérico
    let target = this.state[type];

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (target[key] === undefined || target[key] === null) {
        target[key] = (typeof path[i + 1] === 'number') ? [] : {};
      }
      target = target[key];
    }

    target[path[path.length - 1]] = value;
  },

  /* ─── PUNTOS DE RESTAURACIÓN ────────────────────────────── */
  async getCheckpoints() {
    try {
      const res = await fetch('/data/backups/manifest.json?_=' + Date.now());
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createCheckpoint(name = 'Punto de restauración') {
    const manifest = await this.getCheckpoints();
    const id = Date.now();
    const timestamp = new Date().toLocaleString();
    const fileName = `checkpoint_${id}.json`;

    const checkpointData = {
      id,
      name,
      timestamp,
      state: JSON.parse(JSON.stringify(this.state))
    };

    // Guardar archivo del punto
    const saveOk = await fetch(`/api/save-json?file=data/backups/${fileName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkpointData, null, 2)
    }).then(r => r.ok);

    if (!saveOk) return false;

    // Actualizar manifiesto
    manifest.unshift({ id, name, timestamp, fileName });
    await fetch(`/api/save-json?file=data/backups/manifest.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest, null, 2)
    });

    return true;
  },

  async restoreCheckpoint(id) {
    const manifest = await this.getCheckpoints();
    // Usamos == para permitir comparación entre string y number
    const entry = manifest.find(m => m.id == id);
    if (!entry) return false;

    try {
      const res = await fetch(`/data/backups/${entry.fileName}?_=` + Date.now());
      const checkpoint = await res.json();
      if (!checkpoint || !checkpoint.state) return false;

      // Guardamos el estado actual en el historial antes de restaurar por si queremos volver atrás
      this.pushHistory();

      // Aplicar estado manteniendo la referencia del objeto principal
      const newState = JSON.parse(JSON.stringify(checkpoint.state));
      this.state.site = newState.site;
      this.state.products = newState.products;
      this.state.categories = newState.categories;
      this.state.ui = newState.ui;

      this.applyStateToDOM();
      await this.saveState(); // Persistir a los archivos principales
      return true;
    } catch (e) {
      console.error('[PixisState] Error restaurando:', e);
      return false;
    }
  },

  async deleteCheckpoint(id) {
    let manifest = await this.getCheckpoints();
    const entry = manifest.find(m => m.id == id);
    if (!entry) return false;

    manifest = manifest.filter(m => m.id != id);
    
    // Actualizar manifiesto
    await fetch(`/api/save-json?file=data/backups/manifest.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest, null, 2)
    });

    // Nota: El archivo físico se queda en el disco a menos que el backend lo borre, 
    // pero ya no aparecerá en la UI.
    return true;
  },

  /* ─── APLICAR STATE AL DOM ───────────────────────────────── */
  applyStateToDOM() {
    const { ui, site } = this.state;

    // 1. Textos guardados
    if (ui.texts) {
      Object.entries(ui.texts).forEach(([dataId, data]) => {
        let el = document.querySelector(`[data-pixis-id="${dataId}"]`);
        if (!el) {
          try { el = document.querySelector(dataId); } catch(e) {}
        }
        if (el) {
          // Evitar sobrescribir elementos funcionales (como el botón de modo gamer)
          if (el.closest('.theme-toggle')) return;

          if (typeof data === 'object' && data !== null) {
            if (data.text !== undefined) el.textContent = data.text;
            if (data.html !== undefined) el.innerHTML = data.html;
            if (data.style) {
              Object.assign(el.style, data.style);
            }
          } else {
            el.textContent = data;
          }
        }
      });
    }

    // 2. Imágenes guardadas
    if (ui.images) {
      Object.entries(ui.images).forEach(([dataId, val]) => {
        let el = document.querySelector(`[data-pixis-id="${dataId}"]`);
        if (!el) {
          try { el = document.querySelector(dataId); } catch(e) {}
        }
        if (el && el.tagName === 'IMG') {
          const src = val.src || val;
          // No aplicar base64 (solo rutas reales o URLs externas)
          if (src && src.startsWith('data:')) return;

          el.src = window.optimizeImageUrl(src, el.offsetWidth || 800);
          if (val.alt) el.alt = val.alt;
          if (val.style) Object.assign(el.style, val.style);

          if (val.href) {
            let aParent = el.closest('a');
            if (!aParent) {
               aParent = document.createElement('a');
               el.parentNode.insertBefore(aParent, el);
               aParent.appendChild(el);
            }
            aParent.href = val.href;
            aParent.removeAttribute('onclick'); // Remover comportamientos viejos
          } else if (val.href === '') {
            let aParent = el.closest('a');
            if (aParent) aParent.removeAttribute('href');
          }
        }
      });
    }

    // 3. Cards (overrides de productos existentes en HTML)
    if (ui.cards) {
      // 3.a. Auto-asignar IDs a las tarjetas HTML que no lo tienen (igual que hace el editor)
      let count = 0;
      document.querySelectorAll('.card:not(.yt-card)').forEach((card) => {
        if (card.dataset.id || card.dataset.pixisId) return;

        const rawTitle = card.dataset.title
          || card.querySelector('h3')?.textContent?.trim()
          || card.querySelector('[data-title]')?.dataset.title
          || '';

        let slug = rawTitle
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48);

        if (!slug) slug = `card-${count}`;

        card.dataset.id = slug;
        card.dataset.pixisId = slug;
        count++;
      });

      // 3.b. Aplicar los datos a las tarjetas
      Object.entries(ui.cards).forEach(([cardId, data]) => {
        document.querySelectorAll(`.card[data-id="${cardId}"], [data-pixis-id="${cardId}"]`).forEach(card => {
          if (data.title !== undefined) {
            card.dataset.title = data.title;
            const h3 = card.querySelector('h3');
            if (h3) h3.textContent = data.title;
          }
          if (data.price !== undefined) {
            card.dataset.price = data.price;
          }
          if (data.priceNum !== undefined) {
            const btn = card.querySelector('.btn-add-cart');
            if (btn) btn.dataset.price = data.priceNum;
          }
          if (data.priceLocal !== undefined || data.cashPrice !== undefined) {
            const val = data.priceLocal || data.cashPrice;
            const btn = card.querySelector('.btn-add-cart');
            if (btn) { btn.dataset.priceLocal = val; btn.dataset.priceOnline = val; }
            card.dataset.cashPrice = val;
          }
          
          // Actualización visual del precio (Prioridad Precio Especial)
          const finalVisiblePrice = data.cashPrice || data.priceLocal || (data.priceNum ? data.priceNum : (data.price ? data.price.replace(/[$. ]/g, '') : null));
          if (finalVisiblePrice) {
            const formatted = `$${Number(finalVisiblePrice).toLocaleString()}`;
            const sp = card.querySelector('.precio');
            if (sp) {
              sp.textContent = formatted;
              // Asegurar que tenga el label de PRECIO ESPECIAL si no lo tiene
              if (!card.querySelector('.precio-label')) {
                const label = document.createElement('span');
                label.textContent = 'PRECIO ESPECIAL';
                label.className = 'precio-label';
                sp.before(label);
                if (sp.parentElement && !sp.parentElement.classList.contains('precio-box')) {
                  sp.parentElement.classList.add('precio-box');
                }
              }
            }
          }
          if (data.img !== undefined && data.img) {
            card.dataset.img = data.img;
            const im = card.querySelector('img:not(.fly-product)');
            if (im) im.src = window.optimizeImageUrl(data.img, im.offsetWidth || 400);
          }
          if (data.desc !== undefined) card.dataset.desc = data.desc;
          if (data.banners !== undefined) card.dataset.banners = JSON.stringify(data.banners);
          if (data.category !== undefined) card.dataset.category = data.category;
          if (data.category2 !== undefined) card.dataset.category2 = data.category2;
          if (data.category3 !== undefined) card.dataset.category3 = data.category3;

          // cashPrice ya se manejó arriba en la lógica unificada de precio visual
          if (data.cashPrice !== undefined) {
            card.dataset.cashPrice = data.cashPrice;
          }

          // Stock
          if (data.inStock === false) {
            card.classList.add('sin-stock');
          } else if (data.inStock === true) {
            card.classList.remove('sin-stock');
          }

          // Próximo Ingreso
          if (data.proximoIngreso === true) {
            card.classList.add('proximo-ingreso');
            card.dataset.proximoIngreso = 'true';
            if (!card.querySelector('.card-badge-proximamente')) {
              const badge = document.createElement('span');
              badge.className = 'card-badge-proximamente';
              badge.textContent = 'PRÓXIMAMENTE';
              
              const title = document.createElement('div');
              title.className = 'card-gold-promo-title';
              title.textContent = '¡COMPRA EL TUYO AHORA!';
              
              const subtitle = document.createElement('div');
              subtitle.className = 'card-gold-promo-subtitle';
              subtitle.textContent = 'Sé de los primeros en tenerlo';
              
              card.prepend(subtitle);
              card.prepend(title);
              card.prepend(badge);

              const addBtn = card.querySelector('.btn-add-cart');
              if (addBtn && !addBtn.textContent.includes('🛒')) {
                addBtn.textContent = '🛒 AGREGAR AL CARRITO';
              }
            }
          } else if (data.proximoIngreso === false) {
            card.classList.remove('proximo-ingreso');
            card.dataset.proximoIngreso = 'false';
            card.querySelector('.card-badge-proximamente')?.remove();
            card.querySelector('.card-gold-promo-title')?.remove();
            card.querySelector('.card-gold-promo-subtitle')?.remove();

            const addBtn = card.querySelector('.btn-add-cart');
            if (addBtn && addBtn.textContent.includes('🛒')) {
              addBtn.textContent = 'Agregar al carrito';
            }
          }

          // Botones personalizados
          if (data.customButtons) {
            card.dataset.customButtons = JSON.stringify(data.customButtons);
            // Ya no los inyectamos en la card (irían al modal)
            card.querySelectorAll('.btn-custom-pixis').forEach(b => b.remove());
          }
        });
      });
    }


    // 4. Secciones
    if (ui.sections) {
      Object.entries(ui.sections).forEach(([id, styles]) => {
        const sec = document.getElementById(id) || document.querySelector(`[data-pixis-id="${id}"]`);
        if (!sec) return;
        if (styles.paddingTop)       sec.style.paddingTop       = styles.paddingTop;
        if (styles.paddingBottom)    sec.style.paddingBottom    = styles.paddingBottom;
        if (styles.backgroundColor)  sec.style.backgroundColor  = styles.backgroundColor;
        if (styles.display !== undefined) sec.style.display     = styles.display;
      });
    }

    // 5. Datos del sitio
    if (site.topBannerText) {
      const banner = document.querySelector('.header-top-text span');
      if (banner) banner.textContent = site.topBannerText;
    }
    if (site.address) {
      const addr = document.querySelector('.ubicacion small');
      if (addr) addr.textContent = site.address;
    }
    
    // Redes Sociales y Links
    if (site.instagram) {
      document.querySelectorAll('.red.instagram').forEach(el => el.href = site.instagram);
    }
    if (site.facebook) {
      document.querySelectorAll('.red.facebook').forEach(el => el.href = site.facebook);
    }
    if (site.tiktok) {
      document.querySelectorAll('.red.tiktok').forEach(el => el.href = site.tiktok);
    }
    if (site.youtube) {
      document.querySelectorAll('.red.Youtube, .red.youtube').forEach(el => el.href = site.youtube);
    }
    if (site.whatsappLink) {
      // Actualiza todos los href que apuntan a wa.me o son de contacto directo
      document.querySelectorAll('a[href*="wa.me"], a.btn-wsp').forEach(el => {
        // Evita pisar enlaces si tienen customButtons, solo los genéricos
        if(!el.classList.contains('btn-custom-pixis')) el.href = site.whatsappLink;
      });
    }

    // Botón principal de aplicar cambios
    const applyBtn = document.querySelector('.btn-apply-state');
    if (applyBtn) {
       // Si ya tiene el tooltip lo ignoramos, si no lo agregamos
       if (!applyBtn.querySelector('.apply-legend')) {
          const legend = document.createElement('div');
          legend.className = 'apply-legend';
          legend.style.cssText = 'position:absolute; bottom:-12px; right:0; font-size:9px; color:#aaa; width:max-content; pointer-events:none; opacity:0.7;';
          legend.innerHTML = 'Presiona aquí para subir todos tus cambios a la web pública.';
          applyBtn.style.position = 'relative';
          applyBtn.appendChild(legend);
       }
    }

    // 5. Banners Promocionales Dinámicos
    if (site.banners) {
      window._bannerData = { ...window._bannerData, ...site.banners };
    }

    // 5b. Carrusel Dinámico (Fase B: Inyección)
    let hasDynamicCarousel = false;
    // Carrusel Superior
    if (site.carouselTop && site.carouselTop.length > 0) {
      renderDynamicCarousel(site.carouselTop, '.banner-carousel');
      hasDynamicCarousel = true;
    }
    // Carrusel Inferior
    if (site.carouselBottom && site.carouselBottom.length > 0) {
      renderDynamicCarousel(site.carouselBottom, '.nuevos-ingresos .banner-carousel');
      hasDynamicCarousel = true;
    }

    // Re-inicializar lógica de movimiento una sola vez al final
    if (hasDynamicCarousel && window.initPixisBanners) {
      window.initPixisBanners();
    }

    // 5c. Menú Lateral de Categorías (Dinámico y con auto-ocultado)
    if (this.state.categories && this.state.categories.length > 0) {
      const menuLista = document.querySelector('.categorias-lista');
      if (menuLista) {
        let htmlMenu = '';
        const isEditor = window.location.search.includes('edit=true');

        // Mapeo de iconos Line-Art
        const iconMap = {
          'Notebook': '<i class="fas fa-laptop"></i>',
          'Placas de video': '<i class="fas fa-microchip"></i>',
          'Procesadores': '<i class="fas fa-cpu"></i>',
          'gabinetes': '<i class="fas fa-desktop"></i>',
          'monitores': '<i class="fas fa-tv"></i>',
          'fuentes': '<i class="fas fa-bolt"></i>',
          'red': '<i class="fas fa-wifi"></i>',
          'Memorias Ram': '<i class="fas fa-memory"></i>',
          'Camara de Seguridad': '<i class="fas fa-camera"></i>',
          'Cargadores': '<i class="fas fa-plug"></i>',
          'Periféricos': '<i class="fas fa-keyboard"></i>',
          'Placas madres': '<i class="fas fa-hard-drive"></i>',
          'Herramientas': '<i class="fas fa-tools"></i>',
          'almacenamiento': '<i class="fas fa-database"></i>',
          'refrigeracion': '<i class="fas fa-fan"></i>',
          'Cables': '<i class="fas fa-link"></i>',
          'Sillas y Escritorios Gamer': '<i class="fas fa-chair"></i>'
        };


        // Agregar las categorías dinámicas
        this.state.categories.forEach(cat => {
          if (cat.id !== 'destacados' && cat.id !== 'nuevos' && cat.active !== false) {
            let iconHtml = '';
            const mobileIcon = cat.icon || '📁';
            
            // Prioridad para DESKTOP: 1. PNG Custom, 2. Icono mapeado, 3. Emoji original
            if (cat.customIcon) {
              const iconVersion = window.PIXIS_VERSION || Date.now();
              const iconUrl = cat.customIcon.includes('?') ? `${cat.customIcon}&v=${iconVersion}` : `${cat.customIcon}?v=${iconVersion}`;
              iconHtml = `<img src="${iconUrl}" class="cat-icon-img" alt="${cat.name}">`;
            } else if (iconMap[cat.id]) {
              iconHtml = iconMap[cat.id];
            } else {
              iconHtml = mobileIcon;
            }

            htmlMenu += `
              <a href="#${escStateHtml(cat.id)}" onclick="if(!(event.button===1 || event.ctrlKey || event.metaKey)){ event.preventDefault(); if(window.abrirCategoria) window.abrirCategoria('${escStateHtml(cat.id)}'); }">
                <span class="cat-icon-mobile">${mobileIcon}</span>
                <div class="cat-icon-frame">${iconHtml}</div>
                <span class="cat-name">${escStateHtml(cat.name)}</span>
                ${isEditor ? `<button class="pixis-edit-cat-btn" onclick="event.stopPropagation(); window.PixisEditorAPI.editCategoryIcon('${escStateHtml(cat.id)}')">✏️</button>` : ''}
              </a>`;
          }
        });

        
        menuLista.innerHTML = htmlMenu;

        // Sincronizar resaltado después de renderizar dinámicamente
        if (typeof window.actualizarEnlaceActivo === 'function') window.actualizarEnlaceActivo();
      }
    }


    // 6. Elementos eliminados
    if (ui.deleted && ui.deleted.length > 0) {
      ui.deleted.forEach(id => {
        const el = document.querySelector(`[data-pixis-id="${id}"]`);
        if (el) el.remove();
      });
    }

    // 8. Productos del JSON (cards dinámicas inyectadas)
    if (this.state.products && this.state.products.length > 0) {
      renderDynamicProducts(this.state.products);
    }

    // 9. Re-inicializar carruseles y banners para asegurar que los botones funcionen
    if (window.initPixisCarousels) window.initPixisCarousels();
    if (window.initPixisBanners) window.initPixisBanners();

    // 10. Notificar que el estado está listo
    document.dispatchEvent(new CustomEvent('pixis:state-ready'));
  }
};

window.optimizeImageUrl = (url, width) => window.PixisState.optimizeImageUrl(url, width);

/* ─── HELPER: renderizar carrusel dinámico ─────────────────── */
function renderDynamicCarousel(slides, carouselSelector) {
  const carousel = document.querySelector(carouselSelector);
  if (!carousel) return;

  const container = carousel.closest('.banner-carousel-outer') || carousel;
  const track = carousel.querySelector('.banner-track');
  const dotsContainer = container.querySelector('.banner-dots');
  if (!track) return;

  const html = slides.map(s => `
    <a href="?banner=${escStateHtml(s.bannerId)}" class="banner-slide dynamic-slide" style="cursor: pointer;" 
       onclick="if(!(event.button===1 || event.ctrlKey || event.metaKey)){ event.preventDefault(); window.abrirBannerLink('${escStateHtml(s.bannerId)}'); }">
      <picture>
        ${s.imgMobile ? `<source media="(max-width: 768px)" srcset="${window.optimizeImageUrl(s.imgMobile, 768)}">` : ''}
        <img src="${window.optimizeImageUrl(s.imgPc || s.imgMobile, 1200)}" alt="Promo">
      </picture>
    </a>
  `).join('');

  // Limpiar previos dinámicos
  track.querySelectorAll('.dynamic-slide').forEach(el => el.remove());
  
  // En Fase B, los ponemos ANTES de los estáticos
  track.insertAdjacentHTML('afterbegin', html);
  
  // Limpiar dots para que se regeneren en initPixisBanners
  if (dotsContainer) dotsContainer.innerHTML = '';

  // IMPORTANTE: Resetear el estado de inicialización para que initPixisBanners pueda re-vincular los eventos
  delete carousel.dataset.init;
}

/* ─── HELPER: renderizar productos del JSON (no los del HTML) ── */
function renderDynamicProducts(products) {
  const container = document.getElementById('dynamic-catalog-container');
  if (!container) return;

  // 1. Asegurar que el contenedor dinámico esté DENTRO del catálogo completo
  const catalogoCompleto = document.querySelector('#catalogo-completo .Gabinetes');
  if (catalogoCompleto && container.parentNode !== catalogoCompleto) {
      catalogoCompleto.appendChild(container);
  }

  // 2. Limpiar productos dinámicos anteriores
  container.innerHTML = '';
  // 1. Construir un Set de IDs de categorías válidas actualmente activas
  const activeCatIds = new Set(
    (window.PixisState && window.PixisState.state.categories)
      ? window.PixisState.state.categories
          .filter(c => c.active !== false)
          .map(c => c.id)
      : []
  );

  const generateSlug = (text) => {
    return text.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // 2. Limpiar tarjetas dinámicas anteriores
  document.querySelectorAll('.card.dynamic-injected').forEach(el => el.remove());

  // 2b. Limpiar los carruseles especiales si existen
  const destacadosTrack = document.getElementById('destacadosTrack');
  if (destacadosTrack) destacadosTrack.innerHTML = '';
  
  const nuevosIngresosTrack = document.getElementById('nuevosIngresosTrack');
  if (nuevosIngresosTrack) nuevosIngresosTrack.innerHTML = '';

  // 2c. Limpiar todos los contenedores de productos existentes en el HTML (Migración JSON)
  // Esto asegura que no queden tarjetas estáticas duplicadas, pero PROTEGEMOS las secciones de Reels y Videos.
  document.querySelectorAll('.productos').forEach(p => {
      const isDynamicContainer = p.id === 'dynamic-catalog-container';
      const isSpecialSection = p.closest('.reels-section') || p.closest('.videos-section');

      if (!isDynamicContainer && !isSpecialSection) {
          p.innerHTML = '';
      }
  });

  // 3. PRE-CREAR CONTENEDORES PARA TODAS LAS CATEGORÍAS ACTIVAS
  // Asegura que cada opción del Menú de Productos tenga su propio lugar físico.
  if (container) {
    activeCatIds.forEach(catId => {
      // 1. Ver si ya existe en el HTML estático (Case-Insensitive)
      let targetH3 = null;
      const allH3 = document.querySelectorAll('h3.categoria');
      for (const h3 of allH3) {
        if (h3.id.toLowerCase() === catId.toLowerCase()) {
          targetH3 = h3;
          break;
        }
      }

      // 2. Si no existe, lo creamos en el contenedor dinámico
      if (!targetH3 && !container.querySelector(`.dynamic-cat-wrapper[data-cat="${catId}"]`)) {
        const newCatWrapper = document.createElement('div');
        newCatWrapper.className = 'dynamic-cat-wrapper Gabinetes';
        newCatWrapper.dataset.cat = catId;
        
        let catName = catId.toUpperCase();
        const found = (window.PixisState && window.PixisState.state.categories)
          ? window.PixisState.state.categories.find(c => c.id === catId)
          : null;
        if (found) catName = found.name.toUpperCase();

        newCatWrapper.innerHTML = `
          <h3 id="${catId}" class="categoria pulsante">${catName}</h3>
          <div class="categoria-ui">
            <div class="filtros-panel">
              <span class="filtro-titulo">Ordenar por:</span>
              <label class="switch-precio">
                <input type="checkbox" class="toggle-precio">
                <span class="slider"></span>
                <span class="switch-text">Precio menor a mayor</span>
              </label>
              <div class="filtros-categoria"></div>
            </div>
          </div>
          <div class="productos"></div>
          <br><br>
        `;
        container.appendChild(newCatWrapper);
      }
    });
  }

  // 4. INYECTAR PRODUCTOS
  products.forEach(prod => {
    const assignedCats = [];
    if (prod.category) assignedCats.push(prod.category.trim());
    if (prod.category2) assignedCats.push(prod.category2.trim());
    if (prod.category3) assignedCats.push(prod.category3.trim());

    const validCats = [...new Set(assignedCats)].filter(catId => {
      return catId && (activeCatIds.size === 0 || activeCatIds.has(catId));
    });

    if (validCats.length === 0) return;

    const slug = generateSlug(prod.title || 'producto');
    const displayPrice = prod.priceLocal || prod.price || 0;
    const priceFormatted = `$${Number(displayPrice).toLocaleString()}`;
    const transferPriceFormatted = `$${Number(prod.price || 0).toLocaleString()}`;
    // Imagen de portada: siempre el campo img (una sola)
    const coverImg = (prod.img || '').trim().split(',')[0].trim();
    // Galería: usamos prod.gallery (todas las imágenes), o prod.img si contiene varias separadas por coma
    const galleryStr = (prod.gallery || prod.img || '').trim();

    validCats.forEach(catId => {
      const card = document.createElement('a');
      
      const isProximo = prod.proximoIngreso === true;
      card.className = `card pulsante2 dynamic-injected${isProximo ? ' proximo-ingreso' : ''}`;
      card.href = `?producto=${slug}`;
      
      card.dataset.title        = prod.title   || '';
      card.dataset.price        = transferPriceFormatted;
      card.dataset.img          = coverImg;
      card.dataset.category     = catId;
      // Siempre asignar gallery (aunque sea una sola imagen) para que cart.js la use
      if (galleryStr) card.dataset.gallery = galleryStr;
      card.dataset.desc         = prod.desc    || '';
      card.dataset.subcategoria = prod.subcategoria || '';
      card.dataset.pixisId      = prod.id;
      card.dataset.proximoIngreso = isProximo ? 'true' : 'false';
      if (prod.customButtons) card.dataset.customButtons = JSON.stringify(prod.customButtons);
      if (prod.banners) card.dataset.banners = JSON.stringify(prod.banners);
      if (prod.inStock === false) card.classList.add('sin-stock');

      card.innerHTML = `
        ${isProximo ? `
          <span class="card-badge-proximamente">PRÓXIMAMENTE</span>
          <div class="card-gold-promo-title">¡COMPRA EL TUYO AHORA!</div>
          <div class="card-gold-promo-subtitle">Sé de los primeros en tenerlo</div>
        ` : ''}
        <img src="${window.optimizeImageUrl(coverImg, 400)}" alt="${escStateHtml(prod.title)}">
        <h3>${escStateHtml(prod.title)}</h3>
        <p>${escStateHtml(prod.subcategoria || '')}</p>
        <div class="precio-box">
          <span class="precio-label">PRECIO ESPECIAL</span>
          <span class="precio">${priceFormatted}</span>
        </div>
        <button class="btn-add-cart"
                data-name="${escStateHtml(prod.title)}"
                data-price="${prod.price}"
                data-price-local="${prod.priceLocal || prod.price}">
          ${isProximo ? '🛒 AGREGAR AL CARRITO' : 'Agregar al carrito'}
        </button>
        <a href="${(window.PixisState?.state?.site?.whatsappLink) || 'https://wa.me/message/EYUUSVNG5HPNF1'}" class="btn-wsp">Consultar</a>
      `;

      let targetSection = null;

      if (catId === 'destacados') targetSection = document.getElementById('destacadosTrack');
      else if (catId === 'nuevos') targetSection = document.getElementById('nuevosIngresosTrack');

      if (!targetSection) {
        const catH3 = document.getElementById(catId);
        if (catH3) {
          let nextEl = catH3.nextElementSibling;
          while (nextEl && !nextEl.matches('h3.categoria, h2')) {
            if (nextEl.classList.contains('productos')) {
              targetSection = nextEl;
              break;
            }
            nextEl = nextEl.nextElementSibling;
          }
        }
      }

      if (targetSection) {
        targetSection.appendChild(card);
      }
    });
  });

  // 3. Sincronizar el orden original para el sistema de filtrado/ordenado
  // Esto evita que al desactivar el "Ordenar por precio" los productos dinámicos desaparezcan
  document.querySelectorAll('.productos').forEach(p => {
    p.dataset.originalOrder = p.innerHTML;
  });

  // PASO 1: Generar filtros dinámicos desde las subcategorías reales del JSON
  generarFiltrosDinamicos();

  // PASO 3: Notificar a cart.js que los productos fueron renderizados
  document.dispatchEvent(new CustomEvent('pixis:productos-renderizados'));
  window._productosListos = true; // 🚩 Bandera de seguridad para Deep Linking
}

/* ─── HELPER: generar filtros dinámicos desde subcategorías reales ── */
function generarFiltrosDinamicos() {

  // 1. Procesar secciones estáticas del HTML (con h3 ya existentes)
  document.querySelectorAll('#catalogo-completo h3.categoria').forEach(h3 => {
    const catId = h3.id;
    if (!catId) return;

    let filtrosCat = null;
    let productosEl = null;
    let nextEl = h3.nextElementSibling;

    while (nextEl && !nextEl.matches('h3.categoria, h2')) {
      if (!filtrosCat) {
        const fc = nextEl.querySelector('.filtros-categoria[data-static-placeholder]');
        if (fc) filtrosCat = fc;
      }
      if (!productosEl && nextEl.classList.contains('productos')) {
        productosEl = nextEl;
      }
      nextEl = nextEl.nextElementSibling;
    }

    if (!filtrosCat || !productosEl) return;

    // Recopilar subcategorías únicas de las cards inyectadas
    const subcats = new Set();
    productosEl.querySelectorAll('.card').forEach(card => {
      const sub = (card.dataset.subcategoria || '').trim();
      if (sub) subcats.add(sub);
    });

    // Generar botones: Todos + uno por subcategoría
    let html = '<button class="btn-filtro activo" data-filter="all">Todos</button>';
    subcats.forEach(sub => {
      html += `<button class="btn-filtro" data-filter="${escStateHtml(sub)}">${escStateHtml(sub)}</button>`;
    });

    filtrosCat.innerHTML = html;
    filtrosCat.dataset.dynamicGenerated = 'true'; // marcar como generado dinámicamente
  });

  // 2. Procesar secciones dinámicas creadas por renderDynamicProducts (sin h3 estático)
  document.querySelectorAll('.dynamic-cat-wrapper').forEach(wrapper => {
    const catId = wrapper.dataset.cat;
    if (!catId) return;

    const productosEl = wrapper.querySelector('.productos');
    if (!productosEl) return;

    // Crear panel de filtros si no existe
    let categoriaUI = wrapper.querySelector('.categoria-ui');
    if (!categoriaUI) {
      categoriaUI = document.createElement('div');
      categoriaUI.className = 'categoria-ui';
      categoriaUI.innerHTML = `
        <div class="filtros-panel">
          <span class="filtro-titulo">Ordenar por:</span>
          <label class="switch-precio">
            <input type="checkbox" class="toggle-precio">
            <span class="slider"></span>
            <span class="switch-text">Precio menor a mayor</span>
          </label>
          <div class="filtros-categoria"></div>
        </div>`;
      productosEl.before(categoriaUI);
    }

    const filtrosCat = categoriaUI.querySelector('.filtros-categoria');
    if (!filtrosCat) return;

    const subcats = new Set();
    productosEl.querySelectorAll('.card').forEach(card => {
      const sub = (card.dataset.subcategoria || '').trim();
      if (sub) subcats.add(sub);
    });

    let html = '<button class="btn-filtro activo" data-filter="all">Todos</button>';
    subcats.forEach(sub => {
      html += `<button class="btn-filtro" data-filter="${escStateHtml(sub)}">${escStateHtml(sub)}</button>`;
    });
    filtrosCat.innerHTML = html;
  });
}

/* ─── HELPER: botones personalizados ──────────────────────── */
function applyCustomButtons(card, buttons) {
  // Solo guardamos en dataset para que cart.js lo use en el modal
  if (buttons) {
    card.dataset.customButtons = JSON.stringify(buttons);
  }
  // Limpiar si existieran en el DOM de la card
  card.querySelectorAll('.btn-custom-pixis').forEach(b => b.remove());
}

/* ─── HELPER: escape HTML ──────────────────────────────────── */
function escStateHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── INIT AUTOMÁTICO (solo en modo público, no editor) ──────── */
window.addEventListener('load', async () => {
  // Si el editor está activo, él gestiona la carga y aplicación del estado
  if (window.location.search.includes('edit=true')) return;
  await window.PixisState.loadState();
  window.PixisState.applyStateToDOM();
});
