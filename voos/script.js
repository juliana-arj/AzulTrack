const listaVoos = document.getElementById("listaVoosAcompanhados");
const contadorVoos = document.getElementById("contadorVoos");
const filtroVoos = document.getElementById("filtroVoos");
const filtroStatus = document.getElementById("filtroStatus");
const resultadoVoo = document.getElementById("resultadoVoo");
const statusDetalhes = document.getElementById("statusDetalhes");
const secaoDetalhes = document.getElementById("detalhesVoo");

let voosSalvos = [];
let vooSelecionado = null;
let consultasConcluidas = false;
let comunicacoes = [];
let erroAoCarregarComunicacoes = false;
let listaComunicacoesEquipe = null;
let mensagemVaziaComunicacoes = null;

const escapar = valor => String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
})[caractere]);

const formatarData = data => {
    if (!data) return "Data não informada";

    const texto = String(data).slice(0, 10);
    const [ano, mes, dia] = texto.split("-");

    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "Data não informada";
};

const formatarHorario = data => {
    if (!data) return "Não informado";

    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) return String(data);

    return valor.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const normalizarStatus = status => {
    const valor = String(status ?? "unknown").toLowerCase();

    if (["canceled", "cancelled"].includes(valor)) return "cancelled";

    if ([
        "active",
        "delayed",
        "scheduled",
        "landed",
        "diverted",
        "incident"
    ].includes(valor)) {
        return valor;
    }

    return "unknown";
};

const traduzirStatus = status => {
    const estados = {
        scheduled: "Programado",
        active: "Em andamento",
        landed: "Pousou",
        cancelled: "Cancelado",
        canceled: "Cancelado",
        diverted: "Desviado",
        delayed: "Atrasado",
        incident: "Atualização importante",
        unknown: "Situação indisponível"
    };

    return estados[String(status ?? "unknown").toLowerCase()] ?? "Situação indisponível";
};

const classeStatus = status => {
    const valor = normalizarStatus(status);

    if (["delayed", "cancelled", "diverted", "incident"].includes(valor)) {
        return "status-alerta";
    }

    if (["active", "landed"].includes(valor)) {
        return "status-sucesso";
    }

    if (valor === "scheduled") {
        return "status-azul";
    }

    return "status-neutro";
};

const normalizarNumeroVoo = numero =>
    String(numero ?? "").trim().toUpperCase();

const normalizarDataVoo = data =>
    String(data ?? "").slice(0, 10);

const obterComunicacoesDoVoo = voo => comunicacoes.filter(comunicacao =>
    normalizarNumeroVoo(comunicacao.flight_number) ===
    normalizarNumeroVoo(voo.flight_number) &&
    normalizarDataVoo(comunicacao.travel_date) ===
    normalizarDataVoo(voo.travel_date)
);

const mostrarMensagem = (mensagem, erro = false) => {
    listaVoos.innerHTML = `
        <div class="mensagem-voos ${erro ? "erro" : ""}">
            ${escapar(mensagem)}
        </div>
    `;
};

function prepararSecaoComunicacoes() {
    const titulos = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5"));
    const titulo = titulos.find(elemento =>
        elemento.textContent.trim().toLocaleLowerCase("pt-BR").includes("comunicações da equipe")
    );

    let secao = titulo?.closest("section") || titulo?.parentElement;

    if (!secao) {
        secao = document.createElement("section");
        secao.className = "secao secao-comunicacoes";
        const tituloNovo = document.createElement("h2");
        tituloNovo.textContent = "Comunicações da equipe";
        secao.appendChild(tituloNovo);
        (document.querySelector("main") || document.body).appendChild(secao);
    }

    listaComunicacoesEquipe = secao.querySelector("#listaComunicacoesEquipe");

    if (!listaComunicacoesEquipe) {
        listaComunicacoesEquipe = document.createElement("div");
        listaComunicacoesEquipe.id = "listaComunicacoesEquipe";
        listaComunicacoesEquipe.className = "lista-comunicacoes-equipe";
        secao.appendChild(listaComunicacoesEquipe);
    }

    mensagemVaziaComunicacoes = Array.from(secao.querySelectorAll("p")).find(paragrafo =>
        /nenhuma (mensagem|comunicação|comunicacao)|não há mensagens|nao ha mensagens|sem comunicaç|sem comunicac|ainda não há mensagens|ainda nao ha mensagens/i
            .test(paragrafo.textContent)
    ) || null;

    if (mensagemVaziaComunicacoes) mensagemVaziaComunicacoes.hidden = true;
}

