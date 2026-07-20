import * as core from '@actions/core'
import * as github from './github.js'
import { run } from './run.js'

const main = async () => {
  const outputs = await run(
    {
      pageSizeOfCheckSuites: parseInt(core.getInput('page-size-of-check-suites', { required: true }), 10),
      pageSizeOfCheckRuns: parseInt(core.getInput('page-size-of-check-runs', { required: true }), 10),
    },
    github.getOctokit(),
    await github.getContext(),
  )
  core.setOutput('timeline', outputs.timeline)
}

try {
  await main()
} catch (e) {
  core.setFailed(e instanceof Error ? e : String(e))
  console.error(e)
}
