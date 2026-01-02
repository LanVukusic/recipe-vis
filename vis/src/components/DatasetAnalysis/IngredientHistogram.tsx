import { ResponsiveBar } from "@nivo/bar";
import type { data } from "../../data";

interface IngredientHistogramProps {
  data?: typeof data;
}

function IngredientHistogram({ data }: IngredientHistogramProps) {
  return (
    <div className="w-full mt-8 p-6">
      <div className="w-fit ml-auto">
        <span className="ml-auto text-gray-300 text-thin text-sm ">
          Ingredient count historgram over recipes
        </span>
      </div>
      <div className=" -mt-4  h-60 w-full">
        {data && (
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
        )}
      </div>
    </div>
  );
}

export default IngredientHistogram;
