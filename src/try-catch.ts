export function tryCatch<T, U>(fn: () => T): T | undefined
export function tryCatch<T, U>(fn: () => T, onError: (error: unknown) => U): T | U
export function tryCatch<T, U>(fn: () => T, onError?: (error: unknown) => U): T | U | undefined {
  try {
    return fn()
  } catch (error) {
    return onError?.(error)
  }
}
