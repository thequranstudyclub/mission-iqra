// Seed the original Al-Alaq content as the GameEvent `operation-iqra`, so the
// existing /?event=operation-iqra (and bare / default) keeps working after the
// refactor. Content is embedded verbatim from the original lib/strings.js
// (client's own Arabic source + The Clear Quran EN + Kemenag ID) — NOT re-fetched,
// so translations stay exactly as shipped.
//
// Usage:
//   node scripts/seed-operation-iqra.mjs            # prints the config JSON
//   node scripts/seed-operation-iqra.mjs --write    # also writes to Redis (needs UPSTASH_* env)

const CONFIG = {
  event_slug: "operation-iqra",
  title: "QSC × HIMMAH — Operation Iqra",
  player_per_group: 1,
  max_group_per_mission_card: 5,
  report_summary: [
    {
      label: "The Reveal",
      hints: {
        en: "The most surprising or interesting finding from your ayat",
        id: "Temuan paling mengejutkan atau menarik dari ayat kamu",
      },
    },
    {
      label: "The Logic",
      hints: { en: "The reasoning behind your finding", id: "Alasan logis di balik temuan kamu" },
    },
    {
      label: "The Action",
      hints: {
        en: "One concrete step or mindset shift you will take this week",
        id: "Satu langkah nyata atau perubahan mindset yang bakal kamu ambil minggu ini",
      },
    },
  ],
  missionCards: [
    {
      mission_slug: "Mission 01",
      ayat_slug: "96.Al-Alaq: 1",
      ayat: {
        ref: "QS. Al-Alaq: 1",
        arabic: "اِقْرَأْ بِاسْمِ رَبِّكَ الَّذِيْ خَلَقَ",
        translation: {
          en: "Read, ˹O Prophet,˺ in the Name of your Lord Who created—",
          id: "Bacalah dengan (menyebut) nama Tuhanmu yang menciptakan.",
        },
      },
      mission_statement: {
        en: {
          title: "The Wake-Up Call",
          prompt:
            "Why was the very first command from Allah 'Read' (Iqra), instead of 'Worship'? Uncover the logic behind it. In your opinion, what is the most important thing a person should 'read' or study before doing anything else?",
        },
        id: {
          title: "Panggilan Pertama",
          prompt:
            "Kenapa perintah pertama dari Allah itu 'Baca' (Iqra), bukan 'Sembahlah'? Coba bongkar logikanya. Menurut kalian, apa hal paling penting yang harus 'dibaca' atau dipelajari manusia sebelum ngelakuin apa pun?",
        },
      },
    },
    {
      mission_slug: "Mission 02",
      ayat_slug: "96.Al-Alaq: 2",
      ayat: {
        ref: "QS. Al-Alaq: 2",
        arabic: "خَلَقَ الْاِنْسَانَ مِنْ عَلَقٍ",
        translation: {
          en: "created humans from a clinging clot.",
          id: "Dia telah menciptakan manusia dari sesuatu yang menggantung.",
        },
      },
      mission_statement: {
        en: {
          title: "The Human Potential",
          prompt:
            "In this verse, Allah highlights our humble origin. Yet Allah intends to elevate our status as a human. Based on your discussion, what is the 'hidden potential' within humans that lets us achieve greatness in this vast world?",
        },
        id: {
          title: "Potensi Manusia",
          prompt:
            "Di ayat ini Allah nge-highlight starting point kita yg berawal dari sesuatu yg sepele. Tapi Allah mau ngangkat derajat manusia. Menurut hasil diskusi kalian, apa 'potensi tersembunyi' dalam diri manusia yang bikin kita bisa jadi versi terbaik diri kita di dunia yang luas ini?",
        },
      },
    },
    {
      mission_slug: "Mission 03",
      ayat_slug: "96.Al-Alaq: 3",
      ayat: {
        ref: "QS. Al-Alaq: 3",
        arabic: "اِقْرَأْ وَرَبُّكَ الْاَكْرَمُ",
        translation: {
          en: "Read! And your Lord is the Most Generous,",
          id: "Bacalah, dan Tuhanmulah Yang Mahamulia.",
        },
      },
      mission_statement: {
        en: {
          title: "The Generous Mentor",
          prompt:
            "Among other Allah's names, why does Allah choose Al-Akram (The Most Generous) as the trait to highlight? Thus, how does Allah wants us to approach him when he's Al-Akram?",
        },
        id: {
          title: "Sang Maha Pemurah",
          prompt:
            "Dari semua nama Allah, kenapa Allah memilih Al-Akram (Yang Maha Pemurah) sebagai sifat yang di-highlight? Bagaimana cara yg Allah inginkan dari kita untuk mendekat kepada-Nya ketika Dia adalah Al-Akram?",
        },
      },
    },
    {
      mission_slug: "Mission 04",
      ayat_slug: "96.Al-Alaq: 4-5",
      ayat: {
        ref: "QS. Al-Alaq: 4-5",
        arabic: "اَلَّذِيْ عَلَّمَ بِالْقَلَمِۙ عَلَّمَ الْاِنْسَانَ مَا لَمْ يَعْلَمْ",
        translation: {
          en: "Who taught by the pen— taught humanity what they knew not.",
          id: "Yang mengajar (manusia) dengan pena. Dia mengajarkan manusia apa yang tidak diketahuinya.",
        },
      },
      mission_statement: {
        en: {
          title: "The Knowledge Tool",
          prompt:
            "This verse names the 'Pen' as the primary tool of learning. Why is the pen so special that Allah highlights it as a secret weapon of knowledge?",
        },
        id: {
          title: "Senjata Ilmu",
          prompt:
            "Ayat ini nyebut 'Pena' sebagai alat utama buat belajar. Kenapa pena sepenting itu sampai Allah nyorot dia sebagai senjata rahasia ilmu?",
        },
      },
    },
  ],
};

const write = process.argv.includes("--write");

if (!write) {
  console.log(JSON.stringify(CONFIG, null, 2));
  console.error("\n(dry run — pass --write to save to Redis; needs UPSTASH_REDIS_REST_URL / _TOKEN)");
} else {
  const { saveEventConfig } = await import("../lib/pool.js");
  const saved = await saveEventConfig(CONFIG);
  console.log(`Seeded event "${saved.event_slug}" with ${saved.missionCards.length} mission cards.`);
}
