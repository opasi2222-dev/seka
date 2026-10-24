// No advertising SDK, Meta network calls or client-side reward authority.
const $=id=>document.getElementById(id),query=new URLSearchParams(location.search),campaign=query.get('campaign')??'';
const configured=document.querySelector('meta[name="traffic-api"]').content;
const api=configured||location.origin;
const local=['127.0.0.1','localhost'].includes(location.hostname);
if(new URL(api).origin!==api||(!api.startsWith('https:')&&!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(api)))throw Error('INVALID_API_ORIGIN');
let lang='uz-Latn',session='',lesson=null,info=null,busy=false,lastAction=null;
const key='poker-training:'+campaign;
const t=(ru,uz)=>lang==='ru'?ru:uz;
function texts(){document.documentElement.lang=lang==='ru'?'ru':'uz';document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
  $('local-notice').hidden=!local;$('local-notice').textContent=t('Локальная проверка. Рабочая игра и её балансы не меняются.','Mahalliy sinov. Asosiy o‘yin va balanslar o‘zgarmaydi.');
  $('eyebrow').textContent=t('3 шага · прямо в Telegram','3 qadam · Telegram ichida');
  $('title').textContent=t('Поймите покер. Начните играть.','Pokerni o‘rganing. O‘yinni boshlang.');
  $('intro').textContent=t('Узнайте три покерные комбинации. Без скачивания.','Uchta poker kombinatsiyasini o‘rganing. Yuklab olish shart emas.');
  $('reward-label').textContent=t('Бонус новому игроку после обучения и первого входа','Yangi o‘yinchiga dars va ilk kirishdan so‘ng bonus');
  $('chips-label').textContent=$('done-chips').textContent=t('фишек','fishka');
  $('begin').textContent=t('Начать обучение →','O‘rganishni boshlash →');
  $('duration').textContent=t('3 вопроса · около минуты','3 savol · taxminan bir daqiqa');
  $('steps').replaceChildren(...[t('Пройти обучение','Darsni tugating'),t('Открыть @FbAdm_bot','@FbAdm_bot’ni oching'),t('Войти в игру','O‘yinga kiring')].map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('done-title').textContent=t('Обучение пройдено!','Dars tugadi!');
  $('done-intro').textContent=t('Теперь откройте @FbAdm_bot, нажмите «Старт», затем войдите в игру. Право на бонус проверит сервер.','Endi @FbAdm_bot’ni oching, «Start» bosing va o‘yinga kiring. Bonus shartlarini server tekshiradi.');
  $('ready-label').textContent=t('Доступно новому игроку при выполнении условий','Shartlar bajarilganda yangi o‘yinchiga');
  $('bot').textContent=t('Продолжить в Telegram →','Telegram’da davom etish →');
  $('bot-route').textContent='@FbAdm_bot → @Swara_online_bot';
  $('terms').textContent=t('18+. Бонус — только новым игрокам: один раз после обучения, перехода через @FbAdm_bot и первого входа в игру. Вместо стартового бонуса, не дополнительно. Согласие на рекламный учёт спрашивается отдельно в боте и не влияет на бонус. Ссылка действует 24 часа.','18+. Bonus faqat yangi o‘yinchiga: dars, @FbAdm_bot orqali o‘tish va o‘yinga ilk kirishdan so‘ng bir marta. Boshlang‘ich bonus o‘rniga, unga qo‘shimcha emas. Reklama hisobi uchun rozilik botda alohida so‘raladi va bonusga ta’sir qilmaydi. Havola 24 soat amal qiladi.');
  $('retry').textContent=t('Повторить попытку','Qayta urinish');
  $('amount').textContent=info?new Intl.NumberFormat('ru-RU').format(info.bonusAmount):'—';
}
function message(code){
  if(/EXPIRED|ATTEMPTS_EXHAUSTED/.test(code))return t('Сессия завершилась. Обновите страницу и пройдите обучение заново.','Sessiya tugadi. Sahifani yangilang va darsni qayta o‘ting.');
  if(/CAMPAIGN|UNAVAILABLE|DISABLED/.test(code))return t('Обучение по этой ссылке сейчас недоступно. Проверьте ссылку кампании или попробуйте позднее.','Bu havolada dars hozir mavjud emas. Kampaniya havolasini tekshiring yoki keyinroq urinib ko‘ring.');
  return t('Не удалось связаться с сервером. Прогресс не потерян — попробуйте ещё раз.','Server bilan bog‘lanib bo‘lmadi. Natija saqlangan — qayta urinib ko‘ring.');
}
async function request(path,body){const r=await fetch(api+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.error||'NETWORK');return data;}
async function run(action){if(busy)return;busy=true;lastAction=action;$('error').textContent='';$('retry').hidden=true;setDisabled(true);try{await action();}catch(e){$('error').textContent=message(e.message);$('retry').hidden=false;if(/EXPIRED|ATTEMPTS_EXHAUSTED/.test(e.message)){session='';try{sessionStorage.removeItem(key);}catch{}lastAction=()=>location.reload();}}finally{busy=false;setDisabled(false);}}
function setDisabled(value){document.querySelectorAll('button').forEach(b=>b.disabled=value);$('begin').disabled=value||!info?.trainingAvailable;}
function render(){texts();$('hero').hidden=!!lesson;$('lesson').hidden=!lesson||lesson.completed;$('done').hidden=!lesson?.completed;if(!lesson)return;
  if(lesson.completed){if(!/^https:\/\/t\.me\/FbAdm_bot\?start=tb_[A-Za-z0-9_-]{32}$/.test(lesson.botUrl))throw Error('INVALID_BOT_LINK');$('bot').href=lesson.botUrl;$('done-amount').textContent=new Intl.NumberFormat('ru-RU').format(lesson.bonusAmount);return;}
  $('progress-label').textContent=t(`Шаг ${lesson.step+1} из 3`,`${lesson.step+1} / 3-qadam`);
  $('progress-bars').replaceChildren(...[0,1,2].map(n=>{const el=document.createElement('i');if(n<=lesson.step)el.className='active';return el;}));
  $('lesson-title').textContent=lesson.title;$('lesson-description').textContent=lesson.description;$('question').textContent=lesson.question;$('feedback').textContent=lesson.feedback||'';
  $('example').textContent=(lesson.exampleCards||[]).join(' ');$('example').hidden=!lesson.exampleCards?.length;
  $('choices').replaceChildren(...lesson.choices.map(choice=>{const b=document.createElement('button');b.textContent=choice.label;b.dataset.answer=choice.id;b.onclick=()=>run(async()=>{lesson=await request('/traffic/training/answer',{session,step:lesson.step,answer:choice.id});render();});return b;}));
}
$('begin').onclick=()=>run(async()=>{const payload={campaign,language:lang};if(query.has('fbclid'))payload.fbclid=query.get('fbclid');const data=await request('/traffic/training/start',payload);session=data.session;lesson=data.lesson;try{sessionStorage.setItem(key,session);}catch{}render();});
$('retry').onclick=()=>{if(lastAction)void run(lastAction);};
$('bot').onclick=e=>{if(local){e.preventDefault();$('error').textContent=t('Это локальная проверка: переход в настоящий бот отключён.','Bu mahalliy sinov: haqiqiy botga o‘tish o‘chirilgan.');}};
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>run(async()=>{const before=lang;lang=b.dataset.lang;try{if(session)lesson=await request('/traffic/training/state',{session,language:lang});render();}catch(e){lang=before;render();throw e;}}));
texts();void run(async()=>{info=await request('/traffic/campaign?campaign='+encodeURIComponent(campaign));try{session=sessionStorage.getItem(key)||'';}catch{}if(session)lesson=await request('/traffic/training/state',{session,language:lang});render();});
