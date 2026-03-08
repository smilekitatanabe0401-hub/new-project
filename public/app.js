(function initPdfListApp() {
  const config = window.PDF_LIST_CONFIG || {};
  const labels = config.labels || {};

  const state = {
    allItems: [],
    searchTerm: "",
    category: "",
    sort: "newest"
  };

  const el = {
    siteLogo: document.getElementById("site-logo"),
    pageTitle: document.getElementById("page-title"),
    pageDescription: document.getElementById("page-description"),
    searchInput: document.getElementById("search-input"),
    clearSearch: document.getElementById("clear-search"),
    categorySelect: document.getElementById("category-select"),
    sortSelect: document.getElementById("sort-select"),
    resultsCount: document.getElementById("results-count"),
    status: document.getElementById("status"),
    pinnedSection: document.getElementById("pinned-section"),
    pinnedList: document.getElementById("pinned-list"),
    regularSection: document.getElementById("regular-section"),
    regularList: document.getElementById("regular-list")
  };

  applyUiLabels();
  setupControls();
  populateCategoryFilter([]);
  updateResultsCount(0, 0);
  loadCsv();

  function applyUiLabels() {
    document.title = labels.pageTitle || "PDF一覧";
    applyBranding();

    if (el.pageTitle) {
      el.pageTitle.textContent = labels.pageTitle || "PDF一覧";
    }
    if (el.pageDescription) {
      el.pageDescription.textContent = labels.pageDescription || "必要な資料をすぐに見つけられます";
    }
    if (el.searchInput) {
      el.searchInput.placeholder = labels.searchPlaceholder || "タイトル・カテゴリ・メモで検索";
    }
    if (el.clearSearch) {
      el.clearSearch.textContent = labels.clearSearch || "クリア";
    }
    if (el.status) {
      el.status.textContent = labels.loading || "読み込み中...";
    }

    const sortOptions = el.sortSelect ? Array.from(el.sortSelect.options) : [];
    sortOptions.forEach((option) => {
      if (option.value === "newest") {
        option.textContent = labels.sortNewest || "日付が新しい順";
      }
      if (option.value === "oldest") {
        option.textContent = labels.sortOldest || "日付が古い順";
      }
      if (option.value === "title") {
        option.textContent = labels.sortTitle || "タイトル順";
      }
    });

    const pinnedHeading = el.pinnedSection && el.pinnedSection.querySelector("h2");
    if (pinnedHeading) {
      pinnedHeading.textContent = labels.pinnedHeading || "重要資料";
    }
    const regularHeading = el.regularSection && el.regularSection.querySelector("h2");
    if (regularHeading) {
      regularHeading.textContent = labels.regularHeading || "PDF一覧";
    }
  }

  function applyBranding() {
    if (!el.siteLogo) {
      return;
    }

    const branding = config.branding || {};
    const candidates = getLogoCandidates(branding);
    const fallbackSrc = (el.siteLogo.getAttribute("src") || "").trim();
    el.siteLogo.alt = branding.logoAlt || "サイトロゴ";

    if (!candidates.length) {
      el.siteLogo.hidden = !fallbackSrc;
      return;
    }

    loadFirstAvailableImage(candidates)
      .then((resolvedUrl) => {
        el.siteLogo.src = resolvedUrl;
        el.siteLogo.hidden = false;
      })
      .catch(() => {
        if (fallbackSrc) {
          el.siteLogo.src = fallbackSrc;
          el.siteLogo.hidden = false;
          return;
        }
        el.siteLogo.hidden = true;
      });
  }

  function getLogoCandidates(branding) {
    if (Array.isArray(branding.logoCandidates)) {
      return branding.logoCandidates.map((value) => (value || "").trim()).filter(Boolean);
    }
    if (branding.logoUrl) {
      return [String(branding.logoUrl).trim()];
    }
    return [];
  }

  function loadFirstAvailableImage(urls) {
    return new Promise((resolve, reject) => {
      let index = 0;

      const tryNext = () => {
        if (index >= urls.length) {
          reject(new Error("No logo candidates available"));
          return;
        }

        const testUrl = urls[index];
        index += 1;

        const image = new Image();
        image.onload = () => resolve(testUrl);
        image.onerror = () => tryNext();
        image.src = testUrl;
      };

      tryNext();
    });
  }

  function setupControls() {
    if (el.searchInput) {
      el.searchInput.addEventListener("input", (event) => {
        state.searchTerm = (event.target.value || "").trim().toLowerCase();
        render();
      });
    }
    if (el.clearSearch) {
      el.clearSearch.addEventListener("click", () => {
        if (el.searchInput) {
          el.searchInput.value = "";
          el.searchInput.focus();
        }
        state.searchTerm = "";
        render();
      });
    }

    if (el.categorySelect) {
      el.categorySelect.addEventListener("change", (event) => {
        state.category = event.target.value || "";
        render();
      });
    }

    if (el.sortSelect) {
      el.sortSelect.value = state.sort;
      el.sortSelect.addEventListener("change", (event) => {
        state.sort = event.target.value || "newest";
        render();
      });
    }
  }

  async function loadCsv() {
    const csvUrl = (config.csvUrl || "").trim();
    if (!csvUrl || csvUrl === "PASTE_YOUR_PUBLISHED_CSV_URL_HERE") {
      setError("config.js の csvUrl を設定してください。");
      return;
    }

    try {
      const url = withCacheBuster(csvUrl);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const csvText = await response.text();
      const rows = parseCsv(csvText);
      state.allItems = normalizeRows(rows);

      populateCategoryFilter(state.allItems);
      render();
    } catch (error) {
      setError((labels.errorPrefix || "データ取得に失敗しました:") + " " + error.message);
    }
  }

  function withCacheBuster(url) {
    if (config.cacheBuster === false) {
      return url;
    }
    return url + (url.includes("?") ? "&" : "?") + "v=" + Date.now();
  }

  function parseCsv(text) {
    const cleaned = text.replace(/^\uFEFF/, "");
    const rows = [];

    let row = [];
    let cell = "";
    let i = 0;
    let inQuotes = false;

    while (i < cleaned.length) {
      const char = cleaned[i];
      const next = cleaned[i + 1];

      if (inQuotes && char === '"' && next === '"') {
        cell += '"';
        i += 2;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        i += 1;
        continue;
      }

      if (!inQuotes && char === ",") {
        row.push(cell);
        cell = "";
        i += 1;
        continue;
      }

      if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && next === "\n") {
          i += 1;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i += 1;
        continue;
      }

      cell += char;
      i += 1;
    }

    if (cell !== "" || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    return rows;
  }

  function normalizeRows(rows) {
    if (!rows.length) {
      return [];
    }

    const headers = rows[0].map((header) => (header || "").trim().toLowerCase());
    const index = {
      category: headers.indexOf("category"),
      title: headers.indexOf("title"),
      date: headers.indexOf("date"),
      url: headers.indexOf("url"),
      note: headers.indexOf("note"),
      pin: headers.indexOf("pin")
    };

    return rows.slice(1).map((row, lineIndex) => {
      const category = getCell(row, index.category);
      const title = getCell(row, index.title);
      const date = getCell(row, index.date);
      const url = getCell(row, index.url);
      const note = getCell(row, index.note);
      const pinRaw = getCell(row, index.pin);

      return {
        id: String(lineIndex + 2),
        category,
        title,
        date,
        dateValue: toDateValue(date),
        url: normalizeUrl(url),
        note,
        pin: /^true$/i.test(pinRaw)
      };
    }).filter((item) => item.title && item.url);
  }

  function getCell(row, idx) {
    if (idx < 0 || idx >= row.length) {
      return "";
    }
    return (row[idx] || "").trim();
  }

  function toDateValue(dateText) {
    if (!dateText) {
      return Number.NEGATIVE_INFINITY;
    }
    const timestamp = Date.parse(dateText);
    if (!Number.isFinite(timestamp)) {
      return Number.NEGATIVE_INFINITY;
    }
    return timestamp;
  }

  function populateCategoryFilter(items) {
    if (!el.categorySelect) {
      return;
    }

    const categories = [...new Set(items.map((item) => item.category).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ja")
    );

    el.categorySelect.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = labels.categoryAll || "すべてのカテゴリ";
    el.categorySelect.appendChild(allOption);

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      el.categorySelect.appendChild(option);
    });

    if (state.category && !categories.includes(state.category)) {
      state.category = "";
      el.categorySelect.value = "";
    }
  }

  function render() {
    const filtered = state.allItems.filter((item) => matchesSearch(item) && matchesCategory(item));
    const pinned = sortItems(filtered.filter((item) => item.pin));
    const regular = sortItems(filtered.filter((item) => !item.pin));

    updateResultsCount(filtered.length, state.allItems.length);

    if (!filtered.length) {
      showEmpty();
      return;
    }

    setStatus("");
    renderList(el.pinnedSection, el.pinnedList, pinned);
    renderList(el.regularSection, el.regularList, regular);
  }

  function matchesSearch(item) {
    if (!state.searchTerm) {
      return true;
    }

    const target = [item.title, item.category, item.note].join(" ").toLowerCase();
    return target.includes(state.searchTerm);
  }

  function matchesCategory(item) {
    if (!state.category) {
      return true;
    }
    return item.category === state.category;
  }

  function sortItems(items) {
    const copied = items.slice();

    copied.sort((a, b) => {
      if (state.sort === "oldest") {
        if (a.dateValue !== b.dateValue) {
          return a.dateValue - b.dateValue;
        }
      } else if (state.sort === "title") {
        const titleSort = a.title.localeCompare(b.title, "ja");
        if (titleSort !== 0) {
          return titleSort;
        }
      } else {
        if (a.dateValue !== b.dateValue) {
          return b.dateValue - a.dateValue;
        }
      }

      return a.title.localeCompare(b.title, "ja");
    });

    return copied;
  }

  function renderList(sectionEl, listEl, items) {
    if (!sectionEl || !listEl) {
      return;
    }

    if (!items.length) {
      sectionEl.hidden = true;
      listEl.innerHTML = "";
      return;
    }

    sectionEl.hidden = false;
    listEl.innerHTML = "";

    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      fragment.appendChild(createCard(item));
    });
    listEl.appendChild(fragment);
  }

  function createCard(item) {
    const card = document.createElement("article");
    card.className = "card" + (item.pin ? " pin" : "");

    const title = document.createElement("h3");
    title.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "meta";

    if (item.category) {
      meta.appendChild(createBadge(item.category));
    }
    if (item.date) {
      meta.appendChild(createBadge(item.date));
    }

    const note = document.createElement("p");
    note.className = "note";
    note.textContent = item.note || "";
    note.hidden = !item.note;

    const link = document.createElement("a");
    link.className = "open-link";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = labels.openPdf || "PDFを開く";

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(note);
    card.appendChild(link);

    return card;
  }

  function createBadge(text) {
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = text;
    return span;
  }

  function normalizeUrl(url) {
    return (url || "").trim();
  }

  function updateResultsCount(filteredCount, totalCount) {
    if (!el.resultsCount) {
      return;
    }
    const template = labels.resultsCountTemplate || "{filtered}件表示 / 全{total}件";
    el.resultsCount.textContent = template
      .replace("{filtered}", String(filteredCount))
      .replace("{total}", String(totalCount));
  }

  function showEmpty() {
    setStatus(labels.noResults || "条件に一致するPDFがありません。", false);
    renderList(el.pinnedSection, el.pinnedList, []);
    renderList(el.regularSection, el.regularList, []);
  }

  function setError(message) {
    renderList(el.pinnedSection, el.pinnedList, []);
    renderList(el.regularSection, el.regularList, []);
    setStatus(message, true);
  }

  function setStatus(message, isError) {
    if (!el.status) {
      return;
    }
    el.status.textContent = message;
    el.status.classList.toggle("error", Boolean(isError));
    el.status.hidden = !message;
  }
})();
