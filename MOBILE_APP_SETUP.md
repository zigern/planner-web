# Planqly Mobile (Android + iOS)

Esta base já está preparada em modo PWA instalável e com configuração para empacotar app nativa com Capacitor.

## 1) PWA instalável (sem loja)
- Android: Chrome mostra opção de instalar.
- iOS: Safari -> Partilhar -> Adicionar ao ecrã principal.

## 2) Empacotar para Play Store e App Store (Capacitor)
No projeto:

```bash
npm install
npx cap add android
npx cap add ios
npm run mobile:sync
```

Depois abrir projetos nativos:

```bash
npm run mobile:open:android
npm run mobile:open:ios
```

## 3) Publicação
- Android: publicar AAB na Google Play Console.
- iOS: publicar via Xcode/TestFlight na App Store Connect.

## Nota técnica desta configuração
- A app mobile usa o website publicado em produção (`server.url` no `capacitor.config.ts`).
- Isto permite lançar Android e iOS já, sem reescrever o frontend.
