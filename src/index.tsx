import {
  children,
  createContext,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  mapArray,
  mergeProps,
  on,
  onCleanup,
  splitProps,
  useContext,
  type ComponentProps,
  type JSX,
} from 'solid-js'
import { cursor } from './cursor'
import { mergeRefs } from './utils/merge-refs'
import { withContext } from './with-context'

/**********************************************************************************/
/*                                                                                */
/*                                      Types                                     */
/*                                                                                */
/**********************************************************************************/

type FractionValue = `${string}fr`
type PixelValue = `${string}px`
type PercentageValue = `${string}%`
interface FractionProps {
  size: FractionValue
}
interface OptionalFrProps {
  /** Defaults to 1fr */
  size?: FractionValue
}
interface PixelProps {
  size: PixelValue
  min?: PixelValue | PercentageValue
  max?: PixelValue | PercentageValue
}
interface PercentageProps {
  size: PercentageValue
  min?: PixelValue | PercentageValue
  max?: PixelValue | PercentageValue
}

type OptionalSizeProps = OptionalFrProps | PixelProps | PercentageProps
type SizeProps = FractionProps | PixelProps | PercentageProps

/**********************************************************************************/
/*                                                                                */
/*                                     Globals                                    */
/*                                                                                */
/**********************************************************************************/

const propsMap = new WeakMap<Element, SizeProps>()
const handleSet = new WeakSet<Element>()
/** Symbol returned from `SplitContext.dragHandle()` when there was no resulting overflow after offsetting the pane-sizes. */
const NO_OVERFLOW = Symbol('no-overflow')

/**********************************************************************************/
/*                                                                                */
/*                                      Utils                                     */
/*                                                                                */
/**********************************************************************************/

const isPercentageSize = (value: string): value is PercentageValue => value.endsWith('%')
const isFractionSize = (value: string): value is FractionValue => value.endsWith('fr')
const isPixelSize = (value: string): value is PixelValue => value.endsWith('px')

const isPercentageProps = (props: SizeProps): props is PercentageProps =>
  isPercentageSize(props.size)
const isPixelProps = (props: SizeProps): props is PixelProps => isPixelSize(props.size)
const isFractionProps = (props: SizeProps): props is FractionProps => isFractionSize(props.size)

const getProps = (element: Element) => propsMap.get(element)
const isNotHandle = (element: Element) => !handleSet.has(element)

type Nested<T> = () => Nested<T> | T

function resolveNode<T>(value: Nested<T>): T {
  if (typeof value === 'function') {
    const result = value()
    return resolveNode(result as Nested<T>)
  }
  return value
}

/**********************************************************************************/
/*                                                                                */
/*                                      Logic                                     */
/*                                                                                */
/**********************************************************************************/

function getNeigboringPanes(panes: Element[], handle: Element) {
  const index = panes.indexOf(handle)

  if (index === -1) {
    console.error('Could not find handle in children')
    return
  }

  if (index === 0 || index === panes.length - 1) {
    console.error('Handles at the edge are ignored')
    return
  }

  const left = panes.slice(0, index).findLast(isNotHandle)
  const right = panes.slice(index).find(isNotHandle)

  if (!left || !right) {
    console.error(
      'Could not find neighboring panes of handle',
      handle,
      'left:',
      left,
      'right:',
      right,
    )
    return
  }

  return [left, right] as const
}

/**********************************************************************************/
/*                                                                                */
/*                                      Base                                      */
/*                                                                                */
/**********************************************************************************/

type BaseProps = Omit<ComponentProps<'span'>, 'style'> & {
  style?: JSX.CSSProperties
} & OptionalSizeProps

/**
 * Internal base-component
 */
function Base(props: BaseProps) {
  const context = useSplit()
  const config = mergeProps({ size: `1fr` } satisfies SizeProps, props)
  const [, rest] = splitProps(props, [
    'size',
    // @ts-expect-error TODO: props don't have min-prop when using fraction units
    'min',
    // @ts-expect-error TODO: props don't have max-prop when using fraction units
    'max',
    'style',
    'ref',
  ])
  let ref: HTMLSpanElement

  const pane = (
    <span
      style={{ overflow: 'hidden', ...props.style }}
      {...rest}
      ref={mergeRefs(props, value => (ref = value))}
      data-active-pane={context?.isActivePane(ref!) || undefined}
    >
      {props.children}
    </span>
  )

  propsMap.set(pane as Element, config)
  return pane
}

/**********************************************************************************/
/*                                                                                */
/*                                      Split                                     */
/*                                                                                */
/**********************************************************************************/

type SplitContext = {
  dragHandle: (panes: readonly [Element, Element], deltaX: number) => number | typeof NO_OVERFLOW
  dragHandleStart: (handle: Element) => readonly [Element, Element] | undefined
  dragHandleEnd: () => void
  isActivePane: (element: Element) => void
  type: 'column' | 'row'
}

