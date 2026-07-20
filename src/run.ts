import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import { completeStepsForFailedJobs, summaryListChecksQuery } from './checks.js'
import type { Context } from './github.js'
import { getListChecksQuery } from './queries/listChecks.js'
import { getListStepsQuery } from './queries/listSteps.js'
import { exportTrace } from './span.js'
import { generateTimeline } from './timeline.js'

// https://api.github.com/apps/github-actions
const GITHUB_ACTIONS_APP_ID = 15368

export type Inputs = {
  pageSizeOfCheckSuites: number
  pageSizeOfCheckRuns: number
}

type Outputs = {
  timeline: string
}

export const run = async (inputs: Inputs, octokit: Octokit, context: Context): Promise<Outputs> => {
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

  const timeline = generateTimeline(event)
  core.summary.addHeading('trace-workflows summary', 2)
  core.summary.addCodeBlock(timeline, 'mermaid')
  await core.summary.write()

  core.startGroup('Event')
  core.info(JSON.stringify(event, undefined, 2))
  core.endGroup()

  await exportTrace(event, context)

  return { timeline }
}
