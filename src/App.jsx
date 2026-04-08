import { useEffect, useMemo, useState } from 'react';
import { db } from './lib/firebase';
import { onValue, ref, remove, set, update } from 'firebase/database';

const TEACHER_PASSWORD = '1234';
const SEAT_COUNT = 26;
const OPTIONS = ['A', 'B', 'C', 'D'];
const QUESTION_COUNT = 10;

// 這裡先預設每題答案，之後你只要改這裡即可
const ANSWER_KEY = {
  Q1: 'A',
  Q2: 'B',
  Q3: 'C',
  Q4: 'D',
  Q5: 'A',
  Q6: 'B',
  Q7: 'C',
  Q8: 'D',
  Q9: 'A',
  Q10: 'B',
};

function App() {
  const [role, setRole] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [seatNumber, setSeatNumber] = useState('');
  const [currentQ, setCurrentQ] = useState('');
  const [responses, setResponses] = useState([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [correctAnswer, setCorrectAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const gameRef = ref(db, 'current_game');

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      setCurrentQ(data?.questionId || '');
      setCorrectAnswer(data?.correctAnswer || '');
      setRevealed(!!data?.revealed);
      setHasAnswered(false);
      setMyAnswer('');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentQ) {
      setResponses([]);
      setHasAnswered(false);
      setMyAnswer('');
      return;
    }

    const responsesRef = ref(db, `responses/${currentQ}`);

    const unsubscribe = onValue(responsesRef, (snapshot) => {
      const data = snapshot.val() || {};

      const list = Object.values(data).sort(
        (a, b) => Number(a.seatNumber) - Number(b.seatNumber)
      );

      setResponses(list);

      if (seatNumber) {
        const mine = data[`seat_${seatNumber}`];
        setHasAnswered(!!mine);
        setMyAnswer(mine?.answer || '');
      }
    });

    return () => unsubscribe();
  }, [currentQ, seatNumber]);

  const counts = useMemo(() => {
    const base = { A: 0, B: 0, C: 0, D: 0 };
    for (const item of responses) {
      if (base[item.answer] !== undefined) {
        base[item.answer] += 1;
      }
    }
    return base;
  }, [responses]);

  const correctCount = useMemo(() => {
    if (!revealed || !correctAnswer) return 0;
    return responses.filter((item) => item.answer === correctAnswer).length;
  }, [responses, correctAnswer, revealed]);

  const wrongCount = useMemo(() => {
    if (!revealed || !correctAnswer) return 0;
    return responses.filter((item) => item.answer !== correctAnswer).length;
  }, [responses, correctAnswer, revealed]);

  const handleTeacherLogin = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setIsAuth(true);
    } else {
      alert('密碼錯誤');
    }
  };

  const startQuestion = async (questionId) => {
    try {
      await remove(ref(db, `responses/${questionId}`));
      await set(ref(db, 'current_game'), {
        questionId,
        startedAt: Date.now(),
        correctAnswer: ANSWER_KEY[questionId] || '',
        revealed: false,
      });
    } catch (error) {
      console.error(error);
      alert('出題失敗');
    }
  };

  const revealAnswer = async () => {
    if (!currentQ) return;

    try {
      await update(ref(db, 'current_game'), {
        revealed: true,
      });
    } catch (error) {
      console.error(error);
      alert('公布答案失敗');
    }
  };

  const clearCurrentQuestionResponses = async () => {
    if (!currentQ) return;

    try {
      await remove(ref(db, `responses/${currentQ}`));
      await update(ref(db, 'current_game'), {
        revealed: false,
      });
    } catch (error) {
      console.error(error);
      alert('清空本題作答失敗');
    }
  };

  const endQuestion = async () => {
    try {
      await remove(ref(db, 'current_game'));
    } catch (error) {
      console.error(error);
      alert('結束目前題目失敗');
    }
  };

  const clearAllData = async () => {
    const ok = window.confirm('確定要清空所有題目與所有作答資料嗎？');
    if (!ok) return;

    try {
      await remove(ref(db, 'current_game'));
      await remove(ref(db, 'responses'));
    } catch (error) {
      console.error(error);
      alert('清空全部資料失敗');
    }
  };

  const submitAnswer = async (answer) => {
    if (!seatNumber || !currentQ || hasAnswered || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await set(ref(db, `responses/${currentQ}/seat_${seatNumber}`), {
        seatNumber: Number(seatNumber),
        name: `${seatNumber}號`,
        answer,
        time: Date.now(),
      });

      setHasAnswered(true);
      setMyAnswer(answer);
    } catch (error) {
      console.error(error);
      alert('送出失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResultText = (answer) => {
    if (!revealed || !correctAnswer) return '';
    return answer === correctAnswer ? '✅ 答對' : '❌ 答錯';
  };

  if (!role) {
    return (
      <div style={layoutStyle}>
        <div style={homeCardStyle}>
          <h1 style={titleStyle}>課堂即時作答系統</h1>
          <p style={subTitleStyle}>老師出題，學生直接按 A / B / C / D</p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button style={primaryBtnStyle} onClick={() => setRole('teacher')}>
              我是老師
            </button>
            <button
              style={{ ...primaryBtnStyle, backgroundColor: '#16a34a' }}
              onClick={() => setRole('student')}
            >
              我是學生
            </button>
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
    );
  }

  if (role === 'teacher') {
    return (
      <div style={layoutStyle}>
        <div style={topBarStyle}>
          <h1 style={{ margin: 0, fontSize: 28 }}>老師控制台</h1>
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
            <p style={mutedTextStyle}>目前題目：{currentQ || '尚未開始'}</p>
            <p style={mutedTextStyle}>本題正解：{correctAnswer || '未設定'}</p>
            <p style={mutedTextStyle}>公布狀態：{revealed ? '已公布' : '未公布'}</p>

            <div style={questionGridStyle}>
              {Array.from({ length: QUESTION_COUNT }, (_, i) => `Q${i + 1}`).map((q) => (
                <button
                  key={q}
                  style={{
                    ...smallBtnStyle,
                    backgroundColor: currentQ === q ? '#2563eb' : '#ffffff',
                    color: currentQ === q ? '#ffffff' : '#111827',
                    border: currentQ === q ? '1px solid #2563eb' : '1px solid #d1d5db',
                  }}
                  onClick={() => startQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <button
                style={{ ...primaryBtnStyle, backgroundColor: '#7c3aed' }}
                onClick={revealAnswer}
              >
                公布答案
              </button>
              <button style={primaryBtnStyle} onClick={clearCurrentQuestionResponses}>
                清空本題作答
              </button>
              <button
                style={{ ...primaryBtnStyle, backgroundColor: '#f59e0b' }}
                onClick={endQuestion}
              >
                結束目前題目
              </button>
              <button
                style={{ ...primaryBtnStyle, backgroundColor: '#ef4444' }}
                onClick={clearAllData}
              >
                清空全部資料
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>即時統計</h2>
            <p style={mutedTextStyle}>
              已作答 {responses.length} / {SEAT_COUNT}
            </p>

            <div style={countGridStyle}>
              {OPTIONS.map((option) => (
                <div key={option} style={countCardStyle}>
                  <div style={countOptionStyle}>{option}</div>
                  <div style={countNumberStyle}>{counts[option]}</div>
                </div>
              ))}
            </div>

            {revealed && (
              <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                <div style={resultSummaryBox}>
                  正解：{correctAnswer || '未設定'}
                </div>
                <div style={resultRowBox}>
                  <span>答對：{correctCount}</span>
                  <span>答錯：{wrongCount}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
            <h2 style={sectionTitleStyle}>即時名單</h2>
            <div style={listBoxStyle}>
              {responses.length === 0 ? (
                <p style={mutedTextStyle}>尚未收到作答</p>
              ) : (
                responses.map((item) => (
                  <div key={`seat-${item.seatNumber}`} style={listRowStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 700 }}>{item.name}</span>
                      {revealed && (
                        <span
                          style={{
                            fontSize: 14,
                            color: item.answer === correctAnswer ? '#16a34a' : '#dc2626',
                            fontWeight: 700,
                          }}
                        >
                          {getResultText(item.answer)}
                        </span>
                      )}
                    </div>
                    <span style={answerBadgeStyle}>{item.answer}</span>
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
        <h1 style={{ margin: 0, fontSize: 28 }}>學生作答區</h1>
        <button
          style={ghostBtnStyle}
          onClick={() => {
            setRole(null);
            setSeatNumber('');
            setHasAnswered(false);
            setMyAnswer('');
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
                setMyAnswer('');
              }}
            >
              重選座號
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={questionDisplayStyle}>
              {currentQ ? `目前題目：${currentQ}` : '老師尚未出題'}
            </div>

            {currentQ && !hasAnswered && (
              <div style={studentOptionGridStyle}>
                {OPTIONS.map((option) => (
                  <button
                    key={option}
                    style={studentOptionBtnStyle}
                    onClick={() => submitAnswer(option)}
                    disabled={isSubmitting}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQ && hasAnswered && !revealed && (
              <div style={successBoxStyle}>已送出答案：{myAnswer}</div>
            )}

            {currentQ && hasAnswered && revealed && (
              <div style={resultStudentBox}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  你的答案：{myAnswer}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>
                  正確答案：{correctAnswer}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    marginTop: 16,
                    color: myAnswer === correctAnswer ? '#16a34a' : '#dc2626',
                  }}
                >
                  {getResultText(myAnswer)}
                </div>
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
  maxWidth: 640,
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
  marginBottom: 12,
  outline: 'none',
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
  marginTop: 12,
};

const smallBtnStyle = {
  padding: '12px 0',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

const questionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, 1fr)',
  gap: 10,
};

const countGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 12,
  marginTop: 12,
};

const countCardStyle = {
  backgroundColor: '#f8fafc',
  borderRadius: 16,
  padding: 16,
  textAlign: 'center',
  border: '1px solid #e5e7eb',
};

const countOptionStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: '#2563eb',
};

const countNumberStyle = {
  marginTop: 6,
  fontSize: 28,
  fontWeight: 800,
};

const resultSummaryBox = {
  backgroundColor: '#ede9fe',
  border: '1px solid #c4b5fd',
  borderRadius: 14,
  padding: 14,
  fontSize: 18,
  fontWeight: 800,
  textAlign: 'center',
};

const resultRowBox = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 14,
  fontSize: 18,
  fontWeight: 800,
};

const listBoxStyle = {
  maxHeight: 380,
  overflowY: 'auto',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 12,
  backgroundColor: '#f8fafc',
};

const listRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 10px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 16,
};

const answerBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 42,
  height: 42,
  borderRadius: 999,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: 18,
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
  textAlign: 'center',
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 24,
};

const studentOptionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 16,
};

const studentOptionBtnStyle = {
  height: 110,
  borderRadius: 20,
  border: '2px solid #2563eb',
  backgroundColor: '#ffffff',
  color: '#2563eb',
  fontSize: 36,
  fontWeight: 900,
  cursor: 'pointer',
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

const resultStudentBox = {
  marginTop: 12,
  textAlign: 'center',
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: 24,
};

export default App;