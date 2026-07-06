const { test, before, after, beforeEach, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const {
  connect, disconnect, clearDatabase, seedMetadata,
  createUser, tokenFor, addMemorizedPage, daysAgo,
} = require('./helpers');
const app = require('../app');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');

describe('Progress API — spaced repetition', () => {
  before(connect);
  after(disconnect);
  beforeEach(async () => {
    await clearDatabase();
    await seedMetadata(30);
  });

  test('protected progress route returns 401 without a token', async () => {
    const res = await request(app).get('/api/progress/today');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test("new pages fill up to the user's dailyNewPages goal", async () => {

    const user = await createUser({ dailyNewPages: 3, planStartDate: new Date() });

    const res = await request(app)
      .get('/api/progress/today')
      .set('Authorization', `Bearer ${tokenFor(user._id)}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.stats.targetNewPages, 3);
    assert.equal(res.body.data.newPages.length, 3);

    assert.deepEqual(res.body.data.newPages.map(p => p.pageNumber), [1, 2, 3]);
  });

  test('review pages are pulled oldest-reviewed first', async () => {
    const user = await createUser({
      planStartDate: new Date(),
      pauseNewMemorization: true,
      cycleReviewCount: 3,
      recentReviewCount: 0,
    });

    await addMemorizedPage(user._id, 1, { memorizedDate: daysAgo(20), lastReviewedDate: daysAgo(9) });
    await addMemorizedPage(user._id, 2, { memorizedDate: daysAgo(20), lastReviewedDate: daysAgo(8) });
    await addMemorizedPage(user._id, 3, { memorizedDate: daysAgo(20), lastReviewedDate: daysAgo(7) });
    await addMemorizedPage(user._id, 4, { memorizedDate: daysAgo(20), lastReviewedDate: daysAgo(6) });
    await addMemorizedPage(user._id, 5, { memorizedDate: daysAgo(20), lastReviewedDate: daysAgo(5) });

    const res = await request(app)
      .get('/api/progress/today')
      .set('Authorization', `Bearer ${tokenFor(user._id)}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.newPages.length, 0);

    assert.deepEqual(res.body.data.reviewPages.map(p => p.pageNumber), [1, 2, 3]);
  });

  test('a custom cycle start page rotates to the last page then wraps to page 1', async () => {
    const user = await createUser({
      planStartDate: new Date(),
      pauseNewMemorization: true,
      cycleReviewCount: 3,
      recentReviewCount: 0,
      cycleReviewStartPage: 8,
    });
    const auth = `Bearer ${tokenFor(user._id)}`;

    for (let p = 1; p <= 10; p++) {
      await addMemorizedPage(user._id, p, { memorizedDate: daysAgo(50), lastReviewedDate: daysAgo(40) });
    }

    const batchPerDay = [];
    for (let day = 1; day <= 4; day++) {
      const res = await request(app).get('/api/progress/today').set('Authorization', auth);
      assert.equal(res.status, 200);
      const batch = res.body.data.reviewPages.map(p => p.pageNumber);
      batchPerDay.push(batch);
      await UserProgress.updateMany(
        { userId: user._id, pageNumber: { $in: batch } },
        { $set: { lastReviewedDate: daysAgo(40 - day) } }
      );
    }

    assert.deepEqual(batchPerDay[0], [8, 9, 10]);

    assert.deepEqual(batchPerDay[1], [1, 2, 3]);
    assert.deepEqual(batchPerDay[2], [4, 5, 6]);

    assert.deepEqual(batchPerDay[3], [7, 8, 9]);
  });

  test('setting a custom cycle start page forgets old review recency and sweeps from there', async () => {
    const user = await createUser({
      planStartDate: new Date(),
      pauseNewMemorization: true,
      cycleReviewCount: 3,
      recentReviewCount: 0,
    });
    const auth = `Bearer ${tokenFor(user._id)}`;

    for (let p = 1; p <= 10; p++) {
      const lastReviewedDate = p <= 7 ? daysAgo(1) : daysAgo(40);
      await addMemorizedPage(user._id, p, { memorizedDate: daysAgo(50), lastReviewedDate });
    }

    const put = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', auth)
      .send({ cycleReviewStartPage: 5 });
    assert.equal(put.status, 200);

    const res = await request(app).get('/api/progress/today').set('Authorization', auth);
    assert.equal(res.status, 200);

    assert.deepEqual(res.body.data.reviewPages.map(p => p.pageNumber), [5, 6, 7]);

    const stillReviewed = await UserProgress.countDocuments({
      userId: user._id, status: 'memorized', lastReviewedDate: { $ne: null },
    });
    assert.equal(stillReviewed, 0);
  });

  test('the daily review total stays constant as pages are completed', async () => {
    const user = await createUser({
      planStartDate: new Date(),
      pauseNewMemorization: true,
      cycleReviewCount: 3,
      recentReviewCount: 0,
    });
    const auth = `Bearer ${tokenFor(user._id)}`;

    for (let p = 1; p <= 5; p++) {
      await addMemorizedPage(user._id, p, { memorizedDate: daysAgo(20), lastReviewedDate: daysAgo(10 - p) });
    }

    const before = await request(app).get('/api/progress/today').set('Authorization', auth);
    assert.equal(before.status, 200);
    assert.equal(before.body.data.stats.cycleReviewTarget, 3);
    assert.equal(before.body.data.stats.recentReviewTarget, 0);
    assert.equal(before.body.data.stats.dailyReviewTotal, 3);
    const firstPage = before.body.data.reviewPages[0].pageNumber;

    await request(app).post('/api/progress/complete').set('Authorization', auth)
      .send({ pageNumber: firstPage, type: 'review' });

    const after = await request(app).get('/api/progress/today').set('Authorization', auth);
    assert.equal(after.status, 200);
    assert.equal(after.body.data.reviewPages.length, 2);
    assert.equal(after.body.data.stats.dailyReviewTotal, 3);
  });

  test('the recent-review bucket honors a custom count beyond the old day window', async () => {
    const user = await createUser({
      planStartDate: daysAgo(15),
      pauseNewMemorization: true,
      cycleReviewCount: 0,
      recentReviewCount: 8,
    });
    const auth = `Bearer ${tokenFor(user._id)}`;

    for (let p = 1; p <= 10; p++) {
      await addMemorizedPage(user._id, p, { memorizedDate: daysAgo(11 - p), lastReviewedDate: null });
    }

    const res = await request(app).get('/api/progress/today').set('Authorization', auth);
    assert.equal(res.status, 200);

    assert.equal(res.body.data.recentReviewPages.length, 8);
    assert.deepEqual(res.body.data.recentReviewPages.map(p => p.pageNumber), [3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('an off-day returns empty task arrays unless ignoreOffDay is set', async () => {
    const todayUtcDay = new Date().getUTCDay();
    const user = await createUser({
      dailyNewPages: 3,
      planStartDate: new Date(),
      offDays: [todayUtcDay],
    });
    const auth = `Bearer ${tokenFor(user._id)}`;

    const offRes = await request(app).get('/api/progress/today').set('Authorization', auth);
    assert.equal(offRes.status, 200);
    assert.equal(offRes.body.data.isOffDay, true);
    assert.equal(offRes.body.data.newPages.length, 0);
    assert.equal(offRes.body.data.reviewPages.length, 0);

    const onRes = await request(app)
      .get('/api/progress/today?ignoreOffDay=true')
      .set('Authorization', auth);
    assert.equal(onRes.status, 200);
    assert.equal(onRes.body.data.isOffDay, false);
    assert.equal(onRes.body.data.newPages.length, 3);
  });

  test('completing a new page marks it memorized and starts the streak', async () => {
    const user = await createUser({ currentStreak: 0, lastActiveDate: null });

    const res = await request(app)
      .post('/api/progress/complete')
      .set('Authorization', `Bearer ${tokenFor(user._id)}`)
      .send({ pageNumber: 1, type: 'new' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.newStreak, 1);

    const progress = await UserProgress.findOne({ userId: user._id, pageNumber: 1 });
    assert.equal(progress.status, 'memorized');

    const refreshed = await User.findById(user._id);
    assert.equal(refreshed.currentStreak, 1);
  });

  test('completing a review updates lastReviewedDate and review count', async () => {
    const user = await createUser({ planStartDate: new Date() });
    await addMemorizedPage(user._id, 1, { memorizedDate: daysAgo(2), lastReviewedDate: daysAgo(2), reviewCount: 0 });

    const res = await request(app)
      .post('/api/progress/complete')
      .set('Authorization', `Bearer ${tokenFor(user._id)}`)
      .send({ pageNumber: 1, type: 'review' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const progress = await UserProgress.findOne({ userId: user._id, pageNumber: 1 });
    assert.equal(progress.reviewCount, 1);
    const today = new Date().toISOString().split('T')[0];
    assert.equal(progress.lastReviewedDate.toISOString().split('T')[0], today);
  });

  test('uncomplete reverses a new page memorized the same day', async () => {
    const user = await createUser();
    const auth = `Bearer ${tokenFor(user._id)}`;

    await request(app).post('/api/progress/complete').set('Authorization', auth)
      .send({ pageNumber: 1, type: 'new' });

    assert.ok(await UserProgress.findOne({ userId: user._id, pageNumber: 1 }));

    const res = await request(app).post('/api/progress/uncomplete').set('Authorization', auth)
      .send({ pageNumber: 1, type: 'new' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    assert.equal(await UserProgress.findOne({ userId: user._id, pageNumber: 1 }), null);
  });
});
