import { describe } from 'vitest'
import { it } from 'vitest'
import { expect } from 'vitest'
import { summaryListChecksQuery, WorkflowEvent, WorkflowJobsProvider } from '../src/checks.js'
import { CheckConclusionState, CheckStatusState } from '../src/generated/graphql-types.js'
import { ListChecksQuery } from '../src/generated/graphql.js'

describe('summaryListChecksQuery', () => {
  it('should return a summary of workflow runs', async () => {
    const query: ListChecksQuery = {
      __typename: 'Query',
      rateLimit: {
        cost: 1,
        remaining: 4999,
      },
      repository: {
        __typename: 'Repository',
        object: {
          __typename: 'Commit',
          checkSuites: {
            __typename: 'CheckSuiteConnection',
            pageInfo: {
              endCursor: 'CheckSuiteCursor',
              hasNextPage: false,
            },
            totalCount: 1,
            edges: [
              {
                cursor: 'CheckSuiteCursor',
                node: {
                  __typename: 'CheckSuite',
                  workflowRun: {
                    __typename: 'WorkflowRun',
                    databaseId: 2,
                    event: 'push',
                    workflow: {
                      __typename: 'Workflow',
                      name: 'CI',
                    },
                    url: 'https://github.com/int128/trace-workflows-action/actions/runs/2',
                  },
                  createdAt: '2021-08-04T00:00:00Z',
                  status: CheckStatusState.Completed,
                  conclusion: CheckConclusionState.Success,
                },
              },
            ],
          },
        },
      },
    }
    const workflowJobsProvider: WorkflowJobsProvider = () =>
      Promise.resolve([
        {
          id: 3,
          name: 'build',
          status: 'completed',
          conclusion: 'success',
          html_url: 'https://github.com/int128/trace-workflows-action/actions/runs/2/job/3',
          run_attempt: 1,
          labels: ['ubuntu-latest'],
          created_at: '2021-08-04T00:00:00Z',
          started_at: '2021-08-04T00:01:00Z',
          completed_at: '2021-08-04T00:02:00Z',
          steps: [
            {
              number: 1,
              name: 'build',
              status: 'completed',
              conclusion: 'success',
              started_at: '2021-08-04T00:01:00Z',
              completed_at: '2021-08-04T00:02:00Z',
            },
          ],
        },
      ])
    const event = await summaryListChecksQuery(query, { event: 'push' }, workflowJobsProvider)
    expect(event).toEqual<WorkflowEvent>({
      workflowRuns: [
        {
          id: 2,
          event: 'push',
          workflowName: 'CI',
          url: 'https://github.com/int128/trace-workflows-action/actions/runs/2',
          status: CheckStatusState.Completed,
          conclusion: CheckConclusionState.Success,
          createdAt: new Date('2021-08-04T00:00:00Z'),
          completedAt: new Date('2021-08-04T00:02:00Z'),
          jobs: [
            {
              id: 3,
              name: 'build',
              url: 'https://github.com/int128/trace-workflows-action/actions/runs/2/job/3',
              status: 'completed',
              conclusion: 'success',
              runnerLabel: 'ubuntu-latest',
              createdAt: new Date('2021-08-04T00:00:00Z'),
              startedAt: new Date('2021-08-04T00:01:00Z'),
              completedAt: new Date('2021-08-04T00:02:00Z'),
              steps: [
                {
                  name: 'build',
                  status: 'completed',
                  conclusion: 'success',
                  startedAt: new Date('2021-08-04T00:01:00Z'),
                  completedAt: new Date('2021-08-04T00:02:00Z'),
                },
              ],
            },
          ],
        },
      ],
      startedAt: new Date('2021-08-04T00:00:00Z'),
      completedAt: new Date('2021-08-04T00:02:00Z'),
    })
  })
})
