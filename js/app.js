/* =====================================================
   GEOPORTAL EDUCATIVO - FUNCIONES PRINCIPALES
   Distrito 06D04 Colta-Guamote
   ===================================================== */

// =====================================================
// CONFIGURACIÓN
// =====================================================
const CONFIG = {
    url: 'https://uvwecebqdevrapyqypic.supabase.co/rest/v1',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2d2VjZWJxZGV2cmFweXF5cGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4Mzc5MzMsImV4cCI6MjA4MTQxMzkzM30.uHrAfH06IT65D9LSkLmJHQNV9SdUOfIkftl9KqJRYb0',
    telegram: {
        token: '8554533382:AAGO2MFVDEcAGw9Vwl7yfx4Vdjek7CV_V4E',
        chatId: '1732673300'
    }
};

const headers = {
    'apikey': CONFIG.key,
    'Authorization': `Bearer ${CONFIG.key}`,
    'Content-Type': 'application/json'
};

// =====================================================
// VARIABLES GLOBALES
// =====================================================
let instituciones = [];
let moduloActual = '';
let modoCapturaMapa = false;
let marcadorTemporal = null;
let erroresCarga = [];
let map;
let layers;

// =====================================================
// ESTILOS DE CAPAS
// =====================================================
const styles = {
    area: { color: '#4299e1', weight: 3, fillOpacity: 0.08, fillColor: '#4299e1' },
    parroquias: { color: '#805ad5', weight: 2, fillOpacity: 0.05, fillColor: '#805ad5' },
    urbano: { color: '#ed8936', weight: 1, fillOpacity: 0.25, fillColor: '#ed8936' },
    edificios: { color: '#ecc94b', weight: 1, fillOpacity: 0.5, fillColor: '#ecc94b' },
    vias1: { color: '#c53030', weight: 5 },
    vias2: { color: '#e53e3e', weight: 4 },
    vias3: { color: '#718096', weight: 2 },
    vias4: { color: '#a0aec0', weight: 1 }
};

