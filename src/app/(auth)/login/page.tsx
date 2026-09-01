import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { LogoMark } from "@/components/ui/logo";

export const metadata = { title: "Entrar — TrackApp" };

const FIELD =
  "w-full rounded-btn border border-hairline bg-surface px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-3 transition-colors duration-fast ease-standard focus:border-ink";

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
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <Card className="w-full max-w-sm p-6">
        <LogoMark className="size-11 rounded-[12px]" />
        <div className="mt-5 space-y-1">
          <h1 className="text-ink text-[28px] leading-8 font-bold tracking-[-0.022em]">TrackApp</h1>
          <p className="text-ink-2 text-[13px] leading-[18px]">Control de gastos sin fricción</p>
        </div>

        <form action={login} className="mt-6 space-y-2.5">
          <input name="email" type="email" required placeholder="Correo" className={FIELD} />
          <input
            name="password"
            type="password"
            required
            placeholder="Contraseña"
            className={FIELD}
          />
          <Button type="submit" block className="mt-1.5">
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
