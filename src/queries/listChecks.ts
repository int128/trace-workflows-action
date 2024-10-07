import assert from 'assert'
import * as core from '@actions/core'
import { ListChecksQuery, ListChecksQueryVariables } from '../generated/graphql.js'
import { Octokit } from '../github.js'

const query = /* GraphQL */ `
  query listChecks(
    $owner: String!
    $name: String!
    $oid: GitObjectID!
    $appId: Int!
    $firstCheckSuite: Int!
    $afterCheckSuite: String
    $firstCheckRun: Int!
    $afterCheckRun: String
    $firstStep: Int!
    $afterStep: String
  ) {
    rateLimit {
      cost
      remaining
    }
    repository(owner: $owner, name: $name) {
      object(oid: $oid) {
        __typename
        ... on Commit {
          checkSuites(filterBy: { appId: $appId }, first: $firstCheckSuite, after: $afterCheckSuite) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              cursor
              node {
                workflowRun {
                  event
                  workflow {
                    name
                  }
                  url
                }
                status
                conclusion
                createdAt
                checkRuns(
                  filterBy: { checkType: LATEST, status: COMPLETED, appId: $appId }
                  first: $firstCheckRun
                  after: $afterCheckRun
                ) {
                  totalCount
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      databaseId
                      name
                      status
                      conclusion
                      startedAt
                      completedAt
                      steps(first: $firstStep, after: $afterStep) {
                        totalCount
                        pageInfo {
                          hasNextPage
                          endCursor
                        }
                        edges {
                          cursor
                          node {
                            name
                            status
                            conclusion
                            startedAt
                            completedAt
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

type QueryFunction = (v: ListChecksQueryVariables) => Promise<ListChecksQuery>

const createQueryFunction =
  (octokit: Octokit): QueryFunction =>
  async (v: ListChecksQueryVariables): Promise<ListChecksQuery> =>
    core.group(`ListChecksQuery(${JSON.stringify(v)})`, async () => {
      const q: ListChecksQuery = await octokit.graphql(query, v)
      assert(q.rateLimit != null)
      core.info(`rateLimit.cost: ${q.rateLimit.cost}`)
      core.info(`rateLimit.remaining: ${q.rateLimit.remaining}`)
      core.debug(JSON.stringify(q, undefined, 2))
      return q
    })

export const getListChecksQuery = async (octokit: Octokit, v: ListChecksQueryVariables): Promise<ListChecksQuery> => {
  const fn = createQueryFunction(octokit)
  const q = await fn(v)
  const checkSuites = getCheckSuites(q)

  if (v.firstCheckSuite > 0) {
    await paginateCheckSuites(fn, v, checkSuites)
    core.info(`Fetched all CheckSuites`)
  }
  if (v.firstCheckRun > 0) {
    await paginateCheckRunsOfCheckSuites(fn, v, checkSuites)
    core.info(`Fetched all CheckRuns`)
  }
  if (v.firstStep > 0) {
    await paginateStepsOfCheckRunsOfCheckSuites(fn, v, checkSuites)
    core.info(`Fetched all Steps`)
  }
  return q
}

const paginateCheckSuites = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  cumulativeCheckSuites: CheckSuites,
): Promise<void> => {
  assert(cumulativeCheckSuites.edges != null)
  while (cumulativeCheckSuites.pageInfo.hasNextPage) {
    const nextQuery = await fn({
      ...v,
      afterCheckSuite: cumulativeCheckSuites.pageInfo.endCursor,
    })
    const nextCheckSuites = getCheckSuites(nextQuery)
    assert(nextCheckSuites.edges != null)
    cumulativeCheckSuites.edges.push(...nextCheckSuites.edges)
    cumulativeCheckSuites.totalCount = nextCheckSuites.totalCount
    cumulativeCheckSuites.pageInfo = nextCheckSuites.pageInfo
    core.info(`Fetched ${cumulativeCheckSuites.edges.length} of ${cumulativeCheckSuites.totalCount} CheckSuites`)
  }
}

type CheckSuites = ReturnType<typeof getCheckSuites>

const getCheckSuites = (q: ListChecksQuery) => {
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  return q.repository.object.checkSuites
}

const paginateCheckRunsOfCheckSuites = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  checkSuites: CheckSuites,
) => {
  assert(checkSuites.edges != null)
  for (const checkSuite of previousGenerator(checkSuites.edges)) {
    assert(checkSuite.current != null)
    assert(checkSuite.current.node != null)
    assert(checkSuite.current.node.checkRuns != null)
    await paginateCheckRunsOfCheckSuite(
      fn,
      v,
      checkSuite.previous?.cursor,
      checkSuite.current.cursor,
      checkSuite.current.node.checkRuns,
    )
  }
}

const paginateCheckRunsOfCheckSuite = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  previousCheckSuiteCursor: string | undefined, // undefined for the first CheckSuite
  currentCheckSuiteCursor: string,
  cumulativeCheckRuns: CheckRuns,
): Promise<void> => {
  assert(cumulativeCheckRuns.edges != null)
  while (cumulativeCheckRuns.pageInfo.hasNextPage) {
    const nextQuery = await fn({
      ...v,
      // Fetch only the current check suite
      firstCheckSuite: 1,
      afterCheckSuite: previousCheckSuiteCursor,
      firstCheckRun: 100,
      afterCheckRun: cumulativeCheckRuns.pageInfo.endCursor,
    })
    const nextCheckRuns = getCheckRuns(nextQuery, currentCheckSuiteCursor)
    assert(nextCheckRuns.edges != null)
    cumulativeCheckRuns.edges.push(...nextCheckRuns.edges)
    cumulativeCheckRuns.totalCount = nextCheckRuns.totalCount
    cumulativeCheckRuns.pageInfo = nextCheckRuns.pageInfo
    core.info(`Fetched ${cumulativeCheckRuns.edges.length} of ${cumulativeCheckRuns.totalCount} CheckRuns`)
  }
}

type CheckRuns = ReturnType<typeof getCheckRuns>

const getCheckRuns = (q: ListChecksQuery, checkSuiteCursor: string) => {
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  assert(q.repository.object.checkSuites.edges != null)
  for (const checkSuiteEdge of q.repository.object.checkSuites.edges) {
    assert(checkSuiteEdge != null)
    if (checkSuiteEdge.cursor === checkSuiteCursor) {
      assert(checkSuiteEdge.node != null)
      assert(checkSuiteEdge.node.checkRuns != null)
      return checkSuiteEdge.node.checkRuns
    }
  }
  throw new Error(`internal error: no such CheckSuite of ${checkSuiteCursor}`)
}

const paginateStepsOfCheckRunsOfCheckSuites = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  checkSuites: CheckSuites,
) => {
  assert(checkSuites.edges != null)
  for (const checkSuite of previousGenerator(checkSuites.edges)) {
    assert(checkSuite.current != null)
    assert(checkSuite.current.node != null)
    assert(checkSuite.current.node.checkRuns != null)
    assert(checkSuite.current.node.checkRuns.edges != null)
    for (const chechRun of previousGenerator(checkSuite.current.node.checkRuns.edges)) {
      assert(chechRun.current != null)
      assert(chechRun.current.node != null)
      assert(chechRun.current.node.steps != null)
      await paginateStepsOfCheckRun(
        fn,
        v,
        checkSuite.previous?.cursor,
        checkSuite.current.cursor,
        chechRun.previous?.cursor,
        chechRun.current.cursor,
        chechRun.current.node.steps,
      )
    }
  }
}

const paginateStepsOfCheckRun = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  previousCheckSuiteCursor: string | undefined, // undefined for the first CheckSuite
  currentCheckSuiteCursor: string,
  previousCheckRunCursor: string | undefined, // undefined for the first CheckRun
  currentCheckRunCursor: string,
  cumulativeSteps: Steps,
): Promise<void> => {
  assert(cumulativeSteps.edges != null)
  while (cumulativeSteps.pageInfo.hasNextPage) {
    const nextQuery = await fn({
      ...v,
      // Fetch only the current check suite and check run
      firstCheckSuite: 1,
      afterCheckSuite: previousCheckSuiteCursor,
      firstCheckRun: 1,
      afterCheckRun: previousCheckRunCursor,
      firstStep: 100,
      afterStep: cumulativeSteps.pageInfo.endCursor,
    })
    const nextSteps = getSteps(nextQuery, currentCheckSuiteCursor, currentCheckRunCursor)
    assert(nextSteps.edges != null)
    cumulativeSteps.edges.push(...nextSteps.edges)
    cumulativeSteps.totalCount = nextSteps.totalCount
    cumulativeSteps.pageInfo = nextSteps.pageInfo
    core.info(`Fetched ${cumulativeSteps.edges.length} of ${cumulativeSteps.totalCount} Steps`)
  }
}

type Steps = ReturnType<typeof getSteps>

const getSteps = (q: ListChecksQuery, checkSuiteCursor: string, checkRunCursor: string) => {
  const checkRuns = getCheckRuns(q, checkSuiteCursor)
  assert(checkRuns.edges != null)
  for (const checkRunEdge of checkRuns.edges) {
    assert(checkRunEdge != null)
    if (checkRunEdge.cursor === checkRunCursor) {
      assert(checkRunEdge.node != null)
      assert(checkRunEdge.node.steps != null)
      return checkRunEdge.node.steps
    }
  }
  throw new Error(`internal error: no such Step of ${checkSuiteCursor} and ${checkRunCursor}`)
}

function* previousGenerator<T>(a: T[]): Generator<{ previous?: T; current: T }> {
  for (let i = 0; i < a.length; i++) {
    if (i === 0) {
      yield { current: a[i] }
    }
    yield { previous: a[i - 1], current: a[i] }
  }
}
