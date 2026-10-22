/* Optional landing funnel. No Meta code, cookies or visit is created before consent. */
(()=>{
  'use strict';
  const own=document.currentScript,configured=own?.dataset.api;
  const local=['localhost','127.0.0.1'].includes(location.hostname);
  const api=local?location.origin:(configured||new URL(own.src).origin);
  let config=null,busy=false;
  const uz=()=>document.documentElement.lang.startsWith('uz');
  const tr=(ru,uzbek)=>uz()?uzbek:ru;
  const fetchConfig=fetch(api+'/traffic/config',{credentials:'omit',signal:AbortSignal.timeout(4000)}).then(r=>r.ok?r.json():null).then(c=>{if(c?.enabled&&c.landingOrigin===location.origin&&/^\d{5,25}$/.test(c.pixelId)&&/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(c.trafficBotUsername))config=c;}).catch(()=>{});
  async function pixel(){
    let ready=Promise.resolve();
    if(!window.fbq){const q=function(){q.callMethod?q.callMethod.apply(q,arguments):q.queue.push(arguments);};q.queue=[];q.loaded=true;q.version='2.0';window.fbq=q;window._fbq=q;const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';ready=new Promise(resolve=>{script.onload=script.onerror=resolve;setTimeout(resolve,1200);});document.head.append(script);}
    window.fbq('init',config.pixelId);window.fbq('track','PageView');
    // Preserve the existing landing conversion, now only after consent.
    window.fbq('track','Contact',{content_name:'Play'});
    // Give the consented pixel a bounded opportunity to dispatch before leaving
    // the landing. Blocked advertising scripts must never prevent opening game.
    await ready;await new Promise(resolve=>setTimeout(resolve,150));
  }
  function consent(){return new Promise(resolve=>{
    const d=document.createElement('dialog');d.style.cssText='max-width:calc(100vw - 32px);width:420px;box-sizing:border-box;padding:20px;border:1px solid #518366;border-radius:16px;background:#08271a;color:#fff;font:15px/1.5 Arial;z-index:999999';
    const p=document.createElement('p');p.textContent=tr('Разрешить рекламный учёт Meta: переход, регистрация, количество игр и завершённые покупки P2P? Будут передаваться рекламные идентификаторы, IP, браузер и обезличенный ID. Играть можно без согласия. Отключение: профиль игры или /stop в трафик-боте.','Meta reklama hisobiga ruxsat berasizmi: o‘tish, ro‘yxat, o‘yinlar soni va yakunlangan P2P xaridlari? Reklama identifikatorlari, IP, brauzer va shaxssiz ID yuboriladi. Roziliksiz ham o‘ynash mumkin. O‘chirish: o‘yin profili yoki trafik botida /stop.');
    let privacy=null;
    if(config.privacyUrl){privacy=document.createElement('a');privacy.href=config.privacyUrl;privacy.target='_blank';privacy.rel='noopener';privacy.style.color='#71eab0';privacy.textContent=tr('Политика конфиденциальности','Maxfiylik siyosati');}
    const adult=document.createElement('label'),check=document.createElement('input');check.type='checkbox';adult.append(check,document.createTextNode(tr(' Мне исполнилось 18 лет',' Men 18 yoshga to‘lganman')));
    const actions=document.createElement('div');actions.style.cssText='display:grid;gap:10px;margin-top:16px';
    const finish=v=>{d.close();d.remove();resolve(v);};
    for(const [yes,label]of [[true,tr('Разрешить и продолжить','Ruxsat berish va davom etish')],[false,tr('Продолжить без учёта','Hisobsiz davom etish')]]){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:14px;border-radius:9px;background:#21bc72;color:#00190c;border:1px solid #68c993;font-weight:bold';
      if(yes){b.disabled=true;check.addEventListener('change',()=>b.disabled=!check.checked);}b.addEventListener('click',()=>finish(yes));actions.append(b);
    }
    d.addEventListener('cancel',e=>{e.preventDefault();finish(false);});d.append(p);if(privacy)d.append(privacy,document.createElement('br'));d.append(adult,actions);document.body.append(d);d.showModal();
  });}
  document.addEventListener('click',async event=>{
    const link=event.target.closest?.('a[data-event="Play"]');if(!link)return;
    event.preventDefault();if(busy)return;busy=true;
    const fallback=link.href;
    try{
      await fetchConfig;if(!config){location.href=fallback;return;}
      const direct=`https://t.me/${config.trafficBotUsername}?start=direct`;
      if(!await consent()){location.href=direct;return;}
      await pixel();
      const fbclid=new URLSearchParams(location.search).get('fbclid');
      const cookie=name=>document.cookie.split('; ').find(c=>c.startsWith(name+'='))?.slice(name.length+1);
      const fbc=fbclid&&/^[A-Za-z0-9._-]{1,500}$/.test(fbclid)?`fb.1.${Date.now()}.${fbclid}`:cookie('_fbc');
      const response=await fetch(api+'/traffic/visit',{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,consentVersion:'v1',...(fbc?{fbc}:{}),...(cookie('_fbp')?{fbp:cookie('_fbp')}:{}),campaign:(new URLSearchParams(location.search).get('utm_campaign')||'').slice(0,120)}),signal:AbortSignal.timeout(5000)});
      if(!response.ok){location.href=direct;return;}
      const result=await response.json();const target=new URL(result.url);
      if(target.origin!=='https://t.me'||target.pathname!==`/${config.trafficBotUsername}`)throw Error('TRAFFIC_LINK');
      location.href=target.href;
    }catch{location.href=fallback;}finally{busy=false;}
  });
})();

