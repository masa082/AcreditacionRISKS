import Link from "next/link";

export const metadata = { title: "Política de privacidad" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-brand-700 hover:underline">← {APP_NAME}</Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Política de tratamiento de datos personales</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
        <p>
          De conformidad con la Ley 1581 de 2012 y normas concordantes, los datos personales se tratan únicamente
          para las finalidades del proceso de evaluación y certificación de personas.
        </p>
        <h2 className="pt-2 text-base font-semibold text-slate-800">Finalidades</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Gestión del proceso de evaluación y certificación.</li>
          <li>Verificación de la información y los documentos aportados.</li>
          <li>Emisión y verificación pública de certificados.</li>
          <li>Conservación de evidencias para auditoría y acreditación (mínimo 5 años).</li>
          <li>Comunicaciones y recordatorios relacionados con el proceso.</li>
        </ul>
        <h2 className="pt-2 text-base font-semibold text-slate-800">Derechos del titular</h2>
        <p>
          El titular puede conocer, actualizar, rectificar y solicitar la supresión de sus datos, así como revocar
          la autorización, a través de los canales del organismo certificador correspondiente.
        </p>
        <h2 className="pt-2 text-base font-semibold text-slate-800">Evidencia de aceptación</h2>
        <p>
          La plataforma registra la fecha, hora, IP, versión de la política y las finalidades aceptadas como
          evidencia digital del consentimiento.
        </p>
        <p className="pt-4 text-xs text-slate-400">Cada organismo certificador (suscriptor) publica su propia política dentro de su proceso.</p>
      </div>
    </main>
  );
}
