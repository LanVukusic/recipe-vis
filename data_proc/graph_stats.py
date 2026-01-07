import pandas as pd
import networkx as nx
import json
from collections import defaultdict, Counter
import numpy as np
from typing import Dict, List, Tuple
import time


def load_recipes(file_path: str) -> pd.DataFrame:
    """Load recipes from CSV file"""
    return pd.read_csv(
        file_path,
        nrows=1000,
    )


def parse_ingredients(ner_simple_str: str) -> List[str]:
    """Parse the NER_Simple string into a list of ingredients"""
    if pd.isna(ner_simple_str) or ner_simple_str == "" or ner_simple_str == "[]":
        return []

    try:
        # Remove brackets and quotes, then split by comma
        ingredients_str = ner_simple_str.strip()[1:-1]  # Remove [ and ]
        ingredients = [ing.strip().strip("'\"") for ing in ingredients_str.split(",")]
        return [ing for ing in ingredients if ing]  # Filter out empty strings
    except Exception as e:
        print(f"Error parsing ingredients: {e}")
        return []


def create_symmetric_edge_id(id1: str, id2: str) -> str:
    """Helper function to create symmetric edge ID to avoid duplicates"""
    # Convert to integers for consistent ordering
    id1_int = int(id1)
    id2_int = int(id2)

    # Use prime multiplication to create unique but symmetric hash
    min_id = min(id1_int, id2_int)
    max_id = max(id1_int, id2_int)

    # Large primes to minimize collisions
    prime1 = 73856093
    prime2 = 19349663

    return f"{min_id * prime1}-{max_id * prime2}"


def build_recipe_graph_final(recipes_df: pd.DataFrame) -> nx.Graph:
    """Build a graph efficiently using symmetric edge IDs to prevent duplicates"""
    print("Building final graph efficiently...")
    start_time = time.time()

    G = nx.Graph()

    # Create a mapping from ingredients to recipes for efficient lookup
    ingredient_to_recipes = defaultdict(list)

    # Build ingredient to recipe mapping
    print("Mapping ingredients to recipes...")
    for idx, recipe in recipes_df.iterrows():
        if idx % 5000 == 0:
            print(f"Processed {idx} recipes...")

        ingredients = parse_ingredients(recipe["NER_Simple"])
        recipe_id = str(recipe["Unnamed: 0"])

        # Add recipe node
        G.add_node(recipe_id, title=recipe["title"])

        # Map ingredients to this recipe
        for ingredient in ingredients:
            ingredient_to_recipes[ingredient].append(recipe_id)

    print(f"Created ingredient mappings for {len(ingredient_to_recipes)} ingredients")

    # Create edges based on shared ingredients using symmetric edge IDs to prevent duplicates
    print("Creating edges from ingredient mappings...")
    edge_count = 0
    seen_edges = set()  # Track edges we've already created

    for ingredient, recipe_list in ingredient_to_recipes.items():
        if len(recipe_list) > 1:  # Only consider ingredients shared by multiple recipes
            # Connect all recipes that share this ingredient
            for i in range(len(recipe_list)):
                for j in range(i + 1, len(recipe_list)):
                    recipe1_id = recipe_list[i]
                    recipe2_id = recipe_list[j]

                    # Create symmetric edge ID to ensure we don't create duplicate edges
                    edge_id = create_symmetric_edge_id(recipe1_id, recipe2_id)

                    # Only add edge if we haven't seen this edge before
                    if edge_id not in seen_edges:
                        G.add_edge(recipe1_id, recipe2_id)
                        seen_edges.add(edge_id)
                        edge_count += 1

                    if edge_count % 5000 == 0:
                        print(f"Added {edge_count} unique edges...")

    end_time = time.time()
    print(
        f"Final graph built with {G.number_of_nodes()} nodes and {G.number_of_edges()} unique edges in {end_time - start_time:.2f} seconds"
    )
    return G


