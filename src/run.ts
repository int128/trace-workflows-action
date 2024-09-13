import * as core from '@actions/core'
import * as github from '@actions/github'
import * as listChecks from './queries/listChecks.js'
import { summaryListChecksQuery } from './checks.js'
import { emitSpans } from './span.js'
import { getContext } from './context.js'

// https://api.github.com/apps/github-actions
const GITHUB_ACTIONS_APP_ID = 15368

export type Inputs = {
  owner: string
  repo: string
  token: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  const context = getContext()
  core.info(`Current context: ${JSON.stringify(context, undefined, 2)}`)

  const octokit = github.getOctokit(inputs.token)
  const listChecksQuery = await listChecks.paginate(listChecks.withOctokit(octokit), {
    owner: inputs.owner,
    name: inputs.repo,
    // For a pull request, this must be the head SHA instead of the merge commit SHA.
    oid: context.sha,
    appId: GITHUB_ACTIONS_APP_ID,
  })
  const event = summaryListChecksQuery(listChecksQuery, {
    event: context.event,
  })
  core.info(`Event: ${JSON.stringify(event, undefined, 2)}`)
  emitSpans(event, context)
}
