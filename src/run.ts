import * as core from '@actions/core'
import * as github from '@actions/github'
import * as listChecks from './queries/listChecks.js'
import { summaryListChecksQuery } from './checks.js'
import { emitSpans } from './span.js'

// https://api.github.com/apps/github-actions
const GITHUB_ACTIONS_APP_ID = 15368

export type Inputs = {
  owner: string
  repo: string
  sha: string
  event: string
  ref: string
  token: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  const octokit = github.getOctokit(inputs.token)
  const listChecksQuery = await listChecks.paginate(listChecks.withOctokit(octokit), {
    owner: inputs.owner,
    name: inputs.repo,
    oid: inputs.sha,
    appId: GITHUB_ACTIONS_APP_ID,
  })
  const event = summaryListChecksQuery(listChecksQuery)
  core.info(`event: ${JSON.stringify(event, undefined, 2)}`)

  emitSpans(event, inputs)
}
