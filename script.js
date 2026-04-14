let map;
let routeLayer;
let currentTollMarkers = [];
window.crossedTolls = [];

// Haversine Distance helper
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Init Leaflet
function initMap() {
    // Definir los límites geográficos de Colombia (Bounding Box)
    const southWest = L.latLng(-4.5, -80.0);
    const northEast = L.latLng(13.5, -66.0);
    const colombiaBounds = L.latLngBounds(southWest, northEast);

    map = L.map('map', { 
        zoomControl: false,
        maxBounds: colombiaBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 5
    }).setView([4.5709, -74.2973], 6); // Centro geográfico base

    // Reposition zoom control
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18
    }).addTo(map);
}

// Nominatim Geocoding
async function geocode(cityOrAddress) {
    // Se limita explícitamente la búsqueda a Colombia usando countrycodes=co
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityOrAddress)}&limit=1&countrycodes=co`);
    const data = await response.json();
    if (data && data.length > 0) {
        return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            name: data[0].display_name
        };
    }
    return null;
}

// OSRM Routing (Supports N coordinates)
async function getRoute(coordinates) {
    // coordinates format: [[lon, lat], [lon, lat], ...]
    const coordsString = coordinates.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
        return data.routes[0];
    }
    return null;
}

// Global Formatter
const currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
});

// Update DOM and Map
function drawRouteAndFormatDOM(distanceKm, durationHrs, routeCoords) {
    // We store the BASE distance and time in attributes to always have the original
    const distInput = document.getElementById('distancia');
    const timeInput = document.getElementById('tiempo');

    distInput.dataset.base = distanceKm;
    timeInput.dataset.base = durationHrs;

    // The calculateCosts will handle the return trip multiplication
    if (routeLayer) map.removeLayer(routeLayer);
    
    currentTollMarkers.forEach(m => map.removeLayer(m));
    currentTollMarkers = [];
    window.crossedTolls = [];

    if (!window.TOLLS_DB) {
        console.error("Error Crítico: window.TOLLS_DB no cargó. Revisa tollsData.js");
        alert("Error: Falla la base de datos tollsData.js");
    }

    if (window.TOLLS_DB && routeCoords && routeCoords.coordinates) {
        window.TOLLS_DB.forEach(toll => {
            const tollPoint = L.latLng(toll.lat, toll.lon);
            let found = false;

            for (const coord of routeCoords.coordinates) {
                const routePoint = L.latLng(coord[1], coord[0]);
                
                // OSRM resume curvas, desfasando la ruta hasta 2km de la caseta real.
                // 2500m (2.5km) es el colchón de seguridad perfecto para tolerancia sin activar carreteras lejanas.
                if (tollPoint.distanceTo(routePoint) <= 2500) {
                    found = true;
                    break;
                }
            }

            if (found) {
                window.crossedTolls.push(toll);
                
                const pCat3 = currencyFormatter.format(toll.cat3);
                const pCat4 = currencyFormatter.format(toll.cat4);

                const icon = L.divIcon({
                    className: 'toll-map-icon',
                    html: `<div style="position:relative;">
                             <div style="background:#dc2626; color:white; border-radius:50%; border:4px solid white; display:flex; align-items:center; justify-content:center; width:48px; height:48px; box-shadow: 0 6px 14px rgba(0,0,0,0.8); font-size:26px; z-index:99999; position:relative;">
                                <i class="ph-fill ph-coins"></i>
                             </div>
                             <div style="position:absolute; top:-25px; left:50%; transform:translateX(-50%); background:white; padding:4px 8px; border-radius:12px; font-weight:900; font-family:'Outfit',sans-serif; font-size:14px; color:#dc2626; border:2px solid #dc2626; white-space:nowrap; box-shadow:0 3px 6px rgba(0,0,0,0.4); z-index:100000; display:flex; flex-direction:column; align-items:center; line-height:1.2;">
                                <span>${pCat3}</span>
                                <span style="font-size:11px; font-weight:600; color:#475569;">ó ${pCat4}</span>
                             </div>
                           </div>`,
                    iconSize: [48, 48],
                    iconAnchor: [24, 24],
                    popupAnchor: [0, -24]
                });
                
                const m = L.marker([toll.lat, toll.lon], { icon, zIndexOffset: 2000 })
                    .bindPopup(`<div style="text-align:center;"><b>${toll.name}</b><br><small>Tarifas INVÍAS 2026</small></div>`)
                    .addTo(map);
                
                currentTollMarkers.push(m);
            }
        });
        console.log("Peajes Cruzados (2.5km balanceo):", window.crossedTolls);
        console.log("Peajes Cruzados detectados:", window.crossedTolls);
    }

    routeLayer = L.geoJSON(routeCoords, {
        style: { color: '#d97706', weight: 5, opacity: 0.8 }
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50], animate: true, duration: 1.5 });
}

// Calculate Math Model
function calculateCosts() {
    const distInput = document.getElementById('distancia');
    const timeInput = document.getElementById('tiempo');

    let D = parseFloat(distInput.dataset.base) || 0;
    let T = parseFloat(timeInput.dataset.base) || 0;

    const returnWps = document.querySelectorAll('.waypoint-input-return').length;
    const returnTrip = document.getElementById('retorno-vacio').checked;

    // Logic: If explicit return stops exist, the OSRM distance (D) already 
    // includes the full loop [Origen -> ... -> Destino -> ... -> Origen].
    // If NO return stops exist, D is only A->B, so we double it if 'retorno-vacio' is on.
    if (returnWps === 0 && returnTrip) {
        D = D * 2;
        T = T * 2;
    }

    distInput.value = D.toFixed(1);
    timeInput.value = T.toFixed(1);

    const Ckm = parseFloat(document.getElementById('costo-km').value) || 0;
    const P = parseFloat(document.getElementById('peso').value) || 0;
    
    // Auto calculate personnel amount
    let numPersonal = 1;
    if (P >= 1 && P <= 5) {
        numPersonal = 2;
    } else if (P > 5) {
        numPersonal = 3;
    }
    document.getElementById('cantidad-personal').value = numPersonal;
    const Cp = parseFloat(document.getElementById('costo-tonelada').value) || 0;
    const Ct = parseFloat(document.getElementById('costo-hora').value) || 0;
    const Comb = parseFloat(document.getElementById('combustible').value) || 0;
    
    // ---- Auto Select Vehicle Type & Calculate Tolls ----
    const distBase = document.getElementById('distancia').dataset.base;
    let vType = 'camion25'; // Default
    
    // Reglas de negocio para selección de flota automática
    if (P > 5.2) {
        vType = 'tercerizado';
    } else if (P > 2.5) {
        vType = 'camion52';
    } else {
        vType = 'camion25';
    }

    // Actualización visual de tarjetas de vehículo
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('active');
        card.style.opacity = "0.6"; // Dim all
        if (card.dataset.vehicle === vType) {
            card.classList.add('active');
            card.style.opacity = "1"; // Highlight active
        }
    });

    const isCat3 = (vType === 'camion25'); 
    let autoPeajes = 0;
    
    if (distBase) {
        if (window.crossedTolls && window.crossedTolls.length > 0) {
            window.crossedTolls.forEach(t => {
                // Si es Camión Ligero (Cat 3), de lo contrario (Mediano o Tercerizado) es Cat 4
                autoPeajes += (isCat3 ? t.cat3 : t.cat4);
            });
            
            if (returnTrip || returnWps > 0) {
               autoPeajes *= 2; 
            }
        }
        document.getElementById('peajes').value = autoPeajes;
    }

    // Controlar visibilidad del aviso de tercerización
    const alertTercerizado = document.getElementById('alert-tercerizado');
    if (alertTercerizado) {
        alertTercerizado.style.display = (vType === 'tercerizado') ? 'flex' : 'none';
    }
    // ------------------------------
    
    const Peajes = parseFloat(document.getElementById('peajes').value) || 0;

    const viaticosUnit = parseFloat(document.getElementById('viaticos').value) || 0;
    const cargueUnit = parseFloat(document.getElementById('cargue').value) || 0;
    
    const Viat = viaticosUnit * numPersonal;
    const Carg = cargueUnit * numPersonal;

    let Cf = parseFloat(document.getElementById('costo-fijo').value) || 0;
    const margenPerc = parseFloat(document.getElementById('margen').value) || 0;

    let costoDistancia = Ckm * D;
    let costoPeso = Cp * P;
    const costoTiempo = Ct * T;

    // --- INTEGRACION DE TARIFA FIJA (AGENCIA MONTERIA) ---
    let agencyRateAplied = false;
    
    if (window.getFixedAgencyRate) {
        const origenAddr = document.getElementById('origen').value.toLowerCase();
        const destinoAddr = document.getElementById('destino').value.toLowerCase();
        
        // Si el viaje arranca en Montería y el destino existe en la matriz tarifaria
        if (origenAddr.includes('monteria') || origenAddr.includes('montería')) {
            let agencyRate = window.getFixedAgencyRate(destinoAddr, P);
            
            // Si el vehículo es tercerizado, el costo no puede ser inferior a los 100k/ton mencionados por el usuario
            if (vType === 'tercerizado') {
                const providerMin = 100000 * P;
                if (agencyRate === null || agencyRate < providerMin) {
                    agencyRate = providerMin;
                }
            }

            if (agencyRate !== null) {
                const unitCkm = 0;
                const unitCp = P > 0 ? Math.round(agencyRate / P) : (vType === 'tercerizado' ? 100000 : agencyRate);
                
                document.getElementById('costo-km').value = unitCkm;
                document.getElementById('costo-tonelada').value = unitCp;
                
                costoDistancia = 0;
                costoPeso = agencyRate;
                agencyRateAplied = true;
            }
        }
    }
    
    // RUTA NACIONAL / EXTERNA: Fallback Satelital si no hay tabla y el usuario no digitó manual
    if (!agencyRateAplied) {
        if (Ckm === 0 && Cp === 0 && D > 0) {
            let tarifaBase;
            let tonFactor = P > 0 ? P : 1;

            if (vType === 'tercerizado') {
                // El usuario indica que un tercero cobra entre 90k y 100k por tonelada
                // Usamos $100,000 como tarifa base de mercado tercerizado para seguridad
                tarifaBase = 100000 * tonFactor;
                
                document.getElementById('costo-km').value = 0;
                document.getElementById('costo-tonelada').value = 100000;
            } else {
                // Tarifa automática propia: $2,000 pesos por cada kilómetro-tonelada 
                tarifaBase = 2000 * D * tonFactor;
                document.getElementById('costo-km').value = 0;
                document.getElementById('costo-tonelada').value = Math.round(tarifaBase / tonFactor);
            }
            
            costoDistancia = 0;
            costoPeso = tarifaBase;
        }
    }
    // -----------------------------------------------------

    const subtotalVariables = costoDistancia + costoPeso + costoTiempo + Comb + Peajes;
    const subtotalOperativos = Viat + Carg + Cf;

    const CT = subtotalVariables + subtotalOperativos;
    const M = margenPerc / 100;
    const TotalMargenValue = CT * M;
    const Precio = CT + TotalMargenValue;

    // === KPI: Costo Ton-Km ===
    // Calcula el costo logístico de transportar 1 sola tonelada durante 1 kilómetro de la ruta.
    let tonKm = 0;
    if (D > 0 && P > 0) {
        // Usamos el flete base de carretera (Distancia + Peso) sin contar viáticos ni peajes
        tonKm = (costoDistancia + costoPeso) / (D * P);
    }
    
    // Update Dashboard UI
    document.getElementById('res-kpi-tonkm').textContent = currencyFormatter.format(tonKm);
    document.getElementById('res-variables').textContent = currencyFormatter.format(subtotalVariables);
    document.getElementById('res-operativos').textContent = currencyFormatter.format(subtotalOperativos);
    document.getElementById('res-ct').textContent = currencyFormatter.format(CT);
    document.getElementById('res-margen-badge').textContent = `${margenPerc}% Margen`;
    document.getElementById('res-precio').textContent = currencyFormatter.format(Precio);

    // --- PROFITABILITY BADGE ---
    const rentBadge = document.getElementById('rentabilidad-badge');
    rentBadge.style.display = CT > 0 ? 'flex' : 'none';
    rentBadge.className = 'rentabilidad-badge';
    if (margenPerc >= 25) {
        rentBadge.className += ' alta';
        rentBadge.innerHTML = '<i class="ph-fill ph-trend-up"></i> Alta Rentabilidad (' + margenPerc + '%)';
    } else if (margenPerc >= 10) {
        rentBadge.className += ' media';
        rentBadge.innerHTML = '<i class="ph ph-minus-circle"></i> Rentabilidad Media (' + margenPerc + '%)';
    } else {
        rentBadge.className += ' baja';
        rentBadge.innerHTML = '<i class="ph-fill ph-trend-down"></i> Margen Bajo (' + margenPerc + '%)';
    }

    // --- COST BREAKDOWN CHART ---
    const chartContainer = document.getElementById('chart-container');
    chartContainer.style.display = CT > 0 ? 'block' : 'none';
    updateCostChart({ costoDistancia, costoPeso, costoTiempo, Comb, Peajes, Viat, Carg, Cf });

    // Provide values for history saving
    window.currentQuoteState = { Precio, CT, returnTrip };

    // Populate PDF
    populatePDFTemplate(
        { D, P, T, Ckm, Cp, Ct, Cf, Comb, Peajes, Viat, Carg, margenPerc, CT, TotalMargenValue, Precio, costoDistancia, costoPeso, costoTiempo, returnTrip }
    );
}

function populatePDFTemplate(v) {
    const origenRaw = document.getElementById('origen').value.trim() || 'No Especificado';
    const destinoRaw = document.getElementById('destino').value.trim() || 'No Especificado';
    const clienteRaw = document.getElementById('cliente-nombre').value.trim();

    // Client block
    const clienteEl = document.getElementById('pdf-cliente');
    const clienteRow = document.getElementById('pdf-client-row');
    if (clienteRaw) {
        clienteEl.textContent = clienteRaw;
        clienteRow.style.display = 'block';
    } else {
        clienteRow.style.display = 'none';
    }

    // Forward Waypoints
    const wpInputs = document.querySelectorAll('.waypoint-input');
    const wpCol = document.getElementById('pdf-waypoints-col');
    const wpList = document.getElementById('pdf-waypoints-list');
    if (wpInputs.length > 0) {
        wpList.innerHTML = '';
        wpInputs.forEach((inp, i) => {
            const val = inp.value.trim().split(',')[0];
            if (val) wpList.innerHTML += `<div style="margin-bottom:4px;">${i + 1}. ${val}</div>`;
        });
        wpCol.style.display = 'block';
    } else {
        wpCol.style.display = 'none';
    }

    // Return Waypoints
    const wpReturnInputs = document.querySelectorAll('.waypoint-input-return');
    const wpReturnCol = document.getElementById('pdf-return-stops-col');
    const wpReturnList = document.getElementById('pdf-return-stops-list');
    if (wpReturnInputs.length > 0) {
        wpReturnList.innerHTML = '';
        wpReturnInputs.forEach((inp, i) => {
            const val = inp.value.trim().split(',')[0];
            if (val) wpReturnList.innerHTML += `<div style="margin-bottom:4px;">${i + 1}. ${val}</div>`;
        });
        wpReturnCol.style.display = 'block';
    } else {
        wpReturnCol.style.display = 'none';
    }

    document.getElementById('pdf-origen').textContent = origenRaw.split(',')[0];
    document.getElementById('pdf-destino').textContent = destinoRaw.split(',')[0];

    document.getElementById('pdf-dist').textContent = `${v.D.toFixed(1)} km`;
    document.getElementById('pdf-tiempo').textContent = `${v.T.toFixed(1)} hrs`;
    document.getElementById('pdf-peso').textContent = `${v.P.toFixed(1)} Ton`;

    // Detailed Breakdown Inputs
    document.getElementById('pdf-base-km').textContent = v.D.toFixed(1);
    document.getElementById('pdf-tarifa-km').textContent = currencyFormatter.format(v.Ckm);
    document.getElementById('pdf-total-km').textContent = currencyFormatter.format(v.costoDistancia);
    document.getElementById('pdf-base-ton').textContent = v.P.toFixed(1);
    document.getElementById('pdf-tarifa-ton').textContent = currencyFormatter.format(v.Cp);
    document.getElementById('pdf-total-ton').textContent = currencyFormatter.format(v.costoPeso);

    document.getElementById('pdf-tarifa-hora').textContent = currencyFormatter.format(v.Ct);
    document.getElementById('pdf-total-hora').textContent = currencyFormatter.format(v.costoTiempo);

    document.getElementById('pdf-total-combustible').textContent = currencyFormatter.format(v.Comb);
    document.getElementById('pdf-peajes').textContent = currencyFormatter.format(v.Peajes);

    document.getElementById('pdf-viaticos').textContent = currencyFormatter.format(v.Viat);
    document.getElementById('pdf-cargue').textContent = currencyFormatter.format(v.Carg);
    document.getElementById('pdf-fijo').textContent = currencyFormatter.format(v.Cf);

    document.getElementById('pdf-ct').textContent = currencyFormatter.format(v.CT);
    document.getElementById('pdf-margen').textContent = `${v.margenPerc}%`;
    document.getElementById('pdf-margen-val').textContent = currencyFormatter.format(v.TotalMargenValue);

    document.getElementById('pdf-precio-final').textContent = currencyFormatter.format(v.Precio);

    // Return Trip Badge
    document.getElementById('pdf-retorno-badge').style.display = v.returnTrip ? 'inline' : 'none';

    // Set Date & Unique ID
    const today = new Date();
    document.getElementById('pdf-date').textContent = today.toLocaleDateString('es-CO');
    if (!document.getElementById('pdf-random-id').textContent) {
        document.getElementById('pdf-random-id').textContent = Math.floor(100000 + Math.random() * 900000);
    }
}

// --- CHART.JS DONUT CHART ---
let costChartInstance = null;
function updateCostChart(costs) {
    const ctx = document.getElementById('cost-chart').getContext('2d');
    const labels = ['Distancia', 'Peso', 'Tiempo', 'Combustible', 'Peajes', 'Viáticos', 'Cargue', 'Fijo'];
    const data   = [costs.costoDistancia, costs.costoPeso, costs.costoTiempo, costs.Comb, costs.Peajes, costs.Viat, costs.Carg, costs.Cf];
    const colors = ['#ea580c','#f97316','#fb923c','#fdba74','#fcd34d','#86efac','#6ee7b7','#93c5fd'];

    const filteredLabels = [], filteredData = [], filteredColors = [];
    data.forEach((val, i) => { if (val > 0) { filteredLabels.push(labels[i]); filteredData.push(val); filteredColors.push(colors[i]); } });

    if (costChartInstance) costChartInstance.destroy();
    costChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: filteredLabels, datasets: [{ data: filteredData, backgroundColor: filteredColors, borderWidth: 2, borderColor: 'transparent' }] },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { position: 'right', labels: { font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 10 } },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(ctx.raw)}` } }
            }
        }
    });
}


