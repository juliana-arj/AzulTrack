
const clienteSupabase = window.supabaseClient;

const listaUsuarios = document.getElementById("listaUsuarios");
const pesquisaUsuario = document.getElementById("pesquisaUsuario");
const filtroSetor = document.getElementById("filtroSetor");
const mensagemSetores = document.getElementById("mensagemSetores");
const nomeUsuario = document.getElementById("nomeUsuario");
const departamentoUsuario = document.getElementById("departamentoUsuario");
const avatarUsuario = document.getElementById("avatarUsuario");
const bolinhaNotificacoes = document.getElementById("bolinhaNotificacoes");

let usuarios = [];
let setores = [];
let usuarioAtual = null;

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function mostrarMensagem(texto, tipo = "") {
    mensagemSetores.textContent = texto;
    mensagemSetores.className = `mensagem-setores ${tipo}`;
    mensagemSetores.hidden = false;
}

function atualizarIndicadores() {
    document.getElementById("totalUsuarios").textContent = usuarios.length;
    document.getElementById("usuariosAtribuidos").textContent =
        usuarios.filter(usuario => usuario.department_id).length;
    document.getElementById("usuariosSemSetor").textContent =
        usuarios.filter(usuario => !usuario.department_id).length;
}

function carregarFiltroSetores() {
    const valorAtual = filtroSetor.value;

    filtroSetor.innerHTML = `
        <option value="todos">Todos os setores</option>
        <option value="sem_setor">Sem setor definido</option>
        ${setores.map(setor => `
            <option value="${escaparHTML(setor.id)}">
                ${escaparHTML(setor.name)}
            </option>
        `).join("")}
    `;

    if ([...filtroSetor.options].some(opcao => opcao.value === valorAtual)) {
        filtroSetor.value = valorAtual;
    }
}

