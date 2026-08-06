import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Download, Heart, LogOut, Plus, RotateCcw, Sparkles, Trash2, Upload, User, Volume2, X } from 'lucide-react';
import { supabase } from './utils/supabase';
import { downloadWordTemplate } from './utils/excelTemplate';
import { VOCABULARY_DB } from './vocabularyDB';

const VARIANTS = { A: '纸感卡片', B: '专注模式', C: '活力街机' };

function nextCard(deck, introduced, seenIds, previousId) {
  const hasNew = introduced < deck.words.length;
  const shouldRepeat = introduced >= 2 && (!hasNew || Math.random() < .48);
  if (!shouldRepeat && hasNew) return { word: deck.words[introduced], introduced: introduced + 1 };
  const pool = deck.words.slice(0, Math.max(1, introduced)).filter(w => w.id !== previousId);
  const candidates = pool.length ? pool : deck.words.slice(0, Math.max(1, introduced));
  return { word: candidates[Math.floor(Math.random() * candidates.length)], introduced };
}

function speak(word) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-GB'; utterance.rate = .82;
  const british = speechSynthesis.getVoices().find(v => /en-GB/i.test(v.lang));
  if (british) utterance.voice = british;
  speechSynthesis.speak(utterance);
}

function App() {
  const [session, setSession] = useState(null);
  const [customWords, setCustomWords] = useState([]);
  const [screen, setScreen] = useState('home');
  const [deckKey, setDeckKey] = useState('primary');
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [introduced, setIntroduced] = useState(0);
  const [seenIds, setSeenIds] = useState(new Set());
  const [current, setCurrent] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [flippedOnce, setFlippedOnce] = useState(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const variant = new URLSearchParams(location.search).get('variant')?.toUpperCase() || 'A';
  const activeVariant = VARIANTS[variant] ? variant : 'A';
  const deck = deckKey === 'custom' ? { ...VOCABULARY_DB.custom, words: customWords } : VOCABULARY_DB[deckKey];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadWords = async () => {
    if (!session?.user) { setCustomWords([]); return; }
    const { data, error } = await supabase.from('words').select('id, word, phonetic, meaning, level').order('created_at');
    if (error) throw error;
    setCustomWords(data ?? []);
  };

  useEffect(() => { loadWords().catch(error => console.error(error.message)); }, [session?.user?.id]);

  const begin = (key = deckKey) => {
    if (key === 'custom') { setScreen('manage'); return; }
    const selected = VOCABULARY_DB[key];
    setDeckKey(key); setLives(5); setScore(0); setIntroduced(1); setSeenIds(new Set());
    setCurrent(selected.words[0]); setFlipped(false); setFlippedOnce(false); setLocked(false); setFeedback(null); setScreen('game');
  };

  const advance = (newSeen, nextLives) => {
    if (nextLives <= 0) { setScreen('result'); return; }
    const result = nextCard(deck, introduced, newSeen, current.id);
    setIntroduced(result.introduced); setCurrent(result.word); setFlipped(false); setFlippedOnce(false); setLocked(false); setFeedback(null);
  };

  const answer = (choice) => {
    if (locked) return;
    const wasSeen = seenIds.has(current.id);
    const correct = (choice === 'seen') === wasSeen;
    const newSeen = new Set(seenIds).add(current.id);
    setSeenIds(newSeen); setLocked(true); setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      setScore(s => s + 1);
      setTimeout(() => advance(newSeen, lives), 420);
    } else {
      const nextLives = lives - 1; setLives(nextLives); setFlipped(true); setFlippedOnce(true);
      setTimeout(() => advance(newSeen, nextLives), 2000);
    }
  };

  const flip = () => {
    if (!locked && !flippedOnce) { setFlipped(true); setFlippedOnce(true); }
  };

  return <main className={`app variant-${activeVariant}`}>
    {screen === 'home' && <Home onStart={begin} customCount={customWords.length} session={session} />}
    {screen === 'manage' && <WordManager session={session} words={customWords} onRefresh={loadWords} onBack={() => setScreen('home')} onStudy={() => { setDeckKey('custom'); setLives(5); setScore(0); setIntroduced(1); setSeenIds(new Set()); setCurrent(customWords[0]); setFlipped(false); setFlippedOnce(false); setLocked(false); setFeedback(null); setScreen('game'); }} />}
    {screen === 'game' && current && <Game deck={deck} current={current} lives={lives} score={score} flipped={flipped} flippedOnce={flippedOnce} feedback={feedback} locked={locked} onFlip={flip} onAnswer={answer} onExit={() => setScreen('home')} />}
    {screen === 'result' && <Result deck={deck} score={score} onAgain={() => begin(deckKey)} onHome={() => setScreen('home')} />}
    {import.meta.env.DEV && <VariantSwitcher active={activeVariant} />}
  </main>;
}

