function onPixisDOMReady(cb) {
  if (document.readyState !== 'loading') {
    cb();
  } else {
    document.addEventListener('DOMContentLoaded', cb);
  }
}

/* =========================
   CACHE BUSTER AUTOMÁTICO
   Genera un sufijo de fecha diario (&_t=YYYYMMDD) para que
   WhatsApp y Facebook re-scrapen el link cada día sin necesidad
   de agregar manualmente &=V3 u otros versioning manuales.
========================= */
function getCacheBuster() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return '_t=' + yyyy + mm + dd;
}

document.querySelectorAll('.productos').forEach(productos => {
  productos.dataset.originalOrder = [...productos.children]
    .map(card => card.outerHTML)
    .join('');
});
/* TRUE = oculta precios de esa categoría */
const OCULTAR_PRECIOS_CATEGORIA = {
  "Periféricos": false,
  "almacenamiento": false,
  "gabinetes": false,
  "fuentes": false,
  "refrigeración": false,
  "monitores": false,
  "Placas de video": false,
  "red": false,
  "Cables": false,
  "Hardware": false,
  "Placas madres": false,
  "Memorias Ram": false,
  "Procesadores": false,
  "Sillas y Escritorios Gamer": false,
  "Herramientas": false,
  "Cargadores": false,
  "Notebook": false,
  "Camara de Seguridad": false
};


/* =========================
   CONFIG
========================= */
const MODAL_ENABLED = true;

/* =========================
   CONFIGURACIÓN GLOBAL
========================= */

// 🔧 Controlable desde data/site.json (campo "soloSantiago") — sin tocar código
// true = solo Santiago del Estero | false = todo el país
let SOLO_SANTIAGO = true; // default, se actualiza desde site.json al cargar el estado

function obtenerNumeroPresupuesto() {
  let numero = localStorage.getItem("pixis_presupuesto");
  if (!numero) {
    numero = 1;
  } else {
    numero = parseInt(numero) + 1;
  }
  localStorage.setItem("pixis_presupuesto", numero);
  return numero.toString().padStart(6, "0");
}

