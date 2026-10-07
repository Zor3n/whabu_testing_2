/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const { FacebookAdsApi } = require('facebook-nodejs-business-sdk');
const config = require("./config"); 
const {
  buildLimitedTimeOfferTemplatePayload,
  buildMediaCardCarouselPayload,
  buildUtilityTemplatePayload,
} = require("./message-payloads");

const api = new FacebookAdsApi(config.accessToken); 

module.exports = class GraphApi {
  static async #makeApiCall(messageId, senderPhoneNumberId, requestBody) {
    try {
      // 1. Definimos el ID del teléfono activo (usa tu variable real de Render si viene vacío o de pruebas)
      const activePhoneId = senderPhoneNumberId === "123456123" || !senderPhoneNumberId
        ? process.env.PHONE_NUMBER_ID 
        : senderPhoneNumberId;

      // 2. DETECTOR DE SIMULADOR: Si los datos de Meta son ficticios, cortamos el flujo externo
      const esSimulador = 
        senderPhoneNumberId === "123456123" || 
        !senderPhoneNumberId || 
        (requestBody && (requestBody.to === "16315551181" || requestBody.to === "15551234567"));

      if (esSimulador) {
        console.log('\n--- SIMULACIÓN DETECTADA EN WEBHOOK ---');
        console.log('Datos recibidos y procesados internamente:', JSON.stringify(requestBody, null, 2));
        console.log('----------------------------------------\n');
        
        return { message: "Simulated API call successful for local testing", status: 200 };
      }

      // -------------------------------------------------------------
      // FLUJO REAL: Solo se ejecuta si te escriben desde un WhatsApp de verdad
      // -------------------------------------------------------------
      if (messageId && messageId !== "ABGGFlA5Fpa") {
        const typingBody = {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          "typing_indicator": { "type": "text" }
        };
        // Usamos la variable activePhoneId que declaramos arriba
        await api.call('POST', [`${activePhoneId}`, 'messages'], typingBody);
      }

      // Si el requestBody contiene un objeto interactive o media con placeholders falsos, 
      // Meta podría fallar. Por ahora, dejamos que intente enviar el cuerpo del mensaje:
      const response = await api.call(
        'POST',
        [`${activePhoneId}`, 'messages'],
        requestBody
      );
      console.log('API call successful:', response);
      return response;
    } catch (error) {
      console.error('Error making API call:', error);
      throw error;
    }
  }

  static async messageWithInteractiveReply(messageId, senderPhoneNumberId, recipientPhoneNumber, messageText, replyCTAs) {
    const requestBody = {
      messaging_product: "whatsapp",
      to: recipientPhoneNumber,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: messageText
        },
        action: {
          buttons: replyCTAs.map(cta => ({
            type: "reply",
            reply: {
              id: cta.id,
              title: cta.title
            }
          }))
        }
      }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

  static async messageWithUtilityTemplate(messageId, senderPhoneNumberId, recipientPhoneNumber, options) {
    const requestBody = buildUtilityTemplatePayload({
      recipientPhoneNumber,
      ...options,
    });

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

  static async messageWithLimitedTimeOfferTemplate(messageId, senderPhoneNumberId, recipientPhoneNumber, options) {
    const expirationTimeMs = Date.now() + (48 * 60 * 60 * 1000);
    const requestBody = buildLimitedTimeOfferTemplatePayload({
      recipientPhoneNumber,
      expirationTimeMs,
      ...options,
    });

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

  static async messageWithMediaCardCarousel(messageId, senderPhoneNumberId, recipientPhoneNumber, options) {
    const requestBody = buildMediaCardCarouselPayload({
      recipientPhoneNumber,
      ...options,
    });

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

};
