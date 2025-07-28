(function() {
    const STORAGE_KEY = 'doodle-polls';
    let editingId = null;
    let displayTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

    function loadPolls() {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }

    function savePolls(polls) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
    }

    function generateId() {
        return Math.random().toString(36).substring(2, 10);
    }

    function addOptionRow(value = '') {
        const row = document.createElement('div');
        row.className = 'option-row';
        const input = document.createElement('input');
        input.type = 'datetime-local';
        input.className = 'option-input';
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

    function createPoll(title, description, options, allowMultiple, deadline, reminder, tz) {
        const polls = loadPolls();
        const id = generateId();
        polls[id] = {
            id,
            title,
            description,
            options: options.map(o => ({ value: o, votes: {} })),
            allowMultiple,
            deadline,
            reminder,
            tz,
            finalized: false,
            finalChoice: null
        };
        savePolls(polls);
        return id;
    }

    function getPoll(id) {
        const polls = loadPolls();
        return polls[id];
    }

    function savePoll(poll) {
        const polls = loadPolls();
        polls[poll.id] = poll;
        savePolls(polls);
    }

    function deletePoll(id) {
        const polls = loadPolls();
        delete polls[id];
        savePolls(polls);
    }

    function scheduleReminder(id) {
        const poll = getPoll(id);
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
            countSpan.textContent = ' ' + count;
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

    function showShareLink(id) {
        const share = document.getElementById('share');
        share.innerHTML = `<p>Share this link: <a href="?poll=${id}">${location.href.split('?')[0]}?poll=${id}</a></p>`;
        share.classList.remove('hidden');
    }

    function toIcsDate(iso) {
        return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    function downloadIcs(poll) {
        const start = new Date(poll.finalChoice);
        const end = new Date(start.getTime() + 60 * 60000);
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DoodleClone//EN\nBEGIN:VEVENT\nUID:${poll.id}@doodleclone\nDTSTAMP:${toIcsDate(new Date().toISOString())}\nDTSTART:${toIcsDate(start.toISOString())}\nDTEND:${toIcsDate(end.toISOString())}\nSUMMARY:${poll.title}\nDESCRIPTION:${poll.description}\nEND:VEVENT\nEND:VCALENDAR`;
        const blob = new Blob([ics], { type: 'text/calendar' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (poll.title || 'event') + '.ics';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    document.getElementById('create-form').addEventListener('submit', function(e) {
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
        if (!title || options.length === 0) {
            showMessage('Please provide a title and at least one unique option.');
            return;
        }
        let id = editingId;
        if (editingId) {
            const poll = getPoll(editingId);
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
            savePoll(poll);
            scheduleReminder(poll.id);
        } else {
            id = createPoll(title, desc, options, allowMultiple, deadline, reminder, pollTz);
            scheduleReminder(id);
        }
        history.replaceState({}, '', '?poll=' + id);
        document.getElementById('create-section').classList.add('hidden');
        const poll = getPoll(id);
        renderPoll(poll);
        renderSummary(poll);
        showShareLink(id);
        resetForm();
    });

    document.getElementById('vote-form').addEventListener('submit', function(e) {
        e.preventDefault();
        hideMessage();
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = getPoll(pollId);
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
        savePoll(poll);
        renderSummary(poll);
        showMessage('Vote recorded.');
    });

    document.getElementById('finalize').addEventListener('click', function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = getPoll(pollId);
        if (!poll) return;
        const best = poll.options.reduce((prev, curr) => Object.keys(curr.votes).length > Object.keys(prev.votes).length ? curr : prev);
        poll.finalized = true;
        poll.finalChoice = best.value;
        savePoll(poll);
        renderPoll(poll);
        renderSummary(poll);
        showMessage('Poll finalized.');
    });

    document.getElementById('export-ics').addEventListener('click', function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = getPoll(pollId);
        if (poll && poll.finalized && poll.finalChoice) {
            downloadIcs(poll);
        }
    });

    document.getElementById('edit').addEventListener('click', function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = getPoll(pollId);
        if (!poll || poll.finalized) return;
        populateForm(poll);
        document.getElementById('poll-section').classList.add('hidden');
        document.getElementById('create-section').classList.remove('hidden');
    });

    document.getElementById('delete').addEventListener('click', function() {
        const pollId = new URLSearchParams(location.search).get('poll');
        if (!pollId) return;
        if (!confirm('Delete this poll?')) return;
        deletePoll(pollId);
        history.replaceState({}, '', location.pathname);
        document.getElementById('poll-section').classList.add('hidden');
        document.getElementById('share').classList.add('hidden');
        document.getElementById('create-section').classList.remove('hidden');
        resetForm();
        showMessage('Poll deleted.');
    });

    function init() {
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.body.classList.add('dark');
        }
        document.getElementById('toggle-theme').addEventListener('click', () => {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        });

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        document.querySelectorAll('.tz-note').forEach(el => {
            el.textContent = 'Times shown in your local time zone: ' + tz;
        });
        const params = new URLSearchParams(location.search);
        const pollId = params.get('poll');
        if (pollId) {
            document.getElementById('create-section').classList.add('hidden');
            const poll = getPoll(pollId);
            if (poll) {
                renderPoll(poll);
                renderSummary(poll);
                showShareLink(pollId);
                scheduleReminder(pollId);
            } else {
                showMessage('Poll not found. It may have expired or been created on another device.');
            }
        }
        document.getElementById('add-option').addEventListener('click', () => addOptionRow());
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
    }

    init();
})();
