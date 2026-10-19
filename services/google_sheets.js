"use strict";

const { google } = require("googleapis");
const config = require("./config");

module.exports = class GoogleSheetsService {
  /**
   * Inserta una nueva fila al final de la hoja de cálculo.
   * @param {Object} data - Objeto con los datos del usuario { userPhone, nombre, apellido, edad }
   */
  static async appendRow({ userPhone, nombre, apellido, edad }) {
    try {
      // 1. Autenticación con Google usando las credenciales de la Service Account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: config.clientEmail,
          private_key: config.privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const sheets = google.sheets({ version: "v4", auth });

      // Formato de fecha estándar ISO legible que Google Sheets auto-detecta como Fecha/Hora
      const now = new Date();
      // Formato YYYY-MM-DD HH:mm:ss
      const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);
      const rowValues = [formattedDate, userPhone, nombre, apellido, edad];

      // 3. Insertamos la fila en la primera pestaña ('Sheet1' o 'Hoja 1')
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: "JasperTestTable!A1", // Google ubicará la primera fila libre automáticamente a partir de A1 en la pestaña(hoja) 'JasperTestTable'
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });

      console.log("✅ Registro guardado en Google Sheets con éxito.");
      return response.data;
    } catch (error) {
      console.error("❌ Error al guardar datos en Google Sheets:", error.message);
      throw error;
    }
  }
};