import {advertisingPixel} from './meta-pixel.js';
// No client-side reward authority. Only server-verified steps
// can be reviewed. Tapping an answer submits it once and advances on success.
const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search), campaign = query.get('campaign') ?? '';
const api = document.querySelector('meta[name="traffic-api"]').content || location.origin;
const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
if (new URL(api).origin !== api || (!api.startsWith('https:') && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(api))) throw Error('INVALID_API_ORIGIN');
const key = 'poker-training:' + campaign;
const stored = suffix => { try { return sessionStorage.getItem(key + suffix); } catch { return null; } };
const save = (suffix, value) => { try { sessionStorage.setItem(key + suffix, String(value)); } catch { /* Storage is optional. */ } };
const initialView = stored(':view');
let lang = stored(':language') === 'ru' ? 'ru' : 'uz-Latn';
let session = '', lesson = null, info = null, busy = false, lastAction = null, view = -1;
let selected = '', failedAnswer = '', feedback = '', errorCode = '';
const t = (ru, uz) => lang === 'ru' ? ru : uz;
const format = value => new Intl.NumberFormat('ru-RU').format(value);
const record = () => view === lesson?.step && !lesson.completed ? lesson : lesson?.review?.find(item => item.step === view);
const reviewed = () => view >= 0 && view < 3 && view < (lesson?.step ?? 0);

function cards(target, values, emphasis = false) {
  const existing = [...target.children];
  if (existing.length === values.length && existing.every((card, index) => card.dataset.card === values[index] && card.classList.contains('emphasis') === emphasis)) return;
  target.replaceChildren(...values.map((value, index) => {
    const card = document.createElement('div');
    const rank = value.slice(0, -1), suit = value.slice(-1);
    card.className = 'playing-card' + (/[♥♦]/.test(suit) ? ' red' : '') + (emphasis ? ' emphasis' : '');
    card.dataset.card = value;
    card.style.setProperty('--index', index);
    card.setAttribute('role', 'img'); card.setAttribute('aria-label', value);
    for (const position of ['', ' bottom']) {
      const corner = document.createElement('span'), mark = document.createElement('small');
      corner.className = 'card-corner' + position; corner.setAttribute('aria-hidden', 'true');
      corner.textContent = rank; mark.textContent = suit; corner.append(mark); card.append(corner);
    }
    const pip = document.createElement('span'); pip.className = 'card-pip'; pip.textContent = suit;
    pip.setAttribute('aria-hidden', 'true'); card.append(pip);
    return card;
  }));
}

