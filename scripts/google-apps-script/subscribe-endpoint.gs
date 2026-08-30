const SHEET_NAME = 'subscribers';
const API_TOKEN_PROPERTY = 'SUBSCRIBERS_API_TOKEN';
const SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';

function doPost(e) {
  const payload = parsePayload_(e);
  const email = String(payload.email || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json_({ ok: false, error: 'invalid_email' });
  }

  const sheet = getSubscribersSheet_();
  const values = sheet.getDataRange().getValues();
  const exists = values
    .slice(1)
    .some((row) => String(row[0]).trim().toLowerCase() === email);

  if (!exists) {
    sheet.appendRow([
      email,
      String(payload.source || ''),
      new Date(),
    ]);
  }

  return json_({ ok: true, duplicate: exists });
}

function doGet(e) {
  const expectedToken = PropertiesService
    .getScriptProperties()
    .getProperty(API_TOKEN_PROPERTY);
  const parameters = e && e.parameter ? e.parameter : {};

  if (!expectedToken) {
    return json_({ ok: false, error: 'token_not_configured' });
  }

  if (parameters.token !== expectedToken) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  const sheet = getSubscribersSheet_();
  const emails = sheet
    .getDataRange()
    .getValues()
    .slice(1)
    .map((row) => String(row[0]).trim().toLowerCase())
    .filter((email) => email && email.includes('@'));

  return json_({
    ok: true,
    subscribers: emails.map((email) => ({ email })),
  });
}

function parsePayload_(e) {
  const contents = e.postData && e.postData.contents
    ? e.postData.contents
    : '{}';

  try {
    return JSON.parse(contents);
  } catch (error) {
    return e.parameter || {};
  }
}

function getSubscribersSheet_() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(SPREADSHEET_ID_PROPERTY);
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('Missing active spreadsheet or SPREADSHEET_ID script property.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['email', 'source', 'createdAt']);
  }

  return sheet;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
