/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

module.exports = Object.freeze({
  // Expected messages from the user
  USER_START_MESSAGE: "Get started",
  USER_TRY_OUT_MESSAGE: "Try it out",

  // Response messages
  APP_DEFAULT_MESSAGE: "Welcome to Jasper's Market! What can we help you with today?",
  APP_TRY_ANOTHER_MESSAGE: "Is there anything else we can help you with?",


  // CTA texts
  REPLY_INTERACTIVE_WITH_MEDIA_CTA: "Shop online",
  REPLY_MEDIA_CARD_CAROUSEL_CTA: "Get recipe ideas",
  REPLY_OFFER_CTA: "Current promo",
  REPLY_CTA_ENTRANCE: "Add entrance",
  REPLY_MULTI_STEP_CTA: "Fill out the form",

  // Reply Button IDs
  REPLY_INTERACTIVE_MEDIA_ID: "reply-interactive-with-media",
  REPLY_MEDIA_CAROUSEL_ID: "reply-media-card-carousel",
  REPLY_OFFER_ID: "reply-offer", 
  REPLY_CTA_ENTRANCE_ID: "reply-cta-entrance",
  REPLY_MULTI_STEP_CTA_ID: "reply-multi-step",

  // --- NUEVOS CAMPOS DINÁMICOS PARA EL FORMULARIO ---
  FORM_FIELDS: [
    { key: 'nombre', prompt: 'Por favor, escribe tu **Nombre**:' },
    { key: 'apellido', prompt: 'Ahora, por favor escribe tu **Apellido**:' },
    { key: 'edad', prompt: 'Finalmente, ¿cuál es tu **Edad**?' }
  ],

  CONFIRM_YES_ID: 'confirm_form_yes',
  CONFIRM_NO_ID: 'confirm_form_no',
}); 
