import type { Page } from '@playwright/test'

/**
 * Mobile layout assertions shared by the smoke suite.
 *
 * These run in the page context so they measure what a real phone would: the
 * layout viewport (not `window.innerWidth`, which includes a classic scrollbar
 * on desktop) and post-layout bounding boxes.
 *
 * Every helper used inside a `page.evaluate` callback is declared *within* that
 * callback. Playwright serializes only the callback, so a reference to a
 * module-scope function would throw `ReferenceError` in the browser.
 */

/** Sub-pixel layout rounding; 1px of slack avoids flakes on fractional DPRs. */
const OVERFLOW_TOLERANCE_PX = 1

/**
 * WCAG 2.2 AA "Target Size (Minimum)" is 24x24 CSS px. Apple's HIG asks for
 * 44x44 on touch. Both are enforced, at their own thresholds, so a regression
 * that satisfies WCAG but is still awkward to tap is still reported.
 */
export const WCAG_MIN_TAP_TARGET_PX = 24
export const RECOMMENDED_TAP_TARGET_PX = 44

export interface OverflowResult {
  /** Total horizontal overflow in CSS px, 0 when the page fits. */
  overflowPx: number
  /** Up to five selectors responsible for the widest overflow. */
  offenders: Array<{ selector: string; right: number }>
}

export interface TapTargetIssue {
  selector: string
  accessibleName: string
  width: number
  height: number
  /** True when the target meets WCAG 2.2 AA but not the 44px recommendation. */
  belowRecommendationOnly: boolean
}

export interface TapTargetResult {
  wcagViolations: TapTargetIssue[]
  belowRecommendation: TapTargetIssue[]
  checkedCount: number
}

/** Elements that are never a touch target even when they are focusable. */
const EXCLUDED_SELECTOR = [
  '[aria-hidden="true"]',
  '[hidden]',
  '[inert]',
  '.sr-only',
  'script',
  'style',
].join(', ')

/**
 * Measure horizontal overflow and attribute it to specific elements.
 *
 * Compares the document's scroll width against the layout viewport, then walks
 * visible elements looking for any whose right edge exceeds it. A negative
 * `scrollWidth` (iOS rubber-band overscroll) is clamped to zero.
 */
export async function measureHorizontalOverflow(page: Page): Promise<OverflowResult> {
  return page.evaluate((tolerance) => {
    const describe = (el: Element): string => {
      const testId = el.getAttribute('data-testid')
      if (testId) return el.tagName.toLowerCase() + '[data-testid="' + testId + '"]'
      if (el.id) return el.tagName.toLowerCase() + '#' + CSS.escape(el.id)
      const role = el.getAttribute('role')
      if (role) return el.tagName.toLowerCase() + '[role="' + role + '"]'
      return el.tagName.toLowerCase()
    }

    const doc = document.documentElement
    const viewportWidth = window.innerWidth
    const scrollWidth = Math.max(doc.scrollWidth, document.body?.scrollWidth ?? 0)
    const overflowPx = Math.max(0, scrollWidth - viewportWidth - tolerance)

    if (overflowPx <= 0) {
      return { overflowPx: 0, offenders: [] }
    }

    const offenders: Array<{ selector: string; right: number }> = []
    const seen = new Set<string>()

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') continue

      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (rect.right <= viewportWidth + tolerance) continue

      const selector = describe(el)
      if (seen.has(selector)) continue
      seen.add(selector)
      offenders.push({ selector, right: Math.round(rect.right) })
      if (offenders.length >= 5) break
    }

    return { overflowPx: Math.round(overflowPx), offenders }
  }, OVERFLOW_TOLERANCE_PX)
}

/**
 * Collect undersized touch targets among visible interactive elements.
 *
 * Space-separated links and buttons inside a text block are excluded: WCAG's
 * target-size criterion has an "inline" exception, and flagging a comma in a
 * sentence as a tap-target bug would make the check useless.
 */
export async function measureTapTargets(page: Page): Promise<TapTargetResult> {
  return page.evaluate(
    ({ wcag, recommended, excluded }): {
      wcagViolations: TapTargetIssue[]
      belowRecommendation: TapTargetIssue[]
      checkedCount: number
    } => {
      const describe = (el: Element): string => {
        const testId = el.getAttribute('data-testid')
        if (testId) return el.tagName.toLowerCase() + '[data-testid="' + testId + '"]'
        if (el.id) return el.tagName.toLowerCase() + '#' + CSS.escape(el.id)
        const role = el.getAttribute('role')
        if (role) return el.tagName.toLowerCase() + '[role="' + role + '"]'
        return el.tagName.toLowerCase()
      }

      const nameOf = (el: Element): string => {
        const raw =
          el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? ''
        return raw.trim().replace(/\s+/g, ' ').slice(0, 60) || '(no accessible name)'
      }

      const selector =
        'a[href], button, [role="button"], [role="tab"], [role="menuitem"], ' +
        'input[type="checkbox"], input[type="radio"]'
      const wcagViolations: TapTargetIssue[] = []
      const belowRecommendation: TapTargetIssue[] = []
      let checkedCount = 0

      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>(selector))) {
        if (el.closest(excluded)) continue

        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        if (style.pointerEvents === 'none') continue

        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue

        // WCAG 2.2 inline exception: a target whose box sits on a text baseline
        // inside a paragraph does not need the minimum size.
        const inProse = el.closest('p, li, dd, figcaption, blockquote')
        if (inProse && style.display.startsWith('inline')) continue

        checkedCount += 1

        const entry: TapTargetIssue = {
          selector: describe(el),
          accessibleName: nameOf(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          belowRecommendationOnly: false,
        }

        if (rect.width < wcag || rect.height < wcag) {
          wcagViolations.push(entry)
        } else if (rect.width < recommended || rect.height < recommended) {
          belowRecommendation.push({ ...entry, belowRecommendationOnly: true })
        }
      }

      return { wcagViolations, belowRecommendation, checkedCount }
    },
    {
      wcag: WCAG_MIN_TAP_TARGET_PX,
      recommended: RECOMMENDED_TAP_TARGET_PX,
      excluded: EXCLUDED_SELECTOR,
    },
  )
}
