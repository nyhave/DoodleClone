import { loadPolls, savePolls, generateId, createPoll, getPoll, savePoll, deletePoll, addComment, watchPoll, setDB } from "./polls.js";
const dbInstance = (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length) ? firebase.firestore() : null;
setDB(dbInstance);

let editingId = null;
let displayTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
let currentUser = null;
let lastCommentTs = 0;
let lastVoteCount = 0;
let deferredPrompt = null;

function formatDate(value, tz) {
        try {
            return new Date(value).toLocaleString([], { timeZone: tz });
        } catch (e) {
            return new Date(value).toLocaleString();
        }
    }

    function showMessage(msg) {
        const box = document.getElementById('message');
        box.textContent = msg;
        box.classList.remove('hidden');
    }

function hideMessage() {
    const box = document.getElementById('message');
    box.classList.add('hidden');
    box.textContent = '';
}

function updateAuthUI() {
    const btn = document.getElementById('auth-btn');
    const opts = document.getElementById('sign-in-options');
    const info = document.getElementById('user-info');
    const pic = document.getElementById('user-pic');
    const name = document.getElementById('user-name');
    if (!btn || !firebase || !firebase.auth) return;
    if (currentUser) {
        btn.textContent = 'Sign out';
        if (opts) opts.classList.add('hidden');
        if (info) info.classList.remove('hidden');
        if (name) name.textContent = currentUser.displayName || currentUser.email;
        if (pic) {
            if (currentUser.photoURL) {
                pic.src = currentUser.photoURL;
                pic.classList.remove('hidden');
            } else {
                pic.classList.add('hidden');
            }
        }
    } else {
        btn.textContent = 'Sign in';
        if (opts) opts.classList.remove('hidden');
        if (info) info.classList.add('hidden');
    }
}

function signIn(type = 'google') {
    if (!firebase || !firebase.auth) return;
    let provider;
    if (type === 'github') {
        provider = new firebase.auth.GithubAuthProvider();
        firebase.auth().signInWithPopup(provider);
    } else if (type === 'guest') {
        firebase.auth().signInAnonymously();
    } else {
        provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider);
    }
}

function signOut() {
    if (!firebase || !firebase.auth) return;
    firebase.auth().signOut();
}
    function addOptionRow(value = '') {
        const row = document.createElement('div');
        row.className = 'option-row';
        const input = document.createElement('input');
        input.type = 'datetime-local';
        input.className = 'option-input';
        input.setAttribute("aria-describedby", "tz-note-create");
        input.required = true;
        if (value) {
            const dt = new Date(value);
            input.value = dt.toISOString().slice(0,16);
        }
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-option';
        remove.textContent = '✕';
        remove.addEventListener('click', () => {
            row.remove();
            updateRemoveButtons();
        });
        row.appendChild(input);
        row.appendChild(remove);
        document.getElementById('option-list').appendChild(row);
        updateRemoveButtons();
    }

    function updateRemoveButtons() {
        const rows = document.querySelectorAll('#option-list .option-row');
        rows.forEach(r => {
            const btn = r.querySelector('.remove-option');
            if (btn) btn.classList.toggle('hidden', rows.length === 1);
        });
    }

    function populateForm(poll) {
        document.getElementById('title').value = poll.title;
        document.getElementById('description').value = poll.description;
        document.getElementById('allow-multiple').checked = poll.allowMultiple;
        const list = document.getElementById('option-list');
        list.innerHTML = '';
        poll.options.forEach(opt => addOptionRow(opt.value));
        editingId = poll.id;
        document.querySelector('#create-section h2').textContent = 'Edit Poll';
        document.querySelector('#create-form button[type="submit"]').textContent = 'Save';
    }

function resetForm() {
    document.getElementById('create-form').reset();
    document.getElementById('option-list').innerHTML = '';
    addOptionRow();
    editingId = null;
    document.querySelector('#create-section h2').textContent = 'Create Poll';
    document.querySelector('#create-form button[type="submit"]').textContent = 'Create';
}

