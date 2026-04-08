import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { onValue, ref, set } from 'firebase/database';

const TEACHER_PASSWORD = '1234';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function SetupPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const [questionCount, setQuestionCount] = useState(10);
  const [optionCount, setOptionCount] = useState(4);
  const [answerKey, setAnswerKey] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  const options = useMemo(() => {
    return LETTERS.slice(0, optionCount);
  }, [optionCount]);

  useEffect(() => {
    const configRef = ref(db, 'exam_config/current');

    const unsubscribe = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const nextQuestionCount = Number(data.questionCount) || 10;
      const nextOptionCount = Number(data.optionCount) || 4;

      setQuestionCount(nextQuestionCount);
      setOptionCount(nextOptionCount);
      setAnswerKey(data.answerKey || {});
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const nextAnswerKey = {};

    for (let i = 1; i <= questionCount; i += 1) {
      const q = `Q${i}`;
      const currentValue = answerKey[q];
      nextAnswerKey[q] = options.includes(currentValue) ? currentValue : options[0];
    }

    const changed =
      JSON.stringify(nextAnswerKey) !== JSON.stringify(answerKey);

    if (changed) {
      setAnswerKey(nextAnswerKey);
    }
  }, [questionCount, optionCount]);

  const handleLogin = () => {
    if (passwordInput === TEACHER_PASSWORD) {
      setIsAuth(true);
    } else {
      alert('密碼錯誤');
    }
  };

  const handleChangeAnswer = (questionId, value) => {
    setAnswerKey((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSave = async () => {
    try {
      const normalizedAnswerKey = {};

      for (let i = 1; i <= questionCount; i += 1) {
        const q = `Q${i}`;
        normalizedAnswerKey[q] = options.includes(answerKey[q]) ? answerKey[q] : options[0];
      }

      await set(ref(db, 'exam_config/current'), {
        questionCount: Number(questionCount),
        optionCount: Number(optionCount),
        options,
        answerKey: normalizedAnswerKey,
        updatedAt: Date.now(),
      });

      setSaveMessage('已儲存');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error(error);
      alert('儲存失敗');
    }
  };

  if (!isAuth) {
    return (
      <div style={layoutStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>考試設定頁</h1>
          <input
            type="password"
            placeholder="請輸入密碼"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={inputStyle}
          />
          <button style={primaryBtnStyle} onClick={handleLogin}>
            進入設定頁
          </button>

          <div style={{ marginTop: 16 }}>
            <Link to="/" style={linkStyle}>
              返回作答頁
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={layoutStyle}>
      <div style={topBarStyle}>
        <h1 style={{ margin: 0, fontSize: 28 }}>考試設定頁</h1>
        <Link to="/" style={ghostLinkStyle}>
          返回作答頁
        </Link>
      </div>

      <div style={contentStyle}>
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>基本設定</h2>

          <div style={formGridStyle}>
            <div>
              <div style={labelStyle}>題數</div>
              <input
                type="number"
                min="1"
                max="50"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>選項數</div>
              <input
                type="number"
                min="2"
                max="10"
                value={optionCount}
                onChange={(e) => setOptionCount(Math.max(2, Math.min(10, Number(e.target.value) || 2)))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={infoBoxStyle}>
            本次選項：{options.join(' / ')}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>逐題答案設定</h2>

          <div style={answerListStyle}>
            {Array.from({ length: questionCount }, (_, i) => `Q${i + 1}`).map((q) => (
              <div key={q} style={answerRowStyle}>
                <div style={questionNameStyle}>{q}</div>
                <select
                  value={answerKey[q] || options[0]}
                  onChange={(e) => handleChangeAnswer(q, e.target.value)}
                  style={selectStyle}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={primaryBtnStyle} onClick={handleSave}>
              儲存設定
            </button>
            {saveMessage && <span style={saveTextStyle}>{saveMessage}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const layoutStyle = {
  minHeight: '100vh',
  padding: 20,
  background: 'linear-gradient(180deg, #f5f3ff 0%, #f8fafc 100%)',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: '#111827',
};

const topBarStyle = {
  maxWidth: 960,
  margin: '0 auto 20px auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
};

const contentStyle = {
  maxWidth: 960,
  margin: '0 auto',
  display: 'grid',
  gap: 20,
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
};

const titleStyle = {
  marginTop: 0,
  marginBottom: 20,
  fontSize: 32,
  fontWeight: 800,
  textAlign: 'center',
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 16,
  fontSize: 24,
  fontWeight: 800,
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

const labelStyle = {
  marginBottom: 8,
  fontSize: 15,
  fontWeight: 700,
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

const selectStyle = {
  minWidth: 120,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #d1d5db',
  fontSize: 16,
  backgroundColor: '#ffffff',
};

const primaryBtnStyle = {
  border: 'none',
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  borderRadius: 12,
  padding: '14px 18px',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostLinkStyle = {
  border: '1px solid #d1d5db',
  backgroundColor: '#ffffff',
  color: '#111827',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
};

const linkStyle = {
  color: '#7c3aed',
  fontWeight: 700,
  textDecoration: 'none',
};

const infoBoxStyle = {
  marginTop: 16,
  backgroundColor: '#f5f3ff',
  border: '1px solid #ddd6fe',
  borderRadius: 14,
  padding: 14,
  fontSize: 16,
  fontWeight: 700,
};

const answerListStyle = {
  display: 'grid',
  gap: 12,
};

const answerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  padding: '12px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  backgroundColor: '#fafafa',
};

const questionNameStyle = {
  fontSize: 18,
  fontWeight: 800,
};

const saveTextStyle = {
  fontSize: 16,
  fontWeight: 800,
  color: '#16a34a',
};

export default SetupPage;