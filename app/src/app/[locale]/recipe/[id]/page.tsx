"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { 
  ArrowLeft, Clock, Users, ChefHat, CheckCircle2, 
  Loader2, Flame, Trash2, Pencil, Minus, Plus, Share2, Download 
} from "lucide-react";

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
  categoryIds: string[];
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
  const tYield = useTranslations("YieldTypes");
  const unwrappedParams = React.use(params as any) as { id: string };

  const [recipe, setRecipe] = React.useState<Recipe | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  
  const [currentYield, setCurrentYield] = React.useState<number>(1);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const [isDownloading, setIsDownloading] = React.useState(false);
  
  const pdfRef = React.useRef<HTMLDivElement>(null);

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
  }, [unwrappedParams.id]);

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

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !recipe) {
      alert("Recipe not found.");
      return;
    }
    
    setIsDownloading(true);

    try {
      const htmlToImage = await import("html-to-image");
      const jsPDFModule = await import("jspdf");
      const JsPDFConstructor = jsPDFModule.default || (jsPDFModule as any).jsPDF || jsPDFModule;

      const pdf = new JsPDFConstructor({ orientation: "p", unit: "mm", format: "a4" });
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 15;
      const printWidth = pdfWidth - margin * 2;
      const printHeight = pdfHeight - margin * 2;

      let currentY = margin;

      const blocks = Array.from(pdfRef.current.querySelectorAll("[data-pdf-block]")) as HTMLElement[];

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        const dataUrl = await htmlToImage.toPng(block, { 
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          filter: (node) => {
            if (node instanceof HTMLElement && node.hasAttribute("data-html2canvas-ignore")) return false;
            return true;
          }
        });

        const blockWidthPx = block.offsetWidth;
        const blockHeightPx = block.offsetHeight;
        
        if (blockHeightPx === 0) continue;

        const ratio = printWidth / blockWidthPx;
        const blockHeightMm = blockHeightPx * ratio;

        if (currentY + blockHeightMm > pdfHeight - margin && currentY > margin) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.addImage(dataUrl, "PNG", margin, currentY, printWidth, blockHeightMm);
        currentY += blockHeightMm; 
      }

      const safeTitle = recipe.title.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`CookBook_${safeTitle}.pdf`);
      
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error PDF: ${error?.message || "Impossible to complete te operation."}`);
    } finally {
      setIsDownloading(false);
    }
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

  const rawYieldType = recipe.yield?.type?.toLowerCase() || "";
  const translatedYield = tYield.has(rawYieldType as any) ? tYield(rawYieldType as any) : rawYieldType;

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

        {/* CONTENITORE PULSANTI (Spaziatura uniforme) */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* DOWNLOAD */}
          <Button 
            variant="ghost" 
            className="hidden md:flex text-foreground"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t("downloadRecipe")}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden text-foreground"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>

          {/* MODIFICA */}
          <Button 
            variant="ghost" 
            className="hidden md:flex text-foreground"
            onClick={() => router.push(`/recipe/${unwrappedParams.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {t("editRecipe")}
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => router.push(`/recipe/${unwrappedParams.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* ELIMINA */}
          <Button 
            variant="ghost" 
            className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2 md:px-4"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("deleteRecipe")}</span>
          </Button>
        </div>
      </div>

      {/* Area da stampare (Wrappata nel pdfRef) */}
      <div ref={pdfRef} className="bg-background rounded-3xl p-1">
        
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
                        data-html2canvas-ignore
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
                        data-html2canvas-ignore
                        onClick={() => setCurrentYield(currentYield + 1)}
                        className="h-5 w-5 flex items-center justify-center rounded bg-background border shadow-sm hover:bg-muted transition-colors text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="font-semibold text-sm ml-1 text-foreground/80">{translatedYield}</span>
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
                  quality={50} 
                  priority
                  className="object-cover"
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


      {/* ============================================================== */}
      {/* LAYOUT FANTASMA PER PDF (Architettura Block-by-Block)          */}
      {/* ============================================================== */}
      <div className="absolute -left-[10000px] top-0 overflow-hidden">
        <div ref={pdfRef} className="w-[800px] bg-white text-black font-sans">
          
          {/* BLOCCO 1: Intestazione */}
          <div data-pdf-block className="bg-white px-12 pt-12 pb-6">
            <div className="text-center border-b-2 border-stone-200 pb-6">
              <h1 className="text-4xl font-extrabold text-stone-900 mb-3">{recipe.title}</h1>
              <p className="text-stone-500 text-lg italic">{recipe.description}</p>
              
              <div className="flex justify-center gap-8 font-bold text-stone-700 tracking-wider uppercase text-sm mt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> {t("totalTime")}: {totalTime} min
                </div>
                
                {/* Nuova aggiunta: Tempo di preparazione e cottura */}
                {(recipe.prepTime > 0 || recipe.cookTime > 0) && (
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5" /> {t("prepTime")}: {recipe.prepTime}m / {t("cookTime")}: {recipe.cookTime}m
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> {t("yield")}: {currentYield} {translatedYield}
                </div>
              </div>
            </div>
          </div>

          {/* BLOCCO 2: Immagine + Ingredienti Affiancati */}
          <div data-pdf-block className="bg-white px-12 pb-8 flex gap-10">
            {/* Sinistra: Immagine */}
            <div className="w-1/2 shrink-0">
              {recipe.image ? (
                <div className="w-full aspect-[4/3] overflow-hidden rounded-2xl shadow-sm border border-stone-200">
                  <img src={recipe.image} alt="Foto ricetta" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full aspect-[4/3] bg-stone-100 flex items-center justify-center rounded-2xl border border-stone-200">
                  <ChefHat className="h-16 w-16 text-stone-300" />
                </div>
              )}
            </div>

            {/* Destra: Ingredienti (Tradotti) */}
            <div className="w-1/2">
              <h3 className="text-xl font-bold mb-4 text-stone-900 uppercase tracking-widest border-b pb-2">
                {t("ingredients")}
              </h3>
              <ul className="space-y-2 text-stone-700">
                {recipe.ingredients.map((ing, idx) => {
                  const scaledQuantity = ing.quantity > 0 ? +(ing.quantity * yieldRatio).toFixed(2) : "";
                  return (
                    <li key={idx} className="flex justify-between items-end border-b border-stone-100 pb-1">
                      <span className="font-semibold pr-2">{ing.name}</span>
                      <span className="text-sm whitespace-nowrap text-stone-500">
                        {scaledQuantity} {ing.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* BLOCCO 3: Titolo Procedimento (Tradotto) */}
          <div data-pdf-block className="bg-white px-12 pt-2 pb-4">
            <h3 className="text-xl font-bold text-stone-900 uppercase tracking-widest border-b pb-2">
              {t("steps")}
            </h3>
          </div>

          {/* BLOCCHI 4...N: Singoli Passi del Procedimento separati */}
          {recipe.steps.map((step, idx) => (
            <div data-pdf-block key={idx} className="bg-white px-12 py-4">
              <div className="flex gap-4">
                <span className="font-black text-2xl text-stone-300 shrink-0">
                  {idx + 1}.
                </span>
                <p className="leading-relaxed text-base pt-1 text-stone-800">
                  {step}
                </p>
              </div>
            </div>
          ))}
          
          {/* BLOCCO FOOTER */}
          <div data-pdf-block className="bg-white px-12 pt-8 pb-12">
            <div className="text-center border-t border-stone-200 text-stone-300 text-xs font-bold uppercase tracking-widest pt-6">
              CookBook
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}