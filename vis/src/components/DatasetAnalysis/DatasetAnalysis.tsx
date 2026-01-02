import { ResponsiveBar } from "@nivo/bar";
import { data } from "../../data";

function DatasetAnalysis() {
  return (
    <div>
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
    </div>
  );
}

export default DatasetAnalysis;
