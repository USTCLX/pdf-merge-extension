(() => {
  const strings = {
    zh: {
      title: "PDF / 图片拼接预览",
      subtitle: "本地合并 · PDF/图片 · 导出PDF · 不上传",
      add: "添加文件",
      export: "导出",
      clear: "清空",
      pages: "页面",
      pageUnit: "页",
      preview: "预览",
      dropTitle: "拖拽或点击添加 PDF / 图片",
      dropSub: "页面级排序与删除",
      emptyPreview: "添加 PDF 或图片后会自动生成长列表预览",
      imageToolsTitle: "图片调整",
      scale: "缩放",
      align: "对齐",
      alignLeft: "左",
      alignCenter: "中",
      alignRight: "右",
      alignTop: "上",
      alignMiddle: "中",
      alignBottom: "下",
      pageLabel: "第 {n} 页",
      fromFile: "来源: {name}",
      remove: "删除",
      exportStart: "正在导出…",
      exportDone: "导出完成",
      missingLib: "缺少 PDF 库文件，请放入 vendor 目录",
      loadFail: "PDF 读取失败",
      empty: "没有可导出的页面"
    },
    en: {
      title: "PDF / Image Merge Preview",
      subtitle: "Local merge · PDF/Image · Sort · Export PDF · Private | All files stay local",
      add: "Add Files",
      export: "Export",
      clear: "Clear",
      pages: "Pages",
      pageUnit: "pages",
      preview: "Preview",
      dropTitle: "Drop or click to add PDFs or images",
      dropSub: "Page-level reorder and delete",
      emptyPreview: "Add PDFs or images to build a continuous preview",
      imageToolsTitle: "Image Tools",
      scale: "Scale",
      align: "Align",
      alignLeft: "Left",
      alignCenter: "Center",
      alignRight: "Right",
      alignTop: "Top",
      alignMiddle: "Middle",
      alignBottom: "Bottom",
      pageLabel: "Page {n}",
      fromFile: "Source: {name}",
      remove: "Delete",
      exportStart: "Exporting…",
      exportDone: "Export finished",
      missingLib: "Missing PDF libraries. Put files in vendor/",
      loadFail: "Failed to load PDF",
      empty: "No pages to export"
    }
  };

  const getDefaultLocale = () =>
    (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";

  const stateLocaleKey = "pdf_merge_locale";
  let locale = localStorage.getItem(stateLocaleKey) || getDefaultLocale();

  const t = (key, vars = {}) => {
    const value = strings[locale][key] || key;
    return Object.keys(vars).reduce(
      (acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]),
      value
    );
  };

  const fileInput = document.getElementById("fileInput");
  const langZh = document.getElementById("langZh");
  const langEn = document.getElementById("langEn");
  const langToggle = document.getElementById("langToggle");
  const langDropdown = document.getElementById("langDropdown");
  const addBtn = document.getElementById("addBtn");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");
  const pageList = document.getElementById("pageList");
  const previewArea = document.getElementById("previewArea");
  const previewMeta = document.getElementById("previewMeta");
  const pageCount = document.getElementById("pageCount");
  const dropZone = document.getElementById("dropZone");
  const toast = document.getElementById("toast");
  const layout = document.getElementById("layout");
  const splitter = document.getElementById("splitter");
  const imageTools = document.getElementById("imageTools");
  const scaleRange = document.getElementById("scaleRange");
  const scaleValue = document.getElementById("scaleValue");

  const state = {
    sources: [],
    pages: [],
    nextPageId: 1,
    observer: null,
    activeImagePageId: null
  };

  const IMAGE_PAGE = { width: 595, height: 842 };

  const getImageScale = (page) => page.baseScale * page.userScale;

  const applyI18n = () => {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    langZh.classList.toggle("active", locale === "zh");
    langEn.classList.toggle("active", locale === "en");
  };

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
  };

  const updateCounts = () => {
    pageCount.textContent = String(state.pages.length);
    exportBtn.disabled = state.pages.length === 0;
    clearBtn.disabled = state.pages.length === 0;
    previewMeta.textContent =
      state.pages.length === 0 ? "" : `${state.pages.length} ${t("pageUnit")}`;
  };

  const ensureLibraries = () => {
    if (!window.pdfjsLib || !window.PDFLib) {
      showToast(t("missingLib"));
      return false;
    }
    return true;
  };

  const initPdfJs = () => {
    if (!ensureLibraries()) return false;
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
    } catch (err) {
      showToast(t("missingLib"));
      return false;
    }
    return true;
  };

  const clearAll = () => {
    state.sources = [];
    state.pages = [];
    state.nextPageId = 1;
    pageList.innerHTML = "";
    previewArea.innerHTML = `<div class="empty-preview">${t("emptyPreview")}</div>`;
    updateCounts();
  };

  const addPageCard = (page) => {
    const card = document.createElement("div");
    card.className = "page-card";
    card.draggable = true;
    card.dataset.pageId = String(page.id);
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (target.closest(".icon-btn")) return;
      scrollToPreview(page.id);
    });

    const thumb = document.createElement("canvas");
    thumb.className = "thumb";
    thumb.dataset.role = "thumb";

    const info = document.createElement("div");
    info.className = "page-info";

    const title = document.createElement("div");
    title.textContent = t("pageLabel", { n: page.displayIndex });
    title.dataset.role = "page-title";

    const source = document.createElement("small");
    source.textContent = t("fromFile", { name: page.sourceName });

    info.appendChild(title);
    info.appendChild(source);

    const actions = document.createElement("div");
    actions.className = "page-actions";

    const del = document.createElement("button");
    del.className = "icon-btn danger";
    del.textContent = t("remove");
    del.addEventListener("click", () => removePage(page.id));

    actions.appendChild(del);

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(actions);

    pageList.appendChild(card);
    page.thumbCanvas = thumb;
    renderThumbnail(page);
    return card;
  };

  const addPreviewItem = (page) => {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-item";
    wrapper.dataset.pageId = String(page.id);

    const label = document.createElement("div");
    label.className = "preview-label";
    label.dataset.role = "preview-label";
    label.textContent = t("pageLabel", { n: page.displayIndex });

    const canvas = document.createElement("canvas");
    canvas.className = "preview-canvas";
    canvas.dataset.role = "preview-canvas";

    wrapper.appendChild(label);
    wrapper.appendChild(canvas);
    previewArea.appendChild(wrapper);

    page.previewEl = wrapper;
    page.canvas = canvas;
  };

  const removePage = (id) => {
    state.pages = state.pages.filter((page) => page.id !== id);
    const card = pageList.querySelector(`[data-page-id="${id}"]`);
    if (card) card.remove();
    const preview = previewArea.querySelector(`[data-page-id="${id}"]`);
    if (preview) preview.remove();
    if (state.pages.length === 0) {
      previewArea.innerHTML = `<div class="empty-preview">${t("emptyPreview")}</div>`;
    }
    refreshPageLabels();
    updateCounts();
  };

  const refreshPageLabels = () => {
    state.pages.forEach((page, index) => {
      page.displayIndex = index + 1;
      const card = pageList.querySelector(`[data-page-id="${page.id}"] [data-role="page-title"]`);
      if (card) card.textContent = t("pageLabel", { n: page.displayIndex });
      const label = previewArea.querySelector(`[data-page-id="${page.id}"] [data-role="preview-label"]`);
      if (label) label.textContent = t("pageLabel", { n: page.displayIndex });
    });
  };

  const reorderFromList = () => {
    const ids = Array.from(pageList.querySelectorAll(".page-card")).map((el) =>
      Number(el.dataset.pageId)
    );
    const map = new Map(state.pages.map((p) => [p.id, p]));
    state.pages = ids.map((id) => map.get(id)).filter(Boolean);
    ids.forEach((id) => {
      const preview = previewArea.querySelector(`[data-page-id="${id}"]`);
      if (preview) previewArea.appendChild(preview);
    });
    refreshPageLabels();
  };

  const getDragAfterElement = (container, y) => {
    const draggableElements = [...container.querySelectorAll(".page-card:not(.dragging)")];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  };

  const setupDrag = () => {
    pageList.addEventListener("dragstart", (event) => {
      const target = event.target.closest(".page-card");
      if (!target) return;
      target.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", target.dataset.pageId);
    });

    pageList.addEventListener("dragend", (event) => {
      const target = event.target.closest(".page-card");
      if (target) target.classList.remove("dragging");
      reorderFromList();
    });

    pageList.addEventListener("dragover", (event) => {
      event.preventDefault();
      const afterElement = getDragAfterElement(pageList, event.clientY);
      const dragging = pageList.querySelector(".dragging");
      if (!dragging) return;
      if (afterElement == null) {
        pageList.appendChild(dragging);
      } else {
        pageList.insertBefore(dragging, afterElement);
      }
    });
  };

  const renderPage = async (page) => {
    if (page.rendered || page.rendering) return page.rendering;
    const task = (async () => {
      const canvas = page.canvas;
      if (page.kind === "image") {
        const bitmap = page.imageBitmap;
        const scale = page.previewScale || 1;
        const pageWidth = page.pageWidth;
        const pageHeight = page.pageHeight;
        canvas.width = Math.round(pageWidth * scale);
        canvas.height = Math.round(pageHeight * scale);
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const actualScale = getImageScale(page);
        const drawWidth = bitmap.width * actualScale * scale;
        const drawHeight = bitmap.height * actualScale * scale;
        const drawX = page.imageOffsetX * scale;
        const drawY = page.imageOffsetY * scale;
        ctx.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
      } else {
        const pdfPage = await page.pdfJsDoc.getPage(page.pageIndex + 1);
        const viewport = pdfPage.getViewport({ scale: 1.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d", { alpha: false });
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        page.width = viewport.width;
        page.height = viewport.height;
      }
      page.rendered = true;
    })();
    page.rendering = task;
    try {
      return await task;
    } finally {
      page.rendering = null;
    }
  };

  const renderThumbnail = async (page) => {
    if (page.thumbRendered || !page.thumbCanvas) return;
    try {
      const targetWidth = 48;
      const canvas = page.thumbCanvas;
      if (page.kind === "image") {
        const bitmap = page.imageBitmap;
        const pageWidth = page.pageWidth;
        const pageHeight = page.pageHeight;
        const scale = targetWidth / pageWidth;
        canvas.width = targetWidth;
        canvas.height = Math.max(1, Math.round(pageHeight * scale));
        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const actualScale = getImageScale(page);
        const drawWidth = bitmap.width * actualScale * scale;
        const drawHeight = bitmap.height * actualScale * scale;
        const drawX = page.imageOffsetX * scale;
        const drawY = page.imageOffsetY * scale;
        ctx.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
      } else {
        const pdfPage = await page.pdfJsDoc.getPage(page.pageIndex + 1);
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const scale = targetWidth / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d", { alpha: false });
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      }
      page.thumbRendered = true;
    } catch (err) {
      console.error(err);
    }
  };

  const setupObserver = () => {
    if (state.observer) state.observer.disconnect();
    state.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.dataset.pageId);
            const page = state.pages.find((p) => p.id === id);
            if (page) renderPage(page);
          }
        });
      },
      { root: previewArea, rootMargin: "200px" }
    );
  };

  const observePreviewItems = () => {
    if (!state.observer) return;
    state.pages.forEach((page) => {
      if (page.previewEl) state.observer.observe(page.previewEl);
    });
  };

  const scrollToPreview = (pageId) => {
    const item = previewArea.querySelector(`[data-page-id="${pageId}"]`);
    if (!item) return;
    const top = item.offsetTop;
    previewArea.scrollTo({ top, behavior: "smooth" });
  };

  const addFiles = async (files) => {
    if (!initPdfJs()) return;
    const list = Array.from(files).filter(
      (file) =>
        file.type === "application/pdf" ||
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg"
    );
    if (list.length === 0) return;

    for (const file of list) {
      try {
        if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer();
          const pdfJsData = arrayBuffer.slice(0);
          const pdfLibData = arrayBuffer.slice(0);
          const pdfJsDoc = await window.pdfjsLib.getDocument({ data: pdfJsData }).promise;
          const pdfLibDoc = await window.PDFLib.PDFDocument.load(pdfLibData, {
            ignoreEncryption: true
          });

          const sourceIndex = state.sources.length;
          state.sources.push({
            name: file.name,
            arrayBuffer,
            pdfJsDoc,
            pdfLibDoc
          });

          for (let i = 0; i < pdfJsDoc.numPages; i += 1) {
            const page = {
              id: state.nextPageId++,
              kind: "pdf",
              sourceIndex,
              sourceName: file.name,
              pageIndex: i,
              pdfJsDoc,
              pdfLibDoc,
              displayIndex: state.pages.length + 1,
              rendered: false,
              rendering: null,
              width: null,
              height: null,
              canvas: null,
              previewEl: null,
              thumbCanvas: null,
              thumbRendered: false
            };
            if (state.pages.length === 0) {
              previewArea.innerHTML = "";
            }
            state.pages.push(page);
            addPageCard(page);
            addPreviewItem(page);
          }
        } else {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const blob = new Blob([bytes], { type: file.type });
          const bitmap = await createImageBitmap(blob);

          const page = {
            id: state.nextPageId++,
            kind: "image",
            sourceIndex: state.sources.length,
            sourceName: file.name,
            pageIndex: 0,
            pdfJsDoc: null,
            pdfLibDoc: null,
            displayIndex: state.pages.length + 1,
            rendered: false,
            rendering: null,
            width: bitmap.width,
            height: bitmap.height,
            pageWidth: IMAGE_PAGE.width,
            pageHeight: IMAGE_PAGE.height,
            canvas: null,
            previewEl: null,
            imageBytes: bytes,
            imageType: file.type,
            imageBitmap: bitmap,
            baseScale: 1,
            userScale: 1,
            imageOffsetX: 0,
            imageOffsetY: 0,
            previewScale: 1.2,
            thumbCanvas: null,
            thumbRendered: false
          };
          const fitScale = Math.min(
            page.pageWidth / bitmap.width,
            page.pageHeight / bitmap.height
          );
          page.baseScale = fitScale;
          page.userScale = 1;
          const actualScale = getImageScale(page);
          page.imageOffsetX = (page.pageWidth - bitmap.width * actualScale) / 2;
          page.imageOffsetY = (page.pageHeight - bitmap.height * actualScale) / 2;
          state.sources.push({
            name: file.name,
            arrayBuffer,
            pdfJsDoc: null,
            pdfLibDoc: null
          });

          if (state.pages.length === 0) {
            previewArea.innerHTML = "";
          }
          state.pages.push(page);
          addPageCard(page);
          addPreviewItem(page);
        }
      } catch (err) {
        console.error(err);
        showToast(t("loadFail"));
      }
    }

    setupObserver();
    observePreviewItems();
    refreshPageLabels();
    updateCounts();
  };

  const toPngBytes = async (canvas) => {
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const exportPdf = async () => {
    if (!ensureLibraries()) return;
    if (state.pages.length === 0) {
      showToast(t("empty"));
      return;
    }

    showToast(t("exportStart"));
    const merged = await window.PDFLib.PDFDocument.create();

    for (const page of state.pages) {
      try {
        if (page.kind === "image") {
          const bytes = page.imageBytes;
          let image;
          if (page.imageType === "image/png") {
            image = await merged.embedPng(bytes);
          } else {
            image = await merged.embedJpg(bytes);
          }
          const pageWidth = page.pageWidth;
          const pageHeight = page.pageHeight;
          const actualScale = getImageScale(page);
          const drawWidth = page.imageBitmap.width * actualScale;
          const drawHeight = page.imageBitmap.height * actualScale;
          const drawX = page.imageOffsetX;
          const drawY = pageHeight - page.imageOffsetY - drawHeight;
          const pdfPage = merged.addPage([pageWidth, pageHeight]);
          pdfPage.drawImage(image, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight
          });
        } else {
          const [copied] = await merged.copyPages(page.pdfLibDoc, [page.pageIndex]);
          merged.addPage(copied);
        }
      } catch (err) {
        await renderPage(page);
        const canvas = page.canvas;
        const pngBytes = await toPngBytes(canvas);
        const image = await merged.embedPng(pngBytes);
        const pdfPage = merged.addPage([canvas.width, canvas.height]);
        pdfPage.drawImage(image, {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height
        });
      }
    }

    const pdfBytes = await merged.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `merged_${timestamp}.pdf`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(t("exportDone"));
  };

  const setupDropZone = () => {
    const activate = () => dropZone.classList.add("active");
    const deactivate = () => dropZone.classList.remove("active");

    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      activate();
    });
    dropZone.addEventListener("dragleave", deactivate);
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      deactivate();
      if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
    });
  };

  const setupActions = () => {
    addBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (event) => {
      const files = event.target.files;
      if (files) addFiles(files);
      fileInput.value = "";
    });
    exportBtn.addEventListener("click", exportPdf);
    clearBtn.addEventListener("click", clearAll);
  };

  const updateImageTools = (page) => {
    if (!page || page.kind !== "image") {
      imageTools.classList.remove("active");
      imageTools.setAttribute("aria-hidden", "true");
      return;
    }
    imageTools.classList.add("active");
    imageTools.setAttribute("aria-hidden", "false");
    scaleRange.value = page.userScale.toFixed(2);
    scaleValue.textContent = `${Math.round(page.userScale * 100)}%`;
  };

  const clampImageOffset = (page) => {
    const actualScale = getImageScale(page);
    const imgW = page.imageBitmap.width * actualScale;
    const imgH = page.imageBitmap.height * actualScale;
    const maxX = Math.max(0, page.pageWidth - imgW);
    const maxY = Math.max(0, page.pageHeight - imgH);
    page.imageOffsetX = Math.min(Math.max(page.imageOffsetX, 0), maxX);
    page.imageOffsetY = Math.min(Math.max(page.imageOffsetY, 0), maxY);
  };

  const alignImage = (page, dir) => {
    const actualScale = getImageScale(page);
    const imgW = page.imageBitmap.width * actualScale;
    const imgH = page.imageBitmap.height * actualScale;
    if (dir === "left") page.imageOffsetX = 0;
    if (dir === "center") page.imageOffsetX = (page.pageWidth - imgW) / 2;
    if (dir === "right") page.imageOffsetX = page.pageWidth - imgW;
    if (dir === "top") page.imageOffsetY = 0;
    if (dir === "middle") page.imageOffsetY = (page.pageHeight - imgH) / 2;
    if (dir === "bottom") page.imageOffsetY = page.pageHeight - imgH;
    clampImageOffset(page);
    page.rendered = false;
    page.rendering = null;
    page.thumbRendered = false;
    renderPage(page);
    renderThumbnail(page);
  };

  const setupImageTools = () => {
    previewArea.addEventListener("click", (event) => {
      const item = event.target.closest(".preview-item");
      if (!item) return;
      const id = Number(item.dataset.pageId);
      const page = state.pages.find((p) => p.id === id);
      if (page && page.kind === "image") {
        state.activeImagePageId = page.id;
        updateImageTools(page);
      } else {
        state.activeImagePageId = null;
        updateImageTools(null);
      }
    });

    scaleRange.addEventListener("input", () => {
      const page = state.pages.find((p) => p.id === state.activeImagePageId);
      if (!page) return;
      const prevActual = getImageScale(page);
      const nextUser = Number(scaleRange.value);
      const centerX = page.imageOffsetX + (page.imageBitmap.width * prevActual) / 2;
      const centerY = page.imageOffsetY + (page.imageBitmap.height * prevActual) / 2;
      page.userScale = nextUser;
      const nextActual = getImageScale(page);
      page.imageOffsetX = centerX - (page.imageBitmap.width * nextActual) / 2;
      page.imageOffsetY = centerY - (page.imageBitmap.height * nextActual) / 2;
      clampImageOffset(page);
      page.rendered = false;
      page.rendering = null;
      page.thumbRendered = false;
      renderPage(page);
      renderThumbnail(page);
      scaleValue.textContent = `${Math.round(page.userScale * 100)}%`;
    });

    imageTools.querySelectorAll("[data-align]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = state.pages.find((p) => p.id === state.activeImagePageId);
        if (!page) return;
        alignImage(page, btn.dataset.align);
      });
    });

    previewArea.addEventListener("pointerdown", (event) => {
      const item = event.target.closest(".preview-item");
      if (!item) return;
      const id = Number(item.dataset.pageId);
      const page = state.pages.find((p) => p.id === id);
      if (!page || page.kind !== "image") return;
      state.activeImagePageId = page.id;
      updateImageTools(page);
      const canvas = page.canvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / page.pageWidth;
      const startX = event.clientX;
      const startY = event.clientY;
      const startOffsetX = page.imageOffsetX;
      const startOffsetY = page.imageOffsetY;

      const move = (e) => {
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        page.imageOffsetX = startOffsetX + dx;
        page.imageOffsetY = startOffsetY + dy;
        clampImageOffset(page);
        page.rendered = false;
        page.rendering = null;
        renderPage(page);
        page.thumbRendered = false;
        renderThumbnail(page);
      };

      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
    });
  };

  const setupLanguageSwitch = () => {
    const closeMenu = () => {
      langDropdown.classList.remove("open");
      langToggle.setAttribute("aria-expanded", "false");
    };
    const openMenu = () => {
      langDropdown.classList.add("open");
      langToggle.setAttribute("aria-expanded", "true");
    };

    langToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (langDropdown.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    langZh.addEventListener("click", () => {
      locale = "zh";
      localStorage.setItem(stateLocaleKey, locale);
      applyI18n();
      closeMenu();
    });
    langEn.addEventListener("click", () => {
      locale = "en";
      localStorage.setItem(stateLocaleKey, locale);
      applyI18n();
      closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!langDropdown.contains(event.target) && !langToggle.contains(event.target)) {
        closeMenu();
      }
    });
  };

  applyI18n();
  setupActions();
  setupDropZone();
  setupDrag();
  setupResize();
  setupImageTools();
  setupLanguageSwitch();
  updateCounts();

  function setupResize() {
    if (!layout || !splitter) return;
    let dragging = false;
    let dragOffset = 0;

    const minLeft = 240;
    const maxLeftRatio = 0.6;

    const onPointerMove = (event) => {
      if (!dragging) return;
      const rect = layout.getBoundingClientRect();
      const gap = 20;
      const splitterWidth = 12;
      const maxLeft = Math.max(minLeft + 60, rect.width * maxLeftRatio);
      const raw = event.clientX - rect.left - dragOffset;
      const next = Math.min(Math.max(raw, minLeft), maxLeft);
      layout.style.setProperty("--left-width", `${next}px`);
    };

    const stop = () => {
      if (!dragging) return;
      dragging = false;
      splitter.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stop);
    };

    splitter.addEventListener("pointerdown", (event) => {
      const rect = layout.getBoundingClientRect();
      const computed = window.getComputedStyle(layout);
      const current = computed.getPropertyValue("--left-width").trim();
      const currentLeft = current ? Number.parseFloat(current) : 320;
      dragOffset = event.clientX - rect.left - currentLeft;
      dragging = true;
      splitter.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      splitter.setPointerCapture?.(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", stop);
    });
  }
})();
