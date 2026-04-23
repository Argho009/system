# Deployment Information

**Live URL:** [https://attendance-app.arghodeep2006.workers.dev](https://attendance-app.arghodeep2006.workers.dev)

## Production Secrets
The following secret was set for production using `wrangler secret put`:

- **JWT_SECRET**: `A9k2mP5nR7tXv4yQ`

## Configuration
- **D1 Database ID**: `117a9115-fa52-4758-a7de-975928e6b423`
- **R2 Storage**: Disabled (commented out in `wrangler.toml`)
- **SPA Routing**: Enabled via `not_found_handling = "single-page-application"`

> [!WARNING]
> Do not share this file or commit it to a public repository if you want to keep your JWT_SECRET private.
