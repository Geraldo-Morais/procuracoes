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

    # --- sync REVERSO: preencher a ULTIMA folha alimenta todas as outras ---
    set_tipo("incapaz")
    pg.evaluate("setAnalfabetoAll(true)"); pg.wait_for_timeout(150)
    def setf(i, v):
        pg.fill("#"+i, v); pg.locator("#"+i).blur(); pg.wait_for_timeout(110)
    setf("termocomp_benef_nome", "Joana Da Silva")
    setf("termocomp_nome", "Pedro Da Silva")
    setf("termocomp_rogo_cpf", "52601815906")
    setf("termocomp_t1_cpf", "08301661305")
    setf("termocomp_t2_rg", "5551112")
    esperado = {
        "nome": "JOANA DA SILVA", "rep_nome": "PEDRO DA SILVA",
        "rogo_cpf_incapaz": "526.018.159-06", "test1_cpf_incapaz": "083.016.613-05",
        "test2_rg_incapaz": "5551112",
        "anexo_nome": "JOANA DA SILVA", "anexo_rogo_cpf": "526.018.159-06",
        "termoresp_nome": "PEDRO DA SILVA", "termoresp_t1_cpf": "083.016.613-05",
        "termoresp_t2_rg": "5551112",
    }
    ruins = {k: pg.input_value("#"+k) for k, v in esperado.items() if pg.input_value("#"+k) != v}
    check(not ruins, f"sync reverso (Termo de Compromisso -> demais folhas) (divergentes={ruins})")
    pg.evaluate("setAnalfabetoAll(false)")
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

    check(len(console_errors)==0, f"no console errors ({console_errors[:3]})")
    b.close()

print("\n" + ("ALL PASS" if not errs else f"{len(errs)} FAILURES"))
sys.exit(1 if errs else 0)
