
(async function iniciarCadastroOcorrencia() {
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

    if (elementoNome) {
        elementoNome.textContent = nome;
    }

    const avatar = document.getElementById("avatarUsuario");

    if (avatar) {
        const partesNome = nome.trim().split(/\s+/).filter(Boolean);

        avatar.textContent = partesNome.length > 1
            ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
            : partesNome[0][0].toUpperCase();

        avatar.title = nome;
        avatar.setAttribute("aria-label", `Administrador: ${nome}`);
    }

    const elementoDepartamento =
        document.getElementById("departamentoUsuario");

    if (elementoDepartamento) {
        let nomeDepartamento = "Super Administrador";

        if (perfil.department_id) {
            const { data: departamentoPerfil, error: erroDepartamento } =
                await cliente
                    .from("departments")
                    .select("name")
                    .eq("id", perfil.department_id)
                    .maybeSingle();

            if (erroDepartamento) {
                console.error(
                    "Erro ao carregar departamento do perfil:",
                    erroDepartamento
                );
            }

            if (departamentoPerfil?.name) {
                nomeDepartamento = departamentoPerfil.name;
            }
        }

        elementoDepartamento.textContent = nomeDepartamento;
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
            console.error(
                "Erro ao consultar notificações não lidas:",
                error
            );
            return;
        }

        bolinha.hidden = !data || data.length === 0;
    }

    await atualizarBolinhaNotificacoes();

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

    const formulario = document.getElementById("formOcorrencia");
    const titulo = document.getElementById("tituloOcorrencia");
    const descricao = document.getElementById("descricaoOcorrencia");
    const categoria = document.getElementById("categoriaOcorrencia");
    const gravidade = document.getElementById("gravidadeOcorrencia");
    const dataIdentificacao = document.getElementById("dataIdentificacaoOcorrencia");
    const local = document.getElementById("localOcorrencia");
    const departamento = document.getElementById("departamentoOcorrencia");
    const observacoes = document.getElementById("observacoesOcorrencia");
    const listaVoos = document.getElementById("listaVoosOcorrencia");
    const botaoAdicionarVoo = document.getElementById("adicionarVooOcorrencia");
    const botaoSalvar = document.getElementById("salvarOcorrencia");
    const erroFormulario = document.getElementById("erroFormularioOcorrencia");

    function mostrarErro(mensagem) {
        erroFormulario.textContent = mensagem;
        erroFormulario.hidden = false;
    }

    function limparErro() {
        erroFormulario.textContent = "";
        erroFormulario.hidden = true;
    }

    async function carregarDepartamentos() {
        const { data, error } = await cliente
            .from("departments")
            .select("id, name")
            .order("name");

        if (error) {
            console.error("Erro ao carregar departamentos:", error);
            mostrarErro("Não foi possível carregar os departamentos.");
            departamento.disabled = true;
            return false;
        }

        departamento.replaceChildren(
            new Option("Selecione o setor responsável", "")
        );

        (data ?? []).forEach(item => {
            departamento.add(new Option(item.name, item.id));
        });

        return true;
    }

    function adicionarVoo() {
        const bloco = document.createElement("div");
        bloco.className = "voo-ocorrencia";

        bloco.innerHTML = `
            <div class="grade-formulario">
                <label class="campo-ocorrencia">
                    <span>Número do voo</span>
                    <input type="text" name="numeroVoo"
                        maxlength="6" placeholder="Ex.: AD1234">
                </label>

                <label class="campo-ocorrencia">
                    <span>Data da viagem</span>
                    <input type="date" name="dataVoo">
                </label>

                <label class="campo-ocorrencia">
                    <span>Relação com a ocorrência</span>
                    <select name="tipoRelacaoVoo">
                        <option value="">Selecione</option>
                        <option value="origem">Voo de origem</option>
                        <option value="afetado">Voo afetado</option>
                        <option value="conexao">Voo de conexão</option>
                    </select>
                </label>

                <label class="campo-ocorrencia">
                    <span>Situação do impacto</span>
                    <select name="situacaoImpactoVoo">
                        <option value="suspeito">Em avaliação</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="descartado">Descartado</option>
                    </select>
                </label>

                <label class="campo-ocorrencia">
                    <span>Atraso estimado (minutos)</span>
                    <input type="number" name="atrasoEstimado"
                        min="0" step="1" placeholder="Se conhecido">
                </label>
            </div>

            <button type="button" class="botao-remover-voo">
                Remover voo
            </button>
        `;

        bloco.querySelector(".botao-remover-voo")
            .addEventListener("click", () => bloco.remove());

        listaVoos.appendChild(bloco);

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

    function obterVoos() {
        const blocos = [...listaVoos.querySelectorAll(".voo-ocorrencia")];
        const voos = [];

        for (const bloco of blocos) {
            const numero = bloco.querySelector('[name="numeroVoo"]').value
                .trim()
                .toUpperCase();

            const data = bloco.querySelector('[name="dataVoo"]').value;
            const relacao = bloco.querySelector('[name="tipoRelacaoVoo"]').value;
            const impacto = bloco.querySelector('[name="situacaoImpactoVoo"]').value;
            const atrasoCampo = bloco.querySelector('[name="atrasoEstimado"]').value;

            const temAlgumDado = numero || data || atrasoCampo ||
                relacao || impacto !== "suspeito";

            if (!temAlgumDado) {
                continue;
            }

            if (!numero || !data || !relacao) {
                throw new Error(
                    "Preencha o número, a data e a relação de cada voo informado."
                );
            }

            if (!/^[A-Z]{2}[0-9]{1,4}$/.test(numero)) {
                throw new Error(
                    `O número do voo "${numero}" é inválido. Use o formato AD1234.`
                );
            }

            if (atrasoCampo !== "" &&
                (!Number.isInteger(Number(atrasoCampo)) ||
                    Number(atrasoCampo) < 0)) {
                throw new Error(
                    "O atraso estimado deve ser um número inteiro igual ou maior que zero."
                );
            }

            voos.push({
                flight_number: numero,
                travel_date: data,
                relationship_type: relacao,
                impact_status: impacto,
                estimated_delay_minutes: atrasoCampo === ""
                    ? null
                    : Number(atrasoCampo)
            });
        }

        const identificadores = new Set();

        for (const voo of voos) {
            const chave = `${voo.flight_number}|${voo.travel_date}`;

            if (identificadores.has(chave)) {
                throw new Error(
                    `O voo ${voo.flight_number} já foi informado para essa data.`
                );
            }

            identificadores.add(chave);
        }

        return voos;
    }

    botaoAdicionarVoo.addEventListener("click", adicionarVoo);

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();
        limparErro();

        if (!formulario.reportValidity()) {
            return;
        }

        let idOcorrencia = null;

        botaoSalvar.disabled = true;
        botaoAdicionarVoo.disabled = true;
        botaoSalvar.textContent = "Salvando...";

        try {
            const voos = obterVoos();

            const dataInformada = new Date(dataIdentificacao.value);

            if (Number.isNaN(dataInformada.getTime())) {
                throw new Error(
                    "Informe uma data e um horário válidos para a identificação."
                );
            }

            const registro = {
                title: titulo.value.trim(),
                description: descricao.value.trim(),
                category: categoria.value,
                severity: gravidade.value,
                status: "aberta",
                responsible_department_id: departamento.value,
                created_by: sessao.user.id,
                identified_at: dataInformada.toISOString(),
                location: local.value.trim() || null,
                observations: observacoes.value.trim() || null
            };

            const { data: ocorrencia, error: erroCadastro } = await cliente
                .from("operational_occurrences")
                .insert(registro)
                .select("id, occurrence_code")
                .single();

            if (erroCadastro) {
                console.error("Erro detalhado do Supabase:", {
                    message: erroCadastro.message,
                    code: erroCadastro.code,
                    details: erroCadastro.details,
                    hint: erroCadastro.hint
                });

                throw new Error(
                    `${erroCadastro.message} (código: ${erroCadastro.code || "não informado"})`
                );
            }

            idOcorrencia = ocorrencia.id;

            if (voos.length > 0) {
                const voosParaSalvar = voos.map(voo => ({
                    ...voo,
                    occurrence_id: idOcorrencia
                }));

                const { error: erroVoos } = await cliente
                    .from("occurrence_flights")
                    .insert(voosParaSalvar);

                if (erroVoos) {
                    console.error("Erro ao registrar voos:", erroVoos);
                    throw new Error(
                        "A ocorrência foi criada, mas não foi possível salvar os voos relacionados."
                    );
                }
            }

            const partesHistorico = [
                `Ocorrência registrada: ${titulo.value.trim()}.`,
                `Descrição inicial: ${descricao.value.trim()}.`
            ];

            if (local.value.trim()) {
                partesHistorico.push(`Local: ${local.value.trim()}.`);
            }

            if (observacoes.value.trim()) {
                partesHistorico.push(
                    `Observações complementares: ${observacoes.value.trim()}`
                );
            }

            const { error: erroHistorico } = await cliente
                .from("occurrence_updates")
                .insert({
                    occurrence_id: idOcorrencia,
                    author_id: sessao.user.id,
                    department_id: departamento.value,
                    update_type: "registro",
                    internal_message: partesHistorico.join("\n"),
                    customer_message: null
                });

            if (erroHistorico) {
                console.error("Erro ao registrar histórico:", erroHistorico);
                throw new Error(
                    "A ocorrência foi criada, mas não foi possível registrar seu histórico."
                );
            }

            alert(
                `Ocorrência #${ocorrencia.occurrence_code} registrada com sucesso.`
            );

            formulario.reset();
            listaVoos.replaceChildren();
            gravidade.value = "media";

        } catch (erro) {
            console.error("Erro ao registrar ocorrência:", erro);

            if (idOcorrencia) {
                mostrarErro(
                    `${erro.message} O registro da ocorrência principal já foi criado. Verifique os dados antes de tentar novamente para evitar duplicidade.`
                );
            } else {
                mostrarErro(
                    erro.message || "Ocorreu um erro ao registrar a ocorrência."
                );
            }
        } finally {
            botaoSalvar.disabled = false;
            botaoAdicionarVoo.disabled = false;
            botaoSalvar.innerHTML =
                '<i data-lucide="save" class="icone"></i> Registrar ocorrência';

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    });

    const departamentosCarregados = await carregarDepartamentos();

    if (!departamentosCarregados) {
        botaoSalvar.disabled = true;
    }
})();