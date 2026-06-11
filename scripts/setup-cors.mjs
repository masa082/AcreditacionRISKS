#!/usr/bin/env node
/**
 * Aplica la política CORS al bucket de almacenamiento.
 *
 * Lee las credenciales desde el entorno (.env.local o el shell):
 *   STORAGE_S3_BUCKET
 *   STORAGE_S3_ENDPOINT
 *   STORAGE_S3_REGION         (opcional, default "auto")
 *   STORAGE_S3_ACCESS_KEY_ID
 *   STORAGE_S3_SECRET_ACCESS_KEY
 *   STORAGE_S3_FORCE_PATH_STYLE  (opcional, "true" para R2/Railway)
 *
 * Ejecutar:
 *   npx tsx scripts/setup-cors.mjs        (con variables en .env.local)
 *   o:
 *   STORAGE_S3_BUCKET=... STORAGE_S3_ENDPOINT=... ... node scripts/setup-cors.mjs
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import path from "node:path";

// Carga .env.local automáticamente
config({ path: path.join(process.cwd(), ".env.local") });

const required = ["STORAGE_S3_BUCKET", "STORAGE_S3_ENDPOINT", "STORAGE_S3_ACCESS_KEY_ID", "STORAGE_S3_SECRET_ACCESS_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("❌ Faltan variables de entorno:");
  for (const k of missing) console.error("   - " + k);
  console.error("\nDefina las variables o cree un archivo .env.local con ellas, luego reintente.");
  process.exit(1);
}

const Bucket = process.env.STORAGE_S3_BUCKET;
const client = new S3Client({
  region: process.env.STORAGE_S3_REGION || "auto",
  endpoint: process.env.STORAGE_S3_ENDPOINT,
  forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  },
});

const corsRules = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://www.okacreditado.com",
        "https://okacreditado.com",
        "http://localhost:3100",
      ],
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3000,
    },
  ],
};

try {
  console.log(`→ Bucket: ${Bucket}`);
  console.log(`→ Endpoint: ${process.env.STORAGE_S3_ENDPOINT}`);
  console.log("→ Aplicando política CORS...");

  await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: corsRules }));
  console.log("✓ Política CORS aplicada.");

  // Verifica leyendo de vuelta
  const verify = await client.send(new GetBucketCorsCommand({ Bucket }));
  console.log("\n✓ CORS actual del bucket:");
  console.log(JSON.stringify(verify.CORSRules, null, 2));
} catch (err) {
  console.error("\n❌ Error aplicando CORS:");
  console.error(err.message ?? err);
  if (err.Code === "NotImplemented") {
    console.error("\n⚠ Este proveedor S3-compatible no soporta PutBucketCors (algunos servicios MinIO viejos). Configurar CORS desde el dashboard.");
  }
  process.exit(1);
}
