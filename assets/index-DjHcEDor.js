(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function e(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(o){if(o.ep)return;o.ep=!0;const a=e(o);fetch(o.href,a)}})();const k=[{id:"mini",label:"Pupil",wordLength:3,maxGuesses:5,answerFile:"allowed-answers-3",guessFile:"allowed-guesses-3"},{id:"junior",label:"Scribe",wordLength:4,maxGuesses:6,answerFile:"allowed-answers-4",guessFile:"allowed-guesses-4"},{id:"classic",label:"Author",wordLength:5,maxGuesses:6,answerFile:"allowed-answers",guessFile:"allowed-guesses"},{id:"epic",label:"Wordsmith",wordLength:6,maxGuesses:7,answerFile:"allowed-answers-6",guessFile:"allowed-guesses-6"}],J="mini",z=new Set(["abuse","abort","adult","arson","bigot","blood","bosom","booze","boozy","bribe","butch","crime","death","detox","drink","drunk","dummy","felon","fraud","gipsy","heist","idiot","kinky","knife","loser","lynch","moron","rifle","smoke","smoky","thief","toxic","toxin","venom","vomit"]),H={mini:["cat","dog","sun","hat","bag","cup","toy","pig","ice","jam"],junior:["play","rain","cake","book","kite","fish","snow","milk","gold","star"],classic:["apple","baker","cabin","delta","eagle","fancy","giant","habit","ideal","joker","lemon","magic"],epic:["planet","bright","forest","castle","silver","charge","stream","wander","rocket","little"]},E={unused:0,absent:1,present:2,correct:3},x={inProgress:"inProgress",won:"won",lost:"lost"},m={home:"home",game:"game",history:"history",stats:"stats",about:"about",howToPlay:"howToPlay"},j="history_entries_json",O="random_seed",Y="current_mode",L={getHistory(){const t=localStorage.getItem(j);if(!t)return[];try{const s=JSON.parse(t);return Array.isArray(s)?s:[]}catch{return[]}},setHistory(t){localStorage.setItem(j,JSON.stringify(t))},getMode(){return localStorage.getItem(Y)},setMode(t){localStorage.setItem(Y,t)},getSeed(){const t=localStorage.getItem(O);if(!t)return 0;const s=Number(t);return Number.isFinite(s)?s:0},setSeed(t){localStorage.setItem(O,String(t))},getAnswerIndex(t){const s=localStorage.getItem(K(t)),e=Number(s);return Number.isFinite(e)?e:0},setAnswerIndex(t,s){localStorage.setItem(K(t),String(s))},clearAll(){localStorage.removeItem(j),localStorage.removeItem(O),localStorage.removeItem(Y)},clearAnswerIndices(t){t.forEach(s=>{localStorage.removeItem(K(s))})}};function K(t){return`answer_index_${t}`}class ae{constructor(s){this.state=BigInt(s)}next(){const s=2862933555777941757n,e=3037000493n;return this.state=s*this.state+e&0xffffffffffffffffn,this.state}nextFloat(){const s=this.next();return Number(s%1000000n)/1e6}}function re(t,s){const e=new ae(s),n=[...t];for(let o=n.length-1;o>0;o-=1){const a=Number(e.next()%BigInt(o+1)),r=n[o];n[o]=n[a],n[a]=r}return n}async function ie(t,s){const e=k.find(f=>f.id===t);if(!e)return de(t);const[n,o]=await Promise.all([Z(e.guessFile,e.wordLength,s),Z(e.answerFile,e.wordLength,s)]),a=H[t]??[],r=(n.length?n:a).filter(f=>!z.has(f)),i=(o.length?o:a).filter(f=>!z.has(f)),l=new Set([...r,...i]);return{wordList:r,answerList:i,wordSet:l}}async function Z(t,s,e){const n=`${e}wordlist/${t}.txt`;try{const o=await fetch(n);return o.ok?(await o.text()).split(/\r?\n/).map(r=>r.trim().toLowerCase()).filter(r=>r.length===s&&/^[a-z]+$/.test(r)):[]}catch{return[]}}function de(t){const s=H[t]??[],e=new Set(s);return{wordList:s,answerList:s,wordSet:e}}function W(t){return X(t,"yyyy-MM-dd")}function ce(t){const s=t.getDate(),e=X(t,"MMMM"),n=Math.floor(s%100/10);let o="th";if(n!==1)switch(s%10){case 1:o="st";break;case 2:o="nd";break;case 3:o="rd";break;default:o="th"}return`${s}${o} of ${e}`}function X(t,s){if(s==="yyyy-MM-dd"){const e=t.getFullYear(),n=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0");return`${e}-${n}-${o}`}return s==="MMMM"?t.toLocaleString("en-US",{month:"long"}):s==="LLLL yyyy"?t.toLocaleString("en-US",{month:"long",year:"numeric"}):t.toLocaleDateString("en-US")}function le(){const t=new Date;return{year:t.getFullYear(),month:t.getMonth()+1}}function ue(t){const s=new Date(t.year,t.month-1,1);return X(s,"LLLL yyyy")}function he(t){return new Date(t.year,t.month-1,1)}function fe(t){const s=new Date(t.year,t.month-1,1);return s.setMonth(s.getMonth()-1),{year:s.getFullYear(),month:s.getMonth()+1}}function me(t){const s=new Date(t.year,t.month-1,1);return s.setMonth(s.getMonth()+1),{year:s.getFullYear(),month:s.getMonth()+1}}function ge(t){const e=he(t).getDay(),n=t.year,o=t.month-1,a=new Date(n,o+1,0).getDate(),r=Array.from({length:e},()=>null),i=Array.from({length:a},(l,f)=>new Date(n,o,f+1));return[...r,...i]}function we(t){const s=new Set,e={state:{ui:{isLoading:!0,message:null,guesses:[],currentInput:"",status:x.inProgress,maxGuesses:6,wordLength:5},history:[],currentMode:J,route:"home",splashVisible:!0},wordList:[],answerList:[],wordSet:new Set,answerSequence:[],answer:"",answerIndex:0,randomSeed:12345,subscribe(n){return s.add(n),()=>s.delete(n)},notify(){s.forEach(n=>n(e.state))},async init(){e.loadPersistedState(),await e.setMode(e.state.currentMode,{startGame:!1}),e.state.splashVisible=!0,e.notify(),setTimeout(()=>{e.state.splashVisible=!1,e.notify()},2e3)},async setMode(n,{startGame:o=!0}={}){const a=k.find(r=>r.id===n)??k[0];e.state.currentMode=a.id,L.setMode(a.id),e.state.ui.maxGuesses=a.maxGuesses,e.state.ui.wordLength=a.wordLength,e.answerIndex=L.getAnswerIndex(a.id),await e.loadWords(),o||(e.state.ui.message=null),e.notify()},onKeyInput(n){e.state.ui.status===x.inProgress&&(e.state.ui.currentInput.length>=e.state.ui.wordLength||(e.state.ui.currentInput=(e.state.ui.currentInput+n.toLowerCase()).slice(0,e.state.ui.wordLength),e.notify()))},onDeleteInput(){e.state.ui.status===x.inProgress&&e.state.ui.currentInput.length&&(e.state.ui.message==="Not in the word list."&&(e.state.ui.message=null),e.state.ui.currentInput=e.state.ui.currentInput.slice(0,-1),e.notify())},submitGuess(){const n=e.state.ui.currentInput.toLowerCase();if(e.state.ui.status!==x.inProgress){e.state.ui.message="Start a new game.",e.notify();return}if(n.length!==e.state.ui.wordLength){e.state.ui.message=`Enter a ${e.state.ui.wordLength}-letter word.`,e.notify();return}if(!e.wordSet.has(n)){e.state.ui.message="Not in the word list.",e.notify();return}const o=ye(e.answer,n,e.state.ui.wordLength),a=[...e.state.ui.guesses,{word:n,results:o}];let r=x.inProgress;n===e.answer?r=x.won:a.length>=e.state.ui.maxGuesses&&(r=x.lost);let i="";if(r===x.won?i=`You solved it! The word was ${e.answer.toUpperCase()}.`:r===x.lost&&(i=`Out of guesses. The word was ${e.answer.toUpperCase()}.`),e.state.ui.guesses=a,e.state.ui.status=r,e.state.ui.currentInput="",e.state.ui.message=i,r!==x.inProgress){const l=ve(e.answer,r===x.won,a,e.state.currentMode);e.state.history=[l,...e.state.history],L.setHistory(e.state.history)}e.notify()},startNewGame({clearMessage:n=!1}={}){const o=e.answerSequence.length?e.answerSequence:H[e.state.currentMode]??[];if(o.length)e.answerIndex=e.answerIndex%o.length,e.answer=o[e.answerIndex],e.answerIndex=(e.answerIndex+1)%o.length,L.setAnswerIndex(e.state.currentMode,e.answerIndex);else{const a=H[e.state.currentMode]??["apple"];e.answer=a[Math.floor(Math.random()*a.length)]}e.state.ui.guesses=[],e.state.ui.status=x.inProgress,e.state.ui.currentInput="",e.state.ui.message=n?null:"New game started.",e.notify()},fullReset(){e.state.history=[],L.setHistory([]),e.randomSeed=Date.now(),L.setSeed(e.randomSeed),e.answerIndex=0,L.clearAnswerIndices(k.map(n=>n.id)),e.answerSequence=e.shuffledAnswers(),e.startNewGame({clearMessage:!0}),e.state.ui.message="Fully reset!",e.notify()},computeLetterStates(){const n={};return e.state.ui.guesses.forEach(o=>{[...o.word].forEach((a,r)=>{const i=n[a]??E.unused,l=o.results[r]??E.unused;l>i&&(n[a]=l)})}),n},loadPersistedState(){const n=L.getMode();e.state.currentMode=k.some(r=>r.id===n)?n:J,e.answerIndex=L.getAnswerIndex(e.state.currentMode);const o=L.getSeed();e.randomSeed=o===0?12345:o;const a=L.getHistory();e.state.history=a.map(r=>({...r,mode:r.mode??"classic"})).sort((r,i)=>i.timestamp-r.timestamp)},async loadWords(){e.state.ui.isLoading=!0,e.notify();const n=await ie(e.state.currentMode,t);e.wordList=n.wordList.filter(o=>!z.has(o)),e.answerList=n.answerList.filter(o=>!z.has(o)),e.wordSet=n.wordSet,e.answerSequence=e.shuffledAnswers(),e.answerSequence.length&&(e.answerIndex=e.answerIndex%e.answerSequence.length),e.startNewGame({clearMessage:!0}),e.state.ui.isLoading=!1,e.notify()},shuffledAnswers(){const n=H[e.state.currentMode]??[],o=e.answerList.length?e.answerList:n;return re(o,e.randomSeed)}};return e}function ye(t,s,e){const n=Array.from({length:e},()=>E.absent),o={};[...t].forEach(a=>{o[a]=(o[a]??0)+1});for(let a=0;a<e;a+=1){const r=t[a],i=s[a];r===i&&(n[a]=E.correct,o[i]=(o[i]??0)-1)}for(let a=0;a<e;a+=1){if(n[a]===E.correct)continue;const r=s[a];(o[r]??0)>0&&(n[a]=E.present,o[r]=(o[r]??0)-1)}return n}function ve(t,s,e,n){const o=Date.now();return{timestamp:o,answer:t,won:s,guesses:e.map(a=>a.word),mode:n,dateString:W(new Date(o))}}const d={focusedMenuId:"play",showModePicker:!1,focusedModeId:"mini",showConfirm:!1,resetMessage:null,history:{displayedMonth:le(),selectedDate:new Date,expandedId:null,selectedModes:new Set(k.map(t=>t.id))},stats:{selectedMode:null},about:{focusedId:"a1"},howTo:{focusedId:"h1"}};let F=null;function be({app:t,state:s,store:e}){t.innerHTML=pe(s),Pe({app:t,state:s,store:e}),s.route===m.home&&Ae({app:t,state:s,store:e}),s.route===m.game&&Te({app:t,state:s,store:e}),s.route===m.history&&Ge({app:t,state:s,store:e}),s.route===m.stats&&Ce({app:t,state:s,store:e}),s.route===m.about&&R("about-wheel",{axis:"y",focusFraction:.18,rowHeight:52,onFocus:n=>{d.about.focusedId=n}}),s.route===m.howToPlay&&R("howto-wheel",{axis:"y",focusFraction:.18,rowHeight:52,onFocus:n=>{d.howTo.focusedId=n}}),d.showModePicker&&R("mode-wheel",{axis:"x",focusFraction:.5,rowHeight:140,itemWidth:170,onFocus:n=>{d.focusedModeId=n},onSelect:n=>{const o=k.find(a=>a.id===n);o&&(d.showModePicker=!1,e.setMode(o.id).then(()=>{s.route=m.game,e.notify()}))}}),s.route===m.home&&R("home-wheel",{axis:"y",focusFraction:.5,rowHeight:56,onFocus:n=>{d.focusedMenuId=n}})}function pe(t){const s=t.splashVisible?`
      <div class="splash">
        <div class="splash-title">My Wordle</div>
      </div>
    `:"";return`
    <div class="app-root">
      <section class="screen ${t.route===m.home?"active":""}" data-screen="home">
        ${Me()}
      </section>
      <section class="screen ${t.route===m.game?"active":""}" data-screen="game">
        ${$e(t)}
      </section>
      <section class="screen ${t.route===m.history?"active":""}" data-screen="history">
        ${Le(t)}
      </section>
      <section class="screen ${t.route===m.stats?"active":""}" data-screen="stats">
        ${Ie(t)}
      </section>
      <section class="screen ${t.route===m.about?"active":""}" data-screen="about">
        ${Ee()}
      </section>
      <section class="screen ${t.route===m.howToPlay?"active":""}" data-screen="howTo">
        ${De()}
      </section>
      ${s}
    </div>
  `}function Me(t){const s=d.resetMessage?`<div class="reset-message">${d.resetMessage}</div>`:"",e=d.showConfirm?`
      <div class="reset-confirm">
        <div class="caption">This will erase all progress and restart the word sequence.</div>
        <div class="reset-actions">
          <button class="outline-button" data-action="reset-confirm">Yes</button>
          <button class="outline-button muted" data-action="reset-cancel">No, go back</button>
        </div>
      </div>
    `:`
      <button class="ghost-button" data-action="reset-start">Full Reset</button>
    `,n=d.showModePicker?`
      <div class="mode-overlay">
        <div class="mode-dismiss" data-action="mode-dismiss" data-zone="top"></div>
        <div class="mode-dismiss" data-action="mode-dismiss" data-zone="bottom"></div>
        <div class="mode-wheel" id="mode-wheel" data-focus="${d.focusedModeId}">
          <div class="wheel-track horizontal">
            ${k.map(o=>w(o.label,o.id)).join("")}
          </div>
        </div>
      </div>
    `:"";return`
    <div class="home-screen ${d.showModePicker?"mode-active":""}">
      <div class="home-title">
        <div class="page-title hero">My Wordle</div>
        <div class="subtitle">Designed for Mr. N Sekar</div>
      </div>
      <div class="wheel" id="home-wheel" data-focus="${d.focusedMenuId}">
        <div class="wheel-track vertical">
          ${w("How to Play","howto")}
          ${w("About","about")}
          ${w("Play!","play")}
          ${w("History","history")}
          ${w("Statistics","stats")}
        </div>
      </div>
      <div class="home-footer">
        ${e}
        ${s}
      </div>
      ${n}
    </div>
  `}function $e(t){if(t.ui.isLoading)return'<div class="loading">Loading...</div>';const s=Be(t.ui),e=window.innerWidth>=700&&window.innerHeight>window.innerWidth,n=Se(t,s),o=t.ui.message?`<div class="message ${t.ui.status}">${t.ui.message}</div>`:'<div class="message"></div>';return`
    <div class="game-screen">
      <div class="page-title game">My Wordle</div>
      ${n}
      ${o}
      ${xe(t,e)}
      <div class="bottom-bar">
        <button class="outline-button" data-action="new-game">New Game</button>
        <button class="outline-button muted" data-action="back-home">Back</button>
      </div>
    </div>
  `}function Se(t,s){var n,o;const e=[];for(let a=0;a<t.ui.maxGuesses;a+=1){const r=[];for(let i=0;i<t.ui.wordLength;i+=1){const l=t.ui.guesses[a],f=l?((n=l.word[i])==null?void 0:n.toUpperCase())??"":a===t.ui.guesses.length?((o=t.ui.currentInput[i])==null?void 0:o.toUpperCase())??"":"",h=(l==null?void 0:l.results[i])??E.unused;r.push(`<div class="tile" data-state="${h}" style="width:${s}px;height:${s}px;">${f}</div>`)}e.push(`<div class="board-row">${r.join("")}</div>`)}return`<div class="board">${e.join("")}</div>`}function xe(t,s=!1){const e=t.letterStates??{},o=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"].map(a=>`<div class="keyboard-row">${[...a].map(r=>U(r,e[r.toLowerCase()]??E.unused)).join("")}</div>`).join("");return`
    <div class="keyboard ${s?"large":""}">
      ${o}
      <div class="keyboard-row">
        ${U("⌫",E.unused,"wide","delete")}
        ${U("Submit",E.unused,"extra","submit")}
      </div>
    </div>
  `}function U(t,s,e="normal",n="letter"){return`
    <button class="key ${e}" data-action="${n}" data-letter="${t}" data-state="${s}">
      <span class="key-label">${t}</span>
    </button>
  `}function Le(t){const s=t.history,e=d.history.selectedModes,o=s.filter(h=>e.has(h.mode)).reduce((h,y)=>{const g=y.dateString??W(new Date(y.timestamp));return h[g]=h[g]||[],h[g].push(y),h},{}),a=W(d.history.selectedDate),r=o[a]??[],i=ce(d.history.selectedDate),l=ge(d.history.displayedMonth).map(h=>{if(!h)return'<div class="calendar-cell empty"></div>';const y=W(h),g=!!o[y];return`
        <button class="calendar-cell ${h.toDateString()===d.history.selectedDate.toDateString()?"selected":""} ${g?"has-games":""}" data-date="${y}">
          ${h.getDate()}
        </button>
      `}).join(""),f=r.length?r.map(h=>ke(h,d.history.expandedId===h.timestamp)).join(""):"";return`
    <div class="history-screen">
      <div class="page-title section">History</div>
      <div class="calendar-header">
        <button class="nav-button" data-action="prev-month">‹</button>
        <div class="calendar-title">${ue(d.history.displayedMonth)}</div>
        <button class="nav-button" data-action="next-month">›</button>
      </div>
      <div class="calendar-grid">${l}</div>
      ${ee(Array.from(e))}
      <div class="history-summary">
        ${r.length?`Games played on ${i}`:`No games played on ${i}`}
      </div>
      <div class="history-list">${f}</div>
      <div class="bottom-bar single">
        <button class="outline-button muted" data-action="back-home">Back</button>
      </div>
    </div>
  `}function ke(t,s){const e=s?`<div class="history-guesses">${t.guesses.map(n=>`<span class="guess-pill">${n.toUpperCase()}</span>`).join("")}</div>`:"";return`
    <button class="history-card" data-entry="${t.timestamp}">
      <div class="history-card-row">
        <div class="history-answer">${t.answer.toUpperCase()}</div>
        <div class="history-result ${t.won?"won":"lost"}">${t.won?"Won":"Lost"}</div>
      </div>
      ${e}
    </button>
  `}function Ie(t){const s=d.stats.selectedMode,e=s?t.history.filter(a=>a.mode===s):[],n=!!s;let o='<div class="stats-placeholder">Select a rank to see stats.</div>';if(n)if(!e.length)o='<div class="stats-placeholder">No games yet.</div>';else{const a=e.length,r=e.filter(p=>p.won).length,i=Math.min(Math.max(r/a*100,0),100),l=k.find(p=>p.id===s),f=(l==null?void 0:l.maxGuesses)??6,h=new Map;for(let p=1;p<=f;p+=1)h.set(p,e.filter(M=>M.won&&M.guesses.length===p).length);const y=[...h.values()],g=Math.max(...y,1),I=Math.min(...y),G=[...h.entries()].map(([p,M])=>{const P=g===I?1:(M-I)/(g-I),A=Math.max(M/g,.05)*100,D=He("#0B4C2D","#A7F3D0",P),T=P>.5?"#0F172A":"#FFFFFF";return`
            <div class="histogram-row">
              <div class="histogram-label">${p}</div>
              <div class="histogram-bar" style="--bar-fill:${A}%; --bar-color:${D}; --bar-text:${T};">
                <span>${M}</span>
              </div>
            </div>
          `}).join("");o=`
        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-label">Games Played</div>
            <div class="stats-value">${a}</div>
          </div>
          <div class="stats-card">
            <div class="stats-label">Win Percentage</div>
            <div class="stats-value">${i.toFixed(1)}%</div>
          </div>
        </div>
        <div class="stats-subtitle">Guess Distribution</div>
        <div class="stats-caption">Number of games by guess count</div>
        <div class="histogram">${G}</div>
      `}return`
    <div class="stats-screen ${s?"":"no-selection"}">
      <div class="page-title section">Statistics</div>
      ${ee(s?[s]:[])}
      <div class="stats-body">${o}</div>
      <div class="bottom-bar single">
        <button class="outline-button muted" data-action="back-home">Back</button>
      </div>
    </div>
  `}function Ee(){return`
    <div class="about-screen">
      <div class="page-title section">About</div>
      <div class="wheel small" id="about-wheel" data-focus="${d.about.focusedId}">
        <div class="wheel-track vertical">
          ${w("My Wordle is a word puzzle where you guess the hidden word.","a1")}
          ${w("Four ranks to grow into: Pupil, Scribe, Author, Wordsmith.","a2")}
          ${w("Pupil and Scribe are shorter words. Author and Wordsmith are longer.","a3")}
          ${w("Play offline and let the calendar keep your victories.","a4")}
        </div>
      </div>
      <div class="bottom-bar single">
        <button class="outline-button muted" data-action="back-home">Back</button>
      </div>
    </div>
  `}function De(){return`
    <div class="about-screen">
      <div class="page-title section">How to Play</div>
      <div class="wheel small" id="howto-wheel" data-focus="${d.howTo.focusedId}">
        <div class="wheel-track vertical">
          ${w("Choose a rank, then try to guess the secret word.","h1")}
          ${w("Pupil is 3 letters, Scribe is 4.","h2")}
          ${w("Author is 5 letters, Wordsmith is 6.","h3")}
          ${w("Green => right letter, right spot.","h4")}
          ${w("Yellow => right letter, wrong spot.","h5")}
          ${w("Gray => not in the word.","h6")}
          ${w("Good luck!","h7")}
        </div>
      </div>
      <div class="bottom-bar single">
        <button class="outline-button muted" data-action="back-home">Back</button>
      </div>
    </div>
  `}function w(t,s){return`<button class="wheel-item" data-id="${s}">${t}</button>`}function ee(t){const s=new Set(t);return`
    <div class="mode-toggles">
      ${k.map(e=>`<button class="mode-toggle ${s.has(e.id)?"selected":""}" data-mode="${e.id}">${e.label}</button>`).join("")}
    </div>
  `}function Pe({app:t,state:s,store:e}){t.querySelectorAll("[data-action=back-home]").forEach(n=>{n.addEventListener("click",()=>{s.route=m.home,e.notify()})})}function Ae({app:t,state:s,store:e}){const n=t.querySelector("#home-wheel");n==null||n.addEventListener("click",o=>{const a=o.target.closest(".wheel-item");if(!a)return;const r=a.dataset.id;if(d.focusedMenuId=r,r==="play"){d.focusedModeId=k[0].id,d.showModePicker=!0,e.notify();return}r==="history"?s.route=m.history:r==="stats"?s.route=m.stats:r==="about"?s.route=m.about:r==="howto"&&(s.route=m.howToPlay),e.notify()}),t.querySelectorAll("[data-action=reset-start]").forEach(o=>{o.addEventListener("click",()=>{d.showConfirm=!0,e.notify()})}),t.querySelectorAll("[data-action=reset-cancel]").forEach(o=>{o.addEventListener("click",()=>{d.showConfirm=!1,e.notify()})}),t.querySelectorAll("[data-action=reset-confirm]").forEach(o=>{o.addEventListener("click",()=>{e.fullReset(),d.showConfirm=!1,d.resetMessage="Fully reset!",e.notify()})}),t.querySelectorAll("[data-action=mode-dismiss]").forEach(o=>{o.addEventListener("click",()=>{d.showModePicker=!1,d.focusedMenuId="play",e.notify()})})}function Te({app:t,state:s,store:e}){t.querySelectorAll("[data-action=new-game]").forEach(n=>{n.addEventListener("click",()=>{e.startNewGame({clearMessage:!0})})}),Ne({app:t,store:e,state:s})}function Ge({app:t,state:s,store:e}){t.querySelectorAll("[data-action=prev-month]").forEach(n=>{n.addEventListener("click",()=>{d.history.displayedMonth=fe(d.history.displayedMonth),d.history.selectedDate=new Date(d.history.displayedMonth.year,d.history.displayedMonth.month-1,1),e.notify()})}),t.querySelectorAll("[data-action=next-month]").forEach(n=>{n.addEventListener("click",()=>{d.history.displayedMonth=me(d.history.displayedMonth),d.history.selectedDate=new Date(d.history.displayedMonth.year,d.history.displayedMonth.month-1,1),e.notify()})}),t.querySelectorAll(".calendar-cell[data-date]").forEach(n=>{n.addEventListener("click",()=>{const[o,a,r]=n.dataset.date.split("-").map(Number);d.history.selectedDate=new Date(o,a-1,r),e.notify()})}),t.querySelectorAll(".history-card").forEach(n=>{n.addEventListener("click",()=>{const o=Number(n.dataset.entry);d.history.expandedId=d.history.expandedId===o?null:o,e.notify()})}),t.querySelectorAll(".mode-toggle").forEach(n=>{n.addEventListener("click",()=>{const o=n.dataset.mode;d.history.selectedModes.has(o)?d.history.selectedModes.delete(o):d.history.selectedModes.add(o),e.notify()})})}function Ce({app:t,state:s,store:e}){t.querySelectorAll(".mode-toggle").forEach(n=>{n.addEventListener("click",()=>{const o=n.dataset.mode;d.stats.selectedMode=d.stats.selectedMode===o?null:o,e.notify()})})}function Ne({app:t,store:s,state:e}){const n=t.querySelector(".keyboard");n&&(n.querySelectorAll(".key").forEach(o=>{o.addEventListener("click",()=>{const a=o.dataset.action,r=o.dataset.letter;a==="delete"?s.onDeleteInput():a==="submit"?s.submitGuess():a==="letter"&&s.onKeyInput(r.toLowerCase())})}),F&&window.removeEventListener("keydown",F),F=o=>{if(e.route!==m.game)return;const a=o.key;/^[a-zA-Z]$/.test(a)?s.onKeyInput(a.toLowerCase()):a==="Backspace"?s.onDeleteInput():a==="Enter"&&s.submitGuess()},window.addEventListener("keydown",F))}function R(t,{axis:s,focusFraction:e,rowHeight:n,itemWidth:o,onFocus:a,onSelect:r}={}){const i=document.getElementById(t);if(!i)return;const l=i.querySelector(".wheel-track"),f=Array.from(i.querySelectorAll(".wheel-item")),h=i.dataset.focus,y=()=>{const c=i.getBoundingClientRect();if(l)if(s==="x"){const u=c.width*e,$=Math.max(u-(o??170)/2,0),b=Math.max(c.width-u-(o??170)/2,0);l.style.paddingLeft=`${$}px`,l.style.paddingRight=`${b}px`}else{const u=c.height*e,$=Math.max(u-n/2,0),b=Math.max(c.height-u-n/2,0);l.style.paddingTop=`${$}px`,l.style.paddingBottom=`${b}px`}const v=s==="x"?c.left+c.width*e:c.top+c.height*e;f.forEach(u=>{const $=u.getBoundingClientRect(),b=s==="x"?$.left+$.width/2:$.top+$.height/2,S=Math.abs(b-v),q=Math.max((s==="x"?c.width:c.height)*e+n,n*3),C=Math.min(S/Math.max(q,1),1),_=1-.24*C,oe=1-.6*C,ne=3*C,V=(b-v)/Math.max(q,1)*(s==="x"?-18:18);u.style.transform=s==="x"?`scale(${_}) rotateY(${V}deg)`:`scale(${_}) rotateX(${V}deg)`,u.style.opacity=oe,u.style.filter=`blur(${ne}px)`})},g=(c,v=!1)=>{const u=f.find(S=>S.dataset.id===c);if(!u)return;const $=i.getBoundingClientRect(),b=u.getBoundingClientRect();if(s==="x"){const S=u.offsetLeft+b.width/2-$.width*e;i.scrollTo({left:S,behavior:v?"smooth":"auto"})}else{const S=u.offsetTop+b.height/2-$.height*e;i.scrollTo({top:S,behavior:v?"smooth":"auto"})}};let I=null;const G=()=>{const c=i.getBoundingClientRect(),v=s==="x"?c.left+c.width*e:c.top+c.height*e;let u=null,$=1/0;if(f.forEach(b=>{const S=b.getBoundingClientRect(),q=s==="x"?S.left+S.width/2:S.top+S.height/2,C=Math.abs(q-v);C<$&&($=C,u=b)}),u){const b=u.dataset.id;i.dataset.focus=b,a==null||a(b),g(b,!0)}},p=()=>{I&&clearTimeout(I),I=setTimeout(()=>{G()},150)};i.addEventListener("scroll",()=>{y(),p()}),i.addEventListener("wheel",c=>{c.preventDefault(),s==="x"?i.scrollLeft+=c.deltaY||c.deltaX:i.scrollTop+=c.deltaY||c.deltaX},{passive:!1});let M=!1,P=0,A=0,D=!1,T=null;const B=()=>{M&&(M=!1,i.classList.remove("dragging"),D&&(i.dataset.dragging="true",setTimeout(()=>{i.dataset.dragging="false"},0)),D=!1,T=null)};i.addEventListener("pointerdown",c=>{c.pointerType!=="touch"&&c.button===0&&(M=!0,D=!1,i.classList.add("dragging"),P=s==="x"?c.clientX:c.clientY,A=s==="x"?i.scrollLeft:i.scrollTop,T=c.target.closest(".wheel-item"))}),i.addEventListener("pointermove",c=>{if(!M)return;const u=(s==="x"?c.clientX:c.clientY)-P;Math.abs(u)>4&&(D=!0),s==="x"?i.scrollLeft=A-u:i.scrollTop=A-u}),i.addEventListener("pointerup",c=>{if(M&&!D){const v=c.target.closest(".wheel-item")||T;if(v){const u=v.dataset.id;i.dataset.focus=u,a==null||a(u),r==null||r(u),g(u,!0)}}B()}),i.addEventListener("pointercancel",B),f.forEach(c=>{s==="x"?(c.style.minWidth=`${o??170}px`,c.style.height="100%"):c.style.minHeight=`${n}px`,c.addEventListener("click",()=>{if(i.dataset.dragging==="true")return;const v=c.dataset.id;i.dataset.focus=v,a==null||a(v),r==null||r(v),g(v,!0)})}),new ResizeObserver(()=>{y(),g(i.dataset.focus||h,!1)}).observe(i),y(),g(h,!1),y()}function Be(t){const s=window.innerWidth,e=window.innerHeight,n=16,o=8,a=e<750,r=a?40:44,i=a?40:48,l=a?38:44,f=a?4:6,h=3*l+3*f+l,y=a?54:60,g=12*3,I=e-(r+i+h+y+g+12+20),G=Math.max(t.wordLength,1),p=Math.max(t.maxGuesses,1),M=s-n*2,P=o*Math.max(G-1,0),A=o*Math.max(p-1,0),D=(M-P)/G,T=(I-A)/p,B=s>=700&&e>s;return Math.min(B?82:68,Math.max(B?36:32,Math.min(D,T)))}function He(t,s,e){const o=(h=>Math.min(Math.max(h,0),1))(e),a=Q(t),r=Q(s);if(!a||!r)return t;const i=Math.round(a.r+(r.r-a.r)*o),l=Math.round(a.g+(r.g-a.g)*o),f=Math.round(a.b+(r.b-a.b)*o);return`rgb(${i}, ${l}, ${f})`}function Q(t){const s=t.replace("#","");if(s.length!==6)return null;const e=Number.parseInt(s,16);return{r:e>>16&255,g:e>>8&255,b:e&255}}const te=document.querySelector("#app");if(!te)throw new Error("App container not found");const qe="/wordle/",N=we(qe),Fe=t=>{t.letterStates=N.computeLetterStates(),be({app:te,state:t,store:N})};N.subscribe(Fe);N.init();window.addEventListener("resize",()=>{N.state.route==="game"&&N.notify()});
