import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import { completeStepsForFailedJobs, summaryListChecksQuery } from './checks.js'
import type { Context } from './github.js'
import { getListChecksQuery } from './queries/listChecks.js'
import { getListStepsQuery } from './queries/listSteps.js'
import { exportTrace } from './span.js'

// https://api.github.com/apps/github-actions
const GITHUB_ACTIONS_APP_ID = 15368

export type Inputs = {
  pageSizeOfCheckSuites: number
  pageSizeOfCheckRuns: number
}

export const run = async (inputs: Inputs, octokit: Octokit, context: Context): Promise<void> => {
  const listChecksQuery = await getListChecksQuery(octokit, {
    owner: context.repo.owner,
    name: context.repo.repo,
    // For a pull request, this must be the head SHA instead of the merge commit SHA.
    oid: context.target.sha,
    appId: GITHUB_ACTIONS_APP_ID,
    firstCheckSuite: inputs.pageSizeOfCheckSuites,
    firstCheckRun: inputs.pageSizeOfCheckRuns,
  })
  const event = summaryListChecksQuery(listChecksQuery, {
    event: context.target.eventName,
  })
  await completeStepsForFailedJobs(event, async (v) => await getListStepsQuery(octokit, v))
  core.startGroup('Event')
  core.info(JSON.stringify(event, undefined, 2))
  core.endGroup()
  await exportTrace(event, context)
}
