import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Gate G3 (08 §12.1): axe-core runs against every route, WCAG 2.1 AA (INV-28).
// Routes are appended to this list as they are built.
const routes = ['/'];

for (const route of routes) {
  test(`${route} has no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
