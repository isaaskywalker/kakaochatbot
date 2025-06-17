const { GoogleSpreadsheet } = require('google-spreadsheet');

// 환경변수에서 Google Sheets 정보 가져오기
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userRequest, action } = req.body;
    
    // 사용자 입력에서 예약 정보 추출
    const reservationData = extractReservationData(userRequest, action);
    
    // Google Sheets에 데이터 저장
    await saveToGoogleSheets(reservationData);
    
    // 카카오톡 응답 생성
    const response = createKakaoResponse(reservationData);
    
    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: "죄송합니다. 예약 처리 중 오류가 발생했습니다. 다시 시도해주세요."
          }
        }]
      }
    });
  }
}

// 예약 정보 추출 함수
function extractReservationData(userRequest, action) {
  const now = new Date();
  const params = action?.params || {};
  
  return {
    timestamp: now.toLocaleString('ko-KR'),
    peopleCount: params.people_count || '미지정',
    preferredDate: params.preferred_date || '미지정',
    preferredTime: params.preferred_time || '미지정',
    contactNumber: params.contact_number || userRequest.utterance,
    status: '접수완료'
  };
}

// Google Sheets 저장 함수
async function saveToGoogleSheets(data) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  
  await doc.useServiceAccountAuth({
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY,
  });
  
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  
  await sheet.addRow([
    data.timestamp,
    data.peopleCount,
    data.preferredDate,
    data.preferredTime,
    data.contactNumber,
    data.status
  ]);
}

// 카카오톡 응답 생성 함수
function createKakaoResponse(data) {
  const reservationId = generateReservationId();
  
  return {
    version: "2.0",
    template: {
      outputs: [{
        simpleText: {
          text: `✅ 단체관람 예약 신청이 완료되었습니다!\n\n📋 접수 정보\n• 접수번호: ${reservationId}\n• 인원: ${data.peopleCount}\n• 희망날짜: ${data.preferredDate}\n• 희망시간: ${data.preferredTime}\n• 연락처: ${data.contactNumber}\n\n📞 담당자가 곧 연락드릴 예정입니다.\n⏰ 상담시간: 평일 9:00-18:00`
        }
      }]
    }
  };
}

// 예약 ID 생성 함수
function generateReservationId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `R${dateStr}${randomNum}`;
}
