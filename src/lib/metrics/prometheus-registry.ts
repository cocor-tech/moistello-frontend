export class Counter {
  private values = new Map<string, number>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
  ) {}

  public inc(labels: Record<string, string> = {}, value = 1): void {
    const key = this.serializeLabels(labels)
    const current = this.values.get(key) || 0
    this.values.set(key, current + value)
  }

  public get(labels: Record<string, string> = {}): number {
    const key = this.serializeLabels(labels)
    return this.values.get(key) || 0
  }

  public reset(): void {
    this.values.clear()
  }

  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",")
  }

  public toPrometheusFormat(): string {
    let output = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`
    if (this.values.size === 0) {
      output += `${this.name} 0\n`
    } else {
      for (const [labels, val] of this.values.entries()) {
        const labelStr = labels ? `{${labels}}` : ""
        output += `${this.name}${labelStr} ${val}\n`
      }
    }
    return output
  }
}

export class Gauge {
  private values = new Map<string, number>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
  ) {}

  public set(value: number, labels: Record<string, string> = {}): void {
    const key = this.serializeLabels(labels)
    this.values.set(key, value)
  }

  public get(labels: Record<string, string> = {}): number {
    const key = this.serializeLabels(labels)
    return this.values.get(key) || 0
  }

  public reset(): void {
    this.values.clear()
  }

  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",")
  }

  public toPrometheusFormat(): string {
    let output = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n`
    if (this.values.size === 0) {
      output += `${this.name} 0\n`
    } else {
      for (const [labels, val] of this.values.entries()) {
        const labelStr = labels ? `{${labels}}` : ""
        output += `${this.name}${labelStr} ${val}\n`
      }
    }
    return output
  }
}

export class Histogram {
  private buckets: number[]
  private bucketCounts = new Map<string, Map<number, number>>()
  private sumMap = new Map<string, number>()
  private countMap = new Map<string, number>()

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
    buckets: number[] = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  ) {
    this.buckets = [...buckets].sort((a, b) => a - b)
  }

  public observe(val: number, labels: Record<string, string> = {}): void {
    const key = this.serializeLabels(labels)

    if (!this.bucketCounts.has(key)) {
      const map = new Map<number, number>()
      for (const b of this.buckets) {
        map.set(b, 0)
      }
      this.bucketCounts.set(key, map)
    }

    const map = this.bucketCounts.get(key)!
    for (const b of this.buckets) {
      if (val <= b) {
        map.set(b, (map.get(b) || 0) + 1)
      }
    }

    this.sumMap.set(key, (this.sumMap.get(key) || 0) + val)
    this.countMap.set(key, (this.countMap.get(key) || 0) + 1)
  }

  public reset(): void {
    this.bucketCounts.clear()
    this.sumMap.clear()
    this.countMap.clear()
  }

  private serializeLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",")
  }

  public toPrometheusFormat(): string {
    let output = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`

    if (this.bucketCounts.size === 0) {
      for (const b of this.buckets) {
        output += `${this.name}_bucket{le="${b}"} 0\n`
      }
      output += `${this.name}_bucket{le="+Inf"} 0\n`
      output += `${this.name}_sum 0\n`
      output += `${this.name}_count 0\n`
    } else {
      for (const [key, map] of this.bucketCounts.entries()) {
        const prefix = key ? `${key},` : ""
        let cumulative = 0
        for (const b of this.buckets) {
          cumulative += map.get(b) || 0
          output += `${this.name}_bucket{${prefix}le="${b}"} ${cumulative}\n`
        }
        const count = this.countMap.get(key) || 0
        output += `${this.name}_bucket{${prefix}le="+Inf"} ${count}\n`
        const sumLabel = key ? `{${key}}` : ""
        output += `${this.name}_sum${sumLabel} ${this.sumMap.get(key) || 0}\n`
        output += `${this.name}_count${sumLabel} ${count}\n`
      }
    }

    return output
  }
}

export class PrometheusRegistry {
  public readonly eventsProcessed = new Counter(
    "events_processed",
    "Total number of events processed by the indexer",
    ["event_type", "status"],
  )

  public readonly eventsFailed = new Counter(
    "events_failed",
    "Total number of event processing failures",
    ["error_type"],
  )

  public readonly cursorLag = new Gauge(
    "cursor_lag",
    "Current cursor lag in ledgers/seconds behind head",
  )

  public readonly dbWriteLatency = new Histogram(
    "db_write_latency",
    "Latency of database write operations in milliseconds",
  )

  public readonly reconcilerRuns = new Counter(
    "reconciler_runs",
    "Total number of reconciler execution runs",
    ["status"],
  )

  public resetAll(): void {
    this.eventsProcessed.reset()
    this.eventsFailed.reset()
    this.cursorLag.reset()
    this.dbWriteLatency.reset()
    this.reconcilerRuns.reset()
  }

  public generateMetricsText(): string {
    return [
      this.eventsProcessed.toPrometheusFormat(),
      this.eventsFailed.toPrometheusFormat(),
      this.cursorLag.toPrometheusFormat(),
      this.dbWriteLatency.toPrometheusFormat(),
      this.reconcilerRuns.toPrometheusFormat(),
    ].join("\n")
  }
}

export const prometheusRegistry = new PrometheusRegistry()
