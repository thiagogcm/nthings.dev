export type GitHubStats = {
  repoCount: number;
  commitCount: number;
  lastUpdate: string;
  fetchedAt: string;
};

type GitHubStatsEnv = {
  GITHUB_STATS: KVNamespace;
  GITHUB_USERNAME: string;
  GITHUB_TOKEN?: string;
};

const KV_PREFIX = 'github:';
const CACHE_TTL_SECONDS = 86_400;
const GITHUB_FETCH_TIMEOUT_MS = 15_000;

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

type RepoNode = {
  pushedAt: string | null;
  defaultBranchRef: {
    target: { history: { totalCount: number } } | null;
  } | null;
};

type ReposResponse = {
  data?: {
    user: {
      repositories: {
        totalCount: number;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: RepoNode[];
      };
    } | null;
  };
  errors?: { message: string }[];
};

const kvKey = (username: string) => `${KV_PREFIX}${username}`;

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

async function fetchGitHubStats(username: string, token?: string): Promise<GitHubStats> {
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

  return {
    repoCount,
    commitCount,
    lastUpdate,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchReposPage(username: string, cursor: string | null, token?: string) {
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
    body: JSON.stringify({
      query: REPOS_QUERY,
      variables: { login: username, cursor },
    }),
    signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const payload = (await response.json()) as ReposResponse;
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${payload.errors.map((e) => e.message).join(', ')}`);
  }

  const repositories = payload.data?.user?.repositories;
  if (!repositories) {
    throw new Error(`GitHub user "${username}" not found or has no public repositories`);
  }

  return repositories;
}
