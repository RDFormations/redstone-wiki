/** Suite E2E — activée uniquement avec LMS_E2E_FORCE=1 (voir scripts/e2e-redstone.sh). */
const describeE2e = process.env.LMS_E2E_FORCE === '1' ? describe : describe.skip

module.exports = { describeE2e }
