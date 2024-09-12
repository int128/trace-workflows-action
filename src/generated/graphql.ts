import * as Types from './graphql-types.js';

export type GetAssociatedPullRequestQueryVariables = Types.Exact<{
  owner: Types.Scalars['String']['input'];
  name: Types.Scalars['String']['input'];
  expression: Types.Scalars['String']['input'];
}>;


export type GetAssociatedPullRequestQuery = { __typename?: 'Query', rateLimit?: { __typename?: 'RateLimit', cost: number, remaining: number } | null, repository?: { __typename?: 'Repository', object?: { __typename: 'Blob' } | { __typename: 'Commit', associatedPullRequests?: { __typename?: 'PullRequestConnection', nodes?: Array<{ __typename?: 'PullRequest', number: number } | null> | null } | null } | { __typename: 'Tag' } | { __typename: 'Tree' } | null } | null };