/* =========================
   HELPERS GLOBALES DE NAVEGACIÓN
========================= */
window.openProductBySlug = function(slug, fromHistory = false) {
    if (!slug) return false;
    const cards = document.querySelectorAll('.card');
    if (cards.length === 0) {
        console.warn("Pixis: No hay tarjetas en el DOM aún para buscar el slug:", slug);
        return false;
    }

    const normalizeSlug = (text) => {
        return text.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const openCard = (card) => {
        if (typeof window.openProductModal === 'function') {
            window.openProductModal(card, !fromHistory);
        } else {
            card.click();
        }
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    // PASO 1: Buscar por ID exacto (prioritario — funciona con share.php)
    for (const card of cards) {
        if (card.dataset.pixisId && card.dataset.pixisId === slug) {
            console.log("Pixis: Producto encontrado por ID, abriendo modal...");
            openCard(card);
            return true;
        }
    }

    // PASO 2: Fallback — buscar por slug generado del título (compatibilidad links antiguos)
    for (const card of cards) {
        const title = card.dataset.title;
        if (title && normalizeSlug(title) === normalizeSlug(slug)) {
            console.log("Pixis: Producto encontrado por slug de título, abriendo modal...");
            openCard(card);
            return true;
        }
    }

    console.warn("Pixis: No se encontró ningún producto con el ID/slug:", slug);
    return false;
};
/* =========================
   CARRITO
========================= */
const cartItems = document.querySelector('.cart-items');
const cartTotal = document.querySelector('.cart-total strong');
const cartCount = document.querySelector('.cart-count');
const btnFinish = document.querySelector('.btn-finish');
const btnClear = document.getElementById('btn-clear-cart');
const btnAbrirTerminos = document.getElementById("btnAbrirTerminos");
const modalTerminos = document.getElementById("modalTerminos");
const cerrarTerminos = document.getElementById("cerrarTerminos");
const aceptaTerminos = document.getElementById("aceptaTerminos");
const modalEfectivo = document.getElementById("modalDescuentoEfectivo");
const cerrarModalEfectivo = document.querySelector(".cerrar-modal-efectivo");


cerrarModalEfectivo?.addEventListener("click", () => {
  modalEfectivo.classList.remove("active");
});
/* abrir */

btnAbrirTerminos?.addEventListener("click", () => {
  modalTerminos.classList.add("active");
});

/* cerrar */

cerrarTerminos?.addEventListener("click", () => {
  modalTerminos.classList.remove("active");
});

modalTerminos?.addEventListener("click", (e) => {
  if (e.target === modalTerminos) {
    modalTerminos.classList.remove("active");
  }
});
/* =========================
   PERSISTENCIA DEL CARRITO
========================= */
function saveCart() {
  try {
    localStorage.setItem('pixis_cart', JSON.stringify(cart));
  } catch (e) { /* silenciar errores de Storage lleno */ }
}

function loadCart() {
  try {
    const saved = localStorage.getItem('pixis_cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* JSON inválido, empezar vacío */ }
  return [];
}

let cart = loadCart();
/* =========================
   COPIAR ALIAS / CBU
========================= */

document.addEventListener("click", (e) => {

  const btn = e.target.closest(".btn-copiar");
  if (!btn) return;

  const texto = btn.dataset.copy;

  navigator.clipboard.writeText(texto);

  btn.textContent = "Copiado ✓";

  setTimeout(() => {
    btn.textContent = btn.dataset.copy.length > 15 ? "Copiar CBU" : "Copiar Alias";
  }, 1500);

});
/* =========================
   ANIMACION AGREGAR CARRITO
========================= */

function animarAgregarCarrito(imgSrc, startElement) {

  const cartIcon = document.querySelector(".cart-icon");
  if (!cartIcon) return;

  const img = document.createElement("img");
  img.src = imgSrc;
  img.className = "fly-product";

  const rectStart = startElement.getBoundingClientRect();
  const rectCart = cartIcon.getBoundingClientRect();

  img.style.left = rectStart.left + "px";
  img.style.top = rectStart.top + "px";

  document.body.appendChild(img);

  requestAnimationFrame(() => {
    img.style.left = rectCart.left + "px";
    img.style.top = rectCart.top + "px";
    img.style.width = "20px";
    img.style.height = "20px";
    img.style.opacity = "0.5";
  });

  setTimeout(() => {

    img.remove();

    cartIcon.classList.add("shake");

    const count = document.querySelector(".cart-count");
    count?.classList.add("bump");

    setTimeout(() => {
      cartIcon.classList.remove("shake");
      count?.classList.remove("bump");
    }, 400);

  }, 700);
}
const selectCuotas = document.getElementById('selectCuotas');
const cuotasPreviewCarrito = document.getElementById('cuotasPreviewCarrito');

/* =========================
   TASAS CUOTAS
========================= */
let tasasCuotas = {
  1: 1.13,
  3: 1.31,
  6: 1.31,
  9: 1.60,
  12: 1.60
};

document.addEventListener('pixis:state-ready', () => {
  if (window.PixisState?.state?.site?.tasasCuotas) {
    const vals = window.PixisState.state.site.tasasCuotas;
    if (Array.isArray(vals) && vals.length === 5) {
      tasasCuotas = {
        1: vals[0],
        3: vals[1],
        6: vals[2],
        9: vals[3],
        12: vals[4]
      };
    } else {
      tasasCuotas = vals;
    }
    console.log('[PixisCart] Tasas de cuotas actualizadas:', tasasCuotas);
    // Re-renderizar si el carrito está abierto o el modal
    if (typeof renderCart === 'function') renderCart();
  }
});

function calcularTotalConCuotas(totalBase) {

  const infoCuotas = document.querySelector(".cart-cuotas-info");

  if (!selectCuotas || selectCuotas.value === "0" || !pagoTarjeta.checked) {

    if (cuotasPreviewCarrito) cuotasPreviewCarrito.innerHTML = "";
    if (infoCuotas) infoCuotas.innerHTML = "";

    return totalBase;
  }

  const cuotas = parseInt(selectCuotas.value);
  const tasa = tasasCuotas[cuotas];
  if (!tasa) return totalBase;

  const totalConInteres = totalBase * tasa;
  const valorCuota = totalConInteres / cuotas;

  cuotasPreviewCarrito.innerHTML = `
    <div class="cuota-item-carrito">
      <span>${cuotas} cuotas</span>
      <strong>$${Math.round(valorCuota).toLocaleString()}</strong>
    </div>`;

  // 🔥 MENSAJE DEBAJO DEL TOTAL
  if (infoCuotas) {
    infoCuotas.innerHTML = `
      <div class="cart-cuotas-mensaje">
        Pagás ${cuotas} cuotas de 
        <strong>$${Math.round(valorCuota).toLocaleString()}</strong><br>
        <small>
          El pago se concretará dentro de nuestros horarios de atención 🕒 Horarios:
Lunes a viernes de 09:00 a 12:30 hs y de 13:30 a 21:30 hs.
Sábados de 09:00 a 13:00 hs.
        </small>
      </div>
    `;
  }

  return totalConInteres;
}

/* =========================
   OPCIONES ENTREGA / PAGO
========================= */
const retiroLocal = document.getElementById('retiroLocal');
const envioDomicilio = document.getElementById('envioDomicilio');
const pagoEfectivo = document.getElementById('pagoEfectivo');
const pagoTransferencia = document.getElementById('pagoTransferencia');
const transferenciaInfo = document.getElementById("transferenciaInfo");
const inputProvincia = document.getElementById('clienteProvincia');
const inputLocalidad = document.getElementById('clienteLocalidad');

/* =========================
   LOCALIDADES SANTIAGO
========================= */
const localidadesSgo = [
  "Capital", "La Banda", "Termas de Río Hondo", "Añatuya", "Frías",
  "Fernández", "Monte Quemado", "Quimilí", "Suncho Corral",
  "Loreto", "Clodomira", "Beltrán", "Forres"
];

if (SOLO_SANTIAGO && inputProvincia) {
  inputProvincia.value = "Santiago del Estero";
  inputProvincia.readOnly = true;
  inputProvincia.style.opacity = "0.7";
}

// Re-aplicar desde site.json después de que el estado cargue
window.addEventListener('load', () => {
  setTimeout(() => {
    if (window.PixisState?.state?.site?.soloSantiago !== undefined) {
      SOLO_SANTIAGO = window.PixisState.state.site.soloSantiago;
      if (inputProvincia) {
        if (SOLO_SANTIAGO) {
          inputProvincia.value = "Santiago del Estero";
          inputProvincia.readOnly = true;
          inputProvincia.style.opacity = "0.7";
        } else {
          inputProvincia.value = '';
          inputProvincia.readOnly = false;
          inputProvincia.style.opacity = "1";
        }
      }
    }
  }, 600); // state.js ya procesó el JSON para entonces
});

if (inputLocalidad) {
  const lista = document.createElement('datalist');
  lista.id = "listaLocalidades";

  localidadesSgo.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc;
    lista.appendChild(option);
  });

  document.body.appendChild(lista);
  inputLocalidad.setAttribute("list", "listaLocalidades");

  inputLocalidad.addEventListener('input', () => {
    inputLocalidad.value =
      inputLocalidad.value.charAt(0).toUpperCase() +
      inputLocalidad.value.slice(1);
    validarZonaEnvio();
  });
}

function validarZonaEnvio() {
  if (!envioDomicilio.checked) return;

  const loc = inputLocalidad.value.trim();
  const zonaConEfectivo = loc === "Capital" || loc === "La Banda";

  if (zonaConEfectivo) {
    pagoEfectivo.disabled = false;
  } else {
    pagoEfectivo.checked = false;
    pagoEfectivo.disabled = true;
    pagoTransferencia.checked = true;
  }
}

retiroLocal?.addEventListener('change', () => {

  if (retiroLocal.checked) {

    envioDomicilio.checked = false;

    pagoEfectivo.disabled = false;
    pagoTarjeta.disabled = false;
    pagoTransferencia.disabled = false;

  }
  if (avisoEnvioPago) {
    avisoEnvioPago.style.display = "none";
  }
});

envioDomicilio?.addEventListener('change', () => {

  if (envioDomicilio.checked) {

    retiroLocal.checked = false;

    // ❌ efectivo no permitido
    pagoEfectivo.checked = false;
    pagoEfectivo.disabled = true;

    // ✅ transferencia y tarjeta permitidas
    pagoTarjeta.disabled = false;
    pagoTransferencia.disabled = false;

    if (avisoEnvioPago) {
      avisoEnvioPago.style.display = "block";
    }

  }

});
pagoEfectivo?.addEventListener('change', () => {

  if (pagoEfectivo.checked) {

    pagoTransferencia.checked = false;

    if (transferenciaInfo) {
      transferenciaInfo.style.display = "none";
    }

    // ✅ ABRIR MODAL SOLO SI SE SELECCIONA EFECTIVO
    if (modalEfectivo) {
      modalEfectivo.classList.add("active");
    }

  }

});
modalEfectivo?.addEventListener("click", (e) => {
  if (e.target === modalEfectivo) {
    modalEfectivo.classList.remove("active");
  }
});
pagoTransferencia?.addEventListener('change', () => {

  if (pagoTransferencia.checked) {
    pagoEfectivo.checked = false;

    if (transferenciaInfo) {
      transferenciaInfo.style.display = "block";
    }

  }

});

/* =========================
   AGREGAR PRODUCTO
========================= */
document.addEventListener('click', e => {

  const btn = e.target.closest('.btn-add-cart');
  if (!btn) return;

  // 🔴 FIX: Evitar que el click abra el modal de la tarjeta
  e.preventDefault();
  e.stopPropagation();

  const card = btn.closest('.card');
  if (!card) return;
  if (card.classList.contains('sin-stock')) return;

  const name = btn.dataset.name;
  const price = parseInt(btn.dataset.price);
  const priceLocal = parseInt(btn.dataset.priceLocal);
  const img = card.dataset.img;

  const item = cart.find(p => p.name === name);

  if (item) {
    item.qty++;
  } else {
    cart.push({ name, price, priceLocal, img, qty: 1 });
  }

  renderCart();
  animarAgregarCarrito(img, btn);

  showCartMessage(); // 🟢 MENSAJE
});

/* =========================
   RENDER
========================= */
function renderCart() {

  cartItems.innerHTML = '';
  let total = 0;
  let count = 0;

  cart.forEach((item, index) => {
    total += item.price * item.qty;
    count += item.qty;

    cartItems.innerHTML += `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}">
        <div>
          <h4>${item.name}</h4>
          <span>$${item.price.toLocaleString()}</span>
        </div>
        <div class="cart-qty">
          <button onclick="changeQty(${index}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${index}, 1)">+</button>
        </div>
      </div>`;
  });

  cartCount.textContent = count;


  let totalFinal;

  if (pagoTarjeta?.checked) {

    totalFinal = calcularTotalConCuotas(total);

  } else if (pagoEfectivo?.checked) {

    totalFinal = cart.reduce((acc, item) => {
      return acc + (item.priceLocal * item.qty);
    }, 0);

  } else {

    totalFinal = total;

  }
  cartTotal.textContent = `$${totalFinal.toLocaleString()}`;

  mostrarAdvertenciaCantidad();
  saveCart();
}
const pagoTarjeta = document.getElementById("pagoTarjetaVisual");
const cuotasPreview = document.getElementById("cuotasPreviewCarrito");


const radiosPago = document.querySelectorAll("input[name='pago']");

radiosPago.forEach(radio => {
  radio.addEventListener("change", () => {

    if (pagoTarjeta.checked) {

      selectCuotas.style.display = "block";
      cuotasPreview.style.display = "block";

    } else {

      selectCuotas.style.display = "none";
      cuotasPreview.style.display = "none";
      selectCuotas.value = "0";
      cuotasPreview.innerHTML = "";

      // 🔥 ESTO ES LO IMPORTANTE
      renderCart(); // recalcula total sin cuotas

    }
    if (!pagoTransferencia.checked) {
      if (transferenciaInfo) {
        transferenciaInfo.style.display = "none";
      }
    }
  });

});
/* =========================
   ADVERTENCIA CANTIDAD MAYOR A 2
========================= */
function mostrarAdvertenciaCantidad() {

  const vieja = document.querySelector('.cart-warning');
  if (vieja) vieja.remove();

  const hayExceso = cart.some(item => item.qty > 2);
  if (!hayExceso) return;

  const warning = document.createElement('div');
  warning.className = 'cart-warning';

  warning.innerHTML = `
    <strong>⚠ Atención:</strong><br>
    Si solicitás más de 2 unidades de un mismo producto,
    la disponibilidad deberá confirmarse dentro de nuestros horarios de atención.<br><br>
    🕒 <strong>Horarios:</strong><br>
    Lunes a viernes de 09:00 a 12:30 hs y de 13:30 a 21:30 hs.<br>
    Sábados de 09:00 a 13:00 hs.
  `;

  const footer = document.querySelector('.cart-footer');
  footer?.parentNode.insertBefore(warning, footer);
}

/* =========================
   CAMBIAR CANTIDAD
========================= */
window.changeQty = (index, delta) => {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  renderCart();
};

selectCuotas?.addEventListener('change', () => {
  renderCart();
});

/* =========================
   VACIAR
========================= */
btnClear?.addEventListener('click', () => {
  cart = [];
  renderCart();
});

/* =========================
   FINALIZAR COMPRA
========================= */
btnFinish?.addEventListener('click', e => {

  if (!aceptaTerminos.checked) {
    alert("Debes aceptar los términos y condiciones para continuar.");
    return;
  }

  e.preventDefault();
  if (!cart.length) return;

  const nombre = document.getElementById('clienteNombre')?.value.trim();
  const localidad = inputLocalidad.value.trim();
  const direccion = document.getElementById('clienteDireccion')?.value.trim();

  if (!retiroLocal.checked && !envioDomicilio.checked) {
    alert('Seleccioná modo de entrega.');
    return;
  }

  if (!pagoEfectivo.checked && !pagoTransferencia.checked && !pagoTarjeta.checked) {
    alert('Seleccioná forma de pago.');
    return;
  }

  if (pagoTarjeta.checked && selectCuotas.value === "0") {
    alert('Seleccioná la cantidad de cuotas para pagar con tarjeta.');
    return;
  }

  if (envioDomicilio.checked && (!nombre || !localidad || !direccion)) {
    alert('Para envíos debés completar los datos.');
    return;
  }

  /* ── 1. GENERAR PDF ── */
  generarPDFPresupuesto();

  /* ── 2. ARMAR MENSAJE WHATSAPP ── */
  let msg = '🛒 *Pedido PIXIS Informática*%0A%0A';
  msg += `🚚 *Entrega:* ${retiroLocal.checked ? 'Retiro en el local' : 'Envío a domicilio'}%0A`;

  if (envioDomicilio.checked) {
    msg += `%0A👤 ${nombre}%0A📍 ${direccion}%0A🏙️ ${localidad}%0A🗺️ Santiago del Estero%0A`;
  }

  msg += `%0A────────────────────%0A`;

  let total = 0;


  cart.forEach(i => {

    let precioUnitario = pagoEfectivo.checked 
  ? parseFloat(i.priceLocal) || 0 
  : parseFloat(i.price) || 0;

    let subtotal = precioUnitario * i.qty;

    msg += `• ${i.name} x${i.qty} — $${subtotal.toLocaleString()}%0A`;

    total += subtotal;
  });

  const hayExceso = cart.some(item => item.qty > 2);
  if (hayExceso) {
    msg += `%0A⚠ *Aviso:* Se solicitaron más de 2 unidades de uno o más productos.%0A`;
    msg += `La disponibilidad deberá confirmarse dentro de nuestros horarios de atención.%0A`;
    msg += `🕒 Lunes a viernes 09:00–12:30 y 13:30–21:30.%0ASábados 09:00–13:00.%0A`;
  }

  msg += `%0A────────────────────%0A`;

  if (pagoTarjeta.checked && selectCuotas.value !== "0") {
    const cuotas = parseInt(selectCuotas.value);
    const tasa = tasasCuotas[cuotas];
    const totalConInteres = total * tasa;
    const valorCuota = totalConInteres / cuotas;
    msg += `💳 *Pago:* Tarjeta de crédito%0A`;
    msg += `💳 ${cuotas} cuotas de $${Math.round(valorCuota).toLocaleString()}%0A`;
    msg += `💰 *Total final:* $${Math.round(totalConInteres).toLocaleString()}%0A`;
    msg += `%0A⏳ El pago se concretará dentro de nuestros horarios de atención.%0A`;
  } else if (pagoEfectivo.checked) {
    msg += `💵 *Pago:* Efectivo%0A`;
    msg += `💰 *Total:* $${Math.round(total).toLocaleString()}%0A`;
  } else if (pagoTransferencia.checked) {
    msg += `🏦 *Pago:* Transferencia bancaria%0A`;
    msg += `💰 *Total:* $${total.toLocaleString()}%0A`;
  }

  /* ── 3. ENVIAR: Web Share (móvil) o descarga + WhatsApp texto (desktop) ── */
  // Construir mensaje en texto plano para el Web Share API
  const msgPlain = msg
    .replace(/%0A/gi, '\n')
    .replace(/%0a/gi, '\n')
    .replace(/\*([^*]+)\*/g, '$1'); // quitar asteriscos de bold para el share nativo

  setTimeout(() => {
    // Número de destino: se lee desde site.json (campo whatsappPhone) — cambiable desde el editor
    const waPhone = window.PixisState?.state?.site?.whatsappPhone || '5493856970135';

    // Abrir WhatsApp con el mensaje (el PDF ya se descargó en generarPDFPresupuesto)
    // En móvil usamos window.location.href para una redirección más fluida si es necesario, 
    // pero window.open con _blank suele ser más compatible para no cerrar la web.
    window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
  }, 600);

});

function aplicarConfiguracionPreciosCategorias() {

  const categorias = document.querySelectorAll("h3.categoria");

  categorias.forEach(titulo => {

    const nombreCategoria = titulo.id?.trim();
    if (!nombreCategoria) return;

    const ocultar = OCULTAR_PRECIOS_CATEGORIA[nombreCategoria];
    if (ocultar === undefined) return;

    /* =====================================================
       BUSCAR TODO LO QUE PERTENECE A ESTA CATEGORÍA
       (hasta el próximo h3.categoria)
    ===================================================== */

    let nodo = titulo.nextElementSibling;
    const elementosCategoria = [];

    while (nodo && !nodo.classList?.contains("categoria")) {
      elementosCategoria.push(nodo);
      nodo = nodo.nextElementSibling;
    }

    /* =====================================================
       DENTRO DE ESOS ELEMENTOS BUSCAMOS LAS CARDS REALES
    ===================================================== */

    elementosCategoria.forEach(seccion => {

      const cards = seccion.querySelectorAll?.(".card");
      if (!cards) return;

      cards.forEach(card => {

        const precioHTML = card.querySelector(".precio");
        const botonCart = card.querySelector(".btn-add-cart");
        const botonWsp = card.querySelector('.btn-wsp');

        if (ocultar) {

          const esSinStock = card.classList.contains("sin-stock");

          /* ================================
             SI ES SIN STOCK → PRIORIDAD TOTAL
          ================================== */
          if (esSinStock) {

            if (precioHTML) precioHTML.style.display = "none";
            if (botonCart) botonCart.style.display = "none";

            if (botonWsp) {
              botonWsp.textContent = "NO DISPONIBLE";
              botonWsp.style.color = "#ff0033";
              botonWsp.style.fontWeight = "bold";
            }

            return; // 🔥 corta aquí, no aplica "consultar"
          }

          /* ================================
             STOCK NORMAL PERO PRECIO OCULTO
          ================================== */

          if (!card.dataset.priceBackup && card.dataset.price) {
            card.dataset.priceBackup = card.dataset.price;
          }

          card.dataset.price = "";

          if (precioHTML) precioHTML.style.display = "none";
          if (botonCart) botonCart.style.display = "none";

          if (botonWsp) {

            if (!botonWsp.dataset.textBackup) {
              botonWsp.dataset.textBackup = botonWsp.textContent;
            }

            botonWsp.textContent = "Stock disponible · Consultar Precio";
          }

        }
        else {

          /* RESTAURAMOS PRECIO */
          if (card.dataset.priceBackup) {
            card.dataset.price = card.dataset.priceBackup;
          }

          /* MOSTRAMOS PRECIO Y BOTÓN */
          if (precioHTML) precioHTML.style.display = "";
          if (botonCart) botonCart.style.display = "";

          /* RESTAURAMOS TEXTO ORIGINAL */
          if (botonWsp && botonWsp.dataset.textBackup) {
            botonWsp.textContent = botonWsp.dataset.textBackup;
          }

        }
      });

    });

  });

}

/* =========================
   INICIO
========================= */
onPixisDOMReady(() => {
  aplicarConfiguracionPreciosCategorias();
  renderCart();  /* restaurar carrito guardado */
});
/* =========================
   MODAL PRODUCTO
========================= */
const modal = document.getElementById('modalProduct');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const btnReview = document.getElementById('btnReview');
const btnAddToCart = document.getElementById("btnAddToCart");
const btnToggleDesc = document.getElementById("btnToggleDesc");

btnToggleDesc?.addEventListener("click", () => {

  modalDesc.classList.toggle("active");

  if (modalDesc.classList.contains("active")) {
    btnToggleDesc.textContent = "− Menos detalles";
  } else {
    btnToggleDesc.textContent = "+ Más detalles";
  }

});

let productoActual = null;
let botonOriginal = null;

function redondearPrecioLocal(valor) {

  // 🔥 si es menor a 1000 → NO tocar
  if (valor < 1000) return Math.round(valor);

  const resto = valor % 1000;
  const base = Math.floor(valor / 1000) * 1000;

  // 🔥 margen inteligente
  if (resto <= 250) {
    return base;            // ej: 491.100 → 491.000
  } else if (resto <= 550) {
    return base + 500;      // ej: 491.400 → 491.500
  } else {
    return base + 1000;     // ej: 491.800 → 492.000
  }

}
/* =========================
   ACTUALIZAR PRECIOS
========================= */
function actualizarPreciosModal(precioBase, precioLocalRaw) {

  const precioNumerico = parseFloat(
    precioBase.replace(/\./g, "").replace(",", ".").replace("$", "")
  );
  const contado = precioNumerico;
  const local = parseFloat(precioLocalRaw);

  const lista = precioNumerico * (tasasCuotas[6] || 1.31);

  document.getElementById("precioContado").textContent =
    (!isNaN(contado) ? contado : 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

  document.getElementById("precioLocal").textContent =
    (!isNaN(local) ? local : 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

  document.getElementById("precioLista").textContent =
    (!isNaN(lista) ? lista : 0).toLocaleString("es-AR", { style: "currency", currency: "ARS" });

  generarDetalleCuotas(precioNumerico);
}
/* =========================
   PREVIEW CUOTAS
========================= */
function generarPreviewCuotas(precioBase) {

  const modalCuotas = document.getElementById("modalCuotas");
  if (!modalCuotas) return;

  modalCuotas.innerHTML = "";

  const precioNumerico = parseFloat(
    precioBase.replace(/\./g, "").replace(",", ".").replace("$", "")
  );

  Object.keys(tasasCuotas).forEach(cuotas => {

    const tasa = tasasCuotas[cuotas];
    const precioConInteres = precioNumerico * tasa;
    const valorCuota = precioConInteres / cuotas;

    const cuotaFormateada = valorCuota.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS"
    });

    const div = document.createElement("div");
    div.classList.add("cuota-item");

    div.innerHTML = `
      <span>${cuotas}x</span>
      <strong>${cuotaFormateada}</strong>
    `;

    modalCuotas.appendChild(div);

  });
}

/* =========================
   DETALLE CUOTAS
========================= */
function generarDetalleCuotas(precioBase) {

  const lista = document.getElementById("listaCuotas");
  if (!lista) return;

  lista.innerHTML = "";

  Object.keys(tasasCuotas).forEach(cuotas => {

    const tasa = tasasCuotas[cuotas];
    const total = precioBase * tasa;
    const valorCuota = total / cuotas;

    const fila = document.createElement("div");
    fila.classList.add("fila-cuota");

    fila.innerHTML = `
<span class="col-cuotas">
  ${cuotas}x
  ${(tasa === 1.0) ? '<span class="sin-interes">SIN INTERÉS</span>' : ''}
</span>

  <span class="col-valor">
    ${valorCuota.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS"
    })}
  </span>

  <span class="col-total">
    ${total.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS"
    })}
  </span>
`;

    lista.appendChild(fila);
  });
}

/* =========================
   ABRIR MODAL
========================= */
document.addEventListener('click', function (e) {

  if (e.target.id !== "btnToggleDesc") {
    modalDesc.classList.remove("active");
    btnToggleDesc.textContent = "+ Más detalles";
  }

  // Si el click es en botones específicos, dejamos que actúen
  if (
    e.target.closest('.btn-add-cart') ||
    e.target.closest('.btn-wsp') ||
    e.target.closest('.btn-whatsapp') ||
    e.target.closest('.btn-config') ||
    e.target.closest('.pixis-edit-card-btn') ||
    e.target.closest('.pixis-delete-card-btn') ||
    e.target.closest('.pixis-select-card-btn')
  ) return;

  const card = e.target.closest('.card');
  if (!card) return;

  // Soporte para enlaces nativos: si es un click izquierdo normal en la tarjeta o su enlace,
  // prevenimos la recarga para abrir el modal (SPA flow).
  // Ctrl+Click, click derecho o botón medio funcionarán nativamente gracias al <a>.
  // Soporte para enlaces nativos y clic central (ruedita)
  const isCard = e.target.closest('.card');
  if (isCard) {
    if (e.button === 0 && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        e.preventDefault(); // Clic izquierdo: abrir modal (SPA)
    } else {
        return; // Clic central, derecho o modificado: dejar que el navegador actúe
    }
  }


  if (card.classList.contains('sin-stock')) return;
  if (!MODAL_ENABLED) return;

  window.openProductModal(card, true);
});

window.openProductModal = function (card, pushToHistory = true) {
  if (card.classList.contains('sin-stock')) return;
  if (!MODAL_ENABLED) return;

  const btn = card.querySelector(".btn-add-cart");

  productoActual = {
    id: card.dataset.pixisId || '',
    name: btn.dataset.name,
    price: parseFloat(btn.dataset.price),
    priceLocal: parseFloat(btn.dataset.priceLocal) || parseFloat(btn.dataset.price),
    img: card.dataset.img
  };
  // pasar datos al botón del modal
  const modalBtn = document.getElementById("btnAddToCart");
  modalBtn.dataset.name = productoActual.name;
  modalBtn.dataset.price = productoActual.price;

  /* =========================
     GALERÍA
  ========================== */

  const thumbsContainer = document.getElementById("modalThumbs");
  thumbsContainer.innerHTML = "";

  let images = [];

  if (card.dataset.gallery) {
    images = card.dataset.gallery.split(",");
  } else {
    images = [card.dataset.img];
  }

  modalImg.src = images[0];
  resetZoom();
  resetZoomMobile();

  images.forEach(src => {
    const thumb = document.createElement("img");
    thumb.src = src.trim();

    thumb.addEventListener("click", () => {
      modalImg.src = src.trim();
      resetZoom();
      resetZoomMobile();
    });

    thumbsContainer.appendChild(thumb);
  });

  resetZoom();
  resetZoomMobile();
  modalTitle.textContent = card.dataset.title;
  actualizarPreciosModal(btn.dataset.price, btn.dataset.priceLocal);
  generarPreviewCuotas(card.dataset.price);

  modalDesc.innerHTML = card.dataset.desc
    .replace(/&#10;/g, "\n")
    .split('\n')
    .filter(l => l.trim())
    .map(l => `<p>${l}</p>`)
    .join('');

  /* =========================
     BOTONES PERSONALIZADOS
  ========================== */
  const customBtnsContainer = document.getElementById("modalCustomButtons");
  if (customBtnsContainer) {
    customBtnsContainer.innerHTML = "";
    if (card.dataset.customButtons) {
      try {
        const buttons = JSON.parse(card.dataset.customButtons);
        buttons.forEach(btn => {
          if (!btn.label) return;
          const a = document.createElement("a");
          a.href = btn.link || "#";
          a.target = (btn.link && btn.link.startsWith("http")) ? "_blank" : "_self";
          a.className = "btn-custom-pixis-modal"; // Nuevo estilo púrpura distinguido
          a.textContent = btn.label;
          
          // Prevenir que el click en el botón cierre el modal o haga cosas raras
          a.onclick = (e) => e.stopPropagation();
          
          customBtnsContainer.appendChild(a);
        });
      } catch (e) {
        console.error("Error al parsear customButtons:", e);
      }
    }
  }

  if (!card.dataset.video) {
    btnReview.style.display = 'none';
  } else {
    btnReview.style.display = 'block';
    btnReview.onclick = (e) => {
      e.stopPropagation();
      window.open(card.dataset.video, '_blank');
    };
  }

  // Modificar la URL con un identificador único paramétrico para compartir
  if (pushToHistory) {
    const prodId = card.dataset.pixisId || card.dataset.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const params = new URLSearchParams(window.location.search);
    params.set('producto', prodId);
    
    // Obtener versión de caché estable (cacheVersion o fecha diaria) para la barra de navegación (Facebook)
    const getStableCacheVersion = () => {
      if (window.PixisState?.state?.site?.cacheVersion) {
        return window.PixisState.state.site.cacheVersion;
      }
      const d = new Date();
      return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    };
    
    params.set('cc', getStableCacheVersion()); // cache buster estable para copiar manualmente
    history.pushState({ modalOpen: true }, "", "?" + params.toString());
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};


/* =========================
   BOTÓN AGREGAR AL CARRITO
========================= */

const btnAddModal = document.getElementById("btnAddToCart");

btnAddToCart?.addEventListener("click", () => {

  if (!productoActual) return;

  const item = cart.find(p => p.name === productoActual.name);

  if (item) {
    item.qty++;
  } else {
    cart.push({
  name: productoActual.name,
  price: parseFloat(productoActual.price),
  priceLocal: parseFloat(productoActual.priceLocal) || parseFloat(productoActual.price),
  img: productoActual.img,
  qty: 1
});
  }

  renderCart();
  showCartMessage();
});
/* =========================
   CERRAR MODAL
========================= */
function closeModal(fromHistory = false) {
  if (fromHistory !== true && window.location.search.includes('producto=')) {
    if (window.history.state && window.history.state.modalOpen) {
      window.history.back();
    } else {
      // Remover solo el parámetro de producto manteniendo categorías o banners previos
      const params = new URLSearchParams(window.location.search);
      params.delete('producto');
      params.delete('cc'); // Limpiar el cache buster del compartir si venía con él
      const newQuery = params.toString();
      history.pushState(null, "", window.location.pathname + (newQuery ? '?' + newQuery : ''));
    }
  }
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelector('.modal-close')?.addEventListener('click', closeModal);
document.querySelector('.modal-overlay')?.addEventListener('click', closeModal);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal();
  }
});

/* =========================
   MODAL CUOTAS
========================= */

const btnVerCuotas = document.getElementById("btnVerCuotas");
const modalCuotasDetalle = document.getElementById("modalCuotasDetalle");
const cerrarCuotas = document.getElementById("cerrarCuotas");

if (btnVerCuotas) {
  btnVerCuotas.addEventListener("click", () => {
    modalCuotasDetalle?.classList.add("active");
  });
}

if (cerrarCuotas) {
  cerrarCuotas.addEventListener("click", () => {
    modalCuotasDetalle?.classList.remove("active");
  });
}

modalCuotasDetalle?.addEventListener("click", (e) => {
  if (e.target === modalCuotasDetalle) {
    modalCuotasDetalle.classList.remove("active");
  }
});

/* =========================
   ZOOM + SCROLL + DOBLE CLICK
========================= */

const zoomContainer = document.getElementById('modalZoom');

let zoomScale = 1;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

zoomContainer.addEventListener('wheel', (e) => {
  e.preventDefault();

  const rect = zoomContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const originX = (x / rect.width) * 100;
  const originY = (y / rect.height) * 100;

  modalImg.style.transformOrigin = `${originX}% ${originY}%`;

  if (e.deltaY < 0) {
    zoomScale += 0.25;
  } else {
    zoomScale -= 0.25;
  }

  zoomScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomScale));
  modalImg.style.transform = `scale(${zoomScale})`;
});

