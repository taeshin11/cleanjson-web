/**
 * CleanJSON — Google Apps Script webhook
 *
 * Setup steps:
 * 1. Create a new Google Sheet at sheets.google.com
 * 2. Click Extensions → Apps Script
 * 3. Delete the default code and paste this entire file
 * 4. Click Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL
 * 6. Paste it into app.js as the WEBHOOK_URL constant
 */
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    data.inputLength,
    data.isValid,
    data.errorType || '',
    data.userAgent || ''
  ]);
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
