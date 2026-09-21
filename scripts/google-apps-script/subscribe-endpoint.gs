const SHEET_NAME = 'subscribers';
const API_TOKEN_PROPERTY = 'SUBSCRIBERS_API_TOKEN';
const SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';
const SUBSCRIBER_HEADERS = ['email', 'source', 'createdAt', 'preferences', 'updatedAt', 'active'];

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const email = String(payload.email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/.test(email)) {
      return json_({ ok: false, error: 'invalid_email' });
    }
    const preferences = payload.preferences === undefined ? null : validatePreferences_(payload.preferences);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSubscribersSheet_();
      const values = sheet.getDataRange().getValues();
      const indexes = values.map((row, i) => i > 0 && String(row[0]).trim().toLowerCase() === email ? i : -1).filter((i) => i !== -1);
      const now = new Date();
      const preferencesJson = preferences ? JSON.stringify(preferences) : '';
      if (!indexes.length) {
        // A leading apostrophe keeps email addresses beginning with = or + as plain text.
        const safeEmail = /^[=+@-]/.test(email) ? "'" + email : email;
        sheet.appendRow([safeEmail, 'ntpc-camp-dashboard', now, preferencesJson, now, true]);
      } else if (preferences) {
        indexes.forEach((index) => sheet.getRange(index + 1, 4, 1, 3).setValues([[preferencesJson, now, true]]));
      }
      return json_({ ok: true, duplicate: indexes.length > 0, preferencesSaved: Boolean(preferences) });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    // No payload, email or sheet contents are included in the public response.
    return json_({ ok: false, error: 'invalid_request_or_storage_failure' });
  }
}

function doGet(e) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty(API_TOKEN_PROPERTY);
  const parameters = e && e.parameter ? e.parameter : {};
  if (!expectedToken) return json_({ ok: false, error: 'token_not_configured' });
  if (parameters.token !== expectedToken) return json_({ ok: false, error: 'unauthorized' });

  const subscribers = getSubscribersSheet_().getDataRange().getValues().slice(1).map((row) => {
    const subscriber = {
      email: String(row[0]).trim().toLowerCase(),
      active: row[5] !== false && String(row[5]).toLowerCase() !== 'false',
    };
    if (row[3]) {
      try {
        subscriber.preferences = validatePreferences_(JSON.parse(String(row[3])));
      } catch (error) {
        // Explicit null causes the sender to skip corrupt rows instead of mailing all courses.
        subscriber.preferences = null;
      }
    }
    return subscriber;
  });
  return json_({ ok: true, subscribers });
}

function validatePreferences_(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_preferences');
  if (value.schemaVersion !== undefined && value.schemaVersion !== 1) throw new Error('invalid_version');
  if (!['weekly', 'daily', 'both'].includes(value.frequency)) throw new Error('invalid_frequency');
  const filters = value.filters === undefined ? {} : value.filters;
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) throw new Error('invalid_filters');
  const lists = {
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    weekdays: ['週一', '週二', '週三', '週四', '週五', '週六', '週日'],
    schoolTypes: ['elementary', 'junior_high', 'high_school'],
    themeIds: ['water-outdoor', 'sports-ball', 'martial-fitness', 'tech-game', 'arts-craft', 'dance-performance', 'language', 'strategy-science', 'life-career', 'care-support', 'other'],
    registrationStatus: ['available', 'closing_soon', 'closed', 'not_started'],
    courseTimeStatus: ['upcoming', 'ongoing', 'ended'],
    quotaStatus: ['available', 'almost_full', 'full', 'may_not_open'],
  };
  const texts = ['searchQuery', 'district', 'schoolName'];
  const booleans = ['isFree', 'allowExternalStudents'];
  const allowed = Object.keys(lists).concat(texts, booleans, ['dateRange']);
  Object.keys(filters).forEach((key) => {
    if (!allowed.includes(key)) throw new Error('unsupported_filter');
    const field = filters[key];
    if (lists[key] && (!Array.isArray(field) || field.length > 30 || field.some((item) => !lists[key].includes(item)))) throw new Error('invalid_list');
    if (texts.includes(key) && field !== null && (typeof field !== 'string' || field.length > 200)) throw new Error('invalid_text');
    if (booleans.includes(key) && field !== null && typeof field !== 'boolean') throw new Error('invalid_boolean');
  });
  if (filters.dateRange !== undefined) {
    const range = filters.dateRange;
    if (!range || typeof range !== 'object' || Array.isArray(range)) throw new Error('invalid_date_range');
    if (Object.keys(range).some((key) => !['start', 'end'].includes(key))) throw new Error('unsupported_date_filter');
    [range.start, range.end].forEach((date) => {
      if (date === null || date === undefined || date === '') return;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid_date');
      const parsed = new Date(date + 'T00:00:00Z');
      if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('invalid_date');
    });
    if (range.start && range.end && range.start > range.end) throw new Error('invalid_date_range');
  }
  return { schemaVersion: 1, frequency: value.frequency, filters };
}

function parsePayload_(e) {
  const contents = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  if (contents.length > 12000) throw new Error('payload_too_large');
  return JSON.parse(contents);
}

function getSubscribersSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  const spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Missing spreadsheet.');
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(SUBSCRIBER_HEADERS);
  } else {
    // Existing three-column sheets retain every email, source and createdAt value.
    sheet.getRange(1, 4, 1, 3).setValues([SUBSCRIBER_HEADERS.slice(3)]);
  }
  return sheet;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
