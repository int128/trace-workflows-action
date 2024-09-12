import * as core from '@actions/core'
import * as github from '@actions/github'
import * as listChecks from './queries/listChecks.js'
import * as opentelemetry from '@opentelemetry/api'
import { ATTR_OTEL_STATUS_CODE, ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { summaryListChecksQuery } from './checks.js'
import { CheckConclusionState } from './generated/graphql-types.js'

// https://api.github.com/apps/github-actions
const GITHUB_ACTIONS_APP_ID = 15368

type Inputs = {
  owner: string
  repo: string
  eventName: string
  ref: string
  sha: string
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
  const workflowRuns = summaryListChecksQuery(listChecksQuery)
  core.info(`workflowRuns: ${JSON.stringify(workflowRuns, undefined, 2)}`)

  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  tracer.startActiveSpan(
    `${inputs.owner}/${inputs.repo}:${inputs.eventName}:${inputs.ref}`,
    {
      attributes: {
        [ATTR_SERVICE_NAME]: 'trace-workflows-action',
      },
    },
    (span) => {
      try {
        for (const workflowRun of workflowRuns) {
          const statusCode = workflowRun.conclusion === CheckConclusionState.Success ? 'OK' : 'ERROR'
          tracer.startActiveSpan(
            workflowRun.workflowName,
            {
              startTime: workflowRun.createdAt,
              attributes: {
                [ATTR_OTEL_STATUS_CODE]: statusCode,
              },
            },
            (span) => {
              try {
                for (const job of workflowRun.jobs) {
                  const statusCode = job.conclusion === CheckConclusionState.Success ? 'OK' : 'ERROR'
                  tracer.startActiveSpan(
                    job.name,
                    {
                      startTime: job.startedAt,
                      attributes: {
                        [ATTR_OTEL_STATUS_CODE]: statusCode,
                      },
                    },
                    (span) => {
                      span.end(job.completedAt)
                    },
                  )
                }
              } finally {
                span.end(workflowRun.completedAt)
              }
            },
          )
        }
      } finally {
        span.end()
      }
    },
  )
}
