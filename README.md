# trace-workflows-action [![ts](https://github.com/int128/trace-workflows-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/trace-workflows-action/actions/workflows/ts.yaml)

This is an action to export a trace of GitHub Actions workflows to OpenTelemetry.

## Example

Here is an example of trace exported to Datadog APM.

<img width="1100" alt="image" src="https://github.com/user-attachments/assets/f6286a37-dc1e-440e-922e-3d47f0583ac0">

## Getting Started

This action needs to be run after all workflows are completed.

To run trace-workflows-action after [wait-for-workflows-action](https://github.com/int128/wait-for-workflows-action),
create the below workflows.

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
    # Collect a trace when all workflows are succeeded.
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: int128/trace-workflows-action@v0
        with:
          enable-oltp-exporter: true
        env:
          OTEL_EXPORTER_OTLP_ENDPOINT: http://opentelemetry-collector:4318
```

## Specification

This action fetches the workflows run on the target commit.
See [the GraphQL query](src/queries/listChecks.ts) for details.

### Trace attributes

This action exports the following attributes:

- Span name
  - For an event, in the form of `owner/repo:event_name:ref`.
  - For a workflow, the workflow name.
  - For a job, the job name.
- Span status code
  - If the workflow or job is failed, cancelled or timed out, ERROR.
  - Otherwise, OK.
- `error.type`: The conclusion of workflow or job.
- `service.name`
  - For an event, `github-actions-event`.
  - For a workflow, `github-actions-workflow`.
  - For a job, `github-actions-trace`.
- `service.version`: The target commit SHA.
- `host.name`: Determined from the GitHub URL, typically `github.com`.
- `deployment.environment.name`: The target branch name. If a pull request, `pr-` prefix and the number.
- `user.name`: GitHub user.
- `url.full`: GitHub URL to the workflow or job.

### Inputs

| Name                   | Default value  | Description                      |
| ---------------------- | -------------- | -------------------------------- |
| `token`                | `github.token` | GitHub token                     |
| `enable-oltp-exporter` | false          | If true, export a trace via OLTP |

This action accepts the environment variables for the OTLP exporter.
See https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/ for details.

### Outputs

None.