const splitContext = createContext<SplitContext>()
function useSplit() {
  const context = useContext(splitContext)
  // if (!context) throw `Should be descendant of Grid`
  return context
}

type SplitProps = Omit<ComponentProps<'span'>, 'style'> &
  OptionalSizeProps & {
    type?: 'column' | 'row'
    style?: JSX.CSSProperties
    onTemplate?: (template: string) => void
    onResize?: (size: DOMRect, element: HTMLSpanElement) => void
  }

/**
 * A Split component that creates a resizable container with panes, based on CSS Grid.
 * It allows for dynamic resizing of panes either in a column or row layout.
 *
 * This component generates a CSS Grid template, which means all valid CSS Grid size units are supported,
 * such as `fr` (fraction), `px` (pixels), and `%` (percentage).
 *
 * Split components can be nested to create more complex layouts.
 *
 * @param props - The props for the Split component.
 * @param [props.type='column'] - The direction of the split, either `column` or `row`.
 * @param [props.style] - The CSS style applied to the grid container.
 * @returns The Split component containing panes.
 *
 * @example
 * <Split style={{ height: '100vh' }}>
 *  <Split type="row" style={{ height: '100vh' }}>
 *    <Split.Pane size="1fr">Top Pane</Split.Pane>
 *    <Split.Handle size="10px" />
 *    <Split.Pane size="2fr">Bottom Pane</Split.Pane>
 *  </Split>
 *   <Split.Pane size="1fr">Left Pane</Split.Pane>
 *   <Split.Handle size="10px" />
 *   <Split.Pane size="2fr">Right Pane</Split.Pane>
 * </Split>
 *
 * @warning Fraction-based sizes (`fr`) cannot have `min` or `max` constraints.
 * @warning All elements that are not `Grid`, `Grid.Handle` or `Grid.Pane` are filtered from the children.
 */
