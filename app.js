(() => {
  const $ = id => document.getElementById(id);
  const ready = window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes("PASTE_") && !window.SUPABASE_ANON_KEY.includes("PASTE_");
  if (!ready || !window.supabase) {
    $("course").innerHTML = '<option>Konfigurasi Supabase belum diisi</option>';
    $("archives").textContent = "Isi config.js dengan Project URL dan Publishable key untuk mengaktifkan website.";
    return;
  }
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  let selectedGroup = null, currentSession = null;
  async function loadCourses() {
    const {data,error}=await db.from("courses").select("id,name").order("name");
    if(error){$("course").innerHTML='<option>Gagal memuat mata kuliah</option>';return;}
    $("course").innerHTML='<option value="">Pilih mata kuliah</option>'+data.map(x=>`<option value="${x.id}">${escapeHtml(x.name)}</option>`).join("");
    loadArchives();
  }
  async function loadSessions(courseId) {
    $("session").disabled=!courseId;
    $("session").innerHTML='<option value="">Pilih sesi</option>';
    $("groups").innerHTML='<p class="muted">Pilih sesi untuk melihat kelompok.</p>';
    if(!courseId)return;
    const {data,error}=await db.from("sessions").select("id,title,status").eq("course_id",courseId).neq("status","archived").order("created_at",{ascending:false});
    if(error)return;
    $("session").innerHTML+=[...data].map(s=>`<option value="${s.id}" data-status="${s.status}">${escapeHtml(s.title)}${s.status==="open"?"":" (ditutup)"}</option>`).join("");
  }
  async function loadGroups(sessionId) {
    currentSession=sessionId;
    const {data,error}=await db.from("groups").select("id,group_number,group_name,capacity,members(id,name)").eq("session_id",sessionId).order("group_number");
    if(error){$("groups").textContent="Gagal memuat kelompok.";return;}
    const status=$("session").selectedOptions[0]?.dataset.status;
    $("groups").innerHTML=data.map(g=>{
      const members=g.members||[], full=members.length>=g.capacity;
      return `<article class="group-card"><h3>${escapeHtml(g.group_name||("Kelompok "+g.group_number))}</h3><p>${members.length} / ${g.capacity} anggota</p><p>${members.map(m=>escapeHtml(m.name)).join(", ")||"Belum ada anggota"}</p><button data-group="${g.id}" ${full||status!=="open"?"disabled":""}>${full?"Penuh":status==="open"?"Gabung":"Pendaftaran ditutup"}</button></article>`;
    }).join("")||'<p class="muted">Belum ada kelompok pada sesi ini.</p>';
    document.querySelectorAll("[data-group]").forEach(b=>b.addEventListener("click",()=>openJoin(b.dataset.group)));
  }
  function openJoin(groupId){selectedGroup=groupId;$("join-caption").textContent="Masukkan nama sesuai daftar kelas."; $("join-message").textContent="";$("student-name").value="";$("join-dialog").showModal();}
  $("cancel-join").onclick=()=>$("join-dialog").close();
  $("join-form").onsubmit=async e=>{
    e.preventDefault();
    const name=$("student-name").value.trim();
    const {data,error}=await db.rpc("join_group",{p_session_id:currentSession,p_group_id:selectedGroup,p_name:name});
    if(error){$("join-message").textContent="Gagal mendaftar: "+error.message;return;}
    $("join-message").textContent=data?.message||"Selesai.";
    if(data?.success){setTimeout(()=>$("join-dialog").close(),900);loadGroups(currentSession);}
  };
  async function loadArchives(){
    const {data,error}=await db.from("sessions").select("id,title,completed_at,courses(name)").eq("status","archived").order("completed_at",{ascending:false});
    if(error){$("archives").textContent="Arsip belum dapat dimuat.";return;}
    $("archives").innerHTML=data.length?data.map(s=>`<div class="archive-item"><strong>${escapeHtml(s.title)}</strong><div class="muted">${escapeHtml(s.courses?.name||"Mata kuliah")}</div></div>`).join(""):'<p class="muted">Belum ada arsip.</p>';
  }
  $("course").onchange=e=>loadSessions(e.target.value);
  $("session").onchange=e=>e.target.value?loadGroups(e.target.value):$("groups").innerHTML="";
  $("admin-toggle").onclick=()=>$("admin-box").hidden=!$("admin-box").hidden;
  $("login").onclick=async()=>{
    const {error}=await db.auth.signInWithPassword({email:$("admin-email").value,password:$("admin-password").value});
    $("admin-message").textContent=error?error.message:"Login berhasil. Fitur pengelolaan lanjutan dapat ditambahkan di panel admin.";
  };
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  loadCourses();
})();
