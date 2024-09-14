import * as github from '@actions/github'

export type Context = {
  owner: string
  repo: string
  event: string
  ref: string
  sha: string
  pullRequestNumber?: number
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
  if (github.context.eventName === 'workflow_run') {
    const payload = github.context.payload as WorkflowRunEventPayload
    if (payload.workflow_run.pull_requests.length > 0) {
      return {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        event: payload.workflow_run.event,
        ref: payload.workflow_run.head_branch,
        sha: payload.workflow_run.head_sha,
        pullRequestNumber: payload.workflow_run.pull_requests[0].number,
      }
    }
    return {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      event: payload.workflow_run.event,
      ref: payload.workflow_run.head_branch,
      sha: payload.workflow_run.head_sha,
    }
  }

  if (github.context.eventName === 'pull_request') {
    const payload = github.context.payload as PullRequestEventPayload
    return {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      event: github.context.eventName,
      ref: payload.pull_request.head.ref,
      sha: payload.pull_request.head.sha,
      pullRequestNumber: payload.pull_request.number,
    }
  }

  return {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    event: github.context.eventName,
    ref: github.context.ref,
    sha: github.context.sha,
  }
}
