import { ResponsiveBar } from "@nivo/bar";
import { GraphCanvas, lightTheme } from "reagraph";
import { data } from "./data";
interface graphAnalysisData {
  title: string;
  value: number;
}

const graphAnalysisStats: graphAnalysisData[] = [
  {
    title: "Node count",
    value: 50000,
  },
  {
    title: "Edge count",
    value: 50000,
  },
  {
    title: "Betweenest",
    value: 153.4,
  },
  {
    title: "Average node degree",
    value: 153.4,
  },
  {
    title: "Hubbing",
    value: 15.4,
  },
  {
    title: "Average node degree",
    value: 153.4,
  },
  {
    title: "Hubbing",
    value: 15.4,
  },
];

function App() {
  return (
    <div className="w-full border-t-3 border-yellow-300 ">
      <div className="flex gap-6 items-baseline">
        <h1 className="text-4xl  bg-yellow-300 w-fit p-1 font-bold inline-flex items-center">
          {/* <svg
            xmlns="http://www.w3.org/2000/svg"
            width="70"
            height="70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-cherry"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M7.5 16.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0" />
            <path d="M17 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
            <path d="M9 13c.366 -2 1.866 -3.873 4.5 -5.6" />
            <path d="M17 15c-1.333 -2.333 -2.333 -5.333 -1 -9" />
            <path d="M5 6c3.667 -2.667 7.333 -2.667 11 0c-3.667 2.667 -7.333 2.667 -11 0" />
          </svg> */}
          <span>IOI 2025</span>
        </h1>
        <h2 className="text-xl  text-yellow-300 ">
          recipe visualization project
        </h2>
      </div>

      <div className="p-4 pt-16 border-b-2 border-yellow-400 w-fit ">
        <h1 className="text-yellow-400 text-5xl">Recipe data analysis</h1>
        <h4 className="text-gray-300 pt-2">Statistics and description</h4>
      </div>
      <div className="w-full mt-8 p-6">
        <div className="w-fit ml-auto">
          <span className="ml-auto text-gray-300 text-thin text-sm ">
            Ingredient count historgram over recipes
          </span>
        </div>
        <div className=" -mt-4  h-60 w-full">
          <ResponsiveBar /* or Bar for fixed dimensions */
            data={data}
            keys={["donut"]}
            enableGridY={false}
            colors={"var(--color-zinc-700)"}
            indexBy="country"
            padding={0.2}
            axisTop={null}
            axisRight={null}
          />
        </div>
      </div>
      <div className="max-w-prose px-4 text-zinc-400  tracking-tight">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia quos
        blanditiis quisquam illum, esse suscipit obcaecati nemo praesentium
        laborum. In cumque culpa quisquam vel reiciendis aspernatur animi
        labore, corrupti optio. Est fugit, assumenda at a beatae eveniet
      </div>

      <div className="p-4 pt-16 border-b-2 border-yellow-400 w-fit ">
        <h1 className="text-yellow-400 text-5xl">Recipes as a graph</h1>
        <h4 className="text-gray-300 pt-2">
          Graphy analysis and canonical graph data
        </h4>
      </div>

      <div className="p-4 max-w-prose text-sm text-gray-200 font-light opacity-50">
        Graph analysis scripts are taken and adapted from course materials of{" "}
        <a className="text-yellow-300 underline cursor-pointer">
          Introduction to network analysis by Lovro Šubelj{" "}
        </a>
        available at his github.
      </div>

      <div className="grid grid-cols-5 mt-8 p-4 w-full gap-4">
        {graphAnalysisStats.map((data, i) => (
          <div className="flex flex-col p-4 text-mono bg-zinc-800" key={i}>
            <span className="font-bold  text-zinc-500 text-sm">
              {data.title.toUpperCase()}
            </span>
            <span className="text-yellow-400 text-xl">{data.value}</span>
          </div>
        ))}
      </div>

      <div className="p-4 mt-8  bg-yellow-400 w-fit font-bold">
        Choose a recipe to explore
      </div>
      <div className="max-w-prose px-4 text-zinc-400  tracking-tight pt-8">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Mollitia quos
        blanditiis quisquam illum, esse suscipit obcaecati nemo praesentium
      </div>
      <div className="grid grid-cols-3 gap-8  p-4 text-gray-300  border-dashed  mt-8">
        <div className="flex flex-col gap-2">
          <span className="">Pick your recipes</span>
          <input
            type="text"
            placeholder="start typing..."
            className="border-b border-yellow-300  focus:outline-none text-zinc-400 "
          />
        </div>

        <div className="bg-zinc-800 p-4">asd</div>

        <div className="flex flex-col gap-2">
          <div className="">
            <span className="text-sm">Num iterations</span>
            <div className="flex bg-zinc-700  h-10 gap-1 cursor-pointer">
              <div className="bg-yellow-400 flex-1 flex justify-end items-center font-bold text-zinc-600 p-2">
                12
              </div>
              <div className="bg-zinc-600 flex-1"></div>
            </div>
          </div>

          <div className="">
            <span className="text-sm">Restart chance</span>
            <div className="flex bg-zinc-700 h-10 gap-1 cursor-pointer">
              <div className="bg-yellow-400 flex-1 flex justify-end items-center font-bold text-zinc-600 p-2">
                0.3
              </div>
              <div className="bg-zinc-600 flex-4"></div>
            </div>
          </div>

          <div className="">
            <span className="text-sm">Edge count</span>
            <div className="flex bg-zinc-700  h-10 gap-1 cursor-pointer">
              <div className="bg-yellow-400 flex-1 flex justify-end items-center font-bold text-zinc-600 p-2">
                2
              </div>
              <div className="bg-zinc-600 flex-2"></div>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <button className="flex-1 mt-8 px-6 py-2 bg-zinc-700 text-yellow-400  font-bold cursor-pointer">
              Analyze neighbours
            </button>
            <button className="mt-8 px-6 py-2 bg-zinc-700 text-yellow-400  font-bold cursor-pointer">
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className=""></div>

      <div className="grid grid-cols-4 pr-4 pt-8">
        <div className="w-full h-100 col-span-3 relative">
          <div className="">
            <GraphCanvas
              disabled
              theme={{
                ...lightTheme,
                canvas: {
                  background: "#18181b",
                },
                node: {
                  ...lightTheme.node,
                  fill: "#fcc800",
                },
              }}
              nodes={[
                { id: "1", label: "Node 1" },
                { id: "2", label: "Node 2" },
              ]}
              edges={[
                { id: "1-2", source: "1", target: "2", label: "Edge 1-2" },
                { id: "2-1", source: "2", target: "1", label: "Edge 2-1" },
              ]}
            />
          </div>
        </div>
        <div className="border-l-2 border-yellow-400 p-4 text-yellow-400 bg-zinc-800 flex flex-col gap-2">
          {/* when no nodes are selected */}
          {/* <div className="w-full h-full flex justify-center items-center text-zinc-500">
            Select node to view
          </div> */}

          {/* when node is selected */}
          <h4>Fried chicken nuggets with sauce</h4>
          <a
            href=""
            className="px-2 py-0.5 bg-yellow-300 text-zinc-900 w-fit text-sm"
          >
            Link
          </a>

          <div className="h-0.5 bg-zinc-700 my-4"></div>
        </div>
        {/* <div className="col-span-1 h-160 relative">
          <ResponsiveChord
            data={dataChord}
            colors={{ scheme: "yellow_orange_red" }}
            keys={["John", "Raoul", "Jane", "Marcel", "Ibrahim"]}
            margin={{ top: 60, right: 60, bottom: 90, left: 60 }}
            padAngle={0.06}
            legends={[
              {
                anchor: "bottom",
                direction: "row",
                translateY: 70,
                itemWidth: 80,
                itemHeight: 16,
                symbolShape: "circle",
              },
            ]}
          />
        </div> */}
      </div>

      <div className="py-8">a</div>

      <div className="p-4 py-1 bg-yellow-300  text-zinc-700 flex justify-between text-xs mt-16">
        <span>2025 - IOI final projec report</span>

        <div className="inline-flex gap-2">
          {/* <span>Lan Vukušič</span> */}
        </div>
      </div>
    </div>
  );
}

export default App;
