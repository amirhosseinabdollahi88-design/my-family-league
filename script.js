// ==================== داده‌های اصلی ====================
let teams = [];          // آرایه‌ای از نام تیم‌ها
let matches = [];        // آرایه‌ای از بازی‌ها (هر بازی یک شیء)

// ==================== کلید localStorage ====================
const STORAGE_KEY = 'familyLeagueData';

// ==================== بارگذاری اولیه از localStorage ====================
function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            teams = data.teams || [];
            matches = data.matches || [];
        } catch (e) {
            console.error('خطا در بارگذاری داده‌ها');
        }
    }
}

// ==================== ذخیره در localStorage ====================
function saveToStorage() {
    const data = { teams, matches };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ==================== رندر تگ‌های تیم‌ها ====================
function renderTeams() {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = '';
    if (teams.length === 0) {
        container.innerHTML = '<div class="empty-msg">هنوز تیمی اضافه نشده است.</div>';
        return;
    }
    teams.forEach((team, index) => {
        const tag = document.createElement('div');
        tag.className = 'team-tag';
        tag.innerHTML = `
            ${team}
            <button onclick="removeTeam(${index})" title="حذف تیم">✕</button>
        `;
        container.appendChild(tag);
    });
}

// ==================== حذف تیم (جهت استفاده در onclick) ====================
window.removeTeam = function(index) {
    if (confirm('آیا مطمئن هستید؟ با حذف تیم، تمام بازی‌های مربوطه نیز پاک می‌شوند.')) {
        const teamName = teams[index];
        teams.splice(index, 1);
        // حذف بازی‌هایی که این تیم در آن حضور دارد
        matches = matches.filter(m => m.home !== teamName && m.away !== teamName);
        saveToStorage();
        renderTeams();
        renderMatches();
        renderStandings();
    }
};

// ==================== اضافه کردن تیم ====================
document.getElementById('addTeamBtn').addEventListener('click', () => {
    const input = document.getElementById('teamNameInput');
    const name = input.value.trim();
    if (name === '') {
        alert('لطفاً نام تیم را وارد کنید.');
        return;
    }
    if (teams.includes(name)) {
        alert('این تیم قبلاً اضافه شده است.');
        return;
    }
    teams.push(name);
    input.value = '';
    saveToStorage();
    renderTeams();
    // پس از تغییر تیم‌ها، جدول و بازی‌ها را دوباره محاسبه می‌کنیم (بازی‌های قبلی ممکن است نامعتبر شوند)
    // بهتر است بازی‌ها ریست شوند چون برنامه قدیمی ممکن است با تیم‌های جدید سازگار نباشد
    if (matches.length > 0) {
        if (confirm('با اضافه کردن تیم جدید، برنامه بازی‌های قبلی پاک می‌شود. می‌خواهید ادامه دهید؟')) {
            matches = [];
            saveToStorage();
        } else {
            // در غیر این صورت تیم اضافه نشود
            teams.pop();
            renderTeams();
            return;
        }
    }
    renderMatches();
    renderStandings();
});

// ==================== تولید برنامه رفت و برگشت ====================
document.getElementById('generateScheduleBtn').addEventListener('click', () => {
    if (teams.length < 2) {
        alert('حداقل به دو تیم نیاز دارید.');
        return;
    }
    // ساخت بازی‌های رفت و برگشت (دور رفت و برگشت)
    const newMatches = [];
    const numTeams = teams.length;
    // دور رفت
    for (let i = 0; i < numTeams; i++) {
        for (let j = i + 1; j < numTeams; j++) {
            newMatches.push({
                id: `match-${i}-${j}-home`,
                home: teams[i],
                away: teams[j],
                homeGoals: null,
                awayGoals: null
            });
        }
    }
    // دور برگشت (با جابه‌جایی خانه و مهمان)
    for (let i = 0; i < numTeams; i++) {
        for (let j = i + 1; j < numTeams; j++) {
            newMatches.push({
                id: `match-${i}-${j}-away`,
                home: teams[j],
                away: teams[i],
                homeGoals: null,
                awayGoals: null
            });
        }
    }
    matches = newMatches;
    saveToStorage();
    renderMatches();
    renderStandings();
});

// ==================== رندر لیست بازی‌ها با امکان ثبت نتیجه ====================
function renderMatches() {
    const container = document.getElementById('matchesList');
    container.innerHTML = '';
    if (matches.length === 0) {
        container.innerHTML = '<div class="empty-msg">برنامه‌ای تولید نشده است. ابتدا تیم‌ها را اضافه کنید و دکمه تولید برنامه را بزنید.</div>';
        return;
    }
    matches.forEach((match, index) => {
        const matchDiv = document.createElement('div');
        matchDiv.className = 'match-item';
        const isFinished = match.homeGoals !== null && match.awayGoals !== null;

        matchDiv.innerHTML = `
            <div class="match-teams">${match.home} 🆚 ${match.away}</div>
            <div class="match-result" data-index="${index}">
                <input type="number" min="0" class="home-goals" value="${match.homeGoals !== null ? match.homeGoals : ''}" placeholder="میزبان">
                <span>-</span>
                <input type="number" min="0" class="away-goals" value="${match.awayGoals !== null ? match.awayGoals : ''}" placeholder="مهمان">
                <button class="save-match-btn" style="background:#10b981;">✅ ثبت</button>
                ${isFinished ? '<button class="edit-match-btn" style="background:#f59e0b;">✏️ ویرایش</button>' : ''}
            </div>
        `;

        container.appendChild(matchDiv);

        // اضافه کردن event listener برای دکمه ثبت
        const saveBtn = matchDiv.querySelector('.save-match-btn');
        const homeInput = matchDiv.querySelector('.home-goals');
        const awayInput = matchDiv.querySelector('.away-goals');

        saveBtn.addEventListener('click', () => {
            const homeGoals = parseInt(homeInput.value);
            const awayGoals = parseInt(awayInput.value);
            if (isNaN(homeGoals) || isNaN(awayGoals) || homeGoals < 0 || awayGoals < 0) {
                alert('لطفاً اعداد معتبر (غیرمنفی) وارد کنید.');
                return;
            }
            // به‌روزرسانی نتیجه در آرایه matches
            matches[index].homeGoals = homeGoals;
            matches[index].awayGoals = awayGoals;
            saveToStorage();
            renderMatches();  // ری‌رندر برای نمایش دکمه ویرایش
            renderStandings();
        });

        // اگر دکمه ویرایش وجود دارد
        const editBtn = matchDiv.querySelector('.edit-match-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // برای ویرایش، دوباره ورودی‌ها فعال می‌شوند (دکمه ثبت هم هست)
                // اما برای سادگی، می‌توانیم نتیجه را null کنیم تا کاربر دوباره ثبت کند
                if (confirm('آیا می‌خواهید نتیجه را پاک کرده و دوباره وارد کنید؟')) {
                    matches[index].homeGoals = null;
                    matches[index].awayGoals = null;
                    saveToStorage();
                    renderMatches();
                    renderStandings();
                }
            });
        }
    });
}

