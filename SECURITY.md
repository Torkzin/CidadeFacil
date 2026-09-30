# Segurança do CidadeFácil

## Controles implementados

- sessões aleatórias persistidas apenas por hash no PostgreSQL;
- cookie `HttpOnly`, `SameSite=Lax`, prazo de sete dias e `Secure` em produção;
- logout remove a sessão no banco;
- bloqueio de usuários inativos;
- RBAC validado nas APIs, com escopo por município, secretaria e equipe;
- respostas `404` para recursos de outro escopo, reduzindo enumeração;
- consulta pública protegida por token aleatório armazenado somente como hash;
- rate limit configurável para login, criação/consulta pública e uploads;
- imagens limitadas a JPG, PNG e WEBP, com conferência da assinatura binária;
- nomes internos aleatórios e anexos servidos por rotas autenticadas;
- headers CSP, clickjacking, MIME sniffing, referrer e permissões do navegador;
- auditoria sem senhas ou tokens, com IP pseudonimizado por hash e salt;
- PostgreSQL sem porta pública no Compose de produção.

## Limitações operacionais

O rate limit atual fica em memória e é adequado à implantação de instância única prevista para o piloto. Antes de escalar horizontalmente, mova os contadores para Redis ou serviço equivalente. Os anexos permanecem no volume da VPS; para alta disponibilidade, use armazenamento de objetos com antivírus e política de retenção.

Defina um `AUDIT_IP_SALT` aleatório em cada ambiente. Logs de aplicação filtram chaves com nomes sensíveis, mas a operação deve encaminhá-los somente a uma plataforma com controle de acesso e retenção.

Relate vulnerabilidades de forma privada ao responsável técnico da prefeitura. Não inclua dados reais de cidadãos em relatórios de erro.

