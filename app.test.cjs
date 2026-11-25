const test = require('node:test');
const assert = require('node:assert/strict');
const { FOODS, ALL_FOODS, dateKey, validProfile, estimateEnergy, dailyTotal, recommend, cleanState, searchFoods, recordFood, validCustomFood, escapeHtml, validPlanOptions, growthPlan, validCalendarDate } = require('./app.js');
const profile = { height: 165, weight: 55, age: 16, sex: 'female', activity: 'inactive', like: '', avoid: '' };
const record = (id, foodId, date = '2026-11-25') => ({ id, foodId, date });

test('EER follows published female and male equations and rounds once', () => {
  assert.equal(estimateEnergy(profile), 2049);
  assert.equal(estimateEnergy({ ...profile, sex: 'male' }), 2501);
  assert.equal(estimateEnergy({ ...profile, activity: 'active' }), 2420);
  assert.equal(estimateEnergy({ ...profile, sex: 'male', activity: 'very' }), 3224);
});

test('age 13 includes the appropriate growth allowance', () => {
  assert.equal(estimateEnergy({ ...profile, age: 13 }), 2126);
  assert.equal(estimateEnergy({ ...profile, age: 13, sex: 'male' }), 2495);
});

test('all activity coefficients match the reference for both sexes', () => {
  // Expected results independently calculated with Python Decimal from the source table.
  const expected = { female: { inactive: 2049, low: 2284, active: 2420, very: 2744 }, male: { inactive: 2501, low: 2636, active: 2905, very: 3224 } };
  for (const [sex, activities] of Object.entries(expected)) {
    for (const [activity, value] of Object.entries(activities)) {
      assert.equal(estimateEnergy({ ...profile, sex, activity }), value, `${sex} ${activity}`);
    }
  }
});

test('invalid and conflicting profile values are rejected', () => {
  assert.ok(validProfile(profile));
  for (const changes of [{ age: 12 }, { age: 19 }, { age: 16.5 }, { height: 0 }, { weight: NaN }, { sex: '' }, { activity: 'unknown' }, { like: '채소', avoid: '채소' }]) {
    assert.equal(estimateEnergy({ ...profile, ...changes }), null);
  }
});

test('daily totals count duplicates and isolate calendar dates', () => {
  const records = [record('a', 'rice'), record('b', 'rice'), record('c', 'milk', '2026-11-24')];
  assert.equal(dailyTotal(records, '2026-11-25'), 600);
  assert.equal(dailyTotal(records.filter(r => r.id !== 'b'), '2026-11-25'), 300);
  assert.equal(dailyTotal(records, '2026-11-24'), 130);
  assert.equal(dailyTotal(records, '2026-11-23'), 0);
});

test('recommendations respect exclusions, energy and explicit preferences', () => {
  const p = { ...profile, like: '유제품', avoid: '채소' };
  const result = recommend(p, [], 140);
  assert.ok(result.length > 0);
  assert.equal(result[0].category, '유제품');
  assert.ok(result.every(food => food.kcal <= 140 && food.category !== '채소'));
  assert.deepEqual(recommend(p, [], 0), []);
  assert.deepEqual(recommend(p, [], -50), []);
});

test('past choices influence recommendations without a profile', () => {
  const result = recommend(null, [record('a', 'milk'), record('b', 'milk')], null);
  assert.equal(result[0].category, '유제품');
  assert.ok(result.length <= 3);
  assert.ok(recommend(null, [], null).length > 0);
});

test('stored data round-trips and malformed entries are ignored', () => {
  const valid = record('abc-123', 'rice');
  const result = cleanState(JSON.parse(JSON.stringify({ profile, records: [valid] })));
  assert.deepEqual(result, { profile, records: [valid] });
  const dirty = { profile: { height: 165 }, records: [valid, null, record('bad', 'unknown'), record('<script>', 'rice'), record('bad-date', 'rice', '2026-02-30'), record('html', 'rice', '<img>')] };
  assert.deepEqual(cleanState(dirty), { profile: null, records: [valid] });
  assert.deepEqual(cleanState(null), { profile: null, records: [] });
});

