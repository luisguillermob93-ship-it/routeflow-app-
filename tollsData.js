/**
 * Base de Datos Representativa de Peajes en Colombia (Tarifas proyectadas 2026 INVIAS/ANI)
 * 
 * Contiene coordenadas geográficas estratégicas para la intersección de rutas logísticas,
 * usando el modelo tarifario para Categoría 3 y Categoría 4.
 * 
 * Categoría 3 (cat3): Camiones de 2 ejes pequeños (Aprox. modelo 2.5T)
 * Categoría 4 (cat4): Camiones de 2 ejes grandes (Aprox. modelo 5.2T)
 */

const TOLLS_DB = [
    // BOGOTA AREA & CUNDINAMARCA
    { id: 'p_calle13', name: 'Peaje Río Bogotá (Calle 13)', lat: 4.697419, lon: -74.152864, cat3: 15300, cat4: 20200 },
    { id: 'p_siberia', name: 'Peaje Siberia (Calle 80)', lat: 4.74313, lon: -74.14811, cat3: 28500, cat4: 38200 },
    { id: 'p_andes', name: 'Peaje Andes (Autopista Norte)', lat: 4.8094, lon: -74.0435, cat3: 22000, cat4: 31000 },
    { id: 'p_chusaca', name: 'Peaje Chusacá (AutoSur)', lat: 4.545892, lon: -74.254641, cat3: 28500, cat4: 38200 },
    { id: 'p_elcorzo', name: 'Peaje El Corzo (Vía Faca)', lat: 4.811807, lon: -74.316828, cat3: 28500, cat4: 38200 },
    { id: 'p_boqueron', name: 'Peaje Boquerón (Vía Melgar)', lat: 4.2882, lon: -74.5298, cat3: 31000, cat4: 43000 },
    { id: 'p_chinauta', name: 'Peaje Chinauta', lat: 4.2494, lon: -74.4566, cat3: 31000, cat4: 43000 },

    // BOYACA & SANTANDER (Ruta Nacional 55)
    { id: 'p_albarracin', name: 'Peaje Albarracín (Vía Tunja)', lat: 5.158580, lon: -73.666998, cat3: 24300, cat4: 31000 },
    { id: 'p_elroble', name: 'Peaje El Roble', lat: 4.9754, lon: -73.8447, cat3: 23000, cat4: 30000 },
    { id: 'p_tuta', name: 'Peaje Tuta', lat: 5.7001, lon: -73.2384, cat3: 22000, cat4: 29500 },
    { id: 'p_curiti', name: 'Peaje Curití (San Gil)', lat: 6.6025, lon: -73.0855, cat3: 24000, cat4: 32000 },
    { id: 'p_loscuros', name: 'Peaje Los Curos', lat: 6.9538, lon: -73.0428, cat3: 25000, cat4: 35000 },
    { id: 'p_rionegro_san', name: 'Peaje Rionegro (Santander)', lat: 7.2625, lon: -73.1492, cat3: 26000, cat4: 34000 },
    { id: 'p_lalizama', name: 'Peaje La Lizama', lat: 6.9583, lon: -73.6191, cat3: 28000, cat4: 36000 },

    // MEDELLIN & ANTIOQUIA
    { id: 'p_copacabana', name: 'Peaje Copacabana (Med Norte)', lat: 6.368367, lon: -75.498864, cat3: 25000, cat4: 35000 },
    { id: 'p_trapiche', name: 'Peaje Trapiche (Barbosa)', lat: 6.4258, lon: -75.3144, cat3: 26000, cat4: 35000 },
    { id: 'p_primavera', name: 'Peaje Primavera (Caldas)', lat: 6.0683, lon: -75.6261, cat3: 27000, cat4: 36000 },
    { id: 'p_amaga', name: 'Peaje Amagá', lat: 6.0275, lon: -75.7002, cat3: 23000, cat4: 31000 },
    { id: 'p_occidente', name: 'Peaje Túnel de Occidente', lat: 6.2731, lon: -75.6322, cat3: 31000, cat4: 42000 },
    { id: 'p_cocorna', name: 'Peaje Cocorná (Bog-Med)', lat: 6.042555, lon: -75.140884, cat3: 38000, cat4: 48000 },
    { id: 'p_puertotriunfo', name: 'Peaje Puerto Triunfo (Ruta Sol)', lat: 5.867946, lon: -74.636652, cat3: 35000, cat4: 45600 },

    // RUTA DEL SOL & NORTE
    { id: 'p_zambito', name: 'Peaje Aguas Negras (Zambito)', lat: 6.4022, lon: -74.4036, cat3: 31000, cat4: 41000 },
    { id: 'p_elcopey', name: 'Peaje El Copey', lat: 10.1500, lon: -73.9555, cat3: 25000, cat4: 35000 },
    { id: 'p_tucurinca', name: 'Peaje Tucurinca', lat: 10.6622, lon: -74.1533, cat3: 22000, cat4: 32000 },
    { id: 'p_tasajera', name: 'Peaje Tasajera', lat: 10.9855, lon: -74.3400, cat3: 29000, cat4: 39000 },
    { id: 'p_puertocolombia', name: 'Peaje Puerto Colombia', lat: 11.0022, lon: -74.8877, cat3: 23000, cat4: 31000 },
    { id: 'p_palermo', name: 'Peaje Puente Pumarejo / Palermo', lat: 10.963162, lon: -74.761000, cat3: 20000, cat4: 25500 },
    { id: 'p_palmar', name: 'Peaje Sabanagrande / Palmar', lat: 10.702758, lon: -74.767936, cat3: 22000, cat4: 28000 },
    { id: 'p_bicentenario', name: 'Peaje Bicentenario (Cartagena)', lat: 10.596041, lon: -75.183709, cat3: 21000, cat4: 26000 },
    { id: 'p_gambote', name: 'Peaje Gambote', lat: 10.1666, lon: -75.2833, cat3: 21000, cat4: 28000 },
    { id: 'p_marahuaco', name: 'Peaje Marahuaco', lat: 10.6388, lon: -75.1055, cat3: 22000, cat4: 30000 },

    // EJE CAFETERO & VALLE
    { id: 'p_gualanday', name: 'Peaje Gualanday (Vía Ibagué)', lat: 4.315579, lon: -75.050516, cat3: 29800, cat4: 39500 },
    { id: 'p_cajamarca', name: 'Peaje Cajamarca', lat: 4.4372, lon: -75.4322, cat3: 24000, cat4: 33000 },
    { id: 'p_lalinea', name: 'Peaje La Línea', lat: 4.5122, lon: -75.6011, cat3: 45000, cat4: 65000 },
    { id: 'p_cerritos', name: 'Peaje Cerritos (Pereira)', lat: 4.832717, lon: -75.836173, cat3: 25600, cat4: 35200 },
    { id: 'p_corozal', name: 'Peaje Corozal (Quindío)', lat: 4.4833, lon: -76.0166, cat3: 24000, cat4: 33000 },
    { id: 'p_betania', name: 'Peaje Betania (Buga)', lat: 4.0255, lon: -76.2411, cat3: 25000, cat4: 35000 },
    { id: 'p_rozo', name: 'Peaje Rozo (Palmira)', lat: 3.6166, lon: -76.3500, cat3: 21000, cat4: 30000 },
    { id: 'p_ciat', name: 'Peaje CIAT', lat: 3.5011, lon: -76.3588, cat3: 20000, cat4: 28000 },
    { id: 'p_estambul', name: 'Peaje Estambul', lat: 3.8222, lon: -76.2888, cat3: 21000, cat4: 29000 },

    // LLANOS
    { id: 'p_losllanos', name: 'Peaje Pípipiral / Los Llanos', lat: 4.283897, lon: -73.856942, cat3: 45000, cat4: 65000 },
    { id: 'p_puentep', name: 'Peaje Puente Amarillo (Restrepo)', lat: 4.218556, lon: -73.579471, cat3: 18000, cat4: 24500 },
    { id: 'p_naranjal', name: 'Peaje Naranjal', lat: 4.2188, lon: -73.8055, cat3: 42000, cat4: 58000 },

    // DEPARTAMENTO DE CORDOBA & SUCRE (Ruta al Mar & Troncal de Occidente)
    { id: 'p_garzones', name: 'Peaje Garzones (Montería-Cereté)', lat: 8.82500, lon: -75.82800, cat3: 16500, cat4: 21000 },
    { id: 'p_matadecana', name: 'Peaje Mata de Caña (Lorica)', lat: 9.09139, lon: -75.81985, cat3: 17200, cat4: 22000 },
    { id: 'p_sancarlos', name: 'Peaje San Carlos (vía San Carlos)', lat: 8.71004, lon: -75.71659, cat3: 16500, cat4: 21000 },
    { id: 'p_purgatorio', name: 'Peaje El Purgatorio (Vía Planeta Rica)', lat: 8.63043, lon: -75.76351, cat3: 17000, cat4: 21500 },
    { id: 'p_loscedros', name: 'Peaje Los Cedros (Vía Canalete/Arboletes)', lat: 8.83236, lon: -76.05176, cat3: 18000, cat4: 24000 },
    { id: 'p_laapartada', name: 'Peaje La Apartada (Córdoba-Antioquia)', lat: 8.03126, lon: -75.30171, cat3: 18000, cat4: 23500 }
];

window.TOLLS_DB = TOLLS_DB;
