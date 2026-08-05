import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  // Sicurezza: controlla che l'utente sia autenticato
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ error: "Nessun file trovato" }, { status: 400 });
    }

    // Valida che il file sia effettivamente un'immagine
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Il file deve essere un'immagine" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Genera un nome file univoco per evitare collisioni
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.name) || ".jpg";
    const filename = `recipe-${uniqueSuffix}${ext}`;

    // Percorso della cartella pubblica mappata sul volume Docker persistente
    const uploadDir = path.join(process.cwd(), "public", "uploads", "recipes");
    
    // Assicura che la cartella esista, altrimenti la crea
    await mkdir(uploadDir, { recursive: true });

    // Scrive il file fisicamente sul disco del server
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Restituisce l'URL relativo pubblico da salvare nel database
    const publicUrl = `/uploads/recipes/${filename}`;
    return NextResponse.json({ url: publicUrl }, { status: 201 });

  } catch (error) {
    console.error("Errore durante l'upload dell'immagine:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}