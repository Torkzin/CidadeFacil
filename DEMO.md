# Roteiro de demonstração

## Preparação

Use somente em desenvolvimento ou homologação:

```bash
npm run db:migrate
npm run db:seed:demo
npm run dev
```

O seed de demonstração cria dados fictícios. Ele nunca é executado automaticamente no Compose de produção. Acesse o painel com `admin@cidadefacil.local` e `CidadeFacil@2026` apenas nesses ambientes.

## Cenário sugerido

1. Abra `/cidadao` em um celular ou janela anônima.
2. Selecione **Nova solicitação**, preencha a ocorrência, marque a localização e envie uma foto.
3. Copie o protocolo e o código de acompanhamento exibidos.
4. No painel interno, entre como administrador e abra **Solicitações**.
5. Localize o protocolo, altere para **Triagem** e encaminhe para a secretaria responsável.
6. Atribua uma equipe e altere para **Em andamento**.
7. Adicione comentário e foto de atendimento.
8. Conclua a solicitação.
9. Volte ao portal público, abra **Consultar protocolo** e informe protocolo e código.
10. Confira a timeline pública e registre uma avaliação de 1 a 5.
11. Abra `/executivo` e mostre os indicadores atualizados.
12. Abra `/auditoria` e filtre pelos eventos do protocolo.

Para validar automaticamente o mesmo cenário:

```bash
npm run test:pilot
```

