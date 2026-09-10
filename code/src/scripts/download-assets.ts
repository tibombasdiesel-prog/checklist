import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, "../../../public_asset_links.json");
const outputDir = path.resolve(__dirname, "../../public/assets");

async function downloadAssets() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const links: string[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Baixando ${links.length} assets para ${outputDir}...`);

  for (const url of links) {
    const rawFileName = decodeURIComponent(url.split("/").pop() || "asset");
    // Sanitize filename
    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = path.join(outputDir, fileName);

    try {
      console.log(`Baixando: ${fileName} ...`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Aviso: falha ao baixar ${url} (status: ${res.status})`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buffer);
      console.log(`✓ Salvo: ${dest} (${buffer.length} bytes)`);
    } catch (e: any) {
      console.error(`Erro ao baixar ${url}:`, e.message);
    }
  }

  console.log("Download de assets concluído!");
}

downloadAssets();