function Home({ onStart, customCount, session }) {
  return <section className="home shell">
    <header><div className="brand-mark"><BookOpen size={23}/></div><div className="brand">WORDY<span>.</span></div><div className="mini-pill">每日挑战</div></header>
    <div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> 让记忆变得有趣</div><h1>今天，认识<br/><em>几个新朋友？</em></h1><p>选择一个词库，凭直觉判断。<br/>别担心，犯错也是记住的一种方式。</p></div>
    <div className="deck-area"><div className="section-title"><span>选择词库</span><small>4 个主题</small></div><div className="deck-grid">
      {Object.entries(VOCABULARY_DB).map(([key, d], i) => <button className="deck-card" style={{'--accent':d.accent, '--delay':`${i*60}ms`}} key={key} onClick={() => onStart(key)}><span className="deck-number">{String(i+1).padStart(2, '0')}</span><span className="deck-icon">{['A+','CET','7.5','SRT','+'][i]}</span><strong>{d.label}</strong><small>{key === 'custom' ? `${session ? customCount : 0} 个自定义单词` : `${d.subtitle} · ${d.words.length} 词`}</small><ArrowRight size={17}/></button>)}
    </div></div><footer>每天十分钟 · 记住一点点</footer>
  </section>;
}

function WordManager({ session, words, onRefresh, onBack, onStudy }) {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState({ word: '', phonetic: '', meaning: '', level: '自定义' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const authenticate = async (event) => { event.preventDefault(); setBusy(true); setMessage(''); const action = authMode === 'login' ? supabase.auth.signInWithPassword({ email, password }) : supabase.auth.signUp({ email, password }); const { data, error } = await action; setBusy(false); if (error) return setMessage(error.message); setMessage(authMode === 'login' || data.session ? '登录成功' : '注册成功，请检查邮箱完成验证'); };
  const addWord = async (event) => { event.preventDefault(); if (!form.word.trim() || !form.meaning.trim()) return setMessage('请填写单词和释义'); setBusy(true); setMessage(''); const { error } = await supabase.from('words').upsert({ ...form, word: form.word.trim(), meaning: form.meaning.trim(), user_id: session.user.id }, { onConflict: 'user_id,word' }); setBusy(false); if (error) return setMessage(error.message); setForm({ word: '', phonetic: '', meaning: '', level: '自定义' }); await onRefresh(); setMessage('单词已保存'); };
  const removeWord = async (id) => { const { error } = await supabase.from('words').delete().eq('id', id); if (error) return setMessage(error.message); await onRefresh(); };
  const downloadTemplate = async () => { setMessage(''); try { await downloadWordTemplate(); } catch (error) { setMessage(`模板下载失败：${error.message}`); } };
  const importExcel = async (event) => { const file = event.target.files?.[0]; if (!file) return; setBusy(true); setMessage(''); try { const readXlsxFile = (await import('read-excel-file/browser')).default; const rows = await readXlsxFile(file); if (!rows.length) throw new Error('Excel 文件中没有数据'); const headers = rows[0].map(value => String(value ?? '').trim()); const entries = rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))); const records = entries.map(row => ({ user_id: session.user.id, word: String(row.word || row['单词'] || '').trim(), phonetic: String(row.phonetic || row['音标'] || '').trim(), meaning: String(row.meaning || row['释义'] || '').trim(), level: String(row.level || row['等级'] || '自定义').trim() })).filter(row => row.word && row.meaning); if (!records.length) throw new Error('没有找到有效数据，请使用模板中的列名'); const { error } = await supabase.from('words').upsert(records, { onConflict: 'user_id,word' }); if (error) throw error; await onRefresh(); setMessage(`成功导入 ${records.length} 个单词`); } catch (error) { setMessage(error.message); } finally { setBusy(false); event.target.value = ''; } };
  return <section className="manager shell"><header className="manager-head"><button className="icon-btn" onClick={onBack}><ChevronLeft/></button><div><small>MY WORDS</small><strong>我的单词本</strong></div>{session ? <button className="text-btn" onClick={() => supabase.auth.signOut()}><LogOut size={16}/>退出</button> : <div/>}</header>
    {!session ? <div className="auth-card"><User size={34}/><h1>{authMode === 'login' ? '登录后管理单词' : '创建你的单词本'}</h1><p>你的单词会安全地保存在个人账户中。</p><form onSubmit={authenticate}><input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} required/><input type="password" placeholder="密码（至少 6 位）" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required/><button className="primary" disabled={busy}>{busy ? '请稍候…' : authMode === 'login' ? '登录' : '注册'}</button></form><button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{authMode === 'login' ? '没有账号？注册' : '已有账号？登录'}</button>{message && <p className="form-message">{message}</p>}</div> : <><div className="manager-title"><div><span className="eyebrow"><Sparkles size={15}/> PERSONAL DATABASE</span><h1>新增单词</h1><p>{session.user.email} · 共 {words.length} 个单词</p></div><div className="import-actions"><button type="button" onClick={downloadTemplate}><Download size={17}/>下载 Excel 模板</button><label><Upload size={17}/>导入 Excel<input type="file" accept=".xlsx,.xls" onChange={importExcel}/></label></div></div><form className="word-form" onSubmit={addWord}><input placeholder="单词 *" value={form.word} onChange={e => setForm({...form, word:e.target.value})}/><input placeholder="音标" value={form.phonetic} onChange={e => setForm({...form, phonetic:e.target.value})}/><input placeholder="中文释义 *" value={form.meaning} onChange={e => setForm({...form, meaning:e.target.value})}/><input placeholder="等级" value={form.level} onChange={e => setForm({...form, level:e.target.value})}/><button disabled={busy}><Plus size={18}/>保存</button></form>{message && <p className="form-message">{message}</p>}<div className="word-list-head"><strong>单词列表</strong><button type="button" disabled={!words.length} onClick={onStudy}>开始学习 <ArrowRight size={16}/></button></div><div className="word-table">{words.length ? words.map(item => <div className="word-row" key={item.id}><div><strong>{item.word}</strong><small>{item.phonetic || '暂无音标'}</small></div><span>{item.meaning}</span><em>{item.level}</em><button type="button" aria-label={`删除 ${item.word}`} onClick={() => removeWord(item.id)}><Trash2 size={17}/></button></div>) : <div className="empty-words">还没有单词，手动新增或导入 Excel 开始吧。</div>}</div></>}
  </section>;
}

