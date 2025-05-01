import * as core from '@actions/core'
import * as opentelemetry from '@opentelemetry/api'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { Context } from './github.js'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { WorkflowEvent } from './checks.js'
import { CheckConclusionState } from './generated/graphql-types.js'
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME, ATTR_HOST_NAME } from '@opentelemetry/semantic-conventions/incubating'
import {
  ATTR_ERROR_TYPE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
} from '@opentelemetry/semantic-conventions'

export const exportTrace = async (event: WorkflowEvent, context: Context, enableOTLPExporter: boolean) => {
  const traceExporter = enableOTLPExporter ? new OTLPTraceExporter() : new ConsoleSpanExporter()
  const sdk = new NodeSDK({
    traceExporter,
    // Exclude the current environment attributes.
    // This action should be run on workflow_run event,
    // the current environment does not reflect the target workflows.
    autoDetectResources: false,
    resource: resourceFromAttributes({
      [ATTR_HOST_NAME]: getHostname(context),
      [ATTR_SERVICE_NAME]: 'github-actions',
      [ATTR_SERVICE_VERSION]: context.target.sha,
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: getEnvironmentName(context),
    }),
  })
  sdk.start()
  try {
    exportSpans(event, context)
  } finally {
    await core.group('Flushing the trace exporter', async () => await traceExporter.forceFlush())
    await core.group('Shutting down OpenTelemetry', async () => await sdk.shutdown())
  }
}

const exportSpans = (event: WorkflowEvent, context: Context) => {
  const tracer = opentelemetry.trace.getTracer('trace-workflows-action')
  const commonAttributes = {
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
        'operation.name': 'event',
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
                'operation.name': 'workflow',
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
                        'operation.name': 'job',
                        [ATTR_ERROR_TYPE]: getErrorType(job.conclusion),
                        [ATTR_URL_FULL]: job.url,
                        'github.workflow.name': workflowRun.workflowName,
                        'github.job.name': job.name,
                        'github.job.runner.label': job.runnerLabel,
                      },
                    },
                    (span) => {
                      try {
                        for (const step of job.steps) {
                          tracer.startActiveSpan(
                            step.name,
                            {
                              startTime: step.startedAt,
                              attributes: {
                                ...commonAttributes,
                                'operation.name': 'step',
                                [ATTR_ERROR_TYPE]: getErrorType(step.conclusion),
                                'github.workflow.name': workflowRun.workflowName,
                                'github.job.name': job.name,
                                'github.job.runner.label': job.runnerLabel,
                                'github.step.name': step.name,
                              },
                            },
                            (span) => {
                              try {
                                span.setStatus({
                                  code: getStatusCode(step.conclusion),
                                  message: step.conclusion,
                                })
                              } finally {
                                span.end(step.completedAt)
                              }
                            },
                          )
                        }
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

const getHostname = (context: Context): string | undefined => {
  try {
    return new URL(context.serverUrl).hostname
  } catch (e) {
    core.warning(`Invalid GITHUB_SERVER_URL: ${context.serverUrl}: ${String(e)}`)
  }
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

const getStatusCode = (conclusion: string | null | undefined) => {
  if (isErrorConclusion(conclusion)) {
    return opentelemetry.SpanStatusCode.ERROR
  }
  return opentelemetry.SpanStatusCode.OK
}

const getErrorType = (conclusion: string | null | undefined) => {
  if (isErrorConclusion(conclusion)) {
    return conclusion
  }
}

const isErrorConclusion = (conclusion: string | null | undefined) =>
  conclusion === CheckConclusionState.Failure ||
  conclusion === CheckConclusionState.StartupFailure ||
  conclusion === CheckConclusionState.TimedOut ||
  conclusion === CheckConclusionState.Cancelled ||
  conclusion === 'failure' ||
  conclusion === 'timed_out' ||
  conclusion === 'cancelled'
