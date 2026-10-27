// Configuração da app web do Firebase do produto (Consola Firebase → Configurações do projeto → Seus apps).
// Estes valores não são secretos: a proteção dos dados vem das regras em firestore.rules.
export const firebaseConfig = {
  apiKey: "COLOCA_AQUI",
  authDomain: "COLOCA_AQUI.firebaseapp.com",
  projectId: "COLOCA_AQUI",
  storageBucket: "COLOCA_AQUI.firebasestorage.app",
  messagingSenderId: "COLOCA_AQUI",
  appId: "COLOCA_AQUI",
};

// Chave pública para notificações (Configurações do projeto → Cloud Messaging → Certificados push da Web).
export const vapidKey = "";
