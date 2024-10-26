import assert from 'assert'
import * as github from './github.js'
import { ListChecksQuery } from './generated/graphql.js'
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
  status: CheckStatusState
  conclusion: CheckConclusionState | null | undefined
  startedAt: Date
  completedAt: Date
}

type JobsProvider = (workflowRunId: number) => Promise<Job[]>

export const summaryListChecksQuery = async (
  q: ListChecksQuery,
  filter: Filter,
  jobsProvider: JobsProvider,
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
    const jobs = await jobsProvider(checkSuite.workflowRun.databaseId)
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

export const summaryWorkflowJobs = (workflowJobs: github.WorkflowJobs): Job[] => {
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
    jobs.push({
      name: workflowJob.name,
      url: workflowJob.html_url,
      status: toCheckStatusState(workflowJob.status),
      conclusion: toCheckConclusionState(workflowJob.conclusion),
      startedAt: new Date(workflowJob.started_at),
      completedAt: new Date(workflowJob.completed_at),
    })
  }
  return jobs
}

const toCheckStatusState = (status: github.WorkflowJob['status']): CheckStatusState => {
  switch (status) {
    case 'completed':
      return CheckStatusState.Completed
    case 'in_progress':
      return CheckStatusState.InProgress
    case 'queued':
      return CheckStatusState.Queued
    case 'waiting':
      return CheckStatusState.Waiting
  }
}

const toCheckConclusionState = (conclusion: github.WorkflowJob['conclusion']): CheckConclusionState | null => {
  switch (conclusion) {
    case 'success':
      return CheckConclusionState.Success
    case 'failure':
      return CheckConclusionState.Failure
    case 'neutral':
      return CheckConclusionState.Neutral
    case 'cancelled':
      return CheckConclusionState.Cancelled
    case 'skipped':
      return CheckConclusionState.Skipped
    case 'timed_out':
      return CheckConclusionState.TimedOut
    case 'action_required':
      return CheckConclusionState.ActionRequired
    case null:
      return null
  }
}
