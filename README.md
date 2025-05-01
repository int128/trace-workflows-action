# trace-workflows-action [![ts](https://github.com/int128/trace-workflows-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/trace-workflows-action/actions/workflows/ts.yaml)

This is an action to export a trace of GitHub Actions workflows to OpenTelemetry.
It is designed for a monorepo repository with multiple workflows.

## Getting Started

This action fetches all workflows run on the target commit.
You need to run this action after all workflows are completed.

### 1. Create a workflow to wait for all workflows

This workflow runs on pull requests and waits for all workflows to be completed,
using [wait-for-workflows-action](https://github.com/int128/wait-for-workflows-action).

```yaml
name: wait-for-workflows

on:
  pull_request:

jobs:
  wait-for-workflows:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: int128/wait-for-workflows-action@v1
```

### 2. Create a workflow to export the trace

This workflow runs on the completion of the `wait-for-workflows` workflow.

```yaml
name: trace-workflows

on:
  workflow_run:
    types:
      - completed
    workflows:
      - wait-for-workflows

jobs:
  trace-workflows:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: int128/trace-workflows-action@v0
        env:
          OTEL_EXPORTER_OTLP_ENDPOINT: http://opentelemetry-collector:4318
```

## Example

Here is an example of trace exported to Datadog APM.

<img width="1100" alt="image" src="https://github.com/user-attachments/assets/f6286a37-dc1e-440e-922e-3d47f0583ac0">

## Spans

This action exports the following spans:

1. Event
2. Workflow
3. Job

The span contains the following common attributes:

- `service.name`: `github-actions`.
- `service.version`: The target commit SHA.
- `host.name`: Typically `github.com`. Determined from the GitHub server URL.
- `deployment.environment.name`
  - If a pull request, `pr-` prefix and the number.
  - Otherwise, the target branch name or tag name.
- `github.repository`: The repository name.
- `github.ref`: The target branch name.
- `github.sha`: The target commit SHA.
- `github.actor`: The actor who triggered the workflow.
- `github.event.name`: The event name.
- `github.run_attempt`: Attempt number of the workflow run. 1 for the first run.

### 1. Event span

The span name is in the form of `owner/repo:event_name:ref`.
This is the root span of the trace.

The span contains the following attributes:

- `operation.name`: `event`.
- `url.full`: GitHub URL to the pull request or commit.

### 2. Workflow span

The span name is the workflow name.
If the workflow run is failed, cancelled or timed out, the span is marked as ERROR.

The span contains the following attributes:

- `operation.name`: `workflow`.
- `github.workflow.name`: The workflow name.
- `github.workflow.conclusion`: The conclusion of the workflow run.
- `github.workflow.status`: The status of the workflow run.
- `url.full`: GitHub URL to the workflow run.

### 3. Job span

The span name is the job name.
If the job is failed, cancelled or timed out, the span is marked as ERROR.

The span contains the following attributes:

- `operation.name`: `job`.
- `github.job.name`: The job name.
- `github.job.conclusion`: The conclusion of the job run.
- `github.job.status`: The status of the job run.
- `url.full`: GitHub URL to the job.

## Specification

This action fetches the workflows run on the target commit.
See [the GraphQL query](src/queries/listChecks.ts) for details.

### Inputs

| Name    | Default value  | Description  |
| ------- | -------------- | ------------ |
| `token` | `github.token` | GitHub token |

### Environment variables

This action accepts the environment variables for the OTLP exporter.
See https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/ for details.

### Outputs

None.
