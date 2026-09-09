import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const uri = process.env.MONGODB_URI as string;

export async function GET(req: Request) {
  // Analizza i parametri per capire chi sta chiamando l'API
  const { searchParams } = new URL(req.url);
  const isSlim = searchParams.get("slim") === "true"; // Passato dalla Dashboard

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    // Configura la proiezione: 0 = "escludi questo campo"
    // Escludiamo SEMPRE i passi di preparazione e la descrizione (i campi più pesanti)
    const projection: any = {
      steps: 0,
      description: 0,
    };

    // Se è la Dashboard a chiamare, escludiamo anche la lista degli ingredienti!
    if (isSlim) {
      projection.ingredients = 0;
    }

    const recipes = await db.collection("recipes")
      .find({})
      .project(projection) // <--- QUI AVVIENE LA MAGIA DELL'OTTIMIZZAZIONE
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Errore API ricette:", error);
    return NextResponse.json({ error: "Impossibile recuperare le ricette" }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = new MongoClient(uri);
  
  try {
    const data = await req.json();

    if (!data.title || !data.categoryIds || !Array.isArray(data.categoryIds) || data.categoryIds.length === 0) {
      return NextResponse.json({ error: "Titolo e almeno una categoria sono obbligatori" }, { status: 400 });
    }

    const newRecipe = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
    };

    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    const result = await db.collection("recipes").insertOne(newRecipe);
    
    return NextResponse.json({ success: true, id: result.insertedId }, { status: 201 });

  } catch (error) {
    console.error("Errore salvataggio ricetta:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  } finally {
    await client.close();
  }
}