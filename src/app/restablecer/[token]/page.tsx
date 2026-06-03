import Link from "next/link";
import { ResetForm } from "@/components/reset-form";

export const metadata = { title: "Restablecer contraseña" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "CIOC";

export default async function RestablecerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <Link href="/" className="text-2xl font-bold tracking-tight">{APP_NAME}</Link>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">Nueva contraseña</h1>
          <p className="mb-6 text-sm text-slate-500">Defina una nueva contraseña para su cuenta.</p>
          <ResetForm token={token} />
        </div>
      </div>
    </div>
  );
}
