/*
 * app.js
 * ======
 * Pure logic for the trade-list site: escaping/highlighting, date
 * formatting, sorting, searching/filtering, grouping, size math, status
 * classification, and the HTML-string builder for a single record card.
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
        star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
    };

    // -- escaping / highlighting --------------------------------------
    // Plain HTML-entity escaping, no "-" placeholder behavior - esc() below
    // (the one most of this file calls) wraps this with that placeholder
    // for display purposes, but hi()'s chunk-by-chunk highlighter below
    // needs to escape substrings that are legitimately empty (e.g. a match
    // starting at position 0 has nothing before it) without them turning
    // into a stray "-".
    function escRaw(v) {
        return String(v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function esc(v) {
        return v == null || v === "" ? "-" : escRaw(v);
    }

    // Diacritic-insensitive highlighting: a search for "raul" needs to
    // highlight "Raúl" in the rendered text, accents and all - not some
    // ASCII stand-in. foldDiacritics (below) collapses accented characters
    // down to their base letter for COMPARISON, but the actual highlighted
    // span still wraps the real original characters; `map` remembers, for
    // every character in the folded string, which character of the
    // original string it came from, so a match found in folded-space can
    // be translated back to the right slice of the real text.
    function hi(v, q) {
        if (v == null || v === "") return "-";
        const orig = String(v);
        if (!q) return esc(orig);
        const foldedQ = foldDiacritics(String(q)).toLowerCase();
        if (!foldedQ) return esc(orig);

        const origChars = Array.from(orig);
        let folded = "";
        const map = []; // map[i] = index into origChars for folded[i]
        origChars.forEach((ch, idx) => {
            const piece = foldDiacritics(ch);
            for (const fc of piece) { folded += fc; map.push(idx); }
        });
        const foldedLower = folded.toLowerCase();

        let result = "", lastEnd = 0, searchFrom = 0;
        while (true) {
            const idx = foldedLower.indexOf(foldedQ, searchFrom);
            if (idx === -1) break;
            const endIdx = idx + foldedQ.length - 1;
            const origStart = map[idx];
            const origEnd = map[endIdx] + 1;
            result += escRaw(origChars.slice(lastEnd, origStart).join(""));
            result += '<span class="highlight">' + escRaw(origChars.slice(origStart, origEnd).join("")) + '</span>';
            lastEnd = origEnd;
            searchFrom = endIdx + 1;
        }
        result += escRaw(origChars.slice(lastEnd).join(""));
        return result;
    }

    // -- dates -----------------------------------------------------------
    // Schema v3 collapsed the old two-field {date: "DD/MM/YYYY", precision}
    // into one canonical "DD-MM-YYYY" string, "00" standing in for an
    // unknown day and/or month (e.g. "00-12-2025" is "December 2025",
    // "00-00-2025" is just "2025") - see archive_app.py's parse_stored_date.
    // Month names are spelled out explicitly rather than via
    // toLocaleDateString so display doesn't depend on the visitor's browser
    // locale.
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    function dateValue(v) {
        if (!v) return 0;
        let p = String(v).split("-");
        if (p.length !== 3) return 0;
        let d = +p[0], mo = +p[1], y = +p[2];
        if (!y) return 0;
        // Missing day/month fall back to the 1st/January so a year- or
        // month-only date still sorts chronologically among exact ones.
        return new Date(y, (mo || 1) - 1, d || 1).getTime() || 0;
    }

    function fmtDate(v, seq) {
        if (!v) return "-";
        let s = seq ? " (" + seq + ")" : "";
        let p = String(v).split("-");
        // Not a recognized DD-MM-YYYY form - shown as-is. This is also used
        // for nft_date, which may hold free text like "FOREVER EXCEPT
        // THROUGH MASTER" rather than a date at all.
        if (p.length !== 3) return v + s;
        let d = +p[0], mo = +p[1], y = +p[2];
        if (!y) return v + s;
        if (d && mo) return `${MONTH_NAMES[mo - 1]} ${String(d).padStart(2, "0")}, ${y}${s}`;
        if (mo) return `${MONTH_NAMES[mo - 1]} ${y}${s}`;
        return `${y}${s}`;
    }

    // -- NFT display (nft_date can hold either a real "DD-MM-YYYY" date -
    // the same stored-date convention as the `date` field above - or free
    // text like "FOREVER EXCEPT THROUGH MASTER"; both mean "not tradeable
    // right now", just phrased differently) ------------------------------
    function isStoredDateShape(v) {
        return /^\d{2}-\d{2}-\d{4}$/.test(String(v || "").trim());
    }

    function ordinal(n) {
        const suffixes = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }

    // "November 5th, 2026" - same DD-MM-YYYY parsing as fmtDate, but with
    // an ordinal day and no sequence-number suffix; used only for the NFT
    // bubble/detail, which wants a more conversational date than fmtDate's
    // "November 05, 2026" style used everywhere else.
    function fmtDateReadable(v) {
        let p = String(v).split("-");
        if (p.length !== 3) return String(v);
        let d = +p[0], mo = +p[1], y = +p[2];
        if (!y) return String(v);
        if (d && mo) return `${MONTH_NAMES[mo - 1]} ${ordinal(d)}, ${y}`;
        if (mo) return `${MONTH_NAMES[mo - 1]} ${y}`;
        return `${y}`;
    }

    // Always-shown label for the NFT detail row, regardless of whether the
    // restriction is still active: "NFT until {date}" for a real date
    // (flagged "(expired)" once it's passed), or "NFT {text}" verbatim for
    // free text.
    function formatNftDisplay(nftStr) {
        if (!nftStr) return "";
        if (isStoredDateShape(nftStr)) {
            const label = `NFT until ${fmtDateReadable(nftStr)}`;
            return dateValue(nftStr) < Date.now() ? `${label} (expired)` : label;
        }
        return `NFT ${String(nftStr).trim()}`;
    }

    // Whether the NFT restriction is worth flagging in the summary row: a
    // real date only counts while it's still in the future (a passed NFT
    // date is no longer a restriction); free text has no expiry, so it's
    // always active.
    function isNftActive(nftStr) {
        if (!nftStr) return false;
        if (isStoredDateShape(nftStr)) return dateValue(nftStr) > Date.now();
        return !!String(nftStr).trim();
    }

    // -- flag pills --------------------------------------------------------
    // A data-quality problem (corrupt/damaged/etc) gets the same amber
    // "issue" treatment classifyStatus (below) already uses for that;
    // anything else (Censored, Uncensored, ...) is purely informational.
    function classifyFlagText(flag) {
        return /\b(corrupt|damaged|broken|missing|incomplete)\b/i.test(flag) ? "issue" : "info";
    }

    function renderFlagPills(flagsStr, q) {
        if (!flagsStr) return "";
        return splitMultiValue(flagsStr).map(f => {
            const isIssue = classifyFlagText(f) === "issue";
            const cls = isIssue ? "nft-pill nft-amber" : "flag-pill";
            const icon = isIssue ? ICONS.alert : ICONS.info;
            return `<span class="${cls}">${icon} ${hi(f, q)}</span>`;
        }).join("");
    }

    // -- text helpers --------------------------------------------------
    function leads(cast) {
        if (!cast) return "";
        return String(cast).split(/\s*[;,|]\s*/).filter(Boolean).slice(0, 2).join(" · ");
    }

    // Strips accents/diacritics so "Raúl Esparza" and "raul esparza" slugify
    // and match identically - names in the cast field are typed with real
    // accents, but URLs/search shouldn't require typing them.
    function foldDiacritics(str) {
        return String(str || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
    }

    // Splits a free-text cast field into individual "Name (Role)" entries.
    // Depth-aware: only a comma/semicolon OUTSIDE parentheses ends one
    // entry and starts the next, so anything inside the parens - slashes,
    // pipes, spaces, even commas - never gets mistaken for a boundary
    // between two people. Deliberately NOT splitMultiValue (which splits
    // on those characters unconditionally): a role can contain a slash
    // ("Aaron Alcaraz (s/w Ensemble)") or a pipe ("Megan Hilty (Ivy Lynn/
    // Norma Jeane | Marilyn Monroe)" - Bombshell's dual-role structure),
    // and both used to tear a single entry's parenthetical in half.
    function splitCastEntries(castStr) {
        if (!castStr) return [];
        const str = String(castStr);
        const entries = [];
        let depth = 0, current = "";
        for (const ch of str) {
            if (ch === "(") { depth++; current += ch; continue; }
            if (ch === ")") { depth = Math.max(0, depth - 1); current += ch; continue; }
            if (depth === 0 && (ch === "," || ch === ";")) {
                entries.push(current.trim());
                current = "";
                continue;
            }
            current += ch;
        }
        if (current.trim()) entries.push(current.trim());
        return entries.filter(Boolean);
    }

    // Splits a free-text cast field ("Raúl Esparza (Bobby); Jane Doe (Amy)")
    // into just the performer names: everything before the "(" is the
    // actor's name, everything inside it is the character/role and is
    // ignored here - and ONLY that split point counts, regardless of what
    // punctuation shows up inside the parens.
    function parseCastNames(castStr) {
        return splitCastEntries(castStr).map(entry => {
            const parenIdx = entry.indexOf("(");
            return (parenIdx === -1 ? entry : entry.slice(0, parenIdx)).trim();
        }).filter(Boolean);
    }

    // Every distinct performer name across the whole archive, alphabetized -
    // backs the cast-search suggestions and the #videos/cast/<slug> deep link.
    function distinctCastNames(shows) {
        const set = new Set();
        (shows || []).forEach(r => { parseCastNames(r.cast).forEach(n => set.add(n)); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }

    function stripArticles(title) {
        return String(title).replace(/^(the|a|an)\s+/i, "").toLowerCase();
    }

    // NOTE: this is now the ONLY status field name checked. Previously the
    // export script renamed the DB's `trade_status` to `trading_status`,
    // but this file still checked `r.trade_status || r.trading_status` -
    // dead code covering for a naming split that's now resolved on the
    // export side. There is exactly one field name from here on.
    //
    // Schema v3 split the old single free-text `venue_production` into
    // tour/production/venue/city, `notes` into master_notes/trader_notes,
    // and renamed format_type/quality_resolution/file_size_original_text/
    // subtitle_type to format/resolution/file_size/subtitles. All of it is
    // searchable, same as the old fields were.
    function searchable(r) {
        return [r.title, r.tour, r.production, r.venue, r.city, r.master,
            r.performance_type, r.performance_time, r.media_type, r.recording_type, r.completeness,
            r.format, r.resolution, r.file_size, r.subtitles,
            r.cast, r.master_notes, r.trader_notes, r.flags, r.date, r.nft_date, r.trading_status]
            .filter(Boolean).join(" ").toLowerCase();
    }

    // -- sorting / grouping ----------------------------------------------
    // Ranks a performance_time string for chronological ordering within a
    // single date (matinee before evening); unspecified sits in between
    // rather than arbitrarily first or last.
    function timeOfDayRank(performanceTime) {
        const t = String(performanceTime || "").toLowerCase();
        if (t.includes("mat")) return 0;
        if (t.includes("eve")) return 1;
        return 0.5;
    }

    function sortRows(rows, sortMode) {
        return [...rows].sort((a, b) => {
            if (sortMode === "title-asc") {
                let tA = stripArticles(a.title || ""), tB = stripArticles(b.title || "");
                let cmp = tA.localeCompare(tB, undefined, { sensitivity: "base", numeric: true });
                if (cmp !== 0) return cmp;
                // Same show: order its recordings chronologically, then
                // matinee before evening when they share a date.
                let dateCmp = dateValue(a.date) - dateValue(b.date);
                if (dateCmp !== 0) return dateCmp;
                return timeOfDayRank(a.performance_time) - timeOfDayRank(b.performance_time);
            }
            if (sortMode === "master-asc") {
                let masterCmp = String(a.master || "").localeCompare(String(b.master || ""), undefined, { sensitivity: "base" });
                if (masterCmp !== 0) return masterCmp;
                // Same taper: order their recordings chronologically too.
                return dateValue(a.date) - dateValue(b.date);
            }
            let d = dateValue(a.date) - dateValue(b.date);
            return sortMode === "date-asc" ? d : -d;
        });
    }

    // Generic grouping by any field-derived key. groupByTitle/groupByMaster
    // are the two groupings the UI actually offers (title-asc and
    // master-asc sort modes respectively).
    function groupByField(rows, keyFn) {
        const groups = new Map();
        rows.forEach(r => {
            const k = String(keyFn(r) || "Untitled").trim() || "Untitled";
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(r);
        });
        return groups;
    }

    function groupByTitle(rows) {
        return groupByField(rows, r => r.title);
    }

    function groupByMaster(rows) {
        return groupByField(rows, r => r.master);
    }

    // -- faceted filtering ------------------------------------------------
    // `resolutions` is a Set of allowed exact values; empty/undefined means
    // "no filter on this facet". `yearRange` is {min, max} (inclusive,
    // either bound optional) rather than a Set of individual years - the UI
    // is a range slider, not one chip per year. `titleSlug`, if set,
    // restricts to shows whose slugified title contains it (see slugify()
    // below - this is what backs the #show-name deep link).
    function filterRows(rows, opts) {
        opts = opts || {};
        const q = (opts.query || "").trim().toLowerCase();
        const resolutions = opts.resolutions;
        const yearRange = opts.yearRange;
        const proshotOnly = !!opts.proshotOnly;
        const titleSlug = (opts.titleSlug || "").trim();
        const castSlug = (opts.castSlug || "").trim();

        // Diacritic-insensitive: folding both sides means searching "raul"
        // matches "Raúl" - same fold used for slugs/highlighting elsewhere.
        const foldedQ = foldDiacritics(q);

        return rows.filter(r => {
            if (foldedQ && !foldDiacritics(searchable(r)).includes(foldedQ)) return false;
            // is_proshot (bool) -> recording_type (Bootleg/Pro-Shot/House
            // Cam/Press Reel/Demo/Soundboard) in schema v3; "Proshot only"
            // keeps its old meaning of "exactly Pro-Shot" for now.
            if (proshotOnly && r.recording_type !== "Pro-Shot") return false;
            if (resolutions && resolutions.size > 0) {
                if (!r.resolution || !resolutions.has(r.resolution)) return false;
            }
            if (yearRange && (yearRange.min != null || yearRange.max != null)) {
                const y = getYear(r.date);
                const yNum = y ? parseInt(y, 10) : null;
                if (yNum == null) return false;
                if (yearRange.min != null && yNum < yearRange.min) return false;
                if (yearRange.max != null && yNum > yearRange.max) return false;
            }
            if (titleSlug && !slugify(r.title).includes(titleSlug)) return false;
            if (castSlug && !parseCastNames(r.cast).some(n => slugify(n).includes(castSlug))) return false;
            return true;
        });
    }

    function splitMultiValue(str) {
        return str ? String(str).split(/\s*[;,|/]\s*/).map(s => s.trim()).filter(Boolean) : [];
    }

    // Blank/missing resolution values are deliberately excluded from the
    // filter chip options - an "Unknown" chip isn't a facet anyone would
    // filter BY, it's just an unfilled field. Also excludes a literal
    // "Unknown"/"unknown" text value, in case that's what's actually
    // stored rather than a blank field. Rows with no usable resolution
    // still show up normally when no resolution filter is active.
    function distinctResolutions(shows) {
        const set = new Set();
        (shows || []).forEach(r => {
            const val = String(r.resolution || "").trim();
            if (val && val.toLowerCase() !== "unknown") set.add(val);
        });
        return Array.from(set).sort();
    }

    // -- year range ----------------------------------------------------------
    function getYear(dateStr) {
        if (!dateStr) return null;
        const parts = String(dateStr).split("/");
        return parts.length === 3 && parts[2] ? parts[2] : null;
    }

    function distinctYears(shows) {
        const set = new Set();
        (shows || []).forEach(r => { const y = getYear(r.date); if (y) set.add(y); });
        // Newest first - more useful than alphabetical for browsing by year.
        return Array.from(set).sort((a, b) => b - a);
    }

    // Numeric {min, max} bounds for the year range slider - null if no
    // record has a usable date at all.
    function getYearBounds(shows) {
        const years = distinctYears(shows).map(y => parseInt(y, 10)).filter(y => !isNaN(y));
        if (!years.length) return null;
        return { min: Math.min(...years), max: Math.max(...years) };
    }

    // Turns a title into a URL-friendly slug ("Sweeney Todd: The Demon
    // Barber" -> "sweeney-todd-the-demon-barber"), used for #show-name deep
    // links: visiting .../#cabaret filters the page to shows whose slug
    // contains "cabaret", instead of linking to one specific recording.
    function slugify(text) {
        return foldDiacritics(String(text || "")).toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    // -- README section splitting ------------------------------------------
    // The static pages (Home/Wants/Rules/Contact) are driven entirely by
    // top-level "# Heading" sections in README.md, keyed by the lowercased
    // heading text. A "# Heading" (H1, exactly one #) starts a new
    // section; everything up to the next H1 (or EOF) belongs to it.
    // Sub-headings (##, ###...) inside a section are left alone - only the
    // top level splits pages. Content before the first H1 is discarded (a
    // README's own title line, if any, isn't page content).
    function splitMarkdownSections(markdown) {
        const sections = {};
        if (!markdown) return sections;

        const lines = String(markdown).split(/\r?\n/);
        let currentKey = null;
        let buffer = [];

        function flush() {
            if (currentKey) sections[currentKey] = buffer.join("\n").trim();
            buffer = [];
        }

        for (const line of lines) {
            const m = line.match(/^#\s+(.+?)\s*$/); // one # only, not ## or deeper
            if (m) {
                flush();
                currentKey = m[1].trim().toLowerCase();
            } else if (currentKey) {
                buffer.push(line);
            }
        }
        flush();
        return sections;
    }

    // -- disambiguation bubble ------------------------------------------------
    // Within a group, two recordings can look identical in the collapsed
    // summary row (e.g. grouped by title, both showing the same date - a
    // matinee and an evening performance of the same show on the same day).
    // If performance_type or performance_time actually differs between the
    // colliding recordings, surface that difference as a small bubble so
    // they're distinguishable without expanding either one. Deliberately
    // generic - whatever text is in those fields ("Matinee"/"Evening",
    // "Preview", "censored"/"uncensored", anything) is used as-is, nothing
    // is hardcoded to a specific vocabulary.
    //
    // `summaryKeyFn` is whatever the group's own collapsed identifier is:
    // the formatted date when grouped by title, the title itself when
    // grouped by master.
    function computeDisambiguationLabels(groupRows, summaryKeyFn) {
        const byKey = new Map();
        groupRows.forEach(r => {
            const key = summaryKeyFn(r);
            if (!byKey.has(key)) byKey.set(key, []);
            byKey.get(key).push(r);
        });

        const labels = new Map();
        byKey.forEach(collidingRows => {
            if (collidingRows.length < 2) return; // no collision, nothing to disambiguate
            const types = new Set(collidingRows.map(r => String(r.performance_type || "").trim()));
            const times = new Set(collidingRows.map(r => String(r.performance_time || "").trim()));
            const typeVaries = types.size > 1;
            const timeVaries = times.size > 1;
            if (!typeVaries && !timeVaries) return; // still indistinguishable, nothing to add

            collidingRows.forEach(r => {
                const parts = [];
                if (typeVaries && r.performance_type && String(r.performance_type).trim()) {
                    parts.push(String(r.performance_type).trim());
                }
                if (timeVaries && r.performance_time && String(r.performance_time).trim()) {
                    parts.push(String(r.performance_time).trim());
                }
                if (parts.length) labels.set(r, parts.join(" · "));
            });
        });
        return labels;
    }

    // -- size math ---------------------------------------------------
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
            totalBytes += parseSizeString(r.file_size);
            if (r.recording_type === "Pro-Shot") proshotCount++;
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

    // -- cast rendering -----------------------------------------------------
    // Renders one "Name (Role)" cast entry as a clickable
    // #videos/cast/<slug> link around just the name, preserving the role
    // suffix as plain text. When castHighlightSlug is set (viewing that
    // performer's own deep link) and this entry is them, the name gets the
    // same amber highlight styling as a search match, so their name stands
    // out in every show listed on the filtered page.
    function renderCastEntry(entry, q, castHighlightSlug) {
        // Same rule as parseCastNames: everything before the first "(" is
        // the name, everything from it onward (role, alternates, whatever
        // punctuation it holds) is just carried along as display text.
        const parenIdx = entry.indexOf("(");
        const name = (parenIdx === -1 ? entry : entry.slice(0, parenIdx)).trim();
        const roleSuffix = parenIdx === -1 ? "" : " " + entry.slice(parenIdx).trim();
        const slug = slugify(name);
        let nameHtml = hi(name, q);
        if (castHighlightSlug && slug.includes(castHighlightSlug)) {
            nameHtml = `<span class="highlight">${nameHtml}</span>`;
        }
        return `<a class="cast-link" href="#videos/cast/${esc(slug)}">${nameHtml}</a>${esc(roleSuffix)}`;
    }

    // limit: cap how many entries render (used for the brief summary
    // lead-line); omitted/0 renders the full cast list (used in the
    // expanded Cast detail row).
    function renderCastHtml(castStr, q, castHighlightSlug, limit) {
        if (!castStr) return "-";
        let entries = splitCastEntries(castStr);
        if (!entries.length) return hi(castStr, q);
        if (limit) entries = entries.slice(0, limit);
        return entries.map(e => renderCastEntry(e, q, castHighlightSlug)).join(limit ? " &middot; " : ", ");
    }

    // -- record card -----------------------------------------------------
    // Pure: given a row + view state, returns the HTML string for one
    // record. Callers own the DOM; this just decides what markup to write.
    // castHighlightSlug: set while viewing a #videos/cast/<slug> deep link,
    // so this performer's name can be highlighted everywhere it appears.
    function record(r, q, groupMode, requested, disambigLabel, castHighlightSlug) {
        const id = r.id != null ? r.id : "";
        // groupMode: 'none' (ungrouped), 'title' (grouped by show - title is
        // the group header, so the record's own line shows its date
        // instead), or 'master' (grouped by taper - master is the group
        // header, so the record's own line shows its show title, same as
        // ungrouped).
        let titleText = groupMode === "title"
            ? fmtDate(r.date, r.sequence_number)
            : (r.title || "-");
        let dateHtml = groupMode === "title" ? "" :
            `<div class="summary-meta">${ICONS.calendar}<span>${hi(fmtDate(r.date, r.sequence_number), q)}</span></div>`;

        let { formats, sizes } = getColoredFormatsAndSizes(r.format, r.file_size, q);
        let statusPillHtml = renderStatusPill(r.trading_status);
        // is_proshot (bool) -> recording_type (schema v3) can be Pro-Shot,
        // House Cam, Press Reel, Demo, or Soundboard - anything other than
        // the Bootleg default gets the same pill, now labeled with its
        // actual type instead of a fixed "Proshot".
        let recTypePillHtml = (r.recording_type && r.recording_type !== "Bootleg")
            ? `<span class="proshot-pill">${ICONS.star} ${esc(r.recording_type)}</span>` : "";
        // Shown when a sibling in the same group would otherwise look
        // identical in this collapsed view (see computeDisambiguationLabels).
        let disambigHtml = disambigLabel ? `<span class="disambig-pill">${hi(disambigLabel, q)}</span>` : "";
        // A currently-active NFT restriction (date still in the future, or
        // free text with no expiry) gets its own red bubble right in the
        // summary row, same as it used to - a passed NFT date no longer
        // counts as a restriction, so it drops out of the summary (it's
        // still visible, noted "(expired)", in the NFT detail row below).
        let nftPillHtml = isNftActive(r.nft_date)
            ? `<span class="nft-pill nft-red">${ICONS.alert} ${hi(formatNftDisplay(r.nft_date), q)}</span>` : "";
        // Data-quality flags (CORRUPT FILE, ...) and purely informational
        // ones (Censored/Uncensored, ...) both get their own pill here too,
        // so they're visible without expanding the card.
        let flagPillsHtml = renderFlagPills(r.flags, q);

        // "Where" used to be one free-text field (venue_production) filled
        // in with whatever was most specific at the time - schema v3 split
        // that into tour/production/venue/city. `tour` (Broadway/West End/
        // Regional/...) is deliberately left out here and out of the
        // detail grid below - it's for sorting/grouping, not for display.
        let whereText = r.production || r.venue || "-";

        // Audio-only masters (media_type) don't have a resolution.
        let isAudio = String(r.media_type || "").toLowerCase() === "audio";
        let resolutionHtml = isAudio ? "" : `
                    <div class="detail">
                        <span class="detail-label">${ICONS.monitor} Resolution</span>
                        <span class="detail-value">${hi(r.resolution || "-", q)}</span>
                    </div>`;

        // These are all new in schema v3 and often blank, so - unlike the
        // always-shown details above - they only render when there's
        // actually something to say. `tour` is left out on purpose (see
        // whereText above); `production` is the specific staging (e.g.
        // "Second Broadway Revival") and gets shown alongside its venue
        // and city.
        let productionHtml = r.production ? `
                    <div class="detail">
                        <span class="detail-label">${ICONS.info} Production</span>
                        <span class="detail-value">${hi(r.production, q)}</span>
                    </div>` : "";
        let venueHtml = r.venue ? `
                    <div class="detail">
                        <span class="detail-label">${ICONS.pin} Venue</span>
                        <span class="detail-value">${hi(r.venue, q)}</span>
                    </div>` : "";
        let cityHtml = r.city ? `
                    <div class="detail">
                        <span class="detail-label">${ICONS.pin} City</span>
                        <span class="detail-value">${hi(r.city, q)}</span>
                    </div>` : "";
        let completenessHtml = (r.completeness && r.completeness !== "Full Show") ? `
                    <div class="detail">
                        <span class="detail-label">${ICONS.check} Completeness</span>
                        <span class="detail-value">${hi(r.completeness, q)}</span>
                    </div>` : "";
        // Always shown when present, regardless of whether the summary
        // pill above is (a passed NFT date still gets recorded here, just
        // noted "(expired)" - see formatNftDisplay).
        let nftHtml = r.nft_date ? `
                    <div class="detail">
                        <span class="detail-label">${ICONS.calendar} NFT</span>
                        <span class="detail-value">${hi(formatNftDisplay(r.nft_date), q)}</span>
                    </div>` : "";
        let traderNotesHtml = r.trader_notes ? `
                    <div class="detail full">
                        <span class="detail-label">${ICONS.info} Trader Notes</span>
                        <span class="detail-value">${hi(r.trader_notes, q)}</span>
                    </div>` : "";

        return `
    <article class="record" data-id="${esc(id)}">
        <details>
            <summary>
                <div class="summary-title">
                    <div class="title-line">${hi(titleText, q)}</div>
                    ${leads(r.cast) ? `<div class="lead-line">${renderCastHtml(r.cast, q, castHighlightSlug, 2)}</div>` : ""}
                </div>
                <div class="summary-meta">${ICONS.pin}<span>${hi(whereText, q)}</span></div>
                ${dateHtml}
                ${disambigHtml}
                ${recTypePillHtml}
                ${statusPillHtml}
                ${nftPillHtml}
                ${flagPillsHtml}
                <button class="request-btn summary-req ${requested ? "requested" : ""}" data-request="${esc(id)}" title="Add to trade request">
                    ${requested ? ICONS.check : ICONS.plus}
                </button>
                <div class="chevron-icon">${ICONS.chevron}</div>
            </summary>
            <div class="record-body">
                <div class="record-body-inner">
                    <div class="detail">
                        <span class="detail-label">${ICONS.user} Master</span>
                        <span class="detail-value">${hi(r.master || "-", q)}</span>
                    </div>${productionHtml}${venueHtml}${cityHtml}
                    <div class="detail">
                        <span class="detail-label">${ICONS.film} Performance</span>
                        <span class="detail-value">${hi([r.performance_type, r.performance_time].filter(Boolean).join(" · ") || "-", q)}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.file} Format</span>
                        <span class="detail-value">${formats}</span>
                    </div>${resolutionHtml}
                    <div class="detail">
                        <span class="detail-label">${ICONS.hdd} File size</span>
                        <span class="detail-value">${sizes}</span>
                    </div>
                    <div class="detail">
                        <span class="detail-label">${ICONS.captions} Subtitles</span>
                        <span class="detail-value">${hi(r.subtitles || "-", q)}</span>
                    </div>${completenessHtml}${nftHtml}
                    <div class="detail full">
                        <span class="detail-label">${ICONS.users} Cast</span>
                        <span class="detail-value">${renderCastHtml(r.cast, q, castHighlightSlug)}</span>
                    </div>
                    <div class="detail full">
                        <span class="detail-label">${ICONS.fileText} Master Notes</span>
                        <span class="detail-value">${hi(r.master_notes || "-", q)}</span>
                    </div>${traderNotesHtml}
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
        foldDiacritics, splitCastEntries, parseCastNames, distinctCastNames,
        sortRows, timeOfDayRank, groupByField, groupByTitle, groupByMaster,
        filterRows, splitMultiValue, distinctResolutions, slugify, splitMarkdownSections,
        getYear, distinctYears, getYearBounds,
        computeDisambiguationLabels,
        parseSizeString, formatBytes, computeStats,
        classifyStatus, renderStatusPill,
        fmtDateReadable, formatNftDisplay, isNftActive,
        classifyFlagText, renderFlagPills,
        requestKey,
        getFileColor, getColoredFormatsAndSizes,
        record,
    };
});
