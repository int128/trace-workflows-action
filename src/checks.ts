import assert from 'assert'
import { ListChecksQuery } from './generated/graphql.js'
import { CheckConclusionState, CheckStatusState } from './generated/graphql-types.js'

export type WorkflowRun = {
  event: string
  workflowName: string
  status: CheckStatusState
  conclusion: CheckConclusionState | null | undefined
  createdAt: Date
  completedAt: Date | undefined
  jobs: Job[]
}

export type Job = {
  name: string
  status: CheckStatusState
  conclusion: CheckConclusionState | null | undefined
  startedAt: Date | undefined
  completedAt: Date | undefined
}

export const summaryListChecksQuery = (q: ListChecksQuery): WorkflowRun[] => {
  assert(q.rateLimit != null)
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  assert(q.repository.object.checkSuites.nodes != null)

  return q.repository.object.checkSuites.nodes.map((checkSuite): WorkflowRun => {
    assert(checkSuite != null)
    assert(checkSuite.workflowRun != null)
    assert(checkSuite.checkRuns != null)
    assert(checkSuite.checkRuns.nodes != null)

    const jobs: Job[] = []
    for (const checkRun of checkSuite.checkRuns.nodes) {
      assert(checkRun != null)
      jobs.push({
        name: checkRun.name,
        status: checkRun.status,
        conclusion: checkRun.conclusion,
        startedAt: toDate(checkRun.startedAt),
        completedAt: toDate(checkRun.completedAt),
      })
    }

    return {
      event: checkSuite.workflowRun.event,
      workflowName: checkSuite.workflowRun.workflow.name,
      status: checkSuite.status,
      conclusion: checkSuite.conclusion,
      createdAt: new Date(checkSuite.createdAt),
      completedAt: workflowCompletedAt(jobs),
      jobs,
    }
  })
}

const toDate = (date: string | null | undefined): Date | undefined => (date == null ? undefined : new Date(date))

const workflowCompletedAt = (jobs: Job[]): Date | undefined => {
  const completedTimes: number[] = jobs.map((job) => job.completedAt?.getTime()).filter((x): x is number => x != null)
  if (completedTimes.length === 0) {
    return
  }
  return new Date(Math.max(...completedTimes))
}
