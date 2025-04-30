import * as core from '@actions/core'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { ConsoleSpanExporter, SpanExporter } from '@opentelemetry/sdk-trace-node'
import { Context } from './context.js'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_HOST_NAME, ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions/incubating'

type Options = {
  enableOTLPExporter: boolean
  context: Context
}

export const withOpenTelemetry = async <T>(opts: Options, f: () => Promise<T>): Promise<T> => {
  const sdk = new NodeSDK({
    traceExporter: getTraceExporter(opts),
    // Exclude the current environment attributes.
    // This action should be run on workflow_run event,
    // the current environment does not reflect the target workflows.
    autoDetectResources: false,
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'github-actions',
      [ATTR_HOST_NAME]: opts.context.serverHostname,
    }),
  })
  sdk.start()
  try {
    return await f()
  } finally {
    await core.group('Shutting down OpenTelemetry', async () => {
      await sdk.shutdown()
    })
  }
}

const getTraceExporter = (opts: Options): SpanExporter => {
  if (opts.enableOTLPExporter) {
    return new OTLPTraceExporter()
  }
  return new ConsoleSpanExporter()
}
