import { summaryListChecksQuery, WorkflowEvent } from '../src/checks.js'
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
                    event: 'push',
                    workflow: {
                      __typename: 'Workflow',
                      name: 'CI',
                    },
                    url: 'https://github.com/int128/trace-workflows-action/actions/runs/2',
                    databaseId: 2,
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
    const event = await summaryListChecksQuery(
      query,
      {
        event: 'push',
      },
      () =>
        Promise.resolve([
          {
            name: 'build',
            url: 'https://github.com/int128/trace-workflows-action/actions/runs/2/job/3',
            status: CheckStatusState.Completed,
            conclusion: CheckConclusionState.Success,
            startedAt: new Date('2021-08-04T00:00:00Z'),
            completedAt: new Date('2021-08-04T00:01:00Z'),
          },
        ]),
    )
    expect(event).toEqual<WorkflowEvent>({
      workflowRuns: [
        {
          event: 'push',
          workflowName: 'CI',
          url: 'https://github.com/int128/trace-workflows-action/actions/runs/2',
          status: CheckStatusState.Completed,
          conclusion: CheckConclusionState.Success,
          createdAt: new Date('2021-08-04T00:00:00Z'),
          completedAt: new Date('2021-08-04T00:01:00Z'),
          jobs: [
            {
              name: 'build',
              url: 'https://github.com/int128/trace-workflows-action/actions/runs/2/job/3',
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