// =====================================================
// INICIALIZACIÓN DEL MAPA
// =====================================================
function initMap() {
    map = L.map('map').setView([-1.9, -78.7], 11);

    const baseMaps = {
        'Mapa Base': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }),
        'Satélite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        }),
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        })
    };

    baseMaps['Mapa Base'].addTo(map);
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    // Inicializar grupos de capas
    layers = {
        area: L.layerGroup().addTo(map),
        parroquias: L.layerGroup().addTo(map),
        urbano: L.layerGroup(),
        instituciones: L.layerGroup().addTo(map),
        edificios: L.layerGroup(),
        vias1: L.layerGroup(),
        vias2: L.layerGroup(),
        vias3: L.layerGroup(),
        vias4: L.layerGroup(),
        repInfra: L.markerClusterGroup({
            iconCreateFunction: function (cluster) {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: '<div>' + count + '</div>',
                    className: 'marker-cluster marker-cluster-infraestructura',
                    iconSize: L.point(40, 40)
                });
            },
            maxClusterRadius: 90,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        }).addTo(map),
        repOper: L.markerClusterGroup({
            iconCreateFunction: function (cluster) {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: '<div>' + count + '</div>',
                    className: 'marker-cluster marker-cluster-operaciones',
                    iconSize: L.point(40, 40)
                });
            },
            maxClusterRadius: 90,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        }).addTo(map),
        repRiesgos: L.markerClusterGroup({
            iconCreateFunction: function (cluster) {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: '<div>' + count + '</div>',
                    className: 'marker-cluster marker-cluster-riesgos',
                    iconSize: L.point(40, 40)
                });
            },
            maxClusterRadius: 90,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        }).addTo(map)
    };

    // Coordenadas en header
    map.on('mousemove', function (e) {
        document.getElementById('coords').textContent =
            `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });

    // Clic en mapa para captura de ubicación
    map.on('click', function (e) {
        if (modoCapturaMapa) {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;

            document.getElementById('inp-lat').value = lat.toFixed(6);
            document.getElementById('inp-lon').value = lon.toFixed(6);

            mostrarMarcadorTemporal(lat, lon);

            modoCapturaMapa = false;
            map.getContainer().style.cursor = '';
            document.getElementById('btn-mapa').innerHTML = '🗺️ ✓ Ubicación seleccionada';
            document.getElementById('instruccion-mapa').classList.remove('visible');
        }
    });

    // Control de capas
    setupLayerControls();
}

// =====================================================
// SISTEMA DE NOTIFICACIONES
// =====================================================
function mostrarNotificacion(tipo, titulo, mensaje, duracion = 5000) {
    const contenedor = document.getElementById('notificaciones');
    const id = 'notif-' + Date.now();

    const iconos = {
        error: '❌',
        warning: '⚠️',
        success: '✅'
    };

    const notif = document.createElement('div');
    notif.id = id;
    notif.className = `notificacion ${tipo}`;
    notif.innerHTML = `
        <span class="icono">${iconos[tipo]}</span>
        <div class="contenido">
            <div class="titulo">${titulo}</div>
            <div class="mensaje">${mensaje}</div>
        </div>
        <span class="cerrar" onclick="cerrarNotificacion('${id}')">×</span>
    `;

    contenedor.appendChild(notif);

    if (duracion > 0) {
        setTimeout(() => cerrarNotificacion(id), duracion);
    }

    return id;
}

function cerrarNotificacion(id) {
    const notif = document.getElementById(id);
    if (notif) {
        notif.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notif.remove(), 300);
    }
}

function marcarCapaError(layerId) {
    const checkbox = document.getElementById(layerId);
    if (checkbox) {
        const layerItem = checkbox.closest('.layer-item');
        if (layerItem) {
            layerItem.classList.add('error');
        }
    }
}

function limpiarErrorCapa(layerId) {
    const checkbox = document.getElementById(layerId);
    if (checkbox) {
        const layerItem = checkbox.closest('.layer-item');
        if (layerItem) {
            layerItem.classList.remove('error');
        }
    }
}

// =====================================================
// FUNCIONES DE CARGA DE CAPAS
// =====================================================
async function callRPC(functionName) {
    try {
        const res = await fetch(`${CONFIG.url}/rpc/${functionName}`, {
            method: 'POST',
            headers: headers,
            body: '{}'
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`Error en ${functionName}:`, e);
        return [];
    }
}

async function loadAreaEstudio() {
    try {
        const data = await callRPC('get_area_estudio');
        if (!data || data.length === 0) throw new Error('Sin datos');
        data.forEach(row => {
            if (row.geojson) {
                const layer = L.geoJSON(row.geojson, { style: styles.area });
                layer.bindTooltip(row.can_descri || 'Área de estudio');
                layers.area.addLayer(layer);
            }
        });
        limpiarErrorCapa('lyr-area');
    } catch (e) {
        console.error('Error cargando área de estudio:', e);
        marcarCapaError('lyr-area');
        erroresCarga.push('Área de estudio');
    }
}

async function loadParroquias() {
    try {
        const data = await callRPC('get_parroquias');
        if (!data || data.length === 0) throw new Error('Sin datos');
        data.forEach(row => {
            if (row.geojson) {
                const layer = L.geoJSON(row.geojson, { style: styles.parroquias });
                layer.bindTooltip(row.par_descri || 'Parroquia');
                layers.parroquias.addLayer(layer);
            }
        });
        limpiarErrorCapa('lyr-parroquias');
    } catch (e) {
        console.error('Error cargando parroquias:', e);
        marcarCapaError('lyr-parroquias');
        erroresCarga.push('Parroquias');
    }
}

async function loadZonasUrbanas() {
    try {
        const data = await callRPC('get_zonas_urbanas');
        if (!data || data.length === 0) throw new Error('Sin datos');
        data.forEach(row => {
            if (row.geojson) {
                const layer = L.geoJSON(row.geojson, { style: styles.urbano });
                layers.urbano.addLayer(layer);
            }
        });
        limpiarErrorCapa('lyr-urbano');
    } catch (e) {
        console.error('Error cargando zonas urbanas:', e);
        marcarCapaError('lyr-urbano');
        erroresCarga.push('Zonas urbanas');
    }
}

async function loadInstituciones() {
    try {
        const res = await fetch(`${CONFIG.url}/base_instituciones_educativas?select=*`, {
            headers: { 'apikey': CONFIG.key, 'Authorization': `Bearer ${CONFIG.key}` }
        });
        if (!res.ok) throw new Error('Error de conexión');
        const data = await res.json();
        if (!data || data.length === 0) throw new Error('Sin datos');

        instituciones = data;

        let total = 0, estudiantes = 0, docentes = 0;
        let conteoAlerta = 0, conteoPequena = 0, conteoMediana = 0, conteoGrande = 0;

        data.forEach(inst => {
            if (inst.lon && inst.lat) {
                const clasificacion = clasificarInstitucion(inst.total_estudiantes);
                
                // Contar por categoría
                if (clasificacion.categoria === 'Alerta') conteoAlerta++;
                else if (clasificacion.categoria === 'Pequeña') conteoPequena++;
                else if (clasificacion.categoria === 'Mediana') conteoMediana++;
                else if (clasificacion.categoria === 'Grande') conteoGrande++;

                const marker = L.circleMarker([inst.lat, inst.lon], {
                    radius: clasificacion.radius,
                    fillColor: clasificacion.color,
                    color: clasificacion.borderColor,
                    weight: 2,
                    fillOpacity: 0.9
                });

                marker.bindTooltip(`
                    <strong>${inst.institucion || 'Institución'}</strong><br>
                    <span style="color: ${clasificacion.color}; font-weight: 600;">● ${clasificacion.categoria}</span> - ${inst.total_estudiantes || 0} estudiantes
                `, {
                    className: 'custom-tooltip'
                });

                marker.on('click', () => showInfo({
                    title: inst.institucion || 'Sin nombre',
                    content: `
                        <p><strong>Código AMIE:</strong> <span>${inst.codigo_amie || '-'}</span></p>
                        <p><strong>Parroquia:</strong> <span>${inst.parroquia || '-'}</span></p>
                        <p><strong>Tipo:</strong> <span>${inst.tipo_oferta || '-'}</span></p>
                        <p><strong>Sostenimiento:</strong> <span>${inst.sostenimiento || '-'}</span></p>
                        <p><strong>Estudiantes:</strong> <span>${inst.total_estudiantes || 0}</span></p>
                        <p><strong>Docentes:</strong> <span>${Math.round(inst.total_docentes) || 0}</span></p>
                        <p><strong>Clasificación:</strong> <span style="color: ${clasificacion.color}; font-weight: 600;">${clasificacion.categoria}</span></p>
                    `
                }));

                layers.instituciones.addLayer(marker);
                total++;
                estudiantes += parseInt(inst.total_estudiantes) || 0;
                docentes += parseFloat(inst.total_docentes) || 0;
            }
        });

        updateStats(total, estudiantes, Math.round(docentes), {
            alerta: conteoAlerta,
            pequena: conteoPequena,
            mediana: conteoMediana,
            grande: conteoGrande
        });
        limpiarErrorCapa('lyr-instituciones');
    } catch (e) {
        console.error('Error cargando instituciones:', e);
        marcarCapaError('lyr-instituciones');
        erroresCarga.push('Instituciones');
    }
}

async function loadEdificios() {
    try {
        const data = await callRPC('get_edificios');
        if (!data || data.length === 0) throw new Error('Sin datos');
        data.forEach(row => {
            if (row.geojson) {
                const layer = L.geoJSON(row.geojson, { style: styles.edificios });
                layer.bindTooltip(row.nombre || 'Edificio');
                layers.edificios.addLayer(layer);
            }
        });
        limpiarErrorCapa('lyr-edificios');
    } catch (e) {
        console.error('Error cargando edificios:', e);
        marcarCapaError('lyr-edificios');
        erroresCarga.push('Edificios');
    }
}

async function loadVias(orden, layerGroup, style) {
    const layerId = `lyr-vias${orden}`;
    try {
        const data = await callRPC(`get_vias_${orden}orden`);
        if (!data || data.length === 0) throw new Error('Sin datos');
        data.forEach(row => {
            if (row.geojson) {
                const layer = L.geoJSON(row.geojson, { style: style });
                layerGroup.addLayer(layer);
            }
        });
        limpiarErrorCapa(layerId);
    } catch (e) {
        console.error(`Error cargando vías ${orden} orden:`, e);
        marcarCapaError(layerId);
        erroresCarga.push(`Vías ${orden}° orden`);
    }
}

function getColorBySostenimiento(sost) {
    if (!sost) return '#a0aec0';
    const colors = {
        'FISCAL': '#e53e3e',
        'FISCOMISIONAL': '#4299e1',
        'PARTICULAR': '#48bb78',
        'MUNICIPAL': '#805ad5'
    };
    return colors[sost.toUpperCase()] || '#a0aec0';
}

// Clasificación por número de estudiantes
function clasificarInstitucion(numEstudiantes) {
    const num = parseInt(numEstudiantes) || 0;
    if (num <= 20) {
        return {
            categoria: 'Alerta',
            color: '#e53e3e',
            borderColor: '#c53030',
            icon: '⚠️',
            radius: 6
        };
    } else if (num <= 100) {
        return {
            categoria: 'Pequeña',
            color: '#ed8936',
            borderColor: '#dd6b20',
            icon: '🏫',
            radius: 7
        };
    } else if (num <= 400) {
        return {
            categoria: 'Mediana',
            color: '#4299e1',
            borderColor: '#3182ce',
            icon: '🏫',
            radius: 9
        };
    } else {
        return {
            categoria: 'Grande',
            color: '#48bb78',
            borderColor: '#38a169',
            icon: '🏫',
            radius: 11
        };
    }
}

function updateStats(total, estudiantes, docentes, clasificacion = null) {
    let clasificacionHTML = '';
    
    if (clasificacion) {
        clasificacionHTML = `
            <div class="clasificacion-grid">
                <div class="clasif-item alerta">
                    <span class="clasif-value">${clasificacion.alerta}</span>
                    <span class="clasif-label">⚠️ Alerta (0-20)</span>
                </div>
                <div class="clasif-item pequena">
                    <span class="clasif-value">${clasificacion.pequena}</span>
                    <span class="clasif-label">Pequeñas (21-100)</span>
                </div>
                <div class="clasif-item mediana">
                    <span class="clasif-value">${clasificacion.mediana}</span>
                    <span class="clasif-label">Medianas (101-400)</span>
                </div>
                <div class="clasif-item grande">
                    <span class="clasif-value">${clasificacion.grande}</span>
                    <span class="clasif-label">Grandes (+401)</span>
                </div>
            </div>
        `;
    }

    document.getElementById('stats').innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="value">${total}</span>
                <span class="label">Instituciones</span>
            </div>
            <div class="stat-item">
                <span class="value">${estudiantes.toLocaleString()}</span>
                <span class="label">Estudiantes</span>
            </div>
            <div class="stat-item">
                <span class="value">${docentes.toLocaleString()}</span>
                <span class="label">Docentes</span>
            </div>
        </div>
        ${clasificacionHTML}
    `;
}

// =====================================================
// CARGA DE REPORTES
// =====================================================
async function loadReportesInfraestructura() {
    try {
        layers.repInfra.clearLayers();
        const res = await fetch(`${CONFIG.url}/rep_infraestructura?select=*&order=fecha_reporte.desc`, {
            headers: { 'apikey': CONFIG.key, 'Authorization': `Bearer ${CONFIG.key}` }
        });
        if (!res.ok) throw new Error('Error de conexión');
        const data = await res.json();

        data.forEach(rep => {
            if (rep.lat && rep.lon) {
                const marker = L.marker([rep.lat, rep.lon], {
                    icon: crearIconoReporte('#e53e3e', '🏫')
                });
                marker.bindTooltip(`${rep.tipo_reporte} - ${rep.institucion || 'Sin institución'}`);
                marker.on('click', () => showInfo({
                    title: '🏫 ' + rep.tipo_reporte,
                    content: `
                        <p><strong>Institución:</strong> <span>${rep.institucion || '-'}</span></p>
                        <p><strong>Código AMIE:</strong> <span>${rep.codigo_amie || '-'}</span></p>
                        <p><strong>Reportado por:</strong> <span>${rep.nombre_reporta}</span></p>
                        <p><strong>Estudiantes afectados:</strong> <span>${rep.num_estudiantes || '-'}</span></p>
                        <p><strong>Descripción:</strong> <span>${rep.descripcion || '-'}</span></p>
                        <p><strong>Estado:</strong> <span>${rep.estado}</span></p>
                        <p><strong>Fecha:</strong> <span>${new Date(rep.fecha_reporte).toLocaleString()}</span></p>
                    `
                }));
                layers.repInfra.addLayer(marker);
            }
        });
        limpiarErrorCapa('lyr-rep-infra');
    } catch (e) {
        console.error('Error cargando reportes infraestructura:', e);
        marcarCapaError('lyr-rep-infra');
        erroresCarga.push('Rep. Infraestructura');
    }
}

async function loadReportesOperaciones() {
    try {
        layers.repOper.clearLayers();
        const res = await fetch(`${CONFIG.url}/rep_operaciones?select=*&order=fecha_reporte.desc`, {
            headers: { 'apikey': CONFIG.key, 'Authorization': `Bearer ${CONFIG.key}` }
        });
        if (!res.ok) throw new Error('Error de conexión');
        const data = await res.json();

        data.forEach(rep => {
            if (rep.lat && rep.lon) {
                const marker = L.marker([rep.lat, rep.lon], {
                    icon: crearIconoReporte('#4299e1', '📦')
                });
                marker.bindTooltip(`${rep.tipo_reporte} - ${rep.porcentaje_avance || 0}%`);
                marker.on('click', () => showInfo({
                    title: '📦 ' + rep.tipo_reporte,
                    content: `
                        <p><strong>Institución:</strong> <span>${rep.institucion || '-'}</span></p>
                        <p><strong>Programado:</strong> <span>${rep.cantidad_programada || 0}</span></p>
                        <p><strong>Entregado:</strong> <span>${rep.cantidad_entregada || 0}</span></p>
                        <p><strong>Avance:</strong> <span>${rep.porcentaje_avance || 0}%</span></p>
                        <p><strong>Observaciones:</strong> <span>${rep.observaciones || '-'}</span></p>
                        <p><strong>Estado:</strong> <span>${rep.estado}</span></p>
                        <p><strong>Fecha:</strong> <span>${new Date(rep.fecha_reporte).toLocaleString()}</span></p>
                    `
                }));
                layers.repOper.addLayer(marker);
            }
        });
        limpiarErrorCapa('lyr-rep-oper');
    } catch (e) {
        console.error('Error cargando reportes operaciones:', e);
        marcarCapaError('lyr-rep-oper');
        erroresCarga.push('Rep. Operaciones');
    }
}

async function loadReportesRiesgos() {
    try {
        layers.repRiesgos.clearLayers();
        const res = await fetch(`${CONFIG.url}/rep_riesgos?select=*&order=fecha_reporte.desc`, {
            headers: { 'apikey': CONFIG.key, 'Authorization': `Bearer ${CONFIG.key}` }
        });
        if (!res.ok) throw new Error('Error de conexión');
        const data = await res.json();

        data.forEach(rep => {
            if (rep.lat && rep.lon) {
                const icono = rep.tipo_reporte === 'Simulacro' ? '🛡️' : '⚠️';
                const marker = L.marker([rep.lat, rep.lon], {
                    icon: crearIconoReporte('#ed8936', icono)
                });
                marker.bindTooltip(`${rep.tipo_reporte} - ${rep.tipo_simulacro || rep.tipo_evento || ''}`);
                marker.on('click', () => showInfo({
                    title: icono + ' ' + rep.tipo_reporte,
                    content: `
                        <p><strong>Institución:</strong> <span>${rep.institucion || '-'}</span></p>
                        <p><strong>Tipo:</strong> <span>${rep.tipo_simulacro || rep.tipo_evento || '-'}</span></p>
                        ${rep.afectacion ? `<p><strong>Afectación:</strong> <span>${rep.afectacion}</span></p>` : ''}
                        <p><strong>Descripción:</strong> <span>${rep.descripcion || '-'}</span></p>
                        <p><strong>Estado:</strong> <span>${rep.estado}</span></p>
                        <p><strong>Fecha:</strong> <span>${new Date(rep.fecha_reporte).toLocaleString()}</span></p>
                    `
                }));
                layers.repRiesgos.addLayer(marker);
            }
        });
        limpiarErrorCapa('lyr-rep-riesgos');
    } catch (e) {
        console.error('Error cargando reportes riesgos:', e);
        marcarCapaError('lyr-rep-riesgos');
        erroresCarga.push('Rep. Riesgos');
    }
}

function crearIconoReporte(color, emoji) {
    return L.divIcon({
        className: 'reporte-icon',
        html: `<div style="background:${color}; width:32px; height:32px; border-radius:50%; border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-size:14px;">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

// =====================================================
// TELEGRAM
// =====================================================
async function enviarTelegram(mensaje) {
    try {
        const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CONFIG.telegram.chatId,
                text: mensaje,
                parse_mode: 'HTML'
            })
        });
        console.log('Notificación Telegram enviada');
    } catch (e) {
        console.error('Error enviando Telegram:', e);
    }
}

function formatearMensajeTelegram(modulo, datos) {
    const fecha = new Date().toLocaleString('es-EC');
    const mapa = `https://www.google.com/maps?q=${datos.lat},${datos.lon}`;

    let mensaje = '';

    if (modulo === 'infraestructura') {
        mensaje = `🏫 <b>REPORTE DE INFRAESTRUCTURA</b>\n\n`;
        mensaje += `📍 <b>Institución:</b> ${datos.institucion || 'No especificada'}\n`;
        mensaje += `🔖 <b>Código AMIE:</b> ${datos.codigo_amie || 'N/A'}\n`;
        mensaje += `⚠️ <b>Tipo:</b> ${datos.tipo_reporte}\n`;
        mensaje += `👥 <b>Estudiantes afectados:</b> ${datos.num_estudiantes || 'No especificado'}\n`;
        mensaje += `📝 <b>Descripción:</b> ${datos.descripcion || 'Sin descripción'}\n`;
        mensaje += `👤 <b>Reportado por:</b> ${datos.nombre_reporta}\n`;
        mensaje += `📅 <b>Fecha:</b> ${fecha}\n`;
        mensaje += `🗺️ <a href="${mapa}">Ver ubicación en mapa</a>`;
    } else if (modulo === 'operaciones') {
        const porcentaje = datos.cantidad_programada > 0
            ? ((datos.cantidad_entregada / datos.cantidad_programada) * 100).toFixed(1)
            : 0;
        mensaje = `📦 <b>REPORTE DE OPERACIONES Y LOGÍSTICA</b>\n\n`;
        mensaje += `📍 <b>Institución:</b> ${datos.institucion || 'No especificada'}\n`;
        mensaje += `🔖 <b>Código AMIE:</b> ${datos.codigo_amie || 'N/A'}\n`;
        mensaje += `📋 <b>Tipo:</b> ${datos.tipo_reporte}\n`;
        mensaje += `📊 <b>Programado:</b> ${datos.cantidad_programada}\n`;
        mensaje += `✅ <b>Entregado:</b> ${datos.cantidad_entregada}\n`;
        mensaje += `📈 <b>Avance:</b> ${porcentaje}%\n`;
        mensaje += `📝 <b>Observaciones:</b> ${datos.observaciones || 'Sin observaciones'}\n`;
        mensaje += `👤 <b>Reportado por:</b> ${datos.nombre_reporta}\n`;
        mensaje += `📅 <b>Fecha:</b> ${fecha}\n`;
        mensaje += `🗺️ <a href="${mapa}">Ver ubicación en mapa</a>`;
    } else if (modulo === 'riesgos') {
        if (datos.tipo_reporte === 'Simulacro') {
            mensaje = `🛡️ <b>REPORTE DE SIMULACRO</b>\n\n`;
            mensaje += `📍 <b>Institución:</b> ${datos.institucion || 'No especificada'}\n`;
            mensaje += `🔖 <b>Código AMIE:</b> ${datos.codigo_amie || 'N/A'}\n`;
            mensaje += `🎯 <b>Tipo simulacro:</b> ${datos.tipo_simulacro}\n`;
            mensaje += `📆 <b>Mes:</b> ${datos.mes_reporte}\n`;
            mensaje += `👥 <b>Participantes:</b> ${datos.num_participantes || 'No especificado'}\n`;
            mensaje += `⏱️ <b>Tiempo evacuación:</b> ${datos.tiempo_evacuacion ? datos.tiempo_evacuacion + ' seg' : 'No registrado'}\n`;
            mensaje += `📝 <b>Observaciones:</b> ${datos.descripcion || 'Sin observaciones'}\n`;
        } else {
            mensaje = `⚠️ <b>REPORTE DE EVENTO ADVERSO</b>\n\n`;
            mensaje += `📍 <b>Institución:</b> ${datos.institucion || 'No especificada'}\n`;
            mensaje += `🔖 <b>Código AMIE:</b> ${datos.codigo_amie || 'N/A'}\n`;
            mensaje += `🚨 <b>Tipo evento:</b> ${datos.tipo_evento}\n`;
            mensaje += `📅 <b>Fecha evento:</b> ${datos.fecha_evento}\n`;
            mensaje += `⚡ <b>Afectación:</b> ${datos.afectacion}\n`;
            mensaje += `👥 <b>Personas afectadas:</b> ${datos.personas_afectadas || 'No especificado'}\n`;
            mensaje += `📝 <b>Descripción:</b> ${datos.descripcion}\n`;
            mensaje += `✅ <b>Acciones tomadas:</b> ${datos.acciones_tomadas || 'No especificadas'}\n`;
        }
        mensaje += `👤 <b>Reportado por:</b> ${datos.nombre_reporta}\n`;
        mensaje += `📅 <b>Fecha reporte:</b> ${fecha}\n`;
        mensaje += `🗺️ <a href="${mapa}">Ver ubicación en mapa</a>`;
    }

    return mensaje;
}

// =====================================================
// FORMULARIOS DE REPORTES
// =====================================================
function abrirFormulario(modulo) {
    moduloActual = modulo;
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('form-reporte').reset();
    document.getElementById('form-message').className = 'form-message';
    document.getElementById('inp-codigo-amie').value = '';

    // Resetear posición del modal
    const modal = document.getElementById('form-modal');
    if (window.innerWidth > 768) {
        modal.style.top = '80px';
        modal.style.right = '24px';
        modal.style.left = 'auto';
    } else {
        modal.style.top = '16px';
        modal.style.left = '3%';
        modal.style.right = '3%';
    }

    // Configurar título y campos según módulo
    const titulos = {
        'infraestructura': '🏫 Reporte de Infraestructura',
        'operaciones': '📦 Reporte de Operaciones',
        'riesgos': '⚠️ Reporte de Riesgos'
    };
    document.getElementById('modal-titulo').textContent = titulos[modulo];

    // Generar campos dinámicos
    generarCamposDinamicos(modulo);

    // Resetear ubicación
    document.getElementById('btn-gps').classList.remove('active');
    document.getElementById('btn-gps').innerHTML = '📱 Mi ubicación GPS';
    document.getElementById('btn-mapa').classList.remove('active');
    document.getElementById('btn-mapa').innerHTML = '🗺️ Seleccionar en mapa';
    document.getElementById('instruccion-mapa').classList.remove('visible');
    modoCapturaMapa = false;
}

function cerrarFormulario() {
    document.getElementById('modal-overlay').classList.remove('active');
    modoCapturaMapa = false;
    map.getContainer().style.cursor = '';
    if (marcadorTemporal) {
        map.removeLayer(marcadorTemporal);
        marcadorTemporal = null;
    }
}

function generarCamposDinamicos(modulo) {
    const container = document.getElementById('campos-dinamicos');

    if (modulo === 'infraestructura') {
        container.innerHTML = `
            <div class="form-group">
                <label>Tipo de Reporte *</label>
                <select id="inp-tipo" required>
                    <option value="">Selecciona una opción...</option>
                    <option value="Daños en infraestructura">Daños en infraestructura</option>
                    <option value="Falta de servicios básicos">Falta de servicios básicos</option>
                    <option value="Déficit de aulas">Déficit de aulas</option>
                </select>
            </div>
            <div class="form-group">
                <label>Número de estudiantes afectados</label>
                <input type="number" id="inp-num-estudiantes" min="0" placeholder="Ej: 150">
            </div>
            <div class="form-group">
                <label>Descripción del problema *</label>
                <textarea id="inp-descripcion" required placeholder="Describe detalladamente el problema..."></textarea>
            </div>
        `;
    } else if (modulo === 'operaciones') {
        container.innerHTML = `
            <div class="form-group">
                <label>Tipo de Reporte *</label>
                <select id="inp-tipo" required>
                    <option value="">Selecciona una opción...</option>
                    <option value="Textos escolares">Textos escolares</option>
                    <option value="Uniformes">Uniformes</option>
                    <option value="Alimentación escolar">Alimentación escolar</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Cantidad programada *</label>
                    <input type="number" id="inp-cant-programada" min="0" required placeholder="Ej: 500">
                </div>
                <div class="form-group">
                    <label>Cantidad entregada *</label>
                    <input type="number" id="inp-cant-entregada" min="0" required placeholder="Ej: 350">
                </div>
            </div>
            <div class="form-group">
                <label>Fecha de entrega</label>
                <input type="date" id="inp-fecha-entrega">
            </div>
            <div class="form-group">
                <label>Observaciones</label>
                <textarea id="inp-observaciones" placeholder="Observaciones adicionales..."></textarea>
            </div>
        `;
    } else if (modulo === 'riesgos') {
        container.innerHTML = `
            <div class="form-group">
                <label>Tipo de Reporte *</label>
                <select id="inp-tipo" required onchange="cambiarTipoRiesgo(this.value)">
                    <option value="">Selecciona una opción...</option>
                    <option value="Simulacro">Simulacro mensual</option>
                    <option value="Evento adverso">Evento adverso</option>
                </select>
            </div>
            <div id="campos-riesgo-extra"></div>
        `;
    }
}

function cambiarTipoRiesgo(tipo) {
    const container = document.getElementById('campos-riesgo-extra');

    if (tipo === 'Simulacro') {
        container.innerHTML = `
            <div class="form-group">
                <label>Tipo de simulacro *</label>
                <select id="inp-tipo-simulacro" required>
                    <option value="">Selecciona...</option>
                    <option value="Sismo">Sismo</option>
                    <option value="Incendio">Incendio</option>
                    <option value="Inundación">Inundación</option>
                    <option value="Evacuación general">Evacuación general</option>
                </select>
            </div>
            <div class="form-group">
                <label>Mes del reporte *</label>
                <select id="inp-mes" required>
                    <option value="">Selecciona...</option>
                    <option value="Enero">Enero</option>
                    <option value="Febrero">Febrero</option>
                    <option value="Marzo">Marzo</option>
                    <option value="Abril">Abril</option>
                    <option value="Mayo">Mayo</option>
                    <option value="Junio">Junio</option>
                    <option value="Julio">Julio</option>
                    <option value="Agosto">Agosto</option>
                    <option value="Septiembre">Septiembre</option>
                    <option value="Octubre">Octubre</option>
                    <option value="Noviembre">Noviembre</option>
                    <option value="Diciembre">Diciembre</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Participantes</label>
                    <input type="number" id="inp-participantes" min="0" placeholder="Número">
                </div>
                <div class="form-group">
                    <label>Tiempo evacuación (seg)</label>
                    <input type="number" id="inp-tiempo" min="0" placeholder="Segundos">
                </div>
            </div>
            <div class="form-group">
                <label>Observaciones</label>
                <textarea id="inp-descripcion" placeholder="Observaciones del simulacro..."></textarea>
            </div>
        `;
    } else if (tipo === 'Evento adverso') {
        container.innerHTML = `
            <div class="form-group">
                <label>Tipo de evento *</label>
                <select id="inp-tipo-evento" required>
                    <option value="">Selecciona...</option>
                    <option value="Sismo">Sismo</option>
                    <option value="Inundación">Inundación</option>
                    <option value="Deslizamiento">Deslizamiento</option>
                    <option value="Incendio">Incendio</option>
                    <option value="Erupción volcánica">Erupción volcánica</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha del evento *</label>
                    <input type="date" id="inp-fecha-evento" required>
                </div>
                <div class="form-group">
                    <label>Nivel de afectación *</label>
                    <select id="inp-afectacion" required>
                        <option value="">Selecciona...</option>
                        <option value="Leve">Leve</option>
                        <option value="Moderada">Moderada</option>
                        <option value="Grave">Grave</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Personas afectadas</label>
                <input type="number" id="inp-personas-afectadas" min="0" placeholder="Número de personas">
            </div>
            <div class="form-group">
                <label>Descripción del evento *</label>
                <textarea id="inp-descripcion" required placeholder="Describe el evento..."></textarea>
            </div>
            <div class="form-group">
                <label>Acciones tomadas</label>
                <textarea id="inp-acciones" placeholder="Acciones de respuesta..."></textarea>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

// =====================================================
// UBICACIÓN
// =====================================================
function obtenerGPS() {
    const btn = document.getElementById('btn-gps');
    btn.classList.add('loading');
    btn.innerHTML = '📱 Obteniendo...';

    if (!navigator.geolocation) {
        mostrarNotificacion('error', 'Error', 'Tu navegador no soporta geolocalización');
        btn.classList.remove('loading');
        btn.innerHTML = '📱 Mi ubicación GPS';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            document.getElementById('inp-lat').value = lat.toFixed(6);
            document.getElementById('inp-lon').value = lon.toFixed(6);

            btn.classList.remove('loading');
            btn.classList.add('active');
            btn.innerHTML = '📱 ✓ Ubicación obtenida';
            document.getElementById('btn-mapa').classList.remove('active');
            document.getElementById('btn-mapa').innerHTML = '🗺️ Seleccionar en mapa';
            document.getElementById('instruccion-mapa').classList.remove('visible');

            mostrarMarcadorTemporal(lat, lon);
            map.setView([lat, lon], 15);
        },
        (error) => {
            btn.classList.remove('loading');
            btn.innerHTML = '📱 Mi ubicación GPS';
            mostrarNotificacion('error', 'Error GPS', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function activarCapturaMapa() {
    modoCapturaMapa = true;
    document.getElementById('btn-mapa').classList.add('active');
    document.getElementById('btn-gps').classList.remove('active');
    document.getElementById('btn-gps').innerHTML = '📱 Mi ubicación GPS';
    document.getElementById('instruccion-mapa').classList.add('visible');
    map.getContainer().style.cursor = 'crosshair';
}

function mostrarMarcadorTemporal(lat, lon) {
    if (marcadorTemporal) {
        map.removeLayer(marcadorTemporal);
    }
    marcadorTemporal = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'temp-marker',
            html: '<div style="background:#e53e3e; width:24px; height:24px; border-radius:50%; border:4px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        })
    }).addTo(map);
}

// =====================================================
// BÚSQUEDA DE INSTITUCIONES
// =====================================================
function setupInstitucionSearch() {
    const inputInstitucion = document.getElementById('inp-institucion');
    const listaInstituciones = document.getElementById('lista-instituciones');

    inputInstitucion.addEventListener('input', function () {
        const valor = this.value.toLowerCase();
        if (valor.length < 2) {
            listaInstituciones.classList.remove('active');
            return;
        }

        const filtradas = instituciones.filter(i =>
            (i.institucion && i.institucion.toLowerCase().includes(valor)) ||
            (i.codigo_amie && i.codigo_amie.toLowerCase().includes(valor))
        ).slice(0, 10);

        if (filtradas.length > 0) {
            listaInstituciones.innerHTML = filtradas.map(i => `
                <div class="institucion-item" onclick="seleccionarInstitucion('${i.codigo_amie}', '${(i.institucion || '').replace(/'/g, "\\'")}', ${i.lat || 0}, ${i.lon || 0})">
                    ${i.institucion || 'Sin nombre'}
                    <small>${i.codigo_amie} - ${i.parroquia || ''}</small>
                </div>
            `).join('');
            listaInstituciones.classList.add('active');
        } else {
            listaInstituciones.classList.remove('active');
        }
    });

    inputInstitucion.addEventListener('blur', () => {
        setTimeout(() => listaInstituciones.classList.remove('active'), 200);
    });
}

function seleccionarInstitucion(codigo, nombre, lat, lon) {
    document.getElementById('inp-institucion').value = nombre;
    document.getElementById('inp-codigo-amie').value = codigo;
    document.getElementById('lista-instituciones').classList.remove('active');

    if (lat && lon) {
        document.getElementById('inp-lat').value = lat.toFixed(6);
        document.getElementById('inp-lon').value = lon.toFixed(6);
        mostrarMarcadorTemporal(lat, lon);
        map.setView([lat, lon], 15);
    }
}

// =====================================================
// ENVÍO DE REPORTES
// =====================================================
async function enviarReporte(event) {
    event.preventDefault();

    const btn = document.getElementById('btn-submit');
    const msg = document.getElementById('form-message');

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        let tabla, datos;

        const datosBase = {
            codigo_amie: document.getElementById('inp-codigo-amie').value || null,
            institucion: document.getElementById('inp-institucion').value || null,
            nombre_reporta: document.getElementById('inp-nombre').value,
            lat: parseFloat(document.getElementById('inp-lat').value),
            lon: parseFloat(document.getElementById('inp-lon').value)
        };

        if (moduloActual === 'infraestructura') {
            tabla = 'rep_infraestructura';
            datos = {
                ...datosBase,
                tipo_reporte: document.getElementById('inp-tipo').value,
                descripcion: document.getElementById('inp-descripcion').value,
                num_estudiantes: parseInt(document.getElementById('inp-num-estudiantes').value) || null
            };
        } else if (moduloActual === 'operaciones') {
            tabla = 'rep_operaciones';
            datos = {
                ...datosBase,
                tipo_reporte: document.getElementById('inp-tipo').value,
                cantidad_programada: parseInt(document.getElementById('inp-cant-programada').value),
                cantidad_entregada: parseInt(document.getElementById('inp-cant-entregada').value),
                fecha_entrega: document.getElementById('inp-fecha-entrega').value || null,
                observaciones: document.getElementById('inp-observaciones').value || null
            };
        } else if (moduloActual === 'riesgos') {
            tabla = 'rep_riesgos';
            const tipoReporte = document.getElementById('inp-tipo').value;

            datos = {
                ...datosBase,
                tipo_reporte: tipoReporte
            };

            if (tipoReporte === 'Simulacro') {
                datos.tipo_simulacro = document.getElementById('inp-tipo-simulacro').value;
                datos.mes_reporte = document.getElementById('inp-mes').value;
                datos.num_participantes = parseInt(document.getElementById('inp-participantes').value) || null;
                datos.tiempo_evacuacion = parseInt(document.getElementById('inp-tiempo').value) || null;
                datos.descripcion = document.getElementById('inp-descripcion').value || null;
            } else {
                datos.tipo_evento = document.getElementById('inp-tipo-evento').value;
                datos.fecha_evento = document.getElementById('inp-fecha-evento').value;
                datos.afectacion = document.getElementById('inp-afectacion').value;
                datos.personas_afectadas = parseInt(document.getElementById('inp-personas-afectadas').value) || null;
                datos.descripcion = document.getElementById('inp-descripcion').value;
                datos.acciones_tomadas = document.getElementById('inp-acciones').value || null;
            }
        }

        const res = await fetch(`${CONFIG.url}/${tabla}`, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.key,
                'Authorization': `Bearer ${CONFIG.key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            msg.textContent = '✅ Reporte enviado correctamente';
            msg.className = 'form-message success';

            // Enviar notificación a Telegram
            const mensajeTelegram = formatearMensajeTelegram(moduloActual, datos);
            await enviarTelegram(mensajeTelegram);

            // Recargar capa correspondiente
            if (moduloActual === 'infraestructura') await loadReportesInfraestructura();
            if (moduloActual === 'operaciones') await loadReportesOperaciones();
            if (moduloActual === 'riesgos') await loadReportesRiesgos();

            setTimeout(() => cerrarFormulario(), 2000);
        } else {
            const error = await res.json();
            throw new Error(error.message || 'Error al enviar');
        }
    } catch (e) {
        msg.textContent = '❌ Error: ' + e.message;
        msg.className = 'form-message error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Reporte';
    }
}

// =====================================================
// UTILIDADES
// =====================================================
function showInfo({ title, content }) {
    document.getElementById('info-title').textContent = title;
    document.getElementById('info-content').innerHTML = content;
    document.getElementById('info-panel').style.display = 'block';
}

function closeInfo() {
    document.getElementById('info-panel').style.display = 'none';
}

function setupLayerControls() {
    const layerMapping = {
        'lyr-area': 'area',
        'lyr-parroquias': 'parroquias',
        'lyr-urbano': 'urbano',
        'lyr-instituciones': 'instituciones',
        'lyr-edificios': 'edificios',
        'lyr-vias1': 'vias1',
        'lyr-vias2': 'vias2',
        'lyr-vias3': 'vias3',
        'lyr-vias4': 'vias4',
        'lyr-rep-infra': 'repInfra',
        'lyr-rep-oper': 'repOper',
        'lyr-rep-riesgos': 'repRiesgos'
    };

    document.querySelectorAll('.layer-item input').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const layerName = layerMapping[this.id];
            if (layerName && layers[layerName]) {
                if (this.checked) {
                    map.addLayer(layers[layerName]);
                } else {
                    map.removeLayer(layers[layerName]);
                }
            }
        });
    });
}

