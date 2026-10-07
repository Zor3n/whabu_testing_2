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
        id: constants.REPLY_INTERACTIVE_MEDIA_ID,
        title: constants.REPLY_INTERACTIVE_WITH_MEDIA_CTA,
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
  return GraphApi.messageWithUtilityTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      //templateName: "grocery_delivery_utility",
      templateName: "jaspers_market_image_cta_v1", // <-- 1. Se mantiene el nombre del template original
      locale: "en_US",
      imageId: config.groceriesMediaId,
    }
  );
}

function sendLimitedTimeOfferMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  return GraphApi.messageWithLimitedTimeOfferTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "jaspers_market_order_confirmation_v1",
      locale: "en_US",
      imageId: config.strawberriesMediaId,
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
      //templateName: "recipe_media_carousel",
      templateName: "jaspers_market_media_carousel_v1", // <-- 1. Se mantiene el nombre del template original
      locale: "en_US",
      imageIds: [
        config.sheetPanDinnerMediaId,
        config.saladBowlMediaId,
      ]
    }
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

    switch (message.type) {
      case constants.REPLY_INTERACTIVE_MEDIA_ID:
        console.log(`Tipo de text en ${message.type} (case 1)`);
        let interactiveMediaResponse = await sendInteractiveMediaMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        await markMessageForFollowUp(interactiveMediaResponse.messages[0].id);
        break;
      case constants.REPLY_MEDIA_CAROUSEL_ID:
        let mediaCarouselResponse = await sendMediaCarouselMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        await markMessageForFollowUp(mediaCarouselResponse.messages[0].id);
        break;
      case constants.REPLY_OFFER_ID:
        let ltoResponse = await sendLimitedTimeOfferMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber
        );
        await markMessageForFollowUp(ltoResponse.messages[0].id);
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
        /*console.log(`[JASPER-BOT] Texto plano libre detectado de: ${message.senderPhoneNumber}. Respondiendo...`);
        
        // Llamamos a nuestra nueva función enviando un texto plano seguro y directo
        await GraphApi.sendSimpleTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          "¡Hola, chamo! Recibí tu mensaje de prueba con éxito en la app de Jasper. Tu sistema en Render ya está respondiendo sin trabas. 🚀"
        );
        break;*/
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