function texts() {
  document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz';
  document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
  $('local-notice').hidden = !local;
  $('local-notice').textContent = t('Локальная проверка · рабочая игра и балансы не меняются.', 'Mahalliy sinov · asosiy o‘yin va balanslar o‘zgarmaydi.');
  $('eyebrow').textContent = t('Ваше знакомство с покером', 'Poker bilan tanishing');
  $('title').textContent = (lesson?.bonusAmount ?? info?.bonusAmount) === 0
    ? t('Ответь на 3 вопроса. Начни играть.', '3 ta savolga javob ber. O‘yinni boshla.')
    : t('Ответь на 3 вопроса и получи бонус', '3 ta savolga javob ber va bonus ol');
  $('intro').textContent = t('Играй прямо в Telegram — без скачивания.', 'Telegram’da o‘yna — yuklab olish shart emas.');
  $('reward-label').textContent = t('Новому игроку бонус', 'Yangi o‘yinchiga bonus');
  $('amount').textContent = info ? format(lesson?.bonusAmount ?? info.bonusAmount) : '—';
  $('done-chips').textContent = t('фишек', 'fishka');
  $('begin').textContent = lesson ? t('Продолжить обучение →', 'Darsni davom ettirish →') : t('Начать →', 'Boshlash →');
  $('back-label').textContent = t('Назад', 'Orqaga');
  $('steps').replaceChildren(...[
    t('Пройди обучение', 'Darsni tugat'), t('Открой @FbAdm_bot', '@FbAdm_bot’ni och'), t('Войди в игру', 'O‘yinga kir')
  ].map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('example-label').textContent = t('Пять карт комбинации', 'Kombinatsiyadagi beshta karta');
  $('remaining-label').textContent = t('Ещё на столе', 'Stoldagi boshqa kartalar');
  $('context-label').textContent = t('Ваши карты и общий стол', 'Sizning kartalaringiz va stol');
  $('done-kicker').textContent = t('3 из 3 · обучение завершено', '3 / 3 · dars tugadi');
  $('done-title').textContent = t('Отлично. Теперь — в игру.', 'Ajoyib. Endi — o‘yinga.');
  $('done-intro').textContent = t('Ты познакомился с тремя комбинациями. Открой @FbAdm_bot, нажми «Старт» и перейди в игру.', 'Uchta kombinatsiya bilan tanishding. @FbAdm_bot’ni och, «Start»ni bos va o‘yinga o‘t.');
  $('ready-label').textContent = t('Бонус новому игроку после первого входа', 'Ilk kirishdan so‘ng yangi o‘yinchiga bonus');
  $('bonus-note').textContent = t('Бонус ещё не начислен. Он появится после входа в игру, если ты новый игрок и выполнил условия.', 'Bonus hali berilmadi. Yangi o‘yinchi bo‘lsang va shartlarni bajarsang, o‘yinga kirganingdan so‘ng beriladi.');
  $('bot').textContent = t('Перейти в Telegram →', 'Telegram’ga o‘tish →');
  $('bot-route').textContent = '@FbAdm_bot → @Swara_online_bot';
  $('terms').textContent = t('18+. Бонус — только новому игроку с меткой fbclid из рекламы Meta или по агентской ссылке: один раз после обучения, перехода через @FbAdm_bot и первого входа в игру. Вместо стартового бонуса, не дополнительно. Согласие на рекламный учёт не влияет на бонус. Ссылка действует 24 часа.', '18+. Bonus faqat Meta reklamasidan fbclid belgisi bilan yoki agent havolasi orqali kelgan yangi o‘yinchiga: dars, @FbAdm_bot va o‘yinga ilk kirishdan so‘ng bir marta. Boshlang‘ich bonus o‘rniga, qo‘shimcha emas. Reklama roziligi bonusga ta’sir qilmaydi. Havola 24 soat amal qiladi.');
  $('advertising-title').textContent = t('Разрешить рекламный учёт Meta?', 'Meta reklama hisobiga rozimisiz?');
  $('advertising-description').textContent = t('Передадим Meta сведения о посещении, обучении, регистрации, играх и покупках P2P, а также рекламную метку, IP и данные браузера. Это помогает оценивать рекламу. Бонус не зависит от согласия. Отозвать его можно здесь или командой /stop в @FbAdm_bot.', 'Meta’ga tashrif, dars, ro‘yxatdan o‘tish, o‘yinlar va P2P xaridlari, reklama belgisi, IP va brauzer ma’lumotlarini yuboramiz. Bu reklamani baholashga yordam beradi. Bonus rozilikka bog‘liq emas. Rozilikni shu yerda yoki @FbAdm_bot’da /stop orqali bekor qilish mumkin.');
  $('advertising-accept').textContent = t('Разрешить', 'Roziman');
  $('advertising-decline').textContent = t('Без рекламного учёта', 'Reklama hisobisiz');
  $('advertising-revoke').textContent = t('Отключить рекламный учёт', 'Reklama hisobini o‘chirish');
  $('advertising-choice').hidden = !info?.advertising?.pixelId || !!lesson?.advertising?.choice;
  $('advertising-revoke').hidden = lesson?.advertising?.choice !== 'accepted';
  $('retry').textContent = t('Повторить попытку', 'Qayta urinish');
  $('error').textContent = errorCode ? message(errorCode) : '';
}

function message(code) {
  if (/EXPIRED|ATTEMPTS_EXHAUSTED/.test(code)) return t('Сессия завершилась. Нажми «Повторить попытку», чтобы начать заново.', 'Sessiya tugadi. Qaytadan boshlash uchun «Qayta urinish»ni bos.');
  if (/CAMPAIGN|UNAVAILABLE|DISABLED/.test(code)) return t('Обучение по этой ссылке сейчас недоступно. Проверь ссылку или попробуй позднее.', 'Bu havolada dars hozir mavjud emas. Havolani tekshir yoki keyinroq urinib ko‘r.');
  if (code === 'LOCAL_BOT') return t('Локальная проверка: переход в настоящий бот отключён.', 'Mahalliy sinov: haqiqiy botga o‘tish o‘chirilgan.');
  if (code === 'TRAINING_STEP_CONFLICT') return t('Прогресс изменился в другом окне. Повтори попытку, чтобы восстановить его.', 'Natija boshqa oynada o‘zgardi. Uni tiklash uchun qayta urinib ko‘r.');
  return t('Не удалось связаться с сервером. Прогресс сохранён — попробуй ещё раз.', 'Server bilan bog‘lanib bo‘lmadi. Natija saqlangan — qayta urinib ko‘r.');
}

async function request(path, body) {
  const response = await fetch(api + path, {
    method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}), credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000)
  });
  const data = await response.json(); if (!response.ok) throw Error(data.error || 'NETWORK'); return data;
}

