import type { WorkflowEvent } from './checks.js'
import { CheckConclusionState } from './generated/graphql-types.js'

export const generateTimeline = (event: WorkflowEvent) => {
  const lines = ['gantt', 'dateFormat YYYY-MM-DDTHH:mm:ssZ', 'axisFormat %H:%M:%S']
  if (event.startedAt) {
    lines.push(`Started :vert, ${event.startedAt.toISOString()}, 0s`)
  }
  if (event.completedAt) {
    lines.push(`Completed :vert, ${event.completedAt.toISOString()}, 0s`)
  }

  for (const workflowRun of event.workflowRuns) {
    lines.push(`section ${workflowRun.workflowName} (${workflowRun.event})`)
    if (workflowRun.jobs.length > 0) {
      for (const job of workflowRun.jobs) {
        if ((job.steps?.length ?? 0) > 0) {
          for (const step of job.steps ?? []) {
            const tag = getTag(step.conclusion)
            const seconds = (step.completedAt.getTime() - step.startedAt.getTime()) / 1000
            lines.push(
              `${workflowRun.workflowName} / ${job.name} / ${step.name} :${tag}, ${step.startedAt.toISOString()}, ${seconds}s`,
            )
          }
        } else {
          const tag = getTag(job.conclusion)
          const seconds = (job.completedAt.getTime() - job.startedAt.getTime()) / 1000
          lines.push(`${workflowRun.workflowName} / ${job.name} :${tag}, ${job.startedAt.toISOString()}, ${seconds}s`)
        }
      }
    } else {
      const tag = getTag(workflowRun.conclusion)
      const seconds = (workflowRun.completedAt.getTime() - workflowRun.createdAt.getTime()) / 1000
      lines.push(`${workflowRun.workflowName} :${tag}, ${workflowRun.createdAt.toISOString()}, ${seconds}s`)
    }
  }
  return lines.join('\n')
}

const getTag = (conclusion: CheckConclusionState | undefined): string => {
  switch (conclusion) {
    case CheckConclusionState.Failure:
    case CheckConclusionState.Cancelled:
    case CheckConclusionState.TimedOut:
    case CheckConclusionState.StartupFailure:
      return 'critical'
    case CheckConclusionState.Skipped:
      return 'done'
    default:
      return ''
  }
}
