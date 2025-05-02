import * as core from '@actions/core'
import * as github from './github.js'
import { run } from './run.js'

const main = async () => {
  await run(
    {
      pageSizeOfCheckSuites: parseInt(core.getInput('page-size-of-check-suites', { required: true })),
      pageSizeOfCheckRuns: parseInt(core.getInput('page-size-of-check-runs', { required: true })),
    },
    github.getOctokit(),
    await github.getContext(),
  )
}

await main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
