(function iniciarDetalhesOcorrencia() {
    const supabase = window.supabaseClient;

    const elementos = {
        mensagem: document.getElementById("mensagemPagina"),
        conteudo: document.getElementById("conteudoOcorrencia"),
        titulo: document.getElementById("tituloOcorrencia"),
        codigo: document.getElementById("codigoOcorrencia"),
        status: document.getElementById("statusOcorrencia"),
        gravidade: document.getElementById("gravidadeOcorrencia"),
        dataIdentificacao: document.getElementById("dataIdentificacao"),
        departamento: document.getElementById("departamentoResponsavel"),
        quantidadeVoos: document.getElementById("quantidadeVoos"),
        descricao: document.getElementById("descricaoOcorrencia"),
        categoria: document.getElementById("categoriaOcorrencia"),
        local: document.getElementById("localOcorrencia"),
        observacoes: document.getElementById("observacoesOcorrencia"),
        dataCriacao: document.getElementById("dataCriacao"),
        dataAtualizacao: document.getElementById("dataAtualizacao"),
        campoResolucao: document.getElementById("campoResolucao"),
        dataResolucao: document.getElementById("dataResolucao"),
        voos: document.getElementById("listaVoos"),
        historico: document.getElementById("historicoOcorrencia"),
        mensagens: document.getElementById("mensagensOcorrencia"),
        avatar: document.getElementById("avatarUsuario"),
        nomeUsuario: document.getElementById("nomeUsuario"),
        departamentoUsuario: document.getElementById("departamentoUsuario"),
        avatar: document.getElementById("avatarUsuario")
    };

    const parametros = new URLSearchParams(window.location.search);
    const ocorrenciaId = parametros.get("id");

    let perfilAtual = null;
    let usuarioAtualId = null;
    let ocorrenciaAtual = null;
    let voosAtuais = [];

    const statusLegendas = {
        aberta: "Aberta",
        em_analise: "Em análise",
        em_andamento: "Em andamento",
        resolvida: "Resolvida",
        cancelada: "Cancelada"
    };

    const gravidadeLegendas = {
        baixa: "Baixa",
        media: "Média",
        alta: "Alta",
        critica: "Crítica"
    };

    const categoriaLegendas = {
        atraso: "Atraso",
        manutencao: "Manutenção",
        clima: "Condições climáticas",
        aeronave: "Aeronave",
        tripulacao: "Tripulação",
        conexao: "Conexão",
        outro: "Outro",
        "Infraestrutura aeroportuária": "Infraestrutura aeroportuária",
        "Condições climáticas": "Condições climáticas",
        "Manutenção": "Manutenção",
        "Tripulação": "Tripulação",
        "Sistema": "Sistema",
        "Segurança": "Segurança",
        "Outro": "Outro"
    };

    const tiposAtualizacao = {
        registro: "Registro inicial",
        atualizacao: "Atualização",
        mudanca_status: "Mudança de status",
        impacto_voo: "Impacto em voo",
        resolucao: "Resolução"
    };

    const tiposRelacao = {
        origem: "Voo de origem",
        afetado: "Voo afetado",
        conexao: "Voo de conexão"
    };

    const statusImpacto = {
        suspeito: "Em avaliação",
        confirmado: "Confirmado",
        descartado: "Descartado"
    };


    async function atualizarBolinhaNotificacoes(usuarioId) {
        const bolinha = document.getElementById("bolinhaNotificacoes");

        if (!bolinha) return;

        bolinha.hidden = true;

        const { data, error } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", usuarioId)
            .is("read_at", null)
            .limit(1);

        if (error) {
            console.error("Erro ao consultar notificações:", error);
            return;
        }

        bolinha.hidden = !data || data.length === 0;
    }

    function textoSeguro(valor, alternativa = "Não informado") {
        if (valor === null || valor === undefined || String(valor).trim() === "") {
            return alternativa;
        }

        return String(valor);
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

    function formatarData(valor, incluirHora = true) {
        if (!valor) return "Não informado";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Não informado";
        }

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            ...(incluirHora ? { timeStyle: "short" } : {})
        }).format(data);
    }

    function formatarDataViagem(valor) {
        if (!valor) return "Data não informada";

        const partes = String(valor).split("-");

        if (partes.length !== 3) return valor;

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function definirMensagem(texto, tipo = "info") {
        elementos.mensagem.replaceChildren();

        const icone = criarElemento("i");
        icone.setAttribute(
            "data-lucide",
            tipo === "erro" ? "circle-alert" : "info"
        );

        elementos.mensagem.append(icone, document.createTextNode(texto));
        elementos.mensagem.className = `mensagem-pagina ${tipo}`;
        elementos.mensagem.hidden = false;
        elementos.conteudo.hidden = true;

        atualizarIcones();
    }

    function atualizarIcones() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function classeStatus(status) {
        return `status-${String(status || "").toLowerCase()}`;
    }

    function classeGravidade(gravidade) {
        return `gravidade-${String(gravidade || "").toLowerCase()}`;
    }

    function adicionarCampo(container, rotulo, valor) {
        const campo = criarElemento("div", "historico-campo");

        campo.append(
            criarElemento("span", "", rotulo),
            criarElemento("p", "", textoSeguro(valor))
        );

        container.appendChild(campo);
    }


    async function carregarPerfil(usuario) {
        const { data: perfil, error } = await supabase
            .from("profiles")
            .select("display_name, role, department_id")
            .eq("id", usuario.id)
            .single();

        if (error || !perfil) {
            throw new Error("Não foi possível verificar seu perfil de acesso.");
        }

        if (perfil.role !== "super_admin" && !perfil.department_id) {
            window.location.replace("../../landingPage/index.html");
            return null;
        }

        const nome = perfil.display_name?.trim()
            || usuario.email
            || "Administrador";

        if (elementos.nomeUsuario) {
            elementos.nomeUsuario.textContent = nome;
        }

        if (elementos.avatar) {
            const partesNome = nome.trim().split(/\s+/).filter(Boolean);

            elementos.avatar.textContent = partesNome.length > 1
                ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
                : partesNome[0][0].toUpperCase();

            elementos.avatar.title = nome;
            elementos.avatar.setAttribute("aria-label", `Usuário: ${nome}`);
        }

        if (elementos.departamentoUsuario) {
            if (perfil.department_id) {
                const { data: departamento, error: erroDepartamento } =
                    await supabase
                        .from("departments")
                        .select("name")
                        .eq("id", perfil.department_id)
                        .maybeSingle();

                elementos.departamentoUsuario.textContent =
                    !erroDepartamento && departamento
                        ? departamento.name
                        : "Departamento não identificado";
            } else {
                elementos.departamentoUsuario.textContent =
                    perfil.role === "super_admin"
                        ? "Super administrador"
                        : "Departamento não definido";
            }
        }

        const { data: departamentoPerfil } = await supabase
            .from("departments")
            .select("name")
            .eq("id", perfil.department_id)
            .maybeSingle();

        perfil.nomeDepartamento = departamentoPerfil?.name || "";
        perfil.podeEnviarMensagem =
            perfil.nomeDepartamento.trim().toLowerCase() === "atendimento";
        return perfil;
    }

    async function carregarOcorrencia(perfil) {
        const { data: ocorrencia, error } = await supabase
            .from("operational_occurrences")
            .select(`
                id,
                occurrence_code,
                title,
                description,
                category,
                severity,
                status,
                responsible_department_id,
                created_by,
                created_at,
                updated_at,
                identified_at,
                resolved_at,
                location,
                observations
            `)
            .eq("id", ocorrenciaId)
            .maybeSingle();

        if (error) {
            console.error("Erro ao carregar ocorrência:", error);
            throw new Error("Não foi possível carregar a ocorrência. Verifique sua conexão e suas permissões.");
        }

        if (!ocorrencia) {
            throw new Error("Ocorrência não encontrada ou sem permissão para visualizá-la.");
        }

        const { data: departamento } = await supabase
            .from("departments")
            .select("name")
            .eq("id", ocorrencia.responsible_department_id)
            .maybeSingle();

        const { data: voos, error: erroVoos } = await supabase
            .from("occurrence_flights")
            .select(`
                id,
                flight_number,
                travel_date,
                relationship_type,
                impact_status,
                estimated_delay_minutes,
                notes,
                created_at
            `)
            .eq("occurrence_id", ocorrenciaId)
            .order("travel_date", { ascending: true });

        if (erroVoos) {
            console.error("Erro ao carregar voos:", erroVoos);
            throw new Error("A ocorrência foi encontrada, mas não foi possível carregar os voos relacionados.");
        }

        const { data: atualizacoes, error: erroHistorico } = await supabase
            .from("occurrence_updates")
            .select(`
                id,
                author_id,
                department_id,
                update_type,
                internal_message,
                customer_message,
                created_at
            `)
            .eq("occurrence_id", ocorrenciaId)
            .order("created_at", { ascending: false });

        if (erroHistorico) {
            console.error("Erro ao carregar histórico:", erroHistorico);
            throw new Error("A ocorrência foi encontrada, mas não foi possível carregar seu histórico.");
        }

        const idsAutores = [...new Set(
            (atualizacoes || []).map(item => item.author_id).filter(Boolean)
        )];

        const idsDepartamentos = [...new Set(
            (atualizacoes || []).map(item => item.department_id).filter(Boolean)
        )];

        let perfis = [];
        let departamentosHistorico = [];

        if (idsAutores.length) {
            const resultado = await supabase
                .from("profiles")
                .select("id, display_name")
                .in("id", idsAutores);

            if (resultado.error) {
                console.error("Erro ao carregar autores:", resultado.error);
            } else {
                perfis = resultado.data || [];
            }
        }

        if (idsDepartamentos.length) {
            const resultado = await supabase
                .from("departments")
                .select("id, name")
                .in("id", idsDepartamentos);

            if (resultado.error) {
                console.error("Erro ao carregar departamentos do histórico:", resultado.error);
            } else {
                departamentosHistorico = resultado.data || [];
            }
        }

        renderizarOcorrencia(
            ocorrencia,
            departamento,
            voos || [],
            atualizacoes || [],
            perfis,
            departamentosHistorico
        );
    }

    function renderizarOcorrencia(
        ocorrencia,
        departamento,
        voos,
        atualizacoes,
        perfis,
        departamentosHistorico
    ) {
        document.title = `${ocorrencia.title} | AzulTrack`;

        elementos.titulo.textContent = textoSeguro(ocorrencia.title, "Ocorrência sem título");
        elementos.codigo.textContent = `Ocorrência #${ocorrencia.occurrence_code}`;

        elementos.status.textContent =
            statusLegendas[ocorrencia.status] || ocorrencia.status;
        elementos.status.className =
            `badge-ocorrencia ${classeStatus(ocorrencia.status)}`;

        elementos.gravidade.textContent =
            gravidadeLegendas[ocorrencia.severity] || ocorrencia.severity;
        elementos.gravidade.className =
            `badge-ocorrencia ${classeGravidade(ocorrencia.severity)}`;

        elementos.dataIdentificacao.textContent = formatarData(ocorrencia.identified_at);
        elementos.departamento.textContent =
            departamento?.name || textoSeguro(ocorrencia.responsible_department_id);

        elementos.quantidadeVoos.textContent =
            `${voos.length} ${voos.length === 1 ? "voo" : "voos"}`;

        elementos.descricao.textContent = textoSeguro(ocorrencia.description);
        elementos.categoria.textContent =
            categoriaLegendas[ocorrencia.category] || ocorrencia.category;
        elementos.local.textContent = textoSeguro(ocorrencia.location);
        elementos.observacoes.textContent =
            textoSeguro(ocorrencia.observations, "Nenhuma observação registrada.");

        elementos.dataCriacao.textContent = formatarData(ocorrencia.created_at);
        elementos.dataAtualizacao.textContent = formatarData(ocorrencia.updated_at);
        elementos.campoResolucao.hidden = !ocorrencia.resolved_at;
        elementos.dataResolucao.textContent = formatarData(ocorrencia.resolved_at);

        renderizarVoos(voos);
        renderizarHistorico(atualizacoes, perfis, departamentosHistorico);
        renderizarMensagens(atualizacoes, perfis);

        elementos.mensagem.hidden = true;
        elementos.conteudo.hidden = false;

        ocorrenciaAtual = ocorrencia;
        voosAtuais = voos;

        configurarAcoes(ocorrencia).catch(erro => {
            console.error("Erro ao configurar ações:", erro);
            alert("Não foi possível preparar as ações desta ocorrência.");
        });

        atualizarIcones();
    }

    function renderizarVoos(voos) {
        elementos.voos.replaceChildren();

        if (!voos.length) {
            elementos.voos.appendChild(
                criarElemento("div", "estado-vazio", "Nenhum voo foi relacionado a esta ocorrência.")
            );
            return;
        }

        voos.forEach(voo => {
            const cartao = criarElemento("article", "voo-relacionado");
            const topo = criarElemento("div", "voo-relacionado-topo");
            const identificacao = criarElemento("div", "voo-identificacao");
            const icone = criarElemento("i");

            icone.setAttribute("data-lucide", "plane");

            identificacao.append(
                icone,
                criarElemento("strong", "", textoSeguro(voo.flight_number))
            );

            const impacto = criarElemento(
                "span",
                `badge-impacto impacto-${voo.impact_status}`,
                statusImpacto[voo.impact_status] || voo.impact_status
            );

            topo.append(identificacao, impacto);
            cartao.appendChild(topo);

            adicionarCampo(cartao, "Data da viagem", formatarDataViagem(voo.travel_date));
            adicionarCampo(
                cartao,
                "Relação com a ocorrência",
                tiposRelacao[voo.relationship_type] || voo.relationship_type
            );

            if (voo.estimated_delay_minutes !== null) {
                adicionarCampo(cartao, "Atraso estimado", `${voo.estimated_delay_minutes} minutos`);
            }

            if (voo.notes) {
                adicionarCampo(cartao, "Observações do voo", voo.notes);
            }

            elementos.voos.appendChild(cartao);
        });
    }

    function renderizarHistorico(atualizacoes, perfis, departamentos) {
        elementos.historico.replaceChildren();

        if (!atualizacoes.length) {
            elementos.historico.appendChild(
                criarElemento("div", "estado-vazio", "Ainda não há atualizações registradas no histórico.")
            );
            return;
        }

        const mapaPerfis = new Map(
            perfis.map(perfil => [perfil.id, perfil.display_name])
        );

        const mapaDepartamentos = new Map(
            departamentos.map(departamento => [departamento.id, departamento.name])
        );

        atualizacoes.forEach(atualizacao => {
            const item = criarElemento("article", "item-historico");
            const marcador = criarElemento("div", "historico-marcador");
            const conteudo = criarElemento("div", "historico-conteudo");
            const topo = criarElemento("div", "historico-topo");

            topo.append(
                criarElemento(
                    "strong",
                    "",
                    tiposAtualizacao[atualizacao.update_type] || atualizacao.update_type
                ),
                criarElemento("time", "", formatarData(atualizacao.created_at))
            );

            conteudo.appendChild(topo);
            conteudo.appendChild(
                criarElemento("p", "historico-mensagem", atualizacao.internal_message)
            );

            const autor = textoSeguro(mapaPerfis.get(atualizacao.author_id), "Funcionário");
            const nomeDepartamento = mapaDepartamentos.get(atualizacao.department_id);
            const detalhesAutor = nomeDepartamento
                ? `${autor} · ${nomeDepartamento}`
                : autor;

            conteudo.appendChild(criarElemento("span", "historico-autor", detalhesAutor));
            item.append(marcador, conteudo);
            elementos.historico.appendChild(item);
        });
    }

    function renderizarMensagens(atualizacoes, perfis) {
        elementos.mensagens.replaceChildren();

        const mensagens = atualizacoes.filter(
            atualizacao =>
                atualizacao.customer_message &&
                atualizacao.customer_message.trim()
        );

        if (!mensagens.length) {
            elementos.mensagens.appendChild(
                criarElemento("div", "estado-vazio", "Nenhuma mensagem destinada aos clientes foi registrada.")
            );
            return;
        }

        const mapaPerfis = new Map(
            perfis.map(perfil => [perfil.id, perfil.display_name])
        );

        mensagens.forEach(atualizacao => {
            const cartao = criarElemento("article", "mensagem-cliente");
            const topo = criarElemento("div", "mensagem-cliente-topo");
            const icone = criarElemento("i");

            icone.setAttribute("data-lucide", "message-circle");

            topo.append(
                icone,
                criarElemento("strong", "", "Mensagem ao cliente")
            );

            cartao.appendChild(topo);
            cartao.appendChild(criarElemento("p", "", atualizacao.customer_message));
            cartao.appendChild(
                criarElemento(
                    "span",
                    "historico-autor",
                    `${textoSeguro(mapaPerfis.get(atualizacao.author_id), "Funcionário")} · ${formatarData(atualizacao.created_at)}`
                )
            );

            elementos.mensagens.appendChild(cartao);
        });
    }

    async function configurarAcoes(ocorrencia) {
        document.getElementById("acoesEdicao")?.remove();
        document.getElementById("formularioEdicao")?.remove();
        document.getElementById("formularioMensagem")?.remove();

        const acoes = criarElemento("div", "acoes-detalhes");
        acoes.id = "acoesEdicao";

        const botaoEditar = criarElemento("button", "botao-editar", "Editar ocorrência");
        botaoEditar.type = "button";

        const botaoMensagem = criarElemento("button", "botao-mensagem", "Registrar mensagem");
        botaoMensagem.type = "button";
        botaoMensagem.hidden = !perfilAtual.podeEnviarMensagem;

        acoes.append(botaoEditar, botaoMensagem);

        elementos.conteudo.before(acoes);

        const formularioEdicao = criarElemento("form", "formulario-detalhes");
        formularioEdicao.id = "formularioEdicao";
        formularioEdicao.hidden = true;

        formularioEdicao.innerHTML = `
            <h2>Editar ocorrência</h2>
            <label for="editarTitulo">Título</label>
            <input id="editarTitulo" name="title" maxlength="180" required>
            <label for="editarDescricao">Descrição</label>
            <textarea id="editarDescricao" name="description" rows="4" required></textarea>
            <label for="editarCategoria">Categoria</label>
            <select id="editarCategoria" name="category" required>
                <option value="Manutenção">Manutenção</option>
                <option value="Condições climáticas">Condições climáticas</option>
                <option value="Tripulação">Tripulação</option>
                <option value="Infraestrutura aeroportuária">Infraestrutura aeroportuária</option>
                <option value="Sistema">Sistema</option>
                <option value="Segurança">Segurança</option>
                <option value="Outro">Outro</option>
            </select>
            <label for="editarGravidade">Gravidade</label>
            <select id="editarGravidade" name="severity" required>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
            </select>
            <label for="editarStatus">Status</label>
            <select id="editarStatus" name="status" required>
                <option value="aberta">Aberta</option>
                <option value="em_analise">Em análise</option>
                <option value="em_andamento">Em andamento</option>
                <option value="resolvida">Resolvida</option>
                <option value="cancelada">Cancelada</option>
            </select>
            <label for="editarDepartamento">Departamento responsável</label>
            <select id="editarDepartamento" name="responsible_department_id" required></select>
            <label for="editarLocal">Localização</label>
            <input id="editarLocal" name="location" maxlength="200">
            <label for="editarObservacoes">Observações</label>
            <textarea id="editarObservacoes" name="observations" rows="3"></textarea>
            <label for="editarMotivo">Motivo da alteração</label>
            <textarea id="editarMotivo" name="motivo" rows="2" placeholder="Descreva o que motivou a alteração" required></textarea>
            <div class="botoes-formulario">
                <button type="button" id="cancelarEdicao">Cancelar</button>
                <button type="submit" id="salvarEdicao">Salvar alterações</button>
            </div>
        `;

        elementos.conteudo.before(formularioEdicao);

        const formularioMensagem = criarElemento("form", "formulario-detalhes");
        formularioMensagem.id = "formularioMensagem";
        formularioMensagem.hidden = true;

        formularioMensagem.innerHTML = `
            <h2>Registrar mensagem</h2>
            <label for="tipoMensagem">Tipo de registro</label>
            <select id="tipoMensagem" name="tipoMensagem" required>
                <option value="atualizacao">Atualização</option>
                <option value="mudanca_status">Mudança de status</option>
                <option value="impacto_voo">Impacto em voo</option>
                <option value="resolucao">Resolução</option>
            </select>
            <label for="mensagemInterna">Mensagem interna</label>
            <textarea id="mensagemInterna" name="mensagemInterna" rows="3" required placeholder="Mensagem para a equipe operacional"></textarea>
            <label for="mensagemCliente">Mensagem destinada ao cliente (opcional)</label>
            <textarea id="mensagemCliente" name="mensagemCliente" rows="3" placeholder="Informação que poderá ser comunicada ao cliente"></textarea>
            <div class="botoes-formulario">
                <button type="button" id="cancelarMensagem">Cancelar</button>
                <button type="submit" id="salvarMensagem">Registrar mensagem</button>
            </div>
        `;

        elementos.conteudo.before(formularioMensagem);

        const { data: departamentos, error: erroDepartamentos } = await supabase
            .from("departments")
            .select("id, name")
            .order("name");

        if (erroDepartamentos) {
            console.error("Erro ao carregar departamentos:", erroDepartamentos);
            botaoEditar.disabled = true;
            botaoMensagem.disabled = true;
            alert("Não foi possível carregar os departamentos para as ações da ocorrência.");
            return;
        }

        const campo = seletor => formularioEdicao.querySelector(seletor);

        const selectDepartamento = campo("#editarDepartamento");

        (departamentos || []).forEach(departamento => {
            const opcao = document.createElement("option");
            opcao.value = departamento.id;
            opcao.textContent = departamento.name;
            selectDepartamento.appendChild(opcao);
        });

        function preencherFormulario() {
            campo("#editarTitulo").value = ocorrencia.title || "";
            campo("#editarDescricao").value = ocorrencia.description || "";
            campo("#editarCategoria").value = ocorrencia.category || "Outro";
            campo("#editarGravidade").value = ocorrencia.severity || "media";
            campo("#editarStatus").value = ocorrencia.status || "aberta";
            campo("#editarDepartamento").value = ocorrencia.responsible_department_id || "";
            campo("#editarLocal").value = ocorrencia.location || "";
            campo("#editarObservacoes").value = ocorrencia.observations || "";
            campo("#editarMotivo").value = "";
        }

        botaoEditar.addEventListener("click", () => {
            preencherFormulario();
            formularioMensagem.hidden = true;
            formularioEdicao.hidden = false;
            formularioEdicao.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        botaoMensagem.addEventListener("click", () => {
            if (!perfilAtual.podeEnviarMensagem) return;

            formularioEdicao.hidden = true;
            formularioMensagem.reset();
            formularioMensagem.hidden = false;
            formularioMensagem.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        formularioEdicao.querySelector("#cancelarEdicao").addEventListener("click", () => {
            formularioEdicao.hidden = true;
        });

        formularioMensagem.querySelector("#cancelarMensagem").addEventListener("click", () => {
            formularioMensagem.hidden = true;
        });


        formularioEdicao.addEventListener("submit", async (evento) => {
            evento.preventDefault();

            const botaoSalvar = formularioEdicao.querySelector(
                'button[type="submit"]'
            );

            try {
                if (botaoSalvar) botaoSalvar.disabled = true;

                const dados = {
                    title: formularioEdicao.querySelector("#editarTitulo").value.trim(),
                    description: formularioEdicao.querySelector("#editarDescricao").value.trim(),
                    category: formularioEdicao.querySelector("#editarCategoria").value,
                    severity: formularioEdicao.querySelector("#editarGravidade").value,
                    status: formularioEdicao.querySelector("#editarStatus").value,
                    responsible_department_id: formularioEdicao.querySelector("#editarDepartamento").value || null,
                    location: formularioEdicao.querySelector("#editarLocal").value.trim(),
                    observations: formularioEdicao.querySelector("#editarObservacoes").value.trim(),
                    updated_at: new Date().toISOString(),
                    resolved_at: null
                };

                const motivo = document.getElementById("editarMotivo").value.trim();

                if (
                    !dados.title ||
                    !dados.description ||
                    !dados.category ||
                    !dados.severity ||
                    !dados.status ||
                    !motivo
                ) {
                    alert("Preencha todos os campos obrigatórios.");
                    return;
                }

                const anterior = ocorrenciaAtual;

                if (dados.status === "resolvida") {
                    dados.resolved_at = new Date().toISOString();
                }

                const alteracoes = [];

                if (anterior.title !== dados.title) alteracoes.push("Título");
                if (anterior.description !== dados.description) alteracoes.push("Descrição");
                if (anterior.category !== dados.category) alteracoes.push("Categoria");
                if (anterior.severity !== dados.severity) alteracoes.push("Severidade");
                if (anterior.status !== dados.status) alteracoes.push("Status");
                if (
                    anterior.responsible_department_id !==
                    dados.responsible_department_id
                ) {
                    alteracoes.push("Departamento responsável");
                }
                if (anterior.location !== dados.location) alteracoes.push("Localização");
                if (anterior.observations !== dados.observations) alteracoes.push("Observações");

                if (!alteracoes.length) {
                    alert("Nenhuma alteração foi realizada.");
                    return;
                }

                const mensagemHistorico =
                    `${motivo}\nCampos alterados: ${alteracoes.join(", ")}.`;

                const { error } = await supabase.rpc(
                    "salvar_alteracoes_ocorrencia",
                    {
                        p_occurrence_id: ocorrenciaId,
                        p_title: dados.title,
                        p_description: dados.description,
                        p_category: dados.category,
                        p_severity: dados.severity,
                        p_status: dados.status,
                        p_responsible_department_id: dados.responsible_department_id,
                        p_location: dados.location,
                        p_observations: dados.observations,
                        p_resolved_at: dados.resolved_at,
                        p_motivo: mensagemHistorico
                    }
                );

                if (error) throw error;

                alert("Ocorrência atualizada com sucesso.");
                formularioEdicao.hidden = true;
                await carregarOcorrencia(perfilAtual);
            } catch (erro) {
                console.error("Erro ao atualizar ocorrência:", erro);
                alert("Não foi possível atualizar a ocorrência. Verifique os dados e tente novamente.");
            } finally {
                if (botaoSalvar) botaoSalvar.disabled = false;
            }
        });

        formularioMensagem.addEventListener("submit", async evento => {
            evento.preventDefault();

            const botaoSalvar = formularioMensagem.querySelector("#salvarMensagem");
            botaoSalvar.disabled = true;

            try {
                const tipo = formularioMensagem.querySelector("#tipoMensagem").value;
                const interna = formularioMensagem.querySelector("#mensagemInterna").value.trim();
                const cliente = formularioMensagem.querySelector("#mensagemCliente").value.trim();

                if (!interna) {
                    alert("Informe a mensagem interna.");
                    return;
                }

                const { error } = await supabase
                    .from("occurrence_updates")
                    .insert({
                        occurrence_id: ocorrenciaId,
                        author_id: usuarioAtualId,
                        department_id: perfilAtual.department_id,
                        update_type: tipo,
                        internal_message: interna,
                        customer_message: cliente || null
                    });

                if (error) throw error;

                alert("Mensagem registrada com sucesso.");
                formularioMensagem.reset();
                formularioMensagem.hidden = true;

                await carregarOcorrencia(perfilAtual);
            } catch (erro) {
                console.error("Erro ao registrar mensagem:", erro);
                alert(erro.message || "Não foi possível registrar a mensagem. Verifique suas permissões.");
            } finally {
                botaoSalvar.disabled = false;
            }
        });
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

    async function iniciar() {
        if (!supabase) {
            definirMensagem("O Supabase não foi inicializado. Confira o arquivo ../../supabase.js.", "erro");
            return;
        }

        if (!ocorrenciaId) {
            definirMensagem("Nenhum ID de ocorrência foi informado. Volte para operações e selecione uma ocorrência.", "erro");
            return;
        }

        const uuidValido =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                .test(ocorrenciaId);

        if (!uuidValido) {
            definirMensagem("O ID informado não é válido.", "erro");
            return;
        }

        try {
            const {
                data: { session },
                error
            } = await supabase.auth.getSession();

            if (error) throw error;

            if (!session) {
                window.location.replace("../../login/index.html");
                return;
            }

            usuarioAtualId = session.user.id;
            perfilAtual = await carregarPerfil(session.user);

            if (!perfilAtual) return;

            await atualizarBolinhaNotificacoes(usuarioAtualId);
            await carregarOcorrencia(perfilAtual);

        } catch (erro) {
            console.error("Erro ao iniciar detalhes:", erro);
            definirMensagem(erro.message || "Ocorreu um erro ao carregar os detalhes.", "erro");
        }
    }

    const botaoSair = document.getElementById("botaoSair");

    if (botaoSair) {
        botaoSair.addEventListener("click", async evento => {
            evento.preventDefault();

            if (!supabase) {
                window.location.href = "../../login/index.html";
                return;
            }

            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error("Erro ao sair:", error);
                alert("Não foi possível encerrar a sessão. Tente novamente.");
                return;
            }

            window.location.href = "../../login/index.html";
        });
    }

    iniciar();
})();