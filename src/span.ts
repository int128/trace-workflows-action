import * as opentelemetry from '@opentelemetry/api'
import {
  ATTR_ERROR_TYPE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
} from '@opentelemetry/semantic-conventions'
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions/incubating'
import { Context } from './github.js'
import { WorkflowEvent } from './checks.js'
import { CheckConclusionState } from './generated/graphql-types.js'

export const exportSpans = (event: WorkflowEvent, context: Context) => {
  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  const environmentName = getEnvironmentName(context)
  const commonAttributes = {
    [ATTR_SERVICE_VERSION]: context.target.sha,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environmentName,
    'github.repository': `${context.repo.owner}/${context.repo.repo}`,
    'github.ref': context.target.ref,
    'github.sha': context.target.sha,
    'github.actor': context.actor,
    'github.event.name': context.target.eventName,
    'github.run_attempt': context.target.runAttempt,
  }

  tracer.startActiveSpan(
    `${context.repo.owner}/${context.repo.repo}:${context.target.eventName}:${context.target.ref}`,
    {
      root: true,
      startTime: event.startedAt,
      attributes: {
        ...commonAttributes,
        [ATTR_SERVICE_NAME]: 'github-actions-event',
        [ATTR_URL_FULL]: getEventURL(context),
      },
    },
    (span) => {
      try {
        for (const workflowRun of event.workflowRuns) {
          tracer.startActiveSpan(
            workflowRun.workflowName,
            {
              startTime: workflowRun.createdAt,
              attributes: {
                ...commonAttributes,
                [ATTR_SERVICE_NAME]: 'github-actions-workflow',
                [ATTR_ERROR_TYPE]: getErrorType(workflowRun.conclusion),
                [ATTR_URL_FULL]: workflowRun.url,
                'github.workflow.name': workflowRun.workflowName,
              },
            },
            (span) => {
              try {
                for (const job of workflowRun.jobs) {
                  tracer.startActiveSpan(
                    job.name,
                    {
                      startTime: job.startedAt,
                      attributes: {
                        ...commonAttributes,
                        [ATTR_SERVICE_NAME]: 'github-actions-job',
                        [ATTR_ERROR_TYPE]: getErrorType(job.conclusion),
                        [ATTR_URL_FULL]: job.url,
                        'github.workflow.name': workflowRun.workflowName,
                        'github.job.name': job.name,
                      },
                    },
                    (span) => {
                      try {
                        span.setStatus({
                          code: getStatusCode(job.conclusion),
                          message: job.conclusion || undefined,
                        })
                      } finally {
                        span.end(job.completedAt)
                      }
                    },
                  )
                }
                span.setStatus({
                  code: getStatusCode(workflowRun.conclusion),
                  message: workflowRun.conclusion || undefined,
                })
              } finally {
                span.end(workflowRun.completedAt)
              }
            },
          )
        }
      } finally {
        span.end(event.completedAt)
      }
    },
  )
}

const getEnvironmentName = (context: Context): string => {
  if (context.target.pullRequestNumber) {
    return `pr-${context.target.pullRequestNumber}`
  }
  return context.target.ref.replace(/refs\/(heads|tags)\//, '')
}

const getEventURL = (context: Context): string => {
  if (context.target.pullRequestNumber) {
    return `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/pull/${context.target.pullRequestNumber}`
  }
  return `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/tree/${context.target.ref}`
}

const getStatusCode = (conclusion: CheckConclusionState | null | undefined) => {
  switch (conclusion) {
    case CheckConclusionState.Failure:
    case CheckConclusionState.StartupFailure:
    case CheckConclusionState.TimedOut:
    case CheckConclusionState.Cancelled:
      return opentelemetry.SpanStatusCode.ERROR
  }
  return opentelemetry.SpanStatusCode.OK
}

const getErrorType = (conclusion: CheckConclusionState | null | undefined) => {
  switch (conclusion) {
    case CheckConclusionState.Failure:
    case CheckConclusionState.StartupFailure:
    case CheckConclusionState.TimedOut:
    case CheckConclusionState.Cancelled:
      return conclusion
  }
}
