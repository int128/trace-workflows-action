import * as core from '@actions/core'
import { run } from './run.js'
import { withOpenTelemetry } from './opentelemetry.js'

const main = async () =>
  withOpenTelemetry(
    {
      endpoint: core.getInput('oltp-endpoint'),
    },
    async () => {
      await run({
        token: core.getInput('token', { required: true }),
        pageSizeOfCheckSuites: parseInt(core.getInput('page-size-of-check-suites', { required: true })),
        pageSizeOfCheckRuns: parseInt(core.getInput('page-size-of-check-runs', { required: true })),
        pageSizeOfSteps: parseInt(core.getInput('page-size-of-steps', { required: true })),
      })
    },
  )

await main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
