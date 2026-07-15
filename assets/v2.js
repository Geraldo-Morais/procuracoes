import {
  BENEFITS,
  REPRESENTATION_ROLES,
  REVIEW_DATE,
  buildChecklist,
  getBenefit,
  getRepresentationRole,
  resolveDocumentSet,
  triageBenefits
} from './benefits.js';

const STEP_ORDER = ['benefit', 'representation', 'data', 'documents', 'review'];
const DOCUMENT_NAMES = Object.freeze({
  procuracao: 'Procuração',
  anexo: 'Termo de Benefício',
  responsabilidade: 'Termo de Responsabilidade',
  compromisso: 'Termo de Compromisso'
});

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74,
  75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93,
  94, 95, 96, 97, 98, 99
]);

const FIELD_LABELS = Object.freeze({
  benefitId: 'Tipo de benefício',
  representationRole: 'Qualidade da representação',
  holderName: 'Nome completo do titular',
  holderCpf: 'CPF do titular',
  holderPhone: 'Telefone celular',
  address: 'Endereço',
  addressNumber: 'Número',
  neighborhood: 'Bairro',
  city: 'Cidade',
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
  activeStep: 'benefit',
  benefitId: '',
  dependentType: 'spouse_married',
  deceasedWasBeneficiary: false,
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
  witness1Rg: '',
  witness2Name: '',
  witness2Cpf: '',
  witness2Rg: ''
});

