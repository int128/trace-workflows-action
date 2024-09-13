import { summaryListChecksQuery } from '../src/checks.js'
import { CheckConclusionState, CheckStatusState } from '../src/generated/graphql-types.js'

describe('summaryListChecksQuery', () => {
  it('should return a summary of workflow runs', () => {
    const event = summaryListChecksQuery({
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
              endCursor: 'cursor',
              hasNextPage: false,
            },
            totalCount: 1,
            nodes: [
              {
                __typename: 'CheckSuite',
                workflowRun: {
                  __typename: 'WorkflowRun',
                  event: 'push',
                  workflow: {
                    __typename: 'Workflow',
                    name: 'CI',
                  },
                },
                createdAt: '2021-08-04T00:00:00Z',
                status: CheckStatusState.Completed,
                conclusion: CheckConclusionState.Success,
                checkRuns: {
                  __typename: 'CheckRunConnection',
                  totalCount: 1,
                  nodes: [
                    {
                      __typename: 'CheckRun',
                      name: 'build',
                      status: CheckStatusState.Completed,
                      conclusion: CheckConclusionState.Success,
                      startedAt: '2021-08-04T00:00:00Z',
                      completedAt: '2021-08-04T00:01:00Z',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    })
    expect(event).toEqual({
      workflowRuns: [
        {
          event: 'push',
          workflowName: 'CI',
          status: CheckStatusState.Completed,
          conclusion: CheckConclusionState.Success,
          createdAt: new Date('2021-08-04T00:00:00Z'),
          completedAt: new Date('2021-08-04T00:01:00Z'),
          jobs: [
            {
              name: 'build',
              status: CheckStatusState.Completed,
              conclusion: CheckConclusionState.Success,
              startedAt: new Date('2021-08-04T00:00:00Z'),
              completedAt: new Date('2021-08-04T00:01:00Z'),
            },
          ],
        },
      ],
      startedAt: new Date('2021-08-04T00:00:00Z'),
      completedAt: new Date('2021-08-04T00:01:00Z'),
    })
  })
})
