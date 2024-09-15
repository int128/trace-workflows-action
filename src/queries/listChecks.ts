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
    $firstCheckRun: Int!
    $afterCheckSuite: String
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
            nodes {
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
                nodes {
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
`

export const getListChecksQuery = async (octokit: Octokit, v: ListChecksQueryVariables): Promise<ListChecksQuery> => {
  const fn = createQueryFunction(octokit)
  const q = await fn(v)

  core.info(`Fetching all check suites`)
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  q.repository.object.checkSuites = await paginateCheckSuites(fn, v, getCheckSuites(q))

  core.info(`Fetching all check runs`)
  assert(q.repository.object.checkSuites.nodes != null)
  for (const [checkSuiteIndex, checkSuite] of q.repository.object.checkSuites.nodes.entries()) {
    assert(checkSuite != null)
    checkSuite.checkRuns = await paginateCheckRuns(fn, v, checkSuiteIndex, getCheckRuns(q, checkSuiteIndex))
  }

  return q
}

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

const paginateCheckSuites = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  cumulativeCheckSuites: CheckSuites,
): Promise<CheckSuites> => {
  assert(cumulativeCheckSuites.nodes != null)
  core.info(`Fetched ${cumulativeCheckSuites.nodes.length} of ${cumulativeCheckSuites.totalCount} check suites`)
  if (!cumulativeCheckSuites.pageInfo.hasNextPage) {
    return cumulativeCheckSuites
  }

  const nextQuery = await fn({
    ...v,
    afterCheckSuite: cumulativeCheckSuites.pageInfo.endCursor,
  })
  const nextCheckSuites = getCheckSuites(nextQuery)
  assert(nextCheckSuites.nodes != null)
  return await paginateCheckSuites(fn, v, {
    ...nextCheckSuites,
    nodes: [...cumulativeCheckSuites.nodes, ...nextCheckSuites.nodes],
  })
}

type CheckSuites = ReturnType<typeof getCheckSuites>

const getCheckSuites = (q: ListChecksQuery) => {
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  assert(q.repository.object.checkSuites.nodes != null)
  return q.repository.object.checkSuites
}

const paginateCheckRuns = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  checkSuiteIndex: number,
  cumulativeCheckRuns: CheckRuns,
): Promise<CheckRuns> => {
  assert(cumulativeCheckRuns.nodes != null)
  core.info(`Fetched ${cumulativeCheckRuns.nodes.length} of ${cumulativeCheckRuns.totalCount} check runs`)
  if (!cumulativeCheckRuns.pageInfo.hasNextPage) {
    return cumulativeCheckRuns
  }

  const nextQuery = await fn({
    ...v,
    afterCheckRun: cumulativeCheckRuns.pageInfo.endCursor,
  })
  const nextCheckRuns = getCheckRuns(nextQuery, checkSuiteIndex)
  assert(nextCheckRuns.nodes != null)
  return await paginateCheckRuns(fn, v, checkSuiteIndex, {
    ...nextCheckRuns,
    nodes: [...cumulativeCheckRuns.nodes, ...nextCheckRuns.nodes],
  })
}

type CheckRuns = ReturnType<typeof getCheckRuns>

const getCheckRuns = (q: ListChecksQuery, checkSuiteIndex: number) => {
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  assert(q.repository.object.checkSuites.nodes != null)
  assert(q.repository.object.checkSuites.nodes[checkSuiteIndex] != null)
  assert(q.repository.object.checkSuites.nodes[checkSuiteIndex].checkRuns != null)
  assert(q.repository.object.checkSuites.nodes[checkSuiteIndex].checkRuns.nodes != null)
  return q.repository.object.checkSuites.nodes[checkSuiteIndex].checkRuns
}
