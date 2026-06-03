// Emite cualquier objeto como bloque JSON-LD <script type="application/ld+json">.
// Pensado para Organization, Course, EducationalOccupationalCredential, etc.
export function SchemaJsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
