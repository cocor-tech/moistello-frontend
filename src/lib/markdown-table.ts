/**
 * Shared Markdown table renderer for the docs and post pages.
 *
 * Both routes used to carry their own copy of this regex block, and both
 * emitted a bare `<div class="overflow-x-auto">` around the table — a scrollable
 * box with no name, no caption and no focus stop. On a phone the reader was left
 * scrolling a table sideways with no label and no keyboard route.
 *
 * The markup emitted here does two things:
 *
 * 1. Below `sm` each row becomes a stacked card with its column name rendered
 *    inline from `data-label`, so nothing is reachable only by sideways scroll.
 *    The `<th scope="col">` strip stays in the accessibility tree (clipped, not
 *    `display: none`), so screen readers still resolve a column for every cell.
 * 2. If content does still overflow, the wrapper is a named, focusable
 *    `role="region"` with a description, so it can be reached and operated
 *    without a pointer.
 *
 * Input is expected to be HTML-escaped already (`mdToHtml` escapes before any of
 * this runs), so cell text is safe to place inside attribute values — with the
 * caveat noted on `truncate` about cutting a string mid-entity.
 */

export const MARKDOWN_TABLE_HINT = "Scroll sideways to see the remaining columns."

const MAX_NAME_LENGTH = 90
const MAX_NAMED_COLUMNS = 4

/**
 * Cut to `max` characters without slicing through an HTML entity.
 *
 * Cell text reaching this module has already been escaped, so a naive slice can
 * leave a dangling `&am` — which renders as literal garbage in the accessible
 * name.
 */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value

  let cut = value.slice(0, max)
  const amp = cut.lastIndexOf("&")
  if (amp !== -1 && !cut.slice(amp).includes(";")) cut = cut.slice(0, amp)

  return `${cut.trimEnd()}…`
}

/**
 * Split one Markdown table row into its cells.
 *
 * The header arrives without its surrounding pipes and the body rows with them,
 * so exactly one leading and one trailing pipe are dropped and the rest are
 * kept. Interior blank cells are preserved — dropping them would shift every
 * later value one column to the left, so a blank "Auth" cell would be labelled
 * with the next column's name.
 */
function splitRow(row: string): string[] {
  const trimmed = row.trim()
  const withoutOuterPipes = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .trim()

  if (!withoutOuterPipes) return []

  return withoutOuterPipes.split("|").map((cell) => cell.trim())
}

/**
 * "Table 2: Round, Amount, Status" — short enough to be announced comfortably.
 *
 * The overflow marker is added *before* truncating, otherwise a long column
 * list truncates and then gets a second ellipsis appended to it.
 */
function regionName(headers: string[], index: number): string {
  const named = headers.slice(0, MAX_NAMED_COLUMNS).join(", ")
  const extra = headers.length > MAX_NAMED_COLUMNS ? ", …" : ""
  const detail = truncate(`${named}${extra}`, MAX_NAME_LENGTH)
  return detail.length > 1 ? `Table ${index + 1}: ${detail}` : `Table ${index + 1}`
}

export interface MarkdownTableOptions {
  /** Zero-based position in the document; keeps generated ids unique. */
  index?: number
  /** Extra classes for the scroll wrapper. */
  className?: string
  /** Extra classes for the `<table>` itself. */
  tableClassName?: string
}

export function renderMarkdownTable(
  header: string,
  body: string,
  { index = 0, className = "", tableClassName = "" }: MarkdownTableOptions = {}
): string {
  const headers = splitRow(header)
  const rows = body
    .trim()
    .split("\n")
    .map(splitRow)
    .filter((cells) => cells.length > 0)

  const headCells = headers
    .map(
      (cell) =>
        `<th scope="col" class="responsive-table__head-cell border-b border-white/10 px-4 py-2 text-left font-heading text-sm">${cell}</th>`
    )
    .join("")

  const bodyRows = rows
    .map((cells) => {
      const tds = headers
        .map(
          (headerLabel, cellIndex) =>
            `<td data-label="${headerLabel}" class="responsive-table__cell border-b border-white/10 px-4 py-2 text-sm">${cells[cellIndex] ?? ""}</td>`
        )
        .join("")
      return `<tr class="responsive-table__row">${tds}</tr>`
    })
    .join("")

  const wrapper = ["scroll-region", "my-6", "rounded-xl", "border", "border-white/10", className]
    .filter(Boolean)
    .join(" ")
  const table = ["w-full", tableClassName].filter(Boolean).join(" ")

  // The hint lives inside the region rather than beside an `aria-describedby`
  // target: this markup is rendered as a raw string and then run through
  // `sanitizeHtml`, which strips `id` attributes. Keeping it inline means the
  // text is read out with the region and no id has to survive sanitisation.
  return (
    `<div class="${wrapper}" role="region" aria-label="${regionName(headers, index)}" tabindex="0">` +
    `<p class="sr-only">${MARKDOWN_TABLE_HINT}</p>` +
    `<table class="${table}">` +
    `<caption class="sr-only">Table ${index + 1}</caption>` +
    `<thead><tr>${headCells}</tr></thead>` +
    `<tbody>${bodyRows}</tbody>` +
    `</table></div>`
  )
}
