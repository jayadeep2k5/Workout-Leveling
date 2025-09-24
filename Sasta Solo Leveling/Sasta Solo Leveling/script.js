const STORAGE_KEYS = {
    profile: 'sl_profile_v1',
    logs: 'sl_logs_v1',
    quests: 'sl_quests_v1',
    inventory: 'sl_inventory_v1',
    leaderboard: 'sl_leaderboard_v1',
    onboarding: 'sl_onboarding_v1'
};

const DEFAULT_PROFILE = {
    level: 1,
    xp: 0,
    nextXp: 100,
    stats: { strength: 5, stamina: 5, agility: 5, intelligence: 5 },
    title: 'Novice Hunter'
};

const TITLE_THRESHOLDS = [
    { level: 1, title: 'Novice Hunter' },
    { level: 3, title: 'Adept Hunter' },
    { level: 6, title: 'Elite Hunter' },
    { level: 10, title: 'S-Rank Contender' },
    { level: 15, title: 'Shadow Monarch' }
];

const BADGE_THRESHOLDS = [
    { level: 2, name: 'First Awakening', note: '+ You felt the surge.' },
    { level: 5, name: 'Dungeon Breaker', note: '+ Obstacles are nothing.' },
    { level: 8, name: 'Mana Infused', note: '+ Flow with power.' },
    { level: 12, name: 'Gate Walker', note: '+ Between worlds.' },
    { level: 15, name: 'Shadow Monarch', note: '+ Lead the legion.' }
];

const QUEST_TEMPLATES = [
    { id: 'q1', text: 'Do 30 push-ups', reward: 30 },
    { id: 'q2', text: 'Run 2 km', reward: 40 },
    { id: 'q3', text: 'Hold plank for 2 minutes', reward: 25 },
    { id: 'q4', text: 'Do 50 squats', reward: 30 },
    { id: 'q5', text: 'Stretch for 5 minutes', reward: 15 }
];

const WORKOUT_XP = {
    pushups: amt => Math.round(amt * 1),
    squats: amt => Math.round(amt * 0.9),
    running: km => Math.round(km * 50),
    plank: min => Math.round(min * 12),
    custom: amt => Math.max(5, Math.round(amt * 1))
};

// State
let profile = load(STORAGE_KEYS.profile) || { ...DEFAULT_PROFILE };
let logs = load(STORAGE_KEYS.logs) || [];
let inventory = load(STORAGE_KEYS.inventory) || [];
let leaderboard = load(STORAGE_KEYS.leaderboard) || [
    { name: 'Jinwoo', level: 7 },
    { name: 'Cha Hae-In', level: 6 },
    { name: 'Yoo Jinho', level: 5 }
];
let questsState = load(STORAGE_KEYS.quests) || generateDailyQuests();
let onboardingState = load(STORAGE_KEYS.onboarding) || { begun:false, day:1 };

// Elements
const levelValue = document.getElementById('level-value');
const xpFill = document.getElementById('xp-fill');
const xpLabel = document.getElementById('xp-label');
const statStr = document.getElementById('stat-str');
const statSta = document.getElementById('stat-sta');
const statAgi = document.getElementById('stat-agi');
const statInt = document.getElementById('stat-int');
const statStrVal = document.getElementById('stat-str-val');
const statStaVal = document.getElementById('stat-sta-val');
const statAgiVal = document.getElementById('stat-agi-val');
const statIntVal = document.getElementById('stat-int-val');
const currentTitle = document.getElementById('current-title');
const badges = document.getElementById('badges');
const logsList = document.getElementById('logs');
const popup = document.getElementById('popup');
const inventoryGrid = document.getElementById('inventory');
const leaderboardList = document.getElementById('leaderboard-list');

// Forms
const workoutForm = document.getElementById('workout-form');
const workoutType = document.getElementById('workout-type');
const workoutAmount = document.getElementById('workout-amount');
const workoutCustomLabel = document.getElementById('custom-label');
const workoutCustomInput = document.getElementById('workout-custom');
const questList = document.getElementById('quest-list');
const resetQuestsBtn = document.getElementById('reset-quests');
const friendForm = document.getElementById('friend-form');
const friendName = document.getElementById('friend-name');
const friendLevel = document.getElementById('friend-level');
const resetAllBtn = document.getElementById('reset-all');

