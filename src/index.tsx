import {
  children,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
  useContext,
  type ComponentProps,
  type JSX,
} from 'solid-js'
import { cursor } from './cursor'
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

const panePropsMap = new WeakMap<Element, SizeProps>()
const handleSet = new WeakSet<Element>()

/**********************************************************************************/
/*                                                                                */
/*                                      Utils                                     */
/*                                                                                */
/**********************************************************************************/

const isPercentageSize = (value: string): value is PercentageValue => value.endsWith('%')
const isFractionSize = (value: string): value is FractionValue => value.endsWith('fr')
const isPixelSize = (value: string): value is PixelValue => value.endsWith('fr')

const isPercentageProps = (props: SizeProps): props is PercentageProps =>
  isPercentageSize(props.size)
const isPixelProps = (props: SizeProps): props is PixelProps => isPixelSize(props.size)
const isFractionProps = (props: SizeProps): props is FractionProps => isFractionSize(props.size)

const getProp = (element: Element) => panePropsMap.get(element)
const isNotHandle = (element: Element) => !handleSet.has(element)

const resolveNonFractionValue = (containerSizePx: number, value: PixelValue | PercentageValue) =>
  isPercentageSize(value) ? (containerSizePx / 100) * parseFloat(value) : parseFloat(value)

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

function getNonFractionOverflow(
  containerSizePx: number,
  props: PixelProps | PercentageProps,
  offsetPx: number,
  deltaPx: number,
): number {
  const realSize = resolveNonFractionValue(containerSizePx, props.size) - offsetPx
  const newSize = realSize + deltaPx

  if (props.max) {
    const realMaxSize = resolveNonFractionValue(containerSizePx, props.max)
    if (newSize < realMaxSize) {
      return newSize - realMaxSize
    }
  }
  if (props.min) {
    const realMinSize = resolveNonFractionValue(containerSizePx, props.min)
    if (newSize > realMinSize) {
      return realMinSize - newSize
    }
  }
  return newSize > 0 ? 0 : newSize
}

function getFractionOverflow(props: SizeProps, offset: number, deltaFr: number): number {
  return parseFloat(props.size) - offset + deltaFr
}

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
/*                                      Split                                     */
/*                                                                                */
/**********************************************************************************/

