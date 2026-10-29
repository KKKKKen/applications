/*
 * インターバルタイマーの記録を受け取り、このスプレッドシートに 1 行ずつ書き足す。
 *
 * 置き方:
 *   1. Google スプレッドシートを新規作成（名前は自由。例: 運動の記録）
 *   2. メニュー「拡張機能」→「Apps Script」を開き、中身を全部消してこのファイルを貼り付けて保存
 *   3. 右上「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *        次のユーザーとして実行: 自分
 *        アクセスできるユーザー: 全員
 *      → 「デプロイ」→ 承認 → 出てきた「ウェブアプリの URL」（/exec で終わる）をコピー
 *   4. タイマーの設定画面「記録の送り先」に貼り、「接続を確かめる」で 接続OK を確認
 *
 * コードを直したら「デプロイ」→「デプロイを管理」→ 鉛筆 → バージョン「新バージョン」→ デプロイ。URL は変わらない。
 */
var SHEET_NAME = '記録';
var HEADER = ['日付', '開始', '終了', '種類', '合計(秒)', '合計', '設定', 'ID', '受信時刻'];

function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) {}
  if (data.type === 'ping') return out({ ok: true, ping: true });

  var records = Array.isArray(data.records) ? data.records : [data];
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = getSheet();
    var known = existingIds(sh);
    var rows = [];
    records.forEach(function (r) {
      if (!r || !r.id || known[r.id]) return;
      known[r.id] = true;
      rows.push([r.date || '', r.start || '', r.end || '', r.mode || '', Number(r.total) || 0, r.totalText || '', r.config || '', r.id, new Date()]);
    });
    if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
    return out({ ok: true, added: rows.length });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out({ ok: true, message: 'interval timer log' });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADER);
    sh.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* 同じ ID を二重に書かないための一覧（再送されても行は増えない） */
function existingIds(sh) {
  var ids = {};
  var n = sh.getLastRow();
  if (n < 2) return ids;
  var col = HEADER.indexOf('ID') + 1;
  sh.getRange(2, col, n - 1, 1).getValues().forEach(function (row) { if (row[0]) ids[row[0]] = true; });
  return ids;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
