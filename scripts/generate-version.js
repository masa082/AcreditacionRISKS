const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Obtener el SHA del commit
let commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';

// Si no está disponible, intentar obtenerlo de git
if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    commitSha = 'unknown';
  }
}

// IMPORTANTE: Acortar a 7 caracteres (como aparece en Vercel)
if (commitSha !== 'unknown' && commitSha.length > 7) {
  commitSha = commitSha.substring(0, 7);
}

// Crear el archivo de versión
const versionFile = path.join(__dirname, '../src/lib/version.ts');
const content = `// Auto-generated version file
export const COMMIT_SHA = "${commitSha}";
export const COMMIT_URL = "https://github.com/masa082/AcreditacionRISKS/commit/${commitSha}";
`;

fs.writeFileSync(versionFile, content);
console.log(`✅ Version file generated: ${commitSha}`);
