import { useState, useMemo } from "react";
import type { Recipe } from "./GraphAnalysis";

interface RecipeSelectorProps {
  recipes: Recipe[];
  onRecipeSelect: (selectedRecipe: Recipe) => void;
}

export const RecipeSelector: React.FC<RecipeSelectorProps> = ({
  recipes = [],
  onRecipeSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filter recipes based on search term
  const filteredRecipes = useMemo(() => {
    if (!searchTerm) return recipes;
    return recipes.filter((recipe) =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, recipes]);

  const handleRecipeClick = (recipe: Recipe) => {
    onRecipeSelect(recipe); // Return the selected recipe
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="">Pick your recipes</span>
      <input
        type="text"
        placeholder="start typing..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border-b border-yellow-300 focus:outline-none text-zinc-400"
      />

      {/* Render recipes that match the input text and make them clickable for multiselect */}
      <div className="max-h-60 overflow-y-auto">
        {filteredRecipes.slice(0, 50).map((recipe) => (
          <div
            key={recipe.index}
            onClick={() => handleRecipeClick(recipe)}
            className="p-2 cursor-pointer hover:bg-zinc-700   border-gray-200"
          >
            {recipe.title}
          </div>
        ))}
      </div>
    </div>
  );
};
