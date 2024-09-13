# trace-workflows-action [![ts](https://github.com/int128/trace-workflows-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/trace-workflows-action/actions/workflows/ts.yaml)

This is an action to send a trace of GitHub Actions workflows to OpenTelemetry.

## Getting Started

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: int128/trace-workflows-action@v0
        with:
          oltp-endpoint: http://localhost:4318/v1/traces
```

## Specification

### Inputs

| Name            | Default value                                        | Description                                        |
| --------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `sha`           | `github.event.pull_request.head.sha` or `github.sha` | Commit SHA to acquire the workflow runs            |
| `event`         | `github.event_name`                                  | Event name to acquire the workflow runs            |
| `ref`           | `github.ref`                                         | Ref name set to a span attribute                   |
| `token`         | `github.token`                                       | GitHub token                                       |
| `oltp-endpoint` | -                                                    | If set, emit a trace to the OpenTelemetry endpoint |

### Outputs

None.
