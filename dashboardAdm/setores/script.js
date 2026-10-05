
const clienteSupabase = window.supabaseClient;

const listaUsuarios = document.getElementById("listaUsuarios");
const pesquisaUsuario = document.getElementById("pesquisaUsuario");
const filtroSetor = document.getElementById("filtroSetor");
const mensagemSetores = document.getElementById("mensagemSetores");

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

async function carregarDados() {
    mostrarMensagem("Carregando usuários e setores...");

    const { data: { user }, error: erroAutenticacao } =
        await clienteSupabase.auth.getUser();

    if (erroAutenticacao) throw erroAutenticacao;

    if (!user) {
        window.location.href = "../../login/index.html";
        return;
    }

    const { data: perfil, error: erroPerfil } = await clienteSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (erroPerfil) throw erroPerfil;

    if (perfil.role !== "super_admin") {
        mostrarMensagem("Acesso permitido apenas ao super administrador.", "erro");
        return;
    }

    usuarioAtual = user;

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
}

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