// UI chrome strings for the Operation Iqra game shell (i18n only).
// Browser-safe ES module (pure data) — imported by index.html.
//
// Mission content, ayat text, and report-form labels are NO LONGER here: they
// come from the per-event GameEvent config (see lib/pool.js + /api/event).
// This file holds only the language-agnostic UI shell copy.

export const I18N = {
  en: {
    brand: "QSC × HIMMAH · Operation Iqra",
    // landing — offline (name entry)
    landingLead: "Enter your group name to receive your mission.",
    groupPlaceholder: "Group name",
    openBtn: "Open Mission Card",
    nameRequired: "Please enter a group name first.",
    nameInUse: "That group name is already in use. Please choose another.",
    // landing — online (auto group assignment)
    joinLead: "Tap to join and get your group number and mission.",
    joinBtn: "Join & Open Mission Card",
    // flow
    shuffling: "Shuffling mission files…",
    tap: 'Tap to <b>open</b>',
    remain: (n, total) => `${n} of ${total} envelopes left`,
    reused: "Your group's mission",
    envAria: "Open mission envelope",
    briefLabel: "Your ayat",
    missionLabel: "Mission",
    // group-number card (online)
    groupCardLead: "Your breakout room",
    groupWord: "Group",
    roomWord: "Room",
    // dossier / report
    writeReport: "Write Report Summary",
    dossierTitle: "Dossier Log · Report Summary",
    submitReport: "Submit Report",
    submitted: "Report submitted ✓",
    submitError: "Couldn't submit. Check your connection and try again.",
    // error view
    errTitle: "Connection issue",
    errBody: "Couldn't reach the mission server. Check your connection and tap to retry.",
    retry: "Retry",
    // event not found
    noEventTitle: "Event not found",
    noEventBody: "This mission link isn't active. Check the link with your facilitator.",
  },
  id: {
    brand: "QSC × HIMMAH · Operasi Iqra",
    landingLead: "Masukin nama kelompok kamu buat dapetin misi.",
    groupPlaceholder: "Nama kelompok",
    openBtn: "Buka Mission Card",
    nameRequired: "Isi nama kelompok dulu ya.",
    nameInUse: "Nama kelompok itu udah dipakai. Pilih nama lain ya.",
    joinLead: "Ketuk buat gabung dan dapetin nomor kelompok serta misi kamu.",
    joinBtn: "Gabung & Buka Mission Card",
    shuffling: "Mengocok berkas misi…",
    tap: 'Ketuk untuk <b>buka</b>',
    remain: (n, total) => `${n} dari ${total} amplop tersisa`,
    reused: "Misi kelompok kamu",
    envAria: "Buka amplop misi",
    briefLabel: "Ayat kamu",
    missionLabel: "Misi",
    groupCardLead: "Breakout room kamu",
    groupWord: "Kelompok",
    roomWord: "Room",
    writeReport: "Tulis Report Summary",
    dossierTitle: "Dossier Log · Report Summary",
    submitReport: "Kirim Laporan",
    submitted: "Laporan terkirim ✓",
    submitError: "Gagal kirim. Cek koneksi kamu lalu coba lagi.",
    errTitle: "Koneksi bermasalah",
    errBody: "Server misi nggak kejangkau. Cek koneksi kamu lalu ketuk untuk coba lagi.",
    retry: "Coba lagi",
    noEventTitle: "Event nggak ketemu",
    noEventBody: "Link misi ini belum aktif. Cek lagi linknya sama fasilitator kamu.",
  },
};
