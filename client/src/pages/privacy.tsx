import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col max-w-3xl mx-auto">
      <header className="mb-6 pt-8">
        <h1 className="text-3xl font-bold font-display tracking-tight">Política de Privacidade</h1>
        <p className="text-muted-foreground mt-2">
          Seus documentos ficam com você. O ProntoPDF processa e salva no seu aparelho. Ele só envia algo para a internet quando você escolhe compartilhar/exportar.
        </p>
      </header>

      <main className="space-y-6 text-sm leading-6 text-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. O que o app faz</h2>
          <p>
            O ProntoPDF captura imagens, ajusta o documento (recorte/legibilidade), organiza suas páginas e permite exportar em formatos comuns.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Onde seus dados ficam</h2>
          <p>
            Seus documentos ficam guardados no armazenamento do seu navegador/celular. Você pode excluir tudo a qualquer momento em <strong>Arquivos</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Compartilhamento</h2>
          <p>
            O app não envia documentos automaticamente para servidores. Quando você toca em <strong>Compartilhar</strong> ou <strong>Baixar</strong>, o arquivo é gerado no seu aparelho e você decide para quem enviar.
          </p>
        </section>
      </main>

      <footer className="mt-8">
        <Button variant="outline" onClick={() => setLocation("/")}>Voltar para início</Button>
      </footer>
    </div>
  );
}
