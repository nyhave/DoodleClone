(function() {
    const STORAGE_KEY = 'doodle-polls';

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

    function createPoll(title, description, options, allowMultiple) {
        const polls = loadPolls();
        const id = generateId();
        polls[id] = {
            id,
            title,
            description,
            options: options.map(o => ({ value: o, votes: {} })),
            allowMultiple,
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

    function renderPoll(poll) {
        document.getElementById('poll-title').textContent = poll.title;
        document.getElementById('poll-desc').textContent = poll.description;
        const container = document.getElementById('options-container');
        container.innerHTML = '';
        poll.options.forEach((opt, i) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = i;
            if (poll.finalized) {
                checkbox.disabled = true;
            }
            label.appendChild(checkbox);
            const text = new Date(opt.value).toLocaleString();
            label.appendChild(document.createTextNode(' ' + text));
            container.appendChild(label);
        });
        document.getElementById('poll-section').classList.remove('hidden');
        document.getElementById('finalize').classList.toggle('hidden', poll.finalized);
        const finalBox = document.getElementById('final-choice');
        if (poll.finalized) {
            finalBox.textContent = 'Final choice: ' + new Date(poll.finalChoice).toLocaleString();
            finalBox.classList.remove('hidden');
        } else {
            finalBox.classList.add('hidden');
            finalBox.textContent = '';
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
            label.textContent = new Date(opt.value).toLocaleString();
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
            p.textContent = 'Final choice: ' + new Date(poll.finalChoice).toLocaleString();
            summary.appendChild(p);
        }
        summary.classList.remove('hidden');
    }

    function showShareLink(id) {
        const share = document.getElementById('share');
        share.innerHTML = `<p>Share this link: <a href="?poll=${id}">${location.href.split('?')[0]}?poll=${id}</a></p>`;
        share.classList.remove('hidden');
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
        if (!title || options.length === 0) {
            showMessage('Please provide a title and at least one unique option.');
            return;
        }
        const id = createPoll(title, desc, options, allowMultiple);
        history.replaceState({}, '', '?poll=' + id);
        document.getElementById('create-section').classList.add('hidden');
        const poll = getPoll(id);
        renderPoll(poll);
        showShareLink(id);
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
        let checked = Array.from(document.querySelectorAll('#options-container input:checked')).map(el => parseInt(el.value));
        if (checked.length === 0) {
            showMessage('Please select at least one option.');
            return;
        }
        if (!poll.allowMultiple) {
            checked = [checked[0]];
        }
        checked.forEach(idx => {
            poll.options[idx].votes[name] = true;
        });
        savePoll(poll);
        renderSummary(poll);
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
    });

    function init() {
        const params = new URLSearchParams(location.search);
        const pollId = params.get('poll');
        if (pollId) {
            document.getElementById('create-section').classList.add('hidden');
            const poll = getPoll(pollId);
            if (poll) {
                renderPoll(poll);
                renderSummary(poll);
                showShareLink(pollId);
            } else {
                showMessage('Poll not found. It may have expired or been created on another device.');
            }
        }
        document.getElementById('add-option').addEventListener('click', () => addOptionRow());
        updateRemoveButtons();
    }

    init();
})();
