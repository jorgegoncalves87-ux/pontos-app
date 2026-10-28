<?php
// Emails da SAS Kids (confirmar email e repor a password), com o desenho da app.
// HTML de email "à antiga" (tabelas e estilos inline): é o que o Gmail, o Outlook e o Mail do iPhone mostram bem.
// O logo e a mascote vão em PNG (os programas de email não mostram SVG nem carregam tipos de letra).

const MAIL_TEXT = [
    'pt' => [
        'verify_subject' => 'Confirma o teu email na SAS Kids',
        'verify_title' => 'Falta só confirmar o teu email!',
        'verify_intro' => 'Obrigado por criares a família na SAS Kids. Toca no botão para confirmar que este email é teu.',
        'verify_button' => 'Confirmar email',
        'verify_outro' => 'Se não foste tu que criaste esta conta, ignora este email.',
        'reset_subject' => 'Repor a password da SAS Kids',
        'reset_title' => 'Vamos escolher uma password nova',
        'reset_intro' => 'Pediste para repor a password da conta {email}. Toca no botão para escolher uma nova.',
        'reset_button' => 'Escolher password nova',
        'reset_outro' => 'Se não pediste isto, ignora este email: a tua password continua a mesma.',
        'expire' => 'O link é válido durante 1 hora.',
        'fallback' => 'Se o botão não funcionar, copia este endereço para o navegador:',
        'footer' => 'SAS Kids · tarefas que valem pontos e prémios',
        'privacy' => 'Política de Privacidade',
    ],
    'es' => [
        'verify_subject' => 'Confirma tu correo en SAS Kids',
        'verify_title' => '¡Solo falta confirmar tu correo!',
        'verify_intro' => 'Gracias por crear tu familia en SAS Kids. Toca el botón para confirmar que este correo es tuyo.',
        'verify_button' => 'Confirmar correo',
        'verify_outro' => 'Si no creaste esta cuenta, ignora este correo.',
        'reset_subject' => 'Restablecer la contraseña de SAS Kids',
        'reset_title' => 'Vamos a elegir una contraseña nueva',
        'reset_intro' => 'Has pedido restablecer la contraseña de la cuenta {email}. Toca el botón para elegir una nueva.',
        'reset_button' => 'Elegir contraseña nueva',
        'reset_outro' => 'Si no lo has pedido, ignora este correo: tu contraseña sigue siendo la misma.',
        'expire' => 'El enlace es válido durante 1 hora.',
        'fallback' => 'Si el botón no funciona, copia esta dirección en el navegador:',
        'footer' => 'SAS Kids · tareas que valen puntos y premios',
        'privacy' => 'Política de privacidad',
    ],
    'fr' => [
        'verify_subject' => 'Confirme ton e-mail sur SAS Kids',
        'verify_title' => 'Il ne reste qu’à confirmer ton e-mail !',
        'verify_intro' => 'Merci d’avoir créé ta famille sur SAS Kids. Touche le bouton pour confirmer que cet e-mail est bien le tien.',
        'verify_button' => 'Confirmer l’e-mail',
        'verify_outro' => 'Si tu n’as pas créé ce compte, ignore cet e-mail.',
        'reset_subject' => 'Réinitialiser le mot de passe SAS Kids',
        'reset_title' => 'Choisissons un nouveau mot de passe',
        'reset_intro' => 'Tu as demandé à réinitialiser le mot de passe du compte {email}. Touche le bouton pour en choisir un nouveau.',
        'reset_button' => 'Choisir un nouveau mot de passe',
        'reset_outro' => 'Si tu n’as rien demandé, ignore cet e-mail : ton mot de passe reste le même.',
        'expire' => 'Le lien est valable 1 heure.',
        'fallback' => 'Si le bouton ne marche pas, copie cette adresse dans ton navigateur :',
        'footer' => 'SAS Kids · des tâches qui valent des points et des récompenses',
        'privacy' => 'Politique de confidentialité',
    ],
    'it' => [
        'verify_subject' => 'Conferma la tua email su SAS Kids',
        'verify_title' => 'Manca solo la conferma della tua email!',
        'verify_intro' => 'Grazie per aver creato la tua famiglia su SAS Kids. Tocca il pulsante per confermare che questa email è tua.',
        'verify_button' => 'Conferma email',
        'verify_outro' => 'Se non hai creato tu questo account, ignora questa email.',
        'reset_subject' => 'Reimposta la password di SAS Kids',
        'reset_title' => 'Scegliamo una nuova password',
        'reset_intro' => 'Hai chiesto di reimpostare la password dell’account {email}. Tocca il pulsante per sceglierne una nuova.',
        'reset_button' => 'Scegli una nuova password',
        'reset_outro' => 'Se non l’hai chiesto tu, ignora questa email: la tua password resta la stessa.',
        'expire' => 'Il link è valido per 1 ora.',
        'fallback' => 'Se il pulsante non funziona, copia questo indirizzo nel browser:',
        'footer' => 'SAS Kids · compiti che valgono punti e premi',
        'privacy' => 'Informativa sulla privacy',
    ],
    'en' => [
        'verify_subject' => 'Confirm your email for SAS Kids',
        'verify_title' => 'Just one more step: confirm your email!',
        'verify_intro' => 'Thanks for creating your family on SAS Kids. Tap the button to confirm this email address is yours.',
        'verify_button' => 'Confirm email',
        'verify_outro' => 'If you didn’t create this account, you can ignore this email.',
        'reset_subject' => 'Reset your SAS Kids password',
        'reset_title' => 'Let’s choose a new password',
        'reset_intro' => 'You asked to reset the password for {email}. Tap the button to choose a new one.',
        'reset_button' => 'Choose a new password',
        'reset_outro' => 'If you didn’t ask for this, ignore this email: your password stays the same.',
        'expire' => 'The link is valid for 1 hour.',
        'fallback' => 'If the button doesn’t work, copy this address into your browser:',
        'footer' => 'SAS Kids · chores that earn points and rewards',
        'privacy' => 'Privacy Policy',
    ],
    'zh' => [
        'verify_subject' => '确认你的 SAS Kids 邮箱',
        'verify_title' => '只差最后一步：确认你的邮箱！',
        'verify_intro' => '感谢你在 SAS Kids 创建家庭。点按下面的按钮，确认这个邮箱是你的。',
        'verify_button' => '确认邮箱',
        'verify_outro' => '如果这个账户不是你创建的，请忽略这封邮件。',
        'reset_subject' => '重置 SAS Kids 密码',
        'reset_title' => '一起设置新密码吧',
        'reset_intro' => '你申请重置账户 {email} 的密码。点按下面的按钮设置新密码。',
        'reset_button' => '设置新密码',
        'reset_outro' => '如果不是你本人申请，请忽略这封邮件：你的密码不会改变。',
        'expire' => '链接 1 小时内有效。',
        'fallback' => '如果按钮无法使用，请把这个地址复制到浏览器中：',
        'footer' => 'SAS Kids · 完成任务，赢取积分和奖励',
        'privacy' => '隐私政策',
    ],
];

