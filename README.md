# typescript-action-with-graphql-codegen [![ts](https://github.com/int128/typescript-action-with-graphql-codegen/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/typescript-action-with-graphql-codegen/actions/workflows/ts.yaml)

This is a template of TypeScript action.
Inspired from https://github.com/actions/typescript-action.

## Features

- GraphQL Code Generator with GitHub GraphQL schema
- Ready to develop with the minimum configs
  - Prettier
  - ESLint
  - tsconfig
  - Jest
- Automated continuous release
- Keep consistency of generated files
- Shipped with Renovate config

## Getting Started

See https://github.com/int128/typescript-action for details.

## Specification

To run this action, create a workflow as follows:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: int128/typescript-action-with-graphql-codegen@v1
```

### Inputs

| Name    | Default        | Description       |
| ------- | -------------- | ----------------- |
| `sha`   | `github.sha`   | Target commit SHA |
| `token` | `github.token` | GitHub token      |

### Outputs

| Name      | Description    |
| --------- | -------------- |
| `example` | Example output |
