// src/App.tsx
import "../node_modules/normalize.css/normalize.css"
import JsonVisualizer from './visualizer/JsonVisualizer';

const App: React.FC = () => {
  return (
    <div className="App max-h-screen flex flex-col p-4 overflow-y-hidden">
      <div className="flex flex-row items-center justify-center">
        <img src="/logo.svg" alt="logo" className="w-12 h-12 mr-2" />
      <h1>JSON Visualizer</h1>
      </div>
      <JsonVisualizer />
    </div>
  )
}

export default App