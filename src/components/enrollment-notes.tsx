import { Card } from "@/components/ui";

/// Notas legales del proceso de certificación de personas (ISO/IEC 17024).
/// Se muestran al candidato durante la inscripción.
export function EnrollmentNotes() {
  return (
    <Card className="mb-6 border-l-4 border-l-brand-600 p-5">
      <h2 className="text-sm font-semibold text-slate-900">Notas importantes del proceso de certificación</h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-600">
        <li className="flex gap-2">
          <span className="mt-0.5 text-brand-600">•</span>
          <span>
            El servicio de certificación es un <strong>proceso voluntario</strong> que adelanta el
            solicitante y que es concertado con el Organismo de Certificación de Personas, en el cual
            el solicitante debe demostrar que, en su desempeño laboral, cumple con los estándares
            definidos en las Normas de Competencia Laboral.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-brand-600">•</span>
          <span>
            Como ente Certificador de Personas, <strong>garantizamos la confidencialidad</strong> sobre
            la información suministrada.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-brand-600">•</span>
          <span>
            Cada tipo de certificación es <strong>independiente</strong> y requiere de evidencias
            específicas.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-0.5 text-brand-600">•</span>
          <span>
            El pago corresponde al <strong>derecho a la evaluación</strong>; no garantiza la
            obtención de la certificación, la cual depende del resultado del proceso.
          </span>
        </li>
      </ul>
    </Card>
  );
}
