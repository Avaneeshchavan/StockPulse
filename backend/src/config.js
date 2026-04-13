import dotenv from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

/**
 * @param {string} name
 * @param {string | undefined} value
 * @returns {string}
 */
function requireNonEmpty(name, value) {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(
      `[config] Missing required environment variable: ${name}. Copy backend/.env.example to backend/.env and set a value.`
    )
  }
  return trimmed
}

/**
 * @param {string} name
 * @param {string | undefined} value
 * @param {number} [minLength]
 */
function requireSecret(name, value, minLength = 16) {
  const v = requireNonEmpty(name, value)
  if (v.length < minLength) {
    throw new Error(
      `[config] ${name} must be at least ${minLength} characters. Use a long random string in production.`
    )
  }
  return v
}

/**
 * @param {string} name
 * @param {string | undefined} value
 */
function requirePort(name, value) {
  const raw = value?.trim()
  if (!raw) {
    throw new Error(
      `[config] Missing required environment variable: ${name}. Copy backend/.env.example to backend/.env and set a value (e.g. 3001).`
    )
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(
      `[config] ${name} must be an integer between 1 and 65535, got: ${JSON.stringify(raw)}`
    )
  }
  return n
}

// —— Required for current server behavior ——
const finnhubApiKey = requireNonEmpty('FINNHUB_API_KEY', process.env.FINNHUB_API_KEY)
const gnewsApiKey = requireNonEmpty(
  'GNEWS_API_KEY',
  process.env.GNEWS_API_KEY
)
const port = requirePort('PORT', process.env.PORT)
const alphaVantageApiKey = optional(process.env.ALPHA_VANTAGE_API_KEY)

/**
 * @param {string | undefined} value
 * @returns {string}
 */
function optional(value) {
  const t = value?.trim()
  return t ?? ''
}

export const config = {
  port,
  finnhubApiKey,
  /** GNews API Key. */
  gnewsApiKey,
  alphaVantageApiKey,
  googleClientId: optional(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: optional(process.env.GOOGLE_CLIENT_SECRET),
}

export default config
