/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const constants = require("./constants");
const config = require("./config");
const Attribution = require('./attribution');
const GraphApi = require('./graph-api');
const Message = require('./message');
const Status = require('./status');
const Cache = require('./redis');


function sendTryOutDemoMessage(messageId, senderPhoneNumberId, recipientPhoneNumber, messageBody) {
  return GraphApi.messageWithInteractiveReply(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    messageBody,
    [
      {
        //id: constants.REPLY_INTERACTIVE_MEDIA_ID,
        //title: constants.REPLY_INTERACTIVE_WITH_MEDIA_CTA,
        id: constants.REPLY_CTA_ENTRANCE_ID,
        title: constants.REPLY_CTA_ENTRANCE,
      },
      {
        id: constants.REPLY_MEDIA_CAROUSEL_ID,
        title: constants.REPLY_MEDIA_CARD_CAROUSEL_CTA,
      },
      {
        id: constants.REPLY_OFFER_ID,
        title: constants.REPLY_OFFER_CTA,
      }
    ]
  );
}

function sendInteractiveMediaMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  /*return GraphApi.messageWithUtilityTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      //templateName: "grocery_delivery_utility",
      templateName: "hello_world", // plantilla de prueba para evitar restricciones de la plantilla original
      locale: "en_US",
      //imageId: config.groceriesMediaId,
      imageId: null,
    }
  );*/
  // Llamamos al nuevo método plano que acabamos de crear
  return GraphApi.messageWithSimpleTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "jaspers_market_plain_text_v1", 
      locale: "en_US",
    }
  );
}

function sendLimitedTimeOfferMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  return GraphApi.messageWithLimitedTimeOfferTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "jaspers_market_test_current_promo_v1",
      locale: "en",
      //imageId: config.strawberriesMediaId,
      imageId: config.sheetPanDinnerMediaId,
      offerCode: "BERRIES20",
    }
  );
}

function sendMediaCarouselMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  return GraphApi.messageWithMediaCardCarousel(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "jaspers_market_media_carousel_v1", // <-- 1. Se mantiene el nombre del template original
      locale: "en_US",
      imageIds: [
        config.sheetPanDinnerMediaId,
        config.saladBowlMediaId,
      ]
    }
  );
}

function sendCTAEntranceMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  return GraphApi.sendTextMessage(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    "Por favor escribe a continuación el dato o mensaje que deseas enviar:"
  );
}

async function markMessageForFollowUp(messageId) {
  await Cache.insert(messageId);
}


module.exports = class Conversation {
  constructor(phoneNumberId) {
    this.phoneNumberId = phoneNumberId;
  }

  static async handleMessage(senderPhoneNumberId, rawMessage) {
    const message = new Message(rawMessage);
    Attribution.logAttributionEvent(message, senderPhoneNumberId);

    const userPhone = message.senderPhoneNumber;
    const userStateKey = `state:${userPhone}`;
    const currentState = await Cache.getState(userStateKey); // <-- 1. Obtenemos el estado actual del usuario desde Redis

    // 1. VERIFICAR SI EL USUARIO ESTÁ EN EL ESTADO DE ESPERA
    if (currentState === 'WAITING_FOR_USER_INPUT') {
      const userText = message.textBody; 

      console.log(`📥 El usuario ${userPhone} escribió: "${userText}"`);

      // 1. Responderle al usuario usando tu función auxiliar de texto
      await sendCTAEntranceMessage(
        message.id,
        senderPhoneNumberId,
        userPhone,
        `¡Gracias! He registrado tu mensaje: "${userText}".`
      );

      // 2. Limpiar el estado de Redis para sacarlo del flujo de espera
      await Cache.remove(userStateKey);

      // 3. Mostrar el menú principal de nuevo
      sendTryOutDemoMessage(
        undefined,
        senderPhoneNumberId,
        userPhone,
        constants.APP_DEFAULT_MESSAGE
      );
      
      return; 
    }

    switch (message.type) {
      case constants.REPLY_INTERACTIVE_MEDIA_ID:
        console.log(`Tipo de text en ${message.type} (case 1)`);
        let interactiveMediaResponse = await sendInteractiveMediaMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        console.log('✅ ¡Antes de llamar a markMessageForFollowUp!');
        await markMessageForFollowUp(interactiveMediaResponse.messages[0].id);
        break;
      case constants.REPLY_MEDIA_CAROUSEL_ID:
        console.log(`Tipo de text en ${message.type} (case 2)`);
        let mediaCarouselResponse = await sendMediaCarouselMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        await markMessageForFollowUp(mediaCarouselResponse.messages[0].id);
        break;
      case constants.REPLY_OFFER_ID:
        console.log(`Tipo de text en ${message.type} (case 3)`);
        let ltoResponse = await sendLimitedTimeOfferMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        await markMessageForFollowUp(ltoResponse.messages[0].id);
        break;
      case constants.REPLY_CTA_ENTRANCE_ID:
        console.log(`Iniciando flujo de espera de entrada de usuario`);
        let ctaEntranceResponse = await sendCTAEntranceMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        await Cache.insert(userStateKey, 'WAITING_FOR_USER_INPUT');
        break;
      default:
        console.log(`Tipo de text en ${message.type} (default)`);
        sendTryOutDemoMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          constants.APP_DEFAULT_MESSAGE
        );
        break;
    }
  }

  static async handleStatus(senderPhoneNumberId, rawStatus) {
    const status = new Status(rawStatus);

    // Only handle delivered and read statuses
    if (!(status.status === 'delivered' || status.status === 'read')) {
      return;
    }

    // Only send a follow up message if the current message is flagged
    // as needing one in the cache.
    if (await Cache.remove(status.messageId)) {
      await sendTryOutDemoMessage(
        undefined,
        senderPhoneNumberId,
        status.recipientPhoneNumber,
        constants.APP_TRY_ANOTHER_MESSAGE
      );
    }
  }
};
