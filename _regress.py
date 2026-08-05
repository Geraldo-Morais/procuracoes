"""Regressao do gerador de procuracoes (arquivo unico index.html).

Dependencias (nao ha requirements.txt: o produto e HTML estatico, isto aqui e
so ferramenta de teste):

    pip install playwright pymupdf
    python -m playwright install chromium

Uso: python _regress.py   (pode rodar de qualquer diretorio)
"""
import sys, pathlib
from playwright.sync_api import sync_playwright

try:
    import fitz  # PyMuPDF: le o PDF gerado pra contar/renderizar paginas
except ImportError:
    sys.exit("PyMuPDF ausente. Instale com: pip install pymupdf")

# Ancorado no proprio arquivo, nao no cwd: rodar de outra pasta nao pode
# apontar pra um index.html qualquer.
HTML = pathlib.Path(__file__).resolve().parent / "index.html"
if not HTML.is_file():
    sys.exit(f"index.html nao encontrado em {HTML}")
URL = HTML.as_uri()
errs = []
def check(cond, msg):
    print(("OK  " if cond else "FAIL") + " " + msg)
    if not cond: errs.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    console_errors = []
    pg.on("console", lambda m: console_errors.append(m.text) if m.type=="error" else None)
    pg.on("pageerror", lambda e: console_errors.append(str(e)))
    pg.goto(URL)
    pg.wait_for_timeout(400)

    # ANEXO X always present & visible
    check(pg.locator("#page-anexox").count()==1, "anexo page exists")
    check(pg.locator("#page-anexox").is_visible(), "anexo page visible (normal)")

    def set_tipo(t):
        pg.wait_for_selector("#tipoSelect", state="attached")
        pg.evaluate("t=>{document.getElementById('tipoSelect').value=t; mudarTipo(t);}", t)
        pg.wait_for_timeout(150)

    # --- normal ---
    set_tipo("normal")
    check(pg.locator("#anexo-rep-box").is_visible()==False, "normal: rep-box hidden")
    check(pg.locator("#anexo-eu-normal").is_visible(), "normal: eu-normal shown")
    check(pg.locator("#anexo-eu-rep").is_visible()==False, "normal: eu-rep hidden")
    cap = pg.locator("#page-anexox .termo-sign-block .js-papel-anexo").first.evaluate("e=>e.textContent")
    check(cap=="Outorgante", f"normal: caption papel = Outorgante (got {cap!r})")
    # assinatura dos termos no formato da procuracao: "OUTORGANTE: ____"
    sig = pg.evaluate("""()=>{
        var b=document.querySelector('#page-anexox .termo-sign-block');
        return {lbl: !!b.querySelector('.assinatura-label'), linha: !!b.querySelector('.assinatura-linha'),
                caption: !!b.querySelector('.termo-sign-caption')};
    }""")
    check(sig['lbl'] and sig['linha'] and not sig['caption'], f"termo: assinatura estilo procuracao (got {sig})")
    # nome das testemunhas e LINHA em branco (igual procuracao), nao input
    tst = pg.evaluate("""()=>{
        var ids=['anexo_t1_nome','anexo_t2_nome','termoresp_t1_nome','termocomp_t2_nome'];
        var inputs = ids.filter(i=>document.getElementById(i)).length;
        var linhas = document.querySelectorAll('.termo-analf-block .testemunha-linha').length;
        return {inputs: inputs, linhas: linhas};
    }""")
    check(tst['inputs']==0 and tst['linhas']==6, f"termos: nome de testemunha = linha (got {tst})")

    # --- incapaz ---
    set_tipo("incapaz")
    check(pg.locator("#anexo-rep-box").is_visible(), "incapaz: rep-box shown")
    check(pg.locator("#anexo-eu-rep").is_visible(), "incapaz: eu-rep shown")
    check(pg.locator("#anexo-eu-normal").is_visible()==False, "incapaz: eu-normal hidden")
    t = pg.locator("#anexo-rep-box .js-papel-anexo").first.evaluate("e=>e.textContent")
    check(t=="Representante Legal", f"incapaz: rep-box title (got {t!r})")
    mn = pg.locator("#page-anexox .js-papel-anexo-min").first.inner_text()
    check(mn=="representante legal", f"incapaz: min papel (got {mn!r})")
    # termos default-marked
    check(pg.locator("#page-termoresp").evaluate("e=>e.classList.contains('show')"), "incapaz: termoresp shown by default")
    check(pg.locator("#page-termocomp").evaluate("e=>e.classList.contains('show')"), "incapaz: termocomp shown by default")

    # --- relativo ---
    set_tipo("relativo")
    check(pg.locator("#anexo-rep-box").is_visible(), "relativo: rep-box shown")
    t2 = pg.locator("#anexo-rep-box .js-papel-anexo").first.evaluate("e=>e.textContent")
    check(t2=="Assistente Legal", f"relativo: rep-box title (got {t2!r})")

    # --- sync: outorgante nome/cpf -> anexo ---
    set_tipo("normal")
    pg.fill("#nome", "Fulano De Tal")
    pg.locator("#nome").blur(); pg.wait_for_timeout(120)
    an = pg.input_value("#anexo_nome")
    check(an.upper()=="FULANO DE TAL", f"sync nome->anexo_nome (got {an!r})")
    pg.fill("#cpf", "12345678909")
    pg.locator("#cpf").blur(); pg.wait_for_timeout(120)
    ac = pg.input_value("#anexo_cpf")
    check(ac=="123.456.789-09", f"sync cpf->anexo_cpf (got {ac!r})")

    # --- espelhos: campo de termo e somente leitura e leva a procuracao ---
    set_tipo("incapaz")
    pg.evaluate("setAnalfabetoAll(true)"); pg.wait_for_timeout(250)
    esp = pg.evaluate("""()=>{
        var ids=['termocomp_benef_nome','termoresp_nome','anexo_nome','anexo_endereco',
                 'anexo_local_cidade','termoresp_t1_cpf'];
        var o={};
        ids.forEach(function(i){var e=document.getElementById(i);
            o[i] = e ? (e.readOnly && e.classList.contains('js-espelho') ? e.dataset.dono : 'EDITAVEL') : 'AUSENTE';});
        return o;}""")
    check(all(v not in ("EDITAVEL", "AUSENTE") for v in esp.values()),
          f"espelhos: campos dos termos sao somente leitura (got {esp})")
    check(esp.get("anexo_endereco") == "endereco" and esp.get("termocomp_benef_nome") == "nome",
          f"espelhos: apontam pro campo certo da procuracao (got {esp})")
    # o campo do Termo de Beneficio (sem contraparte na procuracao) segue editavel
    livre = pg.evaluate("()=>{var e=document.getElementById('anexo_beneficio');"
                        " return !e.readOnly && !e.classList.contains('js-espelho');}")
    check(livre, "espelhos: o tipo de beneficio continua editavel no proprio termo")
    # clicar num espelho manda o foco pro dono, na procuracao
    pg.evaluate("()=>document.getElementById('anexo_nome').focus()")
    pg.wait_for_timeout(600)
    foco = pg.evaluate("()=>document.activeElement && document.activeElement.id")
    check(foco == "nome", f"espelhos: focar o espelho leva ao campo da procuracao (got {foco!r})")
    pg.evaluate("setAnalfabetoAll(false)")
    pg.goto(URL); pg.wait_for_timeout(350)

    # --- trocar de tipo leva o que ja foi digitado ---
    set_tipo("incapaz")
    pg.fill("#rep_nome", "Pedro Da Silva"); pg.locator("#rep_nome").blur()
    pg.fill("#rep_cpf", "52601815906"); pg.locator("#rep_cpf").blur()
    pg.fill("#rep_qualidade", "Curador"); pg.locator("#rep_qualidade").blur()
    pg.wait_for_timeout(250)
    set_tipo("relativo"); pg.wait_for_timeout(300)
    mig = {i: pg.input_value("#" + i) for i in ["assist_nome", "assist_cpf", "assist_qualidade"]}
    check(mig["assist_nome"] == "PEDRO DA SILVA" and mig["assist_cpf"] == "526.018.159-06",
          f"trocar incapaz->relativo leva representante para assistente (got {mig})")
    pg.goto(URL); pg.wait_for_timeout(350)

    # --- lista fechada: estado civil e qualidade encaixam na opcao certa ---
    set_tipo("normal")
    pg.fill("#estado_civil", "solteria"); pg.locator("#estado_civil").blur(); pg.wait_for_timeout(400)
    ec = pg.input_value("#estado_civil")
    check(ec.upper() == "SOLTEIRA", f"estado civil digitado errado encaixa na lista (got {ec!r})")
    pg.goto(URL); pg.wait_for_timeout(350)

    # --- telefone NAO e obrigatorio ---
    set_tipo("normal")
    pg.evaluate("preencherStub()"); pg.wait_for_timeout(250)
    pg.fill("#telefone", ""); pg.locator("#telefone").blur(); pg.wait_for_timeout(120)
    tel_errs = pg.evaluate("validateForm()")
    check(len(tel_errs) == 0, f"telefone vazio nao bloqueia (errors={tel_errs})")
    pg.fill("#telefone", "11111111111"); pg.locator("#telefone").blur(); pg.wait_for_timeout(120)
    tel_bad = pg.evaluate("validateForm()")
    check(any("elefone" in e for e in tel_bad), f"telefone implausivel ainda bloqueia (errors={tel_bad})")
    pg.goto(URL); pg.wait_for_timeout(350)

    # --- benefit-type mandatory blocks PDF ---
    set_tipo("normal")
    pg.evaluate("document.getElementById('anexo_beneficio').value=''")
    errs_v = pg.evaluate("validateForm()")
    has_benef_err = any("benef" in e.lower() or "ANEXO X" in e for e in errs_v)
    check(has_benef_err, f"validateForm flags missing benefit (errors={errs_v})")
    pg.select_option("#anexo_beneficio", label="Aposentadoria por Idade Rural")
    pg.wait_for_timeout(80)
    errs_v2 = pg.evaluate("validateForm()")
    still = any("benef" in e.lower() for e in errs_v2)
    check(not still, f"benefit set -> no benefit error (errors={errs_v2})")

    # --- 'Outro' reveals free field ---
    pg.select_option("#anexo_beneficio", label="Outro (especificar):")
    pg.wait_for_timeout(80)
    check(pg.locator("#anexo_beneficio_outro").is_visible(), "Outro reveals free field")

    # --- pagination via PDF ---
    def pdf_pages(tipo):
        # O gate de beforeprint troca o documento por um aviso quando a validacao
        # falha (1 pagina). Pra contar folhas, o formulario precisa estar valido.
        pg.evaluate("t=>{document.getElementById('tipoSelect').value=t; mudarTipo(t);}", tipo)
        pg.evaluate("preencherStub()")
        pg.select_option("#anexo_beneficio", label="Aposentadoria por Idade Rural")
        pg.wait_for_timeout(350)
        assert pg.evaluate("validateForm().length") == 0, f"{tipo}: form invalido antes do PDF"
        out = str(HTML.parent / f"_r_{tipo}.pdf")
        pg.pdf(path=out, format="A4", print_background=True)
        d = fitz.open(out); n = d.page_count; d.close()
        return n
    for tipo, exp in [("normal",2),("incapaz",4),("relativo",4)]:
        n = pdf_pages(tipo)
        check(n==exp, f"{tipo}: PDF pages = {exp} (got {n})")

    # --- stub fill (hold button) fills all + passes validation ---
    set_tipo("incapaz")
    pg.evaluate("preencherStub()")
    pg.wait_for_timeout(300)
    stub_errs = pg.evaluate("validateForm()")
    check(len(stub_errs)==0, f"preencherStub -> validateForm empty (got {stub_errs})")
    check(pg.input_value("#anexo_nome")!="" and pg.input_value("#rep_cpf")!="", "stub filled outorgante + representante")

    # --- headers use the office logo (procuracao style: .header with logo) ---
    logos = pg.evaluate("()=>document.querySelectorAll('.page-anexo .header, .page-termo .header').length")
    check(logos==3, f"3 procuracao-style logo headers on anexo+termos (got {logos})")
    inss = pg.evaluate("()=>document.body.innerHTML.includes('INSTITUTO NACIONAL DO SEGURO SOCIAL')")
    check(inss==False, "no INSS institutional header text remains")

    # --- easter egg: holding Revogar link fills stub (no visible test button) ---
    no_btn = pg.evaluate("()=>!document.getElementById('stubFillBtn')")
    check(no_btn, "no visible stub button (easter egg only)")
    egg = pg.evaluate("()=>!!document.getElementById('revogarLink')")
    check(egg, "revogarLink easter-egg element present")

    # --- UNIFIED analfabeto: marking ANY toggle shows the rogo block in ALL ---
    set_tipo("incapaz")
    pg.evaluate("setAnalfabetoAll(false)")  # reset
    pg.wait_for_timeout(120)
    # mark via the ANEXO toggle -> procuracao + both termos must all expand
    pg.evaluate("var e=document.getElementById('anexo_analfabeto_toggle'); e.checked=true; e.dispatchEvent(new Event('change',{bubbles:true}));")
    pg.wait_for_timeout(200)
    st = pg.evaluate("""()=>({
        proc: document.getElementById('analf_incapaz_block').classList.contains('show'),
        anexo: document.getElementById('anexo_analf_block').classList.contains('show'),
        tr: document.getElementById('termoresp_analf_block').classList.contains('show'),
        tc: document.getElementById('termocomp_analf_block').classList.contains('show'),
        pc: document.getElementById('analf_incapaz_toggle').checked,
        tcc: document.getElementById('termocomp_analfabeto_toggle').checked
    })""")
    check(all([st['proc'],st['anexo'],st['tr'],st['tc'],st['pc'],st['tcc']]), f"mark anexo -> analfabeto expands in ALL docs (got {st})")
    # unmark via a TERMO toggle -> all collapse
    pg.evaluate("var e=document.getElementById('termocomp_analfabeto_toggle'); e.checked=false; e.dispatchEvent(new Event('change',{bubbles:true}));")
    pg.wait_for_timeout(200)
    st2 = pg.evaluate("""()=>({
        proc: document.getElementById('analf_incapaz_block').classList.contains('show'),
        anexo: document.getElementById('anexo_analf_block').classList.contains('show'),
        tr: document.getElementById('termoresp_analf_block').classList.contains('show')
    })""")
    check(not any([st2['proc'],st2['anexo'],st2['tr']]), f"unmark termo -> analfabeto collapses in ALL docs (got {st2})")

    # --- semaforo das abas: verde / amarelo / vermelho ---
    def tab_st():
        return pg.evaluate("""()=>{var o={};
          document.querySelectorAll('#docTabs .doc-tab').forEach(function(t){ if(t.hidden) return;
            o[t.getAttribute('data-doc')] = t.classList.contains('st-ok')?'ok'
              : t.classList.contains('st-erro')?'erro'
              : t.classList.contains('st-pend')?'pend':'-';});
          return o;}""")
    pg.goto(URL); pg.wait_for_timeout(400)
    set_tipo("incapaz")
    pg.wait_for_timeout(300)
    s0 = tab_st()
    check(all(v == "pend" for v in s0.values()) and len(s0) == 4,
          f"semaforo: form vazio = tudo amarelo (got {s0})")
    pg.evaluate("preencherStub()"); pg.wait_for_timeout(500)
    s1 = tab_st()
    check(all(v == "ok" for v in s1.values()), f"semaforo: stub completo = tudo verde (got {s1})")
    pg.evaluate("()=>{var e=document.getElementById('anexo_beneficio'); e.value='';"
                " onAnexoBeneficioChange(); e.dispatchEvent(new Event('change',{bubbles:true}));}")
    pg.wait_for_timeout(400)
    s2 = tab_st()
    check(s2.get("page-anexox") == "pend" and s2.get("page-procuracao") == "ok",
          f"semaforo: falta so o beneficio -> so o Termo de Beneficio amarela (got {s2})")
    pg.evaluate("runPdfValidation()"); pg.wait_for_timeout(400)
    s3 = tab_st()
    check(s3.get("page-anexox") == "erro", f"semaforo: tentou gerar PDF -> vermelho (got {s3})")
    pg.evaluate("fecharValModal()")
    pg.select_option("#anexo_beneficio", label="Aposentadoria por Idade Rural"); pg.wait_for_timeout(400)
    s4 = tab_st()
    check(all(v == "ok" for v in s4.values()), f"semaforo: corrigido -> volta ao verde (got {s4})")
    # profissao coerente com o beneficio (rural -> LAVRADOR/A)
    prof = pg.input_value("#profissao")
    check(prof.upper().startswith("LAVRADOR"), f"beneficio rural -> profissao lavrador (got {prof!r})")

    check(len(console_errors)==0, f"no console errors ({console_errors[:3]})")
    b.close()

print("\n" + ("ALL PASS" if not errs else f"{len(errs)} FAILURES"))
sys.exit(1 if errs else 0)