function renderizarComunicacoesGerais() {
    if (!listaComunicacoesEquipe) return;

    if (mensagemVaziaComunicacoes) mensagemVaziaComunicacoes.hidden = true;

    if (erroAoCarregarComunicacoes) {
        listaComunicacoesEquipe.innerHTML = `
            <div class="mensagem-comunicacao mensagem-comunicacao-vazia">
                <p>Não foi possível carregar as comunicações no momento.</p>
            </div>
        `;
        return;
    }

    const mensagens = comunicacoes
        .filter(comunicacao => String(comunicacao.customer_message ?? "").trim())
        .sort((a, b) => new Date(b.update_created_at || 0) - new Date(a.update_created_at || 0));

    if (!mensagens.length) {
        listaComunicacoesEquipe.innerHTML = `
            <div class="mensagem-comunicacao mensagem-comunicacao-vazia">
                <p>Nenhuma comunicação disponível no momento.</p>
            </div>
        `;
        return;
    }

    listaComunicacoesEquipe.innerHTML = mensagens.map(comunicacao => {
        const atraso = Number(comunicacao.estimated_delay_minutes);
        const temAtraso = comunicacao.estimated_delay_minutes !== null &&
            comunicacao.estimated_delay_minutes !== undefined &&
            Number.isFinite(atraso);

        return `
            <article class="cartao-comunicacao">
                <div class="comunicacao-dado">
                    <span class="comunicacao-rotulo">Categoria</span>
                    <strong>${escapar(comunicacao.occurrence_category || "Não informada")}</strong>
                </div>
                <div class="comunicacao-dado">
                    <span class="comunicacao-rotulo">Atraso estimado</span>
                    <strong>${temAtraso ? `${escapar(atraso)} min` : "Ainda não informado"}</strong>
                </div>
                <div class="comunicacao-mensagem-bloco">
                    <span class="comunicacao-rotulo">Mensagem do sistema</span>
                    <p class="comunicacao-mensagem">${escapar(comunicacao.customer_message)}</p>
                </div>
            </article>
        `;
    }).join("");

    if (window.lucide) lucide.createIcons();
}

async function carregarComunicacoes() {
    const { data, error } = await supabaseClient.rpc(
        "get_customer_flight_communications"
    );

    if (error) {
        console.error("Erro ao carregar comunicações:", error);
        comunicacoes = [];
        erroAoCarregarComunicacoes = true;
        renderizarComunicacoesGerais();
        return;
    }

    comunicacoes = data ?? [];
    erroAoCarregarComunicacoes = false;

    renderizarComunicacoesGerais();
}

