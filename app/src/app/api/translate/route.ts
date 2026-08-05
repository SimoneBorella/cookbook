import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Funzione helper per tradurre una singola stringa
async function translateSingleText(text: string, targetLanguage: string) {
  // Ignora le stringhe vuote o i numeri
  if (!text || typeof text !== "string" || text.trim() === "") return text;

  const langpair = `Autodetect|${targetLanguage}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
  
  try {
    const response = await fetch(url, { method: "GET" });
    const data = await response.json();

    if (data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (!translated.includes("MYMEMORY WARNING") && !translated.includes("PLEASE SELECT TWO DISTINCT LANGUAGES")) {
        return translated;
      }
    }
  } catch (err) {
    console.error("Errore fetch MyMemory:", err);
  }
  
  // In caso di errore o se le lingue sono uguali, restituisce il testo originale
  return text;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: "missingData" }, { status: 400 });
    }

    // Se stiamo passando un array di stringhe (es: per gli ingredienti/passaggi)
    if (Array.isArray(text)) {
      const translatedArray = [];
      // Usiamo un ciclo for...of per tradurli in sequenza ed evitare il blocco per rate-limit
      for (const t of text) {
        translatedArray.push(await translateSingleText(t, targetLanguage));
      }
      return NextResponse.json({ translatedText: translatedArray });
    } 
    // Se passiamo una stringa singola
    else {
      const translatedText = await translateSingleText(text, targetLanguage);
      return NextResponse.json({ translatedText });
    }

  } catch (error) {
    console.error("Errore API Traduzione:", error);
    return NextResponse.json({ error: "internalError" }, { status: 500 });
  }
}