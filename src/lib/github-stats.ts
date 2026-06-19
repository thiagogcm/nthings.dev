export type DailyActivity = { date: string; count: number }; // date = "YYYY-MM-DD" (UTC)

export type GitHubStats = {
  repoCount: number;
  commitCount: number;
  lastUpdate: string;
  fetchedAt: string;
  // Daily contribution series over the activity window, oldest -> newest, gaps filled with 0.
  // Older cache entries predate these fields; their absence marks a stale entry.
  dailyActivity: DailyActivity[];
  activityTotal: number; // contributionCalendar.totalContributions for the window
  activityMax: number; // busiest single day (0 if the window is empty)
  activityAvg: number; // activityTotal / ACTIVITY_DAYS, rounded to 1 decimal
};

type GitHubStatsEnv = {
  GITHUB_STATS: KVNamespace;
  GITHUB_USERNAME: string;
  GITHUB_TOKEN?: string;
};

const KV_PREFIX = 'github:';
const CACHE_TTL_SECONDS = 86_400;
const GITHUB_FETCH_TIMEOUT_MS = 15_000;
export const ACTIVITY_DAYS = 90;
const DAY_MS = 86_400_000;

// PromQL-style label for the activity panel; shared by the chart and its loading state.
export const activityMetricQuery = (user: string) => {
  return `sum(increase(github_contributions_total{user="${user}"}[1d]))`;
};

const REPOS_QUERY = `
  query($login: String!, $cursor: String) {
    user(login: $login) {
      repositories(
        first: 100
        after: $cursor
        ownerAffiliations: OWNER
        isFork: false
        privacy: PUBLIC
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          pushedAt
          defaultBranchRef {
            target {
              ... on Commit {
                history {
                  totalCount
                }
              }
            }
          }
        }
      }
    }
  }
`;

// contributionsCollection requires an authenticated token (GraphQL has no
// anonymous access); without GITHUB_TOKEN this query errors and the refresh
// rejects, which the caller swallows so the panel stays in its loading state.
const CONTRIBUTIONS_QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

type RepoNode = {
  pushedAt: string | null;
  defaultBranchRef: {
    target: { history: { totalCount: number } } | null;
  } | null;
};

type ReposData = {
  user: {
    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: RepoNode[];
    };
  } | null;
};

type CalendarDay = { date: string; contributionCount: number };
type CalendarWeek = { contributionDays: CalendarDay[] };

type ContributionsData = {
  user: {
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: CalendarWeek[];
      };
    };
  } | null;
};

const kvKey = (username: string) => {
  return `${KV_PREFIX}${username}`;
};

export async function getGitHubStats(env: GitHubStatsEnv): Promise<GitHubStats | null> {
  try {
    return await env.GITHUB_STATS.get<GitHubStats>(kvKey(env.GITHUB_USERNAME), 'json');
  } catch {
    return null;
  }
}

export async function refreshGitHubStats(env: GitHubStatsEnv): Promise<GitHubStats> {
  const stats = await fetchGitHubStats(env.GITHUB_USERNAME, env.GITHUB_TOKEN);
  await env.GITHUB_STATS.put(kvKey(env.GITHUB_USERNAME), JSON.stringify(stats), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
  return stats;
}

/**
 * Collapse GitHub's contribution weeks into a continuous, fixed-length daily
 * series ending on `endUtc`. Missing days are filled with 0 and GitHub's
 * partial-week overhang is clipped to exactly `days` entries (oldest -> newest).
 * Pure (no network, no Intl) so it can be unit-tested directly.
 */
export function buildDailySeries(
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[],
  endUtc: Date,
  days = ACTIVITY_DAYS,
): { series: DailyActivity[]; max: number; current: number } {
  const counts = new Map<string, number>();
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      counts.set(day.date, day.contributionCount);
    }
  }

  // UTC midnight of the end date, so day arithmetic ignores wall-clock time.
  const end = Date.UTC(endUtc.getUTCFullYear(), endUtc.getUTCMonth(), endUtc.getUTCDate());

  const series: DailyActivity[] = [];
  let max = 0;
  let current = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(end - i * DAY_MS).toISOString().slice(0, 10);
    const count = counts.get(date) ?? 0;
    series.push({ date, count });
    if (count > max) max = count;
    current = count; // last iteration (i === 0) is the most recent day
  }

  return { series, max, current };
}

async function fetchGitHubStats(username: string, token?: string): Promise<GitHubStats> {
  const to = new Date();
  const from = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - (ACTIVITY_DAYS - 1)),
  );

  const [repos, calendar] = await Promise.all([
    fetchAllRepos(username, token),
    fetchContributionsCalendar(username, from.toISOString(), to.toISOString(), token),
  ]);

  const { series, max } = buildDailySeries(calendar.weeks, to, ACTIVITY_DAYS);
  const activityTotal = calendar.totalContributions;
  const activityAvg = Math.round((activityTotal / ACTIVITY_DAYS) * 10) / 10;

  return {
    repoCount: repos.repoCount,
    commitCount: repos.commitCount,
    lastUpdate: repos.lastUpdate,
    fetchedAt: new Date().toISOString(),
    dailyActivity: series,
    activityTotal,
    activityMax: max,
    activityAvg,
  };
}

async function fetchAllRepos(username: string, token?: string) {
  let repoCount = 0;
  let commitCount = 0;
  let lastUpdate = '';
  let cursor: string | null = null;

  do {
    const page = await fetchReposPage(username, cursor, token);
    repoCount = page.totalCount;

    for (const repo of page.nodes) {
      commitCount += repo.defaultBranchRef?.target?.history.totalCount ?? 0;
      if (repo.pushedAt && repo.pushedAt > lastUpdate) {
        lastUpdate = repo.pushedAt;
      }
    }

    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  return { repoCount, commitCount, lastUpdate };
}

async function fetchReposPage(username: string, cursor: string | null, token?: string) {
  const data = await githubGraphQL<ReposData>(REPOS_QUERY, { login: username, cursor }, token);

  const repositories = data.user?.repositories;
  if (!repositories) {
    throw new Error(`GitHub user "${username}" not found or has no public repositories`);
  }

  return repositories;
}

async function fetchContributionsCalendar(
  username: string,
  from: string,
  to: string,
  token?: string,
) {
  const data = await githubGraphQL<ContributionsData>(
    CONTRIBUTIONS_QUERY,
    { login: username, from, to },
    token,
  );

  const calendar = data.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) {
    throw new Error(`GitHub user "${username}" not found or has no contribution calendar`);
  }

  return calendar;
}

async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'nthings.dev-stats-worker',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${payload.errors.map((e) => {
      return e.message;
    }).join(', ')}`);
  }
  if (!payload.data) {
    throw new Error('GitHub GraphQL response missing data');
  }

  return payload.data;
}
