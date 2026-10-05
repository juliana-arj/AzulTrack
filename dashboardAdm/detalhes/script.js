console.log("oi");

(async function iniciarOperacoes() {
    const cliente = window.supabaseClient;
    const caminhoLogin = "../../login/index.html";

    if (!cliente) {
        window.location.replace(caminhoLogin);
        return;
    }

    const { data: sessaoData, error: erroSessao } =
        await cliente.auth.getSession();

    const sessao = sessaoData?.session;

    if (erroSessao || !sessao) {
        window.location.replace(caminhoLogin);
        return;
    }

    const { data: perfil, error: erroPerfil } = await cliente
        .from("profiles")
        .select("display_name, role, department_id")
        .eq("id", sessao.user.id)
        .single();

    if (erroPerfil || !perfil) {
        await cliente.auth.signOut();
        window.location.replace(caminhoLogin);
        return;
    }

    if (perfil.role !== "super_admin") {
        const paginas = {
            user: "../../landingPage/index.html",
            atendimento: "../admin-atendimento/index.html",
            comunicacao: "../admin-comunicacao/index.html",
            operacoes: "index.html",
            gestao: "../admin-gestao/index.html"
        };

        const destino = perfil.role === "admin"
            ? paginas[perfil.department_id]
            : paginas[perfil.role];

        window.location.replace(destino || caminhoLogin);
        return;
    }

    document.documentElement.dataset.autorizado = "true";

    const nome = perfil.display_name?.trim()
        || sessao.user.email
        || "Administrador";

    const avatar = document.querySelector(".avatar-pequeno");

    if (avatar) {
        avatar.textContent = nome
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte[0])
            .join("")
            .toUpperCase();

        avatar.title = nome;
        avatar.setAttribute("aria-label", `Administrador: ${nome}`);
    }

    const botaoSair = document.querySelector(".sair");

    if (botaoSair) {
        botaoSair.addEventListener("click", async evento => {
            evento.preventDefault();

            const { error } = await cliente.auth.signOut();

            if (error) {
                alert("Não foi possível sair da conta. Tente novamente.");
                return;
            }

            window.location.replace(caminhoLogin);
        });
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }

    const lista = document.getElementById("listaOcorrencias");
    const mensagem = document.getElementById("mensagemOcorrencias");
    const quantidade = document.getElementById("quantidadeFiltrada");

    const total = document.getElementById("totalOcorrencias");
    const abertas = document.getElementById("abertasOcorrencias");
    const criticas = document.getElementById("criticasOcorrencias");
    const resolvidas = document.getElementById("resolvidasOcorrencias");

    const pesquisa = document.getElementById("pesquisaOcorrencia");
    const filtroStatus = document.getElementById("filtroStatus");
    const filtroGravidade = document.getElementById("filtroGravidade");
    const botaoAtualizar = document.getElementById("atualizarOcorrencias");

    let ocorrencias = [];

    const textosStatus = {
        aberta: "Aberta",
        em_analise: "Em análise",
        em_andamento: "Em andamento",
        resolvida: "Resolvida",
        cancelada: "Cancelada"
    };

    const textosGravidade = {
        baixa: "Baixa",
        media: "Média",
        alta: "Alta",
        critica: "Crítica"
    };

    function formatarData(data) {
        if (!data) return "Data não informada";

        const dataValida = new Date(data);

        if (Number.isNaN(dataValida.getTime())) {
            return "Data não informada";
        }

        return dataValida.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "America/Sao_Paulo"
        });
    }

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        if (texto !== undefined && texto !== null) {
            elemento.textContent = texto;
        }

        return elemento;
    }

    function atualizarIndicadores() {
        total.textContent = ocorrencias.length;

        abertas.textContent = ocorrencias.filter(item =>
            ["aberta", "em_analise", "em_andamento"].includes(item.status)
        ).length;

        criticas.textContent = ocorrencias.filter(item =>
            ["alta", "critica"].includes(item.severity)
            && !["resolvida", "cancelada"].includes(item.status)
        ).length;

        resolvidas.textContent = ocorrencias.filter(item =>
            item.status === "resolvida"
        ).length;
    }

    function criarCartao(item) {
        const cartao = criarElemento(
            "button",
            "cartao-ocorrencia"
        );

        cartao.type = "button";
        cartao.setAttribute(
            "aria-label",
            `Ver detalhes da ocorrência ${item.occurrence_code}: ${item.title}`
        );

        cartao.addEventListener("click", () => {
            const destino = new URL(
                "detalhes.html",
                window.location.href
            );

            destino.searchParams.set("id", item.id);

            window.location.href = destino.href;
        });

        const topo = criarElemento("div", "cartao-ocorrencia-topo");

        topo.appendChild(
            criarElemento(
                "span",
                "codigo-ocorrencia",
                `OCORRÊNCIA #${item.occurrence_code}`
            )
        );

        topo.appendChild(
            criarElemento(
                "span",
                `badge-ocorrencia status-${item.status}`,
                textosStatus[item.status] ?? item.status
            )
        );

        const conteudo = criarElemento("div", "conteudo-ocorrencia");

        conteudo.appendChild(
            criarElemento("h3", "", item.title || "Sem título")
        );

        conteudo.appendChild(
            criarElemento(
                "div",
                "descricao-resumida",
                item.description || "Nenhuma descrição informada."
            )
        );

        const metadados = criarElemento("div", "metadados-ocorrencia");

        const categoria = criarElemento("span");
        const iconeCategoria = document.createElement("i");
        iconeCategoria.setAttribute("data-lucide", "layers");
        iconeCategoria.className = "icone";
        categoria.append(
            iconeCategoria,
            document.createTextNode(item.category || "Sem categoria")
        );

        const gravidade = criarElemento(
            "span",
            `badge-ocorrencia gravidade-${item.severity}`,
            textosGravidade[item.severity] ?? item.severity ?? "Não definida"
        );

        const data = criarElemento("span");
        const iconeData = document.createElement("i");
        iconeData.setAttribute("data-lucide", "calendar");
        iconeData.className = "icone";
        data.append(
            iconeData,
            document.createTextNode(formatarData(item.created_at))
        );

        metadados.append(categoria, gravidade, data);

        const rodape = criarElemento("div", "cartao-ocorrencia-rodape");

        rodape.appendChild(
            criarElemento(
                "span",
                "departamento-ocorrencia",
                item.departments?.name || "Setor não informado"
            )
        );

        const linkDetalhes = criarElemento("span", "link-detalhes", "Ver detalhes");

        const iconeSeta = document.createElement("i");
        iconeSeta.setAttribute("data-lucide", "arrow-right");
        iconeSeta.className = "icone";

        linkDetalhes.appendChild(iconeSeta);

        rodape.appendChild(linkDetalhes);

        cartao.append(topo, conteudo, metadados, rodape);

        return cartao;
    }

    function renderizarOcorrencias() {
        const termo = pesquisa.value.trim().toLowerCase();
        const statusSelecionado = filtroStatus.value;
        const gravidadeSelecionada = filtroGravidade.value;

        const filtradas = ocorrencias.filter(item => {
            const codigo = String(item.occurrence_code ?? "");
            const titulo = item.title ?? "";

            const correspondePesquisa =
                codigo.toLowerCase().includes(termo)
                || titulo.toLowerCase().includes(termo);

            const correspondeStatus =
                !statusSelecionado || item.status === statusSelecionado;

            const correspondeGravidade =
                !gravidadeSelecionada || item.severity === gravidadeSelecionada;

            return correspondePesquisa
                && correspondeStatus
                && correspondeGravidade;
        });

        lista.replaceChildren();

        quantidade.textContent = filtradas.length === 1
            ? "1 registro"
            : `${filtradas.length} registros`;

        if (filtradas.length === 0) {
            mensagem.textContent = ocorrencias.length
                ? "Nenhuma ocorrência corresponde aos filtros."
                : "Nenhuma ocorrência registrada.";

            mensagem.hidden = false;
            return;
        }

        mensagem.hidden = true;

        const fragmento = document.createDocumentFragment();

        filtradas.forEach(item => {
            fragmento.appendChild(criarCartao(item));
        });

        lista.appendChild(fragmento);

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    async function carregarOcorrencias() {
        mensagem.hidden = false;
        mensagem.textContent = "Carregando ocorrências...";
        botaoAtualizar.disabled = true;

        try {
            const { data, error } = await cliente
                .from("operational_occurrences")
                .select("*")
                .order("created_at", { ascending: false });

            console.log("Dados recebidos do Supabase:", data);
            console.log("Erro do Supabase:", error);

            if (error) {
                console.error("Detalhes do erro:", error);

                ocorrencias = [];
                lista.replaceChildren();
                quantidade.textContent = "0 registros";

                mensagem.textContent =
                    `Erro ao carregar ocorrências: ${error.message}`;

                atualizarIndicadores();
                return;
            }

            ocorrencias = data ?? [];

            atualizarIndicadores();
            renderizarOcorrencias();

            console.log(
                "Quantidade de ocorrências carregadas:",
                ocorrencias.length
            );

        } catch (erro) {
            console.error("Erro inesperado:", erro);

            mensagem.hidden = false;
            mensagem.textContent =
                `Erro inesperado: ${erro.message}`;

        } finally {
            botaoAtualizar.disabled = false;

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    }

    pesquisa.addEventListener("input", renderizarOcorrencias);
    filtroStatus.addEventListener("change", renderizarOcorrencias);
    filtroGravidade.addEventListener("change", renderizarOcorrencias);
    botaoAtualizar.addEventListener("click", carregarOcorrencias);

    await carregarOcorrencias();
})();