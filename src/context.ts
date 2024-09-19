import * as core from '@actions/core'
import * as github from '@actions/github'

export type Context = {
  owner: string
  repo: string
  event: string
  ref: string
  sha: string
  pullRequestNumber?: number
  actor: string
  serverUrl: string
  serverHostname?: string
}

type WorkflowRunEventPayload = {
  workflow_run: {
    event: string
    head_branch: string
    head_sha: string
    pull_requests: {
      number: number
    }[]
  }
}

type PullRequestEventPayload = {
  pull_request: typeof github.context.payload.pull_request & {
    head: {
      ref: string
      sha: string
    }
  }
}

export const getContext = (): Context => {
  const context = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    actor: github.context.actor,
    serverUrl: github.context.serverUrl,
    serverHostname: getServerHostname(github.context.serverUrl),
  }

  if (github.context.eventName === 'workflow_run') {
    const payload = github.context.payload as WorkflowRunEventPayload
    if (payload.workflow_run.pull_requests.length > 0) {
      return {
        ...context,
        event: payload.workflow_run.event,
        ref: payload.workflow_run.head_branch,
        sha: payload.workflow_run.head_sha,
        pullRequestNumber: payload.workflow_run.pull_requests[0].number,
      }
    }
    return {
      ...context,
      event: payload.workflow_run.event,
      ref: payload.workflow_run.head_branch,
      sha: payload.workflow_run.head_sha,
    }
  }

  if (github.context.eventName === 'pull_request') {
    const payload = github.context.payload as PullRequestEventPayload
    return {
      ...context,
      event: github.context.eventName,
      ref: payload.pull_request.head.ref,
      sha: payload.pull_request.head.sha,
      pullRequestNumber: payload.pull_request.number,
    }
  }

  return {
    ...context,
    event: github.context.eventName,
    ref: github.context.ref,
    sha: github.context.sha,
  }
}

const getServerHostname = (serverUrl: string): string | undefined => {
  try {
    return new URL(serverUrl).hostname
  } catch (e) {
    core.warning(`Invalid context.serverUrl: ${serverUrl}: ${String(e)}`)
  }
}
