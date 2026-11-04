import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav
        name={session.name}
        roleLabel="Client reviewer"
        links={[{ href: "/portal", label: "My requisitions" }]}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