// Pose Detection Elements
const poseDetection = document.getElementById('pose-detection');
const startCameraBtn = document.getElementById('start-camera');
const stopCameraBtn = document.getElementById('stop-camera');
const resetRepsBtn = document.getElementById('reset-reps');
const sessionXpDisplay = document.getElementById('session-xp');
const autoLogBtn = document.getElementById('auto-log-btn');

// Init
renderAll();
attachEvents();
initNavigation();
renderOnboarding();

function attachEvents(){
    // Prevent iOS/Android double-tap zoom on buttons
    document.addEventListener('touchstart', () => {}, { passive: true });
    workoutType.addEventListener('change', () => {
        const isCustom = workoutType.value === 'custom';
        workoutCustomLabel.classList.toggle('hidden', !isCustom);
        
        // Show/hide pose detection for push-ups
        const isPushups = workoutType.value === 'pushups';
        poseDetection.classList.toggle('hidden', !isPushups);
    });
    workoutForm.addEventListener('submit', e => {
        e.preventDefault();
        const type = workoutType.value;
        const amount = Number(workoutAmount.value || 0);
        if(!amount || amount < 1) return;
        let name = type;
        if(type === 'custom'){
            name = (workoutCustomInput.value || 'Custom').slice(0,24);
        }
        const xpGain = (WORKOUT_XP[type] || (()=>0))(amount);
        addLog({ type: name, amount, xp: xpGain, ts: Date.now() });
        addXp(xpGain);
        saveAll();
        renderAll();
    });

    resetQuestsBtn.addEventListener('click', () => {
        questsState = generateDailyQuests(true);
        save(STORAGE_KEYS.quests, questsState);
        renderQuests();
        toast('Daily Quests Refreshed', 'quest');
    });

    friendForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = (friendName.value || '').trim();
        const level = Math.max(1, Number(friendLevel.value || 1));
        if(!name) return;
        leaderboard.push({ name, level });
        save(STORAGE_KEYS.leaderboard, leaderboard);
        friendName.value = '';
        friendLevel.value = '1';
        renderLeaderboard();
    });

    resetAllBtn.addEventListener('click', () => {
        if(confirm('Reset all progress?')){
            profile = { ...DEFAULT_PROFILE };
            logs = [];
            inventory = [];
            leaderboard = [
                { name: 'Jinwoo', level: 7 },
                { name: 'Cha Hae-In', level: 6 },
                { name: 'Yoo Jinho', level: 5 }
            ];
            questsState = generateDailyQuests(true);
            saveAll();
            renderAll();
            toast('Profile Reset', 'quest');
        }
    });

    // Camera control events
    startCameraBtn.addEventListener('click', startCamera);
    stopCameraBtn.addEventListener('click', stopCamera);
    resetRepsBtn.addEventListener('click', resetRepCounter);
    autoLogBtn.addEventListener('click', logSession);
}

function renderAll(){
    renderHeader();
    renderStats();
    renderBadges();
    renderLogs();
    renderQuests();
    renderInventory();
    renderLeaderboard();
}

function initNavigation(){
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const views = Array.from(document.querySelectorAll('.view'));
    function activate(target){
        tabs.forEach(t => t.classList.toggle('active', t.dataset.target === target));
        views.forEach(v => v.classList.toggle('active', v.dataset.view === target));
        save(STORAGE_KEYS.onboarding, onboardingState);
    }
    tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.target)));
    // Default view logic: show onboarding first if not begun, else status
    const defaultView = (!onboardingState.begun ? 'onboarding' : 'status');
    activate(defaultView);
}

