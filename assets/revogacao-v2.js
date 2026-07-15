import { REPRESENTATION_ROLES, getRepresentationRole } from './benefits.js';

const STEP_ORDER = ['representation', 'data', 'review'];
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74,
  75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93,
  94, 95, 96, 97, 98, 99
]);
const FIELD_LABELS = Object.freeze({
  representationRole: 'Qualidade da representação',
  holderName: 'Nome completo do titular',
  holderCpf: 'CPF do titular',
  holderPhone: 'Telefone celular',
  address: 'Endereço',
  addressNumber: 'Número',
  neighborhood: 'Bairro',
  city: 'Município',
  stateUf: 'UF',
  representativeName: 'Nome do representante ou assistente',
  representativeCpf: 'CPF do representante ou assistente',
  rogoName: 'Nome de quem assina a rogo',
  rogoCpf: 'CPF de quem assina a rogo',
  witness1Name: 'Nome da 1ª testemunha',
  witness1Cpf: 'CPF da 1ª testemunha',
  witness2Name: 'Nome da 2ª testemunha',
  witness2Cpf: 'CPF da 2ª testemunha'
});

const EMPTY_STATE = Object.freeze({
  activeStep: 'representation',
  representationMode: 'self',
  representationRole: '',
  illiterate: false,
  holderName: '',
  holderCpf: '',
  holderRg: '',
  holderPhone: '',
  holderCivilStatus: '',
  holderProfession: '',
  address: '',
  addressNumber: '',
  neighborhood: '',
  city: '',
  stateUf: '',
  representativeName: '',
  representativeCpf: '',
  representativeRg: '',
  rogoName: '',
  rogoCpf: '',
  rogoRg: '',
  witness1Name: '',
  witness1Cpf: '',
  witness2Name: '',
  witness2Cpf: ''
});

const state = { ...EMPTY_STATE };
let currentErrors = [];
let toastTimer = 0;
let internalPrintAllowed = false;
let dirty = false;
let touchedFields = new Set();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

function refreshIcons(root = document) {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' }, root });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function display(value, fallback = 'NÃO INFORMADO') {
  const clean = String(value || '').trim();
  return clean ? escapeHtml(clean) : `<span class="placeholder">${fallback}</span>`;
}