function renderizarComunicacoesDoVoo(voo) {
    if (erroAoCarregarComunicacoes) {
        return `
            <section class="ocorrencias-do-voo">
                <h3>Comunicações</h3>
                <div class="mensagem-comunicacao mensagem-comunicacao-vazia">
                    <p>Não foi possível carregar as comunicações deste voo.</p>
                </div>
            </section>
        `;
    }

    const ocorrencias = obterComunicacoesDoVoo(voo);

    if (!ocorrencias.length) {
        return `
            <section class="ocorrencias-do-voo">
                <h3>Comunicações</h3>
                <div class="mensagem-comunicacao mensagem-comunicacao-vazia">
                    <p>Nenhuma comunicação disponível para este voo.</p>
                </div>
            </section>
        `;
    }

    return `
        <section class="ocorrencias-do-voo">
            <h3>Comunicações</h3>
            <div class="lista-comunicacoes-voo">
                ${ocorrencias.map(ocorrencia => {
        const atraso = Number(ocorrencia.estimated_delay_minutes);
        const temAtraso = ocorrencia.estimated_delay_minutes !== null &&
            ocorrencia.estimated_delay_minutes !== undefined &&
            Number.isFinite(atraso);

        return `
                        <article class="cartao-ocorrencia-voo">
                            <div class="comunicacao-dado">
                                <span class="comunicacao-rotulo">Categoria</span>
                                <strong>${escapar(ocorrencia.occurrence_category || "Não informada")}</strong>
                            </div>
                            <div class="comunicacao-dado">
                                <span class="comunicacao-rotulo">Atraso estimado</span>
                                <strong>${temAtraso ? `${escapar(atraso)} min` : "Ainda não informado"}</strong>
                            </div>
                            <div class="comunicacao-mensagem-bloco">
                                <span class="comunicacao-rotulo">Mensagem do sistema</span>
                                <p class="comunicacao-mensagem">${escapar(ocorrencia.customer_message || "Ainda não há uma mensagem disponível para este voo.")}</p>
                            </div>
                        </article>
                    `;
    }).join("")}
            </div>
        </section>
    `;
}
async function buscarDadosApi(voo) {
    try {
        const { data, error } = await supabaseClient.functions.invoke(
            "clever-worker",
            {
                body: {
                    numero: voo.flight_number,
                    data: voo.travel_date
                }
            }
        );

        if (error || data?.erro) {
            voo.dadosApi = null;
            voo.statusApi = "unknown";
            return;
        }

        const resultado = data?.voos?.[0] ?? null;

        voo.dadosApi = resultado;
        voo.statusApi = normalizarStatus(resultado?.flight_status);
    } catch {
        voo.dadosApi = null;
        voo.statusApi = "unknown";
    }
}

function atualizarIndicadores() {
    document.getElementById("totalVoos").textContent = voosSalvos.length;

    document.getElementById("voosAndamento").textContent =
        consultasConcluidas
            ? voosSalvos.filter(voo => voo.statusApi === "active").length
            : "—";

    document.getElementById("voosAtrasados").textContent =
        consultasConcluidas
            ? voosSalvos.filter(voo => voo.statusApi === "delayed").length
            : "—";
}

