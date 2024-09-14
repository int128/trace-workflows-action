import * as core from '@actions/core'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { ConsoleSpanExporter, SpanExporter } from '@opentelemetry/sdk-trace-node'

type Options = {
  endpoint: string
}

export const withOpenTelemetry = async <T>(opts: Options, f: () => Promise<T>): Promise<T> => {
  const sdk = new NodeSDK({
    traceExporter: getTraceExporter(opts),
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