function Game({ deck, current, lives, score, flipped, flippedOnce, feedback, locked, onFlip, onAnswer, onExit }) {
  return <section className="game shell">
    <header className="game-head"><button className="icon-btn" onClick={onExit}><X size={20}/></button><div className="round-title"><small>{deck.label}词库</small><strong>记忆挑战</strong></div><div className="score-chip"><Sparkles size={14}/>{score}</div></header>
    <div className="status-row"><div className="hearts">{[0,1,2,3,4].map(i => <Heart key={i} size={20} fill={i < lives ? 'currentColor':'none'} className={i < lives ? 'alive':'lost'}/>)}</div><span>{lives} / 5</span></div>
    <div className="card-stage"><div className="ghost-card one"/><div className="ghost-card two"/><div className={`word-card ${flipped?'is-flipped':''} ${feedback||''}`} onClick={onFlip} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onFlip()}} role="button" tabIndex="0" aria-label="翻转单词卡">
      <div className="card-face front"><span className="card-tag">WORD</span><strong>{current.word}</strong><div className="flip-hint"><RotateCcw size={15}/>{flippedOnce ? '本轮已翻转' : '点击卡片查看答案'}</div></div>
      <div className="card-face back"><span className="card-tag">MEANING</span><strong>{current.word}</strong><button className="sound" onClick={(e)=>{e.stopPropagation();speak(current.word)}}><Volume2 size={19}/></button><span className="phonetic">{current.phonetic}</span><div className="divider"/><b>{current.meaning}</b>{current.example && <div className="example"><span>例句</span><p>{current.example}</p></div>}{feedback==='wrong'&&<small className="mistake-note">记住它，下一次会更好</small>}</div>
    </div></div>
    <div className="answer-area"><p>{locked ? (feedback==='correct'?'答对了！':'答案不对，认真看一眼') : '你之前见过这个单词吗？'}</p><div className="answer-buttons"><button disabled={locked} className="new" onClick={()=>onAnswer('new')}><small>没见过</small><strong>NEW</strong></button><button disabled={locked} className="seen" onClick={()=>onAnswer('seen')}><small>见过</small><strong>SEEN</strong></button></div></div>
  </section>;
}

function Result({ deck, score, onAgain, onHome }) {
  const values = useMemo(() => [Math.max(2,deck.stats.average-3), deck.stats.average, score, deck.stats.highest], [deck, score]);
  const max = Math.max(...values, 1);
  return <section className="result shell"><header><button className="icon-btn" onClick={onHome}><ChevronLeft/></button><div className="brand">WORDY<span>.</span></div><div/></header>
    <div className="result-title"><div className="trophy">✦</div><small>本轮挑战结束</small><h1>{score}<span> 分</span></h1><p>{score >= deck.stats.average ? '太棒了，你已经超过平均水平！' : '每次记住一点，下次一定更好。'}</p></div>
    <div className="chart-card"><div className="chart-head"><div><small>{deck.label}词库</small><strong>成绩分布</strong></div><span>本次</span></div><div className="chart">
      {values.map((v,i)=><div className={`bar-wrap ${i===2?'mine':''}`} key={i}><b>{v}</b><div className="bar" style={{height:`${24 + v/max*112}px`}}/><small>{['起步','平均','我的','最高'][i]}</small></div>)}
    </div></div><div className="result-actions"><button className="primary" onClick={onAgain}><RotateCcw size={18}/>再玩一次</button><button onClick={onHome}>换个词库</button></div>
  </section>;
}

function VariantSwitcher({active}) {
  const keys = Object.keys(VARIANTS); const index = keys.indexOf(active);
  const go = d => { const key = keys[(index+d+keys.length)%keys.length]; const u = new URL(location.href); u.searchParams.set('variant',key); location.href=u; };
  useEffect(()=>{ const f=e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1)};addEventListener('keydown',f);return()=>removeEventListener('keydown',f)});
  return <div className="variant-switch"><button onClick={()=>go(-1)}><ChevronLeft/></button><span>{active} · {VARIANTS[active]}</span><button onClick={()=>go(1)}><ChevronRight/></button></div>;
}

export default App;