function renderizarVoos() {
    const busca = filtroVoos.value.trim().toLocaleLowerCase("pt-BR");
    const statusEscolhido = filtroStatus.value;

    const filtrados = voosSalvos.filter(voo => {
        const partida = voo.dadosApi?.departure ?? {};
        const chegada = voo.dadosApi?.arrival ?? {};

        const textoBusca = [
            voo.flight_number,
            partida.airport,
            partida.iata,
            chegada.airport,
            chegada.iata
        ].join(" ").toLocaleLowerCase("pt-BR");

        const correspondeBusca = textoBusca.includes(busca);

        const correspondeStatus =
            statusEscolhido === "todos" ||
            voo.statusApi === statusEscolhido;

        return correspondeBusca && correspondeStatus;
    });

    contadorVoos.textContent =
        `${filtrados.length} ${filtrados.length === 1 ? "voo" : "voos"}`;

    if (!voosSalvos.length) {
        listaVoos.innerHTML = `
            <div class="resultado-vazio">
                <div class="resultado-vazio-icone">✈</div>
                <h3>Nenhum voo acompanhado</h3>
                <p>Adicione um voo pela página Visão geral para acompanhá-lo aqui.</p>
            </div>
        `;
        return;
    }

    if (!filtrados.length) {
        listaVoos.innerHTML = `
            <div class="resultado-vazio">
                <div class="resultado-vazio-icone">
                    <i data-lucide="search-x" class="icone"></i>
                </div>
                <h3>Nenhum voo encontrado</h3>
                <p>Tente mudar a pesquisa ou escolher outro filtro.</p>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        return;
    }

    listaVoos.innerHTML = filtrados.map(voo => {
        const partida = voo.dadosApi?.departure ?? {};
        const chegada = voo.dadosApi?.arrival ?? {};
        const selecionado = String(vooSelecionado) === String(voo.id);
        const ocorrencias = obterComunicacoesDoVoo(voo);

        const statusTexto = voo.carregandoApi
            ? "Buscando informações"
            : traduzirStatus(voo.statusApi);

        const origem = partida.airport || partida.iata || "Origem não informada";
        const destino = chegada.airport || chegada.iata || "Destino não informado";

        return `
            <article
                class="cartao-voo ${selecionado ? "selecionado" : ""}"
                data-voo-id="${escapar(voo.id)}"
                role="button"
                tabindex="0"
                aria-label="Ver detalhes do voo ${escapar(voo.flight_number)}"
                aria-pressed="${selecionado}"
            >
                <div class="cartao-voo-topo">
                    <span class="cartao-voo-numero">
                        ${escapar(voo.flight_number)}
                    </span>

                    <span class="status ${classeStatus(voo.statusApi)}">
                        ${escapar(statusTexto)}
                    </span>
                </div>

                <span class="cartao-voo-data">
                    Data da viagem: ${formatarData(voo.travel_date)}
                </span>

                <div class="cartao-voo-rota">
                    <div class="cartao-voo-aeroporto">
                        <strong>Origem</strong>
                        <span>${escapar(origem)}</span>
                    </div>

                    <i data-lucide="plane" class="icone"></i>

                    <div class="cartao-voo-aeroporto">
                        <strong>Destino</strong>
                        <span>${escapar(destino)}</span>
                    </div>
                </div>

                ${ocorrencias.length ? `
                    <div class="cartao-voo-ocorrencias">
                        <i data-lucide="bell-ring" class="icone"></i>
                        ${ocorrencias.length}
                        ${ocorrencias.length === 1 ? " ocorrência relacionada" : " ocorrências relacionadas"}
                    </div>
                ` : ""}

                <div class="cartao-voo-rodape">
                    <span>
                        ${partida.scheduled
                ? `Partida prevista: ${escapar(formatarHorario(partida.scheduled))}`
                : "Consulte os horários disponíveis"
            }
                    </span>

                    <span class="link-detalhes-voo">
                        Ver detalhes
                        <i data-lucide="arrow-up-right" class="icone"></i>
                    </span>
                </div>
            </article>
        `;
    }).join("");

    if (window.lucide) lucide.createIcons();
}

async function consultarDetalhes(voo) {
    vooSelecionado = voo.id;

    renderizarVoos();

    secaoDetalhes.hidden = false;
    statusDetalhes.textContent = "Consultando";

    resultadoVoo.innerHTML = `
        <div class="resultado-vazio">
            <div class="resultado-vazio-icone">
                <i data-lucide="loader-circle" class="icone"></i>
            </div>
            <h3>Consultando voo ${escapar(voo.flight_number)}...</h3>
            <p>Aguarde enquanto buscamos as informações disponíveis.</p>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    secaoDetalhes.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    if (!voo.dadosApi && !voo.carregandoApi) {
        voo.carregandoApi = true;

        await buscarDadosApi(voo);

        voo.carregandoApi = false;

        consultasConcluidas = voosSalvos.every(
            item => !item.carregandoApi
        );

        atualizarIndicadores();
        renderizarVoos();
    }

    const vooApi = voo.dadosApi;
    const htmlComunicacoes = renderizarComunicacoesDoVoo(voo);

    if (!vooApi) {
        statusDetalhes.textContent = "Indisponível";

        resultadoVoo.innerHTML = `
            <div class="resultado-vazio">
                <div class="resultado-vazio-icone">
                    <i data-lucide="plane-off" class="icone"></i>
                </div>

                <h3>Não foi possível consultar este voo</h3>

                <p>
                    As informações da companhia aérea não estão disponíveis no momento.
                    As comunicações do AzulTrack são exibidas separadamente abaixo.
                </p>

                <button type="button" class="botao-principal" id="tentarNovamenteVoo">
                    Tentar novamente
                </button>
            </div>

            ${htmlComunicacoes}
        `;

        document.getElementById("tentarNovamenteVoo")?.addEventListener("click", () => {
            voo.dadosApi = null;
            voo.carregandoApi = false;
            consultarDetalhes(voo);
        });

        if (window.lucide) lucide.createIcons();

        return;
    }

    const partida = vooApi.departure ?? {};
    const chegada = vooApi.arrival ?? {};
    const status = traduzirStatus(vooApi.flight_status);
    const companhia = vooApi.airline?.name || "Companhia aérea não informada";

    statusDetalhes.textContent = status;
    statusDetalhes.className = `status ${classeStatus(vooApi.flight_status)}`;

    resultadoVoo.innerHTML = `
        <div class="detalhes-voo-cabecalho">
            <div>
                <span class="subtitulo">INFORMAÇÕES DO VOO</span>
                <h2>${escapar(vooApi.flight?.iata || voo.flight_number)}</h2>
                <p>${escapar(companhia)}</p>
            </div>

            <span class="status ${classeStatus(vooApi.flight_status)}">
                ${escapar(status)}
            </span>
        </div>

        <div class="rota-detalhes-voo">
            <div>
                <span>Partida</span>
                <strong>${escapar(partida.iata || partida.airport || "Não informado")}</strong>
                <small>${escapar(partida.airport || "Aeroporto não informado")}</small>
                <small>${escapar(formatarHorario(partida.scheduled))}</small>
            </div>

            <i data-lucide="plane" class="icone"></i>

            <div>
                <span>Chegada</span>
                <strong>${escapar(chegada.iata || chegada.airport || "Não informado")}</strong>
                <small>${escapar(chegada.airport || "Aeroporto não informado")}</small>
                <small>${escapar(formatarHorario(chegada.scheduled))}</small>
            </div>
        </div>

        <div class="detalhes-voo-conteudo">
            <div class="detalhe-voo-item">
                <span>Data da viagem</span>
                <strong>${formatarData(voo.travel_date)}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Aeronave</span>
                <strong>${escapar(
        vooApi.aircraft?.registration ||
        vooApi.aircraft?.iata ||
        vooApi.aircraft ||
        "Não informado"
    )}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Partida prevista</span>
                <strong>${escapar(formatarHorario(partida.scheduled))}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Partida estimada</span>
                <strong>${escapar(formatarHorario(partida.estimated))}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Partida real</span>
                <strong>${escapar(formatarHorario(partida.actual))}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Terminal de partida</span>
                <strong>${escapar(partida.terminal || "Não informado")}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Portão de partida</span>
                <strong>${escapar(partida.gate || "Não informado")}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Chegada prevista</span>
                <strong>${escapar(formatarHorario(chegada.scheduled))}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Chegada estimada</span>
                <strong>${escapar(formatarHorario(chegada.estimated))}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Chegada real</span>
                <strong>${escapar(formatarHorario(chegada.actual))}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Terminal de chegada</span>
                <strong>${escapar(chegada.terminal || "Não informado")}</strong>
            </div>

            <div class="detalhe-voo-item">
                <span>Portão de chegada</span>
                <strong>${escapar(chegada.gate || "Não informado")}</strong>
            </div>
        </div>

        <p class="aviso-dados-voo">
            
        </p>

        ${htmlComunicacoes}
    `;

    if (window.lucide) lucide.createIcons();
}
function selecionarVooPeloCartao(evento) {
    const cartao = evento.target.closest("[data-voo-id]");

    if (!cartao) return;

    const voo = voosSalvos.find(
        item => String(item.id) === cartao.dataset.vooId
    );

    if (voo) consultarDetalhes(voo);
}

listaVoos.addEventListener("click", selecionarVooPeloCartao);

listaVoos.addEventListener("keydown", evento => {
    if (evento.key !== "Enter" && evento.key !== " ") return;

    const cartao = evento.target.closest("[data-voo-id]");

    if (!cartao) return;

    evento.preventDefault();
    selecionarVooPeloCartao(evento);
});

filtroVoos.addEventListener("input", renderizarVoos);
filtroStatus.addEventListener("change", renderizarVoos);

function obterIniciais(nome) {
    const partes = (nome || "Cliente").trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0][0].toUpperCase();
    }

    return (
        partes[0][0] + partes[partes.length - 1][0]
    ).toUpperCase();
}


