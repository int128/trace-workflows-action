import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run.js'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { ConsoleSpanExporter, SpanExporter } from '@opentelemetry/sdk-trace-node'

const main = async (): Promise<void> => {
  let traceExporter: SpanExporter = new ConsoleSpanExporter()
  const oltpEndpoint = core.getInput('oltp-endpoint')
  if (oltpEndpoint) {
    traceExporter = new OTLPTraceExporter({
      url: oltpEndpoint,
    })
  }

  const sdk = new NodeSDK({ traceExporter })
  sdk.start()

  try {
    await run({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      sha: core.getInput('sha', { required: true }),
      event: core.getInput('event', { required: true }),
      ref: core.getInput('ref', { required: true }),
      token: core.getInput('token', { required: true }),
    })
  } finally {
    await core.group('Shutting down OpenTelemetry', async () => {
      await sdk.shutdown()
    })
  }
}

await main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
