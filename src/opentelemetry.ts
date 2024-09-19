import * as core from '@actions/core'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { ConsoleSpanExporter, SpanExporter } from '@opentelemetry/sdk-trace-node'
import { Context } from './context.js'
import { Resource } from '@opentelemetry/resources'
import { ATTR_HOST_NAME, ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions/incubating'

type Options = {
  endpoint: string
  context: Context
}

export const withOpenTelemetry = async <T>(opts: Options, f: () => Promise<T>): Promise<T> => {
  const sdk = new NodeSDK({
    traceExporter: getTraceExporter(opts),
    autoDetectResources: false,
    resource: new Resource({
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
  if (opts.endpoint) {
    return new OTLPTraceExporter({
      url: opts.endpoint,
    })
  }
  return new ConsoleSpanExporter()
}
