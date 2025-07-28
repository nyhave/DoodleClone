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
            label.appendChild(document.createTextNode(' ' + opt.value));
            container.appendChild(label);
        });
        document.getElementById('poll-section').classList.remove('hidden');
        document.getElementById('finalize').classList.toggle('hidden', poll.finalized);
        const finalBox = document.getElementById('final-choice');
        if (poll.finalized) {
            finalBox.textContent = 'Final choice: ' + poll.finalChoice;
            finalBox.classList.remove('hidden');
        } else {
            finalBox.classList.add('hidden');
            finalBox.textContent = '';
        }
    }

    function renderSummary(poll) {
        const summary = document.getElementById('summary');
        summary.innerHTML = '<h3>Current votes</h3>';
        poll.options.forEach(opt => {
            const p = document.createElement('p');
            p.textContent = `${opt.value}: ${Object.keys(opt.votes).length} votes`;
            summary.appendChild(p);
        });
        if (poll.finalized) {
            const p = document.createElement('p');
            p.textContent = 'Final choice: ' + poll.finalChoice;
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
        let options = document.getElementById('options').value.split(',').map(o => o.trim()).filter(Boolean);
        const allowMultiple = document.getElementById('allow-multiple').checked;
        options = Array.from(new Set(options));
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
                showMessage('Poll not found on this device.');
            }
        }
    }

    init();
})();
