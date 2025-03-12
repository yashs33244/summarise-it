"use client";
import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

interface TranscriptionWord {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker_id: string;
}

interface TranscriptionData {
  text: string;
  language_code: string;
  language_probability: number;
  words: TranscriptionWord[];
}

interface FactData {
  statement: string;
  source: string;
}

interface AnalysisData {
  summary: string;
  keyPoints: string[];
  facts: FactData[];
  educationalContent: string;
}

interface TranscriptionResponse {
  success: boolean;
  title: string;
  transcription: TranscriptionData;
  requestId?: string;
  analysis?: AnalysisData;
  analysisError?: string;
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptionData, setTranscriptionData] =
    useState<TranscriptionData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "transcription" | "summary" | "keyPoints" | "facts"
  >("transcription");

  const audioRef = useRef<HTMLAudioElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
    setError(null);
  };

  const handleDownload = async () => {
    if (!videoUrl.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }

    setIsDownloading(true);
    setError(null);
    setAudioUrl(null);
    setTranscription(null);
    setTranscriptionData(null);
    setAnalysisData(null);
    setAnalysisError(null);
    setVideoTitle(null);

    try {
      // Send download request to Node.js server which forwards to Python server
      const response = await fetch("http://localhost:8080/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (data.transcription_status?.error) {
        throw new Error(data.transcription_status.error);
      }

      // Handle the updated response structure
      if (data.public_url) {
        setAudioUrl(data.public_url);
        console.log("Audio available at:", data.public_url);

        // If transcription was already done by the server
        if (data.transcription_status?.success) {
          const transcriptionResponse = data.transcription_status;
          setVideoTitle(transcriptionResponse.title);
          setTranscriptionData(transcriptionResponse.transcription);
          setTranscription(transcriptionResponse.transcription.text);

          if (transcriptionResponse.analysis) {
            setAnalysisData(transcriptionResponse.analysis);
          } else if (transcriptionResponse.analysisError) {
            setAnalysisError(transcriptionResponse.analysisError);
          }
        }
      } else {
        throw new Error("No audio URL returned from server");
      }
    } catch (err) {
      setError("Failed to download audio. Please check the URL and try again.");
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioUrl) {
      setError("No audio URL available for transcription");
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8080/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_url: audioUrl,
          title: videoTitle || "YouTube Video",
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Transcription server responded with ${response.status}`
        );
      }

      const data: TranscriptionResponse = await response.json();

      if (data.success && data.transcription) {
        setTranscriptionData(data.transcription);
        setTranscription(data.transcription.text);

        if (data.analysis) {
          setAnalysisData(data.analysis);
          setActiveTab("summary"); // Automatically switch to summary tab
        } else if (data.analysisError) {
          setAnalysisError(data.analysisError);
        }

        if (!videoTitle && data.title) {
          setVideoTitle(data.title);
        }
      } else {
        throw new Error("Invalid transcription response format");
      }
    } catch (err) {
      setError("Failed to transcribe audio");
      console.error(err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="container min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">
        YouTube Audio Downloader & AI Analysis
      </h1>

      <div className="flex flex-col space-y-4 max-w-3xl">
        <div className="flex flex-col space-y-2">
          <label htmlFor="video-url" className="font-medium">
            YouTube Video URL
          </label>
          <input
            type="text"
            id="video-url"
            className="border p-2 rounded w-full"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={handleInputChange}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading || !videoUrl.trim()}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
            isDownloading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isDownloading ? "Processing..." : "Download Audio"}
        </button>

        {audioUrl && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">
              {videoTitle ? videoTitle : "Audio Available"}
            </h2>
            <audio ref={audioRef} controls className="w-full">
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>

            <div className="mt-4">
              {!transcription && (
                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  className={`px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 ${
                    isTranscribing ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isTranscribing
                    ? "Transcribing & Analyzing..."
                    : "Transcribe & Analyze"}
                </button>
              )}
              <a
                href={audioUrl}
                className="inline-block ml-4 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Audio in New Tab
              </a>
            </div>
          </div>
        )}

        {transcription && (
          <div className="mt-6 border rounded bg-white shadow-md">
            <div className="flex border-b">
              <button
                className={`px-4 py-2 font-medium ${
                  activeTab === "transcription"
                    ? "bg-purple-100 border-b-2 border-purple-600"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("transcription")}
              >
                Transcription
              </button>

              {analysisData && (
                <>
                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "summary"
                        ? "bg-purple-100 border-b-2 border-purple-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("summary")}
                  >
                    Summary
                  </button>

                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "keyPoints"
                        ? "bg-purple-100 border-b-2 border-purple-600"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("keyPoints")}
                  >
                    Key Points
                  </button>

                  {analysisData.facts && analysisData.facts.length > 0 && (
                    <button
                      className={`px-4 py-2 font-medium ${
                        activeTab === "facts"
                          ? "bg-purple-100 border-b-2 border-purple-600"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setActiveTab("facts")}
                    >
                      Facts & Sources
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="p-4">
              {activeTab === "transcription" && (
                <div className="whitespace-pre-wrap">{transcription}</div>
              )}

              {activeTab === "summary" && analysisData && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Summary</h3>
                  <div className="whitespace-pre-wrap">
                    {analysisData.summary}
                  </div>

                  {analysisData.educationalContent && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">
                        Educational Content
                      </h3>
                      <div className="whitespace-pre-wrap">
                        {analysisData.educationalContent}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "keyPoints" && analysisData && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Key Points</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {analysisData.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "facts" && analysisData && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Facts & Sources
                  </h3>
                  {analysisData.facts.length > 0 ? (
                    <div className="space-y-4">
                      {analysisData.facts.map((fact, idx) => (
                        <div
                          key={idx}
                          className="p-3 border rounded bg-gray-50"
                        >
                          <p>{fact.statement}</p>
                          {fact.source && (
                            <p className="mt-1 text-sm text-blue-600">
                              <span className="font-medium">Source: </span>
                              <a
                                href={
                                  fact.source.startsWith("http")
                                    ? fact.source
                                    : `https://${fact.source}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {fact.source}
                              </a>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      No fact statements identified.
                    </p>
                  )}
                </div>
              )}

              {analysisError && (
                <div className="mt-4 p-3 border rounded bg-red-50 text-red-600">
                  <p className="font-medium">AI Analysis Error:</p>
                  <p>{analysisError}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