/* ===========================
   UI & APP LOGIC INITIALIZATION 
   =========================== */
document.addEventListener('DOMContentLoaded', () => {

    // --- TABS LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(tab => tab.classList.remove('active'));

            // Add active to clicked
            item.classList.add('active');
            
            // Show target
            const targetId = item.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Force map resize fix when switching to mapa tab
            if (targetId === 'tab-mapa' && typeof map !== 'undefined') {
                setTimeout(() => map.invalidateSize(), 150);
            }
        });
    });

    // --- SIDEBAR TOGGLE LOGIC ---
    const sidebar = document.querySelector('.sidebar');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

    const toggleSidebar = (collapsed) => {
        if (collapsed) sidebar.classList.add('collapsed');
        else sidebar.classList.remove('collapsed');
        
        localStorage.setItem('routeflow_sidebar_collapsed', collapsed);
        
        // Fix map size after transition
        if (typeof map !== 'undefined') {
            setTimeout(() => map.invalidateSize(), 400); // 400ms is our CSS transition time
        }
    };

    btnToggleSidebar.addEventListener('click', () => {
        const isCollapsed = !sidebar.classList.contains('collapsed');
        toggleSidebar(isCollapsed);
    });

    // Restore sidebar state
    const savedSidebarState = localStorage.getItem('routeflow_sidebar_collapsed') === 'true';
    if (savedSidebarState) toggleSidebar(true);

    // --- INITIALIZE UI ---
    console.log("Sistema RouteFlow Pro Inicializado");

    initMap();
    renderHistory();

    // --- DARK MODE TOGGLE ---
    const isDark = localStorage.getItem('routeflow_darkmode') === 'true';
    if (isDark) document.documentElement.classList.add('dark-mode');
    updateDarkBtn(isDark);

    function updateDarkBtn(dark) {
        document.getElementById('dark-icon').className = dark ? 'ph ph-sun' : 'ph ph-moon';
        document.getElementById('dark-label').textContent = dark ? 'Modo Claro' : 'Modo Oscuro';
    }

    document.getElementById('btn-dark-mode').addEventListener('click', () => {
        const nowDark = document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('routeflow_darkmode', nowDark);
        updateDarkBtn(nowDark);
    });

    // --- CLEAR FORM BUTTON ---
    document.getElementById('btn-clear-form').addEventListener('click', () => {
        // Clear route inputs
        document.getElementById('origen').value = '';
        document.getElementById('destino').value = '';
        document.getElementById('waypoints-container').innerHTML = '';
        document.getElementById('waypoints-return-container').innerHTML = '';
        document.getElementById('return-stops-divider').style.display = 'none';
        document.getElementById('cliente-nombre').value = '';

        // Clear calculated fields
        const distEl = document.getElementById('distancia');
        distEl.value = '';
        distEl.dataset.base = '';
        const timeEl = document.getElementById('tiempo');
        timeEl.value = '';
        timeEl.dataset.base = '';

        // Clear all other inputs
        ['peso','costo-km','costo-tonelada','costo-hora','combustible','peajes','viaticos','cargue','costo-fijo','margen'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        document.getElementById('retorno-vacio').checked = false;
        document.querySelectorAll('.vehicle-card').forEach(c => c.classList.remove('active'));

        // Reset results
        ['res-variables','res-operativos','res-ct','res-precio'].forEach(id => {
            document.getElementById(id).textContent = '$0';
        });
        document.getElementById('res-margen-badge').textContent = '0% Margen';
        document.getElementById('rentabilidad-badge').style.display = 'none';
        document.getElementById('chart-container').style.display = 'none';

        // Clear map route and markers
        if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
        currentTollMarkers.forEach(m => map.removeLayer(m));
        currentTollMarkers = [];
        window.crossedTolls = [];

        document.getElementById('calc-status').innerHTML = '<i class="ph ph-info"></i> Formulario limpiado. Ingrese una ruta.';
        document.getElementById('calc-status').style.color = '';

        window.currentQuoteState = null;
    });

    // --- HISTORY FILTERS ---
    function applyFilters() {
        const from = document.getElementById('filter-date-from').value;
        const to = document.getElementById('filter-date-to').value;
        const search = document.getElementById('filter-search').value.toLowerCase().trim();
        renderHistory({ from, to, search });
    }

    document.getElementById('filter-date-from').addEventListener('change', applyFilters);
    document.getElementById('filter-date-to').addEventListener('change', applyFilters);
    document.getElementById('filter-search').addEventListener('input', applyFilters);
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        document.getElementById('filter-search').value = '';
        renderHistory();
    });

    const form = document.getElementById('logistics-form');
    const statusBox = document.getElementById('calc-status');
    let isRouting = false;

    // --- AUTOCOMPLETE LOGIC ---
    let debounceTimer;

    function setupAutocomplete(inputElement) {
        const wrapper = inputElement.parentElement;
        wrapper.style.position = 'relative'; 

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-list';
        wrapper.appendChild(dropdown);

        inputElement.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const val = this.value.trim();

            if (!val || val.length < 3) {
                dropdown.innerHTML = '';
                dropdown.classList.remove('active');
                return;
            }

            debounceTimer = setTimeout(async () => {
                dropdown.innerHTML = '<div class="autocomplete-item"><i class="ph ph-spinner ph-spin"></i> Buscando...</div>';
                dropdown.classList.add('active');

                try {
                    // Limitar a Colombia (countrycodes=co)
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1&countrycodes=co`);
                    const data = await response.json();

                    dropdown.innerHTML = '';
                    if (data && data.length > 0) {
                        data.forEach(item => {
                            const div = document.createElement('div');
                            div.className = 'autocomplete-item';
                            // Build a friendly name from parts
                            const nameParts = item.display_name.split(',');
                            const shortName = nameParts.slice(0, 3).join(',');

                            div.innerHTML = `<i class="ph ph-map-pin"></i> <span>${shortName}</span>`;
                            div.addEventListener('click', () => {
                                inputElement.value = shortName.trim();
                                dropdown.innerHTML = '';
                                dropdown.classList.remove('active');
                                autoTriggerRoute(); 
                            });
                            dropdown.appendChild(div);
                        });
                    } else {
                        dropdown.innerHTML = '<div class="autocomplete-item">Sin resultados</div>';
                    }
                } catch (err) {
                    dropdown.innerHTML = '<div class="autocomplete-item text-error">Error en búsqueda</div>';
                }
            }, 500);
        });

        document.addEventListener('click', (e) => {
            if (e.target !== inputElement && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
        
        inputElement.addEventListener('focus', () => {
            if (dropdown.innerHTML !== '' && inputElement.value.trim().length >= 3) {
                dropdown.classList.add('active');
            }
        });
    }

    setupAutocomplete(document.getElementById('origen'));
    setupAutocomplete(document.getElementById('destino'));

    // --- WAYPOINTS LOGIC ---
    const wpContainer = document.getElementById('waypoints-container');

    document.getElementById('btn-add-stop').addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'waypoint-wrapper';
        div.innerHTML = `
            <i class="ph-fill ph-flag map-icon"></i>
            <input type="text" class="route-input waypoint-input" placeholder="Punto de Parada..." autocomplete="off">
            <button type="button" class="btn-remove-stop"><i class="ph ph-trash"></i></button>
        `;
        wpContainer.appendChild(div);

        // Bind events to new input
        const newInp = div.querySelector('.waypoint-input');
        setupAutocomplete(newInp);
        newInp.addEventListener('change', autoTriggerRoute);
        newInp.addEventListener('blur', autoTriggerRoute);

        div.querySelector('.btn-remove-stop').addEventListener('click', () => {
            div.remove();
            autoTriggerRoute();
        });
    });

    // --- RETURN WAYPOINTS LOGIC ---
    const wpReturnContainer = document.getElementById('waypoints-return-container');
    const returnDivider = document.getElementById('return-stops-divider');

    document.getElementById('btn-add-return-stop').addEventListener('click', () => {
        returnDivider.style.display = 'flex';
        const div = document.createElement('div');
        div.className = 'waypoint-wrapper return';
        div.innerHTML = `
            <i class="ph ph-truck map-icon"></i>
            <input type="text" class="route-input waypoint-input-return" placeholder="Recogida de Retorno..." autocomplete="off">
            <button type="button" class="btn-remove-stop"><i class="ph ph-trash"></i></button>
        `;
        wpReturnContainer.appendChild(div);

        const newInp = div.querySelector('.waypoint-input-return');
        setupAutocomplete(newInp);
        newInp.addEventListener('change', autoTriggerRoute);
        newInp.addEventListener('blur', autoTriggerRoute);

        div.querySelector('.btn-remove-stop').addEventListener('click', () => {
            div.remove();
            if (wpReturnContainer.children.length === 0) returnDivider.style.display = 'none';
            autoTriggerRoute();
        });
    });

    // --- SETTINGS & VEHICLE PRESETS LOGIC ---
    const defaultSettings = {
        margen: 30,
        comb: 100000,
        peajes: 40000,
        presets: {
            camion25: { cKm: 3500, cTon: 15000, cHra: 45000, fijo: 150000, viat: 50000, cargue: 40000, pesoObj: 2.5 },
            camion52: { cKm: 5000, cTon: 12000, cHra: 60000, fijo: 250000, viat: 80000, cargue: 70000, pesoObj: 5.2 }
        }
    };

    let appSettings = JSON.parse(localStorage.getItem('routeflow_settings')) || defaultSettings;

    function populateSettingsUI() {
        document.getElementById('set-margen').value = appSettings.margen;
        document.getElementById('set-combustible').value = appSettings.comb;
        document.getElementById('set-peajes').value = appSettings.peajes;

        const c25 = appSettings.presets.camion25;
        document.getElementById('set-c25-km').value = c25.cKm;
        document.getElementById('set-c25-ton').value = c25.cTon;
        document.getElementById('set-c25-hora').value = c25.cHra;
        document.getElementById('set-c25-fijo').value = c25.fijo;
        document.getElementById('set-c25-viat').value = c25.viat;
        document.getElementById('set-c25-cargue').value = c25.cargue;

        const c52 = appSettings.presets.camion52;
        document.getElementById('set-c52-km').value = c52.cKm;
        document.getElementById('set-c52-ton').value = c52.cTon;
        document.getElementById('set-c52-hora').value = c52.cHra;
        document.getElementById('set-c52-fijo').value = c52.fijo;
        document.getElementById('set-c52-viat').value = c52.viat;
        document.getElementById('set-c52-cargue').value = c52.cargue;

        // Populate calculator global defaults if empty
        if (!document.getElementById('margen').value) document.getElementById('margen').value = appSettings.margen;
        if (!document.getElementById('combustible').value) document.getElementById('combustible').value = appSettings.comb;
        if (!document.getElementById('peajes').value) document.getElementById('peajes').value = appSettings.peajes;
    }

    populateSettingsUI();

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        appSettings.margen = parseFloat(document.getElementById('set-margen').value) || 0;
        appSettings.comb = parseFloat(document.getElementById('set-combustible').value) || 0;
        appSettings.peajes = parseFloat(document.getElementById('set-peajes').value) || 0;

        appSettings.presets.camion25 = {
            cKm: parseFloat(document.getElementById('set-c25-km').value) || 0,
            cTon: parseFloat(document.getElementById('set-c25-ton').value) || 0,
            cHra: parseFloat(document.getElementById('set-c25-hora').value) || 0,
            fijo: parseFloat(document.getElementById('set-c25-fijo').value) || 0,
            viat: parseFloat(document.getElementById('set-c25-viat').value) || 0,
            cargue: parseFloat(document.getElementById('set-c25-cargue').value) || 0,
            pesoObj: 2.5
        };

        appSettings.presets.camion52 = {
            cKm: parseFloat(document.getElementById('set-c52-km').value) || 0,
            cTon: parseFloat(document.getElementById('set-c52-ton').value) || 0,
            cHra: parseFloat(document.getElementById('set-c52-hora').value) || 0,
            fijo: parseFloat(document.getElementById('set-c52-fijo').value) || 0,
            viat: parseFloat(document.getElementById('set-c52-viat').value) || 0,
            cargue: parseFloat(document.getElementById('set-c52-cargue').value) || 0,
            pesoObj: 5.2
        };

        localStorage.setItem('routeflow_settings', JSON.stringify(appSettings));
        
        // Update Calculator tab logic directly
        document.getElementById('margen').value = appSettings.margen;
        document.getElementById('combustible').value = appSettings.comb;
        document.getElementById('peajes').value = appSettings.peajes;

        const msg = document.getElementById('settings-status-msg');
        msg.textContent = "Ajustes guardados correctamente.";
        msg.className = "status-msg show success";
        setTimeout(() => { msg.className = "status-msg"; }, 3000);
        
        if (document.getElementById('distancia').dataset.base) calculateCosts();
    });

    const vehicleCards = document.querySelectorAll('.vehicle-card');

    vehicleCards.forEach(card => {
        card.addEventListener('click', () => {
            vehicleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            const vType = card.dataset.vehicle;
            const data = appSettings.presets[vType];

            document.getElementById('costo-km').value = data.cKm;
            document.getElementById('costo-tonelada').value = data.cTon;
            document.getElementById('costo-hora').value = data.cHra;
            document.getElementById('costo-fijo').value = data.fijo;
            document.getElementById('viaticos').value = data.viat;
            document.getElementById('cargue').value = data.cargue;
            document.getElementById('peso').value = data.pesoObj;

            document.getElementById('combustible').value = appSettings.comb;
            document.getElementById('peajes').value = appSettings.peajes;
            document.getElementById('margen').value = appSettings.margen;

            if (document.getElementById('distancia').dataset.base) calculateCosts();
        });
    });

    // --- MAIN ROUTE TRIGGERING ---
    const autoTriggerRoute = async () => {
        // Collect points for forward trip: Origen -> Waypoints -> Destino
        const forwardPoints = [
            document.getElementById('origen'),
            ...document.querySelectorAll('.waypoint-input'),
            document.getElementById('destino')
        ].map(i => i.value.trim()).filter(val => val !== "");

        // Collect points for return trip: (Destino) -> Return Waypoints -> Origen
        const returnWaypoints = Array.from(document.querySelectorAll('.waypoint-input-return'))
                                    .map(i => i.value.trim())
                                    .filter(val => val !== "");

        if (forwardPoints.length >= 2 && !isRouting) {
            isRouting = true;
            statusBox.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Localizando y trazando ruta completa...';
            statusBox.style.color = '#d97706';

            try {
                // Build complete location list
                const locationNames = [...forwardPoints];
                
                // If return stops exist, we loop back to origin
                if (returnWaypoints.length > 0) {
                    locationNames.push(...returnWaypoints);
                    locationNames.push(document.getElementById('origen').value.trim());
                }

                const locations = [];
                for (const val of locationNames) {
                    const loc = await geocode(val);
                    if (!loc) throw new Error(`No se pudo localizar: ${val}`);
                    locations.push([loc.lon, loc.lat]);
                }

                const route = await getRoute(locations);
                if (!route) throw new Error("Sin ruta vial conectando estos puntos.");

                const distanceKm = route.distance / 1000;
                const durationHrs = route.duration / 3600;

                drawRouteAndFormatDOM(distanceKm, durationHrs, route.geometry);
                calculateCosts();

                const msg = returnWaypoints.length > 0 ? 'Ruta de Circuito Completo trazada.' : 'Ruta fijada y calculada.';
                statusBox.innerHTML = `<i class="ph-fill ph-check-circle"></i> ${msg}`;
                statusBox.style.color = '#10b981';
            } catch (err) {
                statusBox.innerHTML = `<i class="ph-fill ph-warning-circle"></i> ${err.message}`;
                statusBox.style.color = '#ef4444';
            } finally {
                isRouting = false;
            }
        }
    };

    document.getElementById('origen').addEventListener('change', autoTriggerRoute);
    document.getElementById('destino').addEventListener('change', autoTriggerRoute);
    document.getElementById('origen').addEventListener('blur', autoTriggerRoute);
    document.getElementById('destino').addEventListener('blur', autoTriggerRoute);

    // --- RETURN TRIP TOGGLE LOGIC ---
    document.getElementById('retorno-vacio').addEventListener('change', () => {
        if (document.getElementById('distancia').dataset.base) {
            calculateCosts();
        }
    });

    // --- DYNAMIC COST COMPUTATION ON INPUT CHANGES ---
    const inputsToWatch = form.querySelectorAll('input:not(.route-input):not(#retorno-vacio)');
    inputsToWatch.forEach(input => {
        input.addEventListener('input', () => {
            if (document.getElementById('distancia').dataset.base) {
                calculateCosts();
            }
        });
    });

    // --- PDF MODAL LOGIC ---
    const pdfModal = document.getElementById('pdf-modal');

    document.getElementById('btn-preview').addEventListener('click', function () {
        if (!document.getElementById('distancia').value || document.getElementById('distancia').value == 0) {
            alert("Por favor, trace una ruta primero introduciendo puntos logísticos.");
            return;
        }
        calculateCosts();
        pdfModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    const closeModal = () => {
        pdfModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-pdf').addEventListener('click', closeModal);
    pdfModal.addEventListener('click', (e) => { if (e.target === pdfModal) closeModal(); });

    // --- HTML2PDF DOWNLOAD LOGIC ---
    document.getElementById('btn-download-pdf').addEventListener('click', function () {
        const btn = this;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Convirtiendo a PDF...';
        btn.style.opacity = '0.8';

        const element = document.getElementById('invoice-template');
        const opt = {
            margin: 0,
            filename: `Factura_RouteFlow_${document.getElementById('pdf-random-id').textContent}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> ¡Descarga Exitosa!';
            saveQuoteToHistory(); // Auto-save on PDF generation

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.opacity = '1';
                closeModal();
            }, 2000);
        });
    });

    // --- QUOTE HISTORY LOGIC ---
    document.getElementById('btn-save-quote').addEventListener('click', function () {
        if (!document.getElementById('distancia').dataset.base) {
            alert("No hay ruta cotizada para guardar."); return;
        }
        saveQuoteToHistory();
        this.innerHTML = '<i class="ph-fill ph-check"></i> ¡Guardada!';
        setTimeout(() => { this.innerHTML = '<i class="ph ph-floppy-disk"></i> Guardar Cotización'; }, 2000);
    });

    function saveQuoteToHistory() {
        if (!window.currentQuoteState) return;

        let quotes = JSON.parse(localStorage.getItem('routeflow_quotes')) || [];

        const origen = document.getElementById('origen').value.split(',')[0].trim() || '?';
        const destino = document.getElementById('destino').value.split(',')[0].trim() || '?';
        const stops = document.querySelectorAll('.waypoint-input').length;
        const routeName = stops > 0 ? `${origen} → +${stops} paradas → ${destino}` : `${origen} → ${destino}`;

        const quoteObj = {
            id: document.getElementById('pdf-random-id').textContent || Math.floor(100000 + Math.random() * 900000),
            date: new Date().toLocaleDateString('es-CO'),
            route: routeName,
            cliente: document.getElementById('cliente-nombre').value.trim(),
            price: currencyFormatter.format(window.currentQuoteState.Precio),
            // Store raw values for loading back
            rawData: {
                origen: document.getElementById('origen').value.trim(),
                destino: document.getElementById('destino').value.trim(),
                distancia: document.getElementById('distancia').value,
                tiempo: document.getElementById('tiempo').value,
                peso: document.getElementById('peso').value,
                costoKm: document.getElementById('costo-km').value,
                costoTon: document.getElementById('costo-tonelada').value,
                costoHora: document.getElementById('costo-hora').value,
                combustible: document.getElementById('combustible').value,
                peajes: document.getElementById('peajes').value,
                viaticos: document.getElementById('viaticos').value,
                cargue: document.getElementById('cargue').value,
                costoFijo: document.getElementById('costo-fijo').value,
                margen: document.getElementById('margen').value,
                retorno: document.getElementById('retorno-vacio').checked,
                distBase: document.getElementById('distancia').dataset.base || ''
            }
        };

        // Prepend and keep only last 10
        quotes.unshift(quoteObj);
        quotes = quotes.slice(0, 10);
        localStorage.setItem('routeflow_quotes', JSON.stringify(quotes));
        renderHistory();
    }

    function loadQuoteIntoCalculator(rawData) {
        // Fill route info
        document.getElementById('origen').value = rawData.origen || '';
        document.getElementById('destino').value = rawData.destino || '';

        // Fill numeric fields
        const distEl = document.getElementById('distancia');
        distEl.value = rawData.distancia;
        distEl.dataset.base = rawData.distBase;
        document.getElementById('tiempo').value = rawData.tiempo;
        document.getElementById('tiempo').dataset.base = rawData.distBase ? (parseFloat(rawData.tiempo) / (rawData.retorno ? 2 : 1)).toFixed(1) : '';

        document.getElementById('peso').value = rawData.peso;
        document.getElementById('costo-km').value = rawData.costoKm;
        document.getElementById('costo-tonelada').value = rawData.costoTon;
        document.getElementById('costo-hora').value = rawData.costoHora;
        document.getElementById('combustible').value = rawData.combustible;
        document.getElementById('peajes').value = rawData.peajes;
        document.getElementById('viaticos').value = rawData.viaticos;
        document.getElementById('cargue').value = rawData.cargue;
        document.getElementById('costo-fijo').value = rawData.costoFijo;
        document.getElementById('margen').value = rawData.margen;
        document.getElementById('retorno-vacio').checked = rawData.retorno || false;

        calculateCosts();

        // Switch to calculator tab
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
        document.querySelector('[data-tab="tab-calculadora"]').classList.add('active');
        document.getElementById('tab-calculadora').classList.add('active');
    }

    function deleteQuote(id) {
        let quotes = JSON.parse(localStorage.getItem('routeflow_quotes')) || [];
        quotes = quotes.filter(q => q.id != id);
        localStorage.setItem('routeflow_quotes', JSON.stringify(quotes));
        renderHistory();
    }

    function openPDFFromHistory(q) {
        if (!q.rawData) {
            alert('Esta cotización no tiene datos suficientes para generar la factura.');
            return;
        }
        const r = q.rawData;

        // Populate PDF template fields directly from stored data
        document.getElementById('pdf-origen').textContent = (r.origen || 'No Especificado').split(',')[0];
        document.getElementById('pdf-destino').textContent = (r.destino || 'No Especificado').split(',')[0];

        const D = parseFloat(r.distancia) || 0;
        const T = parseFloat(r.tiempo) || 0;
        const P = parseFloat(r.peso) || 0;
        document.getElementById('pdf-dist').textContent = `${D.toFixed(1)} km`;
        document.getElementById('pdf-tiempo').textContent = `${T.toFixed(1)} hrs`;
        document.getElementById('pdf-peso').textContent = `${P.toFixed(1)} Ton`;

        const Ckm  = parseFloat(r.costoKm)  || 0;
        const Cp   = parseFloat(r.costoTon)  || 0;
        const Ct   = parseFloat(r.costoHora) || 0;
        const Cf   = parseFloat(r.costoFijo) || 0;
        const Comb = parseFloat(r.combustible) || 0;
        const Peajes = parseFloat(r.peajes) || 0;
        const Viat = parseFloat(r.viaticos) || 0;
        const Carg = parseFloat(r.cargue)   || 0;
        const margenPerc = parseFloat(r.margen) || 0;

        const costoDistancia = Ckm * D;
        const costoPeso      = Cp  * P;
        const costoTiempo    = Ct  * T;
        const CT = costoDistancia + costoPeso + costoTiempo + Comb + Peajes + Viat + Carg + Cf;
        const TotalMargenValue = CT * (margenPerc / 100);
        const Precio = CT + TotalMargenValue;

        document.getElementById('pdf-base-km').textContent   = D.toFixed(1);
        document.getElementById('pdf-base-ton').textContent  = P.toFixed(1);
        document.getElementById('pdf-base-hora').textContent = T.toFixed(1);

        document.getElementById('pdf-tarifa-km').textContent   = currencyFormatter.format(Ckm);
        document.getElementById('pdf-total-km').textContent    = currencyFormatter.format(costoDistancia);
        document.getElementById('pdf-tarifa-ton').textContent  = currencyFormatter.format(Cp);
        document.getElementById('pdf-total-ton').textContent   = currencyFormatter.format(costoPeso);

        document.getElementById('pdf-tarifa-hora').textContent = currencyFormatter.format(Ct);
        document.getElementById('pdf-total-hora').textContent = currencyFormatter.format(costoTiempo);
        document.getElementById('pdf-total-combustible').textContent = currencyFormatter.format(Comb);
        document.getElementById('pdf-peajes').textContent     = currencyFormatter.format(Peajes);
        document.getElementById('pdf-viaticos').textContent   = currencyFormatter.format(Viat);
        document.getElementById('pdf-cargue').textContent     = currencyFormatter.format(Carg);
        document.getElementById('pdf-fijo').textContent       = currencyFormatter.format(Cf);
        document.getElementById('pdf-ct').textContent         = currencyFormatter.format(CT);
        document.getElementById('pdf-margen').textContent     = `${margenPerc}%`;
        document.getElementById('pdf-margen-val').textContent = currencyFormatter.format(TotalMargenValue);
        document.getElementById('pdf-precio-final').textContent = currencyFormatter.format(Precio);
        document.getElementById('pdf-retorno-badge').style.display = r.retorno ? 'inline' : 'none';

        // Set date and doc number from the stored quote
        document.getElementById('pdf-date').textContent      = q.date;
        document.getElementById('pdf-random-id').textContent = q.id;

        // Open the modal
        document.getElementById('pdf-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function renderHistory(filters = {}) {
        const histContainer = document.getElementById('history-list');
        let quotes = JSON.parse(localStorage.getItem('routeflow_quotes')) || [];

        // Apply filters
        if (filters.from || filters.to || filters.search) {
            quotes = quotes.filter(q => {
                // Date filter — parse dd/mm/yyyy as used by es-CO locale
                if (filters.from || filters.to) {
                    const parts = q.date.split('/');
                    // es-CO: day/month/year
                    const qDate = parts.length === 3
                        ? new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`)
                        : null;
                    if (qDate) {
                        if (filters.from && qDate < new Date(filters.from)) return false;
                        if (filters.to   && qDate > new Date(filters.to))   return false;
                    }
                }
                // Text filter
                if (filters.search) {
                    const haystack = `${q.route} ${q.cliente || ''} RF-${q.id}`.toLowerCase();
                    if (!haystack.includes(filters.search)) return false;
                }
                return true;
            });
        }

        if (quotes.length === 0) {
            histContainer.innerHTML = '<div class="empty-history"><i class="ph ph-tray" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.4;"></i>No hay cotizaciones para mostrar.</div>';
            return;
        }

        histContainer.innerHTML = '';
        quotes.forEach(q => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const clienteLabel = q.cliente ? `<span style="color:var(--accent-color);font-weight:700;">${q.cliente}</span> &nbsp;•&nbsp; ` : '';
            item.innerHTML = `
                <div class="history-details">
                    <p title="${q.route}">${q.route}</p>
                    <small>${clienteLabel}<i class="ph ph-hash"></i> RF-${q.id} &nbsp;•&nbsp; <i class="ph ph-calendar"></i> ${q.date}</small>
                </div>
                <div class="history-right">
                    <span class="history-price">${q.price}</span>
                    <div class="history-actions">
                        <button type="button" class="btn-hist-action pdf-btn" title="Generar Factura PDF" data-action="pdf">
                            <i class="ph ph-file-pdf"></i>
                        </button>
                        <button type="button" class="btn-hist-action" title="Cargar en calculadora" data-action="load">
                            <i class="ph ph-arrow-u-up-left"></i>
                        </button>
                        <button type="button" class="btn-hist-action delete" title="Eliminar cotización" data-action="delete">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;

            // Bind button events
            item.querySelector('[data-action="pdf"]').addEventListener('click', (e) => {
                e.stopPropagation();
                openPDFFromHistory(q);
            });

            item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`¿Eliminar cotización RF-${q.id}?`)) deleteQuote(q.id);
            });

            item.querySelector('[data-action="load"]').addEventListener('click', (e) => {
                e.stopPropagation();
                if (q.rawData) {
                    loadQuoteIntoCalculator(q.rawData);
                } else {
                    alert('Esta cotización no tiene datos cargables (fue guardada con una versión anterior).');
                }
            });

            histContainer.appendChild(item);
        });
    }
});
