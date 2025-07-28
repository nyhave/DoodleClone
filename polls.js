export const STORAGE_KEY = 'doodle-polls';
export let db = null;
export function setDB(database) { db = database; }

export function loadPolls() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
}

export function savePolls(polls) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
}

export function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

export async function createPoll(title, description, options, allowMultiple, deadline, reminder, tz) {
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
    if (db) {
        await db.collection('polls').doc(id).set(polls[id]);
    }
    return id;
}

export async function getPoll(id) {
    const polls = loadPolls();
    if (polls[id]) return polls[id];
    if (db) {
        const doc = await db.collection('polls').doc(id).get();
        if (doc.exists) {
            polls[id] = doc.data();
            savePolls(polls);
            return polls[id];
        }
    }
    return null;
}

export async function savePoll(poll) {
    const polls = loadPolls();
    polls[poll.id] = poll;
    savePolls(polls);
    if (db) {
        await db.collection('polls').doc(poll.id).set(poll);
    }
}

export async function deletePoll(id) {
    const polls = loadPolls();
    delete polls[id];
    savePolls(polls);
    if (db) {
        await db.collection('polls').doc(id).delete();
    }
}

