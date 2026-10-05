
const formCadastro = document.getElementById("formCadastro");
const mensagemCadastro = document.getElementById("mensagemCadastro");
const botaoCadastro = document.getElementById("botaoCadastro");


function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, "");

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;

    for (let i = 0; i < 9; i++) {
        soma += Number(cpf[i]) * (10 - i);
    }

    let resto = (soma * 10) % 11;

    if (resto === 10) {
        resto = 0;
    }

    if (resto !== Number(cpf[9])) {
        return false;
    }

    soma = 0;

    for (let i = 0; i < 10; i++) {
        soma += Number(cpf[i]) * (11 - i);
    }

    resto = (soma * 10) % 11;

    if (resto === 10) {
        resto = 0;
    }

    return resto === Number(cpf[10]);
}

formCadastro.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemCadastro.textContent = "";
    mensagemCadastro.className = "mensagem-login";

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const cpf = document.getElementById("cpf").value.replace(/\D/g, "");
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (nome.length < 3) {
        mostrarMensagem("Digite seu nome completo.");
        return;
    }

    if (!validarCPF(cpf)) {
        mostrarMensagem("CPF inválido. Confira os números digitados.");
        return;
    }

    if (senha.length < 8) {
        mostrarMensagem("A senha deve ter pelo menos 8 caracteres.");
        return;
    }

    if (senha !== confirmarSenha) {
        mostrarMensagem("As senhas não coincidem.");
        return;
    }

    botaoCadastro.disabled = true;
    botaoCadastro.textContent = "Criando conta...";

    try {
        const { data, error } =
            await window.supabaseClient.auth.signUp({
                email,
                password: senha,
                options: {
                    data: {
                        display_name: nome,
                        phone: telefone,
                        cpf: cpf
                    }
                }
            });

        if (error) {
            if (error.code === "user_already_exists") {
                throw new Error("Este e-mail já possui cadastro.");
            }

            if (
                error.code === "23505" ||
                error.message?.toLowerCase().includes("duplicate key")
            ) {
                throw new Error("Este CPF já está cadastrado.");
            }

            throw error;
        }

        if (data.session) {
            window.location.href = "../login/index.html";
        } else {
            window.location.href = "../login/index.html";
        }


    } catch (erro) {
        const mensagem = [
            erro.message,
            erro.details,
            erro.hint
        ].filter(Boolean).join(" ").toLowerCase();

        if (
            erro.code === "23505" ||
            mensagem.includes("cpf_ja_cadastrado") ||
            mensagem.includes("cpf já cadastrado") ||
            mensagem.includes("profiles_cpf_key")
        ) {
            mostrarMensagem("Este CPF já está cadastrado.");
        } else {
            mostrarMensagem(
                "Não foi possível criar a conta. Verifique os dados e tente novamente."
            );
        }
    } finally {
        botaoCadastro.disabled = false;
        botaoCadastro.textContent = "Criar conta";
    }
});

function mostrarMensagem(texto) {
    mensagemCadastro.textContent = texto;
    mensagemCadastro.className = "mensagem-login erro";
}