type Vector = { x: number; y: number }

/**
 * cursor
 *
 * @param e MouseEvent
 * @param callback called every onMouseMove
 * @returns Promise resolved onMouseUp
 */
export const cursor = (
  e: MouseEvent,
  callback: (delta: Vector, movement: Vector, event: MouseEvent, timespan: number) => void,
) => {
  return new Promise<{ delta: Vector; event: MouseEvent; timespan: number }>(resolve => {
    const start = {
      x: e.clientX,
      y: e.clientY,
    }
    const startTime = performance.now()

    const onMouseMove = (e: MouseEvent) => {
      callback(
        {
          x: start.x - e.clientX,
          y: start.y - e.clientY,
        },
        { x: e.movementX, y: e.movementY },
        e,
        performance.now() - startTime,
      )
    }
    const onMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      const delta = {
        x: start.x - e.clientX,
        y: start.y - e.clientY,
      }
      callback(delta, { x: e.movementX, y: e.movementY }, e, performance.now() - startTime)
      resolve({ delta, event: e, timespan: performance.now() - startTime })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  })
}
