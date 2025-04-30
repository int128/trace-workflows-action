import * as core from '@actions/core'
import * as github from './github.js'
import { run } from './run.js'
import { withOpenTelemetry } from './opentelemetry.js'

const main = async () => {
  const context = await github.getContext()
  await withOpenTelemetry(
    {
      enableOTLPExporter: core.getBooleanInput('enable-otlp-exporter'),
      githubServerUrl: context.serverUrl,
    },
    async () => {
      await run(
        {
          pageSizeOfCheckSuites: parseInt(core.getInput('page-size-of-check-suites', { required: true })),
          pageSizeOfCheckRuns: parseInt(core.getInput('page-size-of-check-runs', { required: true })),
        },
        github.getOctokit(),
        context,
      )
    },
  )
}

await main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
