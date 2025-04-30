import assert from 'assert'
import * as fs from 'fs/promises'
import { Octokit } from '@octokit/action'
import { WebhookEvent } from '@octokit/webhooks-types'
import { retry } from '@octokit/plugin-retry'

export const getOctokit = () => new (Octokit.plugin(retry))()

export const listJobsForWorkflowRun = async (
  octokit: Octokit,
  params: NonNullable<Parameters<typeof octokit.rest.actions.listJobsForWorkflowRun>[0]>,
) => await octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, params)

export type WorkflowJobs = Awaited<ReturnType<typeof listJobsForWorkflowRun>>

export type WorkflowJob = WorkflowJobs[0]

export type Context = BaseContext & {
  target: TargetContext
}

export const getContext = async (): Promise<Context> => {
  const baseContext = await getBaseContext()
  const targetContext = getTargetContext(baseContext)
  return {
    ...baseContext,
    target: targetContext,
  }
}

type BaseContext = {
  repo: {
    owner: string
    repo: string
  }
  actor: string
  eventName: string
  ref: string
  runAttempt: number
  serverUrl: string
  sha: string
  payload: WebhookEvent
}

const getBaseContext = async (): Promise<BaseContext> => {
  // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
  return {
    repo: getRepo(),
    actor: getEnv('GITHUB_ACTOR'),
    eventName: getEnv('GITHUB_EVENT_NAME'),
    ref: getEnv('GITHUB_REF'),
    runAttempt: Number.parseInt(getEnv('GITHUB_RUN_ATTEMPT')),
    serverUrl: getEnv('GITHUB_SERVER_URL'),
    sha: getEnv('GITHUB_SHA'),
    payload: JSON.parse(await fs.readFile(getEnv('GITHUB_EVENT_PATH'), 'utf-8')) as WebhookEvent,
  }
}

const getRepo = () => {
  const [owner, repo] = getEnv('GITHUB_REPOSITORY').split('/')
  return { owner, repo }
}

const getEnv = (name: string): string => {
  assert(process.env[name], `${name} is required`)
  return process.env[name]
}

type TargetContext = {
  eventName: string
  ref: string
  sha: string
  runAttempt: number
  pullRequestNumber?: number
}

const getTargetContext = (context: BaseContext): TargetContext => {
  if ('workflow_run' in context.payload && context.payload.workflow_run) {
    const workflowRun = context.payload.workflow_run
    return {
      eventName: workflowRun.event,
      ref: workflowRun.head_branch,
      sha: workflowRun.head_sha,
      runAttempt: workflowRun.run_attempt,
      pullRequestNumber: workflowRun.pull_requests.at(0)?.number,
    }
  }
  if ('pull_request' in context.payload) {
    const pullRequest = context.payload.pull_request
    return {
      eventName: context.eventName,
      ref: pullRequest.head.ref,
      sha: pullRequest.head.sha,
      runAttempt: context.runAttempt,
      pullRequestNumber: pullRequest.number,
    }
  }
  return {
    eventName: context.eventName,
    ref: context.ref,
    sha: context.sha,
    runAttempt: context.runAttempt,
  }
}