zoomContainer.addEventListener('mousemove', (e) => {
  if (zoomScale === 1) return;

  const rect = zoomContainer.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * 100;
  const y = (e.clientY - rect.top) / rect.height * 100;

  modalImg.style.transformOrigin = `${x}% ${y}%`;
});

zoomContainer.addEventListener('mouseleave', resetZoom);

zoomContainer.addEventListener('dblclick', (e) => {
  e.preventDefault();

  if (zoomScale > 1) {
    resetZoom();
    resetZoomMobile();
    return;
  }

  const rect = zoomContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const originX = (x / rect.width) * 100;
  const originY = (y / rect.height) * 100;

  modalImg.style.transformOrigin = `${originX}% ${originY}%`;

  zoomScale = 2;
  modalImg.style.transform = `scale(${zoomScale})`;
});

function resetZoom() {
  zoomScale = 1;
  modalImg.style.transform = 'scale(1)';
  modalImg.style.transformOrigin = 'center center';
}
/* =========================
   MOBILE ZOOM (PINCH + DRAG)
========================= */

let isMobile = window.innerWidth <= 900;

let startDist = 0;
let currentScale = 1;
let lastScale = 1;

let posX = 0;
let posY = 0;
let startX = 0;
let startY = 0;

zoomContainer.addEventListener("touchstart", (e) => {

  if (!isMobile) return;

  if (e.touches.length === 2) {
    // 🔥 PINCH START
    startDist = getDistance(e.touches);
  }

  if (e.touches.length === 1 && currentScale > 1) {
    // 🔥 DRAG START
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }

}, { passive: false });

zoomContainer.addEventListener("touchmove", (e) => {

  if (!isMobile) return;

  e.preventDefault();

  // 🔥 PINCH ZOOM PRO (centrado en dedos)
  if (e.touches.length === 2) {

    const newDist = getDistance(e.touches);
    let newScale = (newDist / startDist) * lastScale;

    newScale = Math.max(1, Math.min(4, newScale));

    // 📍 centro entre los dedos
    const rect = zoomContainer.getBoundingClientRect();

    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    const offsetX = centerX - rect.left;
    const offsetY = centerY - rect.top;

    // 🔥 calcular desplazamiento relativo
    const dx = offsetX - rect.width / 2;
    const dy = offsetY - rect.height / 2;

    const scaleFactor = newScale / currentScale;

    posX -= dx * (scaleFactor - 1);
    posY -= dy * (scaleFactor - 1);

    currentScale = newScale;

    applyTransform();
  }

  // 🔥 DRAG
  if (e.touches.length === 1 && currentScale > 1) {
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;

    applyTransform();
  }

}, { passive: false });

zoomContainer.addEventListener("touchend", () => {

  if (!isMobile) return;

  lastScale = currentScale;

  if (currentScale <= 1) {
    resetZoomMobile();
  }

});

/* =========================
   DOBLE TAP
========================= */

let lastTap = 0;

zoomContainer.addEventListener("touchend", (e) => {

  if (!isMobile) return;

  const now = new Date().getTime();
  const tapDelay = now - lastTap;

  if (tapDelay < 300 && tapDelay > 0) {
    // 🔥 DOBLE TAP
    if (currentScale > 1) {
      resetZoomMobile();
    } else {
      currentScale = 2;
      lastScale = 2;
      applyTransform();
    }
  }

  lastTap = now;

});

/* =========================
   FUNCIONES
========================= */

function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function applyTransform() {
  modalImg.style.transform =
    `translate(${posX}px, ${posY}px) scale(${currentScale})`;
}

function resetZoomMobile() {
  currentScale = 1;
  lastScale = 1;
  posX = 0;
  posY = 0;

  modalImg.style.transform = "scale(1)";
}
/* =========================
   ORDENAR (sin stock al final)
========================= */
function ordenarProductos(productos, ordenarPorPrecio) {
  // Guardar/usar índice original en el DOM para mantener el orden estable secundario
  const allCards = [...productos.querySelectorAll('.card')];
  allCards.forEach((card, index) => {
    if (card.dataset.domIndex === undefined) {
      card.dataset.domIndex = index;
    }
  });

  // Re-aplicar filtro activo si hay uno
  const filtroActivo = productos
    .previousElementSibling
    ?.querySelector('.btn-filtro.activo')
    ?.dataset.filter;

  if (filtroActivo && filtroActivo !== 'all') {
    allCards.forEach(card => {
      const sub = (card.dataset.subcategoria || '').toLowerCase();
      if (sub === filtroActivo.toLowerCase()) {
        card.classList.remove('oculta');
      } else {
        card.classList.add('oculta');
      }
    });
  }

  const getPrice = (el) => {
    const cash = el.dataset.cashPrice || el.querySelector('.btn-add-cart')?.dataset.priceLocal;
    if (cash) return parseInt(String(cash).replace(/\D/g, '')) || 0;
    const transfer = el.dataset.priceNum || el.dataset.price || el.querySelector('.btn-add-cart')?.dataset.price;
    if (transfer) return parseInt(String(transfer).replace(/\D/g, '')) || 0;
    const text = el.querySelector('.precio')?.textContent || '0';
    return parseInt(text.replace(/\D/g, '')) || 0;
  };

  // Ordenar todas las tarjetas para asegurar que los 'sin-stock' queden estrictamente al final
  allCards.sort((a, b) => {
    // Prioridad 1: Stock (stock > 0 siempre primero, sin stock al final)
    const aOff = a.classList.contains('sin-stock');
    const bOff = b.classList.contains('sin-stock');
    if (aOff && !bOff) return 1;
    if (!aOff && bOff) return -1;

    // Prioridad 2: Precio (si ordenarPorPrecio está activo) u Orden original del DOM
    if (ordenarPorPrecio) {
      return getPrice(a) - getPrice(b);
    } else {
      return parseInt(a.dataset.domIndex) - parseInt(b.dataset.domIndex);
    }
  });

  // Asignar el CSS order según el resultado del sort secuencialmente
  allCards.forEach((card, i) => {
    card.style.order = i;
  });
}
/* =========================
   FILTROS + AUTO ORDEN
========================= */
window.reinicializarFiltrosYToggles = function() {
  document.querySelectorAll('.filtros-categoria').forEach(filtroGrupo => {

    const ui = filtroGrupo.closest('.categoria-ui');
    if (!ui) return;

    // Buscar el .productos recorriendo hermanos (puede haber <br> u otros entre medio)
    let productos = ui.nextElementSibling;
    while (productos && !productos.classList.contains('productos')) {
      productos = productos.nextElementSibling;
    }
    if (!productos) return;

    const toggle = ui.querySelector('.toggle-precio');

    const botones = filtroGrupo.querySelectorAll('.btn-filtro');

    botones.forEach(btn => {
      if (btn._pixisBound) return; // evitar doble-binding
      btn._pixisBound = true;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Re-query en tiempo de ejecución para reflejar botones actuales
        const botonesActuales = filtroGrupo.querySelectorAll('.btn-filtro');
        botonesActuales.forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');

        const filter = btn.dataset.filter;
        const cards = productos.querySelectorAll('.card');

        cards.forEach(card => {
          const sub = card.dataset.subcategoria;
          card.classList.remove('filtrando');

          if (filter === 'all' || sub === filter) {
            card.classList.remove('oculta');
            requestAnimationFrame(() => { card.classList.remove('filtrando'); });
          } else {
            card.classList.add('filtrando');
            setTimeout(() => {
              card.classList.add('oculta');
              card.classList.remove('filtrando');
            }, 300);
          }
        });

        // 🔴 Re-aplicamos el orden actual.
        ordenarProductos(productos, toggle ? toggle.checked : false);
        aplicarPrecioEspecial();
      });
    });

    // Toggle precio: guard para no agregar listener dos veces
    if (toggle && !toggle._pixisBound) {
      toggle._pixisBound = true;
      // Forzar que por defecto al recargar/renderizar el checkbox empiece en FALSE para que no confunda al usuario
      toggle.checked = false;
      toggle.addEventListener('change', () => {
        ordenarProductos(productos, toggle.checked);
        aplicarPrecioEspecial();
      });
    }

    // Inicialización de orden al cargar o renderizar: SIEMPRE sin ordenar por precio inicialmente (false)
    ordenarProductos(productos, false);
  });
};

// Inicializar al cargar (para elementos estáticos del DOM)
window.reinicializarFiltrosYToggles();

// 🔗 LÓGICA DE APERTURA DE DEEP LINKS (Producto/Banner)
let deepLinkAttempts = 0;
const MAX_DEEP_LINK_ATTEMPTS = 10;

function procesarDeepLinks() {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Abrir Producto (?producto=slug)
    const prodSlug = params.get('producto');
    if (prodSlug && window.openProductBySlug) {
        const intentarAbrir = () => {
            const abierto = window.openProductBySlug(prodSlug, true);
            if (!abierto && deepLinkAttempts < MAX_DEEP_LINK_ATTEMPTS) {
                deepLinkAttempts++;
                console.log(`Pixis: Reintentando abrir producto (${deepLinkAttempts}/${MAX_DEEP_LINK_ATTEMPTS})...`);
                setTimeout(intentarAbrir, 500);
            } else if (abierto) {
                console.log("Pixis: Deep Link de producto procesado con éxito.");
            }
        };
        // Un pequeño retraso inicial para que el DOM se asiente
        setTimeout(intentarAbrir, 400);
    }

    // 2. Abrir Banner (?banner=id)
    const bannerParam = params.get('banner');
    if (bannerParam && window.abrirBannerLink) {
        setTimeout(() => {
            window.abrirBannerLink(bannerParam, true);
        }, 600);
    }

    // 3. Abrir Categoría (?categoria=id)
    const catParam = params.get('categoria');
    if (catParam && window.abrirCategoria) {
        setTimeout(() => {
            window.abrirCategoria(catParam, true);
        }, 700);
    }
}

window.syncAppStateFromUrl = function(fromHistory = false) {
    const params = new URLSearchParams(window.location.search);
    const prodSlug = params.get('producto');
    const bannerId = params.get('banner');
    const catId = params.get('categoria');

    // 1. Sincronizar Modal de Producto
    if (prodSlug) {
        if (window.openProductBySlug) {
            window.openProductBySlug(prodSlug, fromHistory);
        }
    } else {
        if (typeof closeModal === 'function') {
            closeModal(true); // Cerrar visualmente
        }
    }

    // 2. Sincronizar Banners / Categorías / Home (Solo ejecutar si no hay producto abierto, para no sobrecargar el renderizado, o si se navega en el historial)
    if (bannerId) {
        if (window.abrirBannerLink) {
            window.abrirBannerLink(bannerId, fromHistory);
        }
    } else if (catId) {
        if (window.abrirCategoria) {
            window.abrirCategoria(catId, fromHistory);
        }
    } else {
        // Solo ir a home si NO hay tampoco producto abierto
        if (!prodSlug && window.goHome) {
            window.goHome(fromHistory);
        }
    }
};

// Re-inicializar cuando state.js inyecte productos dinámicos
document.addEventListener('pixis:productos-renderizados', () => {
  console.log("Pixis: Productos renderizados detectados en cart.js");
  window.reinicializarFiltrosYToggles();
  
  // 🔥 RE-APLICAR BÚSQUEDA O BANNER ACTIVO
  const sf = document.getElementById('searchInput');
  if (sf && sf.value.trim() !== '') {
    sf.dispatchEvent(new Event('input'));
  }

  // Actualizar Metadatos ahora que los productos están en el DOM
  if (typeof updateMetaFromUrl === 'function') {
      updateMetaFromUrl();
  }

  procesarDeepLinks();
});

// 🚩 SEGURIDAD: Si los productos ya se cargaron antes de que este script pusiera el listener
onPixisDOMReady(() => {
    if (window._productosListos) {
        procesarDeepLinks();
        if (typeof updateMetaFromUrl === 'function') updateMetaFromUrl();
    }
});



