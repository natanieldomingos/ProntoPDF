import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Terms() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col max-w-3xl mx-auto">
      <header className="mb-6 pt-8">
        <h1 className="text-3xl font-bold font-display tracking-tight">Termos de Uso</h1>
        <p className="text-muted-foreground mt-2">
          Termos simples: use o app para digitalizar e organizar seus documentos. Você é responsável pelo conteúdo e pelo compartilhamento.
        </p>
      </header>

      <main className="space-y-6 text-sm leading-6 text-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Uso do app</h2>
          <p>
            O ProntoPDF deve ser utilizado para digitalização e organização de documentos de forma legítima, respeitando leis aplicáveis e direitos de terceiros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Seus documentos</h2>
          <p>
            Os documentos ficam no seu aparelho e só são compartilhados quando você escolher.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Responsabilidade do usuário</h2>
          <p>
            Você é responsável pela guarda dos seus dados, backups e pela revisão do conteúdo exportado antes de compartilhamento.
          </p>
        </section>
      </main>

      <footer className="mt-8">
        <Button variant="outline" onClick={() => setLocation("/")}>Voltar para início</Button>
      </footer>
    </div>
  );
}
