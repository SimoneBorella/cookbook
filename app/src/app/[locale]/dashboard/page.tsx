"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing"; 
import { useTranslations } from "next-intl"; 
import { Loader2, Clock, Users, ArrowRight, Plus, ChefHat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRecipes, Recipe } from "@/components/providers/recipes-provider";

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations("Dashboard"); 
  const tCat = useTranslations("Categories"); 
  const tYield = useTranslations("YieldTypes");

  const { recipes, categories, loading } = useRecipes();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const recentRecipes = [...recipes]
    .filter(r => r.lastVisited)
    .sort((a, b) => new Date(b.lastVisited!).getTime() - new Date(a.lastVisited!).getTime())
    .slice(0, 8);

  const RecipeCarousel = ({ title, items, categoryId }: { title: string, items: Recipe[], categoryId?: string }) => {
    if (items.length === 0) return null;

    return (
      <div className="flex flex-col gap-4 mb-10">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground text-xs h-8 hover:text-primary transition-colors"
            onClick={() => router.push(categoryId ? `/recipes?category=${categoryId}` : "/recipes")}
          >
            {t("seeAll")} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-4 px-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((recipe) => {
            const yieldType = recipe.yield?.type?.toLowerCase() || "";
            const translatedYield = tYield.has(yieldType as any) ? tYield(yieldType as any) : yieldType;

            return (
              <Card 
                key={recipe._id} 
                onClick={() => router.push(`/recipe/${recipe._id}`)}
                className="group shrink-0 w-64 snap-start cursor-pointer border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 overflow-hidden bg-card"
              >
                <div className="relative h-40 w-full overflow-hidden bg-muted">
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
                
                <CardContent className="p-4 flex flex-col gap-2 relative">
                  <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {recipe.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{recipe.yield?.amount || 1} {translatedYield}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="@container/main flex flex-col gap-6 py-6 px-2 sm:px-2 md:px-6 pb-24 min-h-[calc(100dvh-var(--header-height)-4rem)] relative">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 px-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
      </div>

      <RecipeCarousel title={t("recentlyVisited")} items={recentRecipes} />

      {sortedCategories.map(category => {
        const categoryRecipes = recipes.filter(r => r.categoryIds?.includes(category._id));
        const translatedCategoryName = tCat.has(category.name as any) ? tCat(category.name as any) : category.name;

        return (
          <RecipeCarousel 
            key={category._id} 
            title={translatedCategoryName}
            categoryId={category._id}
            items={categoryRecipes} 
          />
        );
      })}

      {recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-card/50 mt-8 mx-1">
          <p className="text-muted-foreground mb-4">{t("noRecipes")}</p>
          <Button variant="outline" onClick={() => router.push("/recipe/new")}>
            {t("addFirstRecipe")}
          </Button>
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