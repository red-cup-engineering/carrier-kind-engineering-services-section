/** The board's singular and plural source selectors denote one exact-locator union. */
export function workBoardSourceLocators(input) {
  if (input?.source !== undefined && (typeof input.source !== "string" || input.source.length === 0 || input.source.length > 4096)) {
    throw new TypeError("work-board source is a non-empty exact locator up to 4096 characters");
  }
  if (input?.sources !== undefined && (!Array.isArray(input.sources) || input.sources.length < 1 || input.sources.length > 200
    || input.sources.some((source) => typeof source !== "string" || source.length === 0 || source.length > 4096)
    || new Set(input.sources).size !== input.sources.length)) {
    throw new TypeError("work-board sources is 1 to 200 unique exact locators up to 4096 characters each");
  }
  if (input?.source === undefined && input?.sources === undefined) return undefined;
  return [...new Set([...(input.source === undefined ? [] : [input.source]), ...(input.sources ?? [])])];
}