async function run(action) {
  if (busy) return;
  busy = true; lastAction = action; errorCode = ''; $('error').textContent = ''; $('retry').hidden = true; setDisabled();
  try { await action(); }
  catch (error) {
    errorCode = error.message; $('error').textContent = message(errorCode); $('retry').hidden = false;
    if (/EXPIRED|ATTEMPTS_EXHAUSTED/.test(errorCode)) {
      session = ''; try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ':view'); } catch { /* Optional. */ }
      lastAction = () => location.reload();
    } else if (errorCode === 'TRAINING_STEP_CONFLICT') {
      lastAction = async () => { lesson = await request('/traffic/training/state', { session, language: lang }); show(lesson.step); };
    }
  } finally { busy = false; setDisabled(); }
}

function setDisabled() {
  document.querySelectorAll('button').forEach(button => { button.disabled = busy; });
  $('begin').disabled = busy || !info?.trainingAvailable || !!(info?.advertising?.pixelId && !lesson?.advertising?.choice);
  $('advance').disabled = busy || !reviewed();
  document.querySelectorAll('#choices button').forEach(button => { button.disabled = busy || reviewed(); });
  $('navigation').setAttribute('aria-busy', String(busy));
  $('answer-action').textContent = busy ? t('Проверяем…', 'Tekshirilmoqda…') : t('Нажми на вариант ответа', 'Javob variantini bos');
  $('bot').setAttribute('aria-disabled', String(busy)); $('bot').tabIndex = busy ? -1 : 0;
}

function updateChoices() {
  const current = record(), complete = reviewed();
  document.querySelectorAll('#choices button').forEach(button => {
    const answer = button.dataset.answer;
    const state = complete && answer === current.answer ? 'correct' : !complete && answer === failedAnswer ? 'incorrect' : !complete && answer === selected ? 'selected' : 'idle';
    button.dataset.state = state;
    button.setAttribute('aria-pressed', String(complete ? answer === current.answer : answer === selected));
    button.querySelector('.choice-index').textContent = state === 'correct' ? '✓' : state === 'incorrect' ? '×' : button.dataset.index;
    button.querySelector('.choice-status').textContent = state === 'correct' ? t('Верно', 'To‘g‘ri') : state === 'incorrect' ? t('Неверно', 'Noto‘g‘ri') : state === 'selected' ? t('Выбрано', 'Tanlandi') : '';
  });
  setDisabled();
}

