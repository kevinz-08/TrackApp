import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export const metadata = { title: "Entrar — TrackApp" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");

  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={login} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">TrackApp</h1>
          <p className="text-sm opacity-60">Control de gastos sin fricción</p>
        </div>
        <input
          name="email"
          type="email"
          required
          placeholder="Correo"
          className="w-full rounded-lg border border-black/15 px-3 py-2 dark:border-white/20"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Contraseña"
          className="w-full rounded-lg border border-black/15 px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-[#1d9e75] px-3 py-2 font-medium text-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
