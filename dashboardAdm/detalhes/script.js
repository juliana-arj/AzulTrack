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

    if (perfil.role !== "super_admin" && !perfil.department_id) {
        window.location.replace("../../landingPage/index.html");
        return;
    }

    document.documentElement.dataset.autorizado = "true";

    const nome = perfil.display_name?.trim()
        || sessao.user.email
        || "Administrador";

    const elementoNome = document.getElementById("nomeUsuario");
    const elementoDepartamento = document.getElementById("departamentoUsuario");
    const avatar = document.getElementById("avatarUsuario");

    if (elementoNome) {
        elementoNome.textContent = nome;
    }

    if (avatar) {
        const partesNome = nome.trim().split(/\s+/).filter(Boolean);

        avatar.textContent = partesNome.length > 1
            ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
            : partesNome[0][0].toUpperCase();

        avatar.title = nome;
        avatar.setAttribute("aria-label", `Usuário: ${nome}`);
    }

    if (elementoDepartamento) {
        if (perfil.department_id) {
            const { data: departamento, error } = await cliente
                .from("departments")
                .select("name")
                .eq("id", perfil.department_id)
                .single();

            elementoDepartamento.textContent = !error && departamento
                ? departamento.name
                : "Departamento não identificado";
        } else {
            elementoDepartamento.textContent = perfil.role === "super_admin"
                ? "Super administrador"
                : "Departamento não definido";
        }
    }

    async function atualizarBolinhaNotificacoes() {
        const bolinha = document.getElementById("bolinhaNotificacoes");

        if (!bolinha) return;

        bolinha.hidden = true;

        const { data, error } = await cliente
            .from("notifications")
            .select("id")
            .eq("user_id", sessao.user.id)
            .is("read_at", null)
            .limit(1);

        if (error) {
            console.error("Erro ao consultar notificações:", error);
            return;
        }

        bolinha.hidden = !data || data.length === 0;
    }

    await atualizarBolinhaNotificacoes();

    if (window.lucide) {
        window.lucide.createIcons();
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

    async function controlarAcessosSidebar() {
        const linkDepartamento = document.getElementById("linkDepartamento");
        const linkUsuarios = document.getElementById("linkUsuarios");

        if (linkDepartamento) linkDepartamento.hidden = true;
        if (linkUsuarios) linkUsuarios.hidden = true;

        if (!window.supabaseClient) return;

        const { data: sessaoData } = await window.supabaseClient.auth.getSession();
        const usuario = sessaoData?.session?.user;

        if (!usuario) return;

        const { data: perfil, error } = await window.supabaseClient
            .from("profiles")
            .select("role, department_id")
            .eq("id", usuario.id)
            .maybeSingle();

        if (error || !perfil) return;

        const cargo = String(perfil.role || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        const ehSuperAdmin = [
            "superadmin",
            "superadministrador"
        ].includes(cargo);

        if (linkDepartamento) {
            linkDepartamento.hidden = ehSuperAdmin || !perfil.department_id;
        }

        if (linkUsuarios) {
            linkUsuarios.hidden = !ehSuperAdmin;
        }
    }

    controlarAcessosSidebar();


    async function carregarOcorrencias() {
        mensagem.hidden = false;
        mensagem.textContent = "Carregando ocorrências...";
        botaoAtualizar.disabled = true;

        try {
            const { data, error } = await cliente
                .from("operational_occurrences")
                .select(`
                *,
                departments:departments!responsible_department_id (
                    id,
                    name
                )
            `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            ocorrencias = data ?? [];

            atualizarIndicadores();
            renderizarOcorrencias();

        } catch (erro) {
            console.error("Erro ao carregar ocorrências:", erro);

            ocorrencias = [];
            lista.replaceChildren();
            quantidade.textContent = "0 registros";
            mensagem.hidden = false;
            mensagem.textContent = `Erro ao carregar ocorrências: ${erro.message}`;

            atualizarIndicadores();

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