// i18n strings + mission content for Operation Iqra Mission Card.
// Browser-safe ES module (pure data, no imports) — imported by index.html.
// Arabic ayat: from references/QSC x HIMMAH.md (client's own source doc).
// EN translation: The Clear Quran (Dr. Mustafa Khattab).
// ID translation: Kemenag (id-id, quran.com).
// Mission indices 0-3 must match the pool order in lib/pool.js.

export const I18N = {
  en: {
    brand: "QSC × HIMMAH · Operation Iqra",
    shuffling: "Shuffling mission files…",
    tap: 'Tap to <b>open</b>',
    remain: (n) => `${n} of 20 envelopes left`,
    reused: "Your mission (already drawn)",
    envAria: "Open mission envelope",
    ret: "Return envelope",
    returned: "Envelope returned to the stack ✓",
    briefLabel: "Your ayat",
    missionLabel: "Mission",
    errTitle: "Connection issue",
    errBody: "Couldn't reach the mission server. Check your connection and tap to retry.",
    retry: "Retry",
  },
  id: {
    brand: "QSC × HIMMAH · Operasi Iqra",
    shuffling: "Mengocok berkas misi…",
    tap: 'Ketuk untuk <b>buka</b>',
    remain: (n) => `${n} dari 20 amplop tersisa`,
    reused: "Misi kamu (sudah diambil)",
    envAria: "Buka amplop misi",
    ret: "Kembalikan amplop",
    returned: "Amplop dikembalikan ke tumpukan ✓",
    briefLabel: "Ayat kamu",
    missionLabel: "Misi",
    errTitle: "Koneksi bermasalah",
    errBody: "Server misi nggak kejangkau. Cek koneksi kamu lalu ketuk untuk coba lagi.",
    retry: "Coba lagi",
  },
};

// Shared: arabic (from reference doc) + ref. Per-language: title, translation, prompt.
export const MISSIONS = [
  {
    tag: "Mission 01",
    ref: "QS. Al-Alaq: 1",
    arabic: "اِقْرَأْ بِاسْمِ رَبِّكَ الَّذِيْ خَلَقَ",
    en: {
      title: "The Wake-Up Call",
      translation: "Read, ˹O Prophet,˺ in the Name of your Lord Who created—",
      prompt:
        "Why was the very first command from Allah 'Read' (Iqra), instead of 'Worship'? Uncover the logic behind it. In your opinion, what is the most important thing a person should 'read' or study before doing anything else?",
    },
    id: {
      title: "Panggilan Pertama",
      translation: "Bacalah dengan (menyebut) nama Tuhanmu yang menciptakan.",
      prompt:
        "Kenapa perintah pertama dari Allah itu 'Baca' (Iqra), bukan 'Sembahlah'? Coba bongkar logikanya. Menurut kalian, apa hal paling penting yang harus 'dibaca' atau dipelajari manusia sebelum ngelakuin apa pun?",
    },
  },
  {
    tag: "Mission 02",
    ref: "QS. Al-Alaq: 2",
    arabic: "خَلَقَ الْاِنْسَانَ مِنْ عَلَقٍ",
    en: {
      title: "The Human Potential",
      translation: "created humans from a clinging clot.",
      prompt:
        "This verse says humans were created from a 'clot' (something humble and low). Yet Allah intends to elevate human status. Based on your discussion, what is the 'hidden potential' within humans that lets us achieve greatness in this vast world?",
    },
    id: {
      title: "Potensi Manusia",
      translation: "Dia telah menciptakan manusia dari segumpal darah.",
      prompt:
        "Ayat ini bilang manusia diciptakan dari 'segumpal darah' (sesuatu yang hina dan rendah). Tapi Allah mau ngangkat derajat manusia. Menurut hasil diskusi kalian, apa 'potensi tersembunyi' dalam diri manusia yang bikin kita bisa jadi hebat di dunia yang luas ini?",
    },
  },
  {
    tag: "Mission 03",
    ref: "QS. Al-Alaq: 3",
    arabic: "اِقْرَأْ وَرَبُّكَ الْاَكْرَمُ",
    en: {
      title: "The Generous Mentor",
      translation: "Read! And your Lord is the Most Generous,",
      prompt:
        "Allah introduces Himself as Al-Akram (the Most Generous). If He is truly that generous, how should we approach Him when we want to ask for something or learn from Him? Should we feel fear, or should we feel secure?",
    },
    id: {
      title: "Sang Maha Pemurah",
      translation: "Bacalah, dan Tuhanmulah Yang Mahamulia.",
      prompt:
        "Allah memperkenalkan diri-Nya sebagai Al-Akram (Yang Maha Pemurah). Kalau Dia sebaik dan sedermawan itu, gimana seharusnya cara kita mendekat pas mau minta sesuatu atau belajar dari-Nya? Harus takut, atau justru merasa aman dan tenang?",
    },
  },
  {
    tag: "Mission 04",
    ref: "QS. Al-Alaq: 4-5",
    arabic: "اَلَّذِيْ عَلَّمَ بِالْقَلَمِۙ عَلَّمَ الْاِنْسَانَ مَا لَمْ يَعْلَمْ",
    en: {
      title: "The Knowledge Tool",
      translation:
        "Who taught by the pen— taught humanity what they knew not.",
      prompt:
        "This verse names the 'Pen' as the primary tool of learning. Why is the pen so special that Allah highlights it as a secret weapon of knowledge? What should we 'write down' or leave behind in our lives so our knowledge doesn't fade and can benefit others?",
    },
    id: {
      title: "Senjata Ilmu",
      translation:
        "Yang mengajar (manusia) dengan pena. Dia mengajarkan manusia apa yang tidak diketahuinya.",
      prompt:
        "Ayat ini nyebut 'Pena' sebagai alat utama buat belajar. Kenapa pena sepenting itu sampai Allah nyorot dia sebagai senjata rahasia ilmu? Apa yang harus kita 'tuliskan' atau tinggalkan dalam hidup biar ilmu kita nggak hilang dan bisa bermanfaat buat orang lain?",
    },
  },
];
