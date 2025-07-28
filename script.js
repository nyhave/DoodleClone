(function() {
    const STORAGE_KEY = 'doodle-polls';

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

    function createPoll(title, description, options) {
        const polls = loadPolls();
        const id = generateId();
        polls[id] = {
            id,
            title,
            description,
            options: options.map(o => ({ value: o, votes: {} })),
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
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + opt.value));
            container.appendChild(label);
        });
        document.getElementById('poll-section').classList.remove('hidden');
    }

    function renderSummary(poll) {
        const summary = document.getElementById('summary');
        summary.innerHTML = '<h3>Current votes</h3>';
        poll.options.forEach(opt => {
            const p = document.createElement('p');
            p.textContent = `${opt.value}: ${Object.keys(opt.votes).length} votes`;
            summary.appendChild(p);
        });
        summary.classList.remove('hidden');
    }

    function showShareLink(id) {
        const share = document.getElementById('share');
        share.innerHTML = `<p>Share this link: <a href="?poll=${id}">${location.href.split('?')[0]}?poll=${id}</a></p>`;
        share.classList.remove('hidden');
    }

    document.getElementById('create-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const desc = document.getElementById('description').value.trim();
        const options = document.getElementById('options').value.split(',').map(o => o.trim()).filter(Boolean);
        if (!title || options.length === 0) return;
        const id = createPoll(title, desc, options);
        history.replaceState({}, '', '?poll=' + id);
        document.getElementById('create-section').classList.add('hidden');
        const poll = getPoll(id);
        renderPoll(poll);
        showShareLink(id);
    });

    document.getElementById('vote-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const pollId = new URLSearchParams(location.search).get('poll');
        const poll = getPoll(pollId);
        const name = document.getElementById('participant').value.trim();
        if (!poll || !name) return;
        const checked = Array.from(document.querySelectorAll('#options-container input:checked')).map(el => parseInt(el.value));
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
        alert('Poll finalized at: ' + best.value);
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
                document.getElementById('finalize').classList.remove('hidden');
                showShareLink(pollId);
            }
        }
    }

    init();
})();
