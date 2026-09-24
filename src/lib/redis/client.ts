import { logger } from "@/lib/logger"
import Redis from "ioredis"

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379"
  const redisPassword = process.env.REDIS_PASSWORD

  redisClient = new Redis(redisUrl, {
    password: redisPassword,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    maxRetriesPerRequest: 3,
  })

  redisClient.on("error", (err) => {
    logger.error("[Redis] Connection error:", err)
  })

  redisClient.on("connect", () => {
    logger.info("[Redis] Connected successfully")
  })

  return redisClient
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
