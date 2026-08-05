import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Configurazione opzionale per aumentare i limiti di corpo della richiesta se necessario (Next.js App Router)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(req: Request) {
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Il file deve essere un'immagine" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Pulizia e sicurezza del nome file originario
    const originalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(originalName) || `.${file.type.split("/")[1] || "jpg"}`;
    const filename = `recipe-${uniqueSuffix}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "recipes");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const publicUrl = `/api/uploads/recipes/${filename}`;
    
    return NextResponse.json({ url: publicUrl }, { status: 201 });

  } catch (error) {
    console.error("Errore durante l'upload dell'immagine:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}