const state = { ...EMPTY_STATE };
let checklistItems = [];
let checkedChecklist = new Set();
let currentErrors = [];
let toastTimer = 0;
let internalPrintAllowed = false;
let checklistPrintPending = false;
let dirty = false;
let touchedFields = new Set();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function refreshIcons(root = document) {
  if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' }, root });
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
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

export function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function formatPhone(value) {
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

export function isValidCpf(value) {
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

export function isValidPhone(value) {
  const phone = onlyDigits(value);
  if (!/^(?:[1-9]{2})(?:\d{8}|\d{9})$/.test(phone)) return false;
  const ddd = Number(phone.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) return false;
  const local = phone.slice(2);
  if (phone.length === 11 && local[0] !== '9') return false;
  if (/^(\d)\1{7,8}$/.test(local)) return false;
  if (/(\d)\1{6,}/.test(local)) return false;
  if (isSequential(local)) return false;
  return true;
}

function nowInPortuguese() {
  const date = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return { day: String(date.getDate()).padStart(2, '0'), month: months[date.getMonth()], year: String(date.getFullYear()) };
}

function showToast(message, type = 'default') {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast is-visible${type === 'error' ? ' is-error' : ''}${type === 'success' ? ' is-success' : ''}`;
  toastTimer = window.setTimeout(() => { toast.className = 'toast'; }, 3200);
}

function populateSelects() {
  const benefitSelect = $('#benefitId');
  const groups = [...new Set(BENEFITS.map((benefit) => benefit.group))];
  groups.forEach((group) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group;
    BENEFITS.filter((benefit) => benefit.group === group).forEach((benefit) => {
      const option = document.createElement('option');
      option.value = benefit.id;
      option.textContent = benefit.name;
      optgroup.append(option);
    });
    benefitSelect.append(optgroup);
  });

  const roleSelect = $('#representationRole');
  REPRESENTATION_ROLES.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.label;
    roleSelect.append(option);
  });
}

function contextForChecklist() {
  return {
    dependentType: state.dependentType,
    deceasedWasBeneficiary: Boolean(state.deceasedWasBeneficiary)
  };
}

function getRequiredFields() {
  const fields = ['benefitId', 'holderName', 'holderCpf', 'holderPhone', 'address', 'addressNumber', 'neighborhood', 'city', 'stateUf'];
  if (state.representationMode !== 'self') fields.push('representationRole', 'representativeName', 'representativeCpf');
  if (state.illiterate) fields.push('rogoName', 'rogoCpf', 'witness1Name', 'witness1Cpf', 'witness2Name', 'witness2Cpf');
  return fields;
}

export function validateState(candidate, { allowEmpty = false } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const required = getRequiredFieldsFor(candidate);

  if (!allowEmpty) {
    required.forEach((field) => {
      if (!String(candidate[field] ?? '').trim()) add(field, `${FIELD_LABELS[field]} é obrigatório.`);
    });
  }

  if (candidate.holderCpf && !isValidCpf(candidate.holderCpf)) add('holderCpf', 'CPF inválido ou usado como exemplo.');
  if (candidate.holderPhone && !isValidPhone(candidate.holderPhone)) add('holderPhone', 'Telefone inválido, sequencial ou repetitivo.');
  if (candidate.representationMode !== 'self' && candidate.representativeCpf && !isValidCpf(candidate.representativeCpf)) {
    add('representativeCpf', 'CPF do representante inválido.');
  }
  if (candidate.illiterate) {
    ['rogoCpf', 'witness1Cpf', 'witness2Cpf'].forEach((field) => {
      if (candidate[field] && !isValidCpf(candidate[field])) add(field, `${FIELD_LABELS[field]} inválido.`);
    });
  }

  const cpfFields = [['holderCpf', candidate.holderCpf]];
  if (candidate.representationMode !== 'self') cpfFields.push(['representativeCpf', candidate.representativeCpf]);
  if (candidate.illiterate) cpfFields.push(
    ['rogoCpf', candidate.rogoCpf],
    ['witness1Cpf', candidate.witness1Cpf],
    ['witness2Cpf', candidate.witness2Cpf]
  );
  const cpfs = cpfFields.filter(([, value]) => isValidCpf(value));
  const seen = new Map();
  cpfs.forEach(([field, value]) => {
    const digits = onlyDigits(value);
    if (seen.has(digits)) {
      const other = seen.get(digits);
      add(field, `${FIELD_LABELS[field]} não pode repetir ${FIELD_LABELS[other].toLocaleLowerCase('pt-BR')}.`);
    } else {
      seen.set(digits, field);
    }
  });

  if (candidate.representationMode !== 'self' && !candidate.representationRole && allowEmpty === false && !errors.some((error) => error.field === 'representationRole')) {
    add('representationRole', 'Selecione a qualidade da representação.');
  }
  return dedupeErrors(errors);
}

function getRequiredFieldsFor(candidate) {
  const fields = ['benefitId', 'holderName', 'holderCpf', 'holderPhone', 'address', 'addressNumber', 'neighborhood', 'city', 'stateUf'];
  if (candidate.representationMode !== 'self') fields.push('representationRole', 'representativeName', 'representativeCpf');
  if (candidate.illiterate) fields.push('rogoName', 'rogoCpf', 'witness1Name', 'witness1Cpf', 'witness2Name', 'witness2Cpf');
  return fields;
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

function renderErrors(errors) {
  $$('[data-field-wrap]').forEach((wrapper) => wrapper.classList.remove('has-error'));
  $$('[data-error-for]').forEach((element) => { element.textContent = ''; });
  errors.forEach((error) => {
    const wrapper = $(`[data-field-wrap="${error.field}"]`);
    const output = $(`[data-error-for="${error.field}"]`);
    if (wrapper) wrapper.classList.add('has-error');
    if (output && !output.textContent) output.textContent = error.message;
  });
}

function validateCurrent({ allowEmpty = false, reveal = true } = {}) {
  currentErrors = validateState(state, { allowEmpty });
  if (reveal) renderErrors(currentErrors);
  renderReview();
  return currentErrors.length === 0;
}

function completionPercent() {
  const required = getRequiredFields();
  const completed = required.filter((field) => String(state[field] ?? '').trim()).length;
  return Math.round((completed / Math.max(required.length, 1)) * 100);
}

function stepIsComplete(step) {
  if (step === 'benefit') return Boolean(state.benefitId);
  if (step === 'representation') return state.representationMode === 'self' || Boolean(state.representationRole);
  if (step === 'data') {
    const dataFields = getRequiredFields().filter((field) => !['benefitId', 'representationRole'].includes(field));
    return dataFields.every((field) => String(state[field] ?? '').trim()) && validateState(state).filter((error) => dataFields.includes(error.field)).length === 0;
  }
  if (step === 'documents') return Boolean(state.benefitId);
  if (step === 'review') return validateState(state).length === 0;
  return false;
}

function updateProgress() {
  const percent = completionPercent();
  $('#completionLabel').textContent = `${percent}%`;
  $('#completionBar').style.width = `${percent}%`;
  const statusLabels = {
    benefit: state.benefitId ? getBenefit(state.benefitId).name : 'Pendente',
    representation: state.representationMode === 'self' ? 'Titular' : (getRepresentationRole(state.representationRole)?.label || 'Pendente'),
    data: stepIsComplete('data') ? 'Completo' : 'Pendente',
    documents: checklistItems.length ? `${checkedChecklist.size}/${checklistItems.length} separados` : 'Checklist',
    review: stepIsComplete('review') ? 'Pronto' : 'Pendente'
  };
  STEP_ORDER.forEach((step) => {
    const link = $(`[data-step-target="${step}"]`);
    link.classList.toggle('is-complete', stepIsComplete(step));
    const output = $(`#step${step[0].toUpperCase()}${step.slice(1)}Status`);
    if (output) output.textContent = statusLabels[step];
  });
}

function setStep(step, { focus = true } = {}) {
  if (!STEP_ORDER.includes(step)) return;
  state.activeStep = step;
  $$('.step-section').forEach((section) => section.classList.toggle('is-active', section.dataset.step === step));
  $$('.step-link').forEach((link) => link.classList.toggle('is-active', link.dataset.stepTarget === step));
  const index = STEP_ORDER.indexOf(step);
  $('#previousStep').disabled = index === 0;
  $('#nextStep').hidden = step === 'review';
  $('#generatePdf').hidden = step !== 'review';
  if (focus) {
    const heading = $(`[data-step="${step}"] h1`);
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }
  if (window.innerWidth < 1200) closeMobilePanel();
  updateProgress();
  if (step === 'review') renderErrors(currentErrors);
}

function updateConditionalUi() {
  const represented = state.representationMode !== 'self';
  $('#representationRoleWrap').hidden = !represented;
  $('#representativeFields').hidden = !represented;
  $('#witnessFields').hidden = !state.illiterate;
  $('#representativeHeading').textContent = state.representationMode === 'assisted' ? 'Dados do assistente legal' : 'Dados do representante legal';
  $('#pensionContext').hidden = !state.benefitId.startsWith('pensao-');

  const role = getRepresentationRole(state.representationRole);
  const roleHint = $('#roleHint');
  if (!represented) roleHint.textContent = '';
  else if (state.representationRole === 'procurador') roleHint.textContent = 'Use “Procurador” somente quando essa for a qualidade da representação perante o INSS, não apenas porque existe advogado outorgado.';
  else if (state.representationRole === 'administrador_provisorio') roleHint.textContent = 'Inclui automaticamente o Termo de Compromisso pelo prazo de seis meses.';
  else roleHint.textContent = role ? `O Termo de Responsabilidade será marcado como “${role.official}”.` : '';

  const docs = resolveDocumentSet(state).map((id) => DOCUMENT_NAMES[id]);
  $('#documentRule').innerHTML = `<b>${docs.length} documentos:</b> ${docs.map(escapeHtml).join(', ')}.`;
  $('#documentRule').hidden = !represented;
}

function renderBenefitGuide({ resetChecks = false } = {}) {
  const hasBenefit = Boolean(state.benefitId);
  const benefit = getBenefit(state.benefitId || BENEFITS[0].id);
  $('#benefitSummary').hidden = !hasBenefit;
  $('#benefitSummaryName').textContent = hasBenefit ? benefit.name : '';
  $('#benefitSummaryText').textContent = hasBenefit ? benefit.summary : '';
  $('#benefitFit').textContent = hasBenefit ? benefit.fit : 'Selecione um benefício para visualizar os critérios.';
  $('#benefitQuestions').innerHTML = hasBenefit
    ? benefit.triageQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')
    : '<li>Selecione um benefício para visualizar as perguntas de triagem.</li>';
  $('#reviewDate').textContent = REVIEW_DATE;
  $('#benefitAlerts').innerHTML = hasBenefit ? benefit.alerts.map((alert) => `<li>${escapeHtml(alert)}</li>`).join('') : '<li>Selecione um benefício para visualizar os alertas.</li>';
  $('#benefitSources').innerHTML = hasBenefit ? benefit.sources.map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener"><span>${escapeHtml(source.label)}</span><i data-lucide="external-link"></i></a>`).join('') : '';
  if (resetChecks) checkedChecklist = new Set();
  checklistItems = hasBenefit ? buildChecklist(state.benefitId, contextForChecklist()) : [];
  checkedChecklist = new Set([...checkedChecklist].filter((index) => index < checklistItems.length));
  renderChecklist();
  refreshIcons($('#benefitSources'));
}

function renderChecklist() {
  const root = $('#checklist');
  if (!checklistItems.length) {
    root.innerHTML = '<p class="field-hint">Selecione um benefício para montar o checklist.</p>';
    $('#checklistProgress').textContent = '0 de 0 separados';
    updateProgress();
    return;
  }
  const categories = [...new Set(checklistItems.map((item) => item.category))];
  root.innerHTML = categories.map((category) => {
    const items = checklistItems.map((item, index) => ({ ...item, index })).filter((item) => item.category === category);
    return `<section class="checklist-group"><h3>${escapeHtml(category)}</h3>${items.map((item) => `<label class="check-item"><input type="checkbox" data-check-index="${item.index}" ${checkedChecklist.has(item.index) ? 'checked' : ''}><span>${escapeHtml(item.text)}</span></label>`).join('')}</section>`;
  }).join('');
  $('#checklistProgress').textContent = `${checkedChecklist.size} de ${checklistItems.length} separados`;
  updateProgress();
}

function docHeader() {
  return `<header class="doc-header"><img src="logo.png" alt=""><span>Menezes Advocacia &amp; Consultoria Jurídica</span></header>`;
}

function docFooter(page, total) {
  return `<footer class="doc-footer"><span>Av. Ascendino Melo, nº 297, Shopping Itatiaia, Centro, Vitória da Conquista - BA<br>Telefone: 77 99927-1876 · E-mail: menezesadv49@gmail.com</span><span class="page-number">${page} de ${total}</span></footer>`;
}

function holderTable(title = 'Outorgante') {
  return `<div class="data-table">
    <div class="data-table-title">${escapeHtml(title)}</div>
    <div class="data-row">
      <div class="data-cell c7"><small>Nome completo</small><b>${display(upper(state.holderName))}</b></div>
      <div class="data-cell c3"><small>CPF</small><b>${display(state.holderCpf, '---.---.---.--')}</b></div>
      <div class="data-cell c2"><small>RG</small><b>${display(state.holderRg, '--')}</b></div>
    </div>
    <div class="data-row">
      <div class="data-cell c4"><small>Profissão</small><b>${display(upper(state.holderProfession), '--')}</b></div>
      <div class="data-cell c3"><small>Estado civil</small><b>${display(upper(state.holderCivilStatus), '--')}</b></div>
      <div class="data-cell c5"><small>Telefone</small><b>${display(state.holderPhone, '--')}</b></div>
    </div>
    <div class="data-row">
      <div class="data-cell c6"><small>Endereço</small><b>${display(upper(state.address))}</b></div>
      <div class="data-cell c2"><small>Número</small><b>${display(upper(state.addressNumber))}</b></div>
      <div class="data-cell c4"><small>Bairro</small><b>${display(upper(state.neighborhood))}</b></div>
    </div>
    <div class="data-row">
      <div class="data-cell c9"><small>Município</small><b>${display(upper(state.city))}</b></div>
      <div class="data-cell c3"><small>UF</small><b>${display(upper(state.stateUf), '--')}</b></div>
    </div>
  </div>`;
}

function representativeTable() {
  const role = getRepresentationRole(state.representationRole);
  const title = state.representationMode === 'assisted' ? 'Assistente legal' : 'Representante legal';
  return `<div class="data-table" style="margin-top:3mm">
    <div class="data-table-title">${title}</div>
    <div class="data-row">
      <div class="data-cell c7"><small>Nome completo</small><b>${display(upper(state.representativeName))}</b></div>
      <div class="data-cell c3"><small>CPF</small><b>${display(state.representativeCpf, '---.---.---.--')}</b></div>
      <div class="data-cell c2"><small>RG</small><b>${display(state.representativeRg, '--')}</b></div>
    </div>
    <div class="data-row"><div class="data-cell c12"><small>Qualidade</small><b>${display(upper(role?.official), '--')}</b></div></div>
  </div>`;
}

function signatureDate() {
  const today = nowInPortuguese();
  return `${display(upper(state.city), 'CIDADE')}, ${display(upper(state.stateUf), 'UF')} - ${today.day} de ${today.month} de ${today.year}.`;
}

function signatureBlock(label) {
  if (state.illiterate) return rogoBlock(label);
  if (state.representationMode === 'assisted') {
    return `<div class="signature-area"><div class="date-line">${signatureDate()}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12mm"><div><div class="signature-line"></div><div class="signature-caption">Outorgante assistido</div></div><div><div class="signature-line"></div><div class="signature-caption">Assistente legal</div></div></div></div>`;
  }
  return `<div class="signature-area"><div class="date-line">${signatureDate()}</div><div class="signature-line"></div><div class="signature-caption">${escapeHtml(label)}</div></div>`;
}

function miniValue(label, value, fallback = '--') {
  return `<div class="mini-field"><small>${escapeHtml(label)}</small><b>${display(value, fallback)}</b></div>`;
}

function rogoBlock(label) {
  return `<div class="signature-area"><div class="date-line">${signatureDate()}</div></div>
  <div class="rogo-area">
    <div class="rogo-column">
      <div class="rogo-title">Assinatura a rogo do ${escapeHtml(label)}</div>
      <div class="short-sign-line"></div>
      <div>${display(upper(state.rogoName), 'NOME DE QUEM ASSINA A ROGO')}</div>
      <div class="rogo-meta">${miniValue('CPF', state.rogoCpf)}${miniValue('RG', state.rogoRg)}</div>
      <div class="fingerprint"></div><small>Impressão digital - polegar direito</small>
    </div>
    <div class="rogo-column">
      <div class="witness"><div class="rogo-title">1ª testemunha</div><div class="short-sign-line"></div><div>${display(upper(state.witness1Name), 'NOME')}</div><div class="rogo-meta">${miniValue('CPF', state.witness1Cpf)}${miniValue('RG', state.witness1Rg)}</div></div>
      <div class="witness"><div class="rogo-title">2ª testemunha</div><div class="short-sign-line"></div><div>${display(upper(state.witness2Name), 'NOME')}</div><div class="rogo-meta">${miniValue('CPF', state.witness2Cpf)}${miniValue('RG', state.witness2Rg)}</div></div>
    </div>
  </div>`;
}

function buildProcuracao(page, total) {
  const represented = state.representationMode !== 'self';
  const role = getRepresentationRole(state.representationRole);
  const signingLabel = state.representationMode === 'self' ? 'Outorgante' : (state.representationMode === 'assisted' ? 'Outorgante e assistente legal' : `Representante legal${role ? ` - ${role.official}` : ''}`);
  return `<section class="print-sheet" data-document="procuracao"><article class="paper">
    ${docHeader()}
    <div class="doc-body">
      <h2 class="doc-title">Procuração <em>Ad Judicia et Extra</em></h2>
      ${holderTable(represented ? 'Outorgante representado ou assistido' : 'Outorgante')}
      ${represented ? representativeTable() : ''}
      <p class="doc-paragraph compact"><b>OUTORGADO: CLAYTON GONÇALVES MENEZES</b>, advogado inscrito na OAB/BA sob o nº 49.167, com endereço profissional na Av. Ascendino Melo nº 297, Shopping Itatiaia, Menezes Advocacia, Centro, Vitória da Conquista - BA.</p>
      <div class="doc-section-title">Poderes</div>
      <p class="doc-paragraph compact">O Outorgante, por este instrumento de mandato, confere os poderes da cláusula <em>ad judicia et extra</em>, inclusive perante a administração pública direta e indireta, o INSS e qualquer juízo, comarca, instância ou Tribunal, para praticar os atos necessários ao acompanhamento de ações judiciais e procedimentos administrativos; receber valores em seu nome; renunciar ao excedente do teto dos Juizados Especiais Federais; assinar declaração de hipossuficiência; requerer isenção de imposto de renda e gratuidade da justiça; dar e receber quitação; negociar débitos; suscitar incidentes e exceções; transigir; aceitar proposta de acordo; firmar compromissos; receber citações e intimações; desistir; substabelecer com ou sem reserva; bem como levantar e sacar RPV, precatórios e alvarás e acessar informações necessárias do Meu INSS/GOV.BR, observados os limites legais e a finalidade deste mandato.</p>
      ${signatureBlock(signingLabel)}
    </div>
    ${docFooter(page, total)}
  </article></section>`;
}

function buildAnexo(page, total) {
  const benefit = getBenefit(state.benefitId || BENEFITS[0].id);
  const represented = state.representationMode !== 'self';
  const actor = represented ? (state.representationMode === 'assisted' ? 'assistente legal' : 'representante legal') : 'outorgante';
  return `<section class="print-sheet" data-document="anexo"><article class="paper">
    ${docHeader()}
    <div class="doc-body term-body">
      <h2 class="doc-title">Termo de Representação e Autorização de Acesso às Informações Previdenciárias</h2>
      ${holderTable('Outorgante')}
      ${represented ? representativeTable() : ''}
      <p class="doc-paragraph compact">Eu, ${represented ? `${actor} acima qualificado(a), na condição de representante do(a) outorgante acima identificado(a),` : 'outorgante acima qualificado(a),' } autorizo o advogado <b>CLAYTON GONÇALVES MENEZES</b>, OAB/BA nº <b>49.167</b>, a acessar somente as informações pessoais necessárias à preparação, instrução e acompanhamento do requerimento abaixo indicado perante o INSS.</p>
      <div class="request-box">
        <div class="request-title">I - Requerimento</div>
        <div class="request-item"><span class="print-check">✓</span><div class="benefit-line">${display(upper(state.benefitId ? benefit.name : ''), 'BENEFÍCIO NÃO SELECIONADO')}</div></div>
        <div class="request-item"><span class="print-check">✓</span><span>Atualizações para manutenção do benefício e outros serviços relacionados, na modalidade de atendimento à distância, bem como preparação e instrução de requerimentos para análise pelo INSS.</span></div>
        <div class="request-item"><span class="print-check">✓</span><span>Orientações e informações sobre as formas de acesso aos serviços digitais do INSS.</span></div>
      </div>
      <p class="doc-paragraph compact">O mandatário poderá prestar informações, acompanhar o requerimento, cumprir exigências, ter vista e tomar ciência de decisões, sempre no limite dos poderes conferidos e das informações necessárias ao serviço indicado.</p>
      <p class="doc-paragraph compact">Este termo é válido por 60 (sessenta) dias, contados da assinatura, sem prejuízo da revogação anterior pelo outorgante.</p>
      ${signatureBlock(actor)}
    </div>
    ${docFooter(page, total)}
  </article></section>`;
}

function representationOptions() {
  return `<div class="representation-options">${REPRESENTATION_ROLES.map((role) => `<div class="representation-option"><span class="print-check">${state.representationRole === role.id ? '✓' : ''}</span><span>${escapeHtml(role.official)}</span></div>`).join('')}</div>`;
}

function buildResponsabilidade(page, total) {
  const label = state.representationMode === 'assisted' ? 'Assistente legal' : 'Representante legal';
  return `<section class="print-sheet" data-document="responsabilidade"><article class="paper">
    ${docHeader()}
    <div class="doc-body term-body">
      <h2 class="doc-title">Termo de Responsabilidade</h2>
      ${representativeTable()}
      <p class="doc-paragraph">Eu, acima qualificado(a), pelo presente Termo de Responsabilidade, exercendo a representação indicada, comprometo-me a comunicar ao INSS qualquer evento que possa anular a representação do beneficiário abaixo relacionado, no prazo de 30 (trinta) dias a contar da data em que o evento ocorrer.</p>
      ${holderTable('Beneficiário representado')}
      ${representationOptions()}
      <div class="term-warning">Os eventos a comunicar incluem o óbito do titular ou dependente do benefício e a cessação da representação legal. O descumprimento poderá acarretar devolução de valores recebidos indevidamente e responsabilização nos termos dos arts. 171 e 299 do Código Penal.</div>
      ${signatureBlock(label)}
    </div>
    ${docFooter(page, total)}
  </article></section>`;
}

function buildCompromisso(page, total) {
  return `<section class="print-sheet" data-document="compromisso"><article class="paper">
    ${docHeader()}
    <div class="doc-body term-body">
      <h2 class="doc-title">Termo de Compromisso</h2>
      ${representativeTable()}
      ${holderTable('Beneficiário representado')}
      <p class="doc-paragraph">Eu, acima qualificado(a), declaro para fins de recebimento de benefícios que:</p>
      <p class="doc-paragraph indent"><b>I -</b> represento o(a) beneficiário(a) acima identificado(a), que não está sob responsabilidade dos pais (tutores natos), tutor, curador ou guardião; e</p>
      <p class="doc-paragraph indent"><b>II -</b> estou ciente de que, no prazo de 6 (seis) meses a contar desta data, deverei apresentar documento de representação legal ou comprovante do requerimento ou andamento judicial de representação.</p>
      <p class="doc-paragraph">Se for apresentado apenas o comprovante do requerimento ou do andamento do processo judicial, a comprovação deverá ser renovada a cada seis meses até a expedição do documento judicial que conceda a representação.</p>
      <p class="doc-paragraph"><b>Concordo em assumir o compromisso deste termo.</b></p>
      ${signatureBlock('Administrador provisório')}
    </div>
    ${docFooter(page, total)}
  </article></section>`;
}

function buildDocument(id, page, total) {
  if (id === 'procuracao') return buildProcuracao(page, total);
  if (id === 'anexo') return buildAnexo(page, total);
  if (id === 'responsabilidade') return buildResponsabilidade(page, total);
  return buildCompromisso(page, total);
}

function renderDocuments() {
  const documents = resolveDocumentSet(state);
  const stack = $('#documentStack');
  stack.innerHTML = documents.map((id, index) => `<div class="paper-frame" data-frame-document="${id}">${buildDocument(id, index + 1, documents.length)}</div>`).join('');
  $('#documentTabs').innerHTML = documents.map((id, index) => `<button type="button" class="document-tab${index === 0 ? ' is-active' : ''}" data-document-target="${id}" role="tab" aria-selected="${index === 0}"><i data-lucide="${id === 'procuracao' ? 'file-signature' : id === 'anexo' ? 'notebook-tabs' : id === 'responsabilidade' ? 'shield-check' : 'timer-reset'}"></i><span>${DOCUMENT_NAMES[id]}</span></button>`).join('');
  $('#documentCount').textContent = `${documents.length} ${documents.length === 1 ? 'documento' : 'documentos'}`;
  refreshIcons($('#documentTabs'));
  resizePaper();
}

function renderDocumentSet() {
  $('#documentSet').innerHTML = resolveDocumentSet(state).map((id) => `<li>${DOCUMENT_NAMES[id]}</li>`).join('');
}

function renderReview() {
  currentErrors = validateState(state);
  const ready = currentErrors.length === 0;
  const status = $('#reviewStatus');
  status.classList.toggle('is-ready', ready);
  status.innerHTML = ready
    ? '<i data-lucide="badge-check"></i><span><b>Documentos prontos para gerar.</b><br>Confira a prévia antes de abrir a impressão.</span>'
    : `<i data-lucide="circle-alert"></i><span><b>${currentErrors.length} ${currentErrors.length === 1 ? 'pendência' : 'pendências'}.</b><br>Corrija os campos indicados antes de gerar.</span>`;
  $('#reviewList').innerHTML = ready ? '' : currentErrors.map((error) => `<button type="button" class="review-item" data-review-field="${error.field}"><i data-lucide="circle-x"></i><span>${escapeHtml(error.message)}</span><i data-lucide="chevron-right"></i></button>`).join('');
  renderDocumentSet();
  refreshIcons($('#reviewStatus'));
  refreshIcons($('#reviewList'));
}

function renderAll({ resetChecklist = false } = {}) {
  updateConditionalUi();
  renderBenefitGuide({ resetChecks: resetChecklist });
  renderDocuments();
  renderReview();
  updateProgress();
}

function resizePaper() {
  const stage = $('#paperStage');
  const available = Math.max(stage.clientWidth - 28, 280);
  const paperWidth = 210 * (96 / 25.4);
  const zoom = Math.min(1, Math.max(.34, available / paperWidth));
  $('#documentStack').style.setProperty('--paper-scale', zoom.toFixed(3));
}

function focusDocument(id) {
  const target = $(`[data-document="${id}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.classList.add('is-flashing');
  window.setTimeout(() => target.classList.remove('is-flashing'), 950);
  $$('.document-tab').forEach((tab) => {
    const active = tab.dataset.documentTarget === id;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}

function fieldStep(field) {
  if (field === 'benefitId') return 'benefit';
  if (field === 'representationRole') return 'representation';
  return 'data';
}

function focusField(field) {
  setStep(fieldStep(field), { focus: false });
  openMobilePanel();
  window.setTimeout(() => {
    const input = document.getElementById(field);
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  }, 230);
}

function openMobilePanel() {
  if (window.innerWidth < 1200) $('#appShell').classList.add('mobile-panel-open');
}

function closeMobilePanel() {
  $('#appShell').classList.remove('mobile-panel-open');
}

function syncBoundControl(control) {
  const key = control.dataset.bind;
  if (!key) return;
  let value = control.type === 'checkbox' ? control.checked : control.value;
  if (['holderCpf', 'representativeCpf', 'rogoCpf', 'witness1Cpf', 'witness2Cpf'].includes(key)) {
    value = formatCpf(value);
    control.value = value;
  }
  if (key === 'holderPhone') {
    value = formatPhone(value);
    control.value = value;
  }
  if (['holderRg', 'representativeRg', 'rogoRg', 'witness1Rg', 'witness2Rg'].includes(key)) {
    value = onlyDigits(value).slice(0, 14);
    control.value = value;
  }
  if (key === 'stateUf') value = upper(value).slice(0, 2);
  const oldBenefit = state.benefitId;
  state[key] = value;
  touchedFields.add(key);
  dirty = true;
  renderAll({ resetChecklist: key === 'benefitId' && value !== oldBenefit });
  renderErrors(currentErrors.filter((error) => touchedFields.has(error.field)));
}

function wireDataBindings() {
  $$('[data-bind]').forEach((control) => {
    control.addEventListener('input', () => syncBoundControl(control));
    control.addEventListener('change', () => syncBoundControl(control));
    control.addEventListener('blur', () => {
      const key = control.dataset.bind;
      touchedFields.add(key);
      renderErrors(currentErrors.filter((error) => touchedFields.has(error.field)));
    });
  });
  $$('input[name="representationMode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.representationMode = radio.value;
      if (radio.value === 'self') state.representationRole = '';
      $('#representationRole').value = state.representationRole;
      dirty = true;
      renderAll();
    });
  });
}

function copyChecklistText() {
  if (!state.benefitId) return showToast('Selecione um benefício primeiro.', 'error');
  const benefit = getBenefit(state.benefitId);
  const categories = [...new Set(checklistItems.map((item) => item.category))];
  const lines = [`DOCUMENTOS - ${benefit.name.toLocaleUpperCase('pt-BR')}`, ''];
  categories.forEach((category) => {
    lines.push(category.toLocaleUpperCase('pt-BR'));
    checklistItems.filter((item) => item.category === category).forEach((item) => lines.push(`☐ ${item.text}`));
    lines.push('');
  });
  lines.push('A lista pode mudar após a análise do CNIS e dos documentos do caso.');
  navigator.clipboard.writeText(lines.join('\n')).then(() => showToast('Checklist copiado para a área de transferência.', 'success')).catch(() => showToast('Não foi possível copiar o checklist.', 'error'));
}

function prepareChecklistPrint() {
  if (!state.benefitId) return showToast('Selecione um benefício primeiro.', 'error');
  const benefit = getBenefit(state.benefitId);
  const categories = [...new Set(checklistItems.map((item) => item.category))];
  $('#printChecklistSheet').innerHTML = `<h1>Checklist de documentos</h1><p>${escapeHtml(benefit.name)} · revisão jurídica ${REVIEW_DATE}</p>${categories.map((category) => `<h2>${escapeHtml(category)}</h2>${checklistItems.filter((item) => item.category === category).map((item) => `<div class="print-checklist-item"><span class="print-checklist-box"></span><span>${escapeHtml(item.text)}</span></div>`).join('')}`).join('')}`;
  checklistPrintPending = true;
  document.body.classList.add('print-checklist-mode');
  window.print();
}

function runTriage() {
  const form = $('#triageForm');
  const answers = Object.fromEntries($$('input[type="checkbox"]', form).map((input) => [input.name, input.checked]));
  const results = triageBenefits(answers);
  $('#triageResults').innerHTML = results.map((result) => {
    if (!result.id) return `<div class="triage-result"><div><b>Precisa conferir</b><small>${escapeHtml(result.reason)}</small></div></div>`;
    const benefit = getBenefit(result.id);
    return `<div class="triage-result"><div><b>${escapeHtml(benefit.name)}</b><small>${escapeHtml(result.reason)} A conclusão depende dos documentos.</small></div><button type="button" data-select-benefit="${benefit.id}">Selecionar</button></div>`;
  }).join('');
}

function normalPrint() {
  internalPrintAllowed = false;
  if (!validateCurrent({ allowEmpty: false, reveal: true })) {
    setStep('review');
    showToast('Corrija as pendências antes de gerar o PDF.', 'error');
    return;
  }
  window.print();
}

function internalPrint() {
  if (!validateCurrent({ allowEmpty: true, reveal: true })) {
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
  const cancel = () => {
    clearTimeout(timer);
    button.classList.remove('is-holding');
  };
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
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => button.addEventListener(name, cancel));
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
    if (checklistPrintPending || internalPrintAllowed) return;
    const valid = validateState(state).length === 0;
    document.body.classList.toggle('print-validation-blocked', !valid);
  });
  window.addEventListener('afterprint', () => {
    internalPrintAllowed = false;
    checklistPrintPending = false;
    document.body.classList.remove('print-checklist-mode', 'print-validation-blocked');
  });
}

function wireEvents() {
  $('#panelToggle').addEventListener('click', () => {
    const shell = $('#appShell');
    const collapsed = shell.classList.toggle('is-collapsed');
    $('#panelToggle').setAttribute('aria-expanded', String(!collapsed));
    $('#panelToggle').setAttribute('aria-label', collapsed ? 'Expandir painel' : 'Recolher painel');
    $('#panelToggle').title = collapsed ? 'Expandir painel' : 'Recolher painel';
    resizePaper();
  });
  $('#mobilePanelButton').addEventListener('click', openMobilePanel);
  $('#appShell').addEventListener('click', (event) => {
    if (event.target === $('#appShell') && $('#appShell').classList.contains('mobile-panel-open')) closeMobilePanel();
  });
  $$('.step-link').forEach((button) => button.addEventListener('click', () => { setStep(button.dataset.stepTarget); openMobilePanel(); }));
  $$('[data-go-step]').forEach((button) => button.addEventListener('click', () => setStep(button.dataset.goStep)));
  $('#previousStep').addEventListener('click', () => setStep(STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(state.activeStep) - 1)]));
  $('#nextStep').addEventListener('click', () => setStep(STEP_ORDER[Math.min(STEP_ORDER.length - 1, STEP_ORDER.indexOf(state.activeStep) + 1)]));
  $('#documentTabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-document-target]');
    if (button) focusDocument(button.dataset.documentTarget);
  });
  $('#checklist').addEventListener('change', (event) => {
    const input = event.target.closest('[data-check-index]');
    if (!input) return;
    const index = Number(input.dataset.checkIndex);
    if (input.checked) checkedChecklist.add(index); else checkedChecklist.delete(index);
    renderChecklist();
  });
  $$('.guide-tabs button').forEach((button) => button.addEventListener('click', () => {
    $$('.guide-tabs button').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    $$('.guide-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.guidePanel === button.dataset.guideTab));
  }));
  $('#copyChecklist').addEventListener('click', copyChecklistText);
  $('#printChecklist').addEventListener('click', prepareChecklistPrint);
  $('#reviewList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-review-field]');
    if (button) focusField(button.dataset.reviewField);
  });
  $('#openTriage').addEventListener('click', () => { $('#triageDialog').showModal(); refreshIcons($('#triageDialog')); });
  $('#runTriage').addEventListener('click', runTriage);
  $('#triageResults').addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-benefit]');
    if (!button) return;
    state.benefitId = button.dataset.selectBenefit;
    $('#benefitId').value = state.benefitId;
    dirty = true;
    $('#triageDialog').close();
    renderAll({ resetChecklist: true });
  });
  $('#confirmInternalPrint').addEventListener('click', internalPrint);
  $('#clearData').addEventListener('click', () => {
    if (!window.confirm('Limpar todos os dados preenchidos nesta página?')) return;
    Object.assign(state, EMPTY_STATE);
    checkedChecklist = new Set();
    touchedFields = new Set();
    dirty = false;
    $$('[data-bind]').forEach((control) => {
      const key = control.dataset.bind;
      if (control.type === 'checkbox') control.checked = Boolean(state[key]); else control.value = state[key] ?? '';
    });
    $$('input[name="representationMode"]').forEach((radio) => { radio.checked = radio.value === 'self'; });
    setStep('benefit', { focus: false });
    renderErrors([]);
    renderAll({ resetChecklist: true });
    showToast('Dados removidos.', 'success');
  });
  $$('.view-switcher button').forEach((button) => button.addEventListener('click', () => {
    $$('.view-switcher button').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    if (button.dataset.mobileView === 'form') { openMobilePanel(); return; }
    if (button.dataset.mobileView === 'checklist') { setStep('documents', { focus: false }); openMobilePanel(); return; }
    closeMobilePanel();
  }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobilePanel();
  });
  window.addEventListener('resize', resizePaper);
  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function initialize() {
  populateSelects();
  wireDataBindings();
  wireEvents();
  installLongPress();
  installPrintGuard();
  $('#reviewDate').textContent = REVIEW_DATE;
  setStep('benefit', { focus: false });
  renderAll({ resetChecklist: true });
  refreshIcons();
}

initialize();
