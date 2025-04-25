type Vector = { x: number; y: number }
type CursorEvent = { delta: Vector; total: Vector; event: MouseEvent; timespan: number }

function vectorFromEvent(event){
  const isTouch = "touches" in event
  //event = (isTouch ? event.touches[0] : event)
  return {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  }
}

/**
 * cursor
 *
 * @param event MouseEvent
 * @param callback called every onMouseMove
 * @returns Promise resolved onMouseUp
 */
export const cursor = (event: PointerEvent | TouchEvent, callback: (config: CursorEvent) => void) => {


  const isTouch = "touches" in event
  const start = vectorFromEvent(event)
  const controller = new AbortController()

  return new Promise<CursorEvent>(resolve => {
    let previous = start
    const startTime = performance.now()

    function onUpdate(event: MouseEvent) {
      const current = vectorFromEvent(event)
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

    function onEnd (event: MouseEvent) {
      controller.abort()
      resolve(onUpdate(event))
    }

    if(isTouch){

    window.addEventListener('touchmove', onUpdate, { signal: controller.signal })
    window.addEventListener('touchend', onEnd, { signal: controller.signal })

    } else {

    window.addEventListener('pointermove', onUpdate, { signal: controller.signal })
    window.addEventListener('pointerup', onEnd, { signal: controller.signal })

    }
  })
}
