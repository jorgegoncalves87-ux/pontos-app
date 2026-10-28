// Configuração da app web do Firebase do produto (Consola Firebase → Configurações do projeto → Seus apps).
// Estes valores não são secretos: a proteção dos dados vem das regras em firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCFzk046CscPS72bn9wgtPfLI7xPx5S-Y8",
  authDomain: "pontos-app-efe48.firebaseapp.com",
  projectId: "pontos-app-efe48",
  storageBucket: "pontos-app-efe48.firebasestorage.app",
  messagingSenderId: "1016728303200",
  appId: "1:1016728303200:web:bde8419a419c25934d3505",
};

// Chave pública para notificações (Configurações do projeto → Cloud Messaging → Certificados push da Web).
export const vapidKey = "BGjfPPFT1THmK-WP8D0Oq5z4kx_JrWvKkzZkqEDqx2pB4bsZkjUQU6AaJYgtDh8nhcoX4h4-81ngIHVbkHdnpVU";
