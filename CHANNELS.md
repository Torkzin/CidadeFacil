# Preparação para canais externos

A criação de solicitações foi centralizada em `lib/requests/create-request.ts`. O painel administrativo e o Portal do Cidadão reutilizam esse caso de uso e registram a origem em `requests.source`.

Origens suportadas no modelo:

- `ADMIN_PORTAL`;
- `CITIZEN_PORTAL`;
- `WHATSAPP`;
- `API`;
- `OTHER`.

Não existe endpoint de WhatsApp ou API externa ativo nesta versão.

Uma integração futura deverá:

1. autenticar o provedor por credencial rotativa e assinatura de webhook;
2. resolver o município por configuração do canal, nunca por um `municipality_id` arbitrário do cliente;
3. identificar ou solicitar os dados mínimos do cidadão;
4. listar somente categorias públicas habilitadas;
5. chamar `createRequest()` com origem `WHATSAPP`;
6. validar mídias com as mesmas regras de assinatura e tamanho dos uploads atuais;
7. devolver protocolo e um mecanismo seguro de acompanhamento;
8. aplicar rate limit, idempotência, auditoria e política de retenção.

Antes da integração oficial ainda serão necessárias a escolha do provedor, validação jurídica/LGPD, política de opt-in, templates aprovados e gestão segura dos segredos do webhook.