// Sinónimos direccionales para evitar falsos positivos
const ALIAS_DIRECCIONAL = {
  'almacen': ['ssd', 'hdd', 'disco', 'solido', 'm.2', 'm2', 'nvme', 'sata', 'pendrive', 'microsd', 'memoria'],
  'almacenamiento': ['ssd', 'hdd', 'disco', 'solido', 'm.2', 'm2', 'nvme', 'sata', 'pendrive', 'microsd', 'memoria'],
  'pc': ['computadora', 'ordenador', 'cpu armado', 'equipo', 'notebook', 'vortex', 'thunderstrike'],
  'compu': ['pc', 'computadora', 'notebook', 'vortex', 'thunderstrike'],
  'notebook': ['laptop', 'portatil'],
  'mother': ['placa madre', 'motherboard', 'placa base', 'mainboard'],
  'video': ['grafica', 'gpu', 'geforce', 'radeon', 'rtx', 'gtx', 'rx', 'vga', 'placa de video'],
  'refri': ['cooler', 'refrigeracion', 'fan', 'ventilador', 'disipador', 'water'],
  'refrigeracion': ['cooler', 'fan', 'ventilador', 'disipador', 'water'],
  'tele': ['televisor', 'monitor', 'pantalla'],
  'silla': ['sillon', 'butaca', 'gamer'],
  'm2': ['m.2'],
  'm.2': ['m2'],
  'meca': ['mecanico'],
  'mec': ['mecanico'],
  'gab': ['gabinete', 'gabinetes'],
  'gabinete': ['gabinetes'],
  'auri': ['auricular', 'headset', 'audifono', 'vincha', 'auriculares'],
  'mic': ['microfono', 'procesador', 'microprocesador', 'cpu', 'ryzen', 'intel', 'amd'],
  'micro': ['microfono', 'procesador', 'microprocesador', 'cpu', 'ryzen', 'intel', 'amd'],
  'mouse': ['raton', 'mouses', 'ratones'],
  'teclado': ['keyboard', 'teclas', 'teclados'],
  'fuente': ['psu', 'power supply', 'alimentacion', 'energia', 'fuentes'],
  'cable': ['adaptador', 'ficha', 'conector', 'conversor', 'alargue', 'cables'],
  'adaptador': ['cable', 'ficha', 'conector', 'conversor', 'adaptadores'],
  'ram': ['memoria', 'ddr', 'dimm', 'ddr4', 'ddr5']
};
function normalizar(texto = '') {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function expandirBusqueda(query) {
  const palabras = query.split(' ').filter(p => p.trim() !== '');
  return palabras.map(p => {
    let opciones = [p];
    
    // Solo expande si la palabra escrita (o su inicio) encaja explícitamente en nuestro diccionario unidireccional
    for (const [k, v] of Object.entries(ALIAS_DIRECCIONAL)) {
      if (k.startsWith(p) || p === k) {
        opciones.push(...v);
      }
    }
    return [...new Set(opciones)]; // Elimina duplicados
  });
}

document.querySelectorAll('.card').forEach(card => {
  const title = card.dataset.title || '';
  const sub = card.dataset.subcategoria || '';
  const desc = card.dataset.desc || '';

  const keywords = `${sub} ${title} ${desc}`;
  card.dataset.keywords = normalizar(keywords);
});


/* =========================
   BUSCADOR UNIVERSAL
========================= */

const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');
const tituloNuevos = [...document.querySelectorAll('h2, h3')]
  .find(el => el.textContent.includes('NUEVOS INGRESOS'));

const tituloProductos = [...document.querySelectorAll('h2, h3')]
  .find(el => el.textContent.includes('PRODUCTOS DISPONIBLES'));
const categoriasTitulo = document.querySelectorAll('.categoria');
const categoriasUI = document.querySelectorAll('.categoria-ui');
const categoriasNav = document.querySelector('.categorias-nav');
const productosContainers = document.querySelectorAll('#catalogo-completo .productos');
const destacadosSection = document.querySelector('.destacados');
function limpiarSeparadores() {
  document.querySelectorAll('.separador-categoria')
    .forEach(el => el.remove());
}
function insertarSeparadoresEntreCategorias() {
  const bloques = [...document.querySelectorAll('.productos')];

  // solo los bloques que tienen cards visibles
  const bloquesConResultados = bloques.filter(bloque =>
    bloque.querySelector('.card:not(.oculta)')
  );

  bloquesConResultados.forEach((bloque, index) => {
    // no poner línea antes del primero
    if (index === 0) return;

    const separador = document.createElement('div');
    separador.className = 'separador-categoria';

    bloque.before(separador);
  });
}

/* =========================
   FILTRO ESPECIAL DESDE BANNERS
========================= */
window.ejecutarFiltroBanner = function(filtro, textoVisible, bannerId = null, fromHistory = false) {
  const sf = document.getElementById('searchInput');
  if (!sf) return;

  window._bannerActualId = bannerId; // Guardar ID global

  // Actualizar URL para que sea compartible
  // El cache buster diario fuerza un re-scrape automático en redes sociales.
  if (bannerId && fromHistory !== true) {
    history.pushState({ banner: bannerId }, "", "?banner=" + bannerId + "&" + getCacheBuster());
  }

  if (typeof filtro === 'function') {
    // Modo función precisa: sin falsos positivos
    window._filtroBannerFn = filtro;
    window._filtroBanner   = null;
  } else {
    // Modo legado/Editor: array de keywords OR o string único
    window._filtroBannerFn = null;
    const arrayFiltro = Array.isArray(filtro) ? filtro : [filtro];
    window._filtroBanner = arrayFiltro.map(o => normalizar(String(o)));
  }

  sf.value = textoVisible;
  sf.dispatchEvent(new Event('input'));

  setTimeout(() => {
    const hd     = document.querySelector('.main-header');
    const offset = hd ? hd.offsetHeight + 20 : 80;
    const tituloRes = [...document.querySelectorAll('h2, h3')]
      .find(el => el.textContent.includes('RESULTADOS'));

    if (tituloRes && tituloRes.style.display !== 'none') {
      const y = tituloRes.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      const y = sf.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, 150);
};

/* =======================================
   REDIRECCIÓN DE BANNERS (Deep Linking)
   ======================================= */
window._bannerData = {
  'kitryzen': { f: 'kitRyzen', t: 'Kits de Actualización Ryzen' },
  'pccombo': { f: 'pcCombo', t: 'PC Gamers y Combos' },
  'monitor': { f: 'monitorRaptor', t: 'Monitores Raptor' },
  'rtx5050': { f: ['5050'], t: 'Tarjetas Gráficas RTX 5050' },
  'rtx5060': { f: ['5060'], t: 'Tarjetas Gráficas RTX 5060' },
  'notebooks': { f: 'notebookMiniPc', t: 'Notebooks y Mini PCs' },
  'prolongadores': { f: ['prolongador'], t: 'Prolongadores Kelyx' },
  'ssd-hiksemi': { f: 'ssdHiksemi', t: 'SSDs Hiksemi' },
  'refrigeracion-raptor': { f: 'refrigeracionRaptor', t: 'Refrigeración Raptor' },
  'gabinetes-raptor': { f: 'gabinetesRaptor', t: 'Gabinetes Raptor' },
  'perifericos-raptor': { f: 'perifericosRaptor', t: 'Periféricos Raptor' }
};

window.abrirBannerLink = function(id, fromHistory = false) {
  const data = window._bannerData[id];
  if (!data) return;

  let filtro = data.f;
  // Si es un string, lo buscamos en _bannerFiltros
  if (typeof filtro === 'string' && window._bannerFiltros[filtro]) {
    filtro = window._bannerFiltros[filtro];
  }

  window.ejecutarFiltroBanner(filtro, data.t, id, fromHistory);
};

/* Filtros precisos reutilizables para los banners */
window._bannerFiltros = {

  // Banners solicitados (Kits, PCs, Monitores)
  kitRyzen: function(card) {
    const t = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    const sub = (card.dataset.subcategoria || '').toLowerCase();
    return (t.includes('kit') && t.includes('ryzen')) || (sub.includes('kit') && t.includes('ryzen'));
  },

  pcCombo: function(card) {
    const t = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    const cat = (card.dataset.category || '').toLowerCase();
    return t.includes('pc gamer') || t.includes('combo') || cat.includes('computadoras');
  },

  monitorRaptor: function(card) {
    const t = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    return t.includes('monitor') && t.includes('raptor');
  },

  // Imagen 3 carrusel 1: solo Notebooks y Mini PCs (por subcategoria exacta)
  notebookMiniPc: function(card) {
    const sub = (card.dataset.subcategoria || '').toLowerCase();
    return sub === 'notebook' || sub === 'mini pc';
  },

  // Carrusel 2 imagen 1: SSDs Hiksemi únicamente (excluye pendrives, RAM, etc.)
  ssdHiksemi: function(card) {
    const t = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    return t.includes('hiksemi') && t.includes('ssd');
  },

  // Carrusel 2 imagen 2: Refrigeración Raptor — filtra por subcategoría exacta para evitar
  // falsos positivos con gabinetes que tienen "Fan" en el nombre.
  refrigeracionRaptor: function(card) {
    const t   = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    const sub = (card.dataset.subcategoria || '').toLowerCase();
    const SUBCATS_REFRI = ['water cooling', 'cooler cpu torre', 'fan chasis', 'pastas termicas', 'thermalpads'];
    return t.includes('raptor') && SUBCATS_REFRI.some(s => sub.includes(s));
  },

  // Carrusel 2 imagen 3: solo Gabinetes Raptor
  gabinetesRaptor: function(card) {
    const t = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    return t.includes('gabinete') && t.includes('raptor');
  },

  // Carrusel 2 imagen 4: todos los periféricos Raptor (teclado, mouse, auricular, mousepad)
  perifericosRaptor: function(card) {
    const t = normalizar(card.dataset.title || card.querySelector('h3')?.textContent || '');
    if (!t.includes('raptor')) return false;
    const sub = (card.dataset.subcategoria || '').toLowerCase().replace(/-/g, ' ');
    return ['teclado', 'mouse', 'auricular', 'auriculares', 'mouse pad'].some(s => sub.includes(s));
  },

};

let searchGoHomeTimeout = null;

searchInput.addEventListener('input', (e) => {
  // Restaurar cards desde _sortFlatContainer ANTES de filtrar
  // (si el sort las movió, el buscador no las encontraría en .productos)
  if (window._pixisRestaurarOrigen) window._pixisRestaurarOrigen();
  // Al empezar a buscar, cerramos el menú para ver resultados
  if (window.closePixisMenu) window.closePixisMenu();
  // 🛠 Cancelar el retorno automático a home si el usuario sigue tipeando o borrando rápido
  if (searchGoHomeTimeout) {
    clearTimeout(searchGoHomeTimeout);
    searchGoHomeTimeout = null;
  }

  if (e && e.isTrusted) {
    // El usuario escribió manualmente → limpiar filtros banner
    window._filtroBanner   = null;
    window._filtroBannerFn = null;
    window._bannerActualId = null;
  }
  let hayResultados = false;
  const queryRaw = searchInput.value.trim();
  const query = normalizar(queryRaw);
  const palabrasBusqueda = expandirBusqueda(query);
  const buscando = query.length > 0;

  /* 🔥 NUEVOS INGRESOS */
  if (tituloNuevos) {
    tituloNuevos.style.display = buscando ? 'none' : '';
  }

  /* 🔁 PRODUCTOS DISPONIBLES → RESULTADOS */
  if (tituloProductos) {
    tituloProductos.textContent = buscando
      ? 'RESULTADOS'
      : 'PRODUCTOS DISPONIBLES';
  }
  /* 🔥 OCULTAR DESTACADOS AL BUSCAR */
  const catalogoCompletoUI = document.getElementById("catalogo-completo");
  const nuevosIngresosUI = document.getElementById("nuevosIngresosSection");

  if (buscando) {
    if (destacadosSection) destacadosSection.style.display = 'none';
    if (nuevosIngresosUI) nuevosIngresosUI.style.display = 'none';
    if (document.getElementById("reelsSection")) document.getElementById("reelsSection").style.display = "none";
    if (document.getElementById("aprendeSection")) document.getElementById("aprendeSection").style.display = "none";
    if (catalogoCompletoUI) catalogoCompletoUI.style.display = 'block';

    // Mostrar todos los contenedores de productos para que las cards encontradas sean visibles
    document.querySelectorAll('.Gabinetes .productos').forEach(prodContainer => {
      prodContainer.style.display = '';
    });
  } else {
    // Al borrar la búsqueda: quedarse en el catálogo con todos los productos visibles.
    // (No volvemos al inicio automáticamente para no interrumpir al usuario.)
  }

  // Buscar en .productos Y en #_sortFlatContainer
  // (el sort puede haber movido las cards fuera de .productos)
  // Ignorar carruseles de home para que no "roben" la visibilidad de los productos en el catálogo
  const _searchContainers = [...document.querySelectorAll('.productos:not(#destacadosTrack):not(#nuevosIngresosTrack)')];
  const _sortFlat = document.getElementById('_sortFlatContainer');
  if (_sortFlat) _searchContainers.push(_sortFlat);

  _searchContainers.forEach(productos => {
    productos.querySelectorAll('.card').forEach(card => {

      const nombre = normalizar(
        card.querySelector('h3')?.textContent || ''
      );

      const desc = normalizar(
        card.querySelector('p')?.textContent || ''
      );

      const sub = normalizar(
        card.dataset.subcategoria?.replace(/-/g, ' ') || ''
      );

      // Campo prioritario: título del producto (data-title o h3) + subcategoría
      const titulo = normalizar(
        card.dataset.title || card.querySelector('h3')?.textContent || ''
      );
      const campoTitulo = `${sub} ${titulo}`;

      // Búsqueda combinada: leer también la descripción para lograr 10/10 en resultados profundos
      const campoTotal = `${campoTitulo} ${desc}`;

      // 1. Match exacto de nombre completo pegado — máxima precisión
      const matchExactoTitulo = titulo.includes(query);

      // 2. Cada palabra de la búsqueda debe aparecer en la tarjeta (título, sub o descripción) contemplando los sinónimos
      const matchPalabras = palabrasBusqueda.every(grupo =>
        grupo.some(sin => campoTotal.includes(sin))
      );

      const matchPor = matchExactoTitulo || matchPalabras;

      // Chequeo de Banners Asignados por el Usuario en el Editor
      let userAssignedBanner = false;
      let userExcludedBanner = false;
      if (window._bannerActualId && card.dataset.banners) {
        try {
          const b = JSON.parse(card.dataset.banners);
          if (b.includes(window._bannerActualId)) userAssignedBanner = true;
          else userExcludedBanner = true; // El usuario lo guardó, pero no seleccionó este banner
        } catch(e) {}
      }

      // Filtro banner por función precisa (sin falsos positivos)
      let matchBannerFn = false;
      if (window._filtroBannerFn) {
        matchBannerFn = window._filtroBannerFn(card);
      }

      // Filtro banner por keywords OR (modo legado)
      let matchBanner = false;
      if (window._filtroBanner && window._filtroBanner.length > 0) {
        const kw = campoTitulo;
        matchBanner = window._filtroBanner.some(opcion => kw.includes(opcion));
      }

      let matched = false;
      if (window._bannerActualId) {
        // Modo Banner Promocional
        if (userAssignedBanner) {
          matched = true; // Agregado explícitamente por el usuario
        } else if (!userExcludedBanner) {
          // Si no está excluido explícitamente, probamos el motor viejo
          matched = window._filtroBannerFn ? matchBannerFn : matchBanner;
        }
      } else {
        // Modo Búsqueda Normal
        matched = matchPor;
      }

      if (matched) {
        card.classList.remove('oculta', 'filtrando');
        hayResultados = true;
      } else {
        card.classList.add('oculta');
      }
    });
  });

  /* 🔥 OCULTAR UI DE CATEGORÍAS MIENTRAS SE BUSCA */
  const ocultar = buscando;
  const elementosCatalogo = document.querySelectorAll(
    '#catalogo-completo h3.categoria, #catalogo-completo .categoria-ui, #catalogo-completo .productos:not(#_sortFlatContainer), #catalogo-completo .separador-categoria, #catalogo-completo .dynamic-cat-wrapper'
  );
  elementosCatalogo.forEach(el => el.style.display = ocultar ? 'none' : '');

  // El botón "Menú de Productos" siempre visible — el usuario puede necesitarlo
  // en cualquier momento (búsqueda, filtro de carrusel, etc.)
  if (btnCategorias) btnCategorias.style.display = '';
  /* 🔥 OCULTAR PANEL DE CATEGORÍAS */
  if (categoriasNav) categoriasNav.style.display = ocultar ? 'none' : '';


  /* mensaje sin resultados */
  noResults.style.display = (!hayResultados && buscando) ? 'block' : 'none';
  // ───── separadores visuales entre categorías ─────
  limpiarSeparadores();

  if (buscando) {
    insertarSeparadoresEntreCategorias();
  }

  /* restaurar todo al limpiar */
  if (!buscando) {
    // Desocultar todas las cards
    document.querySelectorAll('.card').forEach(card => {
      card.classList.remove('oculta', 'filtrando');
    });
    // Restablecer TODOS los contenedores .productos a su estado visible
    // para que la próxima búsqueda encuentre sus contenedores correctamente
    document.querySelectorAll('.productos').forEach(el => {
      el.style.display = '';
    });
    noResults.style.display = 'none';
  }
});
const bubble = document.querySelector('.search-bubble');
const bubbleInput = document.getElementById('searchBubbleInput');
const mainSearch = document.getElementById('searchInput');

/* expandir burbuja */
bubble.addEventListener('click', () => {
  bubble.classList.add('active');
  bubbleInput.focus();
});

/* sincronizar con buscador principal */
bubbleInput.addEventListener('input', () => {
  mainSearch.value = bubbleInput.value;
  mainSearch.dispatchEvent(new Event('input'));

  // volver al inicio de los resultados
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* cerrar si queda vacío */
bubbleInput.addEventListener('blur', () => {
  if (!bubbleInput.value.trim()) {
    bubble.classList.remove('active');
  }
});

/* =========================
   ORDENAR RESULTADOS DE BÚSQUEDA
   (inyección segura – no modifica HTML ni CSS existentes)
========================= */
(function pixisSortBusqueda() {

  /* ── CSS inyectado ── */
  const _css = document.createElement('style');
  _css.textContent = `
    .search-sort-bar {
      display: none;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      margin: 0 auto 20px;
      max-width: 600px;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      backdrop-filter: blur(6px);
      flex-wrap: wrap;
      animation: sortBarIn .3s ease;
    }
    .search-sort-bar.visible { display: flex; }
    @keyframes sortBarIn {
      from { opacity:0; transform:translateY(-8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .search-sort-bar .sort-label {
      font-size: 13px;
      opacity: 0.75;
      white-space: nowrap;
      color: #fff;
    }
    .search-sort-select {
      padding: 7px 32px 7px 12px;
      border-radius: 20px;
      border: 1px solid rgba(0,255,213,0.4);
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2300ffd5' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      transition: border-color .25s;
    }
    .search-sort-select:hover, .search-sort-select:focus {
      border-color: #00ffd5;
      box-shadow: 0 0 10px rgba(0,255,213,.25);
    }
    .search-sort-select option { background: #1a1a2e; color: #fff; }
    #_sortFlatContainer {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      padding: 0;
      width: 100%;
    }
    @media (max-width: 768px) {
      .search-sort-bar { margin: 0 10px 15px; padding: 10px 14px; gap: 8px; }
      .search-sort-select { font-size: 12px; padding: 6px 28px 6px 10px; }
    }
  `;
  document.head.appendChild(_css);

  /* ── HTML inyectado ── */
  const bar = document.createElement('div');
  bar.className = 'search-sort-bar';
  bar.id = 'searchSortBar';
  bar.innerHTML = `
    <span class="sort-label">Ordenar por:</span>
    <label class="switch-precio" style="margin-left: 0;">
      <input type="checkbox" id="searchSortToggle" class="toggle-precio">
      <span class="slider"></span>
      <span class="switch-text">Precio menor a mayor</span>
    </label>
  `;

  const h2Prod = [...document.querySelectorAll('h2')]
    .find(el => el.textContent.includes('PRODUCTOS DISPONIBLES'));
  if (h2Prod) h2Prod.after(bar);

  /* ── Estado ── */
  let activeSort = null;

  /* ── Contenedor plano (se crea una vez, se reutiliza) ── */
  function obtenerFlatContainer() {
    let fc = document.getElementById('_sortFlatContainer');
    if (!fc) {
      fc = document.createElement('div');
      fc.id = '_sortFlatContainer';
      // Insertar justo antes del primer .productos del catálogo
      const primerProd = document.querySelector('.Gabinetes .productos');
      if (primerProd) primerProd.parentNode.insertBefore(fc, primerProd);
    }
    return fc;
  }

  /* ── Restaurar cards a sus posiciones originales ── */
  function restaurarOrigen() {
    const fc = document.getElementById('_sortFlatContainer');
    if (!fc) return;
    [...fc.children].forEach(card => {
      if (card._origParent) {
        try {
          // CRÍTICO: verificar que _origNext es hijo de _origParent
          const refOk = card._origNext
            && card._origNext.isConnected
            && card._origNext.parentNode === card._origParent;

          if (refOk) {
            card._origParent.insertBefore(card, card._origNext);
          } else {
            card._origParent.appendChild(card);
          }
        } catch(e) {
          try { card._origParent.appendChild(card); } catch(_) {}
        }
        // 🔑 Limpiar style.order residual del sort de categorías/busqueda anterior
        card.style.order = '';
        delete card._origParent;
        delete card._origNext;
      }
    });
  }

  /* ── Función principal de ordenamiento (DOM move – funciona entre secciones) ── */
  function aplicarOrdenBusqueda() {

    // Siempre restaurar primero para que las cards estén en sus .productos
    restaurarOrigen();

    // 1. Recoger TODAS las cards visibles del catálogo (incluyendo las inyectadas dinámicamente)
    const todasVisibles = [];
    document.querySelectorAll('#catalogo-completo .productos, #dynamic-catalog-container .productos').forEach(cont => {
      cont.querySelectorAll('.card:not(.oculta)').forEach(card => {
        todasVisibles.push(card);
      });
    });
    if (!todasVisibles.length) return;

    // 2. Guardar referencia de posición original (solo si no viene ya del flat container)
    todasVisibles.forEach(card => {
      if (!card._origParent) {
        card._origParent = card.parentNode;
        card._origNext   = card.nextSibling;
      }
    });

    // getP robusto: misma lógica que getPrice en ordenarProductos
    const getP = el => {
      const cash = el.dataset.cashPrice || el.querySelector('.btn-add-cart')?.dataset.priceLocal;
      if (cash && cash !== 'undefined') return parseInt(String(cash).replace(/\D/g, '')) || 0;
      const transfer = el.dataset.priceNum || el.dataset.price || el.querySelector('.btn-add-cart')?.dataset.price;
      if (transfer && transfer !== 'undefined') return parseInt(String(transfer).replace(/\D/g, '')) || 0;
      const text = el.querySelector('.precio')?.textContent || '0';
      return parseInt(text.replace(/\D/g, '')) || 0;
    };

    // 3. Ordenar: sin-stock SIEMPRE al final, luego por precio si toggle activo
    // Si toggle OFF (activeSort=null): return 0 = sort estable mantiene orden DOM original
    todasVisibles.sort((a, b) => {
      const aOff = a.classList.contains('sin-stock');
      const bOff = b.classList.contains('sin-stock');
      if (aOff && !bOff) return 1;
      if (!aOff && bOff) return -1;

      if (activeSort === 'az') {
        const nA = (a.dataset.title || a.querySelector('h3')?.textContent || '').toLowerCase();
        const nB = (b.dataset.title || b.querySelector('h3')?.textContent || '').toLowerCase();
        return nA.localeCompare(nB, 'es');
      }
      if (activeSort === 'price-asc')  return getP(a) - getP(b);
      if (activeSort === 'price-desc') return getP(b) - getP(a);
      return 0; // sin sort activo: sort estable = orden DOM original preservado
    });

    // 4. Mover al contenedor plano en el orden correcto
    // Siempre usamos flat container en modo búsqueda para garantizar sin-stock al final global
    const fc = obtenerFlatContainer();
    todasVisibles.forEach((card, i) => {
      fc.appendChild(card);
      card.style.order = i; // forzar orden explícito para anular style.order residual de categorías
    });
  }

  /* ── Cambio en el switch toggle ── */
  bar.addEventListener('change', e => {
    const toggle = e.target.closest('#searchSortToggle');
    if (!toggle) return;
    activeSort = toggle.checked ? 'price-asc' : null;
    aplicarOrdenBusqueda();
  });

  /* ── Sincronizar con el buscador ── */
  const sf = document.getElementById('searchInput');
  let _ultimaBusqueda = '';
  sf.addEventListener('input', () => {
    const valorActual = sf.value.trim();
    const buscando = valorActual.length > 0;

    // Si el término de búsqueda cambió, resetear el sort para no arrastrar estado anterior
    if (valorActual !== _ultimaBusqueda) {
      _ultimaBusqueda = valorActual;
      activeSort = null;
      const toggle = document.getElementById('searchSortToggle');
      if (toggle) toggle.checked = false;
      // Restaurar order residual en todas las cards
      document.querySelectorAll('.card').forEach(c => { c.style.order = ''; });
    }

    // Siempre restaurar antes de buscar (cards deben estar en sus .productos)
    restaurarOrigen();

    if (buscando) {
      requestAnimationFrame(() => {
        const hay = !!document.querySelector('.productos .card:not(.oculta)');
        if (hay) {
          bar.classList.add('visible');
          aplicarOrdenBusqueda(); // siempre aplicar: garantiza sin-stock al final aunque toggle esté OFF
        } else {
          bar.classList.remove('visible');
        }
      });
    } else {
      bar.classList.remove('visible');
      activeSort = null;
      const toggle = document.getElementById('searchSortToggle');
      if (toggle) toggle.checked = false;
      // Limpiar style.order residual en todas las cards al cancelar la búsqueda
      document.querySelectorAll('.card').forEach(c => { c.style.order = ''; });
    }
  });

  // Exponer restaurarOrigen para que el buscador principal pueda llamarla antes de filtrar
  window._pixisRestaurarOrigen = restaurarOrigen;

})();

/* =========================
   WhatsApp dinámico 
========================= */

document.addEventListener("click", function (e) {

  const btnWsp = e.target.closest(".btn-wsp");
  if (!btnWsp) return;

  e.preventDefault();

  const card = btnWsp.closest(".card");
  if (!card) return;

  const titulo = card.dataset.title || "Producto";
  const precio = card.dataset.price || "";
  const subcategoria = card.dataset.subcategoria || "";
  const descripcion = card.dataset.desc || "";


  const descCorta = descripcion
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 120);

  const mensaje =
    `Hola! 👋
Quiero consultar por este producto:

🖥️ ${titulo}
💰 Precio: ${precio}
📦 Categoría: ${subcategoria}

📝 ${descCorta}...


¿Está disponible?`;

  const telefono = "5493856970135"; // ← TU número real

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank");
});
const floatButtons = document.querySelectorAll(
  '.wsp-float, .btn-top, .search-bubble'
);

const footerFollow = document.querySelector('.footer-follow');

function stopFloatsfollowFooter() {

  if (window.innerWidth > 768) return; // solo telefono

  if (!footerFollow) return;

  const footerTop = footerFollow.getBoundingClientRect().top;
  const windowHeight = window.innerHeight;

  // distancia desde donde queremos que se frenen
  const limit = 100; // ← margen antes de "Seguinos"

  if (footerTop < windowHeight - limit) {

    const offset = (windowHeight - limit) - footerTop;

    floatButtons.forEach(btn => {
      btn.style.transform = `translateY(-${offset}px)`;
    });

  } else {

    floatButtons.forEach(btn => {
      btn.style.transform = `translateY(0)`;
    });

  }
}

/* =========================
   STOP FLOATS — DESKTOP (FIX REAL)
========================= */

const floatButtonsDesktop = document.querySelectorAll(
  '.wsp-float, .btn-top, .search-bubble'
);

const footerDesktop = document.querySelector('.footer-follow');

function stopFloatsDesktop() {

  // 👉 SOLO DESKTOP
  if (window.innerWidth <= 768) return;
  if (!footerDesktop) return;

  // posición REAL del footer dentro del documento
  const footerTop = footerDesktop.offsetTop;
  const footerHeight = footerDesktop.offsetHeight;

  // dónde está el scroll ahora
  const scrollY = window.scrollY + window.innerHeight;

  // distancia antes de tocar el footer
  const limit = 160; // podés ajustar 140 / 180 según estética

  // punto donde deben empezar a frenar
  const stopPoint = footerTop + limit;

  if (scrollY >= stopPoint) {

    const offset = scrollY - stopPoint;

    floatButtonsDesktop.forEach(btn => {
      btn.style.transform = `translateY(-${offset}px)`;
    });

  } else {

    floatButtonsDesktop.forEach(btn => {
      btn.style.transform = 'translateY(0)';
    });

  }
}
window.addEventListener('scroll', () => {
  // ✅ Botones flotantes fijos: se desactiva el movimiento al hacer scroll.
  // stopFloatsfollowFooter(); // mobile
  // stopFloatsDesktop();      // desktop
  
  if (window.scrollY > 50) {
    document.body.classList.add('scrolled');
  } else {
    document.body.classList.remove('scrolled');
  }
}, { passive: true });

window.addEventListener('resize', () => {
  // stopFloatsfollowFooter();
  // stopFloatsDesktop();
});
/* ============================================================
   BLOQUEO TOTAL PARA PRODUCTOS SIN STOCK
   - No abre modal
   - No permite consultar
   - No permite agregar al carrito
   - No ejecuta ningún evento interno
============================================================ */

document.addEventListener('click', function (e) {

  const card = e.target.closest('.card.sin-stock');
  if (!card) return;

  // ❌ Cancela absolutamente todo
  e.preventDefault();
  e.stopImmediatePropagation();

}, true); // ← usamos captura para frenar eventos antes que otros scripts
document.querySelectorAll('.btn-wsp').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
  });
});
/* =========================
   BLOQUEAR SCROLL BODY
========================= */

