
import React, { useState, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import './index.css';

// --- CONSTANTS FOR DOWNLOADS ---
const README_CONTENT = `# Comment Categorization & Reply Assistant Tool

**Submitted by:** N Akash
**Tech Stack:** React, TypeScript, Google Gemini API, Tailwind CSS

## Project Overview
This tool automates the process of moderating user feedback. It utilizes Natural Language Processing (via Gemini AI) to analyze comments, classify them into 8 distinct categories, and generate appropriate responses or internal action flags.

## Problem Statement
Brands receive thousands of comments. Manually sorting "Constructive Criticism" from "Hate", or identifying "Threats" vs "Support", is time-consuming. This tool solves this by acting as an intelligent triage layer.

## Key Features
1.  **Nuanced Classification:**
    *   Distinguishes between **Constructive Criticism** (valid feedback) and **Hate/Abuse** (toxic).
    *   Identifies **Threats** for safety escalation.
2.  **Smart Actions:**
    *   Generates polite replies for positive/constructive engagement.
    *   Generates \`[INTERNAL FLAG]\` alerts for toxic content (instead of replying).
3.  **Batch Processing:**
    *   Upload CSV files to process 100+ comments instantly.
    *   Real-time distribution charts.
4.  **Filtering & Export:**
    *   Filter results by category (e.g., "Show only Questions").
    *   Export processed data to CSV.

## How to Run
1.  Open the application in a browser.
2.  **Single Mode:** Type a comment to see instant classification and reply suggestion.
3.  **Batch Mode:** Upload \`demo_comments.csv\` (included) to see the bulk processor in action.

## Category Definitions
*   **Praise:** Positive appreciation.
*   **Support:** Encouragement.
*   **Constructive Criticism:** Negative feedback with specific reasoning.
*   **Hate/Abuse:** Insults without value.
*   **Threat:** Harmful intent.
*   **Emotional:** Personal stories.
*   **Spam:** Ads/Self-promo.
*   **Question:** Inquiries.
`;

const DEMO_CSV_CONTENT = `comment
"This app is absolutely amazing, good job!"
"I hate this update, the colors are ugly and it hurts my eyes."
"You are trash, delete your account."
"My order #1234 still hasn't arrived, help?"
"Can you add a dark mode in the next version?"
"Follow me for free crypto and money!"
"This video reminds me of my late grandfather."
"I will find where you live, watch out."
"Great effort, but the audio levels are unbalanced."
"Keep going N Akash, this is great work!"
"Why does the app crash on login?"
"Useless garbage."
"Please make a tutorial on React."
"This is the best tool I have used all year."
"Click this link for a prize."`;

// --- Configuration ---
const CATEGORY_DEFINITIONS = {
  praise: "Appreciative, positive feedback. e.g. 'Amazing work!'",
  support: "Encouragement and motivation. e.g. 'Keep going, you're doing great!'",
  constructive_criticism: "Negative feedback that is respectful and specific about a feature/design. e.g. 'The animation was okay but the voiceover felt off.'",
  hate_abuse: "Toxic, insulting, or abusive content without constructive value. e.g. 'This is trash, quit now.'",
  threat: "Intent to harm or legal threats. e.g. 'I'll report you.'",
  emotional: "Personal stories, nostalgia, or deep feelings. e.g. 'This reminded me of my childhood.'",
  spam_irrelevant: "Self-promotion, ads, or unrelated text. e.g. 'Follow me for followers.'",
  question_suggestion: "Inquiries or content requests. e.g. 'Can you make one on topic X?'"
};

const CATEGORIES = Object.keys(CATEGORY_DEFINITIONS);

const SAMPLE_COMMENTS = [
  "This video changed my life, thank you so much!",
  "Keep going, you're doing great!",
  "The animation was okay but the voiceover felt off.", 
  "I didn't like the color scheme, it hurts my eyes.", // Constructive
  "You are garbage and nobody likes you.", // Hate
  "This is the worst app ever, delete your channel.", // Hate
  "I will find you and make you pay.", // Threat
  "This reminds me of when I was a kid, good times.",
  "Follow me for free iphone.",
  "Can you make a video about Python basics?",
  "Great content but the lighting is a bit dark.",
  "I love this! When is the next part?",
  "Useless video, waste of time.",
  "My order hasn't arrived, please help.", // Support/Question
  "Check out my profile for easy money."
];

// --- API Helper ---
const processCommentWithGemini = async (comments: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a professional comment moderation assistant for a brand.
    Classify the following comments into one of these categories based on these specific rules:
    ${JSON.stringify(CATEGORY_DEFINITIONS, null, 2)}
    
    CRITICAL GRADING CRITERIA: You MUST distinguish between "constructive_criticism" and "hate_abuse". 
    1. Constructive Criticism: Contains negative sentiment BUT mentions a specific feature, bug, or reason (e.g., "The UI is ugly because the font is too small").
    2. Hate/Abuse: Purely toxic, personal attacks, or vague insults without actionable feedback (e.g., "You are ugly", "This is trash").
    
    Also generate a reply or action status:
    - For praise/support/emotional: Be warm and appreciative.
    - For constructive_criticism: Thank them for the specific feedback and promise improvement.
    - For question_suggestion: Answer generically or acknowledge the suggestion.
    - For hate_abuse: Return "[INTERNAL FLAG] Toxic content. Do not engage."
    - For threat: Return "[URGENT] Threat detected. Escalate to safety team."
    - For spam_irrelevant: Return "[AUTO-HIDDEN] Marked as spam."
    
    Input Comments (may be raw CSV lines, extract the main comment text if needed):
    ${JSON.stringify(comments)}
    
    Return a JSON Array of objects with these properties:
    - original_text: string
    - category: string (must be exactly one of the keys provided)
    - reply: string
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              original_text: { type: Type.STRING },
              category: { type: Type.STRING },
              reply: { type: Type.STRING },
            }
          }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- Components ---

