const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "studybuddy_tasks_v1";
const SCORE_KEY = "studybuddy_best_score_v1";
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); if (!Array.isArray(tasks)) tasks = []; } catch { tasks = []; }
let bestScore = Number(localStorage.getItem(SCORE_KEY) || 0);

$("todayDate").textContent = new Intl.DateTimeFormat("en-IN", { weekday:"short", day:"numeric", month:"short" }).format(new Date());

function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); renderTasks(); }
function escapeHTML(value){ return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function renderTasks(){
  const completed = tasks.filter(t=>t.done).length;
  $("completedCount").textContent = completed;
  $("plannedCount").textContent = tasks.length;
  $("bestScore").textContent = bestScore ? `${bestScore}%` : "—";
  const pct = tasks.length ? Math.round(completed/tasks.length*100) : 0;
  $("progressText").textContent = `${pct}% complete`;
  $("progressBar").style.width = `${pct}%`;
  $("clearTasks").classList.toggle("hidden", tasks.length===0);
  const makeRows = (items, emptyText) => items.length ? items.map(t=>`<div class="task-row ${t.done?'done':''}"><input class="task-check" type="checkbox" data-task="${t.id}" ${t.done?'checked':''} aria-label="Mark ${escapeHTML(t.name)} complete"><div class="task-info"><strong>${escapeHTML(t.name)}</strong><small>${escapeHTML(t.subject)}</small></div></div>`).join("") : `<div class="empty-state">${emptyText}</div>`;
  $("taskList").innerHTML = makeRows(tasks, "No tasks yet. Add one small goal above.");
  $("dashboardTasks").innerHTML = makeRows(tasks.slice(0,3), "Your first study task can start here. Add it in the planner.");
}
document.addEventListener("change", e=>{
  if(e.target.matches("[data-task]")){ const t=tasks.find(x=>x.id===e.target.dataset.task); if(t){t.done=e.target.checked;saveTasks();} }
});
$("taskForm").addEventListener("submit", e=>{
  e.preventDefault(); const name=$("taskName").value.trim(); if(!name)return;
  tasks.unshift({id:Date.now().toString(),name,subject:$("taskSubject").value,done:false});
  $("taskName").value=""; saveTasks();
});
$("clearTasks").addEventListener("click",()=>{if(confirm("Remove all study tasks from this browser?")){tasks=[];saveTasks();}});
function showSection(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
  const names={dashboard:"Good to see you! ✦",notes:"Your notes, made clearer.",quiz:"Practice makes progress.",planner:"One step at a time."};
  $("pageTitle").textContent=names[id]||"StudyBuddy AI";
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-section]").forEach(b=>b.addEventListener("click",()=>showSection(b.dataset.section)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showSection(b.dataset.go)));

$("notesInput").addEventListener("input",()=>{$("wordCount").textContent=($("notesInput").value.trim().match(/\S+/g)||[]).length+" words";});
$("summarizeBtn").addEventListener("click",()=>{
  const text=$("notesInput").value.trim(); const out=$("summaryOutput");
  out.classList.remove("hidden");
  if(!text){out.textContent="Please paste your notes first.";return;}
  const sentences=text.match(/[^.!?]+[.!?]?/g)||[text];
  const cleaned=sentences.map(s=>s.trim()).filter(Boolean);
  const keywords=[...new Set((text.toLowerCase().match(/\b[a-z][a-z-]{4,}\b/g)||[]))].filter(w=>!["which","there","their","these","those","about","because","would","could","should","where","while","being","after","before","using","process","important"].includes(w)).slice(0,8);
  const summary=cleaned.length<=3?cleaned.join(" "):cleaned.slice(0,Math.max(2,Math.ceil(cleaned.length*.4))).join(" ");
  out.innerHTML=`<h3>Quick revision summary</h3><p>${escapeHTML(summary)}</p><p><strong>Key terms to review:</strong> ${escapeHTML(keywords.join(", ")||"Review the main terms in your notes.")}</p><small>This is a simple extractive summary, not a full AI-generated explanation.</small>`;
});
function makeQuestions(raw){
  const sentences=(raw.match(/[^.!?]+[.!?]?/g)||[]).map(s=>s.trim()).filter(s=>s.length>25);
  const words=[...new Set((raw.match(/\b[A-Za-z][A-Za-z-]{4,}\b/g)||[]).map(w=>w.toLowerCase()))].filter(w=>!["which","there","their","these","those","about","because","would","could","should","where","while","being","after","before","using","important","process","through","between","another","example"].includes(w));
  if(words.length<2 || sentences.length<1) return [];
  return sentences.slice(0,3).map((s,i)=>{
    const answer=words[i%words.length];
    const distractors=words.filter(w=>w!==answer).slice(i,i+3);
    while(distractors.length<3)distractors.push(["learning","concept","subject"][distractors.length%3]);
    const options=[answer,...distractors.slice(0,3)].sort(()=>Math.random()-.5);
    return {q:`Which key term appears in your notes?`, options, answer, context:s};
  });
}
$("generateQuizBtn").addEventListener("click",()=>{
  const raw=$("quizInput").value.trim(), out=$("quizOutput");out.classList.remove("hidden");
  if(raw.length<35){out.innerHTML="<p>Please enter a few sentences of notes (at least 35 characters).</p>";return;}
  const qs=makeQuestions(raw);
  if(!qs.length){out.innerHTML="<p>Add a little more text with key terms to create practice questions.</p>";return;}
  out.innerHTML=`<form id="quizForm">${qs.map((q,i)=>`<div class="quiz-question"><strong>${i+1}. ${escapeHTML(q.q)}</strong><p class="muted">From your notes: “${escapeHTML(q.context.slice(0,150))}${q.context.length>150?"…":""}”</p>${q.options.map(o=>`<label class="quiz-option"><input type="radio" name="q${i}" value="${escapeHTML(o)}" required> ${escapeHTML(o)}</label>`).join("")}</div>`).join("")}<button class="primary-btn" type="submit">Check my answers</button><div id="quizResult" class="quiz-result hidden"></div></form>`;
  $("quizForm").addEventListener("submit",e=>{
    e.preventDefault();let score=0;
    qs.forEach((q,i)=>{const selected=out.querySelector(`input[name="q${i}"]:checked`);if(selected&&selected.value===q.answer)score++;});
    const pct=Math.round(score/qs.length*100);bestScore=Math.max(bestScore,pct);localStorage.setItem(SCORE_KEY,String(bestScore));renderTasks();
    const result=$("quizResult");result.classList.remove("hidden");result.textContent=`You scored ${score}/${qs.length} (${pct}%). This prototype uses keyword-based practice questions; review your notes to verify each concept.`;
  });
});
renderTasks();