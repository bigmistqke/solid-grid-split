type Vector = { x: number; y: number }
type CursorEvent = { delta: Vector; total: Vector; event: MouseEvent; timespan: number }
/**
 * cursor
 *
 * @param event MouseEvent
 * @param callback called every onMouseMove
 * @returns Promise resolved onMouseUp
 */
export const cursor = (event: MouseEvent, callback: (config: CursorEvent) => void) => {
  return new Promise<CursorEvent>(resolve => {
    const start = {
      x: event.clientX,
      y: event.clientY,
    }
    let previous = start
    const startTime = performance.now()

    function onUpdate(event: MouseEvent) {
      const current = {
        x: event.clientX,
        y: event.clientY,
      }
      const delta = {
        x: current.x - previous.x,
        y: current.y - previous.y,
      }
      const total = {
        x: start.x - current.x,
        y: start.y - current.y,
      }
      previous = current
      const result = {
        total,
        delta,
        event,
        timespan: performance.now() - startTime,
      }
      callback(result)
      return result
    }

    const onMouseUp = (event: MouseEvent) => {
      window.removeEventListener('mousemove', onUpdate)
      window.removeEventListener('mouseup', onMouseUp)
      resolve(onUpdate(event))
    }

    window.addEventListener('mousemove', onUpdate)
    window.addEventListener('mouseup', onMouseUp)
  })
}
