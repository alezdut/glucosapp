import Link from "next/link";
import { releaseInfo } from "@glucosapp/theme";

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Glucosapp {releaseInfo.version}</h1>
      <p>
        Software experimental para seguimiento de glucosa y comunicación entre pacientes y
        profesionales.
      </p>
      <p>
        No ha sido validado clínicamente. Se distribuye sin garantía y no reemplaza el criterio
        médico profesional.
      </p>
      <p>Copyright © 2025–2026 Alejandro Zdut y colaboradores.</p>
      <ul className="space-y-3 underline">
        <li>
          <a href={releaseInfo.source}>Código fuente de esta versión</a>
        </li>
        <li>
          <a href={releaseInfo.licenseUrl}>Licencia AGPL-3.0</a>
        </li>
        <li>
          <a href={releaseInfo.noticesUrl}>Atribuciones y licencias de terceros</a>
        </li>
      </ul>
      <p>
        El componente MDI conserva su licencia MIT. Las demás dependencias mantienen sus licencias
        originales.
      </p>
      <Link href="/dashboard" className="inline-block underline">
        Volver al dashboard
      </Link>
    </main>
  );
}
