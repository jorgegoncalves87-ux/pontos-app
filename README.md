# SAS Kids — versão produto

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
`notifier-php/notify.php` envia as notificações (validações, prémios, missões, lembrete das 19:45). É publicado
com a app mas está bloqueado ao público (`.htaccess` e só corre na linha de comandos) e corre num Cron Job do cPanel:

    */5 * * * *  /usr/local/bin/php /home/sfpo/public_html/pontos.sfpo.pt/notifier-php/notify.php >> /home/sfpo/pontos-secrets/notify.log 2>&1

A chave da conta de serviço do Firebase fica em `/home/sfpo/pontos-secrets/service-account.json` (fora da pasta
pública, permissões 600) — nunca no repositório. `notifier/notify.mjs` é a versão Node equivalente (testes).

## Por fazer antes de vender
- Política de privacidade e termos; consentimento dos pais (RGPD, dados e fotos de crianças).
- Apagar a conta e todos os dados a pedido.
- Pagamentos / subscrições.
