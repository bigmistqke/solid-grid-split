import { createEffect, createSignal } from 'solid-js'
import { Split } from 'src'
import styles from './App.module.css'

function SidePane() {
  const [fixed, setFixed] = createSignal(false)
  createEffect(() => console.log('fixed', fixed()))
  return (
    <Split
      class={styles.pane}
      onResize={domRect => setFixed(domRect.width <= 100)}
      size={fixed() ? '100px' : '1fr'}
      max={fixed() ? '100px' : undefined}
    >
      <Split.Pane class={styles.pane} size="1fr">
        fraction
      </Split.Pane>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane class={styles.pane} size="1fr">
        fraction
      </Split.Pane>
    </Split>
  )
}

function App() {
  return (
    <Split style={{ height: '100vh' }}>
      <Split.Pane class={styles.pane} size="50%">
        percentage
      </Split.Pane>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane class={styles.pane} size="1fr">
        fraction
      </Split.Pane>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane class={styles.pane} size="1fr">
        fraction
      </Split.Pane>
    </Split>
  )
}

export default App