const SplitContext = createContext<{
  updateOffset: (handle: Element, offset: number) => number | true
  type: 'column' | 'row'
}>()
function useSplit() {
  const context = useContext(SplitContext)
  if (!context) throw `Should be descendant of Grid`
  return context
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
export function Split(
  props: Omit<ComponentProps<'div'>, 'style'> & {
    type?: 'column' | 'row'
    style?: JSX.CSSProperties
  } & OptionalSizeProps,
) {
  const config = mergeProps({ type: 'column' as const }, props)
  const [, rest] = splitProps(props, ['type', 'style'])
  const [domRect, setDomRect] = createSignal<DOMRect>()
  /** Holds offsets in px for `PixelValue` and `PercentageValue` and fractions for `FractionValue` */
  const [offsets, setOffsets] = createSignal<WeakMap<Element, number>>(new WeakMap(), {
    equals: false,
  })
  let gridRef: HTMLSpanElement

  const containerSize = () => (config.type === 'column' ? domRect()?.width : domRect()?.height) || 0

  createEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDomRect(entry.contentRect)
      }
    })
    if (gridRef) observer.observe(gridRef)
    onCleanup(() => observer.disconnect())
  })

  function offset(element: Element, delta: number) {
    setOffsets(map => {
      map.set(element, (map.get(element) || 0) - delta)
      return map
    })
  }

  function getOffset(element: Element) {
    return offsets().get(element) || 0
  }

  function pixelsPerFraction() {
    const totalSpace =
      containerSize() -
      nonFractionPanes().reduce(
        (total, pane) => total + (config.type === 'column' ? pane.clientWidth : pane.clientHeight),
        0,
      )

    const totalFrUnits = fractionPanes().reduce(
      (total, pane) => total + parseFloat(panePropsMap.get(pane)!.size),
      0,
    )

    return totalSpace / totalFrUnits
  }

  const offspring = children(
    withContext(() => props.children, SplitContext, {
      get type() {
        return config.type
      },
      updateOffset(handle, deltaPx) {
        const neighbors = getNeigboringPanes(panes(), handle)
        if (!neighbors) return true

        const [left, right] = neighbors

        const leftProps = getProp(left)!
        const rightProps = getProp(right)!

        const leftOffset = getOffset(left)!
        const rightOffset = getOffset(right)!

        const isLeftFraction = isFractionProps(leftProps)
        const isRightFraction = isFractionProps(rightProps)

        const leftOverflow = !isLeftFraction
          ? getNonFractionOverflow(containerSize(), leftProps, leftOffset, deltaPx)
          : 0
        const rightOverflow = !isRightFraction
          ? getNonFractionOverflow(containerSize(), rightProps, rightOffset, -deltaPx)
          : 0

        deltaPx = leftOverflow
          ? deltaPx - leftOverflow
          : rightOverflow
          ? deltaPx + rightOverflow
          : deltaPx

        if (!isLeftFraction && !isRightFraction) {
          offset(left, deltaPx)
          offset(right, -deltaPx)

          if (leftOverflow || rightOverflow) {
            return leftOverflow || rightOverflow
          }

          return true
        }

        let deltaFr = deltaPx / pixelsPerFraction()

        if (isLeftFraction && isRightFraction) {
          const leftOverflow = getFractionOverflow(leftProps, leftOffset, deltaFr)
          const rightOverflow = getFractionOverflow(rightProps, rightOffset, -deltaFr)
          if (leftOverflow < 0) {
            deltaFr -= leftOverflow
          } else if (rightOverflow < 0) {
            deltaFr += rightOverflow
          }

          offset(left, deltaFr)
          offset(right, -deltaFr)

          if (leftOverflow < 0) {
            return leftOverflow * pixelsPerFraction()
          } else if (rightOverflow < 0) {
            return -rightOverflow * pixelsPerFraction()
          }

          return true
        }

        if (isRightFraction) {
          offset(left, deltaPx)
        } else {
          offset(right, -deltaPx)
        }

        return true
      },
    }),
  )

  const panes = createMemo(
    () => offspring.toArray().filter(value => panePropsMap.has(value as Element)) as Element[],
  )
  const fractionPanes = () => panes().filter(pane => isFractionProps(panePropsMap.get(pane)!))
  const nonFractionPanes = () => panes().filter(pane => !isFractionProps(panePropsMap.get(pane)!))
  const template = () =>
    panes()
      .map(value => {
        const props = panePropsMap.get(value)!
        const offset = offsets().get(value) || 0

        if (isFractionProps(props)) {
          return offset ? `${parseFloat(props.size) - offset}fr` : props.size
        }

        const unit = offset ? (`calc(${props.size} + ${-offset}px)` as const) : props.size

        return props.min
          ? props.max
            ? `min(${props.min}, max(${props.max}, ${unit}))`
            : `min(${props.min}, ${unit})`
          : props.max
          ? `max(${props.max}, ${unit})`
          : unit
      })
      .join(' ')

  return (
    <Pane
      ref={gridRef!}
      style={{
        display: 'grid',
        ...props.style,
        [`grid-template-${config.type}s`]: template(),
      }}
      {...rest}
    >
      {panes()}
    </Pane>
  )
}

/**********************************************************************************/
/*                                                                                */
/*                                      Pane                                      */
/*                                                                                */
/**********************************************************************************/

type PaneProps = Omit<ComponentProps<'span'>, 'style'> & {
  style?: JSX.CSSProperties
} & OptionalSizeProps

/**
 * A Pane component representing an individual resizable pane inside the Split container.
 * The pane size can be configured using any CSS Grid size units (`fr`, `px`, `%`).
 *
 * @param props - The props for the Pane component.
 * @returns The Pane component.
 *
 * @example
 * <Split.Pane size="1fr">Content</Split.Pane>
 *
 * @warning Fraction-based sizes (`fr`) cannot have `min` or `max` constraints.
 */
function Pane(props: PaneProps) {
  const config = mergeProps({ size: `1fr` } satisfies SizeProps, props)
  const [, rest] = splitProps(props, ['size', 'min', 'max', 'style'])
  const ref = (
    <span style={{ overflow: 'hidden', ...props.style }} {...rest}>
      {props.children}
    </span>
  )
  panePropsMap.set(ref as Element, config)
  return ref
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
 * @warning Fraction-based sizes (`fr`) cannot have `min` or `max` constraints.
 */
function Handle(props: PaneProps) {
  const context = useSplit()
  const handle = (
    <Pane
      {...props}
      onPointerDown={e => {
        let overflow = {
          x: 0,
          y: 0,
        }
        cursor(e, (_, movement) => {
          const result = context.updateOffset(
            resolveNode(handle),
            context.type === 'column' ? movement.x + overflow.x : movement.y + overflow.y,
          )
          console.log(result)
          if (result === true) {
            // reset overflow
            overflow = {
              x: 0,
              y: 0,
            }
          } else {
            overflow.x += context.type === 'column' ? movement.x : result
            overflow.y += context.type !== 'column' ? movement.y : result
          }
        })
      }}
    />
  ) as unknown as Nested<Element>
  handleSet.add(resolveNode(handle))
  return handle as unknown as Element
}

Split.Handle = Handle
Split.Pane = Pane
