import * as core from '@actions/core'
import { summaryListChecksQuery } from './checks.js'
import { exportSpans } from './span.js'
import { getListChecksQuery } from './queries/listChecks.js'
import { Octokit } from '@octokit/action'
import { Context } from './github.js'

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
  core.startGroup('Event')
  core.info(JSON.stringify(event, undefined, 2))
  core.endGroup()
  exportSpans(event, context)
}
