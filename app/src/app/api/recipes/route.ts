import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const uri = process.env.MONGODB_URI as string;

export async function GET() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    // Recupera tutte le ricette (ordinate per data di creazione decrescente)
    const recipes = await db.collection("recipes").find({}).sort({ createdAt: -1 }).toArray();
    
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