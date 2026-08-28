import { vi } from "vitest";

export interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

export interface RecordedCall {
  method: string;
  args: unknown[];
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "in",
  "ilike",
  "order",
  "limit",
  "maybeSingle",
  "single",
] as const;

type ChainMethod = (typeof CHAIN_METHODS)[number];

export type QueryMock<T> = Record<ChainMethod, (...args: unknown[]) => QueryMock<T>> & {
  /** Every chained call, in order, so a test can assert what was asked for. */
  calls: RecordedCall[];
  /** Change what this builder resolves to partway through a test. */
  setResult: (next: QueryResult<T>) => void;
  then: (resolve: (value: QueryResult<T>) => unknown) => unknown;
};

/**
 * A chainable stand-in for a PostgREST query builder.
 *
 * Supabase calls look like `from(t).select().eq().maybeSingle()`, where every
 * link returns the builder and the whole thing is awaited at the end. The stub
 * returns itself from each method and is thenable, so any chain shape resolves
 * to the configured result without the test having to predict the exact calls.
 */
export const makeQuery = <T>(result: QueryResult<T>): QueryMock<T> => {
  const calls: RecordedCall[] = [];
  // Held in a box so a test can change what the *same* builder resolves to
  // partway through. Swapping the whole client instead would not work:
  // callbacks memoised during an earlier render still hold the old one.
  const current = { result };

  const chain = {
    calls,
    setResult: (next: QueryResult<T>) => {
      current.result = next;
    },
    then: (resolve: (value: QueryResult<T>) => unknown) => resolve(current.result),
  } as QueryMock<T>;

  for (const method of CHAIN_METHODS) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    }) as QueryMock<T>[ChainMethod];
  }

  return chain;
};

export interface SupabaseMock {
  from: ReturnType<typeof vi.fn>;
  storage: { from: ReturnType<typeof vi.fn> };
}

/**
 * A fake Supabase client. `tables` maps a table name to the query stub that
 * `from()` should hand back, so a test only configures the tables it touches.
 */
export const makeSupabase = (
  // Deliberately loose: QueryMock<T> is contravariant in T through setResult,
  // so QueryMock<Song[]> is not assignable to QueryMock<unknown>. A test
  // helper is the right place to absorb that rather than pushing casts into
  // every test.
  tables: Record<string, QueryMock<any>>
): SupabaseMock => ({
  from: vi.fn((table: string) => {
    const query = tables[table];
    if (!query) {
      throw new Error(
        `Test called supabase.from("${table}") but no stub was configured for it.`
      );
    }
    return query;
  }),
  storage: {
    from: vi.fn(() => ({
      getPublicUrl: vi.fn((path: string) => ({
        data: { publicUrl: `https://cdn.test/${path}` },
      })),
    })),
  },
});
