// Base de datos de Tarifas Fijas de Agencia Montería 2025
// Tramos extrapolados para evitar fallas o fletes gratuitos marcados con /* E */

const AGENCY_RATES = {
    // Array order corresponds to weight tiers:
    // [ <1 Ton, 1.1-2.4 Ton, 2.5-3.6 Ton, 3.7-4.2 Ton, 4.3-5.2 Ton, 5.3-7.0 Ton, 7.1-10.0 Ton ]
    
    "monteria": [101000, 130000, 180000, 260000, 350000, 590000, 680000],
    "cerete": [127000, 160000, 290000, 350000, 410000, 700000 /* E */, 810000],
    "san pelayo": [127000, 160000, 210000, 350000, 410000, 700000, 810000],
    "cienaga de oro": [154000, 180000, 210000, 350000, 410000, 700000, 810000],
    "planeta rica": [170000, 210000, 290000, 390000, 480000, 700000, 810000],
    "lorica": [127000, 160000, 255000 /* E */, 350000, 410000, 700000, 810000],
    "sahagun": [278000, 330000, 390000, 520000, 660000, 1100000, 1300000],
    "buenavista": [278000, 330000, 390000, 520000, 660000, 1100000, 1300000],
    "viajano": [278000, 330000, 390000, 520000, 660000, 1100000, 1300000],
    "el viajano": [278000, 330000, 390000, 520000, 660000, 1100000, 1300000],
    "chinu": [278000, 330000, 390000, 520000, 660000, 1100000, 1300000],
    "coveñas": [324000, 360000, 470000, 590000, 780000, 1330000, 1580000],
    "tolu": [324000, 360000, 470000, 590000, 780000, 1330000, 1580000],
    "sincelejo": [383000, 410000, 520000, 680000, 910000, 1540000, 1830000],
    "san marcos": [383000, 410000, 520000, 680000, 910000, 1540000, 1830000],
    "san onofre": [383000, 410000, 520000, 680000, 910000, 1540000, 1830000],
    "magangue": [522000, 700000, 870000, 1040000, 1390000, 2090000, 2660000],
    "necocli": [684000, 750000, 950000, 1230000, 1650000, 2780000, 3300000],
    "montelibano": [753000, 800000 /* E */, 520000, 680000 /* E */, 910000 /* E */, 1540000 /* E */, 1830000 /* E */],
    "bagre": [1000000, 1000000, 1000000, 1000000, 1600000, 1600000, 1600000],
    "el bagre": [1000000, 1000000, 1000000, 1000000, 1600000, 1600000, 1600000]
};

// Return the appropriate fixed rate or null
function getFixedAgencyRate(destName, weight) {
    if (!destName || typeof destName !== 'string') return null;
    let target = destName.toLowerCase();
    
    // Find matching key in DB
    const matchingCity = Object.keys(AGENCY_RATES).find(city => {
        // We use word bounds or literal presence to match destination names like "Lorica, Cordoba"
        return target.includes(city);
    });

    if (!matchingCity) return null; // No fixed rate applies

    const table = AGENCY_RATES[matchingCity];
    let index = 0;

    // Weight tiers indexing
    if (weight < 1) index = 0;
    else if (weight <= 2.4) index = 1;
    else if (weight <= 3.6) index = 2;
    else if (weight <= 4.2) index = 3;
    else if (weight <= 5.2) index = 4;
    else if (weight <= 7.0) index = 5;
    else index = 6;

    return table[index];
}

window.getFixedAgencyRate = getFixedAgencyRate;
