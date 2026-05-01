export function matchesCategory(
  topics: string,
  active: string,
  categoryKeywords: Record<string, string[]>
): boolean {
  if (active === 'all') return true;
  return (categoryKeywords[active] || []).some((kw) => topics.includes(kw));
}

export function filterItems(
  items: HTMLElement[],
  query: string,
  active: string,
  categoryKeywords: Record<string, string[]>
): HTMLElement[] {
  return items.filter((item) => {
    const name = item.dataset.name || '';
    const desc = item.dataset.description || '';
    const topics = item.dataset.topics || '';
    return (
      (!query || name.includes(query) || desc.includes(query) || topics.includes(query)) &&
      matchesCategory(topics, active, categoryKeywords)
    );
  });
}

export function sortItems(items: HTMLElement[], sortBy: string): HTMLElement[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'stars') return Number(b.dataset.stars) - Number(a.dataset.stars);
    if (sortBy === 'name') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
    return (b.dataset.updated || '').localeCompare(a.dataset.updated || '');
  });
}

export function updateFilterButtons(
  filterBtns: NodeListOf<HTMLButtonElement>,
  filterBtnsMobile: NodeListOf<HTMLButtonElement>,
  active: string
): void {
  filterBtns.forEach((btn) => {
    const isActive = btn.dataset.category === active;
    btn.className = `category-btn w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
    }`;
  });
  filterBtnsMobile.forEach((btn) => {
    const isActive = btn.dataset.category === active;
    btn.className = `category-btn-mobile inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      isActive
        ? 'bg-blue-500 text-white border-blue-500'
        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }`;
  });
}