test('calendar keys use local date components across year boundaries', () => {
  assert.equal(dateKey(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
  assert.equal(dateKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('sample catalog IDs are unique and nutritional values are nonnegative', () => {
  assert.equal(new Set(ALL_FOODS.map(food => food.id)).size, ALL_FOODS.length);
  assert.ok(FOODS.every(food => food.kcal > 0 && food.protein >= 0));
});

test('typed food lookup handles partial names, spaces and missing foods', () => {
  assert.equal(searchFoods(' 김 밥 ')[0].id, 'gimbap');
  assert.ok(searchFoods('우유').length >= 2);
  assert.ok(searchFoods('라면').some(food => food.id === 'ramen'));
  assert.deepEqual(searchFoods(''), []);
  assert.deepEqual(searchFoods('등록되지않은음식'), []);
});

test('serving changes scale calories and reject invalid quantities', () => {
  assert.equal(recordFood({ foodId: 'gimbap', servings: 0.5 }).kcal, 175);
  assert.equal(recordFood({ foodId: 'gimbap', servings: 2 }).kcal, 700);
  assert.equal(recordFood({ foodId: 'gimbap', servings: 0 }), null);
  assert.equal(recordFood({ foodId: 'gimbap', servings: Infinity }), null);
  assert.equal(recordFood({ foodId: 'gimbap', servings: 21 }), null);
  assert.equal(recordFood({ foodId: 'gimbap', servings: '1' }), null);
});

test('custom food and lookup servings survive storage and count in daily totals', () => {
  const custom = { name: '집밥 볶음밥', portion: '반 공기', kcal: 250 };
  const records = [record('old', 'rice'), { ...record('lookup', 'gimbap'), servings: 0.5 }, { id: 'custom', date: '2026-11-25', custom }];
  const loaded = cleanState(JSON.parse(JSON.stringify({ profile, records })));
  assert.equal(loaded.records.length, 3);
  assert.equal(dailyTotal(loaded.records, '2026-11-25'), 725);
  assert.equal(recordFood(loaded.records[2]).name, custom.name);
  assert.equal(dailyTotal(loaded.records.filter(r => r.id !== 'custom'), '2026-11-25'), 475);
});

test('manual input validates calories and escapes user text before rendering', () => {
  assert.ok(validCustomFood({ name: '물', portion: '1컵', kcal: 0 }));
  for (const custom of [{ name: '  ', portion: '1개', kcal: 1 }, { name: '음식', portion: '', kcal: 1 }, { name: '음식', portion: '1개', kcal: -1 }, { name: '음식', portion: '1개', kcal: 1.5 }]) {
    assert.equal(validCustomFood(custom), false);
  }
  assert.equal(escapeHtml('<img src="x">&'), '&lt;img src=&quot;x&quot;&gt;&amp;');
  assert.equal(cleanState({ records: [{ id: 'bad', date: '2026-11-25', custom: { name: '음식', portion: '1개', kcal: '500' } }] }).records.length, 0);
});

test('optional counseling notes survive reload without changing the energy estimate', () => {
  const planned = { ...profile, desiredWeight: 60, habit: 'regular', reviewDate: '2026-12-10' };
  assert.ok(validPlanOptions(planned));
  const restored = cleanState(JSON.parse(JSON.stringify({ profile: planned, records: [record('a', 'rice')] })));
  assert.deepEqual(restored.profile, planned);
  assert.equal(restored.records.length, 1);
  assert.equal(estimateEnergy(planned), estimateEnergy(profile));
  assert.equal(estimateEnergy({ ...planned, desiredWeight: 40 }), estimateEnergy(profile));
  assert.equal(estimateEnergy({ ...planned, desiredWeight: null }), estimateEnergy(profile));
});

test('invalid new counseling fields do not discard an existing profile or meal records', () => {
  const invalid = { ...profile, desiredWeight: -5, habit: '__proto__', reviewDate: '2026-02-30' };
  assert.equal(validPlanOptions(invalid), false);
  const restored = cleanState({ profile: invalid, records: [record('a', 'rice')] });
  assert.deepEqual(restored.profile, profile);
  assert.equal(dailyTotal(restored.records, '2026-11-25'), 300);
  assert.ok(validPlanOptions(profile));
});

test('plan distinguishes a review date from a weight-change deadline', () => {
  const plan = growthPlan({ ...profile, desiredWeight: 60, habit: 'variety', reviewDate: '2026-12-10' }, '2026-11-25');
  assert.match(plan.desiredWeight, /60 kg · 상담용 메모/);
  assert.equal(plan.habit, '여러 종류의 음식을 골고루 먹기');
  assert.match(plan.review, /2026년 12월 10일/);
  assert.match(plan.review, /체중 도달 예상일이 아니/);
  assert.match(growthPlan(null).desiredWeight, /입력하지 않았/);
  assert.match(growthPlan({ reviewDate: '2026-11-20' }, '2026-11-25').review, /다음 점검 일정/);
});

test('review dates reject impossible dates and support leap days', () => {
  assert.equal(validCalendarDate('2028-02-29'), true);
  assert.equal(validCalendarDate('2026-02-29'), false);
  assert.equal(validCalendarDate('2026-13-01'), false);
  assert.equal(validCalendarDate('<img>'), false);
  assert.equal(validPlanOptions({ desiredWeight: '60' }), false);
  assert.equal(validPlanOptions({ desiredWeight: NaN }), false);
  assert.equal(validPlanOptions({ desiredWeight: null, habit: '', reviewDate: '' }), true);
});
