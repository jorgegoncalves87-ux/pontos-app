# Pontos da Família — versão produto

Cópia da app de pontos para vender a várias famílias. Uma só instalação: cada família cria a sua conta
("Criar conta da família") e os dados de cada família ficam separados pelas regras em `firestore.rules`.

## Publicação
- O código é publicado no alojamento (cPanel) por FTP sempre que há alterações no ramo `main`
  (`.github/workflows/deploy.yml`). Segredos: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`.
- A app tem de ser servida por **HTTPS** (notificações e instalação no ecrã principal).

## Firebase (projeto próprio do produto, separado do da família)
1. Authentication → Método de login: **E-mail/senha** e **Anônimo**.
2. Firestore em `europe-west`, modo de produção; publicar as regras de `firestore.rules`.
3. Authentication → Settings → Domínios autorizados: o domínio do alojamento.
4. Configuração da app web em `firebase-config.js`; chave Web Push em `vapidKey`.

## Notificações
`notifier/notify.mjs` envia as notificações (validações, prémios, missões, lembrete das 19:45).
Em produção vai correr como tarefa agendada no alojamento; o workflow `notify.yml` só serve para testes manuais.
Precisa da chave da conta de serviço do Firebase (segredo `FIREBASE_SERVICE_ACCOUNT`) — nunca no repositório.

## Por fazer antes de vender
- Política de privacidade e termos; consentimento dos pais (RGPD, dados e fotos de crianças).
- Apagar a conta e todos os dados a pedido.
- Pagamentos / subscrições.
