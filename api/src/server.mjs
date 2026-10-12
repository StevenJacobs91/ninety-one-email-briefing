import { buildApp } from './app.mjs'
import { loadConfig } from './config.mjs'

const config = loadConfig()
const app = await buildApp(config)

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => app.close().then(() => process.exit(0)))
}

await app.listen({ port: config.port, host: '0.0.0.0' })
