import chatwootAPI from './chatwoot';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'CaenCRM/1.0';
const RATE_LIMIT_MS = 1100;

let lastNominatimRequest = 0;

async function rateLimitedFetch(url: string): Promise<any> {
  const elapsed = Date.now() - lastNominatimRequest;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastNominatimRequest = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Erro na busca (${res.status})`);
  return res.json();
}

export interface ProspectResult {
  osmId: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  category?: string;
  type?: string;
}

export interface SearchParams {
  query: string;
  location: string;
  filters?: {
    hasWebsite?: boolean;
    hasPhone?: boolean;
  };
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  results: ProspectResult[];
  total: number;
  hasMore: boolean;
}

type TagPair = { key: string; value: string };

const BUSINESS_TYPE_MAP: Record<string, TagPair[]> = {
  restaurante: [{ key: 'amenity', value: 'restaurant' }],
  restaurantes: [{ key: 'amenity', value: 'restaurant' }],
  pizza: [{ key: 'amenity', value: 'restaurant' }, { key: 'cuisine', value: 'pizza' }],
  pizzaria: [{ key: 'amenity', value: 'restaurant' }, { key: 'cuisine', value: 'pizza' }],
  'clínica': [{ key: 'amenity', value: 'clinic' }, { key: 'healthcare', value: 'clinic' }],
  'clínicas': [{ key: 'amenity', value: 'clinic' }, { key: 'healthcare', value: 'clinic' }],
  'clinica': [{ key: 'amenity', value: 'clinic' }, { key: 'healthcare', value: 'clinic' }],
  'clinicas': [{ key: 'amenity', value: 'clinic' }, { key: 'healthcare', value: 'clinic' }],
  medico: [{ key: 'amenity', value: 'doctors' }],
  'médico': [{ key: 'amenity', value: 'doctors' }],
  medicos: [{ key: 'amenity', value: 'doctors' }],
  'médicos': [{ key: 'amenity', value: 'doctors' }],
  dentista: [{ key: 'amenity', value: 'dentist' }],
  dentistas: [{ key: 'amenity', value: 'dentist' }],
  advogado: [{ key: 'office', value: 'lawyer' }],
  advogados: [{ key: 'office', value: 'lawyer' }],
  hospital: [{ key: 'amenity', value: 'hospital' }],
  hospitais: [{ key: 'amenity', value: 'hospital' }],
  farmacia: [{ key: 'amenity', value: 'pharmacy' }],
  'farmácia': [{ key: 'amenity', value: 'pharmacy' }],
  farmacias: [{ key: 'amenity', value: 'pharmacy' }],
  'farmácias': [{ key: 'amenity', value: 'pharmacy' }],
  mercado: [{ key: 'shop', value: 'supermarket' }],
  mercados: [{ key: 'shop', value: 'supermarket' }],
  supermercado: [{ key: 'shop', value: 'supermarket' }],
  padaria: [{ key: 'shop', value: 'bakery' }],
  padarias: [{ key: 'shop', value: 'bakery' }],
  cafe: [{ key: 'amenity', value: 'cafe' }],
  'café': [{ key: 'amenity', value: 'cafe' }],
  bar: [{ key: 'amenity', value: 'bar' }],
  bares: [{ key: 'amenity', value: 'bar' }],
  academia: [{ key: 'leisure', value: 'fitness_centre' }],
  academias: [{ key: 'leisure', value: 'fitness_centre' }],
  escola: [{ key: 'amenity', value: 'school' }],
  escolas: [{ key: 'amenity', value: 'school' }],
  hotel: [{ key: 'tourism', value: 'hotel' }],
  hoteis: [{ key: 'tourism', value: 'hotel' }],
  'hotéis': [{ key: 'tourism', value: 'hotel' }],
  igreja: [{ key: 'amenity', value: 'place_of_worship' }],
  igrejas: [{ key: 'amenity', value: 'place_of_worship' }],
  oficina: [{ key: 'shop', value: 'car_repair' }],
  'oficina mecânica': [{ key: 'shop', value: 'car_repair' }],
  mecanico: [{ key: 'shop', value: 'car_repair' }],
  'mecânico': [{ key: 'shop', value: 'car_repair' }],
  'salão': [{ key: 'shop', value: 'hairdresser' }],
  'salao': [{ key: 'shop', value: 'hairdresser' }],
  cabeleireiro: [{ key: 'shop', value: 'hairdresser' }],
  'pet shop': [{ key: 'shop', value: 'pet' }],
  veterinario: [{ key: 'amenity', value: 'veterinary' }],
  'veterinário': [{ key: 'amenity', value: 'veterinary' }],
  'veterinarios': [{ key: 'amenity', value: 'veterinary' }],
  'veterinários': [{ key: 'amenity', value: 'veterinary' }],
  imobiliaria: [{ key: 'office', value: 'real_estate' }],
  'imobiliária': [{ key: 'office', value: 'real_estate' }],
  corretor: [{ key: 'office', value: 'real_estate' }],
  corretores: [{ key: 'office', value: 'real_estate' }],
  engenheiro: [{ key: 'office', value: 'engineer' }],
  arquiteto: [{ key: 'office', value: 'architect' }],
  contador: [{ key: 'office', value: 'accountant' }],
  contabilidade: [{ key: 'office', value: 'accountant' }],
};

function mapQueryToTags(query: string): TagPair[] | null {
  const q = query.toLowerCase().trim();
  if (BUSINESS_TYPE_MAP[q]) return BUSINESS_TYPE_MAP[q];
  for (const [key, tags] of Object.entries(BUSINESS_TYPE_MAP)) {
    if (q.includes(key)) return tags;
  }
  return null;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number; bbox: string } | null> {
  try {
    const data = await rateLimitedFetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(location)}&limit=1`
    );
    if (!data || data.length === 0) return null;
    const item = data[0];
    const [west, south, east, north] = item.boundingbox || [item.lat, item.lon, item.lat, item.lon];
    return {
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      bbox: `${south},${west},${north},${east}`,
    };
  } catch {
    return null;
  }
}

