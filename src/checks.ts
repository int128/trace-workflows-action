import assert from 'assert'
import { ListChecksQuery } from './generated/graphql.js'
import { Octokit } from '@octokit/action'
import { CheckConclusionState, CheckStatusState } from './generated/graphql-types.js'

export type Filter = {
  event: string
}

export type WorkflowEvent = {
  workflowRuns: WorkflowRun[]
  startedAt: Date | undefined
  completedAt: Date | undefined
}

export type WorkflowRun = {
  event: string
  workflowName: string
  url: string
  status: CheckStatusState
  conclusion: CheckConclusionState | null | undefined
  createdAt: Date
  completedAt: Date
  jobs: Job[]
}

export type Job = {
  name: string
  url: string
  status: ListJobsForWorkflowRunResult['status']
  conclusion: ListJobsForWorkflowRunResult['conclusion']
  runnerLabel: string | undefined
  createdAt: Date
  startedAt: Date
  completedAt: Date
  steps: Step[]
}

export type Step = {
  name: string
  status: string
  conclusion: string
  startedAt: Date
  completedAt: Date
}

type ListJobsForWorkflowRunResult = Pick<
  Awaited<ReturnType<Octokit['rest']['actions']['listJobsForWorkflowRun']>>['data']['jobs'][number],
  'name' | 'status' | 'conclusion' | 'html_url' | 'labels' | 'created_at' | 'started_at' | 'completed_at' | 'steps'
>

export type WorkflowJobsProvider = (workflowRunId: number) => Promise<ListJobsForWorkflowRunResult[]>

export const summaryListChecksQuery = async (
  q: ListChecksQuery,
  filter: Filter,
  workflowJobsProvider: WorkflowJobsProvider,
): Promise<WorkflowEvent> => {
  assert(q.rateLimit != null)
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  assert(q.repository.object.checkSuites.edges != null)

  const workflowRuns: WorkflowRun[] = []
  for (const checkSuiteEdge of q.repository.object.checkSuites.edges) {
    assert(checkSuiteEdge != null)
    const checkSuite = checkSuiteEdge.node
    assert(checkSuite != null)
    assert(checkSuite.workflowRun != null)
    if (checkSuite.workflowRun.event !== filter.event) {
      continue
    }
    if (checkSuite.workflowRun.databaseId == null) {
      continue
    }

    const workflowJobs = await workflowJobsProvider(checkSuite.workflowRun.databaseId)
    const jobs: Job[] = []
    for (const workflowJob of workflowJobs) {
      if (workflowJob.html_url === null) {
        continue
      }
      if (workflowJob.completed_at === null) {
        continue
      }
      if (workflowJob.conclusion === 'skipped') {
        continue
      }

      const steps: Step[] = []
      for (const step of workflowJob.steps ?? []) {
        if (step.started_at == null) {
          continue
        }
        if (step.completed_at == null) {
          continue
        }
        if (step.conclusion === null) {
          continue
        }
        steps.push({
          name: step.name,
          status: step.status,
          conclusion: step.conclusion,
          startedAt: new Date(step.started_at),
          completedAt: new Date(step.completed_at),
        })
      }

      jobs.push({
        name: workflowJob.name,
        url: workflowJob.html_url,
        status: workflowJob.status,
        conclusion: workflowJob.conclusion,
        runnerLabel: workflowJob.labels.at(0),
        createdAt: new Date(workflowJob.created_at),
        startedAt: new Date(workflowJob.started_at),
        completedAt: new Date(workflowJob.completed_at),
        steps,
      })
    }

    const completedAt = maxDate(jobs.map((job) => job.completedAt))
    if (completedAt == null) {
      continue
    }
    workflowRuns.push({
      event: checkSuite.workflowRun.event,
      workflowName: checkSuite.workflowRun.workflow.name,
      url: checkSuite.workflowRun.url,
      status: checkSuite.status,
      conclusion: checkSuite.conclusion,
      createdAt: new Date(checkSuite.createdAt),
      completedAt,
      jobs,
    })
  }

  return {
    workflowRuns,
    startedAt: minDate(workflowRuns.map((x) => x.createdAt)),
    completedAt: maxDate(workflowRuns.map((x) => x.completedAt)),
  }
}

const minDate = (a: Date[]): Date | undefined => {
  const ts = a.map((x) => x.getTime())
  if (ts.length > 0) {
    return new Date(Math.min(...ts))
  }
}

const maxDate = (a: Date[]): Date | undefined => {
  const ts = a.map((x) => x.getTime())
  if (ts.length > 0) {
    return new Date(Math.max(...ts))
  }
}
