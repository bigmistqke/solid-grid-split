import { Split } from 'src'
import styles from './App.module.css'

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
      <Split style={{ height: '100vh' }} direction="column">
        <Split.Pane class={styles.pane} size="50%">
          percentage
        </Split.Pane>
        <Split.Handle size="10px" style={{ background: 'red' }} />
        <Split.Pane class={styles.pane} size="1fr">
          fraction
        </Split.Pane>
      </Split>
    </Split>
  )
}

export default App
