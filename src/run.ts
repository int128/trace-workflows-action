import * as core from '@actions/core'
import * as github from './github.js'
import { summaryListChecksQuery } from './checks.js'
import { exportSpans } from './span.js'
import { getListChecksQuery } from './queries/listChecks.js'
import { Context } from './context.js'

// https://api.github.com/apps/github-actions
const GITHUB_ACTIONS_APP_ID = 15368

export type Inputs = {
  pageSizeOfCheckSuites: number
  pageSizeOfCheckRuns: number
  token: string
}

export const run = async (inputs: Inputs, context: Context): Promise<void> => {
  core.info(`Current context: ${JSON.stringify(context, undefined, 2)}`)

  const octokit = github.getOctokit(inputs.token)
  const listChecksQuery = await getListChecksQuery(octokit, {
    owner: context.owner,
    name: context.repo,
    // For a pull request, this must be the head SHA instead of the merge commit SHA.
    oid: context.sha,
    appId: GITHUB_ACTIONS_APP_ID,
    firstCheckSuite: inputs.pageSizeOfCheckSuites,
    firstCheckRun: inputs.pageSizeOfCheckRuns,
  })
  const event = summaryListChecksQuery(listChecksQuery, {
    event: context.event,
  })
  core.startGroup('Event')
  core.info(JSON.stringify(event, undefined, 2))
  core.endGroup()
  exportSpans(event, context)
}