function render(animate = false) {
  texts();
  const hero = view === -1, done = view === 3 && lesson?.completed;
  document.querySelector('main').dataset.screen = hero ? 'hero' : done ? 'done' : 'lesson';
  // On the welcome screen the CTA precedes the three steps. Internal screens
  // keep the same navigation pinned below the content, outside the hidden hero.
  const navigationAnchor = hero ? $('steps') : $('terms');
  if ($('navigation').parentElement !== navigationAnchor.parentElement) navigationAnchor.before($('navigation'));
  $('hero').hidden = !hero; $('lesson').hidden = hero || done; $('done').hidden = !done;
  $('begin').hidden = !hero; $('advance').hidden = hero || done || !reviewed(); $('bot').hidden = !done; $('back').hidden = hero;
  $('answer-action').hidden = hero || done || reviewed();
  $('eyebrow').hidden = !hero; $('progress').hidden = hero;
  const completed = lesson?.step ?? 0;
  $('progress-label').textContent = t(`Пройдено ${completed} из 3`, `${completed} / 3 bajarildi`);
  $('progress-meter').setAttribute('aria-valuenow', String(completed));
  $('progress-meter').setAttribute('aria-label', t('Пройденные вопросы', 'Bajarilgan savollar'));
  $('progress-bars').replaceChildren(...[0, 1, 2].map(index => {
    const bar = document.createElement('i'); bar.className = index < completed ? 'passed' : index === completed ? 'current' : ''; return bar;
  }));
  if (hero) {
    cards($('hero-cards'), ['A♠', 'A♥']);
    $('nav-hint').textContent = lesson ? t('Пройденные вопросы сохранены', 'Bajarilgan savollar saqlangan') : t('3 вопроса · около минуты', '3 savol · taxminan bir daqiqa');
  } else if (done) {
    if (!/^https:\/\/t\.me\/FbAdm_bot\?start=tb_[A-Za-z0-9_-]{32}$/.test(lesson.botUrl)) throw Error('INVALID_BOT_LINK');
    $('bot').href = lesson.botUrl; $('done-amount').textContent = format(lesson.bonusAmount);
    cards($('done-cards'), lesson.exampleCards);
    $('nav-hint').textContent = t('Следующий шаг — открыть бота и войти в игру', 'Keyingi qadam — botni ochish va o‘yinga kirish');
  } else {
    const current = record(); if (!current) throw Error('TRAINING_STEP_CONFLICT');
    const complete = reviewed();
    $('lesson').dataset.mode = complete ? 'answered' : 'question';
    $('lesson').dataset.step = String(view);
    $('chapter').textContent = t(`Вопрос ${view + 1} / 3`, `${view + 1} / 3-savol`);
    $('lesson-title').textContent = current.title;
    $('lesson-description').textContent = current.description;
    cards($('example'), current.exampleCards, true);
    // These two background cards are from the unchanged lesson, not invented decoration.
    const allCards = current.description.match(/(?:10|[2-9JQKA])[♠♥♦♣]/g) || [];
    const remaining = allCards.filter(card => !current.exampleCards.includes(card));
    cards($('remaining-cards'), remaining); $('remaining-cards').parentElement.hidden = !remaining.length;
    $('question').textContent = current.question;
    $('choices').replaceChildren(...current.choices.map((choice, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.answer = choice.id; button.dataset.index = String(index + 1);
      const number = document.createElement('span'), label = document.createElement('span'), status = document.createElement('span');
      number.className = 'choice-index'; number.setAttribute('aria-hidden', 'true'); label.textContent = choice.label; status.className = 'choice-status';
      button.append(number, label, status);
      button.onclick = () => { if (busy || reviewed()) return; selected = choice.id; updateChoices(); submitAnswer(choice.id); };
      return button;
    }));
    $('feedback').dataset.state = feedback ? 'incorrect' : 'idle';
    $('feedback-title').textContent = feedback ? t('Подсказка. Посмотри на карты ещё раз', 'Maslahat. Kartalarga yana bir qarab ko‘r') : '';
    $('feedback-text').textContent = feedback;
    $('advance').textContent = view === 2 ? t('К результату →', 'Natijaga →') : t('Дальше →', 'Keyingisi →');
    $('nav-hint').textContent = complete ? t('Этот вопрос уже пройден. Прогресс сохранён', 'Bu savol bajarilgan. Natija saqlangan') : t('Верный ответ — сразу следующий вопрос', 'To‘g‘ri javob — darhol keyingi savol');
    updateChoices();
  }
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('enter'));
  if (animate) { const screen = hero ? $('hero') : done ? $('done') : $('lesson'); void screen.offsetWidth; screen.classList.add('enter'); }
  save(':view', view); save(':language', lang); setDisabled();
}

