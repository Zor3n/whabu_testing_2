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
    // 1. INTENTO DE MARCAR COMO LEÍDO (Protegido contra IDs falsos)
    if (messageId && messageId !== "ABGGFlA5Fpa") {
      try {
        const typingBody = {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          "typing_indicator": {
            "type": "text"
          }
        };

        await api.call(
          'POST',
          [`${senderPhoneNumberId}`, 'messages'],
          typingBody
        );
      } catch (typingError) {
        // Si el messageId o el ID de teléfono son falsos del simulador, el error se atrapa aquí y el servidor NO se cae
        console.warn(`[Aviso] No se pudo marcar como leído el mensaje ${messageId}. Detalle: ${typingError.message}`);
      }
    }

    // 2. INTENTO DE ENVIAR RESPUESTA AUTOMÁTICA (Protegido contra IDs falsos)
    try {
      // Se realiza la llamada con la estructura limpia y nativa de Jasper utilizando el parámetro puro
      const response = await api.call(
        'POST',
        [`${senderPhoneNumberId}`, 'messages'],
        requestBody
      );
      
      // Mantenemos el log original de éxito de la aplicación de Meta
      console.log('API call successful:', response);
      return response;
    } catch (error) {
      // Si la API de Meta rechaza el envío por datos falsos cruzados del simulador, se atrapa el error aquí
      console.error('Error making API call:', error);
      
      // Retornamos un objeto de fallo simulado para que el flujo de Jasper termine de procesarse sin colapsar el hilo de Render
      return { error: true, message: error.message };
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
