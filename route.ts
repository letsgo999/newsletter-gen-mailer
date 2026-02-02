import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import nodemailer from 'nodemailer';

// --- 백엔드용 Firebase Admin/SDK 설정 ---
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = process.env.APP_ID || 'news-automation-app';

// 1. Gemini API 호출 함수 (Google Search 연동)
async function generateBriefing(config: any) {
  const apiKey = config.geminiApiKey;
  const prompt = `
    다음 키워드와 출처를 바탕으로 오늘자 주요 뉴스를 검색하고 브리핑을 작성해줘.
    키워드: ${config.keywords.join(', ')}
    출처: ${config.sources.join(', ')}
    
    형식:
    1. 핵심 헤드라인 3가지
    2. 상세 뉴스 내용 (각 항목별 요약 및 출처 링크 포함)
    3. 농식품 업계에 주는 시사점
    
    반드시 한국어로 작성하고 HTML 형식으로 출력해줘.
  `;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ "google_search": {} }]
    })
  });

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "뉴스 브리핑 생성에 실패했습니다.";
}

// 2. 이메일 발송 함수
async function sendEmail(config: any, content: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.senderEmail,
      pass: config.appPassword
    }
  });

  await transporter.sendMail({
    from: `"AI 뉴스 브리핑" <${config.senderEmail}>`,
    to: config.receiverEmail,
    subject: `[오늘의 브리핑] ${new Date().toLocaleDateString()} 농식품 뉴스 요약`,
    html: content
  });
}

// 3. API 엔드포인트 핸들러
export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    
    // Firestore에서 사용자 설정 조회
    const docRef = doc(db, 'artifacts', appId, 'users', userId, 'settings', 'config');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'User config not found' }, { status: 404 });
    }

    const config = docSnap.data();
    
    // AI 브리핑 생성
    const briefing = await generateBriefing(config);
    
    // 이메일 발송
    await sendEmail(config, briefing);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. Cron 작업용 핸들러 (스케줄링 발송)
export async function GET() {
  // 실제 서비스 시에는 모든 사용자를 루프 돌며 발송 로직 실행
  // 1. Firestore에서 모든 사용자 'config' 컬렉션 조회
  // 2. 현재 시간과 사용자의 scheduleTime 비교
  // 3. 일치하는 사용자에게 브리핑 발송
  return NextResponse.json({ message: "Cron triggered" });
}
