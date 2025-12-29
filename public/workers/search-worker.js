/**
 * Search Web Worker
 * Performs search operations in a background thread to keep UI responsive
 */

// Search index storage
let searchIndex = null;

/**
 * Build search index from prompts data
 * @param {Array} prompts - Array of prompt items
 */
function buildIndex(prompts) {
  if (!prompts || prompts.length === 0) {
    searchIndex = [];
    return;
  }

  searchIndex = prompts.map((prompt, idx) => ({
    idx,
    effectLower: (prompt.effect || '').toLowerCase(),
    descriptionLower: (prompt.description || '').toLowerCase(),
    promptLower: (prompt.prompt || '').toLowerCase(),
    tags: prompt.tags || [],
    category: prompt.category || '',
    modelTags: prompt.modelTags || [],
  }));

  self.postMessage({ type: 'indexBuilt', count: searchIndex.length });
}

/**
 * Perform search with filters
 * @param {Object} params - Search parameters
 */
function performSearch({ searchTerm, selectedTag, selectedCategory, selectedModelTag, requestId }) {
  if (!searchIndex) {
    self.postMessage({ type: 'searchResult', results: [], requestId });
    return;
  }

  const searchLower = (searchTerm || '').toLowerCase();
  const hasSearch = searchLower.length > 0;
  const hasTag = selectedTag !== '';
  const hasCategory = selectedCategory !== '';
  const hasModelTag = selectedModelTag !== '';

  // Fast path: no filters
  if (!hasSearch && !hasTag && !hasCategory && !hasModelTag) {
    const allIndices = searchIndex.map(item => item.idx);
    self.postMessage({ type: 'searchResult', results: allIndices, requestId });
    return;
  }

  const results = [];

  for (let i = 0; i < searchIndex.length; i++) {
    const item = searchIndex[i];

    // Early termination: check cheapest conditions first

    // Tag filter
    if (hasTag && !item.tags.includes(selectedTag)) {
      continue;
    }

    // Category filter
    if (hasCategory && item.category !== selectedCategory) {
      continue;
    }

    // Model tag filter
    if (hasModelTag && !item.modelTags.includes(selectedModelTag)) {
      continue;
    }

    // Text search (most expensive)
    if (hasSearch) {
      const matchesEffect = item.effectLower.indexOf(searchLower) !== -1;
      if (!matchesEffect) {
        const matchesDesc = item.descriptionLower.indexOf(searchLower) !== -1;
        if (!matchesDesc) {
          const matchesPrompt = item.promptLower.indexOf(searchLower) !== -1;
          if (!matchesPrompt) {
            continue;
          }
        }
      }
    }

    results.push(item.idx);
  }

  self.postMessage({ type: 'searchResult', results, requestId });
}

// Message handler
self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'buildIndex':
      buildIndex(data.prompts);
      break;
    case 'search':
      performSearch(data);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};
