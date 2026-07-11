const fs = require('fs');

const allData = JSON.parse(fs.readFileSync('/home/ubuntu/pakistan_flights/all_flight_data.json', 'utf8'));
const refData = JSON.parse(fs.readFileSync('/home/ubuntu/pakistan_flights/pakistan_aviation_complete_reference.json', 'utf8'));

// --- Generate CSV ---
const headers = ['from','from_name','to','to_name','price','currency','type','airline','duration_min','stops','departure_time','arrival_time','travel_class','source'];
let csv = headers.join(',') + '\n';
for (const e of allData) {
  const row = headers.map(h => {
    const val = e[h] !== undefined && e[h] !== null ? String(e[h]) : '';
    return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
  });
  csv += row.join(',') + '\n';
}
fs.writeFileSync('/home/ubuntu/pakistan_flights/all_flight_data.csv', csv);
console.log(`CSV generated: ${csv.length.toLocaleString()} bytes, ${allData.length} rows`);

// --- Generate Summary ---
const routes = {};
let owCount = 0, rtCount = 0, mcCount = 0;
const airlinesSet = new Set();

for (const e of allData) {
  if (e.type === 'one_way') owCount++;
  else if (e.type === 'round_trip') rtCount++;
  else if (e.type === 'multi_city') mcCount++;
  if (e.airline) airlinesSet.add(e.airline);

  const key = `${e.from}→${e.to}`;
  if (!routes[key]) {
    routes[key] = {
      from: e.from, from_name: e.from_name || '',
      to: e.to, to_name: e.to_name || '',
      cheapest_pkr: null, cheapest_airline: '',
      cheapest_aed: null, cheapest_aed_airline: '',
      airlines: new Set(), entries: 0
    };
  }
  routes[key].airlines.add(e.airline);
  routes[key].entries++;

  if (e.currency === 'PKR' && (routes[key].cheapest_pkr === null || e.price < routes[key].cheapest_pkr)) {
    routes[key].cheapest_pkr = e.price;
    routes[key].cheapest_airline = e.airline;
  }
  if (e.currency === 'AED' && (routes[key].cheapest_aed === null || e.price < routes[key].cheapest_aed)) {
    routes[key].cheapest_aed = e.price;
    routes[key].cheapest_aed_airline = e.airline;
  }
}

const summaryRoutes = {};
for (const [key, val] of Object.entries(routes)) {
  summaryRoutes[key] = {
    ...val,
    airlines: [...val.airlines].sort()
  };
}

const summary = {
  generated: '2026-07-11',
  total_entries: allData.length,
  total_routes: Object.keys(routes).length,
  breakdown: { one_way: owCount, round_trip: rtCount, multi_city: mcCount },
  airlines: [...airlinesSet].sort(),
  routes: summaryRoutes
};

fs.writeFileSync('/home/ubuntu/pakistan_flights/all_flight_data_summary.json', JSON.stringify(summary, null, 2));
console.log(`Summary generated: ${Object.keys(routes).length} routes, ${airlinesSet.size} airlines`);

// --- Generate Consolidated Report ---
const lines = [];
lines.push('='.repeat(72));
lines.push('PAKISTAN FLIGHTS DATA - CONSOLIDATED REPORT');
lines.push('Generated: 2026-07-11');
lines.push('='.repeat(72));
lines.push('');
lines.push(`Total Flight Entries: ${allData.length}`);
lines.push(`Unique Routes: ${Object.keys(routes).length}`);
lines.push(`Unique Airlines: ${airlinesSet.size}`);
lines.push('');
lines.push(`Breakdown by Type:`);
lines.push(`  One-way: ${owCount}`);
lines.push(`  Round-trip: ${rtCount}`);
lines.push(`  Multi-city: ${mcCount}`);
lines.push('');
lines.push('Sources: Google Flights (SerpAPI), Sastaticket.pk, AirArabia.com, SalamAir.com, Bookme.pk, Trip.com, legacy data');
lines.push('');
lines.push('-'.repeat(72));
lines.push('ROUTE SUMMARY (Cheapest PKR per route)');
lines.push('-'.repeat(72));
lines.push('');

const sortedKeys = Object.keys(summaryRoutes).sort();
for (const key of sortedKeys) {
  const r = summaryRoutes[key];
  const priceStr = r.cheapest_pkr !== null ? `PKR ${r.cheapest_pkr.toLocaleString()}` : (r.cheapest_aed !== null ? `AED ${r.cheapest_aed}` : 'N/A');
  lines.push(`${key.padEnd(14)} ${priceStr.padEnd(20)} ${r.cheapest_airline.padEnd(35)} ${r.airlines.length} airline(s)`);
}

lines.push('');
lines.push('-'.repeat(72));
lines.push('AIRLINES COVERED');
lines.push('-'.repeat(72));
lines.push('');
for (const a of [...airlinesSet].sort()) {
  lines.push(`  ${a}`);
}

lines.push('');
lines.push('-'.repeat(72));
lines.push('NEWLY ADDED (Web Research July 2026)');
lines.push('-'.repeat(72));
lines.push('');
const webResearchEntries = allData.filter(e => e.source === 'web_research_manual');
for (const e of webResearchEntries) {
  const priceStr = e.currency === 'PKR' ? `PKR ${e.price.toLocaleString()}` : `AED ${e.price}`;
  lines.push(`  ${e.from}→${e.to} | ${e.airline} | ${priceStr} | ${e.type} | ${e.duration_min}min`);
}

fs.writeFileSync('/home/ubuntu/pakistan_flights/consolidated_report_2026-07-11.txt', lines.join('\n'));
console.log(`Report generated: ${lines.length} lines`);

console.log('\nAll reports regenerated successfully.');