/** [assunto, html, texto simples] do email $kind ('verify' ou 'reset'). */
function renderMail(string $kind, string $lang, string $link, string $email, string $site = 'https://saskids.net/'): array {
    $T = MAIL_TEXT[$lang] ?? MAIL_TEXT['en'];
    $e = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $t = fn($k) => str_replace('{email}', $email, $T[$k]);
    $privacy = $site . ($lang === 'pt' ? 'privacidade.html' : "privacy-$lang.html");
    $font = "'Nunito','Varela Round','Arial Rounded MT Bold','Helvetica Neue',Arial,sans-serif";
    $html = '<!doctype html><html lang="' . $e($lang) . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="color-scheme" content="light"><title>' . $e($t("{$kind}_subject")) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#fffdf8;">'
        . '<div style="display:none;max-height:0;overflow:hidden;">' . $e($t("{$kind}_intro")) . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8;"><tr><td align="center" style="padding:28px 12px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">'
        . '<tr><td align="center" style="padding:0 0 18px;"><img src="' . $site . 'illustrations/email/logo.png" width="174" height="38" alt="SAS Kids" style="display:block;border:0;"></td></tr>'
        . '<tr><td style="background:#ffffff;border:2px solid #d8f3e8;border-radius:28px;padding:30px 28px 26px;font-family:' . $font . ';color:#2f3657;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#e6f6ff;border-radius:22px;padding:18px 0 10px;">'
        . '<img src="' . $site . 'illustrations/email/mascote.png" width="110" height="136" alt="" style="display:block;border:0;"></td></tr></table>'
        . '<h1 style="font-family:' . $font . ';font-size:24px;line-height:1.25;font-weight:800;margin:22px 0 10px;text-align:center;color:#2f3657;">' . $e($t("{$kind}_title")) . '</h1>'
        . '<p style="font-size:16px;line-height:1.55;margin:0 0 22px;text-align:center;color:#646b8a;">' . $e($t("{$kind}_intro")) . '</p>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr><td align="center" bgcolor="#1fa5a8" style="border-radius:999px;">'
        . '<a href="' . $e($link) . '" style="display:inline-block;padding:15px 30px;font-family:' . $font . ';font-size:17px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;">' . $e($t("{$kind}_button")) . '</a>'
        . '</td></tr></table>'
        . ($kind === 'reset' ? '<p style="font-size:13px;line-height:1.5;margin:18px 0 0;text-align:center;color:#646b8a;">' . $e($T['expire']) . '</p>' : '')
        . '<p style="font-size:14px;line-height:1.5;margin:22px 0 0;padding-top:18px;border-top:2px solid #f1eee6;text-align:center;color:#646b8a;">' . $e($t("{$kind}_outro")) . '</p>'
        . '<p style="font-size:12px;line-height:1.5;margin:14px 0 0;color:#9aa0bb;word-break:break-all;">' . $e($T['fallback']) . '<br><a href="' . $e($link) . '" style="color:#13878a;">' . $e($link) . '</a></p>'
        . '</td></tr>'
        . '<tr><td align="center" style="padding:18px 0 0;font-family:' . $font . ';font-size:12px;line-height:1.6;color:#9aa0bb;">' . $e($T['footer'])
        . '<br><a href="' . $e($privacy) . '" style="color:#13878a;">' . $e($T['privacy']) . '</a> · Jag Baco, Lda. · Requião, Portugal</td></tr>'
        . '</table></td></tr></table></body></html>';
    $text = $t("{$kind}_title") . "\n\n" . $t("{$kind}_intro") . "\n\n" . $link . "\n\n" . ($kind === 'reset' ? $T['expire'] . "\n\n" : '') . $t("{$kind}_outro") . "\n\n— SAS Kids";
    return [$t("{$kind}_subject"), $html, $text];
}
