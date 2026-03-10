type GraphQLErrorPayload = {
  errors?: { message?: string }[];
};

export function getSubgraphEndpoint(): string | null {
  // Prefer server-only env var, fall back to public one for client usage.
  return process.env.SUBGRAPH_URL ?? process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? null;
}

export async function subgraphRequest<TData>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: { cache?: RequestCache }
): Promise<TData> {
  const endpoint = getSubgraphEndpoint();
  if (!endpoint) {
    throw new Error('Missing SUBGRAPH_URL (or NEXT_PUBLIC_SUBGRAPH_URL) environment variable');
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: opts?.cache ?? 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Subgraph HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as GraphQLErrorPayload & { data?: TData };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message ?? 'GraphQL error').join('; '));
  }
  if (!json.data) {
    throw new Error('Subgraph returned no data');
  }
  return json.data;
}
