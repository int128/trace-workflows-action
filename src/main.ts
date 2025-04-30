import * as core from '@actions/core'
import { run } from './run.js'
import { withOpenTelemetry } from './opentelemetry.js'
import { getContext } from './context.js'

const main = async () => {
  const context = getContext()
  await withOpenTelemetry(
    {
      enableOTLPExporter: core.getBooleanInput('enable-otlp-exporter'),
      context,
    },
    async () => {
      await run(
        {
          token: core.getInput('token', { required: true }),
          pageSizeOfCheckSuites: parseInt(core.getInput('page-size-of-check-suites', { required: true })),
          pageSizeOfCheckRuns: parseInt(core.getInput('page-size-of-check-runs', { required: true })),
        },
        context,
      )
    },
  )
}

await main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
