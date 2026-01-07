import { memo } from "react";

interface graphAnalysisData {
  title: string;
  value: number;
}

interface GraphStatsCardsProps {
  stats: graphAnalysisData[];
}

const GraphStatsCardsComponent = ({ stats }: GraphStatsCardsProps) => {
  return (
    <div className="grid grid-cols-5 mt-8 p-4 w-full gap-4">
      {stats.map((data, i) => (
        <div className="flex flex-col p-4 text-mono bg-zinc-800" key={i}>
          <span className="font-bold text-zinc-500 text-sm">
            {data.title.toUpperCase()}
          </span>
          <span className="text-yellow-400 text-xl">
            {data.value.toPrecision(4)}
          </span>
        </div>
      ))}
    </div>
  );
};

const GraphStatsCards = memo(GraphStatsCardsComponent);

export default GraphStatsCards;
