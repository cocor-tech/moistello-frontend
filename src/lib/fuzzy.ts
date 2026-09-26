/**
 * Dependency-free fuzzy matcher backing the command palette.
 *
 * The palette needs to rank ~50 commands by relevance as fast as the user
 * types, so this is a plain subsequence scan (O(n*m) over query/target
 * lengths) rather than a full edit-distance search. Ranking bonuses favour
 * the things people actually type: exact prefixes, characters right after a
 * separator, and runs of consecutive characters.
 */

export interface FuzzyResult {
  /** Higher is better. Only meaningful relative to other results. */
  score: number;
  /** Indices into the *original* (un-lowercased) target that matched. */
  indices: number[];
}

export interface RankedItem<T> {
  item: T;
  score: number;
  indices: number[];
}

/** Characters that start a new "word" for boundary-scoring purposes. */
const SEPARATOR_PATTERN = /[\s\-_/.>]/;

const START_BONUS = 16;
const BOUNDARY_BONUS = 12;
const CONSECUTIVE_BONUS = 8;
const GAP_PENALTY = 1;
const MAX_GAP_PENALTY = 10;
/** Length tie-breaker: divide by 20 so it nudges ranking without dominating it. */
const LENGTH_PENALTY_DIVISOR = 20;

/**
 * Score `target` against `query`, or return null when the query is not a
 * subsequence of the target.
 *
 * Iterates by UTF-16 code unit so indices line up with `String#indexOf` and
 * the caller's highlighting stays correct for non-ASCII labels.
 */
export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return { score: 0, indices: [] };

  const haystack = target.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let searchFrom = 0;
  let previousIndex = -1;

  for (let i = 0; i < needle.length; i += 1) {
    const char = needle[i];
    // Whitespace in the query is a readability affordance, not a character
    // the user expects to be matched literally.
    if (char === " ") continue;

    const found = haystack.indexOf(char, searchFrom);
    if (found === -1) return null;

    if (found === 0) {
      score += START_BONUS;
    } else if (SEPARATOR_PATTERN.test(haystack[found - 1])) {
      score += BOUNDARY_BONUS;
    }

    if (previousIndex === found - 1) {
      score += CONSECUTIVE_BONUS;
    } else if (previousIndex >= 0) {
      score -= Math.min(found - previousIndex - 1, MAX_GAP_PENALTY) * GAP_PENALTY;
    }

    score += 1;
    indices.push(found);
    previousIndex = found;
    searchFrom = found + 1;
  }

  // Prefer the tighter target when scores are otherwise close, so "Wallet"
  // outranks "Wallet transaction history" for the query "wallet".
  score -= Math.floor(haystack.length / LENGTH_PENALTY_DIVISOR);

  return { score, indices };
}

/**
 * Rank `items` by fuzzy relevance to `query`, best first. An empty query
 * returns every item in its original order (used for the default listing).
 */
export function fuzzyRank<T>(
  query: string,
  items: readonly T[],
  getText: (item: T) => string,
): RankedItem<T>[] {
  if (!query.trim()) {
    return items.map((item) => ({ item, score: 0, indices: [] }));
  }

  const ranked: RankedItem<T>[] = [];
  for (const item of items) {
    const match = fuzzyMatch(query, getText(item));
    if (match) ranked.push({ item, score: match.score, indices: match.indices });
  }

  return ranked.sort((a, b) => b.score - a.score);
}
