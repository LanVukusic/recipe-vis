interface graphAnalysisData {
  title: string;
  value: number;
}

interface GraphStatsCardsProps {
  stats: graphAnalysisData[];
}

function GraphStatsCards({ stats }: GraphStatsCardsProps) {
  return (
    <div className="grid grid-cols-5 mt-8 p-4 w-full gap-4">
      {stats.map((data, i) => (
        <div className="flex flex-col p-4 text-mono bg-zinc-800" key={i}>
          <span className="font-bold  text-zinc-500 text-sm">
            {data.title.toUpperCase()}
          </span>
          <span className="text-yellow-400 text-xl">{data.value}</span>
        </div>
      ))}
    </div>
  );
}

export default GraphStatsCards;
