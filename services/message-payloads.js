/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

function buildUtilityTemplatePayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
    imageId,
  } = options;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale,
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: imageId,
              },
            },
          ],
        },
      ],
    },
  };
}

function buildLimitedTimeOfferTemplatePayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
    imageId,
    offerCode,
    expirationTimeMs,
  } = options;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale,
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: imageId,
              },
            },
          ],
        },
        {
          type: "limited_time_offer",
          parameters: [
            {
              type: "limited_time_offer",
              limited_time_offer: {
                expiration_time_ms: expirationTimeMs,
              },
            },
          ],
        },
        {
          type: "button",
          sub_type: "copy_code",
          index: 0,
          parameters: [
            {
              type: "coupon_code",
              coupon_code: offerCode,
            },
          ],
        },
      ],
    },
  };
}

function buildMediaCardCarouselPayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
    imageIds,
  } = options;
  /*
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale,
      },
      components: [
        {
          type: "carousel",
          cards: imageIds.map((imageId, index) => ({
            card_index: index,
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      link: imageId,
                    },
                  },
                ],
              },
              // 🔽 INYECTAMOS EL BOTÓN TIPO URL ESTÁTICO EXIGIDO POR META 🔽
              {
                type: "button",
                sub_type: "url", // Cambiado estrictamente a 'url' porque abre un sitio web
                index: 0,        // Posición del botón (el primero de la tarjeta)
                parameters: [
                  {
                    type: "text",
                    text: "get_delivery"     // Se deja vacío porque la URL en Meta es 100% estática y no dinámica
                  }
                ]
              }
            ],
          })),
        },
      ],
    },
  };*/
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber, // El número de tu celular real
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale || "en_US",
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
            }
          ]
        },
        {
          type: "carousel",
          // Mapeamos dinámicamente cada tarjeta usando un bucle .map
          cards: imageIds.map((imageId, index) => ({
            card_index: index,
            components: [
              // 1. Encabezado multimedia de la tarjeta (Tus URLs de Render)
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      link: imageId, 
                    },
                  },
                ],
              },
              // 2. UN SOLO BOTÓN TIPO URL (Index como String obligatorio)
              {
                type: "button",
                sub_type: "url",
                index: "0", // Al ser el único botón de la tarjeta, su índice es strictly "0"
                parameters: [
                  {
                    type: "text",
                    text: "get_delivery" // Texto de relleno exigido por Meta para validar el parámetro
                  }
                ]
              }
            ],
          })),
        },
      ],
    },
  };

}

// NUEVO CONSTRUCTOR PARA PLANTILLAS SIMPLES SIN PARÁMETROS NI IMÁGENES
function buildSimpleTemplatePayload(options) {
  const {
    recipientPhoneNumber,
    templateName,
    locale,
  } = options;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: locale || "en_US",
      }
    },
  };
}

module.exports = {
  buildLimitedTimeOfferTemplatePayload,
  buildMediaCardCarouselPayload,
  buildUtilityTemplatePayload,
  buildSimpleTemplatePayload, // <-- La agregamos aquí
};
