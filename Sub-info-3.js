/***********
 * 作者：cc63 & ChatGPT 優化版
 * 修改更新時間：2025年4月2日
 ***********/

(async () => {
  let args = getArgs();
  let info = await getDataInfo(args.url);

  if (!info) {
    console.log("3號機場未取得流量資訊，可能伺服器未返回 subscription-userinfo。");
    return $done();
  }

  let resetDayLeft = getRemainingDays(parseInt(args["reset_day"]));
  let expireDaysLeft = getExpireDaysLeft(args.expire || info.expire);

  let used = info.download + info.upload;
  let total = info.total;
  let content = [`Usage: ${bytesToSize(used)} / ${bytesToSize(total)}`];

  if (!resetDayLeft && !expireDaysLeft) {
    let percentage = ((used / total) * 100).toFixed(1);
    content.push(`${percentage}% of data has been used.`);
  } else {
    if (resetDayLeft && expireDaysLeft) {
      content.push(`Reset in ${resetDayLeft} day(s), expires in ${expireDaysLeft} day(s).`);
    } else if (resetDayLeft) {
      content.push(`Data will be reset in ${resetDayLeft} day(s).`);
    } else if (expireDaysLeft) {
      content.push(`Plan will expire in ${expireDaysLeft} day(s).`);
    }

    if (expireDaysLeft) {
      content.push(`Expired: ${formatTime(args.expire || info.expire)}`);
    }
  }

  $done({
    title: `${args.title}`,
    content: content.join("\n"),
    icon: args.icon || "tornado",
    "icon-color": args.color || "#DF4688",
  });
})();

function getArgs() {
  return Object.fromEntries(
    $argument
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

function getUserInfo(url) {
  let request = {
    headers: { "User-Agent": "Quantumult X" }, // 提高成功機率
    url
  };
  return new Promise((resolve, reject) =>
    $httpClient.get(request, (err, resp) => {
      if (err != null) {
        console.log("3號機場請求錯誤:", err);
        reject(err);
        return;
      }
      if (resp.status !== 200) {
        console.log("3號機場請求失敗，HTTP 狀態碼:", resp.status);
        reject(resp.status);
        return;
      }
      console.log("3號機場回傳 Headers:", JSON.stringify(resp.headers, null, 2));
      let header = Object.keys(resp.headers).find((key) => key.toLowerCase() === "subscription-userinfo");
      if (header) {
        resolve(resp.headers[header]);
        return;
      }
      reject("3號機場伺服器未包含 subscription-userinfo header");
    })
  );
}

async function getDataInfo(url) {
  const [err, data] = await getUserInfo(url)
    .then((data) => [null, data])
    .catch((err) => [err, null]);
  if (err) {
    console.log("3號機場取得訂閱資訊失敗:", err);
    return;
  }

  return Object.fromEntries(
    data
      .match(/\w+=[\d.eE+-]+/g)
      .map((item) => item.split("="))
      .map(([k, v]) => [k, Number(v)])
  );
}

function getRemainingDays(resetDay) {
  if (!resetDay || resetDay < 1 || resetDay > 31) return;

  let now = new Date();
  let today = now.getDate();
  let month = now.getMonth();
  let year = now.getFullYear();

  let daysInThisMonth = new Date(year, month + 1, 0).getDate();
  let daysInNextMonth = new Date(year, month + 2, 0).getDate();

  resetDay = Math.min(resetDay, daysInThisMonth);

  if (resetDay > today) {
    return resetDay - today;
  } else {
    resetDay = Math.min(resetDay, daysInNextMonth);
    return daysInThisMonth - today + resetDay;
  }
}

function getExpireDaysLeft(expire) {
  if (!expire) return;

  let now = new Date().getTime();
  let expireTime;

  if (/^[\d.]+$/.test(expire)) {
    expireTime = parseInt(expire) * 1000;
  } else {
    expireTime = new Date(expire).getTime();
  }

  let daysLeft = Math.ceil((expireTime - now) / (1000 * 60 * 60 * 24));
  return daysLeft > 0 ? daysLeft : null;
}

function bytesToSize(bytes) {
  if (bytes === 0) return "0B";
  let k = 1024;
  let sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function formatTime(time) {
  if (time < 1000000000000) time *= 1000;

  let dateObj = new Date(time);
  let year = dateObj.getFullYear();
  let month = dateObj.getMonth() + 1;
  let day = dateObj.getDate();
  return `${day}/${month}/${year}`;
}