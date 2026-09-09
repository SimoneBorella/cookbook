"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Clock, Users, Loader2, X, ChefHat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRecipes } from "@/components/providers/recipes-provider";

function RecipesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("RecipesList");
  const tCat = useTranslations("Categories");
  const tYield = useTranslations("YieldTypes");

  const { recipes, categories, loading } = useRecipes();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams.get("category") || "all");

  React.useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const getCategoryNames = (categoryIds: string[]) => {
    if (!Array.isArray(categoryIds)) return [];
    return categoryIds
      .map(id => {
        const cat = categories.find(c => c._id === id);
        if (!cat) return null;
        return tCat.has(cat.name as any) ? tCat(cat.name as any) : cat.name;
      })
      .filter(Boolean) as string[];
  };

  const filteredRecipes = React.useMemo(() => {
    return recipes.filter(recipe => {
      if (selectedCategory !== "all" && (!recipe.categoryIds || !recipe.categoryIds.includes(selectedCategory))) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchTitle = recipe.title.toLowerCase().includes(query);
        const matchIngredients = recipe.ingredients?.some(ing => 
          ing.name.toLowerCase().includes(query)
        );
        if (!matchTitle && !matchIngredients) {
          return false;
        }
      }
      return true;
    });
  }, [recipes, searchQuery, selectedCategory, categories]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    router.replace("/recipes");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-6 py-6 px-2 sm:px-2 md:px-6 pb-24 min-h-[calc(100dvh-var(--header-height)-4rem)] relative animate-in fade-in duration-500">
      
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2 px-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {/* Barra dei filtri */}
      <div className="bg-card p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 mb-2 mx-1">
        
        {/* Ricerca Testuale */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 h-11 bg-background"
          />
          {searchQuery && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtro Categorie */}
        <div className="w-full md:w-64 shrink-0">
          <select 
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              if(e.target.value === "all") router.replace("/recipes");
              else router.replace(`/recipes?category=${e.target.value}`);
            }}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">{t("allCategories")}</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>
                {tCat.has(cat.name as any) ? tCat(cat.name as any) : cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Griglia Ricette */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
          {filteredRecipes.map((recipe) => {
            const categoryNames = getCategoryNames(recipe.categoryIds);
            
            const yieldType = recipe.yield?.type?.toLowerCase() || "";
            const translatedYield = tYield.has(yieldType as any) ? tYield(yieldType as any) : yieldType;

            return (
              <Card 
                key={recipe._id} 
                onClick={() => router.push(`/recipe/${recipe._id}`)}
                className="group cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 overflow-hidden bg-card flex flex-col h-full"
              >
                <div className="relative h-48 w-full overflow-hidden bg-muted shrink-0">
                  {recipe.image ? (
                    <Image 
                      src={recipe.image} 
                      alt={recipe.title} 
                      fill 
                      sizes="(max-width: 768px) 100vw, 250px" 
                      quality={50} 
                      loading="lazy"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-100 dark:bg-stone-900 text-muted-foreground">
                      <ChefHat className="h-10 w-10 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                </div>
                
                <CardContent className="p-5 flex flex-col gap-2 flex-1">
                  {categoryNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-0.5">
                      {categoryNames.map((catName, i) => (
                        <span key={i} className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {catName}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {recipe.title}
                  </h3>
                  
                  <div className="mt-auto pt-3 flex items-center gap-4 text-xs text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{recipe.yield?.amount || 1} {translatedYield}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-2xl bg-card/50 mt-8 mx-1 py-20">
          <p className="text-muted-foreground mb-4 text-lg">{t("noResults")}</p>
          {(searchQuery || selectedCategory !== "all") && (
            <Button variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          )}
        </div>
      )}

      <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-55">
        <Button 
          size="lg" 
          onClick={() => router.push("/recipe/new")}
          className="h-14 w-14 sm:w-auto rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-0 sm:px-6 flex items-center justify-center"
        >
          <Plus className="h-6 w-6 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline font-semibold text-base">{t("newRecipe")}</span>
        </Button>
      </div>

    </div>
  );
}

export default function RecipesListPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RecipesListContent />
    </React.Suspense>
  );
}