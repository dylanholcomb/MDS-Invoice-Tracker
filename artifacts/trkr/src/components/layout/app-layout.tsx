import { Sidebar } from "./sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 overflow-auto">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
