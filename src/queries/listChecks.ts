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
                  databaseId
                }
                status
                conclusion
                createdAt
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
