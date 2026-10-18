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
        //id: constants.REPLY_OFFER_ID,
        //title: constants.REPLY_OFFER_CTA,
        id: constants.REPLY_MULTI_STEP_CTA_ID,
        title: constants.REPLY_MULTI_STEP_CTA,
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

// Ahora recibe el parámetro 'messageBody' en lugar de tener el texto fijo
function sendCTAEntranceMessage(messageId, senderPhoneNumberId, recipientPhoneNumber, messageBody) {
  return GraphApi.sendTextMessage(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    messageBody // <--- Aquí usa la variable dinámica
  );
}

async function markMessageForFollowUp(messageId) {
  await Cache.insert(messageId);
}

// Función para iniciar el cuestionario dinámico
async function startMultiStepForm(message, senderPhoneNumberId, userPhone, userStateKey) {
  console.log(`Iniciando cuestionario dinámico paso a paso para ${userPhone}`);
  
  const initialSession = {
    inFlow: true,
    currentIndex: 0,
    step: 'QUESTION',
    data: {}
  };

  await Cache.insertState(userStateKey, JSON.stringify(initialSession), 300);

  await GraphApi.sendTextMessage(
    message.id,
    senderPhoneNumberId,
    userPhone,
    constants.FORM_FIELDS[0].prompt
  );
}

// Función para procesar el formulario paso a paso y la revisión final
async function handleMultiStepForm(message, senderPhoneNumberId, userPhone, userStateKey, rawState) {
  let session = JSON.parse(rawState);

  // Fase de revisión final
  if (session.step === 'REVIEW') {
    if (message.type === constants.CONFIRM_YES_ID) {
      await Cache.remove(userStateKey);
      await GraphApi.sendTextMessage(message.id, senderPhoneNumberId, userPhone, "¡Datos guardados con éxito en Google Sheets! 🎉");
      sendTryOutDemoMessage(undefined, senderPhoneNumberId, userPhone, constants.APP_DEFAULT_MESSAGE);
      return;
    } else if (message.type === constants.CONFIRM_NO_ID) {
      await Cache.remove(userStateKey);
      await GraphApi.sendTextMessage(message.id, senderPhoneNumberId, userPhone, "Formulario cancelado. Empecemos de nuevo.");
      sendTryOutDemoMessage(undefined, senderPhoneNumberId, userPhone, constants.APP_DEFAULT_MESSAGE);
      return;
    }
  }

  // Respondiendo preguntas del formulario paso a paso
  const currentFieldIndex = session.currentIndex;
  const currentField = constants.FORM_FIELDS[currentFieldIndex];

  session.data[currentField.key] = message.textBody;
  session.currentIndex++;

  if (session.currentIndex < constants.FORM_FIELDS.length) {
    await Cache.insertState(userStateKey, JSON.stringify(session), 300);
    
    const nextPrompt = constants.FORM_FIELDS[session.currentIndex].prompt;
    await GraphApi.sendTextMessage(message.id, senderPhoneNumberId, userPhone, nextPrompt);
    return;
  } else {
    // Fin de preguntas -> Pasamos a revisión
    session.step = 'REVIEW';
    await Cache.insertState(userStateKey, JSON.stringify(session), 300);

    const summary = `Por favor verifica tus datos:\n\n- Nombre: ${session.data.nombre}\n- Apellido: ${session.data.apellido}\n- Edad: ${session.data.edad}\n\n¿Los datos son correctos?`;
    
    await GraphApi.sendTextMessage(message.id, senderPhoneNumberId, userPhone, summary);
    return;
  }
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

    // ==========================================
    // FLUJO 1: TU FLUJO ANTIGUO (Texto simple)
    // ==========================================
    if (currentState === 'WAITING_FOR_USER_INPUT') {
      const userText = message.textBody; 
      console.log(`📥 El usuario ${userPhone} escribió en flujo 1: "${userText}"`);

      // 1. PRIMERO LIMPIAMOS EL ESTADO DE REDIS (Evita bucles si el webhook reintenta)
      await Cache.remove(userStateKey);

      // 2. ENVIAMOS EL MENSAJE DE CONFIRMACIÓN
      await sendCTAEntranceMessage(
        message.id,
        senderPhoneNumberId,
        userPhone,
        `¡Gracias! He registrado tu mensaje: "${userText}".`
      );

      // 3. MOSTRAMOS EL MENÚ PRINCIPAL NUEVAMENTE
      await sendTryOutDemoMessage(
        undefined,
        senderPhoneNumberId,
        userPhone,
        constants.APP_DEFAULT_MESSAGE
      );
      
      return; // Detenemos la ejecución aquí para que no baje al switch
    }

    // ==========================================
    // FLUJO 2: NUEVO CUESTIONARIO MULTITURNO (Dinámico)
    // ==========================================
    // 2. NUEVO FLUJO DINÁMICO (Delegado a la función auxiliar si hay sesión JSON activa)
    let multiStepSession = null;
    try {
      multiStepSession = currentState ? JSON.parse(currentState) : null;
    } catch (e) {
      // Si no es un JSON válido, lo ignoramos
    }

    if (multiStepSession && multiStepSession.inFlow) {
      await handleMultiStepForm(message, senderPhoneNumberId, userPhone, userStateKey, currentState);
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
          message.senderPhoneNumber,
          "Por favor escribe a continuación el dato o mensaje que deseas enviar:"
        );
        await Cache.insertState(userStateKey, 'WAITING_FOR_USER_INPUT');
        break;
      // --- NUEVO BOTÓN PARA EL CUESTIONARIO DINÁMICO ---
      case constants.REPLY_MULTI_STEP_CTA_ID:
        await startMultiStepForm(message, senderPhoneNumberId, userPhone, userStateKey);
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
