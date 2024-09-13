import * as opentelemetry from '@opentelemetry/api'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions/incubating'
import { WorkflowEvent } from './checks.js'

type Context = {
  event: string
  ref: string
  sha: string
}

export const emitSpans = (event: WorkflowEvent, context: Context) => {
  const environmentName = getEnvironmentName(context.ref)

  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  tracer.startActiveSpan(
    `${context.event}@${context.ref}`,
    {
      root: true,
      startTime: event.startedAt,
      attributes: {
        [ATTR_SERVICE_NAME]: 'github-actions-event',
        [ATTR_SERVICE_VERSION]: context.sha,
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environmentName,
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
                [ATTR_SERVICE_NAME]: 'github-actions-workflow',
                [ATTR_SERVICE_VERSION]: context.sha,
                [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environmentName,
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
                        [ATTR_SERVICE_NAME]: 'github-actions-job',
                        [ATTR_SERVICE_VERSION]: context.sha,
                        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environmentName,
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
        span.end(event.completedAt)
      }
    },
  )
}

const getEnvironmentName = (ref: string): string => {
  if (ref.startsWith('refs/heads/')) {
    return ref.substring('refs/heads/'.length)
  }
  if (ref.startsWith('refs/tags/')) {
    return ref.substring('refs/tags/'.length)
  }
  if (ref.startsWith('refs/pull/')) {
    const [, , prNumber] = ref.split('/')
    return `pr-${prNumber}`
  }
  return ref
}
