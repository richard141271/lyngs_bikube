(() => {
  const btn=document.getElementById("btnInstall");
  const hint=document.querySelector(".hint");
  let deferred=null;
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  const installed=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if(/iphone|ipad|ipod/i.test(navigator.userAgent) && !installed){
    if(hint) hint.textContent="iOS: Del › Legg til på Hjem-skjermen for å installere.";
  }
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    if(localStorage.getItem('pwa.dismiss')==='1') return;
    deferred=e;
    btn.style.display='inline-block';
  });
  if(btn){
    btn.addEventListener('click',async()=>{
      if(!deferred) return;
      deferred.prompt();
      const res=await deferred.userChoice;
      deferred=null;
      btn.style.display='none';
      if(res&&res.outcome==='dismissed') localStorage.setItem('pwa.dismiss','1');
    });
  }
})(); 
