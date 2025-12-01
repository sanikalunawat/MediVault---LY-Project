# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

Set these environment variables for local development and deployment.

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

### Encryption

- ENCRYPTION_KEY: base64-encoded 32 bytes for AES-256-GCM application-layer encryption.

Generate a key:

```
openssl rand -base64 32
```

This key is required by server-side modules to encrypt and decrypt sensitive health record data.
