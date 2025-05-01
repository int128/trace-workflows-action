import * as core from '@actions/core'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_HOST_NAME } from '@opentelemetry/semantic-conventions/incubating'

type Options = {
  enableOTLPExporter: boolean
  githubServerUrl: string
}

export const withOpenTelemetry = async <T>(opts: Options, f: () => Promise<T>): Promise<T> => {
  const traceExporter = getTraceExporter(opts)
  const sdk = new NodeSDK({
    traceExporter,
    // Exclude the current environment attributes.
    // This action should be run on workflow_run event,
    // the current environment does not reflect the target workflows.
    autoDetectResources: false,
    resource: resourceFromAttributes({
      [ATTR_HOST_NAME]: getHostname(opts.githubServerUrl),
    }),
  })
  sdk.start()
  try {
    return await f()
  } finally {
    await core.group('Flushing the exporter', () => traceExporter.forceFlush())
    await core.group('Shutting down OpenTelemetry', () => sdk.shutdown())
  }
}

const getTraceExporter = (opts: Options) =>
  opts.enableOTLPExporter ? new OTLPTraceExporter() : new ConsoleSpanExporter()

const getHostname = (serverUrl: string): string | undefined => {
  try {
    return new URL(serverUrl).hostname
  } catch (e) {
    core.warning(`Invalid serverUrl: ${serverUrl}: ${String(e)}`)
  }
}
