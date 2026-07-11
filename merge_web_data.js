const fs = require('fs');

const allData = JSON.parse(fs.readFileSync('/home/ubuntu/pakistan_flights/all_flight_data.json', 'utf8'));
const webData = JSON.parse(fs.readFileSync('/home/ubuntu/pakistan_flights/web_researched_prices.json', 'utf8'));
const refData = JSON.parse(fs.readFileSync('/home/ubuntu/pakistan_flights/pakistan_aviation_complete_reference.json', 'utf8'));

const newEntries = [];

for (const r of webData.routes) {
  let price = 0;
  let currency = 'PKR';
  if (r.price_pkr) {
    price = r.price_pkr;
    currency = 'PKR';
  } else if (r.price_aed) {
    price = r.price_aed;
    currency = 'AED';
  }

  const entry = {
    from: r.from,
    from_name: r.from_name,
    to: r.to,
    to_name: r.to_name,
    price: price,
    currency: currency,
    type: 'one_way',
    airline: r.airline,
    duration_min: r.duration_min || null,
    stops: r.stops || 0,
    departure_time: '',
    arrival_time: '',
    travel_class: '',
    source: 'web_research_manual'
  };
  newEntries.push(entry);
}

// Check for duplicates before adding
const existingKeys = new Set();
for (const e of allData) {
  existingKeys.add(`${e.from}-${e.to}-${e.airline}-${e.type}`);
}

let added = 0;
let skipped = 0;
for (const ne of newEntries) {
  const key = `${ne.from}-${ne.to}-${ne.airline}-${ne.type}`;
  if (!existingKeys.has(key)) {
    allData.push(ne);
    existingKeys.add(key);
    added++;
  } else {
    skipped++;
  }
}

console.log(`Added ${added} new entries, skipped ${skipped} duplicates`);
console.log(`Total entries now: ${allData.length}`);

// Write updated all_flight_data.json
fs.writeFileSync('/home/ubuntu/pakistan_flights/all_flight_data.json', JSON.stringify(allData, null, 2));

// --- Update reference file ---

// Update missing_airports_data prices
const priceMap = {};
for (const r of webData.routes) {
  const key = `${r.from}→${r.to}`;
  if (!priceMap[key]) priceMap[key] = [];
  priceMap[key].push({
    airline: r.airline,
    price_pkr: r.price_pkr || null,
    price_aed: r.price_aed || null,
    duration_min: r.duration_min,
    source: r.source
  });
}

// Update the reference
refData.missing_airports_data.GWD.prices = priceMap['KHI→GWD'] || [];
refData.missing_airports_data.KDU.prices = priceMap['ISB→KDU'] || [];
refData.missing_airports_data.GIL.prices = priceMap['ISB→GIL'] || [];
refData.missing_airports_data.TUK.prices = priceMap['KHI→TUK'] || [];
refData.missing_airports_data.SKZ.prices = priceMap['KHI→SKZ'] || [];
refData.missing_airports_data.RYK.prices = priceMap['KHI→RYK'] || [];
refData.missing_airports_data.BHV.prices = priceMap['KHI→BHV'] || [];
refData.missing_airports_data.LYP.prices = priceMap['KHI→LYP'] || [];
refData.missing_airports_data.DEA.prices = priceMap['KHI→DEA'] || [];

// Update UAE domestic routes with prices
for (const uaeRoute of refData.uae_domestic_routes.routes) {
  const keyFrom = `${uaeRoute.from}→${uaeRoute.to}`;
  const revKey = `${uaeRoute.to}→${uaeRoute.from}`;
  if (priceMap[keyFrom]) {
    uaeRoute.prices = priceMap[keyFrom];
  }
  if (priceMap[revKey]) {
    uaeRoute.reverse_prices = priceMap[revKey];
  }
}

// Add a note about prices now being available
refData.sources.push('Sastaticket.pk', 'AirArabia.com', 'SalamAir.com', 'Bookme.pk', 'Trip.com', 'FlyJinnah.com');
refData.note_web_research_complete = "Web research (July 2026) filled pricing for previously missing small airport domestic routes (GWD, KDU, GIL, TUK, SKZ, RYK, BHV, LYP, DEA) as well as UAE domestic routes and ISB→SHJ/ISB→MCT/ISB→KDU. All added to all_flight_data.json.";

fs.writeFileSync('/home/ubuntu/pakistan_flights/pakistan_aviation_complete_reference.json', JSON.stringify(refData, null, 2));

console.log('Files updated successfully');
