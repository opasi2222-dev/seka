/* First-party click handoff only. Consent lives in the traffic bot.
   No Meta SDK, advertising cookies, localStorage, or browser Meta events. */
(()=>{
  'use strict';
  const own=document.currentScript,configured=own?.dataset.api;
  const local=['localhost','127.0.0.1'].includes(location.hostname);
  const api=local?location.origin:(configured||new URL(own.src).origin);
  let config=null,busy=false;
  const fetchConfig=fetch(api+'/traffic/config',{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(4000)})
    .then(r=>r.ok?r.json():null).then(c=>{if(c?.enabled&&c.landingOrigin===location.origin&&/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(c.trafficBotUsername))config=c;}).catch(()=>{});
  document.addEventListener('click',async event=>{
    const link=event.target.closest?.('a[data-event="Play"]');if(!link)return;
    event.preventDefault();if(busy)return;busy=true;
    let fallback=link.href;
    try{
      await fetchConfig;if(!config){location.href=fallback;return;}
      fallback='https://t.me/'+config.trafficBotUsername+'?start=direct';
      // Mixed-version deployment/rollback fails closed, never creates consent.
      if(config.botConsentVersion!=='v2'){location.href=fallback;return;}
      const params=new URLSearchParams(location.search),fbclid=params.get('fbclid');
      const response=await fetch(api+'/traffic/handoff',{
        method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'content-type':'application/json'},
        body:JSON.stringify({language:document.documentElement.lang.startsWith('uz')?'uz-Latn':'ru',
          ...(fbclid&&/^[A-Za-z0-9._-]{1,500}$/.test(fbclid)?{fbclid}:{}),campaign:(params.get('utm_campaign')||'').slice(0,120)}),
        signal:AbortSignal.timeout(5000),
      });
      if(!response.ok){location.href=fallback;return;}
      const target=new URL((await response.json()).url);
      if(target.origin!=='https://t.me'||target.pathname!=='/'+config.trafficBotUsername||target.username||target.password||target.hash||
        !/^\?start=tb_[A-Za-z0-9_-]{32}$/.test(target.search))throw Error('TRAFFIC_LINK');
      location.href=target.href;
    }catch{location.href=fallback;}finally{busy=false;}
  });
})();

