import * as opentelemetry from '@opentelemetry/api'
import {
  ATTR_ERROR_TYPE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
} from '@opentelemetry/semantic-conventions'
import {
  ATTR_DEPLOYMENT_ENVIRONMENT,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_HOST_NAME,
  ATTR_USER_NAME,
} from '@opentelemetry/semantic-conventions/incubating'
import { Context } from './context.js'
import { WorkflowEvent } from './checks.js'
import { CheckConclusionState } from './generated/graphql-types.js'

export const exportSpans = (event: WorkflowEvent, context: Context) => {
  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  const environmentName = getEnvironmentName(context)
  const commonAttributes = {
    [ATTR_SERVICE_VERSION]: context.sha,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environmentName,
    [ATTR_DEPLOYMENT_ENVIRONMENT]: environmentName,
    [ATTR_USER_NAME]: context.actor,
    [ATTR_HOST_NAME]: context.serverHostname,
  }

  tracer.startActiveSpan(
    `${context.owner}/${context.repo}:${context.event}:${context.ref}`,
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
  if (context.pullRequestNumber) {
    return `pr-${context.pullRequestNumber}`
  }
  return context.ref.replace(/refs\/(heads|tags)\//, '')
}

const getEventURL = (context: Context): string => {
  if (context.pullRequestNumber) {
    return `${context.serverUrl}/${context.owner}/${context.repo}/pull/${context.pullRequestNumber}`
  }
  return `${context.serverUrl}/${context.owner}/${context.repo}/tree/${context.ref}`
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
