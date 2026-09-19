import type { JSX } from '@solidjs/web/jsx-runtime'

/**
 * Bundles a number of refs into a single one, dropping the ones that were not
 * given. Lets a component keep hold of an element itself while still handing
 * that element to whoever passed a ref in from outside.
 */
export function combineRefs<T>(...refs: Array<JSX.Ref<T> | undefined>): JSX.Ref<T> {
  return refs.filter(ref => ref !== undefined)
}
