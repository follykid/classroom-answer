import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { onValue, ref, remove, set } from 'firebase/database';

const TEACHER_PASSWORD = '1234';
const SEAT_COUNT = 26;

function TextCollectPage() {
  const [role, setRole] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [seatNumber, setSeatNumber] = useState('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [draftQuestionTitle, setDraftQuestionTitle] = useState('');
  const [responses, setResponses] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const questionRef = ref(db, 'text_quiz/current');

    const unsubscribe = onValue(questionRef, (snapshot) => {
      const data = snapshot.val();
      setQuestionTitle(data?.title || '');
      setDraftQuestionTitle(data?.title || '');
      setHasAnswered(false);
      setTextAnswer('');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!questionTitle) {
      setResponses([]);
      setHasAnswered(false);
      setTextAnswer('');
      return;
    }

    const responseRef = ref(db, 'text_quiz/responses');

    const unsubscribe = onValue(responseRef, (snapshot) => {
      const data = snapshot.val() || {};

      const list = Object.values(data).sort(
        (a, b) => Number(a.seatNumber) - Number(b.seatNumber)
      );

      setResponses(list);

      if (seatNumber) {
        const mine = data[`seat_${seatNumber}`];
        setHasAnswered(!!mine);
        setTextAnswer(mine?.answer || '');
      }
    });

    return () => unsubscribe();
  }, [questionTitle, seatNumber]);

  const handleTeacherLogin = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setIsAuth(true);
    } else {
      alert('密碼錯誤');
    }
  };

  const startTextQuestion = async () => {
    const title = draftQuestionTitle.trim();
    if (!title) {
      alert('請先輸入題目');
      return;
    }

    try {
      await remove(ref(db, 'text_quiz/responses'));
      await set(ref(db, 'text_quiz/current'), {
        title,
        startedAt: Date.now(),
      });
    } catch (error) {
      console.error(error);
      alert('建立題目失敗');
    }
  };

  const clearResponses = async () => {
    try {
      await remove(ref(db, 'text_quiz/responses'));
    } catch (error) {
      console.error(error);
      alert('清空失敗');
    }
  };

  const endQuestion = async () => {
    try {
      await remove(ref(db, 'text_quiz/current'));
      await remove(ref(db, 'text_quiz/responses'));
    } catch (error) {
      console.error(error);
      alert('結束失敗');
    }
  };

  const submitAnswer = async () => {
    const finalAnswer = textAnswer.trim();
    if (!seatNumber || !questionTitle || !finalAnswer || hasAnswered || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await set(ref(db, `text_quiz/responses/seat_${seatNumber}`), {
        seatNumber: Number(seatNumber),
        name: `${seatNumber}號`,
        answer: finalAnswer,
        time: Date.now(),
      });

      setHasAnswered(true);
    } catch (error) {
      console.error(error);
      alert('送出失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!role) {
    return (
      <div style={layoutStyle}>
        <div style={homeCardStyle}>
          <h1 style={titleStyle}>文字題收集系統</h1>
          <p style={subTitleStyle}>老師出題，學生輸入文字答案</p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <button style={primaryBtnStyle} onClick={() => setRole('teacher')}>
              我是老師
            </button>
            <button
              style={{ ...primaryBtnStyle, backgroundColor: '#16a34a' }}
              onClick={() => setRole('student')}
            >
              我是學生
            </button>
            <Link to="/" style={{ ...ghostBtnStyle, textDecoration: 'none' }}>
              返回主系統
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'teacher' && !isAuth) {
    return (
      <div style={layoutStyle}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>老師登入</h2>
          <input
            type="password"
            placeholder="請輸入密碼"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={inputStyle}
          />
          <button style={{ ...primaryBtnStyle, width: '100%' }} onClick={handleTeacherLogin}>
            登入
          </button>

          <div style={{ marginTop: 16 }}>
            <button
              style={linkBtnStyle}
              onClick={() => {
                setRole(null);
                setPasswordInput('');
              }}
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'teacher') {
    return (
      <div style={layoutStyle}>
        <div style={topBarStyle}>
          <h1 style={{ margin: 0, fontSize: 28 }}>文字題老師控制台</h1>
          <button
            style={ghostBtnStyle}
            onClick={() => {
              setRole(null);
              setIsAuth(false);
              setPasswordInput('');
            }}
          >
            登出
          </button>
        </div>

        <div style={teacherGridStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>出題</h2>
            <p style={mutedTextStyle}>目前題目：{questionTitle || '尚未開始'}</p>

            <textarea
              value={draftQuestionTitle}
              onChange={(e) => setDraftQuestionTitle(e.target.value)}
              placeholder="請輸入文字題題目"
              style={textareaStyle}
            />

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <button style={primaryBtnStyle} onClick={startTextQuestion}>
                開始收答案
              </button>
              <button style={{ ...primaryBtnStyle, backgroundColor: '#f59e0b' }} onClick={clearResponses}>
                清空目前答案
              </button>
              <button style={{ ...primaryBtnStyle, backgroundColor: '#ef4444' }} onClick={endQuestion}>
                結束本題並清空
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>收件狀況</h2>
            <p style={mutedTextStyle}>已作答 {responses.length} / {SEAT_COUNT}</p>
          </div>

          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <h2 style={sectionTitleStyle}>學生答案</h2>
            <div style={listBoxStyle}>
              {responses.length === 0 ? (
                <p style={mutedTextStyle}>尚未收到答案</p>
              ) : (
                responses.map((item) => (
                  <div key={`seat-${item.seatNumber}`} style={textRowStyle}>
                    <div style={textRowHeaderStyle}>{item.name}</div>
                    <div style={textRowBodyStyle}>{item.answer}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      <div style={topBarStyle}>
        <h1 style={{ margin: 0, fontSize: 28 }}>學生文字作答區</h1>
        <button
          style={ghostBtnStyle}
          onClick={() => {
            setRole(null);
            setSeatNumber('');
            setHasAnswered(false);
            setTextAnswer('');
          }}
        >
          返回首頁
        </button>
      </div>

      {!seatNumber ? (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>請先選座號</h2>
          <div style={seatGridStyle}>
            {Array.from({ length: SEAT_COUNT }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                style={seatBtnStyle}
                onClick={() => setSeatNumber(String(num))}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={studentCardStyle}>
          <div style={studentInfoStyle}>
            <span>座號：{seatNumber}</span>
            <button
              style={linkBtnStyle}
              onClick={() => {
                setSeatNumber('');
                setHasAnswered(false);
                setTextAnswer('');
              }}
            >
              重選座號
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={questionDisplayStyle}>
              {questionTitle || '老師尚未出題'}
            </div>

            {questionTitle && !hasAnswered && (
              <div>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="請輸入你的答案"
                  style={studentTextareaStyle}
                />
                <button
                  style={{ ...primaryBtnStyle, width: '100%', marginTop: 16 }}
                  onClick={submitAnswer}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '送出中...' : '送出答案'}
                </button>
              </div>
            )}

            {questionTitle && hasAnswered && (
              <div style={successBoxStyle}>
                已送出答案
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const layoutStyle = {
  minHeight: '100vh',
  padding: 20,
  background: 'linear-gradient(180deg, #eef4ff 0%, #f8fafc 100%)',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: '#111827',
};

const topBarStyle = {
  maxWidth: 1100,
  margin: '0 auto 20px auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
};

const teacherGridStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 20,
};

const homeCardStyle = {
  maxWidth: 560,
  margin: '80px auto 0 auto',
  backgroundColor: '#ffffff',
  borderRadius: 20,
  padding: 32,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  textAlign: 'center',
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
};

const studentCardStyle = {
  maxWidth: 700,
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
};

const titleStyle = {
  margin: 0,
  fontSize: 36,
  fontWeight: 800,
};

const subTitleStyle = {
  marginTop: 12,
  color: '#6b7280',
  fontSize: 16,
};

const sectionTitleStyle = {
  margin: '0 0 12px 0',
  fontSize: 24,
  fontWeight: 800,
};

const mutedTextStyle = {
  color: '#6b7280',
  fontSize: 15,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #d1d5db',
  fontSize: 16,
  outline: 'none',
};

const textareaStyle = {
  width: '100%',
  minHeight: 120,
  boxSizing: 'border-box',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #d1d5db',
  fontSize: 16,
  outline: 'none',
  resize: 'vertical',
};

const studentTextareaStyle = {
  width: '100%',
  minHeight: 180,
  boxSizing: 'border-box',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #d1d5db',
  fontSize: 18,
  outline: 'none',
  resize: 'vertical',
};

const primaryBtnStyle = {
  border: 'none',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderRadius: 12,
  padding: '14px 18px',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtnStyle = {
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#111827',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

const linkBtnStyle = {
  border: 'none',
  background: 'none',
  color: '#2563eb',
  fontWeight: 700,
  cursor: 'pointer',
  padding: 0,
};

const listBoxStyle = {
  maxHeight: 520,
  overflowY: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 12,
  backgroundColor: '#f8fafc',
};

const textRowStyle = {
  padding: '14px 12px',
  borderBottom: '1px solid #e5e7eb',
};

const textRowHeaderStyle = {
  fontSize: 17,
  fontWeight: 800,
  marginBottom: 8,
};

const textRowBodyStyle = {
  fontSize: 16,
  whiteSpace: 'pre-wrap',
  lineHeight: 1.6,
};

const seatGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 12,
  maxWidth: 420,
  margin: '0 auto',
};

const seatBtnStyle = {
  height: 60,
  borderRadius: 14,
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  fontSize: 20,
  fontWeight: 800,
  cursor: 'pointer',
};

const studentInfoStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 18,
  fontWeight: 700,
};

const questionDisplayStyle = {
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 24,
  lineHeight: 1.5,
};

const successBoxStyle = {
  marginTop: 12,
  textAlign: 'center',
  fontSize: 28,
  fontWeight: 800,
  color: '#16a34a',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: 16,
  padding: 20,
};

export default TextCollectPage;