import astro from "@astrojs/cloudflare/entrypoints/server";
import { refreshGitHubStats } from "@/lib/github-stats";

export default {
  fetch: astro.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(refreshGitHubStats(env));
  },
} satisfies ExportedHandler<Env>;
