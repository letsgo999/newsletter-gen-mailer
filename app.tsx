import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot,
  collection
} from 'firebase/firestore';
import { Settings, Mail, Calendar, Play, Plus, Trash2, Save, Key, Globe, Search, Loader2 } from 'lucide-react';

// --- Firebase 초기화 ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'news-automation-app';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // 사용자 설정 상태
  const [formData, setFormData] = useState({
    geminiApiKey: '',
    senderEmail: '',
    appPassword: '',
    receiverEmail: '',
    keywords: [] as string[],
    sources: [] as string[],
    scheduleTime: '09:00',
    scheduleDay: 'daily'
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [newSource, setNewSource] = useState('');

  // 1. 인증 및 데이터 로딩
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore 데이터 실시간 동기화 (Rule 1, 3 준수)
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(prev => ({ ...prev, ...data }));
      }
    }, (error) => console.error("Firestore Error:", error));

    return () => unsubscribe();
  }, [user]);

  // 3. 설정 저장
  const handleSave = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
      await setDoc(docRef, formData, { merge: true });
      alert('설정이 안전하게 저장되었습니다.');
    } catch (err) {
      alert('저장 실패: ' + err);
    }
  };

  // 4. 즉시 실행 요청 (백엔드 API 호출)
  const runNow = async () => {
    setIsRunning(true);
    try {
      // 실제 환경에서는 /api/generate 등의 엔드포인트 호출
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.uid })
      });
      if (response.ok) alert('브리핑 발송이 완료되었습니다!');
      else alert('발송 실패. 설정을 확인해주세요.');
    } catch (err) {
      alert('에러 발생: ' + err);
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-72 bg-emerald-900 text-white p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 bg-emerald-500 rounded-lg">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">NEWS MASTER</h1>
        </div>

        <div className="space-y-3 flex-1">
          {[
            { id: 'config', icon: Settings, label: 'API & 계정' },
            { id: 'content', icon: Search, label: '주제 및 출처' },
            { id: 'schedule', icon: Calendar, label: '정기 발송' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                activeTab === tab.id ? 'bg-emerald-800 border-l-4 border-emerald-400' : 'hover:bg-emerald-800/50 text-emerald-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-8">
          <button 
            onClick={runNow}
            disabled={isRunning}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            {isRunning ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            브리핑 지금 생성
          </button>
          <p className="text-[10px] text-emerald-400 mt-4 text-center opacity-50">UID: {user?.uid}</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-16 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12">
            
            {activeTab === 'config' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold text-slate-800">연동 정보 설정</h2>
                <div className="grid gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 block mb-2 uppercase">Gemini API Key</label>
                    <input 
                      type="password" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.geminiApiKey}
                      onChange={(e) => setFormData({...formData, geminiApiKey: e.target.value})}
                      placeholder="AI Studio에서 발급받은 API 키"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-bold text-slate-500 block mb-2 uppercase">발신용 Gmail</label>
                      <input 
                        type="email" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.senderEmail}
                        onChange={(e) => setFormData({...formData, senderEmail: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-500 block mb-2 uppercase">앱 비밀번호</label>
                      <input 
                        type="password" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={formData.appPassword}
                        onChange={(e) => setFormData({...formData, appPassword: e.target.value})}
                        placeholder="16자리 비밀번호"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 block mb-2 uppercase">수신 이메일</label>
                    <input 
                      type="email" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.receiverEmail}
                      onChange={(e) => setFormData({...formData, receiverEmail: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                <section>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Search className="text-emerald-500" /> 검색 키워드</h2>
                  <div className="flex gap-3 mb-4">
                    <input 
                      type="text" 
                      className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      placeholder="예: 농식품 바우처, 탄소중립 농업"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if(newKeyword) setFormData({...formData, keywords: [...formData.keywords, newKeyword]});
                        setNewKeyword('');
                      }}
                      className="bg-emerald-600 text-white px-6 rounded-xl hover:bg-emerald-700"
                    >
                      추가
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.keywords.map((k, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 flex items-center gap-2">
                        {k}
                        <Trash2 className="w-4 h-4 cursor-pointer hover:text-red-500" onClick={() => setFormData({...formData, keywords: formData.keywords.filter((_, idx) => idx !== i)})} />
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Globe className="text-emerald-500" /> 뉴스 소스 URL</h2>
                  <div className="flex gap-3 mb-4">
                    <input 
                      type="text" 
                      className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                      placeholder="뉴스 매체명이나 URL"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if(newSource) setFormData({...formData, sources: [...formData.sources, newSource]});
                        setNewSource('');
                      }}
                      className="bg-emerald-600 text-white px-6 rounded-xl hover:bg-emerald-700"
                    >
                      추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.sources.map((s, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center group">
                        <span className="text-slate-600 font-medium">{s}</span>
                        <Trash2 className="w-5 h-5 text-slate-300 hover:text-red-500 cursor-pointer transition-colors" onClick={() => setFormData({...formData, sources: formData.sources.filter((_, idx) => idx !== i)})} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold text-slate-800">자동 발송 스케줄</h2>
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">발송 빈도</h3>
                    <div className="space-y-3">
                      {['daily', 'weekly', 'none'].map((opt) => (
                        <label key={opt} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.scheduleDay === opt ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-100 hover:bg-slate-50'}`}>
                          <input 
                            type="radio" 
                            className="w-5 h-5 accent-emerald-600" 
                            checked={formData.scheduleDay === opt}
                            onChange={() => setFormData({...formData, scheduleDay: opt})}
                          />
                          <span className="font-bold">{opt === 'daily' ? '매일 발송' : opt === 'weekly' ? '주간 요약 (금요일)' : '자동 발송 끔'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase">발송 시간</h3>
                    <input 
                      type="time" 
                      className="w-full p-6 text-4xl font-black bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({...formData, scheduleTime: e.target.value})}
                    />
                    <p className="mt-4 text-slate-400 text-sm">※ 서버 시간 기준 (KST)으로 매일 해당 시간에 뉴스를 수집합니다.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="bg-slate-50 p-8 border-t border-slate-200 flex justify-between items-center">
            <p className="text-slate-500 text-sm">모든 정보는 Firestore에 암호화되어 안전하게 보관됩니다.</p>
            <button 
              onClick={handleSave}
              className="px-10 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg hover:bg-emerald-700 flex items-center gap-2 transform active:scale-95 transition-all"
            >
              <Save className="w-5 h-5" /> 설정 저장하기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