function obterIniciais(nome) {
    const partes = (nome || "Cliente").trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0][0].toUpperCase();
    }

    return (
        partes[0][0] + partes[partes.length - 1][0]
    ).toUpperCase();
}

async function carregarPerfil(user) {
    const nome =
        user.user_metadata?.full_name ||
        user.user_metadata?.nome_completo ||
        user.email?.split("@")[0] ||
        "Cliente";

    document.getElementById("nomeCliente").textContent = nome;
    document.getElementById("avatarCliente").textContent = obterIniciais(nome);
    document.getElementById("avatarCliente").title = nome;
}

async function carregarNotificacoes(user) {
    const bolinha = document.getElementById("bolinhaNotificacoes");
    const botao = document.getElementById("botaoNotificacoes");

    if (!bolinha || !botao) return;

    const { count, error } = await supabaseClient
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("source_update_id", "is", null)
        .is("read_at", null);

    if (error) {
        console.error("Erro ao consultar notificações:", error);
        bolinha.hidden = true;
        return;
    }

    const quantidade = count || 0;

    bolinha.hidden = quantidade === 0;

    botao.setAttribute(
        "aria-label",
        quantidade > 0
            ? `Notificações, ${quantidade} não lidas`
            : "Notificações"
    );
}

async function carregarVoos() {
    if (!window.supabaseClient) {
        mostrarMensagem(
            "Não foi possível iniciar a conexão. Atualize a página e tente novamente.",
            true
        );
        return;
    }

    const {
        data: { user },
        error: erroAuth
    } = await supabaseClient.auth.getUser();

    if (erroAuth || !user) {
        window.location.href = "../landingPage/index.html";
        return;
    }

    await carregarPerfil(user);
    await carregarNotificacoes(user);

    const { data, error } = await supabaseClient
        .from("tracked_flights")
        .select("id, flight_number, travel_date, created_at")
        .eq("user_id", user.id)
        .order("travel_date", { ascending: true });

    if (error) {
        mostrarMensagem(
            "Não foi possível carregar seus voos. Tente novamente.",
            true
        );
        return;
    }

    voosSalvos = (data ?? []).map(voo => ({
        ...voo,
        dadosApi: null,
        statusApi: "unknown",
        carregandoApi: true
    }));

    await carregarComunicacoes();

    atualizarIndicadores();
    renderizarVoos();

    if (!voosSalvos.length) {
        consultasConcluidas = true;
        atualizarIndicadores();
        renderizarVoos();
        return;
    }

    await Promise.all(
        voosSalvos.map(voo => buscarDadosApi(voo))
    );

    voosSalvos.forEach(voo => {
        voo.carregandoApi = false;
    });

    consultasConcluidas = true;

    atualizarIndicadores();
    renderizarVoos();
}

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons();

    prepararSecaoComunicacoes();
    carregarVoos();
});