const Badge = ({ category }: { category: string }) => {
  let colorClass = "bg-gray-100 text-gray-800";
  switch (category) {
    case 'praise': colorClass = "bg-green-100 text-green-800 border-green-200"; break;
    case 'support': colorClass = "bg-blue-100 text-blue-800 border-blue-200"; break;
    case 'constructive_criticism': colorClass = "bg-orange-100 text-orange-800 border-orange-200"; break;
    case 'hate_abuse': colorClass = "bg-red-100 text-red-800 border-red-200"; break;
    case 'threat': colorClass = "bg-red-900 text-white border-red-900"; break;
    case 'emotional': colorClass = "bg-purple-100 text-purple-800 border-purple-200"; break;
    case 'question_suggestion': colorClass = "bg-teal-100 text-teal-800 border-teal-200"; break;
    case 'spam_irrelevant': colorClass = "bg-gray-200 text-gray-600 border-gray-300"; break;
  }

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${colorClass} uppercase tracking-wider whitespace-nowrap`}>
      {category.replace('_', ' ')}
    </span>
  );
};

const getReplyStyle = (reply: string) => {
  if (reply.includes("[URGENT]")) return "bg-red-50 border-red-200 text-red-800";
  if (reply.includes("[INTERNAL FLAG]")) return "bg-orange-50 border-orange-200 text-orange-800";
  if (reply.includes("[AUTO-HIDDEN]")) return "bg-gray-100 border-gray-200 text-gray-500 italic";
  return "bg-indigo-50 border-indigo-100 text-indigo-900";
};

const BarChart = ({ data }: { data: { category: string, count: number }[] }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.category} className="flex items-center text-sm group">
          <div className="w-36 truncate font-medium text-gray-600 capitalize group-hover:text-indigo-600 transition-colors">{item.category.replace('_', ' ')}</div>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden mx-2">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <div className="w-8 text-right text-gray-500 font-mono">{item.count}</div>
        </div>
      ))}
    </div>
  );
};

// Utils for Downloading Files
const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const InfoModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Project Documentation</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="prose prose-sm overflow-y-auto max-h-[60vh]">
        <p className="text-gray-600 mb-4">
          This tool uses <strong>Google Gemini AI</strong> to analyze and classify comments into 8 distinct categories, aiding community management.
        </p>
        
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
            <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wide mb-2">Submission Downloads</h4>
            <div className="flex gap-2">
                <button 
                    onClick={() => downloadFile('README.md', README_CONTENT, 'text/markdown')}
                    className="flex-1 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded text-xs font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download README.md
                </button>
                <button 
                    onClick={() => downloadFile('demo_comments.csv', DEMO_CSV_CONTENT, 'text/csv')}
                    className="flex-1 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded text-xs font-semibold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Download Demo CSV
                </button>
            </div>
        </div>

        <h4 className="font-semibold text-gray-800 mb-2">Key Features</h4>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 mb-4">
          <li><strong>NLP Classification:</strong> Distinguishes between <em>Constructive Criticism</em> and <em>Hate/Abuse</em> with high accuracy.</li>
          <li><strong>Automated Replies:</strong> Generates context-aware, polite responses.</li>
          <li><strong>Safety & Moderation:</strong> Automatically flags threats and toxic content for internal review.</li>
          <li><strong>Batch Processing:</strong> Supports CSV uploads (up to 200 rows).</li>
          <li><strong>Visualization:</strong> Real-time distribution analysis.</li>
        </ul>
        <h4 className="font-semibold text-gray-800 mb-2">Category Rules</h4>
        <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
          {Object.entries(CATEGORY_DEFINITIONS).map(([key, desc]) => (
            <div key={key}><span className="font-bold capitalize">{key.replace('_', ' ')}:</span> {desc}</div>
          ))}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Close</button>
      </div>
    </div>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [showInfo, setShowInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Single Mode State
  const [singleInput, setSingleInput] = useState("");
  const [singleResult, setSingleResult] = useState<any>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  // Batch Mode State
  const [batchData, setBatchData] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [stats, setStats] = useState<{ category: string, count: number }[]>([]);

  // Handlers
  const handleSingleAnalyze = async () => {
    if (!singleInput.trim()) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const results = await processCommentWithGemini([singleInput]);
      if (results && results.length > 0) {
        setSingleResult(results[0]);
      }
    } catch (e) {
      alert("Failed to analyze. Please ensure you have a valid API Key.");
    } finally {
      setSingleLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(c => counts[c] = 0);
    data.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      } else {
         counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    
    const statsArray = Object.keys(counts).map(k => ({ category: k, count: counts[k] })).filter(x => x.count > 0);
    setStats(statsArray.sort((a, b) => b.count - a.count));
  };

  const handleBatchLoadSample = async () => {
    setBatchLoading(true);
    setFilterCategory('all');
    try {
      const results = await processCommentWithGemini(SAMPLE_COMMENTS);
      setBatchData(results);
      calculateStats(results);
    } catch (e) {
      alert("Failed to load batch.");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBatchLoading(true);
    setFilterCategory('all');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      // If header exists, remove it
      const comments = lines.length > 0 && (lines[0].toLowerCase().includes('comment') || lines[0].toLowerCase().includes('text')) 
        ? lines.slice(1) 
        : lines;
        
      // Assignment req: 100-200 lines. We cap at 200 for performance/token limits.
      const limitedComments = comments.slice(0, 200);
      
      try {
        const results = await processCommentWithGemini(limitedComments);
        setBatchData(results);
        calculateStats(results);
      } catch (err) {
        alert("Error processing CSV data with AI.");
      } finally {
        setBatchLoading(false);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleDownloadCSV = () => {
    if (batchData.length === 0) return;
    
    const headers = ["Original Comment", "Category", "Reply Suggestion"];
    const csvContent = [
      headers.join(","),
      ...batchData.map(row => 
        `"${row.original_text.replace(/"/g, '""')}","${row.category}","${row.reply.replace(/"/g, '""')}"`
      )
    ].join("\n");
    
    downloadFile("categorized_comments.csv", csvContent, 'text/csv;charset=utf-8;');
  };

  const filteredBatchData = useMemo(() => {
    if (filterCategory === 'all') return batchData;
    return batchData.filter(item => item.category === filterCategory);
  }, [batchData, filterCategory]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200">AI</div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Comment Categorizer</h1>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowInfo(true)}
                className="text-gray-500 hover:text-indigo-600 transition-colors"
                title="Project Info"
             >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
            <nav className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('single')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'single' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Single Comment
              </button>
              <button 
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'batch' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Batch Dataset
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 flex-grow w-full">
        {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
        
        {/* SINGLE MODE */}
        {activeTab === 'single' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold mb-1">Analyze Individual Comment</h2>
                <p className="text-sm text-gray-500">Paste a comment to classify it and generate a reply.</p>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                  placeholder="e.g., The animation was okay but the voiceover felt off."
                  value={singleInput}
                  onChange={(e) => setSingleInput(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSingleAnalyze}
                    disabled={singleLoading || !singleInput}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    {singleLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : 'Classify & Reply'}
                  </button>
                </div>
              </div>
            </div>

            {singleResult && (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500 font-medium">Result</span>
                    <Badge category={singleResult.category} />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-2">Suggested Reply / Action</h3>
                      <div className={`p-4 rounded-lg border leading-relaxed font-medium ${getReplyStyle(singleResult.reply)}`}>
                        {singleResult.reply || <span className="italic opacity-70">No reply generated.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BATCH MODE */}
        {activeTab === 'batch' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Controls & Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">Dataset</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Upload a CSV file containing comments to automatically classify them.
                </p>
                
                <div className="space-y-3">
                  <input 
                    type="file" 
                    accept=".csv, .txt"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={batchLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm"
                  >
                    {batchLoading ? 'Processing...' : 'Upload CSV File'}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                  </div>

                  <button
                    onClick={handleBatchLoadSample}
                    disabled={batchLoading}
                    className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Load Sample Data
                  </button>
                </div>
              </div>

              {stats.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
                  <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>
                  <BarChart data={stats} />
                </div>
              )}
            </div>

            {/* Right Col: Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
                <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
                  <div>
                    <h2 className="text-lg font-semibold">Results</h2>
                    <p className="text-xs text-gray-500 mt-1">{batchData.length > 0 ? `${batchData.length} comments processed` : 'Waiting for data...'}</p>
                  </div>
                  
                  {batchData.length > 0 && (
                    <div className="flex items-center gap-2">
                       <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-1.5 bg-white border"
                      >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                        ))}
                      </select>

                      <button 
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Export
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto flex-1">
                  {batchData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      </div>
                      <p className="text-gray-500 font-medium">No data loaded yet</p>
                      <p className="text-sm">Upload a CSV or load sample data to begin.</p>
                    </div>
                  ) : (
                    <>
                      {filteredBatchData.length === 0 ? (
                         <div className="p-12 text-center text-gray-500">No comments found for this category.</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                              <th className="px-6 py-4 border-b border-gray-200">Comment</th>
                              <th className="px-6 py-4 border-b border-gray-200 w-40">Category</th>
                              <th className="px-6 py-4 border-b border-gray-200">Reply / Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredBatchData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-700 align-top">
                                  <div className="max-w-xs truncate" title={row.original_text}>{row.original_text}</div>
                                </td>
                                <td className="px-6 py-4 align-top">
                                  <Badge category={row.category} />
                                </td>
                                <td className="px-6 py-4 text-sm align-top">
                                  <div 
                                    className={`max-w-xs truncate px-2 py-0.5 rounded text-xs border ${getReplyStyle(row.reply)}`} 
                                    title={row.reply}
                                  >
                                    {row.reply || '-'}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm font-medium">
            Comment Categorization & Reply Assistant Tool
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Made by N Akash
          </p>
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
