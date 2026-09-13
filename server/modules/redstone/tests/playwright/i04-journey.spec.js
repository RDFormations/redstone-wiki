/**
 * I04 — E2E Playwright : parcours navigateur stagiaire + formateur publish.
 * Scénarios CDC : S01 hub 200, S02 module brouillon friendly, formateur login + publish.
 */
const { test, expect } = require('@playwright/test')
const { provisionDistributedSession } = require('../e2e/helpers/session-factory')
const { BODY_MODULE } = require('../e2e/helpers/fixtures')
const { injectWikiJwt } = require('./helpers/wiki-auth')

const formationPath = (slug, stem = '') =>
  stem ? `/fr/formations/${slug}/${stem}` : `/fr/formations/${slug}`

let slug

test.beforeAll(async () => {
  const provisioned = await provisionDistributedSession({ prefix: 'pw-i04' })
  slug = provisioned.slug
})

test.describe('I04 — journey Playwright', () => {
  test('S01 — hub stagiaire HTTP 200', async ({ page }) => {
    const response = await page.goto(formationPath(slug, 'stagiaire'))
    expect(response?.status()).toBe(200)
    await expect(page.locator('.rs-stagiaire-hub')).toBeVisible()
    await expect(page.locator('.rs-stagiaire-hero-title')).not.toBeEmpty()
  })

  test('S02 — module brouillon affiche la page friendly', async ({ page }) => {
    await page.goto(formationPath(slug, 'module-01-e2e'))
    await expect(page.locator('.rs-unpublished-friendly')).toBeVisible()
    await expect(page.locator('.rs-unpublished-title')).toHaveText('Module pas encore disponible')
    await expect(page.locator('body')).not.toContainText(BODY_MODULE.trim().slice(0, 40))
  })

  test('formateur login + publish UI → stagiaire voit le module', async ({ browser }) => {
    const context = await browser.newContext()
    await injectWikiJwt(context)
    const formateurPage = await context.newPage()

    await formateurPage.goto(formationPath(slug, 'formateur'))
    await expect(formateurPage.locator('.rs-formateur-hub')).toBeVisible()
    await expect(formateurPage.locator('.v-skeleton-loader')).toHaveCount(0)

    const moduleRow = formateurPage.locator('.rs-formateur-pub-item', {
      has: formateurPage.locator('.rs-formateur-pub-title', { hasText: 'Module 1 E2E' })
    })
    await expect(moduleRow).toBeVisible()
    const publishBtn = moduleRow.locator('.rs-formateur-icon-btn--publish')
    await expect(publishBtn).toBeVisible()
    const publishResponse = formateurPage.waitForResponse(
      res =>
        res.request().method() === 'POST' &&
        res.url().includes(`/api/formation/${slug}/publish`) &&
        res.ok()
    )
    await publishBtn.click()
    await publishResponse
    await expect(moduleRow.locator('.rs-formateur-badge', { hasText: 'Publié' })).toBeVisible()

    const stagiairePage = await browser.newPage()
    await stagiairePage.goto(formationPath(slug, 'module-01-e2e'))
    await expect(stagiairePage.locator('.rs-unpublished-friendly')).toHaveCount(0)
    await expect(stagiairePage.locator('body')).toContainText(BODY_MODULE.trim().slice(0, 40))

    await stagiairePage.close()
    await context.close()
  })
})
