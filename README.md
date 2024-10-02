<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=solid-grid-split&background=tiles&project=%20" alt="solid-grid-split">
</p>

# solid-grid-split

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

Solid split-pane-component based on CSS grid templates: the `<Grid/>`-component returns a span with a CSS grid template, the values defined by its children's props. All valid CSS grid size units are supported, such as `fr` (fraction), `px` (pixels), and `%` (percentage) and CSS grid-rules apply (you can not combine fraction units with `min()` or `max()`).

> You should probably use [@corvu/resizable](https://corvu.dev/docs/primitives/resizable/) instead.

## Quick start

Install it:

```bash
npm i @bigmistqke/solid-grid-split
# or
yarn add @bigmistqke/solid-grid-split
# or
pnpm add @bigmistqke/solid-grid-split
```

Use it:

```tsx
import { Split } from '@bigmistqke/solid-grid-split'

function App() {
  return (
    <Split>
      <Split.Pane size="1fr">Left</Split.Pane>
      <Split.Handle size="10px" />
      <Split size="100px" max="10%" type="row">
        <Split.Pane size="1fr" max="100px">
          Top
        </Split.Pane>
        <Split.Handle size="10px" />
        <Split.Pane size="50%">Bottom</Split.Pane>
      </Split>
      <Split.Handle size="10px" />
      <Split.Pane size="1fr">Right</Split.Pane>
    </Split>
  )
}
```
