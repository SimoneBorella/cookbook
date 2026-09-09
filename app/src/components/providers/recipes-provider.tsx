"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export interface Ingredient {
  name: string;
  quantity?: number;
  unit?: string;
}

export interface Recipe {
  _id: string;
  title: string;
  categoryIds: string[];
  image: string;
  prepTime: number;
  cookTime: number;
  yield: { amount: number; type: string };
  ingredients?: Ingredient[];
  lastVisited?: string;
}

export interface Category {
  _id: string;
  name: string;
  order: number;
}

interface RecipesContextType {
  recipes: Recipe[];
  categories: Category[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const RecipesContext = createContext<RecipesContextType | undefined>(undefined);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recipesRes, categoriesRes] = await Promise.all([
        fetch("/api/recipes").then((res) => res.json()),
        fetch("/api/categories").then((res) => res.json())
      ]);

      if (Array.isArray(categoriesRes)) setCategories(categoriesRes);
      if (Array.isArray(recipesRes)) setRecipes(recipesRes);
    } catch (error) {
      console.error("Errore caricamento dati globali:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      setRecipes([]);
      setCategories([]);
      setLoading(false);
    }
  }, [status]);

  return (
    <RecipesContext.Provider value={{ recipes, categories, loading, refresh: fetchData }}>
      {children}
    </RecipesContext.Provider>
  );
}

export const useRecipes = () => {
  const context = useContext(RecipesContext);
  if (context === undefined) {
    throw new Error("useRecipes deve essere usato dentro un RecipesProvider");
  }
  return context;
};