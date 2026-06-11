# Configuración CORS del bucket S3 (Railway / S3-compatible)

Para que la **subida directa desde el navegador** del candidato funcione
(presigned PUT URL), el bucket de almacenamiento debe permitir CORS
desde el dominio de la app.

## Política CORS recomendada

```json
[
  {
    "AllowedOrigins": [
      "https://www.okacreditado.com",
      "https://okacreditado.com",
      "http://localhost:3100"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Cómo aplicarla en Railway Bucket

1. Entre al servicio del bucket en el dashboard de Railway.
2. Tab "Settings" → "CORS Configuration".
3. Pegue el JSON anterior y guarde.

## Cómo aplicarla en AWS S3 / R2 / cualquier S3-compatible

Con AWS CLI:

```bash
aws s3api put-bucket-cors \
  --bucket "$STORAGE_S3_BUCKET" \
  --cors-configuration file://cors.json \
  --endpoint-url "$STORAGE_S3_ENDPOINT"
```

Donde `cors.json` contiene el bloque de arriba (envuelto en
`{"CORSRules": [...]}` para CLI de AWS).

## Síntoma cuando CORS falta

- Console del navegador: `Access to XMLHttpRequest at 'https://bucket.../...'
  from origin 'https://www.okacreditado.com' has been blocked by CORS policy`.
- La barra de progreso del componente queda en 0 % y el candidato ve
  "Error de red durante la subida".

## Fallback automático

Si por alguna razón el bucket no acepta PUT directo, el componente
detecta el fallo y muestra el error. En ese caso el suscriptor puede
configurar CORS o, como alternativa temporal, eliminar la
configuración de S3 y el sistema cae al método clásico (FormData →
serverless), limitado a 4.5 MB en plan Hobby de Vercel.
