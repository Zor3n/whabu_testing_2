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
      // TRUCO: Si el simulador de Meta manda el ID falso, usamos tu variable real de Render
      const activePhoneId = senderPhoneNumberId === "123456123" || !senderPhoneNumberId
        ? process.env.PHONE_NUMBER_ID 
        : senderPhoneNumberId;

      // Mark as read and send typing indicator - CODE BY APP
      /*if (messageId) {
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
          [`${activePhoneId}`, 'messages'],
          typingBody
        );
      }*/
      
      // MODIFICACIÓN: Si el messageId es el del simulador ("ABGGFlA5Fpa"), saltamos el "marcar como leído"
      if (messageId && messageId !== "ABGGFlA5Fpa") {
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
          [`${activePhoneId}`, 'messages'],
          typingBody
        );
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
