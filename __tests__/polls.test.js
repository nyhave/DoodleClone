import { setDB, createPoll, getPoll, savePoll, deletePoll, generateId } from '../polls.js';

const fakeData = {};
const fakeDb = {
  collection: () => ({
    doc: (id) => ({
      set: (data) => { fakeData[id] = data; return Promise.resolve(); },
      get: () => Promise.resolve({ exists: !!fakeData[id], data: () => fakeData[id] }),
      delete: () => { delete fakeData[id]; return Promise.resolve(); }
    })
  })
};

describe('poll storage', () => {
  beforeEach(() => {
    localStorage.clear();
    for (const k in fakeData) delete fakeData[k];
    setDB(fakeDb);
  });

  test('generateId returns 8 chars', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
  });

  test('create and fetch poll', async () => {
    const id = await createPoll('t', 'd', ['a'], false, null, null, 'UTC');
    const poll = await getPoll(id);
    expect(poll.title).toBe('t');
    expect(fakeData[id]).toBeDefined();
  });

  test('save and delete poll', async () => {
    const id = await createPoll('x', 'y', ['a'], false, null, null, 'UTC');
    const poll = await getPoll(id);
    poll.title = 'z';
    await savePoll(poll);
    const updated = await getPoll(id);
    expect(updated.title).toBe('z');
    await deletePoll(id);
    const deleted = await getPoll(id);
    expect(deleted).toBeNull();
  });
});

