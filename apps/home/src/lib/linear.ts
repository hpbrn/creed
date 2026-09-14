import "server-only";

const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";

type LinearGraphQLError = {
  message?: unknown;
};

type LinearGraphQLResponse<T> = {
  data?: T;
  errors?: LinearGraphQLError[];
};

export class LinearRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LinearRequestError";
  }
}

export async function requestLinear<T>({
  apiKey,
  query,
  variables,
  revalidateSeconds,
}: {
  apiKey: string;
  query: string;
  variables?: Record<string, unknown>;
  revalidateSeconds?: number;
}): Promise<T> {
  const request: RequestInit & { next?: { revalidate: number } } = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  };
  if (revalidateSeconds !== undefined) {
    request.next = { revalidate: revalidateSeconds };
  } else {
    request.cache = "no-store";
  }
  const response = await fetch(LINEAR_GRAPHQL_ENDPOINT, request);

  if (!response.ok) {
    throw new LinearRequestError("linear_http_error", response.status);
  }

  const payload = (await response.json()) as LinearGraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new LinearRequestError("linear_graphql_error");
  }
  if (!payload.data) {
    throw new LinearRequestError("linear_missing_data");
  }

  return payload.data;
}
