import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import type { ListStepsQuery, ListStepsQueryVariables } from '../generated/graphql.js'

const query = /* GraphQL */ `
  query listSteps($checkSuiteId: ID!) {
    node(id: $checkSuiteId) {
      ... on CheckSuite {
        checkRuns(first: 100, filterBy: { checkType: LATEST, status: COMPLETED, conclusions: [FAILURE, TIMED_OUT] }) {
          nodes {
            databaseId
            steps(first: 100) {
              nodes {
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
`

export const getListStepsQuery = async (octokit: Octokit, v: ListStepsQueryVariables): Promise<ListStepsQuery> =>
  core.group(`ListStepsQuery(${JSON.stringify(v)})`, async () => await octokit.graphql(query, v))
