import assert from 'node:assert'
import type { ListChecksQuery } from './generated/graphql.js'
import { CheckConclusionState, type CheckStatusState } from './generated/graphql-types.js'

export type Filter = {
  event: string
}

export type WorkflowEvent = {
  workflowRuns: WorkflowRun[]
  startedAt: Date | undefined
  completedAt: Date | undefined
}

export type WorkflowRun = {
  id: number
  event: string
  workflowName: string
  url: string
  status: CheckStatusState
  conclusion: CheckConclusionState | undefined
  createdAt: Date
  completedAt: Date
  jobs: Job[]
}

export type Job = {
  id: number
  name: string
  url: string
  status: CheckStatusState
  conclusion: CheckConclusionState | undefined
  startedAt: Date
  completedAt: Date
}

export const summaryListChecksQuery = (q: ListChecksQuery, filter: Filter): WorkflowEvent => {
  assert(q.rateLimit != null, `rateLimit must not be null`)
  assert(q.repository != null, `repository must not be null`)
  assert(q.repository.object != null, `repository.object must not be null`)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null, `repository.object.checkSuites must not be null`)
  assert(q.repository.object.checkSuites.edges != null, `repository.object.checkSuites.edges must not be null`)

  const workflowRuns: WorkflowRun[] = []
  for (const checkSuiteEdge of q.repository.object.checkSuites.edges) {
    assert(checkSuiteEdge != null, `checkSuiteEdge must not be null`)
    const checkSuite = checkSuiteEdge.node
    assert(checkSuite != null, `checkSuite must not be null`)
    if (checkSuite.workflowRun == null) {
      continue
    }
    assert(checkSuite.checkRuns != null, `checkSuite.checkRuns must not be null`)
    assert(checkSuite.checkRuns.edges != null, `checkSuite.checkRuns.edges must not be null`)
    assert(checkSuite.workflowRun.databaseId != null, `checkSuite.workflowRun.databaseId must not be null`)
    if (checkSuite.workflowRun.event !== filter.event) {
      continue
    }

    const jobs: Job[] = []
    for (const checkRunEdge of checkSuite.checkRuns.edges) {
      assert(checkRunEdge != null, `checkRunEdge must not be null`)
      const checkRun = checkRunEdge.node
      assert(checkRun != null, `checkRun must not be null`)
      assert(checkRun.databaseId != null, `checkRun.databaseId must not be null`)
      if (checkRun.startedAt == null || checkRun.completedAt == null) {
        continue
      }
      if (checkRun.conclusion === CheckConclusionState.Skipped) {
        continue
      }
      jobs.push({
        id: checkRun.databaseId,
        name: checkRun.name,
        url: `${checkSuite.workflowRun.url}/job/${checkRun.databaseId}`,
        status: checkRun.status,
        conclusion: checkRun.conclusion ?? undefined,
        startedAt: new Date(checkRun.startedAt),
        completedAt: new Date(checkRun.completedAt),
      })
    }

    const completedAt = maxDate(jobs.map((job) => job.completedAt))
    if (completedAt == null) {
      continue
    }
    workflowRuns.push({
      id: checkSuite.workflowRun.databaseId,
      event: checkSuite.workflowRun.event,
      workflowName: checkSuite.workflowRun.workflow.name,
      url: checkSuite.workflowRun.url,
      status: checkSuite.status,
      conclusion: checkSuite.conclusion ?? undefined,
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
