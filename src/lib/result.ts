/**
 * Result Type
 *
 * A standard Result<T> type for consistent error handling across the codebase.
 * Inspired by Rust's Result type and functional programming patterns.
 */

/**
 * Represents a successful result containing data of type T.
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Represents a failed result containing an error.
 */
export interface Failure {
  success: false;
  error: Error;
}

/**
 * A discriminated union representing either success with data or failure with error.
 */
export type Result<T> = Success<T> | Failure;

/**
 * Creates a successful Result containing the given data.
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Creates a failed Result containing the given error.
 * If a string is passed, it will be converted to an Error.
 */
export function failure(error: Error | string): Failure {
  return {
    success: false,
    error: typeof error === 'string' ? new Error(error) : error,
  };
}

/**
 * Wraps a function that may throw in a try-catch and returns a Result.
 * Useful for converting throwing functions to Result-returning functions.
 */
export function tryCatch<T>(fn: () => T): Result<T> {
  try {
    return success(fn());
  } catch (e) {
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Async version of tryCatch for async functions.
 */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (e) {
    return failure(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Extracts the data from a successful Result, or throws if it's a failure.
 * Use when you want to propagate errors as exceptions.
 */
export function unwrap<T>(result: Result<T>): T {
  if (result.success) {
    return result.data;
  }
  throw result.error;
}

/**
 * Extracts the data from a successful Result, or returns the default value if it's a failure.
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.success ? result.data : defaultValue;
}

/**
 * Maps the data of a successful Result using the given function.
 * If the Result is a failure, returns the failure unchanged.
 */
export function map<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (result.success) {
    return success(fn(result.data));
  }
  return result;
}

/**
 * Maps the data of a successful Result using a function that returns a Result.
 * Useful for chaining operations that may fail.
 */
export function flatMap<T, U>(result: Result<T>, fn: (data: T) => Result<U>): Result<U> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}

/**
 * Returns true if the Result is a success.
 */
export function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.success;
}

/**
 * Returns true if the Result is a failure.
 */
export function isFailure<T>(result: Result<T>): result is Failure {
  return !result.success;
}
