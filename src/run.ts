import assert from 'assert'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as opentelemetry from '@opentelemetry/api'
import { getAssociatedPullRequest } from './queries/getAssociatedPullRequest.js'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

type Inputs = {
  owner: string
  repo: string
  sha: string
  token: string
}

export const run = async (inputs: Inputs): Promise<void> => {
  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  await tracer.startActiveSpan('run', {}, async (span) => {
    span.setAttributes({
      [ATTR_SERVICE_NAME]: 'trace-workflows-action',
    })
    try {
      const octokit = github.getOctokit(inputs.token)

      core.info(`Getting the associated pull request for the commit ${inputs.sha}`)
      const associatedPullRequest = await getAssociatedPullRequest(octokit, {
        owner: inputs.owner,
        name: inputs.repo,
        expression: inputs.sha,
      })

      assert(associatedPullRequest.repository)
      assert(associatedPullRequest.repository.object)
      assert.strictEqual(associatedPullRequest.repository.object.__typename, 'Commit')
      assert(associatedPullRequest.repository.object.associatedPullRequests)
      assert(associatedPullRequest.repository.object.associatedPullRequests.nodes != null)

      if (associatedPullRequest.repository.object.associatedPullRequests.nodes.length === 0) {
        core.info('No associated pull request found')
        return
      }
      for (const node of associatedPullRequest.repository.object.associatedPullRequests.nodes) {
        assert(node != null)
        core.info(`Found associated pull request #${node.number}`)
      }
    } finally {
      span.end()
    }
  })
}
