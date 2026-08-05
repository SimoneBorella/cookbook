import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// Usa la variabile d'ambiente del tuo file .env
const uri = process.env.MONGODB_URI as string;

export async function GET() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    const categories = await db.collection("categories").find({}).sort({ order: 1 }).toArray();
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Errore API categorie:", error);
    return NextResponse.json({ error: "Impossibile recuperare le categorie" }, { status: 500 });
  } finally {
    await client.close();
  }
}