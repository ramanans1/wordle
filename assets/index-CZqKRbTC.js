(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))c(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const s of t.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&c(s)}).observe(document,{childList:!0,subtree:!0});function l(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function c(e){if(e.ep)return;e.ep=!0;const t=l(e);fetch(e.href,t)}})();const i=document.querySelector("#app");if(!i)throw new Error("App container not found");const n=document.createElement("section");n.className="card";n.innerHTML=`
  <h2 class="section-title">Diagnostics</h2>
  <ul class="list">
    <li><strong>Storage:</strong> ${a()}</li>
    <li><strong>Base path:</strong> /wordle/</li>
  </ul>
`;i.appendChild(n);function a(){try{const r="wordle_web_storage_test";return localStorage.setItem(r,"ok"),localStorage.removeItem(r),"localStorage available"}catch{return"localStorage blocked"}}
