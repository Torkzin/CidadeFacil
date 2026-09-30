# Aplicativos instaláveis do CidadeFácil

O projeto publica dois PWAs no mesmo domínio:

| Aplicativo | Entrada | Manifesto | Escopo |
| --- | --- | --- | --- |
| CidadeFácil Cidadão | `/cidadao` | `/manifest-cidadao.webmanifest` | `/cidadao/` |
| CidadeFácil Gestão | `/login` e `/dashboard` | `/manifest-gestao.webmanifest` | `/` |

## Instalação

- Android e Chrome no computador: abra a área desejada e use **Instalar app**.
- iPhone e iPad: abra a área desejada, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
- O navegador exige a confirmação da pessoa e não permite instalação silenciosa.

## Atualizações

O service worker é registrado somente no build de produção, verifica atualizações ao abrir o sistema e repete a verificação a cada hora. O cache mantém apenas a experiência pública e as páginas de contingência; páginas administrativas autenticadas não são armazenadas.

## Ícones

Os arquivos instaláveis ficam em `public/icons/cidadao` e `public/icons/gestao`. Para regenerá-los:

```bash
node scripts/generate-pwa-icons.mjs
```

## Requisitos para distribuição

- HTTPS válido;
- endereço estável;
- service worker acessível em `/sw.js`;
- manifestos e ícones públicos.

O túnel temporário serve para homologação. Um aplicativo instalado por um endereço `trycloudflare.com` deixará de abrir quando o túnel for encerrado ou o endereço mudar. Para distribuição definitiva, use domínio próprio e hospedagem permanente.
