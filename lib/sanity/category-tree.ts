interface CategoryNode {
  _id: string;
  parentId?: string | null;
}

/**
 * Return the selected category and every descendant, regardless of tree depth.
 */
export function collectCategoryIds(
  categories: readonly CategoryNode[],
  selectedCategoryId: string,
) {
  const categoryIds = new Set([selectedCategoryId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const category of categories) {
      if (
        category.parentId &&
        categoryIds.has(category.parentId) &&
        !categoryIds.has(category._id)
      ) {
        categoryIds.add(category._id);
        changed = true;
      }
    }
  }

  return [...categoryIds];
}
