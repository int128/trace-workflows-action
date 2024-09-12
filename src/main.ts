import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run.js'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'

const main = async (): Promise<void> => {
  await run({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    sha: core.getInput('sha', { required: true }),
    token: core.getInput('token', { required: true }),
  })
}

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
})
sdk.start()

try {
  await main()
} catch (e) {
  if (e instanceof Error) {
    core.setFailed(e)
  }
  console.error(e)
} finally {
  core.info('Shutting down opentelmetry sdk')
  await sdk.shutdown()
}
