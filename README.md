# WhatsApp Business Bot with Google Sheets Integration

A professional, modular WhatsApp Business Cloud API integration built on top of Meta's **Jasper's Market** architecture, deployed and hosted on **Render**. This bot features interactive navigation, dynamic template handling, multi-step conversational flows, and persistent data storage using Google Sheets.

## 🚀 Key Features

* **Jasper's Market Architecture**: Built following the official modular patterns (`GraphApi`, `Cache`, `Conversation` state engine, and custom payload builders).

* **Cloud Deployment on Render**: Hosted on Render with full support for environment variables, background process management, and automated webhook handling.

* **Multi-Step Form Engine**: Interactive state machine managing sequential user inputs (Name, Surname, Age) with Redis caching.

* **Interactive UI**: Native WhatsApp buttons (`reply`) for seamless user confirmation (`YES`/`NO`) during conversational review steps.

* **Google Sheets API Integration**: Enterprise-grade service account integration using `googleapis` to automatically log user submissions with formatted timestamps into Google Sheets.

* **Resilient Infrastructure**: Protected API calls, automatic fallback mechanisms, and robust private key string handling specifically tuned for Render environment variables.

## ⚙️ Deployment & Environment Variables (Render)

When deploying to **Render**, configure the following Environment Variables in your Render Web Service dashboard:

```env
# Meta WhatsApp API | Facebook Config
ACCESS_TOKEN=ADD_APP_TOKEN
APP_SECRET=ADD_APP_SECRET
APP_ID=ADD_APP_ID
VERIFY_TOKEN=ADD_VERIFY_TOKEN
PHONE_NUMBER_ID=ADD_PHONE_NUMBER_ID
VERSION=API_ADD_VERSION

# Redis
REDIS_HOST=YOUR_REDIS_HOST
REDIS_PORT=DEFAULT_6379

# SOME MEDIA IDS (this is a number id. you have to upload the media. check the documentation https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/media-upload-api#post-version-phone-number-id-media)
GROCERIES_MEDIA_ID=MEDIA_ID
SHEET_PAN_DINNER_MEDIA_ID=MEDIA_ID
SALAD_BOWL_MEDIA_ID=MEDIA_ID


# Google Sheets Service Account Credentials
SPREADSHEET_ID=your_spreadsheet_id
CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Note for Render:** Make sure your `GOOGLE_PRIVATE_KEY` preserves newlines (`\n`). The `config.js` module automatically handles string formatting to match OpenSSL requirements on Render servers.

## 🛠️ Usage Flow

1. **Menu Interaction**: User initiates a chat and receives interactive menu options or template cards.

2. **Multi-Step Form**: Selecting the form option triggers the step-by-step questionnaire.

3. **Interactive Review**: Upon completing all questions, the bot presents a summary along with native **"Sí, es correcto"** and **"No, cancelar"** interactive buttons.

4. **Data Logging**: Clicking **"Sí, es correcto"** calls `GoogleSheetsService.appendRow(...)`, inserting a formatted entry into the sheet and resetting the user's session.