// ==================== محاسبه جدول رده‌بندی ====================
function computeStandings() {
    const standings = {};

    // مقداردهی اولیه برای هر تیم
    teams.forEach(team => {
        standings[team] = {
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
        };
    });

    // پردازش هر بازی که نتیجه دارد
    matches.forEach(match => {
        if (match.homeGoals !== null && match.awayGoals !== null) {
            const home = match.home;
            const away = match.away;
            const hg = match.homeGoals;
            const ag = match.awayGoals;

            standings[home].played++;
            standings[away].played++;

            standings[home].goalsFor += hg;
            standings[home].goalsAgainst += ag;
            standings[away].goalsFor += ag;
            standings[away].goalsAgainst += hg;

            if (hg > ag) {
                // برد میزبان
                standings[home].wins++;
                standings[home].points += 3;
                standings[away].losses++;
            } else if (hg < ag) {
                // برد مهمان
                standings[away].wins++;
                standings[away].points += 3;
                standings[home].losses++;
            } else {
                // مساوی
                standings[home].draws++;
                standings[home].points += 1;
                standings[away].draws++;
                standings[away].points += 1;
            }
        }
    });

    // تبدیل به آرایه و محاسبه تفاضل
    const standingsArray = teams.map(team => {
        const s = standings[team];
        return {
            team,
            ...s,
            diff: s.goalsFor - s.goalsAgainst
        };
    });

    // مرتب‌سازی: اول امتیاز، بعد تفاضل، بعد گل زده
    standingsArray.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.diff !== b.diff) return b.diff - a.diff;
        return b.goalsFor - a.goalsFor;
    });

    return standingsArray;
}

// ==================== رندر جدول رده‌بندی ====================
function renderStandings() {
    const tbody = document.getElementById('standingsBody');
    tbody.innerHTML = '';
    const standings = computeStandings();

    if (standings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-msg">هیچ تیمی ثبت نشده است.</td></tr>';
        return;
    }

    standings.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.team}</td>
            <td>${row.played}</td>
            <td>${row.wins}</td>
            <td>${row.draws}</td>
            <td>${row.losses}</td>
            <td>${row.goalsFor}</td>
            <td>${row.goalsAgainst}</td>
            <td>${row.diff}</td>
            <td><strong>${row.points}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== ریست همه داده‌ها ====================
document.getElementById('resetAllBtn').addEventListener('click', () => {
    if (confirm('همه تیم‌ها و بازی‌ها پاک می‌شوند. ادامه می‌دهید؟')) {
        teams = [];
        matches = [];
        saveToStorage();
        renderTeams();
        renderMatches();
        renderStandings();
    }
});

// ==================== راه‌اندازی اولیه ====================
loadFromStorage();
renderTeams();
renderMatches();
renderStandings();

// ذخیره خودکار هنگام ترک صفحه (اختیاری)
window.addEventListener('beforeunload', () => {
    saveToStorage();
});