const toggleCart = document.getElementById('toggle-cart');

toggleCart?.addEventListener('change', () => {
  if (toggleCart.checked) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
const searchBubble = document.querySelector(".search-bubble");

if (toggleCart && searchBubble) {

  toggleCart.addEventListener("change", () => {

    if (window.innerWidth <= 768) {

      if (toggleCart.checked) {
        searchBubble.classList.add("hide-search-bubble");
      } else {
        searchBubble.classList.remove("hide-search-bubble");
      }

    }

  });

}
function showCartMessage() {

  const toast = document.getElementById("cart-toast");

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);

}

function generarPDFPresupuesto() {

  const { jsPDF } = window.jspdf;

  /* ── PROFORMA AUTOINCREMENTAL ── */
  let contador = localStorage.getItem("pixis_proforma");
  contador = contador ? parseInt(contador) + 1 : 1;
  localStorage.setItem("pixis_proforma", contador);
  const numeroProforma = contador.toString().padStart(6, "0");

  /* ── A4 PORTRAIT ── */
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;

  /* ── PALETA ── */
  const MORADO = [106, 13, 173];
  const AMARILLO = [255, 215, 0];
  const NEGRO = [0, 0, 0];
  const BLANCO = [255, 255, 255];
  const GRIS_T = [120, 120, 120];
  const GRIS_F = [242, 242, 242];
  const OSCURO = [30, 30, 30];
  const ROSA = [244, 204, 204];
  const VERDE_C = [200, 255, 200];
  const VERDE_D = [182, 215, 168];

  /* ── FECHA ── */
  const hoy = new Date();
  const fechaStr = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;
  /* ── VENCIMIENTO 72HS ── */
  const vencimiento = new Date(hoy);
  vencimiento.setHours(vencimiento.getHours() + 24);

  const fechaVenc = `${vencimiento.getDate()}/${vencimiento.getMonth() + 1}/${vencimiento.getFullYear()}`;

  /* ── DESCUENTO: 5% solo si efectivo + retiro local ── */
  const esEfectivoLocal = pagoEfectivo.checked && retiroLocal.checked;


  /* ── DATOS CLIENTE ── */
  const clienteNombre = document.getElementById("clienteNombre")?.value.trim() || "USUARIO CLIENTE";
  const localidad = inputLocalidad?.value.trim() || "—";
  const tieneEnvio = envioDomicilio?.checked;

  /* ════════════════════════════════════════
     BARRA SUPERIOR
  ════════════════════════════════════════ */
  doc.setFillColor(...MORADO);
  doc.rect(0, 0, W, 7, "F");

  /* ════════════════════════════════════════
     CABECERA: 3 COLUMNAS  (y: 8 – 68)
  ════════════════════════════════════════ */

  /* ── COL IZQUIERDA ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...GRIS_T);
  doc.text("PIXIS INFORMATICA", 8, 16);

  doc.setDrawColor(...GRIS_T);
  doc.setLineWidth(0.3);
  doc.line(8, 18, 68, 18);

  const infoEmpresa = [
    ["Dir:", "JUJUY 412 EDIF. SAN ANTONIO"],
    ["", "2 PISO OF. B"],
    ["Tel:", "+54 9 3856 97-0135"],
    ["Mail:", "PIXISINFORMATICA.CONTACTO@GMAIL.COM"],
    ["Web:", "whatsapp.com/channel/"],
    ["", "0029VaaDTIzBfxoF1SBOmj04"],
  ];
  let yInfo = 23;
  infoEmpresa.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...NEGRO);
    doc.text(lbl, 8, yInfo);
    doc.setFont("helvetica", "normal");
    doc.text(val, 18, yInfo);
    yInfo += 4.5;
  });

  /* ── COL CENTRAL ── */
  const xC = 105;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...NEGRO);
  doc.text("PRESUPUESTO", xC, 16, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("No valido como factura", xC, 21, { align: "center" });


  /* ── LOGO REAL PIXIS ── */

  const logoPIXIS = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAAtGVYSWZJSSoACAAAAAYAEgEDAAEAAAABAAAAGgEFAAEAAABWAAAAGwEFAAEAAABeAAAAKAEDAAEAAAACAAAAEwIDAAEAAAABAAAAaYcEAAEAAABmAAAAAAAAAGAAAAABAAAAYAAAAAEAAAAGAACQBwAEAAAAMDIxMAGRBwAEAAAAAQIDAACgBwAEAAAAMDEwMAGgAwABAAAA//8AAAKgBAABAAAA9AEAAAOgBAABAAAA9AEAAAAAAAAA4cNEAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFaWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTAzLTA2PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUc3bTN2RlNFZyZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRHBaczVIcTRVJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O0VtaWxpYSBWaW90dGkgZGEgQ29zdGEmIzM5O3MgQ2xhc3MmcXVvdDt9PC9BdHRyaWI6RGF0YT4KICAgICA8QXR0cmliOkV4dElkPjQ2MTRlMTFiLThjMWYtNGE4OC05NmVhLWM4ZDBhZGQyNTRlYTwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5URUNIIC0gMTwvcmRmOmxpPgogICA8L3JkZjpBbHQ+CiAgPC9kYzp0aXRsZT4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6cGRmPSdodHRwOi8vbnMuYWRvYmUuY29tL3BkZi8xLjMvJz4KICA8cGRmOkF1dGhvcj5QYWJsbyBNYWxkb25hZG88L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSBkb2M9REFHN20zdkZTRWcgdXNlcj1VQURwWnM1SHE0VSBicmFuZD1FbWlsaWEgVmlvdHRpIGRhIENvc3RhJiMzOTtzIENsYXNzPC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0ncic/PsztX0UAACAASURBVHic7H0HfFRV037+r9/r52tBivTeOymg0sSuWF5fxUZRsb3YGy1ld1PBjgUrdlAsqPSE9E1oIqL09BB67ySEkOTOf+bcM7tnLzfJBil+eB5/4y67d++WnDvPeWbmzAkI0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ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"
  doc.addImage(logoPIXIS, "PNG", xC - 14, 23, 28, 18);

  [[43, "Fecha", fechaStr], [53, "Validez hasta:", fechaVenc], [63, "N de Pro-forma", numeroProforma]].forEach(([y, lbl, val]) => {
    doc.setFillColor(245, 245, 245);
    doc.rect(xC - 24, y, 48, 5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...NEGRO);
    doc.text(lbl, xC, y + 3.5, { align: "center" });
    doc.setFillColor(255, 255, 255);
    doc.rect(xC - 24, y + 5, 48, 5, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(val, xC, y + 9.2, { align: "center" });
  });

  /* ── COL DERECHA — SERVICIOS ── */
  const xR = 141;
  const wR = 63;
  const hR = 58;

  doc.setFillColor(...OSCURO);
  doc.rect(xR, 8, wR, hR, "F");
  doc.setDrawColor(...AMARILLO);
  doc.setLineWidth(1);
  doc.rect(xR, 8, wR, hR);

  const servicios = [
    { t: "SERVICIO ESPECIALIZADO EN:", b: true, s: 6.5, c: AMARILLO },
    { t: "DIAGNOSTICOS", b: false, s: 6, c: BLANCO },
    { t: "REPARACION Y MANTENIMIENTOS", b: true, s: 6.5, c: AMARILLO },
    { t: "COMPUTADORAS DE ESCRITORIOS", b: false, s: 6, c: BLANCO },
    { t: "NETBOOKS Y NOTEBOOK", b: false, s: 6, c: BLANCO },
    { t: "", b: false, s: 2, c: BLANCO },
    { t: "VENTA DE INSUMOS EN:", b: true, s: 6.5, c: AMARILLO },
    { t: "REPUESTOS DE HARDWARE", b: false, s: 6, c: BLANCO },
    { t: "PERIFERICOS OFICINAS O GAMER", b: false, s: 6, c: BLANCO },
    { t: "", b: false, s: 2, c: BLANCO },
    { t: "SOLUCIONES TERMICAS", b: true, s: 6.5, c: AMARILLO },
    { t: "PASTAS TERMICAS ALTO REND.", b: false, s: 6, c: BLANCO },
    { t: "PADS TERMICOS / COOLERS", b: false, s: 6, c: BLANCO },
    { t: "", b: false, s: 2, c: BLANCO },
    { t: "Cables y Adaptadores", b: true, s: 6.5, c: AMARILLO },
    { t: "", b: false, s: 2, c: BLANCO },
    { t: "ATENCION Y ASESORAMIENTO", b: true, s: 6.5, c: AMARILLO },
    { t: "PERSONALIZADO", b: true, s: 6.5, c: AMARILLO },
  ];
  let yS = 13;
  servicios.forEach(({ t, b, s, c }) => {
    doc.setFontSize(s);
    doc.setFont("helvetica", b ? "bold" : "normal");
    doc.setTextColor(...c);
    if (t) doc.text(t, xR + 2, yS);
    yS += s * 0.38 + 1;
  });

  /* ════════════════════════════════════════
     CLIENTE + TÉRMINOS  (y: 70 – 98)
  ════════════════════════════════════════ */
  const yCliente = 75;

  doc.setFillColor(248, 248, 248);
  doc.rect(8, yCliente, 125, 26, "F");

  doc.setFillColor(...MORADO);
  doc.rect(8, yCliente, 28, 6, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...BLANCO);
  doc.text("CLIENTE", 22, yCliente + 4.2, { align: "center" });

  doc.setTextColor(...NEGRO); doc.setFontSize(8);

  // NOMBRE
  doc.setFont("helvetica", "bold"); doc.text("NOMBRE:", 10, yCliente + 10);
  doc.setFont("helvetica", "normal"); doc.text(clienteNombre, 33, yCliente + 10);

  // LOCALIDAD (reemplaza teléfono)
  doc.setFont("helvetica", "bold"); doc.text("LOCALIDAD:", 10, yCliente + 16);
  doc.setFont("helvetica", "normal"); doc.text(localidad, 33, yCliente + 16);

  // ENVIO A DOMICILIO (reemplaza email)
  doc.setFont("helvetica", "bold"); doc.text("ENVIO A DOMICILIO:", 10, yCliente + 22);
  doc.setFont("helvetica", "normal");
  doc.text(tieneEnvio ? "Si" : "No - RETIRO EN LOCAL", 50, yCliente + 22);

  /* Términos y Condiciones */
  const xTerm = 138;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...NEGRO);
  doc.text("Terminos y Condiciones", xTerm, yCliente + 5);

  doc.setFont("helvetica", "normal"); doc.setFontSize(7);
  const terminos = [
    "1.- Duracion de la Oferta: PRECIOS",
    "    SUJETOS AL TIPO DE CAMBIO.",
    "    PUEDEN CAMBIAR SIN PREVIO AVISO",
    "2.- Anticipo del 100% antes de la",
    "    produccion",
    "3.- Entregado el producto o ejecutado",
    "    el servicio no existen devoluciones.",
  ];
  let yTerm = yCliente + 11;
  terminos.forEach(t => { doc.text(t, xTerm, yTerm); yTerm += 3.5; });
  /* ── WATERMARK LOGO PIXIS ── */

  doc.setGState(new doc.GState({ opacity: 0.06 }));

  doc.addImage(
    logoPIXIS,   // tu mismo base64
    "PNG",
    25,          // posición X
    110,         // posición Y
    160,         // ancho
    110          // alto
  );

  doc.setGState(new doc.GState({ opacity: 1 }));
  /* ════════════════════════════════════════
     TABLA PRODUCTOS  (startY: 100)
  ════════════════════════════════════════ */
  let totalBase = 0;
  const rows = cart.map(item => {

    const precio = pagoEfectivo?.checked
      ? Number(item.priceLocal ?? item.price ?? 0)
      : Number(item.price ?? 0);

    const sub = precio * (item.qty ?? 1);
    totalBase += sub;

    return [
      { content: item.qty ?? 1, styles: { halign: "center" } },
      item.name ?? "Producto",
      { content: `$${(precio || 0).toLocaleString()}`, styles: { halign: "right" } },
      { content: `$${(sub || 0).toLocaleString()}`, styles: { halign: "right" } },
    ];

  });

  doc.autoTable({
    startY: 110,
    head: [[
      { content: "CANTIDAD", styles: { halign: "center" } },
      { content: "PRODUCTO", styles: { halign: "center" } },
      { content: "P. UNITARIO", styles: { halign: "right" } },
      { content: "TOTAL", styles: { halign: "right" } },
    ]],
    body: rows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: MORADO, textColor: BLANCO, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: GRIS_F },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 110 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
    },
    margin: { left: 8, right: 8 },
    pageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.5,
      overflow: 'linebreak'
    }
  });

  let yFin = doc.lastAutoTable.finalY + 8;

  /* espacio restante en hoja */
  const espacioRestante = 289 - yFin;

  /* espacio necesario para totales + cuotas */
  let espacioNecesario = 60;

  if (pagoTarjeta && pagoTarjeta.checked) {
    espacioNecesario = 110;
  }

  /* si no entra → nueva hoja */
  if (espacioRestante < espacioNecesario) {

    doc.setFillColor(...MORADO);
    doc.rect(0, 289, W, 8, "F");

    doc.addPage();

    doc.setFillColor(...MORADO);
    doc.rect(0, 0, W, 7, "F");

    yFin = 20;

  }



  let totalFinal;

  if (pagoTarjeta?.checked) {

    totalFinal = calcularTotalConCuotas(totalBase);

  } else {

    // 💥 EFECTIVO Y TRANSFERENCIA = MISMO TOTAL BASE
    totalFinal = totalBase;

  }

  /* ════════════════════════════════════════
     BLOQUE TOTALES
  ════════════════════════════════════════ */
  const xLbl = 120;
  const xVal = W - 10;

  doc.setFontSize(8.5); doc.setTextColor(...NEGRO);

  // Total parcial
  doc.setFont("helvetica", "normal"); doc.text("Total parcial:", xLbl, yFin);
  doc.setFont("helvetica", "bold"); doc.text(`$${totalBase.toLocaleString()}`, xVal, yFin, { align: "right" });
  yFin += 5;


  // NETO
  doc.setFont("helvetica", "normal"); doc.setTextColor(...NEGRO);
  doc.text("NETO:", xLbl, yFin);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalFinal.toLocaleString()}`, xVal, yFin, { align: "right" });
  yFin += 5;

  // Envío Delivery
  doc.setFont("helvetica", "normal"); doc.text("Envio Delivery:", xLbl, yFin);
  doc.setFont("helvetica", "bold"); doc.text("0,00", xVal, yFin, { align: "right" });
  yFin += 6;

  /* ── FILA ROSA DESTACADA ── */
  let textoDestacado;

  if (pagoTarjeta?.checked) {
    textoDestacado = "PAGO CON TARJETA DE CREDITO";
  } else if (esEfectivoLocal) {
    textoDestacado = "PRECIO EFECTIVO EN LOCAL";
  } else {
    textoDestacado = "PAGO POR TRANSFERENCIA";
  }
  doc.setFillColor(...ROSA);
  doc.rect(xLbl - 3, yFin - 5, W - xLbl + 1, 9, "F");
  doc.setDrawColor(200, 100, 100);
  doc.setLineWidth(0.3);
  doc.rect(xLbl - 3, yFin - 5, W - xLbl + 1, 9);

  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...NEGRO);
  doc.text(textoDestacado, xLbl - 1, yFin);
  doc.setFontSize(12);
  doc.text(`$${totalFinal.toLocaleString()}`, xVal, yFin, { align: "right" });

  yFin += 8;

  /* ════════════════════════════════════════
     TABLA CUOTAS — solo si tarjeta
     Si no entra en la página, salto limpio
  ════════════════════════════════════════ */
  if (pagoTarjeta && pagoTarjeta.checked) {

    const cuotasSel = parseInt(selectCuotas.value) || 0;
    // Altura estimada: header 10mm + 5 filas × 14mm = 80mm
    const altoTabla = 55;
    const espacioLib = 289 - yFin;

    if (espacioLib < altoTabla) {
      // Barra pie en página actual
      doc.setFillColor(...MORADO);
      doc.rect(0, 289, W, 8, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...BLANCO);
      doc.text("PIXIS INFORMATICA  |  +54 9 3856 97-0135  |  PIXISINFORMATICA.CONTACTO@GMAIL.COM", W / 2, 294, { align: "center" });
      doc.addPage();
      doc.setFillColor(...MORADO);
      doc.rect(0, 0, W, 7, "F");
      yFin = 15;
    }

    const filasC = [1, 3, 6, 9, 12].map(c => {
      const tasa = tasasCuotas[c];
      const totalFin = Math.round(totalBase * tasa);
      const cuotaVal = Math.round(totalFin / c);
      return [
        `${c} CUOTA${c > 1 ? "S" : ""} DE:`,
        { content: `$${cuotaVal.toLocaleString()}`, styles: { halign: "right" } },
        { content: `$${totalFin.toLocaleString()}`, styles: { halign: "right" } },
        c,
      ];
    });

    doc.autoTable({
      startY: yFin,
      tableWidth: 120,
      head: [[
        {
          content: "PAGA CON TU TARJETA DE CREDITO EN:", colSpan: 2,
          styles: { halign: "center", fillColor: MORADO, textColor: BLANCO, fontStyle: "bold", fontSize: 8 }
        },
        {
          content: "TOTAL",
          styles: { halign: "center", fillColor: MORADO, textColor: BLANCO, fontStyle: "bold", fontSize: 8 }
        },
        { content: "", styles: { fillColor: MORADO, cellWidth: 0.1 } },
      ]],
      body: filasC,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 38, halign: "right" },
        2: { cellWidth: 38, halign: "right" },
        3: { cellWidth: 0.1 },
      },
      didParseCell(data) {
        if (data.section === "body") {
          const cuotaFila = data.row.raw[3];
          if (cuotaFila === cuotasSel) {
            data.cell.styles.fillColor = VERDE_C;
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = NEGRO;
          }
          if (data.column.index === 3) {
            data.cell.styles.textColor = BLANCO;
            data.cell.styles.fillColor = BLANCO;
            data.cell.styles.lineColor = BLANCO;
            data.cell.styles.lineWidth = 0;
          }
        }
      },
      margin: { left: 45, right: 45 },
      pageBreak: "avoid",   // <-- fuerza que toda la tabla quede junta
    });

    yFin = doc.lastAutoTable.finalY + 6;
  }

  /* ── "Gracias por la Preferencia!!!" ── */
  const yGracias = 282;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...MORADO);
  doc.text("¡¡ Gracias por la Preferencia !!", W / 2, yGracias, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);

  doc.text(
    "Documento generado digitalmente por PIXIS INFORMATICA",
    W / 2,
    yGracias - 5,
    { align: "center" }
  );

  /* ════════════════════════════════════════
     BARRA INFERIOR
  ════════════════════════════════════════ */
  doc.setFillColor(...MORADO);
  doc.rect(0, 289, W, 8, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...BLANCO);
  doc.text(
    "PIXIS INFORMATICA  |  +54 9 3856 97-0135  |  PIXISINFORMATICA.CONTACTO@GMAIL.COM",
    W / 2, 294, { align: "center" }
  );

  const pdfBlob = doc.output("blob");
  const pdfFilename = `Presupuesto_PIXIS_${numeroProforma}.pdf`;

  // Guardar el blob globalmente para que el checkout lo use si es necesario
  window._lastPresupuestoPDF = { blob: pdfBlob, filename: pdfFilename };

  // Forzar descarga del presupuesto en todos los dispositivos
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const lightCSS = document.getElementById("lightmode");

function toggleTheme() {
  const lightmode = document.getElementById("lightmode");

  // HEADER
  const gamerIcon = document.getElementById("gamerIcon");
  const sunIcon = document.getElementById("sunIcon");
  const text = document.getElementById("themeText");

  // BURBUJA
  const gamerIconBubble = document.getElementById("gamerIconBubble");
  const sunIconBubble = document.getElementById("sunIconBubble");
  const textBubble = document.getElementById("themeTextBubble");

  // BODY para clase light-mode
  const body = document.body;

  if (lightmode.disabled) {
    lightmode.disabled = false;

    // HEADER
    if (gamerIcon) gamerIcon.style.display = "none";
    if (sunIcon) sunIcon.style.display = "block";
    if (text) text.textContent = "MODO OFICINA";

    // BURBUJA
    if (gamerIconBubble) gamerIconBubble.style.display = "none";
    if (sunIconBubble) sunIconBubble.style.display = "block";
    if (textBubble) textBubble.textContent = "MODO OFICINA";

    // Clase CSS para ocultar botón en desktop
    body.classList.add("light-mode");

    localStorage.setItem("theme", "light");

  } else {
    lightmode.disabled = true;

    // HEADER
    if (gamerIcon) gamerIcon.style.display = "block";
    if (sunIcon) sunIcon.style.display = "none";
    if (text) text.textContent = "MODO GAMER";

    // BURBUJA
    if (gamerIconBubble) gamerIconBubble.style.display = "block";
    if (sunIconBubble) sunIconBubble.style.display = "none";
    if (textBubble) textBubble.textContent = "MODO GAMER";

    // Quitar clase CSS
    body.classList.remove("light-mode");

    localStorage.setItem("theme", "gamer");
  }
}

window.onload = function () {
  const lightmode = document.getElementById("lightmode");
  const theme = localStorage.getItem("theme");

  // HEADER
  const gamerIcon = document.getElementById("gamerIcon");
  const sunIcon = document.getElementById("sunIcon");
  const text = document.getElementById("themeText");

  // BURBUJA
  const gamerIconBubble = document.getElementById("gamerIconBubble");
  const sunIconBubble = document.getElementById("sunIconBubble");
  const textBubble = document.getElementById("themeTextBubble");

  if (theme === "light") {
    lightmode.disabled = false;

    // HEADER
    if (gamerIcon) gamerIcon.style.display = "none";
    if (sunIcon) sunIcon.style.display = "block";
    if (text) text.textContent = "MODO OFICINA";

    // BURBUJA
    if (gamerIconBubble) gamerIconBubble.style.display = "none";
    if (sunIconBubble) sunIconBubble.style.display = "block";
    if (textBubble) textBubble.textContent = "MODO OFICINA";

    // Clase CSS
    document.body.classList.add("light-mode");
  } else {
    lightmode.disabled = true;

    // HEADER
    if (gamerIcon) gamerIcon.style.display = "block";
    if (sunIcon) sunIcon.style.display = "none";
    if (text) text.textContent = "MODO GAMER";

    // BURBUJA
    if (gamerIconBubble) gamerIconBubble.style.display = "block";
    if (sunIconBubble) sunIconBubble.style.display = "none";
    if (textBubble) textBubble.textContent = "MODO GAMER";

    // Quitar clase CSS
    document.body.classList.remove("light-mode");
  }
};

/* =============================================
   VARIABLES GLOBALES DEL MENÚ
   ============================================= */
const btnCategorias = document.getElementById("btnCategorias");
const categorias = document.querySelector(".categorias-nav");
const categoriasContenedor = document.getElementById("categorias");

/* =============================================
   FUNCIONES DE UTILIDAD
   ============================================= */
function toggleScrollLock(lock) {
  if (lock) {
    document.body.classList.add("no-scroll");
  } else {
    document.body.classList.remove("no-scroll");
  }
}

function ocultarBurbuja() {
  const bubble = document.getElementById("themeBubble");
  if (bubble) bubble.style.display = "none";
}

function mostrarBurbuja() {
  const bubble = document.getElementById("themeBubble");
  if (bubble) bubble.style.display = "flex";
}

/* =============================================
   MENÚ DE PRODUCTOS: LÓGICA Y AUTO-CIERRE
   ============================================= */
window.closePixisMenu = function() {
  const burger = document.querySelector(".burger-menu");
  const overlay = document.querySelector(".menu-overlay");

  // Siempre limpiar todo, sin importar el estado previo
  if (categoriasContenedor) categoriasContenedor.style.marginBottom = "0px";
  if (burger) burger.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
  toggleScrollLock(false);
  if (categorias) categorias.classList.remove("active");
  // MOBILE FIX: el drawer usa .categorias-nav.active para el slide-in
  if (categoriasNav) categoriasNav.classList.remove("active");
};

if (btnCategorias && categorias) {
  btnCategorias.addEventListener("click", (e) => {
    e.stopPropagation();
    categorias.classList.toggle("active");
    const burger = document.querySelector(".burger-menu");
    const overlay = document.querySelector(".menu-overlay");

    if (categorias.classList.contains("active")) {
      // Marcar que el menú acaba de abrirse (bloquea el scroll-close por 400ms)
      window._menuJustOpened = true;
      setTimeout(() => { window._menuJustOpened = false; }, 400);

      // Asegurar que la lista de categorías sea visible (puede estar oculta por el buscador)
      if (categoriasNav) categoriasNav.style.display = '';
      // MOBILE FIX: agregar active en .categorias-nav para el slide-in del drawer
      if (categoriasNav) categoriasNav.classList.add('active');

      if (burger) burger.classList.add("open");
      if (overlay) overlay.classList.add("active");
      if (window.innerWidth <= 768) {
        toggleScrollLock(true);
      } else {
        const height = categorias.scrollHeight;
        categoriasContenedor.style.marginBottom = (height + 20) + "px";
      }
    } else {
      window.closePixisMenu();
    }
  });

  // 1. Cerrar al hacer clic en categorías (Delegación para que funcione con contenido dinámico)
  categorias.addEventListener('click', (e) => {
    if (e.target.closest('.categorias-lista a')) {
      setTimeout(window.closePixisMenu, 150);
    }
  });

  // 2. Cerrar al hacer scroll (auto-hide)
  // _menuJustOpened previene que micro-scrolls del click cierren el menú al instante
  let lastScrollTime = 0;
  window.addEventListener('scroll', () => {
    const now = Date.now();
    if (!window._menuJustOpened && now - lastScrollTime > 300 && window.scrollY > 150) {
      window.closePixisMenu();
      lastScrollTime = now;
    }
  }, { passive: true });

  // 3. Cerrar al hacer clic fuera (Ignorar si se hace clic en el editor)
  document.addEventListener('click', (e) => {
    if (categorias.classList.contains('active')) {
      // Si el elemento ya no está en el DOM (orphaned), probablemente fue por un re-render del editor. Ignorar.
      if (e.target && !e.target.isConnected) return;

      const isEditorClick = e.target.closest('#pixis-editor-topbar, #pixis-side-panel, .pixis-modal-overlay, #pixis-element-toolbar, #pixis-editor-toast');
      if (!categoriasContenedor.contains(e.target) && e.target !== btnCategorias && !isEditorClick) {
        window.closePixisMenu();
      }
    }
  });
}

/* =============================================
   MENÚ MOBILE: INYECCIÓN
   ============================================= */
function initPixisMenuUI() {
  const headerCenter = document.querySelector(".header-center");
  const logoContainer = document.querySelector(".logo-container");
  if (!headerCenter || !logoContainer || !btnCategorias) return;

  if (!document.querySelector(".burger-menu")) {
    const burger = document.createElement("div");
    burger.className = "burger-menu";
    burger.innerHTML = `<span></span><span></span><span></span>`;
    headerCenter.insertBefore(burger, logoContainer);
    burger.addEventListener("click", (e) => {
      e.stopPropagation(); // evita que burbujee al document y cierre el menú al instante
      btnCategorias.click();
    });
  }

  if (!document.querySelector(".menu-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      btnCategorias.click();
    });
  }
}

onPixisDOMReady(initPixisMenuUI);

// NUEVA FUNCIONALIDAD: Filtrar categorias ("solo su sector")
// Los enlaces se inyectan dinámicamente → usamos delegación en el contenedor

window.abrirCategoria = function(targetId, fromHistory = false) {
    if (!targetId) return;

    // --- LIMPIEZA DE NAVEGACIÓN ---
    // Al elegir una categoría del menú, reseteamos búsquedas y banners para evitar "choques"
    if (searchInput) {
        searchInput.value = '';
        // Disparamos el evento input para que el motor de búsqueda limpie las clases 'oculta'
        searchInput.dispatchEvent(new Event('input'));
    }
    window._bannerActualId = null;
    window._filtroBanner = null;
    window._filtroBannerFn = null;
    
    // Guardar categoria activa para resaltarla al reabrir el menú
    window._categoriaActiva = targetId;
    actualizarEnlaceActivo();

    // Actualizar URL para que sea compartible de forma directa
    // El cache buster diario fuerza un re-scrape automático en redes sociales.
    if (fromHistory !== true && !(window.location.search.includes('edit=true'))) {
        history.pushState({ categoria: targetId }, "", "?categoria=" + targetId + "&" + getCacheBuster());
    }

    // 1. Cerrar el menu desplegable y resetear margen
    categorias.classList.remove("active");
    const burger = document.querySelector(".burger-menu");
    const overlay = document.querySelector(".menu-overlay");
    if (burger) burger.classList.remove("open");
    if (overlay) overlay.classList.remove("active");

    if (window.innerWidth <= 768) {
      toggleScrollLock(false);
    }

    if (categoriasContenedor) categoriasContenedor.style.marginBottom = "0px";

    // 2. Seleccionar todos los elementos del catalogo
    //    (titulos, ui de filtros, los contenedores de productos y los separadores)
    const elementosCatalogo = document.querySelectorAll('.Gabinetes h3.categoria, .Gabinetes .categoria-ui, .Gabinetes .productos, .Gabinetes .separador-categoria, .Gabinetes .dynamic-cat-wrapper');

    // 3. Ocultar todos por defecto
    elementosCatalogo.forEach(el => el.style.display = "none");

    // 4. ELIMINADA LÓGICA 'TODAS' SEGÚN PETICIÓN DEL USUARIO

    // Si es una categoría en específico
    const catalogoCompleto = document.getElementById("catalogo-completo");
    
    if (catalogoCompleto) catalogoCompleto.style.display = "block";

    // Ocupamos un barrido total para que no quede nada del inicio
    const selectoresPortada = [
      '.hero-container', 
      '.destacados', 
      '#nuevosIngresosSection', 
      '#reelsSection', 
      '#aprendeSection',
      '.ofertas-container',
      '.banner-informativo'
    ];
    selectoresPortada.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
    });

    // 5. Mostrar solo los elementos correspondientes a la categoria
    const targetH3 = document.getElementById(targetId);
    if (targetH3) {
      targetH3.style.display = "";

      // ¿Está dentro de un wrapper dinámico?
      const dynWrapper = targetH3.closest('.dynamic-cat-wrapper');
      if (dynWrapper) {
        // Sección dinámica: mostrar el wrapper y su contenido
        dynWrapper.style.display = "";
        dynWrapper.querySelectorAll('.categoria-ui, .productos').forEach(el => {
          el.style.display = "";
        });
      } else {
        // Sección estática: recorrer hermanos directos
        let nextEl = targetH3.nextElementSibling;
        while (nextEl && !nextEl.matches('h3.categoria, h2')) {
          nextEl.style.display = "";
          nextEl = nextEl.nextElementSibling;
        }
      }

      // Scroll a la sección
      targetH3.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

// Delegación: funciona aunque los enlaces se generen dinámicamente por state.js
const categoriasNavContainer = document.querySelector('.categorias-nav');
if (categoriasNavContainer) {
  categoriasNavContainer.addEventListener('click', (e) => {
    const enlace = e.target.closest('.categorias-lista a');
    if (!enlace) return;
    if (e.button === 1 || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const targetId = enlace.getAttribute('href').replace('#', '');
    window.abrirCategoria(targetId);
  });
}

onPixisDOMReady(() => {
    if (window.location.hash) {
        try {
            const rawHash = window.location.hash.replace("#", "");
            const hash = decodeURIComponent(rawHash);
            
            // Verificar que el ID exista para no abrir catálogo al azar
            if (document.getElementById(hash) && document.getElementById(hash).classList.contains('categoria')) {
                setTimeout(() => {
                    window.abrirCategoria(hash);
                }, 600); // Pequeño retraso para dar tiempo al css y js inicial
            }
        } catch(e) {
            console.error("Error decodificando hash:", e);
        }
    }
});

/* Resaltar enlace activo cada vez que se abre el menú o cambia la categoría */
function actualizarEnlaceActivo() {
  const activa = window._categoriaActiva;
  // Buscamos enlaces frescos en el DOM (importante porque pueden ser dinámicos)
  const enlaces = document.querySelectorAll('.categorias-nav a');
  enlaces.forEach(a => {
    const id = a.getAttribute('href').replace('#', '');
    if (activa && id === activa) {
      a.classList.add('cat-activa');
    } else {
      a.classList.remove('cat-activa');
    }
  });
}

btnCategorias.addEventListener('click', () => {
  if (categorias.classList.contains('active')) {
    actualizarEnlaceActivo();
  }
});

// Nueva Funcion global goHome para el boton del logo
window.goHome = function (fromHistory = false) {
  const catalogo = document.getElementById("catalogo-completo");
  const destacados = document.querySelector(".destacados");
  const nuevosIngresos = document.getElementById("nuevosIngresosSection");
  const hero = document.querySelector(".hero-container");

  // ✅ Limpiar la URL: elimina ?banner=..., ?producto=... o cualquier query param
  // Sin esto, si el usuario refresca después de ver un banner, volvería a cargar el banner
  if (fromHistory !== true && (window.location.search || window.location.hash)) {
    history.replaceState(null, '', window.location.pathname);
  }

  // Limpiar memoria de navegación al volver a inicio a propósito
  sessionStorage.removeItem('pixisAppState');
  window._categoriaActiva = null;
  if (typeof actualizarEnlaceActivo === 'function') actualizarEnlaceActivo();

  // Ocultar catálogo y resultados
  if (catalogo) catalogo.style.display = "none";

  // Mostrar Portada y Secciones Iniciales (Barrido Total)
  const selectoresPortada = [
    '.hero-container', 
    '.destacados', 
    '#nuevosIngresosSection', 
    '#reelsSection', 
    '#aprendeSection',
    '.ofertas-container',
    '.banner-informativo'
  ];
  selectoresPortada.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.style.display = "block");
  });


  // Limpiar Búsqueda preventivamente sin loop
  const searchInp = document.getElementById("searchInput");
  if (searchInp) {
    searchInp.value = "";
    // Limpiar también la burbuja de búsqueda si existe
    const bubbleInp = document.getElementById("searchBubbleInput");
    if (bubbleInp) bubbleInp.value = "";
    // Limpiar banners activos
    window._filtroBanner   = null;
    window._filtroBannerFn = null;
    window._bannerActualId = null;
    // Resetear estado de cards y contenedores
    document.querySelectorAll('.card').forEach(card => card.classList.remove('oculta', 'filtrando'));
    document.querySelectorAll('.productos').forEach(el => { el.style.display = ''; });
    const noRes = document.getElementById('noResults');
    if (noRes) noRes.style.display = 'none';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Asegurar que el menú se cierre al volver a inicio
  if (window.closePixisMenu) window.closePixisMenu();
};

// Asegurar comportamiento SPA del logo mediante listener (inmune a borrado de onclick en HTML)
document.addEventListener('click', function(e) {
  const logoLink = e.target.closest('.logo-container');
  if (logoLink) {
    e.preventDefault();
    window.goHome();
  }
});

onPixisDOMReady(() => {
  aplicarPrecioEspecial();
});
function aplicarPrecioEspecial() {

  document.querySelectorAll(".card").forEach(card => {

    const precioEl = card.querySelector(".precio");
    const btn = card.querySelector(".btn-add-cart"); // ✅ TU CLASE REAL

    if (!precioEl || !btn) return;

    // evitar reprocesar
    if (precioEl.closest(".precio-box")) return;

    const precioLocal = btn.dataset.priceLocal;

    if (!precioLocal) return;

    const precio = Number(precioLocal);

    const wrapper = document.createElement("div");
    wrapper.className = "precio-box";

    const label = document.createElement("span");
    label.textContent = "PRECIO ESPECIAL";
    label.className = "precio-label";

    const nuevoPrecio = document.createElement("span");
    nuevoPrecio.className = "precio";
    nuevoPrecio.textContent = `$${precio.toLocaleString()}`;

    wrapper.appendChild(label);
    wrapper.appendChild(nuevoPrecio);

    precioEl.replaceWith(wrapper);

  });

}



// DRAG TO SCROLL PARA LOS CARRUSELES
onPixisDOMReady(() => {
  const sliders = document.querySelectorAll('.carousel');

  sliders.forEach(slider => {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
      isDown = true;
      slider.style.cursor = 'grabbing';
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
      isDown = false;
      slider.style.cursor = 'grab';
    });

    slider.addEventListener('mouseup', () => {
      isDown = false;
      slider.style.cursor = 'grab';
    });

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2; // velocidad de arrastre
      slider.scrollLeft = scrollLeft - walk;
    });
  });
});

/* =========================
   COMPARTIR PRODUCTOS Y CARGA POR URL
========================= */

// Funcionalidad al botón "Compartir enlace" del modal
const btnShareLink = document.getElementById("btnShareLink");
if (btnShareLink) {
  // Texto de confirmación oculto junto al botón
  const copyText = document.createElement("span");
  copyText.textContent = "✅ Enlace copiado";
  copyText.style.cssText = "color:#b026ff; font-weight:bold; font-size:14px; margin-left:10px; opacity:0; transition:opacity 0.3s; vertical-align:middle; pointer-events:none;";
  btnShareLink.parentNode.insertBefore(copyText, btnShareLink.nextSibling);

  const buildProductUrl = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const basePath = window.location.origin + '/share.php';

    if (window.productoActual) {
      const prodId = window.productoActual.id || (window.productoActual.name ? window.productoActual.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
      if (prodId) {
        return basePath + '?producto=' + prodId + '&cc=' + timestamp;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const prodParam = params.get('producto');
    if (prodParam) {
      return basePath + '?producto=' + prodParam + '&cc=' + timestamp;
    }

    const catParam = params.get('categoria');
    if (catParam) {
      return basePath + '?categoria=' + catParam + '&cc=' + timestamp;
    }

    const bannerParam = params.get('banner');
    if (bannerParam) {
      return basePath + '?banner=' + bannerParam + '&cc=' + timestamp;
    }

    return basePath + '?cc=' + timestamp;
  };

  btnShareLink.addEventListener("click", () => {
    const shareUrl = buildProductUrl();
    navigator.clipboard.writeText(shareUrl).then(() => {
      btnShareLink.style.transform = "scale(1.2)";
      copyText.style.opacity = "1";

      setTimeout(() => {
        btnShareLink.style.transform = "scale(1)";
        copyText.style.opacity = "0";
      }, 2000); // El texto desaparece a los 2 segundos

    }).catch(err => console.error("Fallo al copiar: ", err));
  });
}

(function () {
  const metaConfig = [
    { id: 'pixis-og-title', attr: 'property', name: 'og:title' },
    { id: 'pixis-og-description', attr: 'property', name: 'og:description' },
    { id: 'pixis-og-image', attr: 'property', name: 'og:image' },
    { id: 'pixis-og-url', attr: 'property', name: 'og:url' },
    { id: 'pixis-twitter-card', attr: 'name', name: 'twitter:card' },
    { id: 'pixis-twitter-title', attr: 'name', name: 'twitter:title' },
    { id: 'pixis-twitter-description', attr: 'name', name: 'twitter:description' },
    { id: 'pixis-twitter-image', attr: 'name', name: 'twitter:image' }
  ];

  const defaultDescription = 'Tienda de computación online en Santiago del Estero. Productos, ofertas y servicio técnico especializado.';
  const defaultImage = window.location.origin + '/img/logo_pixis.png';

  const createMeta = ({ id, attr, name, content }) => {
    let el = document.head.querySelector(`#${id}`);
    if (!el) {
      el = document.createElement('meta');
      el.id = id;
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const normalizeImage = src => {
    if (!src) return defaultImage;
    const normalized = src.replace(/\\/g, '/').replace(/^\/?/, '/');
    return window.location.origin + normalized;
  };

  const getSlug = title => title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const getCardBySlug = slug => {
    return Array.from(document.querySelectorAll('.card:not(.sin-stock):not(.yt-card)')).find(card => {
      const title = card.dataset.title;
      return title && getSlug(title) === slug;
    });
  };

  const applyMeta = ({ title, description, image, url }) => {
    createMeta({ id: 'meta-og-title', attr: 'property', name: 'og:title', content: title });
    createMeta({ id: 'meta-og-desc', attr: 'property', name: 'og:description', content: description });
    createMeta({ id: 'meta-og-image', attr: 'property', name: 'og:image', content: image });
    createMeta({ id: 'meta-og-url', attr: 'property', name: 'og:url', content: url });
    
    // Twitter (reutilizamos los mismos contenidos)
    createMeta({ id: 'pixis-twitter-title', attr: 'name', name: 'twitter:title', content: title });
    createMeta({ id: 'pixis-twitter-description', attr: 'name', name: 'twitter:description', content: description });
    createMeta({ id: 'pixis-twitter-image', attr: 'name', name: 'twitter:image', content: image });
  };

  const applyDefaultMeta = () => {
    applyMeta({
      title: 'Pixis Informática | Especialistas en Computadoras Gamer',
      description: defaultDescription,
      image: defaultImage,
      url: window.location.origin + window.location.pathname
    });
  };

  const getProductMeta = card => {
    const title = (card?.dataset.title || document.title) + ' - Pixis Informática';
    const cashPriceNum = card?.dataset.cashPrice || card?.dataset.priceLocal || '0';
    const cashPrice = '$' + Number(cashPriceNum).toLocaleString('es-AR');
    
    // Descripción estructurada: Solo Precio Especial
    const description = 'Pixis Informática | Precio Especial: ' + cashPrice;
    
    const image = normalizeImage(card?.dataset.img);
    const url = window.location.origin + window.location.pathname + '?producto=' + getSlug(card?.dataset.title || '');
    return { title, description, image, url };
  };

  window.updateMetaFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const prodParam = params.get('producto');
    if (prodParam) {
      const card = getCardBySlug(prodParam);
      if (card) {
        applyMeta(getProductMeta(card));
        return;
      }
    }
    applyDefaultMeta();
  };

  const updateMetaFromCard = card => {
    if (!card) return;
    applyMeta(getProductMeta(card));
  };

  document.addEventListener('click', e => {
    const card = e.target.closest('.card:not(.sin-stock):not(.yt-card)');
    if (!card) return;
    // Excluimos botones pero permitimos el link general de la tarjeta
    if (e.target.closest('.btn-add-cart') || e.target.closest('.btn-wsp')) return;
    if (e.target.closest('a') && !e.target.closest('.full-card-link')) return;
    window.requestAnimationFrame(() => updateMetaFromCard(card));
  }, { capture: true });


  onPixisDOMReady(window.updateMetaFromUrl);
  window.addEventListener('popstate', window.updateMetaFromUrl);
  window.addEventListener('popstate', () => {
    if (typeof window.syncAppStateFromUrl === 'function') {
      window.syncAppStateFromUrl(true);
    }
  });
})();

