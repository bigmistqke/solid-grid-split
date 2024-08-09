import { Split } from 'src'

function App() {
  return (
    <Split style={{ height: '100vh' }}>
      <Split max="10%" size="100px" type="row" style={{ height: '100vh' }}>
        <Split.Pane size="50px">first</Split.Pane>
        <Split.Handle size="10px" style={{ background: 'red' }} />
        <Split.Handle size="10px" style={{ background: 'blue' }} />
        <Split.Pane size="50px">hallo</Split.Pane>
        <Split.Handle size="10px" style={{ background: 'red' }} />
        <Split.Pane size="50px">hallo</Split.Pane>
        <Split.Handle size="10px" style={{ background: 'red' }} />
        <Split.Pane size="1fr">hallo</Split.Pane>
      </Split>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane max="50px" size="50%">
        hallo
      </Split.Pane>
      <Split.Handle size="10px" style={{ background: 'red' }} />
      <Split.Pane size="1fr">hallo</Split.Pane>
    </Split>
  )
}

export default App