function renderizarUsuarios() {
    const termo = pesquisaUsuario.value.trim().toLocaleLowerCase("pt-BR");
    const filtro = filtroSetor.value;

    const filtrados = usuarios.filter(usuario => {
        const nome = (usuario.display_name || "").toLocaleLowerCase("pt-BR");

        const correspondePesquisa = nome.includes(termo);

        const correspondeSetor =
            filtro === "todos" ||
            (filtro === "sem_setor" && !usuario.department_id) ||
            usuario.department_id === filtro;

        return correspondePesquisa && correspondeSetor;
    });

    if (!filtrados.length) {
        listaUsuarios.innerHTML = `
            <tr>
                <td colspan="5" class="linha-vazia">
                    Nenhum usuário encontrado.
                </td>
            </tr>
        `;
        return;
    }

    listaUsuarios.innerHTML = filtrados.map(usuario => {
        const setorAtual = setores.find(
            setor => setor.id === usuario.department_id
        );

        const nome = usuario.display_name || "Usuário sem nome";

        const funcao = {
            user: "Usuário",
            admin: "Administrador",
            super_admin: "Super administrador"
        }[usuario.role] || "Usuário";

        return `
            <tr data-usuario="${escaparHTML(usuario.id)}">
                <td>
                    <div class="usuario-nome">${escaparHTML(nome)}</div>
                </td>
                <td>${funcao}</td>
                <td>
                    <span class="${setorAtual ? "" : "setor-vazio"}">
                        ${escaparHTML(setorAtual?.name || "Sem setor")}
                    </span>
                </td>
                <td>
                    <select class="seletor-setor"
                        aria-label="Setor de ${escaparHTML(nome)}">
                        <option value="">Sem setor</option>
                        ${setores.map(setor => `
                            <option value="${escaparHTML(setor.id)}"
                                ${usuario.department_id === setor.id ? "selected" : ""}>
                                ${escaparHTML(setor.name)}
                            </option>
                        `).join("")}
                    </select>
                </td>
                <td>
                    <button class="botao-salvar" type="button"
                        data-salvar="${escaparHTML(usuario.id)}">
                        Salvar
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}


async function carregarPerfilCabecalho(user) {
    const { data: perfil, error } = await clienteSupabase
        .from("profiles")
        .select("display_name, department_id, role")
        .eq("id", user.id)
        .single();

    if (error) throw error;

    const nome = perfil.display_name || user.email || "Usuário";

    nomeUsuario.textContent = nome;

    const setoresPorId = {
        atendimento: "Atendimento",
        comunicacao: "Comunicação",
        operacoes: "Operações",
        gestao: "Gestão",
        cco: "Centro de Controle Operacional",
        comercial: "Comercial",
        handling: "Handling",
        manutencao: "Manutenção"
    };

    if (perfil.role === "super_admin") {
        departamentoUsuario.textContent = "Super administrador";
    } else {
        const { data: setor, error: erroSetor } = await clienteSupabase
            .from("departments")
            .select("name")
            .eq("id", perfil.department_id)
            .maybeSingle();

        if (erroSetor) throw erroSetor;

        departamentoUsuario.textContent =
            setor?.name ||
            setoresPorId[perfil.department_id] ||
            "Departamento não definido";
    }

    avatarUsuario.textContent = nome
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0])
        .join("")
        .toUpperCase();
}

async function atualizarBolinhaNotificacoes(userId) {
    bolinhaNotificacoes.hidden = true;

    const { data, error } = await clienteSupabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .is("read_at", null)
        .limit(1);

    if (error) {
        console.error("Erro ao consultar notificações:", error);
        return;
    }

    bolinhaNotificacoes.hidden = !data || data.length === 0;
}

document.getElementById("sairConta").addEventListener("click", async event => {
    event.preventDefault();

    const { error } = await clienteSupabase.auth.signOut();

    if (error) {
        console.error("Erro ao sair da conta:", error);
        mostrarMensagem("Não foi possível sair da conta.", "erro");
        return;
    }

    window.location.replace("../../login/index.html");
});

async function carregarDados() {
    mostrarMensagem("Verificando acesso...");

    const { data: { user }, error: erroAutenticacao } =
        await clienteSupabase.auth.getUser();

    if (erroAutenticacao) {
        console.error(erroAutenticacao);
        window.location.replace("../../login/index.html");
        return;
    }

    if (!user) {
        window.location.replace("../../login/index.html");
        return;
    }

    const { data: perfil, error: erroPerfil } = await clienteSupabase
        .from("profiles")
        .select("id, role, department_id")
        .eq("id", user.id)
        .maybeSingle();

    if (erroPerfil) {
        console.error("Erro ao verificar perfil:", erroPerfil);
        mostrarMensagem("Não foi possível verificar seu acesso.", "erro");
        return;
    }

    if (!perfil || (perfil.role !== "super_admin" && !perfil.department_id)) {
        await clienteSupabase.auth.signOut();
        window.location.replace("../../login/index.html");
        return;
    }

    usuarioAtual = user;

    try {
        await carregarPerfilCabecalho(user);
        await atualizarBolinhaNotificacoes(user.id);

        const [resultadoSetores, resultadoUsuarios] = await Promise.all([
            clienteSupabase
                .from("departments")
                .select("id, name")
                .order("name"),

            clienteSupabase
                .from("profiles")
                .select("id, display_name, role, department_id")
                .order("display_name")
        ]);

        if (resultadoSetores.error) throw resultadoSetores.error;
        if (resultadoUsuarios.error) throw resultadoUsuarios.error;

        setores = resultadoSetores.data || [];

        usuarios = (resultadoUsuarios.data || []).filter(
            usuario => usuario.role !== "super_admin"
        );

        carregarFiltroSetores();
        atualizarIndicadores();
        renderizarUsuarios();
        mensagemSetores.hidden = true;
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        mostrarMensagem(
            "Não foi possível carregar os dados. Verifique as permissões do Supabase.",
            "erro"
        );
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

async function salvarSetor(idUsuario, novoSetor) {
    if (idUsuario === usuarioAtual.id) {
        mostrarMensagem(
            "Não é permitido alterar seu próprio setor por esta página.",
            "erro"
        );
        return;
    }

    const usuario = usuarios.find(item => item.id === idUsuario);
    if (!usuario) return;

    const setorAnterior = usuario.department_id;

    if ((novoSetor || null) === (setorAnterior || null)) {
        mostrarMensagem("O setor selecionado já está atribuído a esse usuário.");
        return;
    }

    const botao = listaUsuarios.querySelector(
        `[data-salvar="${CSS.escape(idUsuario)}"]`
    );

    if (!botao) return;

    botao.disabled = true;

    try {
        const { data, error } = await clienteSupabase
            .from("profiles")
            .update({
                department_id: novoSetor || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", idUsuario)
            .select("id, department_id")
            .maybeSingle();

        if (error) {
            console.error("Erro ao salvar setor:", {
                mensagem: error.message,
                codigo: error.code,
                detalhes: error.details,
                dica: error.hint
            });

            throw error;
        }

        if (!data) {
            mostrarMensagem(
                "Nenhum usuário foi atualizado. Verifique as permissões RLS.",
                "erro"
            );
            return;
        }

        usuario.department_id = data.department_id;

        atualizarIndicadores();
        renderizarUsuarios();
        mostrarMensagem("Setor atualizado com sucesso.", "sucesso");
    } catch (error) {
        console.error(error);
        mostrarMensagem(
            "Não foi possível salvar o setor. Verifique as permissões do Supabase.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
}

listaUsuarios.addEventListener("click", event => {
    const botao = event.target.closest("[data-salvar]");
    if (!botao) return;

    const linha = botao.closest("tr");
    const seletor = linha.querySelector(".seletor-setor");

    salvarSetor(botao.dataset.salvar, seletor.value);
});

pesquisaUsuario.addEventListener("input", renderizarUsuarios);
filtroSetor.addEventListener("change", renderizarUsuarios);

document.getElementById("atualizarLista").addEventListener("click", async () => {
    try {
        await carregarDados();
    } catch (error) {
        console.error(error);
        mostrarMensagem(
            "Não foi possível carregar os dados. Verifique as permissões do Supabase.",
            "erro"
        );
    }
});

carregarDados().catch(error => {
    console.error(error);
    mostrarMensagem(
        "Erro ao carregar os dados. Verifique as permissões do Supabase.",
        "erro"
    );
});