function renderOnboarding(){
    const first = document.getElementById('onboard-screen-selected');
    const choice = document.getElementById('onboard-screen-choice');
    const cont = document.getElementById('onboard-continue');
    const yes = document.getElementById('onboard-yes');
    const no = document.getElementById('onboard-no');
    if(!first || !choice || !cont || !yes || !no) return;

    cont.onclick = () => {
        first.classList.add('hidden');
        choice.classList.remove('hidden');
    };
    yes.onclick = () => {
        onboardingState.begun = true;
        save(STORAGE_KEYS.onboarding, onboardingState);
        // Navigate to status view
        document.querySelector('.tab[data-target="status"]').click();
        toast('Welcome, Hunter', 'quest');
    };
    no.onclick = () => {
        toast('Decline the game, and face annihilation.', 'level-up');
    };
}

function getDayOneQuests(){
    if(!onboardingState.dayOne){
        onboardingState.dayOne = [
            { id:'d1a', text:'Do 10 push-ups', reward:10, done:false },
            { id:'d1b', text:'Walk 1 km', reward:20, done:false },
            { id:'d1c', text:'Stretch for 3 minutes', reward:10, done:false }
        ];
        save(STORAGE_KEYS.onboarding, onboardingState);
    }
    return onboardingState.dayOne;
}

function renderHeader(){
    levelValue.textContent = String(profile.level);
    const pct = Math.max(0, Math.min(100, Math.round((profile.xp / profile.nextXp) * 100)));
    xpFill.style.width = pct + '%';
    xpLabel.textContent = `${profile.xp} / ${profile.nextXp} XP`;
}

function renderStats(){
    const maxStat = Math.max(20, ...Object.values(profile.stats));
    const pct = v => Math.round((v / maxStat) * 100);
    statStr.style.width = pct(profile.stats.strength) + '%';
    statSta.style.width = pct(profile.stats.stamina) + '%';
    statAgi.style.width = pct(profile.stats.agility) + '%';
    statInt.style.width = pct(profile.stats.intelligence) + '%';
    statStrVal.textContent = String(profile.stats.strength);
    statStaVal.textContent = String(profile.stats.stamina);
    statAgiVal.textContent = String(profile.stats.agility);
    statIntVal.textContent = String(profile.stats.intelligence);
    currentTitle.textContent = profile.title;
}

function renderBadges(){
    badges.innerHTML = '';
    inventory.filter(i => i.type === 'badge').forEach(b => {
        const el = document.createElement('div');
        el.className = 'badge';
        el.textContent = b.name;
        badges.appendChild(el);
    });
}

function renderLogs(){
    logsList.innerHTML = '';
    logs.slice(-10).reverse().forEach(l => {
        const li = document.createElement('li');
        const left = document.createElement('span');
        left.textContent = `${l.type} × ${l.amount}`;
        const right = document.createElement('span');
        right.textContent = `+${l.xp} XP`;
        li.append(left, right);
        logsList.appendChild(li);
    });
}

function renderQuests(){
    questList.innerHTML = '';
    const today = new Date().toDateString();
    if(questsState.date !== today){
        questsState = generateDailyQuests(true);
        save(STORAGE_KEYS.quests, questsState);
    }
    questsState.quests.forEach(q => {
        const li = document.createElement('li');
        li.className = 'quest-item' + (q.done ? ' complete' : '');
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!q.done;
        cb.addEventListener('change', () => toggleQuest(q.id));
        const span = document.createElement('span');
        span.textContent = q.text;
        const reward = document.createElement('div');
        reward.className = 'quest-reward';
        reward.textContent = `+${q.reward} XP`;
        label.append(cb, span);
        li.append(label, reward);
        questList.appendChild(li);
    });
}

function renderInventory(){
    inventoryGrid.innerHTML = '';
    if(inventory.length === 0){
        const empty = document.createElement('div');
        empty.className = 'inventory-card';
        empty.innerHTML = '<div class="title">Empty</div><div class="note">Earn titles and badges by leveling up.</div>';
        inventoryGrid.appendChild(empty);
        return;
    }
    inventory.forEach(item => {
        const card = document.createElement('div');
        card.className = 'inventory-card';
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = item.name;
        const note = document.createElement('div');
        note.className = 'note';
        note.textContent = item.note || (item.type === 'title' ? 'Unlocked Title' : 'Badge');
        const actions = document.createElement('div');
        const shareBtn = document.createElement('button');
        shareBtn.className = 'btn subtle';
        shareBtn.textContent = 'Share';
        shareBtn.onclick = () => shareBadge(item);
        actions.appendChild(shareBtn);
        card.append(title, note, actions);
        card.append(title, note);
        inventoryGrid.appendChild(card);
    });
}