// =====================================================
// MENÚ MÓVIL
// =====================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function setupMobileMenu() {
    // Cerrar sidebar al abrir formulario en móvil
    const originalAbrirFormulario = abrirFormulario;
    window.abrirFormulario = function (modulo) {
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('active');
        }
        originalAbrirFormulario(modulo);
    };
}

// =====================================================
// ARRASTRAR MODAL
// =====================================================
function setupDraggableModal() {
    const modal = document.getElementById('form-modal');
    const modalHeader = document.getElementById('modal-header');
    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    modalHeader.addEventListener('mousedown', function (e) {
        if (e.target.classList.contains('close-btn')) return;
        if (window.innerWidth <= 768) return;
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        modal.style.transition = 'none';
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;

        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;

        newX = Math.max(0, Math.min(newX, window.innerWidth - modal.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - modal.offsetHeight));

        modal.style.left = newX + 'px';
        modal.style.top = newY + 'px';
        modal.style.right = 'auto';
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
        modal.style.transition = '';
    });
}

// =====================================================
// INICIALIZACIÓN
// =====================================================
function setLoadingText(text) {
    document.getElementById('loading-text').textContent = text;
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

async function init() {
    erroresCarga = [];

    try {
        initMap();

        setLoadingText('Cargando área de estudio...');
        await loadAreaEstudio();

        setLoadingText('Cargando parroquias...');
        await loadParroquias();

        setLoadingText('Cargando zonas urbanas...');
        await loadZonasUrbanas();

        setLoadingText('Cargando instituciones...');
        await loadInstituciones();

        setLoadingText('Cargando edificios...');
        await loadEdificios();

        setLoadingText('Cargando red vial...');
        await loadVias('1', layers.vias1, styles.vias1);
        await loadVias('2', layers.vias2, styles.vias2);
        await loadVias('3', layers.vias3, styles.vias3);
        await loadVias('4', layers.vias4, styles.vias4);

        setLoadingText('Cargando reportes...');
        await loadReportesInfraestructura();
        await loadReportesOperaciones();
        await loadReportesRiesgos();

        // Ajustar vista
        if (layers.area.getLayers().length > 0) {
            const bounds = L.featureGroup(layers.area.getLayers()).getBounds();
            map.fitBounds(bounds);
        }

        // Setup adicional
        setupInstitucionSearch();
        setupMobileMenu();
        setupDraggableModal();

        hideLoading();

        // Mostrar resumen de errores
        if (erroresCarga.length > 0) {
            mostrarNotificacion(
                'warning',
                `${erroresCarga.length} capa(s) con problemas`,
                `No se pudieron cargar: ${erroresCarga.join(', ')}`,
                8000
            );
        } else {
            mostrarNotificacion(
                'success',
                'Geoportal cargado',
                'Todas las capas se cargaron correctamente',
                3000
            );
        }

    } catch (e) {
        console.error('Error inicializando:', e);
        setLoadingText('Error al cargar. Revisa la consola.');
        mostrarNotificacion(
            'error',
            'Error crítico',
            'No se pudo inicializar el geoportal.',
            0
        );
    }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
