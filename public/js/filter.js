(function () {
  const q = document.getElementById("q");
  const list = document.getElementById("list");
  if (!q || !list) return;

  q.addEventListener("input", function () {
    const term = (q.value || "").toLowerCase().trim();
    const items = list.querySelectorAll("li[data-text]");
    for (const li of items) {
      const hay = li.getAttribute("data-text") || "";
      li.style.display = hay.includes(term) ? "" : "none";
    }
  });
})();
