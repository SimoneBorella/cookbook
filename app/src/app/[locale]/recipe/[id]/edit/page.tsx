"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowLeft, Save, UploadCloud, Plus, Trash2, Loader2, AlertCircle, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Ingredient {
  name: string;
  quantity: number | "";
  unit: string;
}

interface Category {
  _id: string;
  name: string;
  order: number;
}

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations("EditRecipe");
  const tNew = useTranslations("NewRecipe");
  const tCat = useTranslations("Categories");
  const tApi = useTranslations("ApiErrors");
  
  const unwrappedParams = React.use(params as any) as { id: string };
  const recipeId = unwrappedParams.id;

  const [isPageLoading, setIsPageLoading] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [categories, setCategories] = React.useState<Category[]>([]);

  // Stati del form
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryIds, setCategoryIds] = React.useState<string[]>([]);
  
  // Stati per la gestione dell'immagine (file nuovo o URL esistente)
  const [existingImage, setExistingImage] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string>("");
  const [isDragging, setIsDragging] = React.useState(false);

  const [prepTime, setPrepTime] = React.useState<number | "">("");
  const [cookTime, setCookTime] = React.useState<number | "">("");
  const [yieldAmount, setYieldAmount] = React.useState<number | "">("");
  const [yieldType, setYieldType] = React.useState("");
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([{ name: "", quantity: "", unit: "" }]);
  const [steps, setSteps] = React.useState<string[]>([""]);

  // Carica le categorie e la ricetta esistente
  React.useEffect(() => {
    Promise.all([
      fetch("/api/categories").then(res => res.json()),
      fetch(`/api/recipes/${recipeId}`).then(res => {
        if (!res.ok) throw new Error("Ricetta non trovata");
        return res.json();
      })
    ])
    .then(([categoriesData, recipeData]) => {
      if (Array.isArray(categoriesData)) {
        const sorted = categoriesData.sort((a, b) => a.order - b.order);
        setCategories(sorted);
      }
      
      // Popola il form con i dati esistenti
      setTitle(recipeData.title || "");
      setDescription(recipeData.description || "");
      
      // Supporta sia il vecchio campo categoryId che il nuovo array categoryIds
      if (Array.isArray(recipeData.categoryIds)) {
        setCategoryIds(recipeData.categoryIds);
      } else if (recipeData.categoryId) {
        setCategoryIds([recipeData.categoryId]);
      }
      
      if (recipeData.image) {
        setExistingImage(recipeData.image);
        setImagePreview(recipeData.image);
      }

      setPrepTime(recipeData.prepTime || "");
      setCookTime(recipeData.cookTime || "");
      setYieldAmount(recipeData.yield?.amount || "");
      setYieldType(recipeData.yield?.type || "");
      
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        setIngredients(recipeData.ingredients);
      }
      if (recipeData.steps && recipeData.steps.length > 0) {
        setSteps(recipeData.steps);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Errore nel caricamento della ricetta.");
      router.push("/recipes");
    })
    .finally(() => setIsPageLoading(false));
  }, [recipeId, router]);

  // Gestione selezione multipla categorie
  const toggleCategory = (catId: string) => {
    if (categoryIds.includes(catId)) {
      if (categoryIds.length === 1) return; // Mantiene almeno una categoria selezionata
      setCategoryIds(categoryIds.filter(id => id !== catId));
    } else {
      setCategoryIds([...categoryIds, catId]);
    }
  };

  // Gestione File Immagine e Drag & Drop
  const handleFileSelect = (file: File | undefined) => {
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("Il file selezionato deve essere un'immagine.");
        return;
      }

      // Pulisce il nome del file rimuovendo spazi, maiuscole e caratteri speciali
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "_")
        .replace(/_+/g, "_");

      // Crea un nuovo oggetto File con il nome pulito
      const sanitizedFile = new File([file], safeName, { type: file.type });

      setImageFile(sanitizedFile);
      setImagePreview(URL.createObjectURL(sanitizedFile));
      setErrorMessage("");
    }
  };


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const addIngredient = () => setIngredients([...ingredients, { name: "", quantity: "", unit: "" }]);
  const removeIngredient = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));
  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const newIngredients = [...ingredients];
    (newIngredients[index] as any)[field] = value;
    setIngredients(newIngredients);
  };

  const addStep = () => setSteps([...steps, ""]);
  const removeStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));
  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    if (!title.trim() || categoryIds.length === 0 || !yieldAmount || !yieldType.trim()) {
      setErrorMessage(tApi("missingData"));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim() !== "");
    const validSteps = steps.filter(step => step.trim() !== "");

    if (validIngredients.length === 0 || validSteps.length === 0) {
      setErrorMessage(tApi("missingData"));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = existingImage;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } else {
          setErrorMessage("Errore durante il caricamento della nuova immagine sul server.");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setLoading(false);
          return;
        }
      } else if (!imagePreview) {
        imageUrl = "";
      }

      const recipeData = {
        title,
        description,
        categoryIds,
        image: imageUrl,
        prepTime: Number(prepTime) || 0,
        cookTime: Number(cookTime) || 0,
        yield: {
          amount: Number(yieldAmount) || 1,
          type: yieldType
        },
        ingredients: validIngredients.map(ing => ({ ...ing, quantity: Number(ing.quantity) || 0 })),
        steps: validSteps
      };

      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipeData),
      });

      if (res.ok) {
        router.push(`/recipe/${recipeId}`);
      } else {
        const errData = await res.json();
        const errorKey = errData.error as string;
        setErrorMessage(tApi.has(errorKey as any) ? tApi(errorKey as any) : tApi("internalError"));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(tApi("internalError"));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500 pb-32">
      
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          className="-ml-4 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
          type="button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("cancel")}
        </Button>
        <Button onClick={handleSave} disabled={loading} className="rounded-full px-6 shadow-sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {loading ? t("saving") : t("saveRecipe")}
        </Button>
      </div>

      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleSave} noValidate>
          
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-6 bg-card p-6 rounded-3xl border shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">{tNew("recipeTitleLabel")} <span className="text-destructive">*</span></Label>
              <Input 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="h-12 text-lg" 
              />
            </div>

            {/* SELEZIONE CATEGORIE MULTIPLE */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{tNew("categoryLabel")} <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map(cat => {
                  const isSelected = categoryIds.includes(cat._id);
                  const catName = tCat.has(cat.name as any) ? tCat(cat.name as any) : cat.name;

                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => toggleCategory(cat._id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        isSelected 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : "bg-background text-muted-foreground border-input hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                      {catName}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Seleziona una o più categorie.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">{tNew("descriptionLabel")}</Label>
              <Textarea 
                id="description" 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="resize-none min-h-[100px]" 
              />
            </div>

            {/* SEZIONE UPLOAD IMMAGINE CON DRAG & DROP */}
            <div className="space-y-2 pt-2">
              <Label className="text-base font-semibold">{tNew("imageLabel")}</Label>
              
              {imagePreview ? (
                <div className="relative w-full h-64 rounded-2xl overflow-hidden border bg-muted group">
                  <Image 
                    src={imagePreview} 
                    alt="Anteprima copertina" 
                    fill 
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        setExistingImage("");
                      }}
                    >
                      <X className="h-4 w-4 mr-1.5" /> Rimuovi immagine
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("imageEditFileInput")?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-muted-foreground transition-colors cursor-pointer group ${
                    isDragging ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <input 
                    id="imageEditFileInput" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => handleFileSelect(e.target.files?.[0])}
                  />
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <span className="font-medium">Trascina qui un'immagine o clicca per caricare</span>
                  <span className="text-xs mt-1 text-muted-foreground">PNG, JPG o WEBP (max 5MB)</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-3xl border shadow-sm">
            <div className="space-y-2">
              <Label className="text-base font-semibold">{tNew("prepTimeLabel")}</Label>
              <Input type="number" value={prepTime} onChange={e => setPrepTime(e.target.value ? Number(e.target.value) : "")} min="0" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">{tNew("cookTimeLabel")}</Label>
              <Input type="number" value={cookTime} onChange={e => setCookTime(e.target.value ? Number(e.target.value) : "")} min="0" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-base font-semibold">{tNew("yieldAmountLabel")} <span className="text-destructive">*</span></Label>
              <Input type="number" value={yieldAmount} onChange={e => setYieldAmount(e.target.value ? Number(e.target.value) : "")} min="1" />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">{tNew("yieldTypeLabel")} <span className="text-destructive">*</span></Label>
              <Input value={yieldType} onChange={e => setYieldType(e.target.value)} />
            </div>
          </div>

          <div className="space-y-6 bg-card p-6 rounded-3xl border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xl font-bold tracking-tight">{tNew("ingredientsTitle")} <span className="text-destructive text-base">*</span></Label>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 sm:gap-3 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex-1 min-w-[120px]">{tNew("ingredientColName")}</div>
                <div className="w-16 sm:w-20 text-center">{tNew("ingredientColQty")}</div>
                <div className="w-20 sm:w-24 text-center">{tNew("ingredientColUnit")}</div>
                <div className="w-10"></div>
              </div>

              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 sm:gap-3">
                  <Input 
                    value={ing.name} 
                    onChange={e => updateIngredient(idx, "name", e.target.value)} 
                    className="flex-1 min-w-[120px]" 
                  />
                  <Input 
                    type="number" 
                    value={ing.quantity} 
                    onChange={e => updateIngredient(idx, "quantity", e.target.value)} 
                    className="w-16 sm:w-20 px-2 text-center" 
                  />
                  <Input 
                    value={ing.unit} 
                    onChange={e => updateIngredient(idx, "unit", e.target.value)} 
                    className="w-20 sm:w-24 px-2 text-center" 
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(idx)} disabled={ingredients.length === 1} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" onClick={addIngredient} variant="outline" className="w-full border-dashed rounded-xl h-12 text-muted-foreground hover:text-foreground">
              <Plus className="mr-2 h-4 w-4" /> {tNew("addIngredient")}
            </Button>
          </div>

          <div className="space-y-6 bg-card p-6 rounded-3xl border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xl font-bold tracking-tight">{tNew("stepsTitle")} <span className="text-destructive text-base">*</span></Label>
            </div>
            
            <div className="space-y-6">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-muted/20 border border-border/50 p-4 rounded-2xl relative">
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-sm text-muted-foreground">{tNew("stepLabel")} {idx + 1}</span>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeStep(idx)} 
                      disabled={steps.length === 1} 
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                    >
                      <Trash2 className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">{tNew("stepDelete")}</span>
                    </Button>
                  </div>

                  <Textarea 
                    value={step}
                    onChange={e => updateStep(idx, e.target.value)}
                    className="resize-none min-h-[100px] text-base bg-background" 
                  />
                </div>
              ))}
            </div>

            <Button type="button" onClick={addStep} variant="outline" className="w-full border-dashed rounded-xl h-12 text-muted-foreground hover:text-foreground mt-4">
              <Plus className="mr-2 h-4 w-4" /> {tNew("addStep")}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}