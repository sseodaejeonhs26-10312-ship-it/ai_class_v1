/* Buildless browser app. Pure functions are also exported for Node's built-in tests. */
(function () {
  'use strict';

  const STORAGE_KEY = 'hankkion-v1';
  const CATEGORIES = ['밥·면', '고기·달걀', '채소', '과일', '유제품', '과자·빵'];
  const HABITS = {
    regular: '끼니를 거르지 않고 규칙적으로 먹기',
    variety: '여러 종류의 음식을 골고루 먹기',
    signals: '배고픔과 포만감을 살피며 먹기'
  };
  // All portions, calories and protein values below are illustrative sample data.
  const FOODS = [
    { id: 'rice', name: '잡곡밥', emoji: '🍚', kcal: 300, protein: 6, category: '밥·면', source: 'lunch', portion: '1공기' },
    { id: 'chicken', name: '닭고기구이', emoji: '🍗', kcal: 220, protein: 25, category: '고기·달걀', source: 'lunch', portion: '1접시' },
    { id: 'soup', name: '채소된장국', emoji: '🥣', kcal: 70, protein: 4, category: '채소', source: 'lunch', portion: '1그릇' },
    { id: 'salad', name: '채소샐러드', emoji: '🥗', kcal: 80, protein: 2, category: '채소', source: 'lunch', portion: '1접시' },
    { id: 'egg', name: '달걀말이', emoji: '🥚', kcal: 160, protein: 11, category: '고기·달걀', source: 'lunch', portion: '3조각' },
    { id: 'apple', name: '사과', emoji: '🍎', kcal: 90, protein: 0, category: '과일', source: 'lunch', portion: '1개' },
    { id: 'milk', name: '흰 우유', emoji: '🥛', kcal: 130, protein: 6, category: '유제품', source: 'store', portion: '200mL' },
    { id: 'yogurt', name: '플레인 요거트', emoji: '🥄', kcal: 100, protein: 5, category: '유제품', source: 'store', portion: '1컵' },
    { id: 'banana', name: '바나나', emoji: '🍌', kcal: 100, protein: 1, category: '과일', source: 'store', portion: '1개' },
    { id: 'sandwich', name: '달걀 샌드위치', emoji: '🥪', kcal: 320, protein: 13, category: '과자·빵', source: 'store', portion: '1팩' },
    { id: 'chips', name: '감자칩', emoji: '🥔', kcal: 340, protein: 3, category: '과자·빵', source: 'store', portion: '1봉지' },
    { id: 'noodles', name: '컵라면', emoji: '🍜', kcal: 460, protein: 9, category: '밥·면', source: 'store', portion: '1개' }
  ];
  // Additional lookup examples. These are demonstration values, not a live nutrition DB.
  const SEARCH_FOODS = [
    ['gimbap', '김밥', '🍙', 350, '밥·면', '1줄'],
    ['tteokbokki', '떡볶이', '🍲', 450, '밥·면', '1접시'],
    ['bibimbap', '비빔밥', '🍚', 550, '밥·면', '1그릇'],
    ['fried-rice', '볶음밥', '🍚', 600, '밥·면', '1그릇'],
    ['white-rice', '흰쌀밥', '🍚', 310, '밥·면', '1공기'],
    ['ramen', '라면', '🍜', 500, '밥·면', '1그릇'],
    ['udon', '우동', '🍜', 420, '밥·면', '1그릇'],
    ['pasta', '토마토 스파게티', '🍝', 600, '밥·면', '1접시'],
    ['pizza', '피자', '🍕', 280, '과자·빵', '1조각'],
    ['burger', '햄버거', '🍔', 500, '과자·빵', '1개'],
    ['bread', '식빵', '🍞', 100, '과자·빵', '1장'],
    ['sweet-bread', '단팥빵', '🥯', 280, '과자·빵', '1개'],
    ['fried-chicken', '프라이드 치킨', '🍗', 250, '고기·달걀', '1조각'],
    ['pork-cutlet', '돈가스', '🍽️', 600, '고기·달걀', '1접시'],
    ['boiled-egg', '삶은 달걀', '🥚', 75, '고기·달걀', '1개'],
    ['bulgogi', '불고기', '🥩', 300, '고기·달걀', '1접시'],
    ['orange', '귤', '🍊', 40, '과일', '1개'],
    ['strawberry', '딸기', '🍓', 30, '과일', '5개'],
    ['sweet-potato', '고구마', '🍠', 130, '채소', '100g'],
    ['chocolate-milk', '초코우유', '🥛', 160, '유제품', '200mL']
  ].map(([id, name, emoji, kcal, category, portion]) => ({ id, name, emoji, kcal, category, portion, source: 'lookup' }));
  const ALL_FOODS = [...FOODS, ...SEARCH_FOODS];
  const FOOD_BY_ID = new Map(ALL_FOODS.map(food => [food.id, food]));

  function searchFoods(query) {
    const normalize = value => value.replace(/\s+/g, '').toLowerCase();
    const term = normalize(query.trim());
    if (!term) return [];
    return ALL_FOODS.filter(food => normalize(food.name).includes(term)).slice(0, 12);
  }

  function validCustomFood(food) {
    return !!food && typeof food.name === 'string' && food.name.trim().length > 0 && food.name.length <= 60 &&
      typeof food.portion === 'string' && food.portion.trim().length > 0 && food.portion.length <= 40 &&
      Number.isInteger(food.kcal) && food.kcal >= 0 && food.kcal <= 20000;
  }

  function recordFood(record) {
    if (!record) return null;
    if (record.custom !== undefined) {
      return validCustomFood(record.custom) ? { ...record.custom, emoji: '🍽️', category: '직접 입력' } : null;
    }
    const food = FOOD_BY_ID.get(record.foodId);
    const servings = record.servings === undefined ? 1 : record.servings;
    if (!food || !Number.isFinite(servings) || servings < 0.1 || servings > 20) return null;
    return { ...food, kcal: Math.round(food.kcal * servings), portion: servings === 1 ? food.portion : `${food.portion} × ${servings}` };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function validProfile(p) {
    return !!p && Number.isFinite(p.height) && p.height >= 100 && p.height <= 230 &&
      Number.isFinite(p.weight) && p.weight >= 20 && p.weight <= 250 &&
      Number.isInteger(p.age) && p.age >= 13 && p.age <= 18 &&
      ['male', 'female'].includes(p.sex) && ['inactive', 'low', 'active', 'very'].includes(p.activity) &&
      ['', ...CATEGORIES].includes(p.like) && ['', ...CATEGORIES].includes(p.avoid) &&
      (!p.like || p.like !== p.avoid);
  }

  function validCalendarDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      dateKey(new Date(`${value}T12:00:00`)) === value;
  }

  function validDesiredWeight(value) {
    return value === undefined || value === null || (Number.isFinite(value) && value >= 1 && value <= 500);
  }

  function validPlanOptions(profile) {
    return !!profile && validDesiredWeight(profile.desiredWeight) &&
      (profile.reviewDate === undefined || profile.reviewDate === '' || validCalendarDate(profile.reviewDate)) &&
      (profile.habit === undefined || profile.habit === '' || Object.hasOwn(HABITS, profile.habit));
  }

  function cleanProfile(profile) {
    if (!validProfile(profile)) return null;
    const result = { ...profile };
    // New optional fields must not invalidate a previously saved profile or its energy estimate.
    if (!validDesiredWeight(result.desiredWeight)) delete result.desiredWeight;
    if (result.reviewDate !== undefined && result.reviewDate !== '' && !validCalendarDate(result.reviewDate)) delete result.reviewDate;
    if (result.habit !== undefined && result.habit !== '' && !Object.hasOwn(HABITS, result.habit)) delete result.habit;
    return result;
  }

  function growthPlan(profile, today = dateKey()) {
    const weight = profile?.desiredWeight;
    const desiredWeight = validDesiredWeight(weight) && weight != null ? `${weight.toLocaleString('ko-KR')} kg · 상담용 메모입니다. 적절한 목표인지는 성장 경과를 살펴 함께 확인해 주세요.` : '입력하지 않았어요. 숫자를 정하지 않아도 사용할 수 있어요.';
    const habit = profile?.habit && Object.hasOwn(HABITS, profile.habit) ? HABITS[profile.habit] : '작게 시작할 수 있는 습관을 프로필에서 선택해 보세요.';
    const reviewDate = profile?.reviewDate;
    let review = '상담 날짜를 정하면 여기에 표시해요. 알림은 전송하지 않아요.';
    if (validCalendarDate(reviewDate)) {
      const formatted = reviewDate.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1년 $2월 $3일');
      review = reviewDate < today ? `기록한 상담일: ${formatted}. 다음 점검 일정을 함께 정해 보세요.` : `다음 상담: ${formatted}. 이 날짜는 체중 도달 예상일이 아니에요.`;
    }
    return { desiredWeight, habit, review };
  }

  function estimateEnergy(p) {
    if (!validProfile(p)) return null;
    // Health Canada DRI EER, ages 13–18. Coefficients: constant, age, cm, kg.
    // https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html
    const equations = {
      male: { inactive: [-447.51, 3.68, 13.01, 13.15], low: [19.12, 3.68, 8.62, 20.28], active: [-388.19, 3.68, 12.66, 20.46], very: [-671.75, 3.68, 15.38, 23.25] },
      female: { inactive: [55.59, -22.25, 8.43, 17.07], low: [-297.54, -22.25, 12.77, 14.73], active: [-189.55, -22.25, 11.74, 18.34], very: [-709.59, -22.25, 18.22, 14.25] }
    };
    const [base, age, height, weight] = equations[p.sex][p.activity];
    const growth = p.age < 14 ? (p.sex === 'male' ? 25 : 30) : 20;
    return Math.round(base + age * p.age + height * p.height + weight * p.weight + growth);
  }

  function dailyTotal(records, day) {
    return records.filter(record => record.date === day).reduce((sum, record) => sum + (recordFood(record)?.kcal || 0), 0);
  }

  function recommend(profile, records, remaining) {
    const counts = {};
    for (const record of records) {
      const food = recordFood(record);
      if (food) counts[food.category] = (counts[food.category] || 0) + 1;
    }
    return FOODS.filter(food => food.category !== profile?.avoid && (remaining === null || food.kcal <= remaining))
      .map(food => ({ ...food, score: (food.category === profile?.like ? 10 : 0) + Math.min(counts[food.category] || 0, 5) + (food.protein >= 5 ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || a.kcal - b.kcal).slice(0, 3);
  }

  function cleanState(raw) {
    return {
      profile: cleanProfile(raw?.profile),
      records: Array.isArray(raw?.records) ? raw.records.filter(r => r &&
        typeof r.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(r.id) &&
        validCalendarDate(r.date) && recordFood(r) !== null) : []
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FOODS, ALL_FOODS, dateKey, validProfile, estimateEnergy, dailyTotal, recommend, cleanState, searchFoods, validCustomFood, recordFood, escapeHtml, validPlanOptions, growthPlan, validCalendarDate };
  }
  if (typeof document === 'undefined') return;

  const $ = id => document.getElementById(id);
  const form = $('profile-form');
  const number = n => n.toLocaleString('ko-KR');
  let state = { profile: null, records: [] };
  let activeSource = 'lunch';
  let currentDay = dateKey();
  let toastTimer;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = cleanState(JSON.parse(saved));
  } catch {
    $('storage-warning').hidden = false;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      $('storage-warning').hidden = true;
    } catch {
      $('storage-warning').hidden = false;
    }
  }

  function notify(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2600);
  }

  for (const name of ['like', 'avoid']) {
    for (const category of CATEGORIES) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      $(name).append(option);
    }
  }
  if (state.profile) {
    for (const [key, value] of Object.entries(state.profile)) {
      if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value;
    }
  }

  function foodButton(food, reason = '') {
    // Only static catalog values and fixed reason strings enter this markup.
    return `<button type="button" class="food" data-food="${food.id}" aria-label="${food.name} ${food.portion}, ${food.kcal} kcal 기록"><span class="food-emoji" aria-hidden="true">${food.emoji}</span><span class="food-name">${food.name}</span><span class="food-info">${food.portion} · ${food.kcal} kcal</span>${reason ? `<span class="reason">${reason}</span>` : `<span class="food-info">단백질 ${food.protein}g · 예시</span>`}</button>`;
  }

  function renderSearch() {
    const query = $('food-search').value;
    const quantity = $('food-servings');
    const servings = quantity.valueAsNumber;
    const matches = searchFoods(query);
    const validQuantity = quantity.validity.valid && Number.isFinite(servings);
    $('search-status').textContent = !query.trim() ? '음식 이름을 입력해 주세요. 예시 음식 32개를 검색할 수 있어요.' : !validQuantity ? '먹은 양을 0.1~20인분 사이로 입력해 주세요.' : matches.length ? `${matches.length}개 결과 · 입력한 양의 열량을 표시해요.` : '등록된 예시 음식이 없어요. 아래에서 음식 이름과 열량을 직접 추가해 주세요.';
    $('search-results').innerHTML = validQuantity ? matches.map(food => `<button type="button" class="food" data-search-food="${food.id}"><span class="food-emoji" aria-hidden="true">${food.emoji}</span><span class="food-name">${food.name}</span><span class="food-info">기준: ${food.portion} · ${food.kcal} kcal</span><strong class="search-result-total">${number(Math.round(food.kcal * servings))} kcal</strong><span class="food-info">${servings}인분 · 눌러서 기록</span></button>`).join('') : '';
    if (query.trim() && !matches.length) $('custom-food-form').elements.foodName.value = query.trim();
  }

  function addRecord(data) {
    const record = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, date: dateKey(), ...data };
    const food = recordFood(record);
    if (!food) return;
    state.records.push(record);
    save();
    render();
    notify(`${food.name} ${food.portion} · ${number(food.kcal)} kcal 기록을 추가했어요.`);
  }

  function readProfileForm() {
    const values = Object.fromEntries(new FormData(form));
    return { ...values, height: Number(values.height), weight: Number(values.weight), age: Number(values.age), desiredWeight: values.desiredWeight.trim() === '' ? null : Number(values.desiredWeight) };
  }

  function renderGrowthPlan(profile, preview = false) {
    const plan = growthPlan(profile);
    $('desired-weight-summary').textContent = plan.desiredWeight;
    $('habit-summary').textContent = plan.habit;
    $('review-summary').textContent = plan.review;
    $('plan-status').textContent = preview ? '입력 미리보기 · 프로필 저장을 눌러야 이 브라우저에 저장돼요.' : profile ? '저장한 상담 메모와 식사 습관이에요.' : '프로필을 저장하면 상담할 내용을 여기에 모아 보여드려요.';
  }

  function render() {
    currentDay = dateKey();
    renderGrowthPlan(state.profile);
    const total = dailyTotal(state.records, currentDay);
    const target = estimateEnergy(state.profile);
    const remaining = target === null ? null : target - total;
    const todaysRecords = state.records.filter(record => record.date === currentDay);
    $('today').textContent = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    $('today').dateTime = currentDay;
    $('total').innerHTML = `${number(total)} <small>kcal</small>`;
    $('target').innerHTML = target === null ? '—' : `${number(target)} <small>kcal</small>`;
    $('remaining').innerHTML = remaining === null ? '—' : `${number(Math.abs(remaining))} <small>kcal</small>`;
    $('difference-label').textContent = remaining !== null && remaining < 0 ? '추정치보다 많음' : '추정치까지';
    $('progress').value = target === null ? 0 : Math.min(100, total / target * 100);
    $('feedback').textContent = target === null ? '프로필을 저장하면 하루 필요량 추정치와 비교할 수 있어요.' : remaining < 0 ? '기록한 열량이 추정치를 넘었어요. 추정치는 섭취 상한선이 아니며 실제 필요량은 다를 수 있어요.' : '추정치는 참고용이에요. 오늘 먹은 음식을 차근차근 기록해 보세요.';
    $('menu').innerHTML = FOODS.filter(food => food.source === activeSource).map(food => foodButton(food)).join('');
    $('menu').hidden = activeSource === 'custom';
    $('food-entry').hidden = activeSource !== 'custom';

    const recommendations = recommend(state.profile, state.records, remaining);
    $('taste').textContent = state.profile?.like ? `좋아하는 ${state.profile.like} 종류와 지금까지의 식사 기록을 반영했어요.` : '식사 기록이 쌓이면 자주 선택한 종류를 추천에 반영해요.';
    $('recommendations').innerHTML = recommendations.length ? recommendations.map(food => foodButton(food, food.category === state.profile?.like ? '좋아하는 종류' : '학교 예시 메뉴에서 골랐어요')).join('') : '<p class="empty">남은 추정량에 맞는 예시 메뉴가 없어요. 이 결과를 식사 제한 기준으로 사용하지 마세요.</p>';
    $('record-count').textContent = `${todaysRecords.length}회 기록`;
    $('records').innerHTML = todaysRecords.length ? todaysRecords.slice().reverse().map(record => {
      const food = recordFood(record);
      return `<li><span aria-hidden="true">${food.emoji}</span><span class="record-name">${escapeHtml(food.name)}<span class="food-info">${escapeHtml(food.portion)} · ${food.kcal} kcal${record.custom ? ' · 직접 입력' : ''}</span></span><button type="button" class="remove" data-remove="${record.id}" aria-label="${escapeHtml(food.name)} 기록 삭제">삭제</button></li>`;
    }).join('') : '<li class="empty">아직 기록이 없어요. 위에서 먹은 메뉴를 눌러 보세요.</li>';

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + index);
      const key = dateKey(date);
      return { key, label: `${date.getMonth() + 1}/${date.getDate()}`, total: dailyTotal(state.records, key) };
    });
    const max = Math.max(1, ...days.map(day => day.total));
    $('week').innerHTML = days.map(day => `<div class="day ${day.key === currentDay ? 'current' : ''}" aria-label="${day.key}, ${day.total} kcal"><span>${number(day.total)}</span><div class="bar-track" aria-hidden="true"><div class="bar" style="height:${day.total / max * 100}%"></div></div><span>${day.label}</span></div>`).join('');
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const profile = readProfileForm();
    if (!validProfile(profile)) {
      $('profile-status').textContent = profile.like && profile.like === profile.avoid ? '좋아하는 종류와 피하는 종류를 다르게 선택해 주세요.' : '입력 범위를 확인해 주세요. 이 앱은 만 13~18세를 대상으로 해요.';
      return;
    }
    if (!validPlanOptions(profile)) {
      $('profile-status').textContent = '상담 메모의 몸무게, 식사 습관 또는 날짜 입력을 확인해 주세요.';
      return;
    }
    state.profile = profile;
    save();
    render();
    $('profile-status').textContent = $('storage-warning').hidden ? '프로필을 저장했어요.' : '프로필을 적용했지만 브라우저에 저장하지 못했어요.';
  });

  form.addEventListener('input', () => { renderGrowthPlan(readProfileForm(), true); });

  document.addEventListener('click', event => {
    const searchButton = event.target.closest('[data-search-food]');
    if (searchButton) {
      if (!$('food-servings').reportValidity()) return;
      addRecord({ foodId: searchButton.dataset.searchFood, servings: $('food-servings').valueAsNumber });
    }
    const foodButton = event.target.closest('[data-food]');
    if (foodButton) {
      const food = FOOD_BY_ID.get(foodButton.dataset.food);
      if (!food) return;
      addRecord({ foodId: food.id });
    }
    const removeButton = event.target.closest('[data-remove]');
    if (removeButton) {
      state.records = state.records.filter(record => record.id !== removeButton.dataset.remove);
      save();
      render();
      notify('선택한 기록을 삭제했어요.');
    }
    const tab = event.target.closest('[data-source]');
    if (tab) {
      activeSource = tab.dataset.source;
      document.querySelectorAll('[data-source]').forEach(button => {
        const selected = button === tab;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      render();
      if (activeSource === 'custom') renderSearch();
    }
  });

  $('food-search').addEventListener('input', renderSearch);
  $('food-servings').addEventListener('input', renderSearch);
  $('custom-food-form').addEventListener('submit', event => {
    event.preventDefault();
    const customForm = event.currentTarget;
    const values = Object.fromEntries(new FormData(customForm));
    const custom = { name: values.foodName.trim(), portion: values.portion.trim(), kcal: Number(values.kcal) };
    if (!validCustomFood(custom)) {
      $('custom-food-status').textContent = '음식 이름, 먹은 양, 0~20,000 kcal 사이의 정수 열량을 확인해 주세요.';
      return;
    }
    addRecord({ custom });
    customForm.reset();
    $('custom-food-status').textContent = '오늘의 식사 기록에 추가했어요.';
  });

  $('reset').addEventListener('click', () => {
    if (!window.confirm('프로필과 모든 날짜의 식사 기록을 삭제할까요? 되돌릴 수 없습니다.')) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      notify('브라우저 저장 데이터 삭제에 실패했어요. 브라우저 설정에서 사이트 데이터를 삭제해 주세요.');
      return;
    }
    state = { profile: null, records: [] };
    form.reset();
    $('custom-food-form').reset();
    $('food-search').value = '';
    $('food-servings').value = '1';
    $('custom-food-status').textContent = '';
    renderSearch();
    $('profile-status').textContent = '';
    render();
    notify('프로필과 전체 기록을 삭제했어요.');
  });

  // Local calendar days, including a tab left open overnight.
  function refreshDay() { if (dateKey() !== currentDay) render(); }
  document.addEventListener('visibilitychange', refreshDay);
  setInterval(refreshDay, 30000);
  render();
})();
