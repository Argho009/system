/**
 * Legacy script name kept for compatibility.
 * Database migrations are applied with Wrangler + D1:
 *   npm run db:migrate
 *
 * Requires: wrangler, local .dev.vars with JWT_SECRET for the API worker.
 */
import { execSync } from 'child_process';

try {
  execSync('npx wrangler d1 migrations apply attendance-db --local', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
