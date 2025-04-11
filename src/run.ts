import * as core from '@actions/core'
import * as github from './github.js'
import { summaryListChecksQuery, summaryWorkflowJobs } from './checks.js'
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
  })
  const event = await summaryListChecksQuery(
    listChecksQuery,
    {
      event: context.event,
    },
    async (workflowRunId: number) => {
      const workflowJobs = await github.listJobsForWorkflowRun(octokit, {
        owner: context.owner,
        repo: context.repo,
        run_id: workflowRunId,
        filter: 'latest',
      })
      return summaryWorkflowJobs(workflowJobs)
    },
  )

  core.startGroup('Event')
  core.info(JSON.stringify(event, undefined, 2))
  core.endGroup()
  exportSpans(event, context)
}