export function Split(props: SplitProps) {
  const config = mergeProps({ type: 'column' as const }, props)
  const [, rest] = splitProps(props, ['type', 'style', 'ref'])
  const [domRect, setDomRect] = createSignal<DOMRect>()
  const [activePanels, setActivePanels] = createSignal<readonly [Element, Element] | undefined>(
    undefined,
  )
  /** Holds offsets in px for `PixelValue` and `PercentageValue` and fractions for `FractionValue` */
  const [offsets, setOffsets] = createSignal<WeakMap<Element, number>>(new WeakMap(), {
    equals: false,
  })
  const [splitRef, setSplitRef] = createSignal<HTMLSpanElement>()

  const containerSize = () => (config.type === 'column' ? domRect()?.width : domRect()?.height) || 0

  function offset(element: Element, delta: number) {
    setOffsets(map => {
      map.set(element, (map.get(element) || 0) - delta)
      return map
    })
  }

  function getNonFractionPixels(value: PixelValue | PercentageValue, offset = 0) {
    return isPercentageSize(value)
      ? ((parseFloat(value) - offset) / 100) * containerSize()
      : parseFloat(value) - offset
  }

  function getNonFractionPanePixels(element: Element) {
    const props = getProps(element)
    const offset = getOffset(element)
    if (!props) return 0
    if (isFractionProps(props)) return 0
    return getNonFractionPixels(props.size, offset)
  }

  function getPixelsPerFraction() {
    const sumOfFractionPanePixelSizes = getSumOfFractionPanePixels()
    const totalFrUnits = getFractionPanes().reduce(
      (total, pane) => total + parseFloat(getProps(pane)!.size),
      0,
    )

    if (totalFrUnits === 0) {
      // If there are no fraction units, return 0 to avoid division by zero
      return 0
    } else if (totalFrUnits < 1) {
      // When total fraction units are less than 1, the remaining space should be distributed
      const remainingSpace =
        sumOfFractionPanePixelSizes - sumOfFractionPanePixelSizes * totalFrUnits
      return (
        sumOfFractionPanePixelSizes / (totalFrUnits + remainingSpace / sumOfFractionPanePixelSizes)
      )
    } else {
      // Normal case where totalFrUnits >= 1
      return sumOfFractionPanePixelSizes / totalFrUnits
    }
  }

  function getPixelSizeOfFractionPane(element: Element) {
    const props = getProps(element)
    const offset = getOffset(element)
    if (!props || !isFractionProps(props)) return 0
    return (parseFloat(props.size) - offset) * getPixelsPerFraction()
  }

  function getOffset(element: Element) {
    return offsets().get(element) || 0
  }

  function getSumOfNonFractionPanePixels() {
    return getNonFractionPanes().reduce((total, pane) => total + getNonFractionPanePixels(pane), 0)
  }

  function getSumOfFractionPanePixels() {
    return containerSize() - getSumOfNonFractionPanePixels()
  }

  function offsetFractionAndNonFractionPane(
    fractionPane: Element,
    nonFractionPane: Element,
    deltaPx: number,
  ) {
    // Collect all fraction-panes
    const fractionPanes = getFractionPanes()
    const fractionPaneIndex = fractionPanes.indexOf(fractionPane)

    // Gather pixel size of all fraction-panes (before offset)
    const fractionPanesPixelSizes = fractionPanes.map(getPixelSizeOfFractionPane)

    let nonPaneOffset = isPixelProps(getProps(nonFractionPane)!)
      ? deltaPx
      : (deltaPx / containerSize()) * 100

    // Offset neighboring non-fraction pane
    offset(nonFractionPane, nonPaneOffset)

    // Offset pixel size of neighboring fraction-pane with deltaPx
    const fractionPanePixels = (fractionPanesPixelSizes[fractionPaneIndex] -= deltaPx)

    if (fractionPanePixels < 0) {
      offset(nonFractionPane, -nonPaneOffset)

      // Offset neighboring non-fraction pane
      fractionPanesPixelSizes[fractionPaneIndex] = 0
    }

    const total = fractionPanesPixelSizes.reduce((a, b) => a + b, 0)
    const totalFrUnits = fractionPanes.map(getProps).reduce((a, b) => a + parseFloat(b!.size), 0)

    // calculate the new fractions
    const newFractions = fractionPanesPixelSizes.map(size => (size * totalFrUnits) / total)
    // // calculate the new offsets
    const newOffsets = newFractions.map((newFraction, index) => {
      const oldFraction = parseFloat(getProps(fractionPanes[index]!)!.size)
      return oldFraction - newFraction
    })

    // Set newly calculated offsets
    setOffsets(map => {
      newOffsets.forEach((offset, index) => {
        map.set(fractionPanes[index]!, offset)
      })
      return map
    })
  }

  function getFractionOverflow(element: Element, deltaFr: number): number {
    const props = getProps(element)!
    const offset = getOffset(element)
    if (!isFractionProps(props)) {
      console.error('tried to get fraction overflow of non-fraction pane', element)
      return 0
    }
    const overflow = parseFloat(props.size) - offset + deltaFr
    return overflow < 0 ? overflow : 0
  }

  function getNonFractionOverflow(element: Element, deltaPx: number): number {
    const props = getProps(element)!
    const offset = getOffset(element)

    if (isFractionProps(props)) {
      console.error('tried to get non-fraction overflow of fraction pane', element)
      return 0
    }

    const realSize = getNonFractionPixels(props.size, offset)
    const newSize = realSize + deltaPx

    if (props.max) {
      const realMaxSize = getNonFractionPixels(props.max)
      if (newSize < realMaxSize) {
        return newSize - realMaxSize
      }
    }
    if (props.min) {
      const realMinSize = getNonFractionPixels(props.min)
      if (newSize > realMinSize) {
        return newSize - realMinSize
      }
    }

    return newSize > 0 ? 0 : newSize
  }

  const context: SplitContext = {
    isActivePane: createSelector<ReturnType<typeof activePanels>, Element>(
      activePanels,
      (element, panes) => isNotHandle(element) && !!panes?.includes(element),
    ),
    get type() {
      return config.type
    },
    dragHandleStart(handle) {
      return setActivePanels(getNeigboringPanes(panes(), handle))
    },
    dragHandle([left, right], deltaPx): number | typeof NO_OVERFLOW {
      if (deltaPx === 0) return NO_OVERFLOW

      const leftProps = getProps(left)!
      const rightProps = getProps(right)!

      const isLeftFraction = isFractionProps(leftProps)
      const isRightFraction = isFractionProps(rightProps)

      let deltaFr = deltaPx / getPixelsPerFraction()

      // Calculate the hypothetical overflow after offsetting the pane-sizes
      const leftOverflow = !isLeftFraction
        ? getNonFractionOverflow(left, deltaPx)
        : getFractionOverflow(left, deltaFr) * getPixelsPerFraction()
      const rightOverflow = !isRightFraction
        ? getNonFractionOverflow(right, -deltaPx)
        : getFractionOverflow(right, -deltaFr) * getPixelsPerFraction()

      // Apply negative overflow to deltaPx
      deltaPx = leftOverflow
        ? deltaPx - leftOverflow
        : rightOverflow
        ? deltaPx + rightOverflow
        : deltaPx

      // Update deltaFr to reflect the new deltaPx
      deltaFr = deltaPx / getPixelsPerFraction()

      // Handle case where both panes are fraction panes
      if (isLeftFraction && isRightFraction) {
        offset(left, deltaFr)
        offset(right, -deltaFr)
      }
      // Handle case where both panes are non-fraction panes
      else if (!isLeftFraction && !isRightFraction) {
        offset(left, isPixelProps(leftProps) ? deltaPx : (deltaPx / containerSize()) * 100)
        offset(right, isPixelProps(rightProps) ? -deltaPx : (-deltaPx / containerSize()) * 100)
      }
      // Handle case where left is a fraction pane and right is a non-fraction pane
      else if (isLeftFraction) {
        offsetFractionAndNonFractionPane(left, right, -deltaPx)
      }
      // Handle case where right is a fraction pane and left is a non-fraction pane
      else {
        offsetFractionAndNonFractionPane(right, left, deltaPx)
      }

      if (!leftOverflow && !rightOverflow) {
        return NO_OVERFLOW
      }
      if (Math.abs(leftOverflow) > Math.abs(rightOverflow)) {
        return leftOverflow
      }
      return -rightOverflow
    },
    dragHandleEnd() {
      setActivePanels(undefined)
    },
  }

  const offspring = children(withContext(() => props.children, splitContext, context))

  const panes = createMemo(
    () => offspring.toArray().filter(value => propsMap.has(value as Element)) as Element[],
  )
  const getFractionPanes = () => panes().filter(pane => isFractionProps(getProps(pane)!))
  const getNonFractionPanes = () => panes().filter(pane => !isFractionProps(getProps(pane)!))

  const template = () =>
    panes()
      .map(pane => {
        const props = getProps(pane)!
        const offset = getOffset(pane)

        if (isFractionProps(props)) {
          return offset ? `${parseFloat(props.size) - offset}fr` : props.size
        }

        const unit = offset
          ? (`calc(${parseFloat(props.size) - offset}${isPixelProps(props) ? 'px' : '%'})` as const)
          : props.size

        return props.min
          ? props.max
            ? `min(${props.min}, max(${props.max}, ${unit}))`
            : `min(${props.min}, ${unit})`
          : props.max
          ? `max(${props.max}, ${unit})`
          : unit
      })
      .join(' ')

  createEffect(() => {
    const ref = splitRef()
    if (!ref) return
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDomRect(entry.contentRect)
        props.onResize?.(entry.contentRect, ref)
      }
    })
    observer.observe(ref)
    onCleanup(() => observer.disconnect())
  })

  createSignal(
    mapArray(panes, pane => {
      createEffect(
        on(
          () => getProps(pane)?.size,
          () => {
            setOffsets(map => {
              map.set(pane, 0)
              return map
            })
          },
        ),
      )
    }),
  )

  createEffect(() => props.onTemplate?.(template()))

  return (
    <Base
      ref={mergeRefs(setSplitRef, props)}
      style={{
        display: 'grid',
        ...props.style,
        [`grid-template-${config.type}s`]: template(),
      }}
      {...rest}
    >
      {panes()}
    </Base>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                       Pane                                     */
/*                                                                                */
/**********************************************************************************/

function Pane(props: BaseProps) {
  const context = useSplit()
  if (!context) throw `Split.Pane should be used within a Split-component`
  return <Base {...props} />
}

/**********************************************************************************/
/*                                                                                */
/*                                      Handle                                    */
/*                                                                                */
/**********************************************************************************/

/**
 * A Handle component that allows the user to resize the neighboring panes within a Split container.
 *
 * The Handle adjusts the sizes of the adjacent panes based on user interaction.
 *
 * @param props - The props for the Handle component.
 * @returns The Handle component.
 *
 * @example
 * <Split.Handle size="10px" />
 *
 * @warning If placed on the edge of a Split layout, the Handle will be ignored.
 * @warning If two handles are placed next to each other, they both control the same neighboring panes.
 * @warning Fraction-based sizes (`fr`) cannot have `min` or `max` constraints.
 */
function Handle(props: BaseProps) {
  const context = useSplit()
  if (!context) throw `Split.Handle should be used within a Split-component`
  const handle = (
    <Base
      {...props}
      onPointerDown={
        context
          ? e => {
              let totalOverflow = {
                x: 0,
                y: 0,
              }
              const neighbors = context.dragHandleStart(resolveNode(handle))
              if (!neighbors) return
              cursor(e, ({ delta }) => {
                const overflow = context.dragHandle(
                  neighbors,
                  context.type === 'column' ? delta.x + totalOverflow.x : delta.y + totalOverflow.y,
                )
                if (overflow === NO_OVERFLOW) {
                  // reset overflow
                  totalOverflow = {
                    x: 0,
                    y: 0,
                  }
                } else {
                  totalOverflow.x += context.type === 'column' ? delta.x : overflow
                  totalOverflow.y += context.type !== 'column' ? delta.y : overflow
                }
              }).then(context.dragHandleEnd)
            }
          : undefined
      }
    />
  ) as unknown as Nested<Element>
  handleSet.add(resolveNode(handle))
  return handle as unknown as Element
}

Split.Handle = Handle
Split.Pane = Pane
