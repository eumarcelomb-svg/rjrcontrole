import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolhaPage } from "@/components/folha-page";
import { carregar } from "@/lib/nuvem";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import logo from "@/assets/rjr-logo.jpg.asset.json";

const folhaQuery = queryOptions({ queryKey: ["frequencia-folha"], queryFn: carregar, staleTime: 0, retry: 2 });

export const Route = createFileRoute("/folha")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(folhaQuery),
  head: () => ({
    meta: [
      { title: "Fechamento da folha — RJR Construção Naval" },
      { name: "description", content: "Fechamento quinzenal da folha, ajustes de horas extras e PDFs dos pagamentos da RJR Construção Naval." },
      { property: "og:title", content: "Fechamento da folha — RJR Construção Naval" },
      { property: "og:description", content: "Pagamentos dos dias 05 e 20, histórico de folhas fechadas e recibos individuais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" }],
  }),
  pendingComponent: () => <main className="p-6 text-muted-foreground">Carregando folha de pagamento…</main>,
  errorComponent: FolhaError,
  component: FechamentoFolha,
});

function FolhaError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tentando, setTentando] = useState(false);
  useEffect(() => { reportLovableError(error, { boundary: "fechamento_folha" }); }, [error]);
  async function tentar() {
    setTentando(true);
    try {
      await queryClient.resetQueries({ queryKey: folhaQuery.queryKey, exact: true });
      await router.invalidate();
      reset();
    } finally { setTentando(false); }
  }
  return <main className="mx-auto max-w-xl space-y-4 p-6">
    <h1 className="text-xl font-bold">Fechamento da folha indisponível</h1>
    <p role="alert">Não foi possível carregar os dados. Verifique sua conexão e tente novamente.</p>
    <div className="flex flex-wrap gap-2">
      <Button disabled={tentando} onClick={() => void tentar().catch(() => {})}><RotateCw />Tentar novamente</Button>
      <Button variant="outline" asChild><Link to="/"><ArrowLeft />Frequência</Link></Button>
    </div>
  </main>;
}

function FechamentoFolha() {
  const { data } = useSuspenseQuery(folhaQuery);
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <img src={logo.url} alt="RJR Construção Naval" className="h-10 w-auto" />
        <div className="mr-auto min-w-0"><h1 className="text-xl font-bold">Fechamento da folha</h1><p className="text-xs text-muted-foreground">RJR Construção Naval</p></div>
        <Button variant="outline" asChild><Link to="/"><ArrowLeft />Frequência</Link></Button>
      </div>
    </header>
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6"><FolhaPage {...data} /></main>
  </div>;
}