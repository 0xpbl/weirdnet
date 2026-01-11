(function () {
  "use strict";

  var DEFAULT_HANDLE = "Pablo Murad";
  var PROFILE_IMAGE_URL =
    "https://shot.1208.pro/uploads/zhIurIiJZ1paTKsdWH6T0E6j6Dty0kgMQfxJ1I9g.png";

  function $(id) {
    return document.getElementById(id);
  }

  function safeText(v) {
    return v == null ? "" : String(v);
  }

  function decodeHashFromSrc(src) {
    if (!src) return "";
    var idx = src.indexOf("#");
    if (idx === -1) return "";
    return decodeURIComponent(src.slice(idx + 1));
  }

  function normalizeAlt(handle) {
    return safeText(handle).toLowerCase().replace(/\s+/g, "");
  }

  function ensureSlot(scriptEl) {
    var slot = $("away-slot");
    if (slot) return slot;

    slot = document.createElement("div");
    slot.id = "away-slot";

    // Minimal inline styling as fallback.
    slot.style.fontFamily = '"Courier New", Courier, monospace';
    slot.style.fontSize = "12px";
    slot.style.border = "1px solid #222";
    slot.style.background = "#fff";
    slot.style.padding = "8px";
    slot.style.whiteSpace = "pre";
    slot.style.lineHeight = "1.25";

    if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.insertBefore(slot, scriptEl);
    } else {
      document.body.appendChild(slot);
    }

    return slot;
  }

  function padRight(str, len) {
    str = safeText(str);
    if (str.length >= len) return str.slice(0, len);
    return str + new Array(len - str.length + 1).join(" ");
  }

  function wrapText(text, width) {
    text = safeText(text).replace(/\r\n?/g, "\n");
    var paragraphs = text.split("\n");
    var out = [];

    for (var p = 0; p < paragraphs.length; p++) {
      var line = paragraphs[p];

      if (!line.trim()) {
        out.push("");
        continue;
      }

      var words = line.split(/\s+/);
      var current = "";

      for (var i = 0; i < words.length; i++) {
        var w = words[i];

        if (!current) {
          current = w;
          continue;
        }

        if ((current + " " + w).length > width) {
          out.push(current);
          current = w;
        } else {
          current += " " + w;
        }
      }

      if (current) out.push(current);
    }

    return out;
  }

  function renderLoading(slot, name) {
    slot.textContent = "Loading away status for: " + name + " ...";
  }

  function renderError(slot, tried) {
    slot.textContent =
      "Away status unavailable.\n" +
      "Name tried: " + tried + "\n\n" +
      "Tip: set the script hash to your awaymessage handle:\n" +
      '<script id="_amlol" src="/js/awaymessage.js#YOUR_HANDLE"></script>\n';
  }

  function renderBox(slot, opts) {
    var W = 46;

    function line(ch) {
      return new Array(W + 3).join(ch);
    }

    var header = "AWAY MESSAGE";
    var nameLine = "Name   : " + safeText(opts.name);
    var statusLine = "Status : " + safeText(opts.status);

    var msgLines = wrapText(opts.message || "(no message)", W);
    if (!msgLines.length) msgLines = ["(no message)"];

    var top = "+" + line("-") + "+";
    var mid = "+" + line("-") + "+";
    var bot = "+" + line("-") + "+";

    function row(content) {
      return "| " + padRight(content, W) + " |";
    }

    var lines = [];
    lines.push(top);
    lines.push(row(header));
    lines.push(mid);
    lines.push(row(nameLine));
    lines.push(row(statusLine));
    lines.push(mid);

    for (var i = 0; i < msgLines.length; i++) {
      lines.push(row(msgLines[i]));
    }

    if (opts.profileUrl) {
      lines.push(mid);
    }

    lines.push(bot);

    slot.textContent = lines.join("\n") + "\n";
  }

  function renderProfileImageBelow(slot) {
    var existing = $("away-profile-pic");
    if (existing) return;

    var img = document.createElement("img");
    img.id = "away-profile-pic";
    img.src = PROFILE_IMAGE_URL;
    img.alt = "Profile picture";

    img.style.display = "block";
    img.style.marginTop = "8px";
    img.style.maxWidth = "96px";
    img.style.height = "auto";
    img.style.border = "1px solid #222";
    img.style.imageRendering = "pixelated";

    if (slot.parentNode) {
      if (slot.nextSibling) slot.parentNode.insertBefore(img, slot.nextSibling);
      else slot.parentNode.appendChild(img);
    }
  }

  function fetchStatus(name) {
    var url = "https://awaymessage.lol/json/get/" + encodeURIComponent(name);
    return fetch(url, { method: "GET" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  try {
    var script = document.currentScript || $("_amlol");
    var src = script ? script.getAttribute("src") : "";
    var hashName = decodeHashFromSrc(src);

    var displayName = (hashName || DEFAULT_HANDLE).trim();
    var altName = normalizeAlt(displayName);

    var slot = ensureSlot(script);

    renderProfileImageBelow(slot);
    renderLoading(slot, displayName);

    function handleJson(json, nameUsed) {
      if (!json || !json.data) throw new Error("No data");
      var data = json.data;

      var who = data.displayName || nameUsed;
      var status = data.status || "unknown";
      var message = (data.awayMessage || "(no message)").trim();
      var profileUrl = "https://awaymessage.lol/me/" + encodeURIComponent(who);

      renderBox(slot, {
        name: who,
        status: status,
        message: message,
        profileUrl: profileUrl
      });
    }

    fetchStatus(displayName)
      .then(function (json) { handleJson(json, displayName); })
      .catch(function () {
        if (altName && altName !== displayName) {
          renderLoading(slot, altName);
          return fetchStatus(altName)
            .then(function (json) { handleJson(json, altName); })
            .catch(function () { renderError(slot, displayName + " / " + altName); });
        }
        renderError(slot, displayName);
      });
  } catch (e) {
    var fallbackSlot = $("away-slot");
    if (fallbackSlot) fallbackSlot.textContent = "Away status failed to load.";
  }
})();
