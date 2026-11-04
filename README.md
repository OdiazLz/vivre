# Vivre — Gestión inteligente para condominios

Vivre es una plataforma SaaS multi-condominio para administrar cuotas, pagos, residentes, visitas, estacionamiento, asambleas y comunicación vecinal. Incluye un bot de WhatsApp con IA para que los residentes consulten su información sin instalar ninguna app.

🔗 **Demo:** https://vivre-web-htn4.onrender.com/

> La demo está en el plan gratuito de Render. La primera carga puede tardar entre 30 y 60 segundos mientras el servidor despierta.

<img width="2055" height="1264" alt="Pantalla de inicio de sesión de Vivre" src="https://github.com/user-attachments/assets/f014cf34-064b-4765-ad96-a2af7985f512" />

<img alt="Dashboard con recaudación mensual y comprobantes" src="https://github.com/user-attachments/assets/58b6bc52-f561-4691-adb4-4778420f5a9b" />

<img alt="Configuración de cuotas, datos de pago y reglamento" src="https://github.com/user-attachments/assets/f8988abb-b11b-420a-afe6-7be13eb82150" />

## Funcionalidades

**Administración del condominio**
- Dashboard con métricas de recaudación y actividad reciente
- Generación automática de cuotas mensuales con tareas programadas
- Registro de pagos en efectivo y por transferencia, pagos parciales y saldos a favor
- Revisión de comprobantes de pago y notificaciones al residente
- Multas, incidencias y bitácora de obras y mejoras
- Reportes en PDF

**Comunidad**
- Padrón de residentes, departamentos y mascotas, con importación desde Excel
- Control de visitas y monitor de cajones de estacionamiento
- Eventos y reservas
- Asambleas con votaciones
- Comunicados y avisos masivos
- Reglamento interior versionado

**Bot de WhatsApp (Meta Cloud API)**
- Registro de residentes por WhatsApp
- Menú rápido con botones y listas interactivas
- Consulta de saldo, estado de cuenta, datos de pago, eventos, cajones, votaciones y reglamento
- Envío de comprobantes de pago directamente desde el chat

**Inteligencia artificial (OpenAI)**
- Clasificación de la intención de los mensajes del residente, con salida estructurada en JSON. Las acciones sensibles, como pagos o votos, siempre se validan en el backend.
- Extracción automática del reglamento interior desde una imagen o un PDF, que queda como borrador para revisión humana

**Plataforma**
- Multi-tenant: cada condominio tiene sus datos aislados
- Roles: superadministrador, presidente, comité y residente
- Licencias y suspensión de condominios desde el panel de superadministrador
- Respaldos automáticos de la base de datos

---

## Stack

| Capa | Tecnologías |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Base de datos | PostgreSQL 16 |
| Archivos | AWS S3 (o cualquier almacenamiento compatible con S3) |
| Integraciones | WhatsApp Business Cloud API, OpenAI API |
| Seguridad | JWT, bcrypt, Helmet, express-rate-limit, validación de firma de webhooks de Meta, bitácora de auditoría |
| Despliegue | Render, Docker (entorno local) |

---

## Estructura del proyecto

```
vivre/
├── SaaSC-F/    # Frontend (React + Vite)
├── SaaSC-B/    # Backend / API REST (Express)
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── repositories/   # Acceso a datos (PostgreSQL)
│       ├── services/       # WhatsApp, IA, pagos, PDF, cron, almacenamiento
│       └── middleware/     # Auth, auditoría, errores, firma de WhatsApp
└── SaaSC-db/   # docker-compose y scripts SQL de la base de datos
```

---

## Instalación local

### Requisitos
- Node.js 20 o superior
- Docker y Docker Compose

### 1. Base de datos

```bash
cd SaaSC-db
docker compose up -d
```

Al iniciar por primera vez, Docker ejecuta en orden los scripts de `SaaSC-db/scripts`.

### 2. Backend

```bash
cd SaaSC-B
npm install
cp .env.example .env   # y llena los valores
npm run dev
```

La API corre en `http://localhost:3000`.

### 3. Frontend

```bash
cd SaaSC-F
npm install
echo "VITE_API_URL=http://localhost:3000" > .env
npm run dev
```

La app corre en `http://localhost:5173`.

---

## Variables de entorno (backend)

| Variable | Descripción |
| --- | --- |
| `PORT` | Puerto de la API (por defecto 3000) |
| `NODE_ENV` | `development` o `production` |
| `PUBLIC_BASE_URL` | URL pública de la API (HTTPS en producción) |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CORS, separados por comas |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `DB_POOL_MAX` | Conexiones máximas del pool (por defecto 10) |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` para aceptar certificados autofirmados |
| `JWT_SECRET` | Secreto para firmar tokens (mínimo 32 caracteres en producción) |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Cuenta inicial del superadministrador |
| `OPENAI_API_KEY` | API key de OpenAI (opcional, activa las funciones de IA) |
| `OPENAI_MODEL` | Modelo de OpenAI a usar |
| `META_APP_SECRET` | Secreto de la app de Meta, para validar webhooks |
| `WHATSAPP_TOKEN` | Token de acceso de WhatsApp Cloud API |
| `PHONE_NUMBER_ID` | ID del número de WhatsApp Business |
| `WHATSAPP_PUBLIC_NUMBER` | Número público que verán los residentes |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook |
| `WHATSAPP_PAYMENT_PROOF_TEMPLATE` | Plantilla para notificar comprobantes |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Idioma de las plantillas (por defecto `es_MX`) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` | Almacenamiento de archivos en S3 |
| `AWS_ENDPOINT`, `AWS_FORCE_PATH_STYLE` | Opcionales, para almacenamiento compatible con S3 |

El webhook de WhatsApp se expone en `GET/POST /webhook`.

---

## Autor

**Oscar Uriel Díaz Lazcano**, desarrollador Full Stack
[LinkedIn](https://linkedin.com/in/oscar-uriel-diazlazcano) · [GitHub](https://github.com/OdiazLz) · oscarudlazcano@gmail.com
