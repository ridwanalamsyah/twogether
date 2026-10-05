/** Major Indonesian cities for prayer times when location access is off. */
export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { id: "jakarta", name: "Jakarta", lat: -6.2088, lng: 106.8456 },
  { id: "bogor", name: "Bogor", lat: -6.595, lng: 106.8166 },
  { id: "depok", name: "Depok", lat: -6.4025, lng: 106.7942 },
  { id: "tangerang", name: "Tangerang", lat: -6.1783, lng: 106.6319 },
  { id: "bekasi", name: "Bekasi", lat: -6.2383, lng: 106.9756 },
  { id: "bandung", name: "Bandung", lat: -6.9175, lng: 107.6191 },
  { id: "cirebon", name: "Cirebon", lat: -6.732, lng: 108.5523 },
  { id: "semarang", name: "Semarang", lat: -6.9667, lng: 110.4167 },
  { id: "yogyakarta", name: "Yogyakarta", lat: -7.7956, lng: 110.3695 },
  { id: "solo", name: "Solo", lat: -7.5755, lng: 110.8243 },
  { id: "purwokerto", name: "Purwokerto", lat: -7.4246, lng: 109.2342 },
  { id: "surabaya", name: "Surabaya", lat: -7.2575, lng: 112.7521 },
  { id: "malang", name: "Malang", lat: -7.9666, lng: 112.6326 },
  { id: "jember", name: "Jember", lat: -8.1724, lng: 113.6995 },
  { id: "serang", name: "Serang", lat: -6.1104, lng: 106.164 },
  { id: "denpasar", name: "Denpasar", lat: -8.6705, lng: 115.2126 },
  { id: "mataram", name: "Mataram", lat: -8.5833, lng: 116.1167 },
  { id: "kupang", name: "Kupang", lat: -10.1772, lng: 123.607 },
  { id: "banda-aceh", name: "Banda Aceh", lat: 5.5483, lng: 95.3238 },
  { id: "medan", name: "Medan", lat: 3.5952, lng: 98.6722 },
  { id: "padang", name: "Padang", lat: -0.9471, lng: 100.4172 },
  { id: "pekanbaru", name: "Pekanbaru", lat: 0.5071, lng: 101.4478 },
  { id: "batam", name: "Batam", lat: 1.0456, lng: 104.0305 },
  { id: "jambi", name: "Jambi", lat: -1.6101, lng: 103.6131 },
  { id: "palembang", name: "Palembang", lat: -2.9761, lng: 104.7754 },
  { id: "bengkulu", name: "Bengkulu", lat: -3.8004, lng: 102.2655 },
  { id: "bandar-lampung", name: "Bandar Lampung", lat: -5.3971, lng: 105.2668 },
  { id: "pangkalpinang", name: "Pangkalpinang", lat: -2.1316, lng: 106.1169 },
  { id: "pontianak", name: "Pontianak", lat: -0.0263, lng: 109.3425 },
  { id: "palangkaraya", name: "Palangka Raya", lat: -2.2161, lng: 113.914 },
  { id: "banjarmasin", name: "Banjarmasin", lat: -3.3194, lng: 114.5908 },
  { id: "balikpapan", name: "Balikpapan", lat: -1.2379, lng: 116.8529 },
  { id: "samarinda", name: "Samarinda", lat: -0.5022, lng: 117.1536 },
  { id: "makassar", name: "Makassar", lat: -5.1477, lng: 119.4327 },
  { id: "manado", name: "Manado", lat: 1.4748, lng: 124.8421 },
  { id: "palu", name: "Palu", lat: -0.8917, lng: 119.8707 },
  { id: "kendari", name: "Kendari", lat: -3.9985, lng: 122.513 },
  { id: "gorontalo", name: "Gorontalo", lat: 0.5435, lng: 123.0568 },
  { id: "ambon", name: "Ambon", lat: -3.6954, lng: 128.1814 },
  { id: "ternate", name: "Ternate", lat: 0.7893, lng: 127.3772 },
  { id: "jayapura", name: "Jayapura", lat: -2.5337, lng: 140.7181 },
];
