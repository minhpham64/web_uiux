const STORAGE_KEY = 'unifin-local-v1';
const DEFAULT_STATE = {
  income: 6500000,
  expense: 3050000,
  budget: 5000000,
  transactions: [],
  loaned: 0,
  borrowed: 0,
  savings: [4200000, 2500000, 1150000],
  debts: {
    lend: [],
    borrow: []
  },
  debtStatus: {}
};
const BASE_WALLETS = {
  vcb: 2350000,
  momo: 780000,
  cash: 320000
};
const BASE_DEBTS = {
  lend: [
    { id: 'base-lend-kiet', person: 'Nguyễn Tuấn Kiệt', reason: 'Ứng tiền đóng lệ phí thi TOEIC', wallet: 'VCB Student', due: '20/11/2026', amount: 500000, date: '14/11/2026', status: 'Chưa trả', statusClass: 'green', initialStatus: 'unpaid' },
    { id: 'base-lend-nam', person: 'Trần Hoàng Nam', reason: 'Mượn tiền mua giáo trình & in đồ án', wallet: 'Ví MoMo', due: '18/11/2026', amount: 350000, date: '10/11/2026', status: 'Sắp đến hạn', statusClass: 'amber', initialStatus: 'unpaid' },
    { id: 'base-lend-bao', person: 'Lê Gia Bảo', reason: 'Ứng trước tiền vé xe về quê cuối tuần', wallet: 'Tiền mặt', due: '25/11/2026', amount: 300000, date: '05/11/2026', status: 'Đang theo dõi', statusClass: 'green', initialStatus: 'unpaid' },
    { id: 'base-lend-thu', person: 'Phạm Minh Thư', reason: 'Mượn tiền ăn trưa & gửi xe trường', wallet: 'Ví MoMo', due: '02/11/2026', amount: 150000, date: '28/10/2026', status: 'Đã tất toán ✓', statusClass: '', initialStatus: 'paid' }
  ],
  borrow: [
    { id: 'base-borrow-quan', person: 'Võ Minh Quân', reason: 'Mượn tiền sửa xe máy gấp buổi tối', wallet: 'Tiền mặt', due: '19/11/2026', amount: 300000, date: '12/11/2026', status: 'Cần trả (3 ngày)', statusClass: 'red', initialStatus: 'unpaid' },
    { id: 'base-borrow-huy', person: 'Đặng Quốc Huy', reason: 'Trả hộ tiền đặt áo đồng phục lớp', wallet: 'Ví MoMo', due: '22/11/2026', amount: 150000, date: '09/11/2026', status: 'Chưa thanh toán', statusClass: 'amber', initialStatus: 'unpaid' },
    { id: 'base-borrow-kiet', person: 'Nguyễn Tuấn Kiệt', reason: 'Mượn tiền nạp gói cước 4G tháng', wallet: 'Ví MoMo', due: '05/11/2026', amount: 100000, date: '01/11/2026', status: 'Đã trả xong ✓', statusClass: '', initialStatus: 'paid' }
  ]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(stored);
    return {
      ...clone(DEFAULT_STATE),
      ...parsed,
      loaned: Number(parsed.loaned || 0),
      borrowed: Number(parsed.borrowed || 0),
      savings: Array.isArray(parsed.savings) ? parsed.savings : clone(DEFAULT_STATE.savings),
      debts: {
        ...clone(DEFAULT_STATE.debts),
        ...(parsed.debts || {})
      },
      debtStatus: { ...(parsed.debtStatus || {}) }
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
}

const sessionState = loadState();

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionState));
  } catch {
    toast('Không thể đồng bộ dữ liệu tạm của phiên này.');
  }
}

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} đ`;
const amountFrom = (modal) => Number(modal.querySelector('input[type="number"]')?.value || 0);
const textFrom = (modal, index) => modal.querySelectorAll('input')[index]?.value?.trim() || 'Khoản mới';
const selectFrom = (modal, index) => modal.querySelectorAll('select')[index]?.value || '';
const isPage = (name) => location.pathname.endsWith(name);

function toast(message) {
  let node = document.querySelector('.toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  window.clearTimeout(node.timer);
  node.timer = window.setTimeout(() => node.classList.remove('show'), 2600);
}

function updateSummary() {
  const wallets = walletBalances();
  const balance = Object.values(wallets).reduce((sum, amount) => sum + amount, 0);
  const remaining = Math.max(sessionState.budget - sessionState.expense, 0);
  document.querySelector('[data-role="balance"]')?.replaceChildren(document.createTextNode(money(balance)));
  document.querySelector('[data-role="income-total"]')?.replaceChildren(document.createTextNode(`+${money(sessionState.income)}`));
  document.querySelector('[data-role="expense-total"]')?.replaceChildren(document.createTextNode(`-${money(sessionState.expense)}`));
  document.querySelector('[data-role="budget-remaining"]')?.replaceChildren(document.createTextNode(`Còn lại ${money(remaining)}`));
  document.querySelector('[data-role="budget-spent"]')?.replaceChildren(document.createTextNode(money(sessionState.expense)));
  document.querySelector('[data-role="income-caption"]')?.replaceChildren(document.createTextNode(`+${money(sessionState.income)}`));
  document.querySelector('[data-role="expense-caption"]')?.replaceChildren(document.createTextNode(`-${money(sessionState.expense)}`));
  document.querySelector('[data-role="budget-available"]')?.replaceChildren(document.createTextNode(money(remaining)));
  const budgetProgress = document.querySelector('[data-role="budget-progress"]');
  if (budgetProgress) budgetProgress.style.width = `${Math.min((sessionState.expense / sessionState.budget) * 100, 100)}%`;
  document.querySelectorAll('[data-wallet]').forEach((node) => {
    const amount = wallets[node.dataset.wallet] || 0;
    node.textContent = money(amount);
  });
}

function walletKey(wallet) {
  if (wallet === 'VCB Student') return 'vcb';
  if (wallet === 'Ví MoMo') return 'momo';
  return 'cash';
}

function walletBalances() {
  const balances = { ...BASE_WALLETS };
  sessionState.transactions.forEach((item) => {
    const key = walletKey(item.wallet);
    const positive = item.type === 'income' || item.type === 'borrow';
    balances[key] += positive ? item.amount : -item.amount;
  });
  return balances;
}

function transactionDetail(item) {
  return `${item.type === 'income' ? 'Thu nhập' : item.category} • ${item.wallet} • ${item.date}`;
}

function transactionRow(item) {
  const positive = item.type === 'income' || item.type === 'borrow';
  const sign = positive ? '+' : '-';
  const category = item.type === 'income' ? 'Khoản mới' : 'Khoản mới';
  return `<tr class="session-row"><td>${item.date}</td><td><span class="pill${positive ? ' green' : ''}">${category}</span></td><td><strong>${item.label}</strong></td><td>${item.wallet}</td><td class="amount${positive ? ' green' : ''}">${sign}${money(item.amount)}</td></tr>`;
}

function renderSessionTables() {
  const body = document.querySelector('table tbody');
  if (!body) return;
  body.querySelectorAll('.session-row').forEach((row) => row.remove());
  const items = sessionState.transactions.filter((item) => {
    if (isPage('income.html')) return item.type === 'income';
    if (isPage('transactions.html')) return true;
    return false;
  });
  [...items].reverse().forEach((item) => body.insertAdjacentHTML('afterbegin', transactionRow(item)));
}

function debtRow(item, type) {
  const isLend = type === 'lend';
  const paid = item.initialStatus === 'paid' || sessionState.debtStatus[item.id] === 'paid';
  const status = paid ? (isLend ? 'Đã tất toán ✓' : 'Đã trả xong ✓') : item.status;
  const statusClass = paid ? '' : item.statusClass;
  const action = paid && item.initialStatus === 'paid'
    ? `<button class="debt-status ${statusClass}" disabled>${status}</button>`
    : `<button class="debt-status ${statusClass}" data-debt-toggle="${item.id}" data-debt-type="${type}">${status}</button>`;
  return `<tr class="session-row"><td>${item.date}</td><td><strong>${item.person}</strong></td><td>${item.reason}</td><td>${item.wallet}</td><td>${item.due}</td><td class="amount${isLend ? ' green' : ' red'}">${money(item.amount)}</td><td>${action}</td></tr>`;
}

function renderDebts() {
  if (!isPage('debts.html')) return;
  const sections = document.querySelectorAll('.debt-section');
  if (sections.length < 2) return;
  const allLend = [...BASE_DEBTS.lend, ...sessionState.debts.lend];
  const allBorrow = [...BASE_DEBTS.borrow, ...sessionState.debts.borrow];
  sections[0].querySelector('tbody')?.replaceChildren();
  sections[1].querySelector('tbody')?.replaceChildren();
  allLend.forEach((item) => sections[0].querySelector('tbody')?.insertAdjacentHTML('beforeend', debtRow(item, 'lend')));
  allBorrow.forEach((item) => sections[1].querySelector('tbody')?.insertAdjacentHTML('beforeend', debtRow(item, 'borrow')));
  const unpaid = (items) => items.filter((item) => item.initialStatus !== 'paid' && sessionState.debtStatus[item.id] !== 'paid');
  const lendTotal = unpaid(allLend).reduce((sum, item) => sum + item.amount, 0);
  const borrowTotal = unpaid(allBorrow).reduce((sum, item) => sum + item.amount, 0);
  const totals = [lendTotal, borrowTotal, lendTotal - borrowTotal];
  document.querySelector('[data-role="lend-total"]')?.replaceChildren(document.createTextNode(money(totals[0])));
  document.querySelector('[data-role="borrow-total"]')?.replaceChildren(document.createTextNode(money(totals[1])));
  document.querySelector('[data-role="net-debt-total"]')?.replaceChildren(document.createTextNode(`+${money(totals[2])}`));
  renderDebtReminders(allBorrow);
}

function renderDebtReminders(borrowed) {
  const target = document.querySelector('#debt-reminders');
  if (!target) return;
  const reminders = borrowed.filter((item) => item.initialStatus !== 'paid' && sessionState.debtStatus[item.id] !== 'paid');
  target.innerHTML = `<div class="reminder-title"><span>⏰</span><strong>Nhắc hạn thanh toán</strong><span class="pill red">${reminders.length} khoản cần theo dõi</span></div>${reminders.length ? reminders.map((item) => `<div class="reminder-row"><span><strong>${item.person}</strong><small>Hạn trả ${item.due} • ${item.wallet}</small></span><b class="amount red">${money(item.amount)}</b></div>`).join('') : '<p class="sub">Không còn khoản đi mượn nào chưa thanh toán.</p>'}`;
}

function renderSavings() {
  if (!isPage('savings.html')) return;
  document.querySelectorAll('.goal-card').forEach((card, index) => {
    const saved = sessionState.savings[index] || DEFAULT_STATE.savings[index];
    const target = [15000000, 3000000, 2500000][index];
    const value = card.querySelector('.goal-body .value');
    const progress = card.querySelector('.goal-body .progress i');
    const detail = card.querySelector('.goal-body .sub');
    value?.replaceChildren(document.createTextNode(money(saved)));
    if (progress) progress.style.width = `${Math.min((saved / target) * 100, 100)}%`;
    if (detail) detail.textContent = `Mục tiêu: ${money(target)} (Còn thiếu ${money(Math.max(target - saved, 0))})`;
  });
}

function renderRecentTransactions() {
  const target = document.querySelector('#recent-transactions');
  if (!target) return;
  target.querySelectorAll('.session-row').forEach((row) => row.remove());
  [...sessionState.transactions].reverse().forEach((item) => {
    const row = document.createElement('div');
    row.className = 'list-row session-row';
    const positive = item.type === 'income' || item.type === 'borrow';
    row.innerHTML = `<span><strong>${positive ? '▣' : '•'} ${item.label}</strong><small>${transactionDetail(item)}</small></span><b class="amount${positive ? ' green' : ''}">${positive ? '+' : '-'}${money(item.amount)}</b>`;
    target.prepend(row);
  });
  while (target.children.length > 8) target.lastElementChild.remove();
}

function renderAllSessionData() {
  updateSummary();
  renderRecentTransactions();
  renderSessionTables();
  renderDebts();
  renderSavings();
  renderChart(sessionState.chartMode || 'bars');
}

function addTransaction(item) {
  sessionState.transactions.unshift(item);
  if (item.type === 'income') sessionState.income += item.amount;
  if (item.type === 'expense') sessionState.expense += item.amount;
  if (item.type === 'lend') sessionState.loaned += item.amount;
  if (item.type === 'borrow') sessionState.borrowed += item.amount;
  persistState();
  renderAllSessionData();
}

function toggleDebt(id, type) {
  const source = [...BASE_DEBTS[type], ...sessionState.debts[type]].find((item) => item.id === id);
  if (!source || source.initialStatus === 'paid') return;
  const settlementIndex = sessionState.transactions.findIndex((item) => item.debtId === id);
  if (sessionState.debtStatus[id] === 'paid') {
    if (settlementIndex >= 0) {
      const settlement = sessionState.transactions[settlementIndex];
      sessionState.transactions.splice(settlementIndex, 1);
      if (settlement.type === 'income') sessionState.income -= settlement.amount;
      if (settlement.type === 'expense') sessionState.expense -= settlement.amount;
    }
    delete sessionState.debtStatus[id];
    persistState();
    renderAllSessionData();
    toast('Đã hoàn tác trạng thái thanh toán và khôi phục số dư.');
    return;
  }
  sessionState.debtStatus[id] = 'paid';
  addTransaction({
    type: type === 'lend' ? 'income' : 'expense',
    debtId: id,
    category: 'Vay & mượn',
    wallet: source.wallet,
    label: type === 'lend' ? `Thu hồi khoản vay từ ${source.person}` : `Trả khoản mượn cho ${source.person}`,
    amount: source.amount,
    date: 'Hôm nay'
  });
  toast(type === 'lend' ? `Đã thu hồi ${money(source.amount)} và cộng vào thu nhập.` : `Đã trả ${money(source.amount)} và ghi nhận vào chi tiêu.`);
}

function renderChart(mode = 'bars') {
  const chart = document.querySelector('#cashflow-chart');
  if (!chart) return;
  sessionState.chartMode = mode;
  const sets = {
    bars: { labels: ['Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11'], income: [5.6, 6, 5.5, 7.2, 6.2, sessionState.income / 1000000], expense: [4.5, 4.9, 4.1, 5.8, 4.3, sessionState.expense / 1000000] },
    daily: { labels: ['01', '05', '09', '13', '17', 'Hôm nay'], income: [0, 4, 0, 2.5, 0, sessionState.income / 1000000], expense: [0.35, 1.5, 0.6, 0.17, 0.22, sessionState.expense / 1000000] }
  };
  if (mode === 'line') {
    const data = sets.bars;
    const points = (values) => values.map((value, index) => `${index * 20 + 10},${100 - (value / 8) * 84}`).join(' ');
    chart.className = 'line-chart';
    chart.innerHTML = `<svg viewBox="0 0 120 100" preserveAspectRatio="none" aria-label="Biểu đồ đường dòng tiền"><path class="line-grid" d="M0 16H120 M0 42H120 M0 68H120 M0 94H120"></path><polyline class="income-line" points="${points(data.income)}"></polyline><polyline class="expense-line" points="${points(data.expense)}"></polyline></svg><div class="line-labels">${data.labels.map((label) => `<span>${label}</span>`).join('')}</div>`;
  } else {
    const data = sets[mode] || sets.bars;
    const max = Math.max(...data.income, ...data.expense, 1);
    chart.className = 'chart';
    chart.innerHTML = data.labels.map((label, index) => `<div class="bar-group"><i class="bar" style="height:${(data.income[index] / max) * 90}%"></i><i class="bar blue" style="height:${(data.expense[index] / max) * 90}%"></i><small class="bar-label">${label}</small></div>`).join('');
  }
  document.querySelectorAll('[data-chart-mode]').forEach((button) => button.classList.toggle('active', button.dataset.chartMode === mode));
}

function processModal(modal) {
  const value = amountFrom(modal);
  if (!value || value < 0) {
    toast('Vui lòng nhập số tiền hợp lệ.');
    return false;
  }
  if (modal.id === 'income-modal') {
    const label = textFrom(modal, 0);
    const wallet = selectFrom(modal, 0);
    addTransaction({ type: 'income', label, wallet, amount: value, date: `Hôm nay • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` });
    toast(`Đã lưu và đồng bộ khoản thu ${money(value)} trên toàn bộ trang.`);
  } else if (modal.id === 'expense-modal') {
    const label = textFrom(modal, 0);
    const category = selectFrom(modal, 0);
    const wallet = selectFrom(modal, 1) || 'Tiền mặt';
    addTransaction({ type: 'expense', label, category, wallet, amount: value, date: `Hôm nay • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` });
    toast(`Đã lưu và đồng bộ khoản chi ${money(value)} trên toàn bộ trang.`);
  } else if (modal.id === 'saving-modal') {
    const goalIndex = modal.querySelector('select')?.selectedIndex || 0;
    sessionState.savings[goalIndex] = (sessionState.savings[goalIndex] || DEFAULT_STATE.savings[goalIndex]) + value;
    persistState();
    renderAllSessionData();
    toast(`Đã lưu khoản nạp ${money(value)} và đồng bộ mục tiêu tiết kiệm.`);
  } else if (modal.id === 'debt-modal') {
    const type = selectFrom(modal, 0).startsWith('Cho') ? 'lend' : 'borrow';
    const wallet = selectFrom(modal, 1) || 'Tiền mặt';
    const due = modal.querySelectorAll('input')[2]?.value || 'Chưa đặt hạn';
    const person = textFrom(modal, 0);
    const item = {
      id: `${type}-${Date.now()}`,
      person,
      reason: 'Khoản vay/mượn mới',
      wallet,
      due,
      amount: value,
      date: `Hôm nay`,
      status: type === 'lend' ? 'Chưa trả' : 'Chưa thanh toán',
      statusClass: type === 'lend' ? 'green' : 'red',
      initialStatus: 'unpaid'
    };
    sessionState.debts[type].push(item);
    addTransaction({
      type,
      label: `${type === 'lend' ? 'Cho' : 'Mượn'} ${person}`,
      category: 'Vay & mượn',
      wallet,
      amount: value,
      date: 'Hôm nay'
    });
    persistState();
    renderAllSessionData();
    toast(`Đã lưu và đồng bộ khoản ${type === 'lend' ? 'cho vay' : 'đi mượn'} ${money(value)}.`);
  }
  return true;
}

document.querySelectorAll('[data-open-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    const modal = document.querySelector(button.dataset.openModal);
    if (modal) modal.classList.add('open');
  });
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', (event) => {
    const modal = button.closest('.modal-backdrop');
    if (button.classList.contains('btn') && !processModal(modal)) {
      event.preventDefault();
      return;
    }
    modal?.classList.remove('open');
  });
});

document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) backdrop.classList.remove('open');
  });
});

document.querySelectorAll('[data-chart-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    sessionState.chartMode = button.dataset.chartMode;
    persistState();
    renderChart(sessionState.chartMode);
  });
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-debt-toggle]');
  if (button) toggleDebt(button.dataset.debtToggle, button.dataset.debtType);
});

renderAllSessionData();
