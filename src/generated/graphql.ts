import * as Types from './graphql-types.js';

export type ListChecksQueryVariables = Types.Exact<{
  owner: Types.Scalars['String']['input'];
  name: Types.Scalars['String']['input'];
  oid: Types.Scalars['GitObjectID']['input'];
  appId: Types.Scalars['Int']['input'];
  afterCursor?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type ListChecksQuery = { __typename?: 'Query', rateLimit?: { __typename?: 'RateLimit', cost: number, remaining: number } | null, repository?: { __typename?: 'Repository', object?: { __typename: 'Blob' } | { __typename: 'Commit', checkSuites?: { __typename?: 'CheckSuiteConnection', totalCount: number, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes?: Array<{ __typename?: 'CheckSuite', status: Types.CheckStatusState, conclusion?: Types.CheckConclusionState | null, createdAt: string, workflowRun?: { __typename?: 'WorkflowRun', event: string, workflow: { __typename?: 'Workflow', name: string } } | null, checkRuns?: { __typename?: 'CheckRunConnection', totalCount: number, nodes?: Array<{ __typename?: 'CheckRun', name: string, status: Types.CheckStatusState, conclusion?: Types.CheckConclusionState | null, startedAt?: string | null, completedAt?: string | null } | null> | null } | null } | null> | null } | null } | { __typename: 'Tag' } | { __typename: 'Tree' } | null } | null };
