"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft, Clock, Users, ChefHat, CheckCircle2, Loader2, Flame, Trash2, Pencil, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  _id: string;
  title: string;
  categoryIds: string[]; // Aggiornato a array di ID
  image: string;
  description: string;
  prepTime: number;
  cookTime: number;
  yield: {
    amount: number;
    type: string;
  };
  ingredients: Ingredient[];
  steps: string[];
}

interface Category {
  _id: string;
  name: string;
}

export default function RecipeViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations("RecipeView");
  const tCat = useTranslations("Categories");
  const locale = useLocale();
  const unwrappedParams = React.use(params as any) as { id: string };

  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  
  // Stato per le porzioni dinamiche
  const [currentYield, setCurrentYield] = React.useState<number>(1);
  
  // Stati per l'eliminazione
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [recipeRes, categoriesRes] = await Promise.all([
          fetch(`/api/recipes/${unwrappedParams.id}`),
          fetch("/api/categories")
        ]);

        if (!recipeRes.ok) throw new Error("Not found");
        const data: Recipe = await recipeRes.json();
        
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          if (Array.isArray(categoriesData)) setCategories(categoriesData);
        }

        const textsToTranslate = [
          data.title,
          data.description,
          data.yield.type,
          ...data.ingredients.map(ing => ing.name),
          ...data.ingredients.map(ing => ing.unit),
          ...data.steps
        ];

        const transRes = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: textsToTranslate, 
            targetLanguage: locale 
          }),
        });

        if (transRes.ok) {
          const transData = await transRes.json();
          const tr = transData.translatedText;

          if (Array.isArray(tr) && tr.length === textsToTranslate.length) {
            let idx = 0;
            data.title = tr[idx++];
            data.description = tr[idx++];
            data.yield.type = tr[idx++];
            
            data.ingredients.forEach(ing => { ing.name = tr[idx++]; });
            data.ingredients.forEach(ing => { ing.unit = tr[idx++]; });
            
            data.steps = data.steps.map(() => tr[idx++]);
          }
        }

        if (isMounted) {
          setRecipe(data);
          setCurrentYield(data.yield.amount || 1);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => { isMounted = false };
  }, [unwrappedParams.id, locale]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${unwrappedParams.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/recipes");
      } else {
        alert("Errore durante l'eliminazione della ricetta.");
        setIsDeleting(false);
      }
    } catch (err) {
      console.error(err);
      alert("Errore di rete durante l'eliminazione.");
      setIsDeleting(false);
    }
  };

  // Funzione per ricavare i nomi tradotti delle categorie dati gli ID
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

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--header-height)-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ChefHat className="h-12 w-12 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">{t("notFound")}</h2>
        <Button variant="outline" onClick={() => router.push("/recipes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("back")}
        </Button>
      </div>
    );
  }

  const totalTime = recipe.prepTime + recipe.cookTime;
  const yieldRatio = currentYield / (recipe.yield.amount || 1);
  const categoryNames = getCategoryNames(recipe.categoryIds);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500 pb-24">
      
      {/* Header & Nav */}
      <div className="flex items-center justify-between mb-6 -ml-4">
        <Button 
          variant="ghost" 
          className="text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/recipes")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            className="hidden sm:flex text-foreground"
            onClick={() => router.push(`/recipe/${unwrappedParams.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t("editRecipe")}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="sm:hidden text-foreground"
            onClick={() => router.push(`/recipe/${unwrappedParams.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button 
            variant="ghost" 
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("deleteRecipe")}</span>
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col gap-6 md:gap-10">
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start">
          
          <div className="flex-1 space-y-4">
            {/* Badge Categorie Multiple */}
            {categoryNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categoryNames.map((catName, i) => (
                  <span key={i} className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {catName}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
              {recipe.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {recipe.description}
            </p>

            {/* Recipe Stats */}
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-3 bg-muted/40 px-4 py-3 rounded-xl border border-border/50">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("totalTime")}</span>
                  <span className="font-semibold text-sm">{totalTime} min</span>
                </div>
              </div>

              {(recipe.prepTime > 0 || recipe.cookTime > 0) && (
                <div className="flex items-center gap-3 bg-muted/40 px-4 py-3 rounded-xl border border-border/50">
                  <Flame className="h-5 w-5 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("prepTime")} / {t("cookTime")}</span>
                    <span className="font-semibold text-sm">{recipe.prepTime}m / {recipe.cookTime}m</span>
                  </div>
                </div>
              )}

              {/* Box Contatore Porzioni Dinamico */}
              <div className="flex items-center gap-3 bg-muted/40 px-4 py-2.5 rounded-xl border border-border/50">
                <Users className="h-5 w-5 text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{t("yield")}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button 
                      onClick={() => setCurrentYield(Math.max(1, currentYield - 1))}
                      disabled={currentYield <= 1}
                      className="h-5 w-5 flex items-center justify-center rounded bg-background border shadow-sm hover:bg-muted disabled:opacity-50 transition-colors text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-semibold text-sm tabular-nums text-center min-w-[1rem]">
                      {currentYield}
                    </span>
                    <button 
                      onClick={() => setCurrentYield(currentYield + 1)}
                      className="h-5 w-5 flex items-center justify-center rounded bg-background border shadow-sm hover:bg-muted transition-colors text-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="font-semibold text-sm ml-1 text-foreground/80">{recipe.yield.type}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-2/5 aspect-[4/3] md:aspect-square relative rounded-3xl overflow-hidden shadow-xl shrink-0 border border-border/20">
            {recipe.image ? (
              <Image 
                src={recipe.image} 
                alt={recipe.title} 
                fill 
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-100 dark:bg-stone-900 text-muted-foreground">
                <ChefHat className="h-12 w-12 opacity-20" />
              </div>
            )}
          </div>
        </div>

        <Separator className="my-2" />

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          
          {/* Ingredients Column */}
          <div className="md:col-span-4">
            <div className="sticky top-24 bg-card p-6 rounded-2xl border shadow-sm">
              <h3 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
                {t("ingredients")}
              </h3>
              <ul className="space-y-4">
                {recipe.ingredients.map((ing, idx) => {
                  const scaledQuantity = ing.quantity > 0 
                    ? +(ing.quantity * yieldRatio).toFixed(2) 
                    : "";

                  return (
                    <li key={idx} className="flex items-start justify-between group">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                        <span className="font-medium text-foreground">{ing.name}</span>
                      </div>
                      <div className="text-sm font-semibold text-muted-foreground text-right pl-4 whitespace-nowrap">
                        {scaledQuantity} {ing.unit}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Steps Column */}
          <div className="md:col-span-8">
            <h3 className="text-2xl font-bold tracking-tight mb-8">
              {t("steps")}
            </h3>
            <div className="space-y-8">
              {recipe.steps.map((step, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shadow-sm border border-primary/20">
                      {idx + 1}
                    </span>
                    {idx !== recipe.steps.length - 1 && (
                      <div className="w-px h-full bg-border/60 mt-4" />
                    )}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-foreground/90 pb-8 text-lg">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modale Conferma Eliminazione */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              {t("deleteCancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t("deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}