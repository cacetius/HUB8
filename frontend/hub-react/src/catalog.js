export const CATEGORIES = [
  { id: 'qualidade', label: 'Qualidade' },
  { id: 'operacao', label: 'Operação' },
  { id: 'pessoas', label: 'Pessoas' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'auditoria', label: 'Auditoria' },
];

export function normalizeText(value = '') {
  return String(value)
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const read = (app, ...keys) => {
  for (const key of keys) {
    if (app?.[key] !== undefined && app[key] !== null) return app[key];
  }
  return '';
};

export function mapApp(app) {
  const rawCategory = String(read(app, 'category', 'CATEGORY')).trim();
  const category = CATEGORIES.find(
    ({ id, label }) =>
      normalizeText(id) === normalizeText(rawCategory) ||
      normalizeText(label) === normalizeText(rawCategory),
  );

  return {
    id: read(app, 'id', 'ID'),
    name: String(read(app, 'name', 'NAME') || 'Aplicativo'),
    subtitle: String(read(app, 'subtitle', 'SUBTITLE')),
    description: String(read(app, 'description', 'DESCRIPTION')),
    categoryId: category?.id || normalizeText(rawCategory).replace(/\s+/g, '-'),
    categoryLabel: category?.label || rawCategory || 'Outros',
    icon: String(read(app, 'icon', 'ICON') || '📦'),
    url: String(read(app, 'url', 'URL')).trim(),
  };
}

export function filterApps(apps, query, categoryId = 'all') {
  const normalizedQuery = normalizeText(query.trim());
  return apps.filter((app) => {
    const text = normalizeText(
      [app.name, app.subtitle, app.description, app.categoryLabel].join(' '),
    );
    return (
      (!normalizedQuery || text.includes(normalizedQuery)) &&
      (categoryId === 'all' || app.categoryId === categoryId)
    );
  });
}

export function categoryCounts(apps) {
  const counts = new Map();
  apps.forEach((app) => counts.set(app.categoryId, (counts.get(app.categoryId) || 0) + 1));
  return counts;
}

export function responseData(payload) {
  if (payload?.success === false) {
    throw new Error(payload.message || 'A API recusou a solicitação.');
  }
  return payload?.data ?? payload;
}