function show(next) {
  view = next; selected = ''; failedAnswer = ''; feedback = ''; $('hand-context').open = false;
  render(true);
  const title = view === -1 ? $('title') : view === 3 ? $('done-title') : $('lesson-title');
  title.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
}

$('begin').onclick = () => run(async () => {
  if (lesson) { show(lesson.step); return; }
  if(info?.advertising){await chooseAdvertising('declined');show(lesson.step);return;}
  const payload = { campaign, language: lang }; if (query.has('fbclid')) payload.fbclid = query.get('fbclid');
  const data = await request('/traffic/training/start', payload);
  session = data.session; lesson = data.lesson; save('', session); show(lesson.step);
});
function consentPayload(choice) {
  return {advertisingConsent:{version:'landing-v3',choice},...(query.has('fbclid')?{fbclid:query.get('fbclid')}:{})};
}
async function chooseAdvertising(choice) {
  if(session) lesson=await request('/traffic/training/advertising',{session,...consentPayload(choice)});
  else {
    const utm={};for(const field of ['source','medium','campaign','content','term'])if(query.has('utm_'+field))utm[field]=query.get('utm_'+field).slice(0,120);
    const data=await request('/traffic/training/start',{campaign,language:lang,...consentPayload(choice),utm});
    session=data.session;lesson=data.lesson;save('',session);
  }
  advertisingPixel(lesson.advertising);render();
}
$('advertising-accept').onclick=()=>run(()=>chooseAdvertising('accepted'));
$('advertising-decline').onclick=()=>run(()=>chooseAdvertising('declined'));
$('advertising-revoke').onclick=()=>{advertisingPixel({choice:'declined'});void run(()=>chooseAdvertising('declined'));};
function submitAnswer(answer) {
  if (busy || reviewed()) return;
  // Capture the exact request for a safe retry if the response is lost after commit.
  const step = view;
  void run(async () => {
    lesson = await request('/traffic/training/answer', { session, step, answer });
    if (lesson.step > step) show(lesson.step);
    else {
      feedback = lesson.feedback || ''; failedAnswer = answer; render();
      // Keep the hint above the fixed navigation, including on short phones.
      const overflow = $('feedback').getBoundingClientRect().bottom - $('navigation').getBoundingClientRect().top + 12;
      if (overflow > 0) window.scrollBy({top: overflow, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
  });
}
$('advance').onclick = () => { if (!busy && reviewed()) show(view + 1); };
$('back').onclick = () => { if (!busy) show(view - 1); };
$('home').onclick = event => { event.preventDefault(); if (!busy) show(-1); };
$('retry').onclick = () => { if (lastAction) void run(lastAction); };
$('bot').onclick = event => {
  if (busy || local) event.preventDefault();
  if (local) { errorCode = 'LOCAL_BOT'; $('error').textContent = message(errorCode); }
};
document.querySelectorAll('[data-lang]').forEach(button => button.onclick = () => run(async () => {
  const before = lang; lang = button.dataset.lang;
  try {
    if (session) {lesson = await request('/traffic/training/state', { session, language: lang });advertisingPixel(lesson.advertising);}
    // Incorrect feedback is localized by the server; clear it without resubmitting
    // an answer or spending another attempt when switching language.
    feedback = ''; failedAnswer = ''; render();
  } catch (error) { lang = before; render(); throw error; }
}));

render();
void run(async () => {
  info = await request('/traffic/campaign?campaign=' + encodeURIComponent(campaign));
  if(info.bonusRequiresFacebookClick&&!query.get('fbclid'))info.bonusAmount=0;
  session = stored('') || '';
  if (session) {
    lesson = await request('/traffic/training/state', { session, language: lang });
    advertisingPixel(lesson.advertising);
    const candidate = initialView === null ? lesson.step : Number(initialView);
    view = Number.isInteger(candidate) && candidate >= -1 && candidate <= lesson.step ? candidate : lesson.step;
    if(info.advertising&&!lesson.advertising?.choice)view=-1;
  }
  render(true);
});
