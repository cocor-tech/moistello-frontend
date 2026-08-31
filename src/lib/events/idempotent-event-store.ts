export interface ProcessedEvent {
  idempotencyKey: string
  txHash: string
  contractAddress: string
  eventType: string
  payload: Record<string, unknown>
  processedAt: number
}

export class IdempotentEventStore {
  private processedEvents = new Map<string, ProcessedEvent>()
  private txHashRegistry = new Set<string>()

  public generateIdempotencyKey(txHash: string, logIndex: number | string): string {
    return `${txHash}:${logIndex}`
  }

  public isEventProcessed(idempotencyKey: string): boolean {
    return this.processedEvents.has(idempotencyKey)
  }

  public isTxHashProcessed(txHash: string): boolean {
    return this.txHashRegistry.has(txHash)
  }

  public buildUpsertQuery(event: ProcessedEvent): {
    sql: string
    params: (string | number | Record<string, unknown>)[]
  } {
    const sql = `
      INSERT INTO processed_events (idempotency_key, tx_hash, contract_address, event_type, payload, processed_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *;
    `.trim()

    return {
      sql,
      params: [
        event.idempotencyKey,
        event.txHash,
        event.contractAddress,
        event.eventType,
        event.payload,
        event.processedAt,
      ],
    }
  }

  public async processEvent(event: Omit<ProcessedEvent, "processedAt">): Promise<{
    success: boolean
    duplicate: boolean
    event: ProcessedEvent
  }> {
    if (this.isEventProcessed(event.idempotencyKey)) {
      return {
        success: true,
        duplicate: true,
        event: this.processedEvents.get(event.idempotencyKey)!,
      }
    }

    const fullEvent: ProcessedEvent = {
      ...event,
      processedAt: Date.now(),
    }

    this.processedEvents.set(event.idempotencyKey, fullEvent)
    this.txHashRegistry.add(event.txHash)

    return {
      success: true,
      duplicate: false,
      event: fullEvent,
    }
  }

  public async processBatch(
    events: Omit<ProcessedEvent, "processedAt">[],
  ): Promise<{
    processed: number
    skippedDuplicates: number
  }> {
    let processed = 0
    let skippedDuplicates = 0

    for (const event of events) {
      const result = await this.processEvent(event)
      if (result.duplicate) {
        skippedDuplicates++
      } else {
        processed++
      }
    }

    return { processed, skippedDuplicates }
  }

  public clear(): void {
    this.processedEvents.clear()
    this.txHashRegistry.clear()
  }

  public getEventCount(): number {
    return this.processedEvents.size
  }
}