def calculate_final_graph_statistics(G: nx.Graph) -> Dict:
    """Calculate final graph statistics efficiently"""
    print("Calculating final graph statistics...")
    start_time = time.time()

    stats = {}

    # Basic statistics
    stats["node_count"] = G.number_of_nodes()
    stats["edge_count"] = G.number_of_edges()

    # Average degree
    if G.number_of_nodes() > 0:
        stats["average_node_degree"] = (
            sum(dict(G.degree()).values()) / G.number_of_nodes()
        )
    else:
        stats["average_node_degree"] = 0

    # Density
    if G.number_of_nodes() > 1:
        stats["density"] = nx.density(G)
    else:
        stats["density"] = 0

    # Connected components
    connected_components = list(nx.connected_components(G))
    stats["connected_components_count"] = len(connected_components)
    if connected_components:
        stats["largest_component_size"] = max(
            len(comp) for comp in connected_components
        )
        # Calculate the size distribution of components
        component_sizes = [len(comp) for comp in connected_components]
        stats["component_size_distribution"] = sorted(component_sizes, reverse=True)
    else:
        stats["largest_component_size"] = 0
        stats["component_size_distribution"] = []

    # Clustering coefficient (calculate for a sample of nodes to save time)
    try:
        if G.number_of_nodes() > 0:
            # Sample 1000 nodes or all nodes if less than 1000
            sample_size = min(1000, G.number_of_nodes())
            sample_nodes = list(G.nodes())[:sample_size]
            clustering_coeffs = nx.clustering(G, sample_nodes)
            stats["average_clustering_coefficient"] = np.mean(
                list(clustering_coeffs.values())
            )
        else:
            stats["average_clustering_coefficient"] = 0
    except Exception as e:
        print(f"Error calculating clustering coefficient: {e}")
        stats["average_clustering_coefficient"] = 0

    # Centrality measures (calculate for a sample to save time)
    try:
        # Degree centrality (sample of 1000 nodes max)
        if G.number_of_nodes() > 0:
            sample_size = min(1000, G.number_of_nodes())
            sample_nodes = list(G.nodes())[:sample_size]
            degree_centrality = nx.degree_centrality(G)
            stats["max_degree_centrality"] = (
                max(degree_centrality.values()) if degree_centrality else 0
            )
            stats["avg_degree_centrality"] = (
                np.mean(list(degree_centrality.values())) if degree_centrality else 0
            )

            # Betweenness centrality (sample to save time)
            betweenness_centrality = nx.betweenness_centrality(
                G, k=min(100, G.number_of_nodes())
            )
            stats["max_betweenness_centrality"] = (
                max(betweenness_centrality.values()) if betweenness_centrality else 0
            )
            stats["avg_betweenness_centrality"] = (
                np.mean(list(betweenness_centrality.values()))
                if betweenness_centrality
                else 0
            )
        else:
            stats["max_degree_centrality"] = 0
            stats["avg_degree_centrality"] = 0
            stats["max_betweenness_centrality"] = 0
            stats["avg_betweenness_centrality"] = 0

    except Exception as e:
        print(f"Error calculating centrality measures: {e}")
        stats["max_degree_centrality"] = 0
        stats["avg_degree_centrality"] = 0
        stats["max_betweenness_centrality"] = 0
        stats["avg_betweenness_centrality"] = 0

    # Diameter and radius (only for the largest component to save time)
    try:
        if nx.is_connected(G):
            stats["diameter"] = nx.diameter(G)
            stats["radius"] = nx.radius(G)
        else:
            # For disconnected graphs, calculate for largest component
            largest_component = max(nx.connected_components(G), key=len)
            if len(largest_component) > 1:
                subgraph = G.subgraph(largest_component)
                stats["diameter"] = nx.diameter(subgraph)
                stats["radius"] = nx.radius(subgraph)
            else:
                stats["diameter"] = 0
                stats["radius"] = 0
    except Exception as e:
        print(f"Error calculating diameter/radius: {e}")
        stats["diameter"] = 0
        stats["radius"] = 0

    end_time = time.time()
    print(f"Final statistics calculated in {end_time - start_time:.2f} seconds")
    return stats


def calculate_ingredient_statistics(recipes_df: pd.DataFrame) -> Dict:
    """Calculate ingredient-related statistics"""
    print("Calculating ingredient statistics...")
    start_time = time.time()

    all_ingredients = []

    for _, recipe in recipes_df.iterrows():
        ingredients = parse_ingredients(recipe["NER_Simple"])
        all_ingredients.extend(ingredients)

    ingredient_counts = Counter(all_ingredients)

    end_time = time.time()
    print(f"Ingredient statistics calculated in {end_time - start_time:.2f} seconds")

    return {
        "total_unique_ingredients": len(ingredient_counts),
        "total_ingredients": len(all_ingredients),
        "most_common_ingredients": ingredient_counts.most_common(20),
        "ingredient_frequency_distribution": dict(ingredient_counts),
    }


def main():
    """Main function to analyze recipe graph efficiently with symmetric edge IDs"""
    print("Starting final efficient recipe graph analysis...")

    # Load data
    recipes_df = load_recipes("simplified_dataset.csv")
    print(f"Loaded {len(recipes_df)} recipes")

    # Build graph efficiently with symmetric edge IDs
    G = build_recipe_graph_final(recipes_df)

    # Calculate final graph statistics
    graph_stats = calculate_final_graph_statistics(G)

    # Calculate ingredient statistics
    ingredient_stats = calculate_ingredient_statistics(recipes_df)

    # Combine all statistics
    all_stats = {
        "graph_statistics": graph_stats,
        "ingredient_statistics": ingredient_stats,
    }

    # Save to JSON file
    with open("graph_analysis_final_results.json", "w") as f:
        json.dump(all_stats, f, indent=2)

    # Print summary
    print("\n=== FINAL GRAPH ANALYSIS RESULTS ===")
    print(f"Node count: {graph_stats['node_count']}")
    print(f"Edge count: {graph_stats['edge_count']}")
    print(f"Average node degree: {graph_stats['average_node_degree']:.2f}")
    print(f"Density: {graph_stats['density']:.6f}")
    print(f"Connected components: {graph_stats['connected_components_count']}")
    print(f"Largest component size: {graph_stats['largest_component_size']}")
    print(
        f"Average clustering coefficient: {graph_stats['average_clustering_coefficient']:.4f}"
    )
    print(f"Diameter: {graph_stats['diameter']}")
    print(f"Radius: {graph_stats['radius']}")

    print("\n=== CENTRALITY MEASURES ===")
    print(f"Max degree centrality: {graph_stats['max_degree_centrality']:.4f}")
    print(f"Avg degree centrality: {graph_stats['avg_degree_centrality']:.4f}")
    print(
        f"Max betweenness centrality: {graph_stats['max_betweenness_centrality']:.4f}"
    )
    print(
        f"Avg betweenness centrality: {graph_stats['avg_betweenness_centrality']:.4f}"
    )

    print("\n=== INGREDIENT STATISTICS ===")
    print(f"Total unique ingredients: {ingredient_stats['total_unique_ingredients']}")
    print(f"Total ingredient occurrences: {ingredient_stats['total_ingredients']}")

    print("\n=== MOST COMMON INGREDIENTS ===")
    for ingredient, count in ingredient_stats["most_common_ingredients"][
        :10
    ]:  # Show top 10
        print(f"  {ingredient}: {count}")

    print("\nResults saved to data_proc/graph_analysis_final_results.json")


if __name__ == "__main__":
    main()
