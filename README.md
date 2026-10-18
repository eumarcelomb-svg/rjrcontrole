# Rjrcontrole

Crie um aplicativo web de controle de frequência conforme o PDF em anexo da RJR Construção Naval, como se fosse uma planilha interativa:

- Armazenamento 100% no navegador via LocalStorage (sem necessidade de backend ou login).
- Interface estilo grade de planilha com alternância entre visão semanal (segunda a sexta) e visão mensal completa.
- Pré-carregar os colaboradores, CPFs e funções presentes no PDF anexo.
- Gerenciamento de colaboradores (adicionar, editar, desativar).
- Marcação ágil de frequência em cada célula (Presença, Falta, Justificada) com contagem automática de totais.
- Filtro por função e busca por nome/CPF.
- Exportação de relatórios para Excel (.xlsx) e PDF para impressão/assinatura.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rjrcontrole.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18d127a6-b2b6-4d4b-b384-cbdbc8a182b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
