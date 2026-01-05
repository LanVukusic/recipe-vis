import { useState, useEffect } from "react";
import DatasetAnalysis from "./components/DatasetAnalysis/DatasetAnalysis";
import { GraphAnalysis } from "./components/GraphAnalysis/GraphAnalysis";
import Header from "./components/Header/Header";

export type FreqMap = Map<string, number>;

function App() {
  const [frequencyMap, setFrequencyMap] = useState<FreqMap>();
  useEffect(() => {
    fetch("/frequencies.json").then(async (data) => {
      const d = await data.json();
      const map = new Map<string, number>(Object.entries(d));
      setFrequencyMap(map);
    });
  }, []);

  return (
    <div className="w-full border-t-3 border-yellow-300 ">
      <Header />
      <DatasetAnalysis />
      {frequencyMap && <GraphAnalysis freqMap={frequencyMap} />}
    </div>
  );
}

export default App;
