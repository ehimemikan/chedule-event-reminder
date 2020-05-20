(function() {
  'use strict';

  const url = "/g/api/v1/schedule/events"
  const token = garoon.base.request.getRequestToken();

  if (Notification.permission === "default") {
    Notification.requestPermission();
  }

  // とりあえず、1回実行する
  notifyEvent(); 
  // 以後、1分ごとに
  window.setInterval(notifyEvent, 60000);

  function notifyEvent() {
    if (Notification.permission !== "granted") {
      return;
    }

    const nowDate = new Date();
    if (nowDate.getMinutes() % 5 !== 4) {
      // Garoonのスケジュールの仕様上、5分に1回動けば良い。
      // ただ、5分前や10分前に通知して欲しいので時間的には54分とか49分とかに動く必要がある。
      return;
    }
    const now = nowDate.toISOString();
    
    jQuery.ajax(url, {
      //期間予定が含まれるので、10件までスケジュールを取る
      data: {
        "__REQUEST_TOKEN__": token,
        "limit": 10,
        "orderBy": "start asc",
        "rangeStart": now,
        "fields": "id, subject, notes, start, eventType"
      }
    }).done((r) => {
      if (! r.events) {
        return;
      }

      let event;
      // 期間予定と開始しているイベントを除き、次のイベントをターゲットにする
      for (const i in r.events) {
        const e = r.events[i];
        if (e.eventType !== "ALL_DAY" && new Date(e.start.dateTime) > Date.now() ) {
          event = e;
          break;
        }
      }
      if (! event) {
        // 期間予定が10個以上あると、ちょっとめんどいので通知しない
        return;
      }

      const subject = event.subject;
      const startDateTime = new Date(event.start.dateTime);
      const lastMinute = parseInt((startDateTime - nowDate) / 1000 / 60);

      switch(lastMinute) {
        case 10:
          execNotification(`10分前：${subject}`, event);
          break;
        case 5:
          execNotification(`5分前：${subject}`, event);
          break;
        case 0:
          execNotification(`開始時間：${subject}`, event);
          break;
        default:
          // nothing
      }

      function execNotification(title, event) {
        window.setTimeout(() => {
          const options = {
            body: event.notes,
          }
          const notification = new Notification(title, options);
          const dt = new Date(event.start.dateTime);
          dt.setHours(dt.getHours() + 9);
          const bdate = dt.toISOString().slice(0, 10);

          notification.onclick = function(e) {
            e.preventDefault(); // prevent the browser from focusing the Notification's tab
            window.open(`/g/schedule/view.csp?event=${event.id}&bdate=${bdate}`, '_blank');
          }
        }, new Date().getSeconds());
      }
    }).fail(e => {
      console.log(e);
    });
  }
})();