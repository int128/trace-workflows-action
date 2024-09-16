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
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  q.repository.object.checkSuites = await paginateCheckSuites(fn, v, q.repository.object.checkSuites)
  core.info(`Fetched all CheckSuites`)

  await paginateCheckRunsOfCheckSuites(fn, v, q.repository.object.checkSuites)
  core.info(`Fetched all CheckRuns`)

  return q
}

const paginateCheckSuites = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  cumulativeCheckSuites: CheckSuites,
): Promise<CheckSuites> => {
  assert(cumulativeCheckSuites.edges != null)
  core.info(`Fetched ${cumulativeCheckSuites.edges.length} of ${cumulativeCheckSuites.totalCount} CheckSuites`)
  if (!cumulativeCheckSuites.pageInfo.hasNextPage) {
    return cumulativeCheckSuites
  }

  const nextQuery = await fn({
    ...v,
    afterCheckSuite: cumulativeCheckSuites.pageInfo.endCursor,
  })
  const nextCheckSuites = getCheckSuites(nextQuery)
  assert(nextCheckSuites.edges != null)
  return await paginateCheckSuites(fn, v, {
    ...nextCheckSuites,
    edges: [...cumulativeCheckSuites.edges, ...nextCheckSuites.edges],
  })
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
  for (const [previousCheckSuite, currentCheckSuite] of previousGenerator(checkSuites.edges)) {
    assert(previousCheckSuite != null)
    assert(currentCheckSuite != null)
    assert(currentCheckSuite.node != null)
    assert(currentCheckSuite.node.checkRuns != null)
    currentCheckSuite.node.checkRuns = await paginateCheckRunsOfCheckSuite(
      fn,
      v,
      previousCheckSuite.cursor,
      currentCheckSuite.cursor,
      currentCheckSuite.node.checkRuns,
    )
  }
}

const paginateCheckRunsOfCheckSuite = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  previousCheckSuiteCursor: string,
  currentCheckSuiteCursor: string,
  cumulativeCheckRuns: CheckRuns,
): Promise<CheckRuns> => {
  assert(cumulativeCheckRuns.edges != null)
  core.info(`Fetched ${cumulativeCheckRuns.edges.length} of ${cumulativeCheckRuns.totalCount} CheckRuns`)
  if (!cumulativeCheckRuns.pageInfo.hasNextPage) {
    return cumulativeCheckRuns
  }

  const nextQuery = await fn({
    ...v,
    // Fetch the current check suite, that is, the first one after the previous check suite
    firstCheckSuite: 1,
    afterCheckSuite: previousCheckSuiteCursor,
    firstCheckRun: 100,
    afterCheckRun: cumulativeCheckRuns.pageInfo.endCursor,
  })
  const nextCheckRuns = getCheckRuns(nextQuery, currentCheckSuiteCursor)
  assert(nextCheckRuns.edges != null)
  return await paginateCheckRunsOfCheckSuite(fn, v, previousCheckSuiteCursor, currentCheckSuiteCursor, {
    ...nextCheckRuns,
    edges: [...cumulativeCheckRuns.edges, ...nextCheckRuns.edges],
  })
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
  throw new Error(`internal error: no such CheckSuite cursor ${checkSuiteCursor}`)
}

function* previousGenerator<T>(a: T[]): Generator<[T, T]> {
  for (let i = 1; i < a.length; i++) {
    yield [a[i - 1], a[i]]
  }
}
