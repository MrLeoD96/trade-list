/*
 * app.js
 * ======
 * Pure logic for the trade-list site: escaping/highlighting, date
 * formatting, sorting, searching/filtering, grouping, size math, status
 * classification, deep-link query parsing, and the HTML-string builders
 * for a single record card.
 *
 * Nothing in this file touches `document`, `window`, `fetch`, or any other
 * browser global - on purpose. index.html's inline script owns the DOM
 * (wiring events, calling fetch, writing .innerHTML); everything it needs
 * to *decide what to render* lives here instead, so it can be loaded both
 * as a plain <script> in the browser and via require() under Node for
 * tests/test_app.js.
 */
(function (root, factory) {
    const mod = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = mod;
    } else {
        root.TradeListApp = mod;
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const ICONS = {
        pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
        calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>',
        file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
        users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        hdd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>',
        fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
        captions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M7 13h2"></path><path d="M13 13h4"></path><path d="M7 16h6"></path></svg>',
        alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
        star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
    };

    // -- escaping / highlighting --------------------------------------
    function esc(v) {
        return v == null || v === "" ? "-" : String(v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function hi(v, q) {
        let s = esc(v);
        if (!q) return s;
        let r = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return s.replace(new RegExp("(" + r + ")", "gi"), '<span class="highlight">$1</span>');
    }

    // -- dates -----------------------------------------------------------
    function dateValue(v) {
        if (!v) return 0;
        let p = String(v).split("/");
        if (p.length !== 3) return 0;
        return new Date(+p[2], +p[1] - 1, +p[0]).getTime() || 0;
    }

    function fmtDate(v, precision, seq) {
        if (!v) return "-";
        let p = String(v).split("/");
        if (p.length !== 3) return v;
        let d = new Date(+p[2], +p[1] - 1, +p[0]), s = seq ? " (" + seq + ")" : "";
        if (precision === "day") return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) + s;
        if (precision === "month") return d.toLocaleDateString("en-GB", { year: "numeric", month: "long" }) + s;
        if (precision === "year") return p[2] + s;
        return v + s;
    }

    // -- text helpers --------------------------------------------------
    function leads(cast) {
        if (!cast) return "";
        return String(cast).split(/\s*[;,|]\s*/).filter(Boolean).slice(0, 2).join(" · ");
    }

    function stripArticles(title) {
        return String(title).replace(/^(the|a|an)\s+/i, "").toLowerCase();
    }

    // NOTE: this is now the ONLY status field name checked. Previously the
    // export script renamed the DB's `trade_status` to `trading_status`,
    // but this file still checked `r.trade_status || r.trading_status` -
    // dead code covering for a naming split that's now resolved on the
    // export side. There is exactly one field name from here on.
    function searchable(r) {
        return [r.title, r.venue_production, r.master, r.performance_type,
            r.format_type, r.quality_resolution, r.file_size_original_text,
            r.subtitle_type, r.cast, r.notes, r.date, r.trading_status]
            .filter(Boolean).join(" ").toLowerCase();
    }

    // -- sorting / grouping ----------------------------------------------
    function sortRows(rows, sortMode) {
        return [...rows].sort((a, b) => {
            if (sortMode === "title-asc") {
                let tA = stripArticles(a.title || ""), tB = stripArticles(b.title || "");
                return tA.localeCompare(tB, undefined, { sensitivity: "base", numeric: true });
            }
            if (sortMode === "master-asc") {
                return String(a.master || "").localeCompare(String(b.master || ""), undefined, { sensitivity: "base" });
            }
            let d = dateValue(a.date) - dateValue(b.date);
            return sortMode === "date-asc" ? d : -d;
        });
    }

    function groupByTitle(rows) {
        const groups = new Map();
        rows.forEach(r => {
            const k = String(r.title || "Untitled").trim() || "Untitled";
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(r);
        });
        return groups;
    }

    // -- faceted filtering (new) ------------------------------------------
    // `resolutions`/`formats` are Sets of allowed values; empty/undefined
    // Sets mean "no filter on this facet". A row's format_type can list
    // several formats ("VOB + smalls; MKV") - it passes the format filter
    // if ANY of them is selected.
    function filterRows(rows, opts) {
        opts = opts || {};
        const q = (opts.query || "").trim().toLowerCase();
        const resolutions = opts.resolutions;
        const formats = opts.formats;
        const proshotOnly = !!opts.proshotOnly;

        return rows.filter(r => {
            if (q && !searchable(r).includes(q)) return false;
            if (proshotOnly && !r.is_proshot) return false;
            if (resolutions && resolutions.size > 0) {
                if (!resolutions.has(r.quality_resolution || "Unknown")) return false;
            }
            if (formats && formats.size > 0) {
                const rowFormats = splitMultiValue(r.format_type);
                if (!rowFormats.some(f => formats.has(f))) return false;
            }
            return true;
        });
    }

    function splitMultiValue(str) {
        return str ? String(str).split(/\s*[;,|/]\s*/).map(s => s.trim()).filter(Boolean) : [];
    }

    function distinctResolutions(shows) {
        const set = new Set();
        (shows || []).forEach(r => set.add(r.quality_resolution || "Unknown"));
        return Array.from(set).sort();
    }

    function distinctFormats(shows) {
        const set = new Set();
        (shows || []).forEach(r => splitMultiValue(r.format_type).forEach(f => set.add(f)));
        return Array.from(set).sort();
    }

    // -- size math (new) ---------------------------------------------------
    const SIZE_UNITS = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5 };

    function parseSizeString(str) {
        if (!str) return 0;
        let total = 0;
        splitMultiValue(str).forEach(part => {
            const m = part.match(/^([\d.]+)\s*([KMGTP]?B)$/i);
            if (m) {
                const value = parseFloat(m[1]);
                const unit = m[2].toUpperCase();
                if (!isNaN(value) && SIZE_UNITS[unit]) total += value * SIZE_UNITS[unit];
            }
        });
        return total;
    }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB", "PB"];
        let i = 0, size = bytes;
        while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
        return `${size.toFixed(2)} ${units[i]}`;
    }

    function computeStats(shows) {
        shows = shows || [];
        const titles = new Set();
        let totalBytes = 0;
        let proshotCount = 0;
        shows.forEach(r => {
            titles.add(String(r.title || "Untitled").trim() || "Untitled");
            totalBytes += parseSizeString(r.file_size_original_text);
            if (r.is_proshot) proshotCount++;
        });
        return {
            showCount: titles.size,
            recordingCount: shows.length,
            proshotCount,
            totalBytes,
            totalSizeText: formatBytes(totalBytes),
        };
    }

    // -- status pill classification (new) ---------------------------------
    // A trading-status string used to be forced into one binary: red
    // ("NFT") or neutral. Real data mixes two different concerns in that
    // one field - actual trade availability ("NFT except through master")
    // and a data-quality flag ("CORRUPT FILE"). Those get different
    // visual treatment now without needing a new DB column: the frontend
    // just classifies the existing text more specifically.
    function classifyStatus(status) {
        if (!status) return null;
        const s = String(status).trim();
        if (!s) return null;

        if (/\b(corrupt|damaged|broken|missing|incomplete)\b/i.test(s)) return "issue";

        const hasLetters = /[a-zA-Z]/.test(s);
        const isAllCaps = hasLetters && s === s.toUpperCase();
        if (isAllCaps) return "unavailable";

        const yearMatch = s.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            return parseInt(yearMatch[0], 10) > new Date().getFullYear() ? "unavailable" : "neutral";
        }

        if (/nft|never|forever|not for trade/i.test(s)) return "unavailable";
        return "neutral";
    }

    function renderStatusPill(status) {
        if (!status) return "";
        const kind = classifyStatus(status);
        const cls = kind === "unavailable" ? "nft-red" : kind === "issue" ? "nft-amber" : "";
        const icon = kind === "issue" ? ICONS.info : ICONS.alert;
        return `<span class="nft-pill ${cls}">${icon} ${esc(String(status).trim())}</span>`;
    }

    // -- request key (fixed) -----------------------------------------------
    // Previously title|date|master - a real (if rare) collision risk when
    // master is blank. `id` is already unique and already in the export.
    function requestKey(r) {
        if (r && r.id !== undefined && r.id !== null && r.id !== "") return "id:" + r.id;
        return [(r && r.title) || "", (r && r.date) || "", (r && r.master) || ""].join("|");
    }

    // -- format/size colouring ----------------------------------------------
    function getFileColor(format) {
        if (!format) return "var(--soft)";
        const f = format.toLowerCase();
        if (f.includes("vob")) return "#f59e0b";
        if (f.includes("mp4")) return "#3b82f6";
        if (f.includes("mkv")) return "#a855f7";
        if (f.includes("mts")) return "#14b8a6";
        if (f.includes("mov")) return "#ef4444";
        if (f.includes("m4a") || f.includes("mp3")) return "#ec4899";
        if (f.includes("wmv") || f.includes("avi")) return "#f97316";
        return "var(--soft)";
    }

    function getColoredFormatsAndSizes(formatStr, sizeStr, q) {
        const formats = splitMultiValue(formatStr);
        const sizes = splitMultiValue(sizeStr);
        const separator = ' <span style="color:var(--dim)">/</span> ';

        let fHtml = "-";
        if (formats.length > 0) {
            fHtml = formats.map(f => `<span style="color:${getFileColor(f)}">${hi(f, q)}</span>`).join(separator);
        }
        let sHtml = "-";
        if (sizes.length > 0) {
            sHtml = sizes.map((s, i) => {
                const color = formats[i] ? getFileColor(formats[i]) : "var(--soft)";
                return `<span style="color:${color}">${hi(s, q)}</span>`;
            }).join(separator);
        }
        return { formats: fHtml, sizes: sHtml };
    }

    // -- deep links (new) ----------------------------------------------------
    function parseQueryParams(search) {
        const params = new URLSearchParams(search || "");
        const obj = {};
        for (const [k, v] of params.entries()) obj[k] = v;
        return obj;
    }

    function buildQueryString(obj) {
        const params = new URLSearchParams();
        Object.keys(obj || {}).forEach(k => {
            if (obj[k]) params.set(k, obj[k]);
        });
        const s = params.toString();
        return s ? "?" + s : "";
    }

    // -- record card -----------------------------------------------------
    // Pure: given a row + view state, returns the HTML string for one
    // record. Callers own the DOM; this just decides what markup to write.
    function record(r, q, inGroup, requested) {
        const id = r.id != null ? r.id : "";
        let titleText = inGroup ? fmtDate(r.date, r.date_precision, r.master_sequence_num) : (r.title || "-");
        let dateHtml = inGroup ? "" : `<div class="summary-meta">${ICONS.calendar}<span>${hi(fmtDate(r.date, r.date_precision, r.master_sequence_num), q)}</span></div>`;

        let { formats, sizes } = getColoredFormatsAndSizes(r.format_type, r.file_size_original_text, q);
        let statusPillHtml = renderStatusPill(r.trading_status);
        let proshotPillHtml = r.is_proshot ? `<span class="proshot-pill">${ICONS.star} Proshot</span>` : "";

        return `
    <article class="record" data-id="${esc(id)}">
        <details>
            <summary>
                <div class="summary-title">
                    <div class="title-line">${hi(titleText, q)}</div>
                    ${leads(r.cast) ? `<div class="lead-line">${hi(leads(r.cast), q)}</div>` : ""}
                </div>
                <div class="summary-meta">${ICONS.pin}<span>${hi(r.venue_production || "-", q)}</span></div>
                ${dateHtml}
                ${proshotPillHtml}
                ${statusPillHtml}
                <button class="request-btn summary-req ${requested ? "requested" : ""}" data-request="${esc(id)}" title="Add to trade request">
                    ${requested ? ICONS.check : ICONS.plus}
                </button>
                <button class="request-btn summary-share" data-share="${esc(id)}" title="Copy a direct link to this recording">
                    ${ICONS.link}
                </button>
                <div class="chevron-icon">${ICONS.chevron}</div>
            </summary>
            <div class="record-body">
                <div class="record-body-inner">
                    <div class="detail">
                        <span class="detail-label">${ICONS.user} Master</span>
                        <span class="detail-value">${hi(r.master || "-", q)}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.film} Performance</span>
                        <span class="detail-value">${hi(r.performance_type || "-", q)}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.file} Format</span>
                        <span class="detail-value">${formats}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.monitor} Resolution</span>
                        <span class="detail-value">${hi(r.quality_resolution || "-", q)}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.hdd} File size</span>
                        <span class="detail-value">${sizes}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.captions} Subtitles</span>
                        <span class="detail-value">${hi(r.subtitle_type || "-", q)}</span>
                    </div>
                    <div class="detail full">
                        <span class="detail-label">${ICONS.users} Cast</span>
                        <span class="detail-value">${hi(r.cast || "-", q)}</span>
                    </div>
                    <div class="detail full">
                        <span class="detail-label">${ICONS.fileText} Notes</span>
                        <span class="detail-value">${hi(r.notes || "-", q)}</span>
                    </div>
                </div>
            </div>
        </details>
    </article>`;
    }

    return {
        ICONS,
        esc, hi,
        dateValue, fmtDate,
        leads, stripArticles, searchable,
        sortRows, groupByTitle,
        filterRows, splitMultiValue, distinctResolutions, distinctFormats,
        parseSizeString, formatBytes, computeStats,
        classifyStatus, renderStatusPill,
        requestKey,
        getFileColor, getColoredFormatsAndSizes,
        parseQueryParams, buildQueryString,
        record,
    };
});
