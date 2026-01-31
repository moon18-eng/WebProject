import { useState, useEffect } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

function HomePage() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [Ayahs, setAyahs] = useState([]);
  const [Sorah, setSorah] = useState([]);
  const [loadingAyahs, setLoadingAyahs] = useState(true);
  const [loadingSorahs, setLoadingSorahs] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [displayAyah, setDisplayAyah] = useState(true);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const normalizeArabic = (text) => {
    if (!text) return "";
    return text
      .replace(/[\u064B-\u0652]/g, "")
      .replace(/[\u06D6-\u06ED]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .trim();
  };

  const calculateSimilarity = (s1, s2) => {
    if (!s1 || !s2) return 0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const editDistance = (s1, s2) => {
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) costs[j] = j;
          else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };
    return (
      (longer.length - editDistance(longer, shorter)) /
      parseFloat(longer.length)
    );
  };

  useEffect(() => {
    if (!transcript || !Ayahs.verses) return;
    const spokenWords = transcript.trim().split(" ");
    const lastSpokenWord = normalizeArabic(spokenWords[spokenWords.length - 1]);
    const allWords = Ayahs.verses.flatMap((v) => v.text.split(" "));
    const targetWord = normalizeArabic(allWords[currentWordIndex]);

    if (calculateSimilarity(lastSpokenWord, targetWord) >= 0.4) {
      setCurrentWordIndex((prev) => prev + 1);
    }
  }, [transcript, Ayahs.verses]);

  useEffect(() => {
    if (!listening) {
      setCurrentWordIndex(0);
      resetTranscript();
    }
  }, [listening]);

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true, language: "ar-SA" });
    }
  };

  const toggleAyahDisplay = () => {
    setDisplayAyah(!displayAyah);
  };

  const fetchSorah = async () => {
    try {
      const response = await fetch(
        "https://corsproxy.io/?" +
          "https://alquran-api.pages.dev/api/quran?lang=en",
      );
      const data = await response.json();
      setSorah(data);
    } catch (error) {
      console.error("Error fetching sorahs:", error);
    } finally {
      setLoadingSorahs(false);
    }
  };

  const fetchAyahs = async (surahId) => {
    try {
      setLoadingAyahs(true);
      const response = await fetch(
        "https://corsproxy.io/?" +
          `https://alquran-api.pages.dev/api/quran/surah/${surahId}?lang=ar`,
      );
      const data = await response.json();
      setAyahs(data);
      setCurrentWordIndex(0);
    } catch (error) {
      console.error("Error fetching ayahs:", error);
    } finally {
      setLoadingAyahs(false);
    }
  };

  useEffect(() => {
    fetchSorah();
  }, []);
  useEffect(() => {
    fetchAyahs(selectedSurah);
  }, [selectedSurah]);

  const renderAyahs = () => {
    if (loadingAyahs) {
      return (
        <div className="overflow-y-scroll [&::-webkit-scrollbar]:hidden h-125 w-266 px-5 flex items-center justify-center">
          <div className="w-full flex flex-col gap-8">
            <div className="h-16 w-full bg-gray-600/40 rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-gray-600/40 rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-gray-600/40 rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-gray-600/40 rounded-2xl animate-pulse"></div>
            <div className="h-16 w-full bg-gray-600/40 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      );
    }

    let globalWordCounter = 0;

    return (
      <div className="overflow-y-scroll h-120 w-280 scroll-smooth [&::-webkit-scrollbar]:hidden px-5">
        <div className="min-h-full flex items-center justify-center">
          <p className="text-5xl font-serif text-white leading-loose tracking-wide text-center">
            {Ayahs.verses.map((verse) => (
              <span key={verse.id}>
                {verse.text.split(" ").map((word, i) => {
                  const isRead = globalWordCounter < currentWordIndex;
                  globalWordCounter++;
                  return (
                    <span
                      key={i}
                      className={`${!displayAyah && !isRead ? "blur-lg" : ""} ${isRead && displayAyah ? "bg-[rgba(48,33,162,0.24)] py-3 text-white" : "text-white"}`}
                    >
                      {word}{" "}
                    </span>
                  );
                })}
                <span className="text-gray-400 mx-1 pr-3">
                  ﴿{verse.id}﴾
                </span>{" "}
              </span>
            ))}
          </p>
        </div>
      </div>
    );
  };

  const sorahsOptions = () => {
    if (loadingSorahs) {
      return (
        <div className="w-70 h-11 bg-gray-300/60 rounded-md animate-pulse"></div>
      );
    }
    return (
      <select
        value={selectedSurah}
        onChange={(e) => setSelectedSurah(Number(e.target.value))}
        className="w-70 h-11 p-2 border border-gray-200 rounded-md shadow-sm bg-gray-200 font-bold text-[19px]"
      >
        {Sorah.surahs.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div
      dir="rtl"
      className="bg-[url('/bg8.jpeg')] h-screen bg-cover bg-center flex flex-col items-center justify-center gap-5"
    >
      <div className="bg-[url('/bg6.gif')] bg-cover bg-center h-32 w-300 rounded-2xl flex items-center justify-between py-4 px-15">
        <div>{sorahsOptions()}</div>
        <div className="flex items-center gap-4 ">
          <div onClick={toggleAyahDisplay}>
            {displayAyah ? (
              <img
                src="/eye.png"
                alt="Logo"
                className="h-9 w-9 mb-2 bg-gray-200 rounded-[10px] p-1 cursor-pointer"
              />
            ) : (
              <img
                src="/hidden.png"
                alt="Logo"
                className="h-9 w-9 mb-2 bg-gray-200 rounded-[10px] p-1 cursor-pointer"
              />
            )}
          </div>
          <div onClick={toggleListening}>
            {listening ? (
              <img
                src="/mic.png"
                alt="Logo"
                className="h-9 w-9 mb-2 bg-blue-400 animate-pulse rounded-[10px] p-1 cursor-pointer"
              />
            ) : (
              <img
                src="/microphone.png"
                alt="Logo"
                className="h-9 w-9 mb-2 bg-gray-200 rounded-[10px] p-1 cursor-pointer"
              />
            )}
          </div>
        </div>
      </div>
      <div className="bg-[#0B1120] h-180 w-300 rounded-2xl shadow-xl flex flex-col gap-8 items-center justify-center font-bold pb-6">
        <img src="/b3.png" alt="Logo" className="h-34 w-157" />
        {renderAyahs()}
      </div>
    </div>
  );
}

export default HomePage;
