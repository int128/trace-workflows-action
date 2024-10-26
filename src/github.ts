import * as core from '@actions/core'
import * as github from '@actions/github'
import { retry } from '@octokit/plugin-retry'

export type Octokit = ReturnType<typeof github.getOctokit>

export const getOctokit = (token: string): Octokit => github.getOctokit(token, {}, retry)

export const listJobsForWorkflowRun = async (
  octokit: Octokit,
  params: NonNullable<Parameters<typeof octokit.rest.actions.listJobsForWorkflowRun>[0]>,
) =>
  await core.group(`listJobsForWorkflowRun(${params.run_id})`, () =>
    octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, params),
  )

export type WorkflowJobs = Awaited<ReturnType<typeof listJobsForWorkflowRun>>

export type WorkflowJob = WorkflowJobs[0]
