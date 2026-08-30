import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('WCAG 2.2 AA Automated Accessibility Audit', () => {
  test('auth flow satisfies axe rules', async ({ page }) => {
    await page.goto('/login')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('circles flow satisfies axe rules', async ({ page }) => {
    await page.goto('/circles')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('wallet flow satisfies axe rules', async ({ page }) => {
    await page.goto('/wallet')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('settings flow satisfies axe rules', async ({ page }) => {
    await page.goto('/settings')
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(accessibilityScanResults.violations).toEqual([])
  })
})
