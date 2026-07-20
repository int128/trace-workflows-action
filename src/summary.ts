import * as core from '@actions/core'
import type { WorkflowEvent } from './checks.js'

export const writeTraceSummary = async (event: WorkflowEvent) => {
  core.summary.addHeading('trace-workflows summary', 2)
  const lines = ['gantt', 'dateFormat YYYY-MM-DDTHH:mm:ssZ', 'axisFormat %H:%M:%S']
  lines.push(`section GitHub Actions`)
  if (event.startedAt) {
    lines.push(`Started :vert, ${event.startedAt.toISOString()}`)
  }
  if (event.completedAt) {
    lines.push(`Completed :vert, ${event.completedAt.toISOString()}`)
  }

  for (const workflowRun of event.workflowRuns) {
    if (workflowRun.jobs.length > 0) {
      for (const job of workflowRun.jobs) {
        if ((job.steps?.length ?? 0) > 0) {
          for (const step of job.steps ?? []) {
            const seconds = (step.completedAt.getTime() - step.startedAt.getTime()) / 1000
            lines.push(
              `section ${workflowRun.workflowName} (${workflowRun.event}) / ${job.name} / ${step.name}`,
              `${step.conclusion ?? '-'} : ${step.startedAt.toISOString()}, ${seconds}s`,
            )
          }
        } else {
          const seconds = (job.completedAt.getTime() - job.startedAt.getTime()) / 1000
          lines.push(
            `section ${workflowRun.workflowName} (${workflowRun.event}) / ${job.name}`,
            `${job.conclusion ?? '-'} : ${job.startedAt.toISOString()}, ${seconds}s`,
          )
        }
      }
    } else {
      const seconds = (workflowRun.completedAt.getTime() - workflowRun.createdAt.getTime()) / 1000
      lines.push(
        `section ${workflowRun.workflowName} (${workflowRun.event})`,
        `${workflowRun.conclusion ?? '-'} : ${workflowRun.createdAt.toISOString()}, ${seconds}s`,
      )
    }
  }
  core.summary.addCodeBlock(lines.join('\n'), 'mermaid')
  await core.summary.write()
}
