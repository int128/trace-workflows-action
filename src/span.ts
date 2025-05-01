import * as core from '@actions/core'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { Context } from './github.js'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { CheckConclusionState } from './generated/graphql-types.js'
import { Job, WorkflowEvent, WorkflowRun } from './checks.js'
import { trace, Attributes, Tracer, SpanStatusCode } from '@opentelemetry/api'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_URL_FULL } from '@opentelemetry/semantic-conventions'
import {
  ATTR_CICD_PIPELINE_NAME,
  ATTR_CICD_PIPELINE_RESULT,
  ATTR_CICD_PIPELINE_RUN_ID,
  ATTR_CICD_PIPELINE_RUN_STATE,
  ATTR_CICD_PIPELINE_RUN_URL_FULL,
  ATTR_CICD_PIPELINE_TASK_NAME,
  ATTR_CICD_PIPELINE_TASK_RUN_ID,
  ATTR_CICD_PIPELINE_TASK_RUN_URL_FULL,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_HOST_NAME,
} from '@opentelemetry/semantic-conventions/incubating'

export const exportTrace = async (event: WorkflowEvent, context: Context) => {
  const sdk = new NodeSDK({
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
    core.startGroup('Exporting the trace')
    exportEvent(event, context)
    core.endGroup()
  } finally {
    core.startGroup('Shutting down OpenTelemetry')
    await sdk.shutdown()
    core.endGroup()
  }
}

const exportEvent = (event: WorkflowEvent, context: Context) => {
  const tracer = trace.getTracer('trace-workflows-action')
  const eventAttributes: Attributes = {
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
        ...eventAttributes,
        'operation.name': 'event',
        [ATTR_URL_FULL]: getEventURL(context),
      },
    },
    (span) => {
      try {
        for (const workflowRun of event.workflowRuns) {
          exportWorkflowRun(workflowRun, tracer, eventAttributes)
        }
      } finally {
        span.end(event.completedAt)
      }
    },
  )
}

const exportWorkflowRun = (workflowRun: WorkflowRun, tracer: Tracer, attributes: Attributes) => {
  const workflowRunAttributes: Attributes = {
    ...attributes,
    [ATTR_CICD_PIPELINE_NAME]: workflowRun.workflowName,
    [ATTR_CICD_PIPELINE_RESULT]: workflowRun.conclusion,
    [ATTR_CICD_PIPELINE_RUN_STATE]: workflowRun.status,
    [ATTR_CICD_PIPELINE_RUN_ID]: workflowRun.id,
    [ATTR_CICD_PIPELINE_RUN_URL_FULL]: workflowRun.url,
    'github.workflow.name': workflowRun.workflowName,
    'github.workflow.conclusion': workflowRun.conclusion,
    'github.workflow.status': workflowRun.status,
  }
  tracer.startActiveSpan(
    workflowRun.workflowName,
    {
      startTime: workflowRun.createdAt,
      attributes: {
        ...workflowRunAttributes,
        'operation.name': 'workflow',
        [ATTR_URL_FULL]: workflowRun.url,
      },
    },
    (span) => {
      try {
        for (const job of workflowRun.jobs) {
          exportJob(job, tracer, workflowRunAttributes)
        }
        span.setStatus({ code: getStatusCode(workflowRun.conclusion) })
      } finally {
        span.end(workflowRun.completedAt)
      }
    },
  )
}

const exportJob = (job: Job, tracer: Tracer, attributes: Attributes) => {
  const jobAttributes: Attributes = {
    ...attributes,
    [ATTR_CICD_PIPELINE_TASK_NAME]: job.name,
    [ATTR_CICD_PIPELINE_TASK_RUN_ID]: job.id,
    [ATTR_CICD_PIPELINE_TASK_RUN_URL_FULL]: job.url,
    'github.job.name': job.name,
    'github.job.conclusion': job.conclusion,
    'github.job.status': job.status,
  }
  tracer.startActiveSpan(
    job.name,
    {
      startTime: job.startedAt,
      attributes: {
        ...jobAttributes,
        'operation.name': 'job',
        [ATTR_URL_FULL]: job.url,
      },
    },
    (span) => {
      try {
        span.setStatus({ code: getStatusCode(job.conclusion) })
      } finally {
        span.end(job.completedAt)
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

const getStatusCode = (conclusion: CheckConclusionState | undefined): SpanStatusCode => {
  switch (conclusion) {
    case CheckConclusionState.Success:
      return SpanStatusCode.OK
    case CheckConclusionState.Failure:
    case CheckConclusionState.StartupFailure:
    case CheckConclusionState.TimedOut:
    case CheckConclusionState.Cancelled:
      return SpanStatusCode.ERROR
    default:
      return SpanStatusCode.UNSET
  }
}
