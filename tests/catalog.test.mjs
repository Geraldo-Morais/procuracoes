import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENEFITS,
  REPRESENTATION_ROLES,
  REVIEW_DATE,
  buildChecklist,
  resolveDocumentSet,
  triageBenefits
} from '../assets/benefits.js';

test('catálogo contém todas as rotas e o schema jurídico', () => {
  assert.equal(BENEFITS.length, 20);
  assert.equal(new Set(BENEFITS.map(({ id }) => id)).size, BENEFITS.length);

  for (const benefit of BENEFITS) {
    assert.ok(benefit.id);
    assert.ok(benefit.name);
    assert.ok(benefit.summary);
    assert.ok(benefit.fit);
    assert.ok(benefit.triageQuestions.length > 0, `${benefit.id} sem perguntas de triagem`);
    assert.ok(benefit.minimumFormal.length > 0, `${benefit.id} sem mínimo formal`);
    assert.ok(benefit.materialEvidence.length > 0, `${benefit.id} sem prova material`);
    assert.ok(Array.isArray(benefit.conditionalDocuments));
    assert.ok(benefit.recommendations.length > 0);
    assert.ok(benefit.alerts.length > 0);
    assert.ok(benefit.sources.length > 0);
    assert.equal(benefit.reviewedAt, REVIEW_DATE);
    assert.ok(benefit.validUntil === null || /^\d{2}\/\d{2}\/\d{4}$/.test(benefit.validUntil));
    benefit.sources.forEach(({ url }) => assert.match(url, /^https:\/\//));
  }
});

test('enum de representação usa somente as seis opções masculinas', () => {
  assert.deepEqual(
    REPRESENTATION_ROLES.map(({ id }) => id),
    ['tutor_nato', 'tutor_legal', 'curador', 'guardiao', 'administrador_provisorio', 'procurador']
  );
  assert.ok(REPRESENTATION_ROLES.every(({ label }) => !/procuradora|curadora|genitora|tutora/i.test(label)));
});

test('matriz documental gera duas, três ou quatro páginas', () => {
  assert.deepEqual(resolveDocumentSet({ representationMode: 'self', representationRole: '' }), ['procuracao', 'anexo']);
  assert.deepEqual(resolveDocumentSet({ representationMode: 'represented', representationRole: 'tutor_nato' }), ['procuracao', 'anexo', 'responsabilidade']);
  assert.deepEqual(resolveDocumentSet({ representationMode: 'assisted', representationRole: 'tutor_nato' }), ['procuracao', 'anexo', 'responsabilidade']);
  assert.deepEqual(resolveDocumentSet({ representationMode: 'represented', representationRole: 'administrador_provisorio' }), ['procuracao', 'anexo', 'responsabilidade', 'compromisso']);

  for (const role of REPRESENTATION_ROLES.filter(({ id }) => id !== 'administrador_provisorio')) {
    assert.ok(!resolveDocumentSet({ representationMode: 'represented', representationRole: role.id }).includes('compromisso'));
  }
});

test('pensão rural muda o checklist conforme o benefício anterior do falecido', () => {
  const beneficiary = buildChecklist('pensao-rural', { deceasedWasBeneficiary: true, dependentType: 'spouse_married' }).map(({ text }) => text).join('\n');
  const noBenefit = buildChecklist('pensao-rural', { deceasedWasBeneficiary: false, dependentType: 'stable_union' }).map(({ text }) => text).join('\n');
  assert.match(beneficiary, /Carta de concessão ou extrato do benefício rural/);
  assert.doesNotMatch(beneficiary, /CAF\/DAP/);
  assert.match(noBenefit, /CAF\/DAP/);
  assert.match(noBenefit, /24 meses anteriores ao óbito/);
});

test('catálogo evita atalhos jurídicos proibidos no plano', () => {
  const serialized = JSON.stringify(BENEFITS);
  assert.doesNotMatch(serialized, /laudo.{0,20}(últimos|ultimos) 90 dias/i);
  assert.match(serialized, /Despesa comum de mercado não é abatimento automático/);
  assert.match(serialized, /18 contribuições e os dois anos de casamento/);
});

test('triagem só usa estados não conclusivos', () => {
  const possible = triageBenefits({ death: true, rural: true });
  assert.equal(possible[0].id, 'pensao-rural');
  assert.equal(possible[0].status, 'possivel');
  const uncertain = triageBenefits({});
  assert.equal(uncertain[0].status, 'precisa_conferir');
  assert.ok([...possible, ...uncertain].every(({ status }) => ['possivel', 'precisa_conferir', 'incompativel'].includes(status)));
});