// Permite abrir producto especifico en otra pestaña presionando botón del MEDIO del ratón
document.addEventListener('auxclick', e => {
  if (e.button === 1) { // 1 es el botón del centro (ruedita)
    const card = e.target.closest('.card:not(.sin-stock):not(.yt-card)');
    // Nos aseguramos que no estén clickeando un botón (agregar al carrito, whatsapp) ni tampoco un enlace
    if (card && !e.target.closest('.btn-add-cart') && !e.target.closest('.btn-wsp') && !e.target.closest('a')) {
      e.preventDefault();
      // Usar pixisId (ID real del producto) para que share.php lo encuentre correctamente
      const prodId = card.dataset.pixisId || card.dataset.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      window.open(window.location.pathname + "?producto=" + prodId, "_blank");
    }
  }
});

// Auto abrir modal (Lógica movida al evento pixis:productos-renderizados para mayor fiabilidad)

// Mobile fixes: auto-adjust and swipe to refresh
(function () {
  // Inject CSS for mobile responsiveness
  const style = document.createElement('style');
  style.id = 'mobile-fix-styles';
  style.textContent = `
        @media (max-width: 768px) {
            :root {
                --mobile-header-top: 36px;
            }
            * {
                box-sizing: border-box;
            }
            body {
                width: 100%;
                overflow-x: clip;
            }
            .card img, .card video {
                max-width: 100%;
                width: 100%;
                height: auto;
            }
            .card {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .cart, .modal {
                width: 100%;
                max-width: 100%;
            }
            .header-top-text {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                z-index: 30001 !important;
                backdrop-filter: blur(12px) !important;
                padding: 6px 10px !important;
                margin: 0 !important;
                border-bottom: 1px solid rgba(255,255,255,0.08) !important;
            }
            .main-header {
                position: fixed !important;
                top: var(--mobile-header-top) !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                z-index: 30000 !important;
                margin: 0 !important;
                border-top: none !important;
            }
            .main-header::before,
            .main-header::after {
                display: none !important;
            }
            .categorias-nav .categorias-header {
                position: sticky !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 10001 !important;
                background: rgba(14, 0, 22, 0.95) !important;
                backdrop-filter: blur(12px) !important;
            }
            .categorias-nav .categorias-header > * {
                z-index: 10002 !important;
            }
        }
    `;
  document.head.appendChild(style);

  const fixMobileHeaderOffset = () => {
    const topText = document.querySelector('.header-top-text');
    const mainHeader = document.querySelector('.main-header');
    if (!topText || !mainHeader) return;
    const height = topText.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--mobile-header-top', `${height}px`);
    topText.style.width = '100%';
    mainHeader.style.width = '100%';
  };

  window.addEventListener('load', fixMobileHeaderOffset);
  window.addEventListener('resize', fixMobileHeaderOffset);
  fixMobileHeaderOffset();

  // Swipe to refresh functionality (Restored with menu-open check)
  let startY = 0;
  let isRefreshing = false;

  function handleTouchStart(e) {
    if (window.scrollY === 0 && !isRefreshing) {
      startY = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e) {
    if (startY === 0 || isRefreshing) return;
    
    // Si el menú de categorías está abierto, bloqueamos el refresco
    if (typeof categorias !== 'undefined' && categorias && categorias.classList.contains("active")) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const diffY = currentY - startY;
    
    // Solo si el usuario desliza hacia abajo (diffY > 0) y está al tope
    // Aumentamos el umbral a 150 para que sea un gesto más intencional
    if (diffY > 150 && window.scrollY === 0) {
      e.preventDefault();
      isRefreshing = true;
      location.reload();
    }
  }

  function handleTouchEnd() {
    startY = 0;
    isRefreshing = false;
  }

  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
})();
window.initPixisCarousels = function() {
  document.querySelectorAll(".carousel-wrapper").forEach(wrapper => {
    const carousel = wrapper.querySelector(".carousel");
    const btnPrev = wrapper.querySelector(".btn-prev");
    const btnNext = wrapper.querySelector(".btn-next");

    if (!carousel || !btnPrev || !btnNext) return;

    // Remover listeners viejos si existen (clonando nodos o simplemente no agregando duplicados)
    // Para simplificar, usaremos onclick directo o verificaremos una marca
    if (btnNext.dataset.init === 'true') return;
    btnNext.dataset.init = 'true';

    const scrollAmount = 320;

    btnNext.addEventListener("click", () => {
      carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });

    btnPrev.addEventListener("click", () => {
      carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
  });
};

window.initPixisBanners = function() {
  document.querySelectorAll('.banner-carousel').forEach(carousel => {
    const container = carousel.closest('.banner-carousel-outer') || carousel;
    const track = carousel.querySelector('.banner-track');
    const slides = carousel.querySelectorAll('.banner-slide');
    const btnPrev = container.querySelector('.banner-prev');
    const btnNext = container.querySelector('.banner-next');
    const dotsContainer = container.querySelector('.banner-dots');

    if (!track || slides.length === 0) return;

    // Evitar doble init
    if (carousel.dataset.init === 'true') return;
    carousel.dataset.init = 'true';

    let index = 0;
    let intervalo;

    /* DOTS */
    if (dotsContainer) {
      dotsContainer.innerHTML = ''; // Limpiar previos
      slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('banner-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          index = i;
          update();
        });
        dotsContainer.appendChild(dot);
      });
    }

    const dots = container.querySelectorAll('.banner-dot');

    function update() {
      if (!slides[index]) return;
      const slideWidth = slides[0].offsetWidth;
      track.style.transform = `translateX(-${index * slideWidth}px)`;

      dots.forEach(dot => dot.classList.remove('active'));
      dots[index]?.classList.add('active');
    }

    btnNext?.addEventListener('click', () => {
      index = (index + 1) % slides.length;
      update();
    });

    btnPrev?.addEventListener('click', () => {
      index = (index - 1 + slides.length) % slides.length;
      update();
    });

    function start() {
      clearInterval(intervalo);
      intervalo = setInterval(() => {
        index = (index + 1) % slides.length;
        update();
      }, 3000);
    }

    function stop() {
      clearInterval(intervalo);
    }

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    window.addEventListener('resize', update);

    update();
    start();
  });
};

