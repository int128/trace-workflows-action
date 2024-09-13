import * as opentelemetry from '@opentelemetry/api'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions/incubating'
import { Context } from './context.js'
import { WorkflowEvent } from './checks.js'

export const emitSpans = (event: WorkflowEvent, context: Context) => {
  const environmentName = getEnvironmentName(context)
  const commonAttributes = {
    [ATTR_SERVICE_VERSION]: context.sha,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environmentName,
  }

  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  tracer.startActiveSpan(
    `${context.event}@${context.ref}`,
    {
      root: true,
      startTime: event.startedAt,
      attributes: {
        ...commonAttributes,
        [ATTR_SERVICE_NAME]: 'github-actions-event',
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
                'github.actions.workflow.status': workflowRun.status,
                'github.actions.workflow.conclusion': String(workflowRun.conclusion),
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
                        'github.actions.job.status': job.status,
                        'github.actions.job.conclusion': String(job.conclusion),
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

const getEnvironmentName = (context: Context): string => {
  if (context.pullRequestNumber) {
    return `pr-${context.pullRequestNumber}`
  }
  return context.ref.replace(/refs\/(heads|tags)\//, '')
}
