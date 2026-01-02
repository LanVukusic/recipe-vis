import DatasetAnalysis from "./components/DatasetAnalysis/DatasetAnalysis";
import { GraphAnalysis } from "./components/GraphAnalysis/GraphAnalysis";
import Header from "./components/Header/Header";

function App() {
  return (
    <div className="w-full border-t-3 border-yellow-300 ">
      <Header />
      <DatasetAnalysis />
      <GraphAnalysis />
    </div>
  );
}

export default App;
