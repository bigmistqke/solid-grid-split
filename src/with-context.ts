import { type Accessor, type Context, type JSX } from 'solid-js'

export function withContext<T>(
  children: Accessor<JSX.Element | JSX.Element[]>,
  context: Context<T>,
  value: T,
) {
  let result: JSX.Element | JSX.Element[]

  context.Provider({
    value,
    children: (() => {
      result = children()
      return ''
    }) as any as JSX.Element,
  })

  return () => result
}
