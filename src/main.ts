import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run.js'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'

const main = async (): Promise<void> => {
  const enableOTLP = core.getBooleanInput('enable-oltp', { required: true })
  const sdk = new NodeSDK({
    traceExporter: enableOTLP ? new OTLPTraceExporter() : new ConsoleSpanExporter(),
  })
  sdk.start()

  try {
    await run({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      sha: core.getInput('sha', { required: true }),
      token: core.getInput('token', { required: true }),
    })
  } finally {
    await sdk.shutdown()
  }
}

await main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
