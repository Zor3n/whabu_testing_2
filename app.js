/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const crypto = require('crypto');

const { urlencoded, json } = require('body-parser');
require('dotenv').config();
const express = require('express');

const config = require('./services/config');
const Conversation = require('./services/conversation');
const Message = require('./services/message');
const app = express();

// Parse application/x-www-form-urlencoded
app.use(
  urlencoded({
    extended: true
  })
);

// Parse application/json. Verify that callback came from Facebook
app.use(json()); // <-- 1. Se comenta para evitar el error de verificación de firma en Render
//app.use(json({ verify: verifyRequestSignature })); // <-- 2. Solo para entornos de producción, no para desarrollo local

// Handle webhook verification handshake
app.get("/webhook", function (req, res) {
  if (
    req.query["hub.mode"] != "subscribe" ||
    req.query["hub.verify_token"] != config.verifyToken
  ) {
    res.sendStatus(403);
    return;
  }

  res.send(req.query["hub.challenge"]);
});

// Handle incoming messages
app.post('/webhook', (req, res) => {
  console.log("\n================================================");
  console.log("📢 ¡LLEGÓ UN COMANZAZO DESDE UN CELULAR REAL!");
  console.log("================================================");
  
  // Esto va a imprimir en Render todo el paquete de datos que generó tu teléfono
  console.log("📦 DATOS RECIBIDOS:", JSON.stringify(req.body, null, 2));

  try {
    // Buscamos el texto exacto que tú escribiste en la pantalla de tu WhatsApp
    const mensajeDeTuCelular = req.body.entry[0].changes[0].value.messages[0].text.body;
    const tuNumero = req.body.entry[0].changes[0].value.messages[0].from;
    
    console.log(`\n💬 EL MENSAJE QUE ESCRIBISTE FUE: "${mensajeDeTuCelular}"`);
    console.log(`📱 ENVIADO DESDE EL NÚMERO: ${tuNumero}\n`);
  } catch (e) {
    console.log("ℹ️ Llegó un paquete de Meta, pero parece ser un reporte de entrega o lectura.");
  }

  // Le respondemos rápido a Meta para que marque el segundo check gris en tu celular
  res.status(200).send('EVENT_RECEIVED');
  /*console.log(req.body);
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp} You know\n`);

  if (req.body.object === "whatsapp_business_account") {
    req.body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        const value = change.value;
        if (value) {
          const senderPhoneNumberId = value.metadata.phone_number_id;

          if (value.statuses) {
            value.statuses.forEach(status => {
              // Handle message status updates
              Conversation.handleStatus(senderPhoneNumberId, status);
            });
          }

          if (value.messages) {
            value.messages.forEach(rawMessage => {
              // Respond to message
              Conversation.handleMessage(senderPhoneNumberId, rawMessage);
            });
          }
        }
      });
    });
  }

  res.status(200).send('EVENT_RECEIVED');*/
});

// Default route for health check
app.get('/', (req, res) => {
  res.json({
    message: 'Jasper\'s Market Server is running',
    endpoints: [
      'POST /webhook - WhatsApp webhook endpoint'
    ]
  });
});

// Check if all environment variables are set
config.checkEnvVariables();

// Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
  let signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    console.warn(`Couldn't find "x-hub-signature-256" in headers.`);
  } else {
    let elements = signature.split("=");
    let signatureHash = elements[1];
    let expectedHash = crypto
      .createHmac("sha256", config.appSecret)
      .update(buf)
      .digest("hex");
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

process.on('uncaughtException', (err) => {
  console.error('Se detuvo un crash del SDK de Meta:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Se detuvo una promesa rechazada:', reason);
});

/*// COMPROBACIÓN DE VARIABLES DE ENTORNO EN RENDER
console.log("=== COMPROBANDO VARIABLES DE ENTORNO EN RENDER ===");
console.log("ACCESS_TOKEN:", process.env.ACCESS_TOKEN ? "✅ Cargado (Tiene texto)" : "❌ VACÍO O NO EXISTE");
console.log("VERIFY_TOKEN:", process.env.VERIFY_TOKEN ? `✅ Cargado (${process.env.VERIFY_TOKEN})` : "❌ VACÍO");
console.log("PHONE_NUMBER_ID:", process.env.PHONE_NUMBER_ID ? `✅ Cargado (${process.env.PHONE_NUMBER_ID})` : "❌ VACÍO");
console.log("REDIS_HOST:", process.env.REDIS_HOST ? `✅ Cargado (${process.env.REDIS_HOST})` : "❌ VACÍO");
console.log("REDIS_PORT:", process.env.REDIS_PORT ? `✅ Cargado (${process.env.REDIS_PORT})` : "❌ VACÍO");
console.log("==================================================");*/

var listener = app.listen(config.port, () => {
  console.log(`The app is listening on port ${listener.address().port}`);
});