function parseOverpassElement(el: any): ProspectResult | null {
  const tags = el.tags || {};
  if (!tags.name) return null;
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (!lat || !lon) return null;

  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
  const city = tags['addr:city'] || '';
  const address = [street, city].filter(Boolean).join(' - ') || 'Endereço não disponível';

  return {
    osmId: `${el.type}/${el.id}`,
    name: tags.name,
    address,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    phone: tags.phone || tags['contact:phone'] || undefined,
    website: tags.website || tags['contact:website'] || undefined,
    category: tags.amenity || tags.shop || tags.office || tags.leisure || tags.tourism || undefined,
    type: tags.cuisine || tags.healthcare || undefined,
  };
}

async function searchOverpass(tags: TagPair[], bbox: string): Promise<ProspectResult[]> {
  const filterStr = tags.map(t => `["${t.key}"="${t.value}"]`).join('');
  const query = `[out:json][timeout:25];(node${filterStr}(${bbox});way${filterStr}(${bbox});relation${filterStr}(${bbox}););out center meta tags 100;`;

  try {
    const res = await fetch(OVERPASS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass error (${res.status})`);
    const data = await res.json();
    const results: ProspectResult[] = [];
    for (const el of (data.elements || [])) {
      const parsed = parseOverpassElement(el);
      if (parsed) results.push(parsed);
    }
    return results;
  } catch {
    return [];
  }
}

async function searchNominatim(query: string, location: string): Promise<ProspectResult[]> {
  const q = [query, location].filter(Boolean).join(' ');
  if (!q.trim()) return [];
  try {
    const data = await rateLimitedFetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q.trim())}&limit=50&extratags=1`
    );
    return (data || []).map((item: any) => ({
      osmId: `${item.osm_type || 'node'}/${item.osm_id}`,
      name: item.name || item.display_name?.split(',')[0] || 'Sem nome',
      address: item.display_name || '',
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      phone: item.extratags?.phone || undefined,
      website: item.extratags?.website || undefined,
      category: item.category || undefined,
      type: item.type || undefined,
    })).filter((r: ProspectResult) => r.name && r.name !== 'Sem nome');
  } catch {
    return [];
  }
}

export async function searchProspects(params: SearchParams): Promise<SearchResponse> {
  const { query, location, filters, page = 1, pageSize = 20 } = params;

  let bbox: string | null = null;
  if (location.trim()) {
    const geo = await geocodeLocation(location.trim());
    if (geo) bbox = geo.bbox;
  }

  let results: ProspectResult[] = [];
  const tags = mapQueryToTags(query);

  if (tags && tags.length > 0 && bbox) {
    results = await searchOverpass(tags, bbox);
  }

  const nominatimResults = await searchNominatim(query, location);

  const seen = new Set<string>();
  const merged: ProspectResult[] = [];
  for (const r of [...results, ...nominatimResults]) {
    if (!seen.has(r.osmId)) {
      seen.add(r.osmId);
      merged.push(r);
    }
  }

  if (filters?.hasWebsite) {
    const filtered = merged.filter(r => r.website);
    merged.length = 0;
    merged.push(...filtered);
  }
  if (filters?.hasPhone) {
    const filtered = merged.filter(r => r.phone);
    merged.length = 0;
    merged.push(...filtered);
  }

  const total = merged.length;
  const start = (page - 1) * pageSize;
  const paged = merged.slice(start, start + pageSize);

  return { results: paged, total, hasMore: start + pageSize < total };
}

export async function importProspectAsContact(prospect: ProspectResult) {
  return chatwootAPI.contacts.create({
    name: prospect.name,
    phone_number: prospect.phone,
    custom_attributes: {
      address: prospect.address,
      website: prospect.website,
      source: 'prospecting_osm',
      osm_id: prospect.osmId,
      category: prospect.category,
      type: prospect.type,
    },
  });
}
