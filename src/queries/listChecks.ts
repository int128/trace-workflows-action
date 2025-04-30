import assert from 'assert'
import * as core from '@actions/core'
import { Octokit } from '@octokit/action'
import { ListChecksQuery, ListChecksQueryVariables } from '../generated/graphql.js'

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
  await paginateCheckSuites(fn, v, checkSuites)
  core.info(`Fetched all CheckSuites`)

  await paginateCheckRunsOfCheckSuites(fn, v, checkSuites)
  core.info(`Fetched all CheckRuns`)

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

function* previousGenerator<T>(a: T[]): Generator<{ previous?: T; current: T }> {
  for (let i = 0; i < a.length; i++) {
    if (i === 0) {
      yield { current: a[i] }
    }
    yield { previous: a[i - 1], current: a[i] }
  }
}
