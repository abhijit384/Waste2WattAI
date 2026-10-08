export interface ApiLogSink {
  info(message: string): void;
  error(message: string): void;
}

/** Emit only the handler's structured, already-redacted metadata at its proper severity. */
export function createApiLogger(sink: ApiLogSink = console) {
  return (entry: Record<string, unknown>) => {
    const message = JSON.stringify(entry);
    if (typeof entry.statusCode === 'number' && entry.statusCode < 400) {
      sink.info(message);
      return;
    }
    sink.error(message);
  };
}
