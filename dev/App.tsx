import { Split } from 'src'
import './App.module.css'

function App() {
  return (
    <Split style={{ height: '100vh' }}>
      <Split.Pane size="100px">hallo</Split.Pane>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane size="0.25fr">hallo</Split.Pane>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane size="0.25fr" style={{ background: 'blue' }}>
        hallo
      </Split.Pane>
    </Split>
  )
}

export default App