function renderPollList() {
    const list = document.getElementById('poll-list');
    if (!list) return;
    const polls = loadPolls();
    const term = (document.getElementById('poll-search')?.value || '').toLowerCase();
    list.innerHTML = '';
    Object.values(polls)
        .sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
        .filter(p => p.title.toLowerCase().includes(term) || (p.description||'').toLowerCase().includes(term))
        .forEach(p => {
        const row = document.createElement('div');
        const title = document.createElement('span');
        title.textContent = p.title;
        const edit = document.createElement('button');
        edit.textContent = 'Edit';
        edit.addEventListener('click', () => {
            populateForm(p);
            document.getElementById('manage-section').classList.add('hidden');
            document.getElementById('create-section').classList.remove('hidden');
        });
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.addEventListener('click', async () => {
            if (confirm('Delete this poll?')) {
                await deletePoll(p.id);
                renderPollList();
            }
        });
        row.appendChild(title);
        row.appendChild(edit);
        row.appendChild(del);
        list.appendChild(row);
    });
}

    async function scheduleReminder(id) {
        const poll = await getPoll(id);
        if (!poll || !poll.deadline || !poll.reminder) return;
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        const ms = new Date(poll.deadline).getTime() - poll.reminder * 60000 - Date.now();
        if (ms <= 0) return;
        setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification('Poll reminder', { body: `Poll "${poll.title}" closes soon.` });
            }
        }, ms);
    }

    function renderPoll(poll) {
        document.getElementById('poll-title').textContent = poll.title;
        document.getElementById('poll-desc').textContent = poll.description;
        document.getElementById('tz-note-view').textContent = `Poll time zone: ${poll.tz}. Displaying in ${displayTz}`;
        const select = document.getElementById('display-tz');
        const tzLabel = document.getElementById('display-tz-label');
        select.innerHTML = '';
        [displayTz, poll.tz].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            if (t === displayTz) opt.selected = true;
            select.appendChild(opt);
        });
        tzLabel.classList.remove('hidden');
        select.onchange = () => {
            displayTz = select.value;
            renderPoll(poll);
            renderSummary(poll);
        };
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        poll.options.forEach((opt, i) => {
            const lbl = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = i;
            if (poll.finalized) {
                checkbox.disabled = true;
            }
            lbl.appendChild(checkbox);
            const text = formatDate(opt.value, displayTz);
            lbl.appendChild(document.createTextNode(' ' + text));
            container.appendChild(lbl);
        });
        document.getElementById('poll-section').classList.remove('hidden');
        document.getElementById('finalize').classList.toggle('hidden', poll.finalized);
        document.getElementById('edit').classList.toggle('hidden', poll.finalized);
        document.getElementById('delete').classList.toggle('hidden', poll.finalized);
        document.getElementById('export-ics').classList.toggle('hidden', !poll.finalized);
        const gcal = document.getElementById('google-calendar');
        if (gcal) {
            gcal.href = googleCalUrl(poll);
            gcal.classList.toggle('hidden', !poll.finalized);
        }
        const feedLink = document.getElementById('calendar-feed');
        if (feedLink) {
            feedLink.href = `${location.origin}/feed/${poll.id}.ics`;
            feedLink.classList.toggle('hidden', !poll.finalized);
        }
        const emailBtn = document.getElementById('email-reminder');
        if (emailBtn) {
            emailBtn.onclick = () => {
                const subject = encodeURIComponent('Poll Reminder: ' + poll.title);
                const body = encodeURIComponent('Please respond to the poll at ' + location.href);
                location.href = `mailto:?subject=${subject}&body=${body}`;
            };
            emailBtn.classList.toggle('hidden', !poll.deadline);
        }
        const finalBox = document.getElementById('final-choice');
        if (poll.finalized) {
            finalBox.textContent = 'Final choice: ' + formatDate(poll.finalChoice, displayTz);
            finalBox.classList.remove('hidden');
        } else {
            finalBox.classList.add('hidden');
            finalBox.textContent = '';
        }
        if (poll.deadline) {
            const end = new Date(poll.deadline).getTime();
            if (Date.now() > end) {
                document.getElementById('vote-form').classList.add('hidden');
                showMessage('Voting closed');
            }
        }
    }

    function renderSummary(poll) {
        const summary = document.getElementById('summary');
        summary.innerHTML = '<h3>Current votes</h3>';
        const counts = poll.options.map(o => Object.keys(o.votes).length);
        const max = Math.max(1, ...counts);
        const total = counts.reduce((s,c) => s + c, 0);
        poll.options.forEach(opt => {
            const row = document.createElement('div');
            row.className = 'summary-row';
            const label = document.createElement('span');
            label.textContent = formatDate(opt.value, displayTz);
            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';
            const bar = document.createElement('div');
            bar.className = 'bar';
            const count = Object.keys(opt.votes).length;
            bar.style.width = (count / max * 100) + '%';
            barContainer.appendChild(bar);
            const countSpan = document.createElement('span');
            const pct = total ? Math.round(count / total * 100) : 0;
            countSpan.textContent = ` ${count} (${pct}%)`;
            row.appendChild(label);
            row.appendChild(barContainer);
            row.appendChild(countSpan);
            summary.appendChild(row);
        });
        if (poll.finalized) {
            const p = document.createElement('p');
            p.textContent = 'Final choice: ' + formatDate(poll.finalChoice, displayTz);
            summary.appendChild(p);
        }
        summary.classList.remove('hidden');

        const participantsEl = document.getElementById('participants');
        const names = Array.from(new Set(poll.options.flatMap(o => Object.keys(o.votes))));
        participantsEl.innerHTML = '<h3>Participants</h3>';
        names.forEach(n => {
            const item = document.createElement('div');
            item.textContent = n;
            if (!poll.finalized) {
                const btn = document.createElement('button');
                btn.textContent = 'Remove';
                btn.addEventListener('click', () => {
                    poll.options.forEach(o => delete o.votes[n]);
                    savePoll(poll);
                    renderSummary(poll);
                });
                item.appendChild(btn);
            }
            participantsEl.appendChild(item);
        });
        participantsEl.classList.toggle('hidden', names.length === 0);
    }

    function renderComments(poll) {
        const container = document.getElementById('comments');
        container.innerHTML = '';
        (poll.comments || []).forEach(c => {
            const div = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = c.name + ': ';
            const text = document.createElement('span');
            text.textContent = c.text;
            div.appendChild(name);
            div.appendChild(text);
            container.appendChild(div);
        });
        container.classList.toggle('hidden', (poll.comments || []).length === 0);
    }

    function showShareLink(id) {
        const share = document.getElementById('share');
        const url = `${location.href.split('?')[0]}?poll=${id}`;
        share.innerHTML = `<p>Share this link: <a href="?poll=${id}">${url}</a></p>`;
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = 'Copy link';
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(url);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
            } catch (e) {}
        });
        share.appendChild(copyBtn);
        share.classList.remove('hidden');
        getPoll(id).then(poll => {
            if (poll && poll.finalized && poll.finalChoice) {
                cacheIcs(poll);
            }
        });
    }

    function toIcsDate(iso) {
        return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    function generateIcs(poll) {
        const start = new Date(poll.finalChoice);
        const dur = parseInt(poll.duration || 60);
        const end = new Date(start.getTime() + dur * 60000);
        const location = poll.location ? `\nLOCATION:${poll.location}` : '';
        return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DoodleClone//EN\nBEGIN:VEVENT\nUID:${poll.id}@doodleclone\nDTSTAMP:${toIcsDate(new Date().toISOString())}\nDTSTART:${toIcsDate(start.toISOString())}\nDTEND:${toIcsDate(end.toISOString())}\nSUMMARY:${poll.title}\nDESCRIPTION:${poll.description}${location}\nEND:VEVENT\nEND:VCALENDAR`;
    }

    function countVotes(poll) {
        return poll.options.reduce((s, o) => s + Object.keys(o.votes).length, 0);
    }

    function downloadIcs(poll) {
        const ics = generateIcs(poll);
        const blob = new Blob([ics], { type: 'text/calendar' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (poll.title || 'event') + '.ics';
        a.click();
        URL.revokeObjectURL(a.href);
        cacheIcs(poll, ics);
    }

    function cacheIcs(poll, ics) {
        if (!('serviceWorker' in navigator)) return;
        if (!ics) ics = generateIcs(poll);
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) {
                reg.active.postMessage({ type: 'cache-ics', id: poll.id, ics });
            }
        });
    }

    function googleCalUrl(poll) {
        const start = new Date(poll.finalChoice);
        const dur = parseInt(poll.duration || 60);
        const end = new Date(start.getTime() + dur * 60000);
        const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const text = '&text=' + encodeURIComponent(poll.title);
        const dates = '&dates=' + toIcsDate(start.toISOString()) + '/' + toIcsDate(end.toISOString());
        const details = '&details=' + encodeURIComponent(poll.description);
        const location = poll.location ? '&location=' + encodeURIComponent(poll.location) : '';
        return base + text + dates + details + location;
    }

    document.getElementById('create-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessage();
        const title = document.getElementById('title').value.trim();
        const desc = document.getElementById('description').value.trim();
        let options = Array.from(document.querySelectorAll('.option-input')).map(i => i.value).filter(Boolean);
        options = options.map(v => new Date(v).toISOString());
        options = Array.from(new Set(options));
        const allowMultiple = document.getElementById('allow-multiple').checked;
        const deadlineInput = document.getElementById('deadline').value;
        const deadline = deadlineInput ? new Date(deadlineInput).toISOString() : null;
        const reminder = parseInt(document.getElementById('reminder').value) || null;
        const pollTz = document.getElementById('poll-tz').value || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const duration = parseInt(document.getElementById('duration').value) || 60;
        const locationVal = document.getElementById('location').value.trim();
        if (!title || options.length === 0) {
            showMessage('Please provide a title and at least one unique option.');
            return;
        }
        let id = editingId;
        if (editingId) {
            const poll = await getPoll(editingId);
            const newOptions = options.map(v => {
                const existing = poll.options.find(o => o.value === v);
                return { value: v, votes: existing ? existing.votes : {} };
            });
            poll.title = title;
            poll.description = desc;
            poll.options = newOptions;
            poll.allowMultiple = allowMultiple;
            poll.deadline = deadline;
            poll.reminder = reminder;
            poll.tz = pollTz;
            poll.duration = duration;
            poll.location = locationVal;
            await savePoll(poll);
            await scheduleReminder(poll.id);
        } else {
            id = await createPoll(title, desc, options, allowMultiple, deadline, reminder, pollTz, duration, locationVal);
            await scheduleReminder(id);
        }
        history.replaceState({}, '', '?poll=' + id);
        document.getElementById('create-section').classList.add('hidden');
        const poll = await getPoll(id);
        renderPoll(poll);
        renderSummary(poll);
        renderComments(poll);
        showShareLink(id);
        resetForm();
    });

    document.getElementById('vote-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessage();
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = await getPoll(pollId);
        const name = document.getElementById('participant').value.trim();
        if (!poll || !name) return;
        if (poll.finalized) {
            showMessage('This poll has been finalized.');
            return;
        }
        if (poll.deadline && Date.now() > new Date(poll.deadline).getTime()) {
            showMessage('Voting closed.');
            return;
        }
        let checked = Array.from(document.querySelectorAll('#options-container input:checked')).map(el => parseInt(el.value));
        if (checked.length === 0) {
            showMessage('Please select at least one option.');
            return;
        }
        if (!poll.allowMultiple) {
            checked = [checked[0]];
        }
        poll.options.forEach(opt => delete opt.votes[name]);
        checked.forEach(idx => {
            poll.options[idx].votes[name] = true;
        });
        await savePoll(poll);
        renderSummary(poll);
        showMessage('Vote recorded.');
    });

    document.getElementById('finalize').addEventListener('click', async function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = await getPoll(pollId);
        if (!poll) return;
        const best = poll.options.reduce((prev, curr) => Object.keys(curr.votes).length > Object.keys(prev.votes).length ? curr : prev);
        poll.finalized = true;
        poll.finalChoice = best.value;
        await savePoll(poll);
        cacheIcs(poll);
        renderPoll(poll);
        renderSummary(poll);
        renderComments(poll);
        showMessage('Poll finalized.');
    });

    document.getElementById('export-ics').addEventListener('click', async function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = await getPoll(pollId);
        if (poll && poll.finalized && poll.finalChoice) {
            downloadIcs(poll);
        }
    });

    document.getElementById('edit').addEventListener('click', async function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = await getPoll(pollId);
        if (!poll || poll.finalized) return;
        populateForm(poll);
        document.getElementById('poll-section').classList.add('hidden');
        document.getElementById('create-section').classList.remove('hidden');
    });

    document.getElementById('delete').addEventListener('click', async function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        if (!pollId) return;
        if (!confirm('Delete this poll?')) return;
        await deletePoll(pollId);
        history.replaceState({}, '', location.pathname);
        document.getElementById('poll-section').classList.add('hidden');
        document.getElementById('share').classList.add('hidden');
        document.getElementById('create-section').classList.remove('hidden');
        resetForm();
        showMessage('Poll deleted.');
    });

    document.getElementById('comment-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const pollId = new URLSearchParams(location.search).get('poll');
        const name = document.getElementById('comment-name').value.trim();
        const text = document.getElementById('comment-text').value.trim();
        if (!pollId || !name || !text) return;
        await addComment(pollId, name, text);
        document.getElementById('comment-text').value = '';
    });

    async function init() {
        const savedTheme = localStorage.getItem('theme') || 'system';
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("service-worker.js");
        }
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            deferredPrompt = e;
            const btn = document.getElementById('install-btn');
            if (btn) btn.classList.remove('hidden');
        });
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                installBtn.classList.add('hidden');
                deferredPrompt = null;
            });
        }
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        function applyTheme(th) {
            if (th === 'dark') {
                document.body.classList.add('dark');
                document.body.classList.remove('contrast');
            } else if (th === 'light') {
                document.body.classList.remove('dark');
                document.body.classList.remove('contrast');
            } else if (th === 'contrast') {
                document.body.classList.add('contrast');
                document.body.classList.remove('dark');
            } else {
                document.body.classList.remove('contrast');
                document.body.classList.toggle('dark', mq.matches);
            }
        }
        applyTheme(savedTheme);
        if (savedTheme === 'system') {
            mq.addEventListener('change', e => {
                if ((localStorage.getItem('theme') || 'system') === 'system') {
                    document.body.classList.toggle('dark', e.matches);
                }
            });
        }
        document.getElementById('toggle-theme').addEventListener('click', () => {
            const order = ['light', 'dark', 'contrast', 'system'];
            let current = localStorage.getItem('theme') || 'system';
            let next = order[(order.indexOf(current) + 1) % order.length];
            localStorage.setItem('theme', next);
            applyTheme(next);
        });

        if (firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                currentUser = user;
                updateAuthUI();
            });
            updateAuthUI();
            const googleBtn = document.getElementById('google-signin');
            if (googleBtn) googleBtn.addEventListener('click', () => signIn('google'));
            const githubBtn = document.getElementById('github-signin');
            if (githubBtn) githubBtn.addEventListener('click', () => signIn('github'));
            const guestBtn = document.getElementById('guest-signin');
            if (guestBtn) guestBtn.addEventListener('click', () => signIn('guest'));
            const authBtn = document.getElementById('auth-btn');
            if (authBtn) {
                authBtn.addEventListener('click', () => {
                    if (currentUser) signOut();
                });
            }
        }

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        document.querySelectorAll('.tz-note').forEach(el => {
            el.textContent = 'Times shown in your local time zone: ' + tz;
        });

        renderPollList();
        const params = new URLSearchParams(location.search);
        const pollId = params.get('poll');
        if (pollId) {
            document.getElementById('create-section').classList.add('hidden');
            watchPoll(pollId, poll => {
                if (poll) {
                    renderPoll(poll);
                    renderSummary(poll);
                    renderComments(poll);
                    const votes = countVotes(poll);
                    if (lastVoteCount && votes > lastVoteCount) {
                        if ('Notification' in window) {
                            if (Notification.permission === 'default') { Notification.requestPermission(); }
                            if (Notification.permission === 'granted') {
                                new Notification('New vote', { body: poll.title });
                            }
                        }
                    }
                    lastVoteCount = votes;
                    if (poll.comments && poll.comments.length) {
                        const latest = Math.max(...poll.comments.map(c => c.ts));
                        if (lastCommentTs && latest > lastCommentTs) {
                            if ('Notification' in window) {
                                if (Notification.permission === 'default') { Notification.requestPermission(); }
                                if (Notification.permission === 'granted') {
                                    new Notification('New comment', { body: poll.title });
                                }
                            }
                        }
                        lastCommentTs = latest;
                    }
                }
            });
            const poll = await getPoll(pollId);
            if (poll) {
                showShareLink(pollId);
                await scheduleReminder(pollId);
                lastVoteCount = countVotes(poll);
                if (poll.comments && poll.comments.length) {
                    lastCommentTs = Math.max(...poll.comments.map(c => c.ts));
                }
            } else {
                showMessage('Poll not found. It may have expired or been created on another device.');
            }
        }
        document.getElementById('add-option').addEventListener('click', () => addOptionRow());
        const nextBtn = document.getElementById('next-week');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const inputs = document.querySelectorAll('.option-input');
                inputs.forEach(inp => {
                    if (inp.value) {
                        const dt = new Date(inp.value);
                        dt.setDate(dt.getDate() + 7);
                        addOptionRow(dt.toISOString());
                    }
                });
            });
        }

        const showManage = document.getElementById('show-manage');
        if (showManage) {
            showManage.addEventListener('click', () => {
                document.getElementById('create-section').classList.add('hidden');
                document.getElementById('poll-section').classList.add('hidden');
                document.getElementById('share').classList.add('hidden');
                document.getElementById('manage-section').classList.remove('hidden');
                renderPollList();
            });
        }
        const searchBox = document.getElementById('poll-search');
        if (searchBox) {
            searchBox.addEventListener('input', renderPollList);
        }
        const backBtn = document.getElementById('back-to-create');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                document.getElementById('manage-section').classList.add('hidden');
                document.getElementById('create-section').classList.remove('hidden');
            });
        }
        updateRemoveButtons();

        if ('vibrate' in navigator) {
            document.addEventListener('click', e => {
                if (e.target.closest('button') && window.matchMedia('(max-width: 480px)').matches) {
                    navigator.vibrate(30);
                }
            });
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'n' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                document.getElementById('add-option').click();
            }
            if (e.key === 'd' && e.ctrlKey) {
                document.getElementById('toggle-theme').click();
            }
        });

        let startX = 0;
        let startY = 0;
        document.addEventListener('touchstart', e => {
            if (!window.matchMedia('(max-width: 480px)').matches) return;
            const t = e.changedTouches[0];
            startX = t.clientX;
            startY = t.clientY;
        }, { passive: true });
        document.addEventListener('touchend', e => {
            if (!window.matchMedia('(max-width: 480px)').matches) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                const section = document.getElementById('poll-section');
                if (dx < 0) {
                    section.classList.add('show-summary');
                } else {
                    section.classList.remove('show-summary');
                }
            }
        }, { passive: true });
    }


export { init, formatDate, toIcsDate };