function upper(value) {
  return String(value || '').trim().toLocaleUpperCase('pt-BR');
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isSequential(digits) {
  const ascending = '012345678901234567890';
  const descending = '987654321098765432109';
  return ascending.includes(digits) || descending.includes(digits);
}

function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf) || isSequential(cpf) || isSequential(cpf.slice(0, 9))) return false;
  if (['12345678909', '12345678910', '11144477735', '00000000191'].includes(cpf)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

function isValidPhone(value) {
  const phone = onlyDigits(value);
  if (!/^(?:[1-9]{2})(?:\d{8}|\d{9})$/.test(phone)) return false;
  const ddd = Number(phone.slice(0, 2));
  const local = phone.slice(2);
  if (!VALID_DDDS.has(ddd)) return false;
  if (phone.length === 11 && local[0] !== '9') return false;
  if (/^(\d)\1{7,8}$/.test(local) || /(\d)\1{6,}/.test(local) || isSequential(local)) return false;
  return true;
}

function dedupeErrors(errors) {
  const seen = new Set();
  return errors.filter((error) => {
    const key = `${error.field}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getRequiredFields(candidate = state) {
  const fields = ['holderName', 'holderCpf', 'holderPhone', 'address', 'addressNumber', 'neighborhood', 'city', 'stateUf'];
  if (candidate.representationMode !== 'self') fields.push('representationRole', 'representativeName', 'representativeCpf');
  if (candidate.illiterate) fields.push('rogoName', 'rogoCpf', 'witness1Name', 'witness1Cpf', 'witness2Name', 'witness2Cpf');
  return fields;
}

function validateState(candidate, { allowEmpty = false } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!allowEmpty) {
    getRequiredFields(candidate).forEach((field) => {
      if (!String(candidate[field] ?? '').trim()) add(field, `${FIELD_LABELS[field]} é obrigatório.`);
    });
  }

  if (candidate.holderCpf && !isValidCpf(candidate.holderCpf)) add('holderCpf', 'CPF inválido ou usado como exemplo.');
  if (candidate.holderPhone && !isValidPhone(candidate.holderPhone)) add('holderPhone', 'Telefone inválido, sequencial ou repetitivo.');
  if (candidate.representationMode !== 'self' && candidate.representativeCpf && !isValidCpf(candidate.representativeCpf)) {
    add('representativeCpf', `${FIELD_LABELS.representativeCpf} inválido.`);
  }
  if (candidate.illiterate) {
    ['rogoCpf', 'witness1Cpf', 'witness2Cpf'].forEach((field) => {
      if (candidate[field] && !isValidCpf(candidate[field])) add(field, `${FIELD_LABELS[field]} inválido.`);
    });
  }

  const cpfFieldNames = ['holderCpf'];
  if (candidate.representationMode !== 'self') cpfFieldNames.push('representativeCpf');
  if (candidate.illiterate) cpfFieldNames.push('rogoCpf', 'witness1Cpf', 'witness2Cpf');
  const cpfs = cpfFieldNames.map((field) => [field, candidate[field]]).filter(([, value]) => isValidCpf(value));
  const seen = new Map();
  cpfs.forEach(([field, value]) => {
    const digits = onlyDigits(value);
    if (seen.has(digits)) {
      add(field, `${FIELD_LABELS[field]} não pode repetir ${FIELD_LABELS[seen.get(digits)].toLocaleLowerCase('pt-BR')}.`);
    } else {
      seen.set(digits, field);
    }
  });
  return dedupeErrors(errors);
}

function showToast(message, type = 'default') {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast is-visible${type === 'error' ? ' is-error' : ''}${type === 'success' ? ' is-success' : ''}`;
  toastTimer = window.setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function renderErrors(errors) {
  $$('[data-field-wrap]').forEach((wrapper) => wrapper.classList.remove('has-error'));
  $$('[data-error-for]').forEach((output) => { output.textContent = ''; });
  errors.forEach((error) => {
    const wrapper = $(`[data-field-wrap="${error.field}"]`);
    const output = $(`[data-error-for="${error.field}"]`);
    if (wrapper) wrapper.classList.add('has-error');
    if (output && !output.textContent) output.textContent = error.message;
  });
}

function qualification(person = 'holder') {
  const prefix = person === 'holder' ? 'holder' : 'representative';
  const name = display(upper(state[`${prefix}Name`]));
  const cpf = display(state[`${prefix}Cpf`]);
  const rg = display(onlyDigits(state[`${prefix}Rg`]), 'NÃO INFORMADO');
  if (person === 'representative') return `<strong>${name}</strong>, CPF nº ${cpf}, RG nº ${rg}`;
  const civil = display(state.holderCivilStatus, 'estado civil não informado');
  const profession = display(state.holderProfession, 'profissão não informada');
  return `<strong>${name}</strong>, ${civil}, ${profession}, CPF nº ${cpf}, RG nº ${rg}, telefone ${display(state.holderPhone)}, residente em ${display(upper(state.address))}, nº ${display(state.addressNumber)}, bairro ${display(upper(state.neighborhood))}, ${display(upper(state.city))}/${display(state.stateUf)}`;
}

function currentDate() {
  const date = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${String(date.getDate()).padStart(2, '0')} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

function roleText() {
  return getRepresentationRole(state.representationRole)?.label || 'representante legal';
}

function signatureMarkup() {
  if (state.illiterate) {
    return `<div class="revocation-rogo">
      <div class="signature-block"><span>Assinatura a rogo do titular</span><b>${display(upper(state.rogoName))}</b><small>CPF ${display(state.rogoCpf)} · RG ${display(onlyDigits(state.rogoRg))}</small></div>
      <div class="fingerprint"><span>Impressão digital</span></div>
      <div class="witness-grid">
        <div class="signature-block"><span>1ª testemunha</span><b>${display(upper(state.witness1Name))}</b><small>CPF ${display(state.witness1Cpf)}</small></div>
        <div class="signature-block"><span>2ª testemunha</span><b>${display(upper(state.witness2Name))}</b><small>CPF ${display(state.witness2Cpf)}</small></div>
      </div>
    </div>`;
  }
  if (state.representationMode === 'represented') {
    return `<div class="signature-grid single"><div class="signature-block"><span>${escapeHtml(roleText())}</span><b>${display(upper(state.representativeName))}</b><small>Assina pelo titular</small></div></div>`;
  }
  if (state.representationMode === 'assisted') {
    return `<div class="signature-grid"><div class="signature-block"><span>Titular</span><b>${display(upper(state.holderName))}</b></div><div class="signature-block"><span>${escapeHtml(roleText())}</span><b>${display(upper(state.representativeName))}</b><small>Assiste o titular</small></div></div>`;
  }
  return `<div class="signature-grid single"><div class="signature-block"><span>Titular</span><b>${display(upper(state.holderName))}</b></div></div>`;
}

function renderDocument() {
  let actor = `O outorgante ${qualification()}`;
  if (state.representationMode === 'represented') actor += `, neste ato representado por ${qualification('representative')}, na qualidade de ${escapeHtml(roleText().toLocaleLowerCase('pt-BR'))}`;
  if (state.representationMode === 'assisted') actor += `, neste ato assistido por ${qualification('representative')}, na qualidade de ${escapeHtml(roleText().toLocaleLowerCase('pt-BR'))}`;

  $('#documentStack').innerHTML = `<div class="paper-frame"><section class="print-sheet" data-document="revogacao"><article class="paper revocation-paper">
    <header class="doc-header"><img src="logo.png" alt=""><span>Menezes Advocacia & Consultoria Jurídica</span></header>
    <div class="doc-body term-body">
      <h1 class="doc-title">Revogação de Procuração</h1>
      <p class="doc-paragraph">${actor}, declara, para todos os fins de direito, o que segue.</p>
      <p class="doc-paragraph"><strong>PROCURADOR CUJA PROCURAÇÃO É REVOGADA: CLAYTON GONÇALVES MENEZES</strong>, advogado inscrito na OAB/BA sob o nº 49.167, com endereço profissional na Av. Ascendino Melo, nº 297, Shopping Itatiaia, Centro, Vitória da Conquista/BA.</p>
      <h2 class="doc-section-title">Da revogação</h2>
      <p class="doc-paragraph">O outorgante, por este instrumento particular, vem <strong>REVOGAR, de forma expressa e incondicional</strong>, a procuração anteriormente outorgada em favor do procurador acima identificado, tornando <strong>sem qualquer efeito</strong> todos os poderes nela conferidos a partir desta data, nos termos dos arts. 682, I, 686 e 687 do Código Civil.</p>
      <p class="doc-paragraph">Declara estar ciente de que a revogação deverá ser comunicada ao procurador e, quando necessário, aos órgãos ou processos em que a procuração tenha sido apresentada.</p>
      <div class="revocation-signatures">
        <p class="location-date">${display(upper(state.city), 'CIDADE')}/${display(state.stateUf, 'UF')}, ${currentDate()}.</p>
        ${signatureMarkup()}
      </div>
    </div>
    <footer class="doc-footer"><span>Av. Ascendino Melo, nº 297, Shopping Itatiaia, Centro, Vitória da Conquista/BA · (77) 99927-1876 · menezesadv49@gmail.com</span><span class="page-number">1 de 1</span></footer>
  </article></section></div>`;
  refreshIcons($('#documentStack'));
  resizePaper();
}

function completionPercent() {
  const required = getRequiredFields();
  const done = required.filter((field) => String(state[field] ?? '').trim()).length;
  return Math.round((done / Math.max(required.length, 1)) * 100);
}

function stepForField(field) {
  return field === 'representationRole' ? 'representation' : 'data';
}

function stepComplete(step) {
  if (step === 'representation') return state.representationMode === 'self' || Boolean(state.representationRole);
  if (step === 'data') return validateState(state).filter((error) => stepForField(error.field) === 'data').length === 0;
  return validateState(state).length === 0;
}

function renderReview() {
  currentErrors = validateState(state);
  const ready = currentErrors.length === 0;
  $('#reviewStatus').className = `review-status${ready ? ' is-ready' : ''}`;
  $('#reviewStatus').innerHTML = ready
    ? '<i data-lucide="circle-check"></i><span>Documento pronto para gerar em uma página A4.</span>'
    : `<i data-lucide="circle-alert"></i><span>${currentErrors.length} pendência${currentErrors.length === 1 ? '' : 's'} precisa${currentErrors.length === 1 ? '' : 'm'} de correção.</span>`;
  $('#reviewList').innerHTML = currentErrors.map((error) => `<button type="button" class="review-item" data-review-field="${error.field}"><i data-lucide="circle-x"></i><span>${escapeHtml(error.message)}</span><i data-lucide="chevron-right"></i></button>`).join('');
  refreshIcons($('#reviewStatus'));
  refreshIcons($('#reviewList'));
}

function renderNavigation() {
  const percent = completionPercent();
  $('#completionLabel').textContent = `${percent}%`;
  $('#completionBar').style.width = `${percent}%`;
  $$('.step-link').forEach((button) => {
    const step = button.dataset.stepTarget;
    const complete = stepComplete(step);
    button.classList.toggle('is-active', step === state.activeStep);
    button.classList.toggle('is-complete', complete);
    const icon = $('.step-check', button);
    if (icon) icon.setAttribute('data-lucide', complete ? 'circle-check' : 'circle');
  });
  $('#stepRepresentationStatus').textContent = stepComplete('representation') ? 'Definido' : 'Pendente';
  $('#stepDataStatus').textContent = stepComplete('data') ? 'Completo' : 'Pendente';
  $('#stepReviewStatus').textContent = currentErrors.length ? 'Pendente' : 'Pronto';
  const index = STEP_ORDER.indexOf(state.activeStep);
  $('#previousStep').disabled = index === 0;
  $('#nextStep').hidden = state.activeStep === 'review';
  $('#generatePdf').hidden = state.activeStep !== 'review';
  refreshIcons($('.step-nav'));
}

function renderConditionalFields() {
  const represented = state.representationMode !== 'self';
  $('#roleFields').hidden = !represented;
  $('#representativeFields').hidden = !represented;
  $('#witnessFields').hidden = !state.illiterate;
  $('#representativeHeading').textContent = state.representationMode === 'assisted' ? 'Dados do assistente' : 'Dados do representante';
}

function renderAll() {
  renderConditionalFields();
  renderDocument();
  renderReview();
  renderNavigation();
}

function setStep(step, { focus = true } = {}) {
  if (!STEP_ORDER.includes(step)) return;
  state.activeStep = step;
  $$('.step-section').forEach((section) => section.classList.toggle('is-active', section.dataset.step === step));
  renderNavigation();
  if (step === 'review') renderErrors(currentErrors);
  if (focus) $('.step-section.is-active h1')?.focus({ preventScroll: true });
}

function focusField(field) {
  setStep(stepForField(field), { focus: false });
  const control = $(`[data-bind="${field}"]`);
  control?.focus();
  control?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  closeMobilePanel();
  if (window.innerWidth < 1200) openMobilePanel();
}

function resizePaper() {
  const stage = $('#paperStage');
  const available = Math.max(280, stage.clientWidth - (window.innerWidth < 768 ? 16 : 44));
  const scale = Math.min(1, available / 793.7008);
  $('#documentStack').style.setProperty('--paper-scale', scale.toFixed(4));
}

function openMobilePanel() {
  if (window.innerWidth < 1200) $('#appShell').classList.add('mobile-panel-open');
}

function closeMobilePanel() {
  $('#appShell').classList.remove('mobile-panel-open');
}

function normalPrint() {
  currentErrors = validateState(state);
  renderErrors(currentErrors);
  renderReview();
  if (currentErrors.length) {
    setStep('review');
    showToast('Corrija as pendências antes de gerar o PDF.', 'error');
    return;
  }
  window.print();
}

function internalPrint() {
  const errors = validateState(state, { allowEmpty: true });
  renderErrors(errors);
  if (errors.length) {
    $('#internalPrintDialog').close();
    setStep('review');
    showToast('Há dados preenchidos de forma inválida.', 'error');
    return;
  }
  internalPrintAllowed = true;
  $('#internalPrintDialog').close();
  window.print();
}

function installLongPress() {
  const button = $('#generatePdf');
  let timer = 0;
  let triggered = false;
  const cancel = () => { clearTimeout(timer); button.classList.remove('is-holding'); };
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    triggered = false;
    button.classList.add('is-holding');
    timer = window.setTimeout(() => {
      triggered = true;
      button.classList.remove('is-holding');
      $('#internalPrintDialog').showModal();
      refreshIcons($('#internalPrintDialog'));
    }, 1200);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => button.addEventListener(eventName, cancel));
  button.addEventListener('click', (event) => {
    if (triggered) { event.preventDefault(); triggered = false; return; }
    normalPrint();
  });
}

function installPrintGuard() {
  const blocker = document.createElement('div');
  blocker.className = 'print-blocker';
  blocker.innerHTML = '<h1>Impressão bloqueada</h1><p>Preencha e corrija os campos obrigatórios antes de gerar o PDF.</p>';
  document.body.append(blocker);
  window.addEventListener('beforeprint', () => {
    if (internalPrintAllowed) return;
    document.body.classList.toggle('print-validation-blocked', validateState(state).length > 0);
  });
  window.addEventListener('afterprint', () => {
    internalPrintAllowed = false;
    document.body.classList.remove('print-validation-blocked');
  });
}

function wireEvents() {
  $$('[data-bind]').forEach((control) => {
    const eventName = control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'input';
    control.addEventListener(eventName, () => {
      const key = control.dataset.bind;
      if (control.type === 'checkbox') state[key] = control.checked;
      else if (key.toLocaleLowerCase('pt-BR').includes('cpf')) {
        control.value = formatCpf(control.value);
        state[key] = control.value;
      } else if (key === 'holderPhone') {
        control.value = formatPhone(control.value);
        state[key] = control.value;
      } else if (key.toLocaleLowerCase('pt-BR').endsWith('rg')) {
        control.value = onlyDigits(control.value).slice(0, 14);
        state[key] = control.value;
      } else {
        state[key] = control.value;
      }
      touchedFields.add(key);
      dirty = true;
      renderAll();
      renderErrors(currentErrors.filter((error) => touchedFields.has(error.field)));
    });
  });

  $$('input[name="representationMode"]').forEach((radio) => radio.addEventListener('change', () => {
    if (!radio.checked) return;
    state.representationMode = radio.value;
    if (radio.value === 'self') state.representationRole = '';
    dirty = true;
    renderAll();
  }));

  $$('.step-link').forEach((button) => button.addEventListener('click', () => { setStep(button.dataset.stepTarget); openMobilePanel(); }));
  $('#previousStep').addEventListener('click', () => setStep(STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(state.activeStep) - 1)]));
  $('#nextStep').addEventListener('click', () => setStep(STEP_ORDER[Math.min(STEP_ORDER.length - 1, STEP_ORDER.indexOf(state.activeStep) + 1)]));
  $('#reviewList').addEventListener('click', (event) => {
    const item = event.target.closest('[data-review-field]');
    if (item) focusField(item.dataset.reviewField);
  });
  $('#panelToggle').addEventListener('click', () => {
    const collapsed = $('#appShell').classList.toggle('is-collapsed');
    $('#panelToggle').setAttribute('aria-expanded', String(!collapsed));
    $('#panelToggle').setAttribute('aria-label', collapsed ? 'Expandir painel' : 'Recolher painel');
    resizePaper();
  });
  $('#mobilePanelButton').addEventListener('click', openMobilePanel);
  $$('.view-switcher button').forEach((button) => button.addEventListener('click', () => {
    $$('.view-switcher button').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    if (button.dataset.mobileView === 'form') openMobilePanel(); else closeMobilePanel();
  }));
  $('#clearData').addEventListener('click', () => {
    if (!window.confirm('Limpar todos os dados preenchidos nesta página?')) return;
    Object.assign(state, EMPTY_STATE);
    touchedFields = new Set();
    $$('[data-bind]').forEach((control) => { if (control.type === 'checkbox') control.checked = false; else control.value = ''; });
    $$('input[name="representationMode"]').forEach((radio) => { radio.checked = radio.value === 'self'; });
    dirty = false;
    renderErrors([]);
    setStep('representation', { focus: false });
    renderAll();
    showToast('Dados removidos.', 'success');
  });
  $('#confirmInternalPrint').addEventListener('click', internalPrint);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMobilePanel(); });
  window.addEventListener('resize', resizePaper);
  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function initialize() {
  REPRESENTATION_ROLES.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.label;
    $('#representationRole').append(option);
  });
  wireEvents();
  installLongPress();
  installPrintGuard();
  renderAll();
  refreshIcons();
}

initialize();
