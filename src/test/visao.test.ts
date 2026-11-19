import { describe, expect, it } from "vitest";
import { loadVisao, saveVisao, VISAO_PADRAO } from "@/lib/frequencia";

describe("Preferências de visualização da planilha", () => {
  it("volta ao padrão quando nada foi salvo", () => {
    localStorage.clear();
    expect(loadVisao()).toEqual(VISAO_PADRAO);
  });

  it("mantém a semana inteira ligada depois de recarregar", () => {
    localStorage.clear();
    saveVisao({ ...VISAO_PADRAO, semanaInteira: true });
    expect(loadVisao()).toEqual({ semanaInteira: true, totais: false });
  });

  it("ignora um valor inválido guardado no aparelho", () => {
    localStorage.clear();
    localStorage.setItem("rjr-freq-visao", "{isso não é json");
    expect(loadVisao()).toEqual(VISAO_PADRAO);
  });
});
