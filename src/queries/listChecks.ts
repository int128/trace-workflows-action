import assert from 'assert'
import * as core from '@actions/core'
import { ListChecksQuery, ListChecksQueryVariables } from '../generated/graphql.js'
import { Octokit } from '../github.js'

const query = /* GraphQL */ `
  query listChecks($owner: String!, $name: String!, $oid: GitObjectID!, $appId: Int!, $afterCheckSuite: String) {
    rateLimit {
      cost
      remaining
    }
    repository(owner: $owner, name: $name) {
      object(oid: $oid) {
        __typename
        ... on Commit {
          checkSuites(filterBy: { appId: $appId }, first: 100, after: $afterCheckSuite) {
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
              checkRuns(filterBy: { checkType: LATEST, status: COMPLETED, appId: $appId }, first: 100) {
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
  return await paginateCheckSuites(fn, v)
}

type QueryFunction = (v: ListChecksQueryVariables) => Promise<ListChecksQuery>

const createQueryFunction =
  (octokit: Octokit): QueryFunction =>
  async (v: ListChecksQueryVariables): Promise<ListChecksQuery> =>
    core.group(`ListChecksQuery(${JSON.stringify(v)})`, async () => {
      const q: ListChecksQuery = await octokit.graphql(query, v)
      core.debug(JSON.stringify(q, undefined, 2))
      return q
    })

const paginateCheckSuites = async (
  fn: QueryFunction,
  v: ListChecksQueryVariables,
  previous?: ListChecksQuery,
): Promise<ListChecksQuery> => {
  const q = await fn(v)
  assert(q.repository != null)
  assert(q.repository.object != null)
  assert.strictEqual(q.repository.object.__typename, 'Commit')
  assert(q.repository.object.checkSuites != null)
  assert(q.repository.object.checkSuites.nodes != null)

  if (previous !== undefined) {
    assert(previous.repository != null)
    assert(previous.repository.object != null)
    assert.strictEqual(previous.repository.object.__typename, 'Commit')
    assert(previous.repository.object.checkSuites != null)
    assert(previous.repository.object.checkSuites.nodes != null)
    q.repository.object.checkSuites.nodes.unshift(...previous.repository.object.checkSuites.nodes)
  }

  core.info(
    `CheckSuites: ${q.repository.object.checkSuites.nodes.length} / ${q.repository.object.checkSuites.totalCount}`,
  )

  if (!q.repository.object.checkSuites.pageInfo.hasNextPage) {
    return q
  }
  const afterCheckSuite = q.repository.object.checkSuites.pageInfo.endCursor
  return await paginateCheckSuites(fn, { ...v, afterCheckSuite }, q)
}
