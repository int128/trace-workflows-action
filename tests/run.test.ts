import { getAssociatedPullRequest } from '../src/queries/getAssociatedPullRequest.js'
import { run } from '../src/run.js'

jest.mock('../src/queries/getAssociatedPullRequest')

describe('run', () => {
  it('should show the associated pull request', async () => {
    jest.mocked(getAssociatedPullRequest).mockResolvedValueOnce({
      repository: {
        object: {
          __typename: 'Commit',
          associatedPullRequests: {
            nodes: [
              {
                number: 1,
              },
            ],
          },
        },
      },
    })

    await expect(
      run({
        owner: 'octocat',
        repo: 'typescript-action-with-graphql-codegen',
        sha: '0123456789',
        token: 'GITHUB_TOKEN',
      }),
    ).resolves.toBeUndefined()
  })
})
