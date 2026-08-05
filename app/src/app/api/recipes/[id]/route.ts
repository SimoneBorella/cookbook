import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const uri = process.env.MONGODB_URI as string;

export async function GET(
  request: Request,
  // NOTA: In Next.js 15 params è una Promise!
  { params }: { params: Promise<{ id: string }> }
) {
  // Aspettiamo di risolvere i parametri
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID ricetta non valido" }, { status: 400 });
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    await db.collection("recipes").updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastVisited: new Date().toISOString() } }
    );

    const recipe = await db.collection("recipes").findOne({ _id: new ObjectId(id) });
    
    if (!recipe) {
      return NextResponse.json({ error: "Ricetta non trovata" }, { status: 404 });
    }
    
    return NextResponse.json(recipe);
    
  } catch (error) {
    console.error("Errore API singola ricetta:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  } finally {
    await client.close();
  }
}


export async function DELETE(
  request: Request,
  // NOTA: In Next.js 15 params è una Promise!
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID ricetta non valido" }, { status: 400 });
  }

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    const result = await db.collection("recipes").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Ricetta non trovata" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error("Errore API eliminazione ricetta:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  } finally {
    await client.close();
  }
}


export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Sicurezza: solo gli utenti loggati possono modificare
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "ID ricetta non valido" }, { status: 400 });
  }

  const client = new MongoClient(uri);
  
  try {
    const data = await request.json();
    
    // Rimuoviamo l'id dai dati inviati altrimenti MongoDB dà errore (è un campo immutabile)
    delete data._id; 
    
    // Aggiorniamo la data di modifica
    data.updatedAt = new Date().toISOString();

    await client.connect();
    const db = client.db(process.env.MONGO_INITDB_DATABASE || "cookbook_db");
    
    await db.collection("recipes").updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    
    return NextResponse.json({ success: true }, { status: 200 });
    
  } catch (error) {
    console.error("Errore API modifica ricetta:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  } finally {
    await client.close();
  }
}