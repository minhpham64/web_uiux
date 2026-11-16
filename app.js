const STORAGE_KEY = 'unifin-local-v1';
const DEFAULT_STATE = {
  income: 6500000,
  expense: 3050000,
  budget: 5000000,
  transactions: []
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...clone(DEFAULT_STATE), ...JSON.parse(stored) } : clone(DEFAULT_STATE);
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
    toast(`Đã lưu khoản nạp ${money(value)} vào quỹ trên trình duyệt.`);
  } else if (modal.id === 'debt-modal') {
    toast(`Đã lưu khoản vay/mượn ${money(value)} vào trình duyệt.`);
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
