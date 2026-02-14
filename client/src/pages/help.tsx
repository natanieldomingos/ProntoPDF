import React from "react";
import AppShell from "@/components/app-shell";
import { Shield, ScanLine, Pencil, FileDown } from "lucide-react";

export default function Help() {
  return (
    <AppShell>
      <div className="min-h-screen bg-background p-6 flex flex-col max-w-md mx-auto">
        <header className="pt-4 pb-6">
          <h1 className="text-2xl font-bold font-display">Ajuda</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Um guia rápido para digitalizar, editar e exportar sem dor de cabeça.
          </p>
        </header>

        <main className="flex-1 space-y-3">
          <section className="bg-white p-5 shadow-paper border border-border rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <ScanLine className="w-4 h-4 text-primary" />
              Digitalizar
            </div>
            <p className="text-sm text-muted-foreground">
              Na aba <strong>Início</strong>, toque em <strong>Digitalizar</strong>. O app ajusta o documento (recorte e melhoria) e salva no seu histórico.
            </p>
          </section>

          <section className="bg-white p-5 shadow-paper border border-border rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Pencil className="w-4 h-4 text-primary" />
              Editar
            </div>
            <p className="text-sm text-muted-foreground">
              Abra um documento, vá em <strong>Editar</strong> e ajuste o texto reconhecido. Ideal para currículos, contratos e formulários.
            </p>
          </section>

          <section className="bg-white p-5 shadow-paper border border-border rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <FileDown className="w-4 h-4 text-primary" />
              Exportar
            </div>
            <p className="text-sm text-muted-foreground">
              Em <strong>Exportar</strong>, escolha PDF (com ou sem texto pesquisável), Word (DOCX), Texto (TXT) ou Página (HTML).
            </p>
          </section>

          <section className="bg-muted p-5 border border-border/60 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="w-4 h-4" />
              Privacidade
            </div>
            <p className="text-sm text-muted-foreground">
              O processamento é feito no seu dispositivo. Nada é enviado automaticamente para servidor.
            </p>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
