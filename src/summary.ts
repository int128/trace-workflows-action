import * as core from '@actions/core'
import type { WorkflowEvent } from './checks.js'

export const writeTraceSummary = async (event: WorkflowEvent) => {
  core.summary.addHeading('trace-workflows summary', 2)
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
            const seconds = (step.completedAt.getTime() - step.startedAt.getTime()) / 1000
            lines.push(
              `${workflowRun.workflowName} / ${job.name} / ${step.name} : ${step.startedAt.toISOString()}, ${seconds}s`,
            )
          }
        } else {
          const seconds = (job.completedAt.getTime() - job.startedAt.getTime()) / 1000
          lines.push(`${workflowRun.workflowName} / ${job.name} : ${job.startedAt.toISOString()}, ${seconds}s`)
        }
      }
    } else {
      const seconds = (workflowRun.completedAt.getTime() - workflowRun.createdAt.getTime()) / 1000
      lines.push(`${workflowRun.workflowName} : ${workflowRun.createdAt.toISOString()}, ${seconds}s`)
    }
  }
  core.summary.addCodeBlock(lines.join('\n'), 'mermaid')
  await core.summary.write()
}
