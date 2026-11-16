const STORAGE_KEY = 'unifin-local-v1';
const DEFAULT_STATE = {
  income: 6500000,
  expense: 3050000,
  budget: 5000000,
  transactions: [],
  savings: [4200000, 2500000, 1150000],
  debts: {
    lend: [],
    borrow: []
  }
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
      savings: Array.isArray(parsed.savings) ? parsed.savings : clone(DEFAULT_STATE.savings),
      debts: {
        ...clone(DEFAULT_STATE.debts),
        ...(parsed.debts || {})
      }
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
  const balance = sessionState.income - sessionState.expense;
  const remaining = Math.max(sessionState.budget - sessionState.expense, 0);
  document.querySelector('[data-role="balance"]')?.replaceChildren(document.createTextNode(money(balance)));
  document.querySelector('[data-role="income-total"]')?.replaceChildren(document.createTextNode(`+${money(sessionState.income)}`));
  document.querySelector('[data-role="expense-total"]')?.replaceChildren(document.createTextNode(`-${money(sessionState.expense)}`));
  document.querySelector('[data-role="budget-remaining"]')?.replaceChildren(document.createTextNode(`Còn lại ${money(remaining)}`));
  document.querySelector('[data-role="budget-spent"]')?.replaceChildren(document.createTextNode(money(sessionState.expense)));
  const budgetProgress = document.querySelector('[data-role="budget-progress"]');
  if (budgetProgress) budgetProgress.style.width = `${Math.min((sessionState.expense / sessionState.budget) * 100, 100)}%`;
}

function transactionDetail(item) {
  return `${item.type === 'income' ? 'Thu nhập' : item.category} • ${item.wallet} • ${item.date}`;
}

function transactionRow(item) {
  const sign = item.type === 'income' ? '+' : '-';
  const category = item.type === 'income' ? 'Khoản mới' : 'Khoản mới';
  return `<tr class="session-row"><td>${item.date}</td><td><span class="pill${item.type === 'income' ? ' green' : ''}">${category}</span></td><td><strong>${item.label}</strong></td><td>${item.wallet}</td><td class="amount${item.type === 'income' ? ' green' : ''}">${sign}${money(item.amount)}</td></tr>`;
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
  return `<tr class="session-row"><td>${item.date}</td><td><strong>${item.person}</strong></td><td>${item.reason}</td><td>${item.wallet}</td><td>${item.due}</td><td class="amount${isLend ? ' green' : ' red'}">${money(item.amount)}</td><td><span class="pill ${item.statusClass}">${item.status}</span></td></tr>`;
}

function renderDebts() {
  if (!isPage('debts.html')) return;
  const sections = document.querySelectorAll('.debt-section');
  if (sections.length < 2) return;
  sections.forEach((section) => section.querySelectorAll('.session-row').forEach((row) => row.remove()));
  [...sessionState.debts.lend].reverse().forEach((item) => sections[0].querySelector('tbody')?.insertAdjacentHTML('afterbegin', debtRow(item, 'lend')));
  [...sessionState.debts.borrow].reverse().forEach((item) => sections[1].querySelector('tbody')?.insertAdjacentHTML('afterbegin', debtRow(item, 'borrow')));
  const totals = [
    sessionState.debts.lend.reduce((sum, item) => sum + item.amount, 1150000),
    sessionState.debts.borrow.reduce((sum, item) => sum + item.amount, 450000),
    700000 + sessionState.debts.lend.reduce((sum, item) => sum + item.amount, 0) - sessionState.debts.borrow.reduce((sum, item) => sum + item.amount, 0)
  ];
  document.querySelector('[data-role="lend-total"]')?.replaceChildren(document.createTextNode(money(totals[0])));
  document.querySelector('[data-role="borrow-total"]')?.replaceChildren(document.createTextNode(money(totals[1])));
  document.querySelector('[data-role="net-debt-total"]')?.replaceChildren(document.createTextNode(`+${money(totals[2])}`));
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
    row.innerHTML = `<span><strong>${item.type === 'income' ? '▣' : '•'} ${item.label}</strong><small>${transactionDetail(item)}</small></span><b class="amount${item.type === 'income' ? ' green' : ''}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</b>`;
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
  persistState();
  renderAllSessionData();
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
    addTransaction({ type: 'expense', label, category, wallet: 'Tiền mặt', amount: value, date: `Hôm nay • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` });
    toast(`Đã lưu và đồng bộ khoản chi ${money(value)} trên toàn bộ trang.`);
  } else if (modal.id === 'saving-modal') {
    const goalIndex = modal.querySelector('select')?.selectedIndex || 0;
    sessionState.savings[goalIndex] = (sessionState.savings[goalIndex] || DEFAULT_STATE.savings[goalIndex]) + value;
    persistState();
    renderAllSessionData();
    toast(`Đã lưu khoản nạp ${money(value)} và đồng bộ mục tiêu tiết kiệm.`);
  } else if (modal.id === 'debt-modal') {
    const type = selectFrom(modal, 0).startsWith('Cho') ? 'lend' : 'borrow';
    const due = modal.querySelectorAll('input')[2]?.value || 'Chưa đặt hạn';
    const item = {
      person: textFrom(modal, 0),
      reason: 'Khoản vay/mượn mới',
      wallet: 'Tiền mặt',
      due,
      amount: value,
      date: `Hôm nay`,
      status: type === 'lend' ? 'Chưa trả' : 'Chưa thanh toán',
      statusClass: type === 'lend' ? 'green' : 'red'
    };
    sessionState.debts[type].push(item);
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

renderAllSessionData();
