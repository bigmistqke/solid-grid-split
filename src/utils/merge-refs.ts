type Ref<T> = ((value: T) => void) | { ref?: T | ((value: T) => void) | undefined }

export function mergeRefs<T>(...values: Ref<T>[]) {
  return (element: T) => {
    values.forEach(value => {
      if (typeof value === 'function') {
        value(element)
      } else if ('ref' in value && value.ref) {
        if (typeof value.ref === 'function') {
          value.ref(element)
        } else {
          value.ref = element
        }
      }
    })
  }
}
