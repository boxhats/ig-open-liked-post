"use strict";

// Instagram shortcode alphabet (base64url)
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function mediaIdToShortcode(mediaIdStr) {
  let n;
  try {
    n = BigInt(mediaIdStr);
  } catch {
    return null;
  }
  if (n <= 0n) return null;

  let code = "";
  while (n > 0n) {
    const r = n % 64n;
    code = ALPHABET[Number(r)] + code;
    n = n / 64n;
  }
  return code || null;
}

function postUrlFromImageUrl(srcUrl) {
  if (!srcUrl) return null;

  let u;
  try {
    u = new URL(srcUrl);
  } catch {
    return null;
  }

  // On this Likes grid, the image URL contains ig_cache_key=<base64(media_id)>....
  const raw = u.searchParams.get("ig_cache_key");
  if (!raw) return null;

  const base64Part = raw.split(".")[0];
  let decoded;
  try {
    decoded = atob(base64Part); // standard base64 like "....=="
  } catch {
    return null;
  }

  if (!/^\d+$/.test(decoded)) return null;

  const shortcode = mediaIdToShortcode(decoded);
  if (!shortcode) return null;

  // /p/ usually works and IG redirects if needed
  return `https://www.instagram.com/p/${shortcode}/`;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "ig-open-liked-post",
      title: "Open Instagram post in new tab",
      contexts: ["image"],
      documentUrlPatterns: ["https://*.instagram.com/your_activity/interactions/likes*"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "ig-open-liked-post") return;

  const postUrl = postUrlFromImageUrl(info.srcUrl);
  if (!postUrl) return;

  chrome.tabs.create({
    url: postUrl,
    openerTabId: tab && tab.id ? tab.id : undefined
  });
});