function renderLeaderboard(){
    leaderboardList.innerHTML = '';
    const combined = [{ name: 'You', level: profile.level }, ...leaderboard];
    combined.sort((a,b) => b.level - a.level);
    combined.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name} — Lv. ${entry.level}`;
        leaderboardList.appendChild(li);
    });
}

function addLog(log){
    logs.push(log);
    save(STORAGE_KEYS.logs, logs);
}

function addXp(amount){
    profile.xp += amount;
    while(profile.xp >= profile.nextXp){
        profile.xp -= profile.nextXp;
        levelUp();
    }
    save(STORAGE_KEYS.profile, profile);
}

function levelUp(){
    profile.level += 1;
    // Increase next threshold: quadratic-ish growth
    profile.nextXp = Math.round(100 * Math.pow(profile.level, 1.6));
    // Stat growth
    profile.stats.strength += 1 + (profile.level % 3 === 0 ? 1 : 0);
    profile.stats.stamina += 1;
    profile.stats.agility += (profile.level % 2 === 0 ? 2 : 1);
    profile.stats.intelligence += (profile.level % 4 === 0 ? 2 : 1);
    // Titles and badges
    updateTitleForLevel();
    grantBadgesForLevel();
    toast(`Level Up! Lv. ${profile.level}`, 'level-up');
}

function updateTitleForLevel(){
    let newTitle = profile.title;
    for(const t of TITLE_THRESHOLDS){
        if(profile.level >= t.level){ newTitle = t.title; }
    }
    if(newTitle !== profile.title){
        profile.title = newTitle;
        inventory.push({ type: 'title', name: newTitle, note: 'Title unlocked' });
        save(STORAGE_KEYS.inventory, inventory);
    }
}

function grantBadgesForLevel(){
    const have = new Set(inventory.filter(i => i.type === 'badge').map(i => i.name));
    BADGE_THRESHOLDS.forEach(b => {
        if(profile.level >= b.level && !have.has(b.name)){
            inventory.push({ type: 'badge', name: b.name, note: b.note });
        }
    });
    save(STORAGE_KEYS.inventory, inventory);
}

async function shareBadge(item){
    const text = `Unlocked: ${item.name} — Solo Leveling Fitness (Lv. ${profile.level})`;
    const shareData = { title: 'Badge Unlocked', text, url: location.href };
    try{
        if(navigator.share){ await navigator.share(shareData); }
        else{
            await navigator.clipboard.writeText(`${text} ${location.href}`);
            toast('Share link copied!', 'quest');
        }
    }catch(e){ /* user cancelled */ }
}

function toggleQuest(id){
    const q = questsState.quests.find(q => q.id === id);
    if(!q || q.done) return;
    q.done = true;
    addXp(q.reward);
    save(STORAGE_KEYS.quests, questsState);
    renderAll();
    toast('Quest Complete!', 'quest');
}

function generateDailyQuests(forceNew=false){
    const today = new Date().toDateString();
    const picks = shuffle([...QUEST_TEMPLATES]).slice(0, 3).map(t => ({ ...t, done:false }));
    if(!forceNew){
        const existing = load(STORAGE_KEYS.quests);
        if(existing && existing.date === today){ return existing; }
    }
    return { date: today, quests: picks };
}

function toast(message, type='level-up'){
    popup.className = 'popup ' + (type === 'quest' ? 'quest' : 'level-up');
    popup.textContent = message;
    popup.classList.remove('hidden');
    popup.animate([
        { transform:'translate(-50%, -20px) scale(0.96)', opacity:0 },
        { transform:'translate(-50%, 0) scale(1)', opacity:1, offset:0.2 },
        { transform:'translate(-50%, -6px) scale(1.02)', opacity:1, offset:0.7 },
        { transform:'translate(-50%, -30px) scale(1.08)', opacity:0 }
    ], { duration: 1600, easing:'cubic-bezier(.2,.8,.2,1)' });
    setTimeout(() => popup.classList.add('hidden'), 1600);
}

function saveAll(){
    save(STORAGE_KEYS.profile, profile);
    save(STORAGE_KEYS.logs, logs);
    save(STORAGE_KEYS.inventory, inventory);
    save(STORAGE_KEYS.leaderboard, leaderboard);
    save(STORAGE_KEYS.quests, questsState);
}

// Utils
function save(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* ignore */ }
}
function load(key){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
        const j = Math.floor(Math.random() * (i+1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Pose Detection for Exercise Counting
let counter = 0;
let sessionCounter = 0;
let sessionXp = 0;
let stage = null;
let cameraActive = false;
let camera = null;
let pose = null;

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.poseLandmarks) {
    // draw landmarks
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                   {color: '#00FF00', lineWidth: 4});
    drawLandmarks(canvasCtx, results.poseLandmarks,
                  {color: '#FF0000', lineWidth: 2});

    // Right arm landmarks
    const shoulder = results.poseLandmarks[12]; // RIGHT_SHOULDER
    const elbow = results.poseLandmarks[14];   // RIGHT_ELBOW
    const wrist = results.poseLandmarks[16];   // RIGHT_WRIST

    const angle = calculateAngle(shoulder, elbow, wrist);

    // Push-up logic
    if (angle > 160) {
      stage = "up";
    }
    if (angle < 90 && stage === 'up') {
      stage = "down";
      counter++;
      sessionCounter++;
      sessionXp += 10;
      
      // Update displays
      document.getElementById("counter").innerText = "Reps: " + sessionCounter;
      sessionXpDisplay.textContent = "Session XP: " + sessionXp;
      
      // Add XP for each push-up using existing system
      addXp(10); // 10 XP per push-up
      saveAll();
      renderAll();
    }
  }
  canvasCtx.restore();
}

// Camera control functions
function startCamera() {
  if (cameraActive) return;
  
  try {
    pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onResults);

    camera = new Camera(videoElement, {
      onFrame: async () => {
        await pose.send({image: videoElement});
      },
      width: 640,
      height: 480
    });
    
    camera.start();
    cameraActive = true;
    
    // Update UI
    startCameraBtn.classList.add('hidden');
    stopCameraBtn.classList.remove('hidden');
    
    toast('Camera started - Begin your push-ups!', 'quest');
  } catch (error) {
    console.error('Error starting camera:', error);
    toast('Failed to start camera', 'level-up');
  }
}

function stopCamera() {
  if (!cameraActive) return;
  
  try {
    if (camera) {
      camera.stop();
      camera = null;
    }
    if (pose) {
      pose.close();
      pose = null;
    }
    
    cameraActive = false;
    
    // Update UI
    startCameraBtn.classList.remove('hidden');
    stopCameraBtn.classList.add('hidden');
    
    toast('Camera stopped', 'quest');
  } catch (error) {
    console.error('Error stopping camera:', error);
  }
}

function resetRepCounter() {
  sessionCounter = 0;
  sessionXp = 0;
  stage = null;
  
  document.getElementById("counter").innerText = "Reps: 0";
  sessionXpDisplay.textContent = "Session XP: 0";
  
  toast('Rep counter reset', 'quest');
}

function logSession() {
  if (sessionCounter > 0) {
    addLog({ 
      type: 'pushups', 
      amount: sessionCounter, 
      xp: sessionXp, 
      ts: Date.now() 
    });
    
    toast(`Logged ${sessionCounter} push-ups for ${sessionXp} XP!`, 'quest');
    resetRepCounter();
    saveAll();
    renderAll();
  } else {
    toast('No reps to log', 'level-up');
  }
}