// Ejecución inicial
onPixisDOMReady(() => {
  window.initPixisCarousels();
  window.initPixisBanners();
});
document.querySelector('.copy-email').addEventListener('click', () => {
  const email = document.querySelector('.email-text').textContent;

  navigator.clipboard.writeText(email);

  const toast = document.getElementById('toast-copy');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
});

/* =======================================================
   PERSISTENCIA DE ESTADO (SPA) - MANTENER VISTA AL RECARGAR 
======================================================= */
window.addEventListener('beforeunload', () => {
  const estado = {
      categoriaActiva: window._categoriaActiva || null,
      searchText: document.getElementById('searchInput') ? document.getElementById('searchInput').value : "",
      scrollY: window.scrollY
  };
  // Si estamos en home, categoría y search estarán null/vacíos.
  sessionStorage.setItem('pixisAppState', JSON.stringify(estado));
});

onPixisDOMReady(() => {
  const restaurarEstadoF5 = () => {
      const savedStateStr = sessionStorage.getItem('pixisAppState');
      if (!savedStateStr) return;

      try {
          const estado = JSON.parse(savedStateStr);
          
          // 1. Restaurar Búsqueda
          if (estado.searchText && estado.searchText.trim() !== '') {
              const searchInp = document.getElementById('searchInput');
              if (searchInp) {
                  searchInp.value = estado.searchText;
                  searchInp.dispatchEvent(new Event('input'));
              }
          } 
          // 2. Restaurar Categoría (solo si no hay búsqueda activa)
          else if (estado.categoriaActiva) {
              const catLink = document.querySelector(`.categorias-nav a[href="#${estado.categoriaActiva}"], a[href="#${estado.categoriaActiva}"]`);
              
              const limpiarHomeParaCat = () => {
                  // Ocultar TODO lo que sea portada de forma agresiva
                  const selectoresPortada = [
                    '.hero-container', 
                    '.destacados', 
                    '#nuevosIngresosSection', 
                    '#reelsSection', 
                    '#aprendeSection',
                    '.ofertas-container',
                    '.banner-informativo'
                  ];
                  selectoresPortada.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });
                  });
                  
                  const catalogoCompleto = document.getElementById("catalogo-completo");
                  if (catalogoCompleto) catalogoCompleto.style.display = "block";
              };

              if (catLink && catLink.offsetParent !== null) {
                 limpiarHomeParaCat();
                 catLink.click();
              } else {
                 // Si la barra no es visible o falla el click, replicamos la lógica directa
                 window._categoriaActiva = estado.categoriaActiva;
                 if (typeof actualizarEnlaceActivo === 'function') actualizarEnlaceActivo();
                 
                 limpiarHomeParaCat();

                 // Preparar catalogo (ocultar todo y mostrar solo la categoría target)
                 document.querySelectorAll('#catalogo-completo h3.categoria, #catalogo-completo .categoria-ui, #catalogo-completo .productos, #catalogo-completo .separador-categoria').forEach(el => el.style.display = "none");
                 
                 const targetH3 = document.getElementById(estado.categoriaActiva);
                 if (targetH3) {
                     targetH3.style.display = "";
                     let nextEl = targetH3.nextElementSibling;
                     while (nextEl && !nextEl.matches('h3.categoria, h2')) {
                         nextEl.style.display = "";
                         nextEl = nextEl.nextElementSibling;
                     }
                 }
              }
          }
          
          // 3. Restaurar Scroll
          if (estado.scrollY) {
              setTimeout(() => {
                  window.scrollTo({ top: estado.scrollY, left: 0, behavior: 'instant' });
              }, 400); // Un poco más de tiempo para asegurar estabilidad
          }
          
      } catch(e) {
          console.error("Error restaurando estado de Pixis (F5):", e);
      }
  };

  // EJECUCIÓN CONDICIONAL: Esperar a que state.js termine si es necesario
  if (window._productosListos) {
    restaurarEstadoF5();
  } else {
    document.addEventListener('pixis:state-ready', restaurarEstadoF5);
  }
});

// (Función movida al inicio para evitar errores de carga)
