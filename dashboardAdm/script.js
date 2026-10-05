
(async function iniciarPainel() {
    const cliente = window.supabaseClient;
    const caminhoLogin = "../login/index.html";

    const formatarData = data => {
        if (!data) return "—";

        return new Date(data).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    };

    const formatarDataHora = data => {
        if (!data) return "Data indisponível";

        return new Date(data).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const definirTexto = (seletor, texto) => {
        const elemento = document.querySelector(seletor);

        if (elemento) elemento.textContent = texto;
    };

    const mostrarErro = mensagem => {
        let aviso = document.getElementById("avisoDashboard");

        if (!aviso) {
            aviso = document.createElement("p");
            aviso.id = "avisoDashboard";
            aviso.setAttribute("role", "status");

            const principal = document.querySelector(".principal");

            if (principal) {
                principal.prepend(aviso);
            }
        }

        aviso.textContent = mensagem;
    };

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

    if (erroPerfil || !perfil ||
        !["admin", "super_admin"].includes(perfil.role)) {
        await cliente.auth.signOut();
        window.location.replace(caminhoLogin);
        return;
    }

    document.documentElement.dataset.autorizado = "true";

    const nome = perfil.display_name?.trim()
        || sessao.user.email
        || "Administrador";

    const iniciais = nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0])
        .join("")
        .toUpperCase();

    const avatar = document.querySelector(".avatar-pequeno");

    if (avatar) {
        avatar.textContent = iniciais;
        avatar.title = nome;
        avatar.setAttribute("aria-label", `Administrador: ${nome}`);
    }

    definirTexto(
        ".boas-texto h1",
        `Olá, ${nome.split(/\s+/)[0]}!`
    );

    definirTexto(".data-atual span", "Dados do Supabase");

    const botaoSair = document.querySelector(".sair");

    if (botaoSair) {
        botaoSair.href = "#sair";

        botaoSair.addEventListener("click", async evento => {
            evento.preventDefault();

            botaoSair.style.pointerEvents = "none";

            const { error } = await cliente.auth.signOut();

            if (error) {
                botaoSair.style.pointerEvents = "";
                alert("Não foi possível sair da conta. Tente novamente.");
                return;
            }

            window.location.replace(caminhoLogin);
        });
    }

    const indicadores = document.querySelectorAll(".indicador");

    const indicadorTotal = indicadores[0];
    const indicadorPassageiros = indicadores[1];
    const indicadorPontualidade = indicadores[2];
    const indicadorAbertas = indicadores[3];

    if (indicadorTotal) {
        definirTexto(
            ".indicador:nth-child(1) .indicador-label",
            "Ocorrências registradas"
        );
    }

    if (indicadorPassageiros) {
        definirTexto(
            "#passageiros .indicador-label",
            "Ocorrências em andamento"
        );
        definirTexto(
            "#passageiros .indicador-nota",
            "Aguardando resolução ou atualização"
        );
        definirTexto(
            "#passageiros .variacao",
            "No sistema"
        );
    }

    if (indicadorPontualidade) {
        definirTexto(
            ".indicador:nth-child(3) .indicador-label",
            "Ocorrências resolvidas"
        );
        definirTexto(
            ".indicador:nth-child(3) .indicador-nota",
            "Total de registros encerrados"
        );
        definirTexto(
            ".indicador:nth-child(3) .variacao",
            "Concluídas"
        );
    }

    if (indicadorAbertas) {
        definirTexto(
            "#ocorrencias .indicador-label",
            "Ocorrências em aberto"
        );
    }

    const tabela = document.querySelector(".tabela-cartao table");

    if (tabela) {
        const cabecalho = tabela.querySelector("thead tr");

        if (cabecalho) {
            cabecalho.replaceChildren();

            [
                "Código",
                "Ocorrência",
                "Gravidade",
                "Status",
                "Departamento"
            ].forEach(titulo => {
                const th = document.createElement("th");
                th.textContent = titulo;
                cabecalho.appendChild(th);
            });
        }
    }

    const cartaoTabela = document.querySelector(".tabela-cartao");

    if (cartaoTabela) {
        const titulo = cartaoTabela.querySelector(".cartao-cabecalho h2");
        const descricao = cartaoTabela.querySelector(".cartao-cabecalho p");
        const link = cartaoTabela.querySelector(".link-ver-mais");

        if (titulo) titulo.textContent = "Últimas ocorrências";
        if (descricao) descricao.textContent = "Registros cadastrados no sistema";

        if (link) {
            link.textContent = "Atualizar";
            link.href = "#ocorrencias";
            link.addEventListener("click", async evento => {
                evento.preventDefault();
                await carregarDashboard();
            });
        }
    }

    const formatarStatus = status => {
        const valores = {
            aberta: "Aberta",
            aberto: "Aberta",
            pendente: "Pendente",
            em_andamento: "Em andamento",
            em_andamento_operacional: "Em andamento",
            resolvida: "Resolvida",
            resolvido: "Resolvida",
            encerrada: "Encerrada",
            encerrado: "Encerrada",
            concluida: "Concluída",
            concluido: "Concluída",
            cancelada: "Cancelada",
            cancelado: "Cancelada"
        };

        const chave = String(status || "").toLowerCase().trim();

        return valores[chave] ||
            chave.replace(/_/g, " ").replace(/^./, letra => letra.toUpperCase()) ||
            "Não informado";
    };

    const statusFinalizados = [
        "resolvida",
        "resolvido",
        "encerrada",
        "encerrado",
        "concluida",
        "concluido",
        "cancelada",
        "cancelado"
    ];

    const estaFinalizada = ocorrencia =>
        statusFinalizados.includes(
            String(ocorrencia.status || "").toLowerCase().trim()
        );

    const formatarGravidade = gravidade => {
        const valor = String(gravidade || "").toLowerCase().trim();

        const nomes = {
            baixa: "Baixa",
            media: "Média",
            média: "Média",
            alta: "Alta",
            critica: "Crítica",
            crítica: "Crítica",
            critico: "Crítica",
            crítico: "Crítica"
        };

        return nomes[valor] || gravidade || "Não informada";
    };

    const formatarDepartamento = departamento => {
        const nomes = {
            atendimento: "Atendimento",
            comunicacao: "Comunicação",
            operacoes: "Operações",
            gestao: "Gestão"
        };

        return nomes[departamento] || departamento || "Não definido";
    };

    function atualizarIndicador(elemento, valor) {
        if (!elemento) return;

        const numero = elemento.querySelector(".indicador-numero");

        if (numero) numero.textContent = valor.toLocaleString("pt-BR");
    }

    function criarCelula(texto) {
        const td = document.createElement("td");
        td.textContent = texto ?? "—";
        return td;
    }

    function montarTabela(ocorrencias) {
        const corpo = document.querySelector(".tabela-cartao tbody");

        if (!corpo) return;

        corpo.replaceChildren();

        if (!ocorrencias.length) {
            const linha = document.createElement("tr");
            const celula = criarCelula("Nenhuma ocorrência encontrada.");
            celula.colSpan = 5;
            linha.appendChild(celula);
            corpo.appendChild(linha);
            return;
        }

        ocorrencias.forEach(ocorrencia => {
            const linha = document.createElement("tr");

            linha.appendChild(
                criarCelula(ocorrencia.occurrence_code ?? "—")
            );
            linha.appendChild(
                criarCelula(ocorrencia.title || "Sem título")
            );
            linha.appendChild(
                criarCelula(formatarGravidade(ocorrencia.severity))
            );
            linha.appendChild(
                criarCelula(formatarStatus(ocorrencia.status))
            );
            linha.appendChild(
                criarCelula(
                    formatarDepartamento(
                        ocorrencia.responsible_department_id
                    )
                )
            );

            corpo.appendChild(linha);
        });
    }

    function atualizarGrafico(ocorrencias) {
        const svg = document.querySelector(".grafico-area svg");
        const eixoX = document.querySelector(".eixo-x");
        const legenda = document.querySelector(".legenda");

        if (!svg || !eixoX) return;

        if (legenda) {
            legenda.replaceChildren();

            const item = document.createElement("span");
            const marcador = document.createElement("i");

            marcador.className = "legenda-azul";
            item.append(marcador, document.createTextNode("Ocorrências"));

            legenda.appendChild(item);
        }

        const dias = [];

        for (let i = 6; i >= 0; i--) {
            const data = new Date();
            data.setHours(0, 0, 0, 0);
            data.setDate(data.getDate() - i);

            dias.push(data);
        }

        const contagens = dias.map(dia => {
            const inicio = new Date(dia);
            const fim = new Date(dia);
            fim.setDate(fim.getDate() + 1);

            return ocorrencias.filter(ocorrencia => {
                const criadaEm = new Date(ocorrencia.created_at);

                return criadaEm >= inicio && criadaEm < fim;
            }).length;
        });

        eixoX.replaceChildren();

        dias.forEach(dia => {
            const span = document.createElement("span");
            span.textContent = dia.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit"
            });
            eixoX.appendChild(span);
        });

        const maximo = Math.max(...contagens, 1);
        const pontos = contagens.map((valor, indice) => {
            const x = 10 + indice * (575 / 6);
            const y = 165 - (valor / maximo) * 130;

            return { x, y };
        });

        const namespace = "http://www.w3.org/2000/svg";
        svg.replaceChildren();

        const criarSvg = (tag, atributos) => {
            const elemento = document.createElementNS(namespace, tag);

            Object.entries(atributos).forEach(([chave, valor]) => {
                elemento.setAttribute(chave, valor);
            });

            return elemento;
        };

        const defs = criarSvg("defs", {});
        const gradiente = criarSvg("linearGradient", {
            id: "areaOcorrencias",
            x1: "0",
            x2: "0",
            y1: "0",
            y2: "1"
        });

        gradiente.appendChild(criarSvg("stop", {
            offset: "0%",
            "stop-color": "#0084BE",
            "stop-opacity": ".24"
        }));

        gradiente.appendChild(criarSvg("stop", {
            offset: "100%",
            "stop-color": "#0084BE",
            "stop-opacity": ".02"
        }));

        defs.appendChild(gradiente);
        svg.appendChild(defs);

        const linhaPontos = pontos
            .map(ponto => `${ponto.x},${ponto.y}`)
            .join(" ");

        const primeiro = pontos[0];
        const ultimo = pontos[pontos.length - 1];

        svg.appendChild(criarSvg("path", {
            d: `M${primeiro.x} ${primeiro.y} ${pontos
                .slice(1)
                .map(ponto => `L${ponto.x} ${ponto.y}`)
                .join(" ")} L${ultimo.x} 178 L${primeiro.x} 178 Z`,
            fill: "url(#areaOcorrencias)"
        }));

        svg.appendChild(criarSvg("polyline", {
            points: linhaPontos,
            fill: "none",
            stroke: "#0084BE",
            "stroke-width": "3",
            "stroke-linecap": "round",
            "stroke-linejoin": "round"
        }));

        pontos.forEach(ponto => {
            svg.appendChild(criarSvg("circle", {
                cx: ponto.x,
                cy: ponto.y,
                r: "4",
                fill: "#0084BE"
            }));
        });

        const eixoY = document.querySelector(".eixo-y");

        if (eixoY) {
            eixoY.replaceChildren();

            for (let i = 5; i >= 0; i--) {
                const span = document.createElement("span");
                span.textContent = Math.round(maximo * i / 5);
                eixoY.appendChild(span);
            }
        }

        const descricao = document.querySelector(".grafico-cartao .cartao-cabecalho p");

        if (descricao) {
            descricao.textContent = "Ocorrências registradas nos últimos 7 dias";
        }
    }

    function atualizarDistribuicao(ocorrencias) {
        const cartao = document.querySelector(".status-cartao");

        if (!cartao) return;

        const conteudo = cartao.querySelector(".status-conteudo");
        const grafico = cartao.querySelector(".grafico-rosca");
        const legenda = cartao.querySelector(".status-legenda");

        if (!conteudo || !grafico || !legenda) return;

        const grupos = new Map();

        ocorrencias.forEach(ocorrencia => {
            const status = formatarStatus(ocorrencia.status);
            grupos.set(status, (grupos.get(status) || 0) + 1);
        });

        const total = ocorrencias.length;
        const cores = [
            "#0084BE",
            "#22B5EA",
            "#F59E0B",
            "#16A34A",
            "#DC2626",
            "#64748B"
        ];

        const dados = [...grupos.entries()]
            .sort((a, b) => b[1] - a[1]);

        let acumulado = 0;

        const segmentos = dados.map(([status, quantidade], indice) => {
            const inicio = total ? acumulado / total * 100 : 0;
            acumulado += quantidade;

            const fim = total ? acumulado / total * 100 : 0;

            return `${cores[indice % cores.length]} ${inicio}% ${fim}%`;
        });

        grafico.style.background = total
            ? `conic-gradient(${segmentos.join(", ")})`
            : "#e8eef3";

        const centro = grafico.querySelector("div");

        if (centro) {
            centro.replaceChildren();

            const numero = document.createElement("strong");
            numero.textContent = total.toLocaleString("pt-BR");

            const texto = document.createElement("span");
            texto.textContent = "Ocorrências";

            centro.append(numero, texto);
        }

        legenda.replaceChildren();

        if (!dados.length) {
            const texto = document.createElement("p");
            texto.textContent = "Nenhuma ocorrência registrada.";
            legenda.appendChild(texto);
            return;
        }

        dados.forEach(([status, quantidade], indice) => {
            const linha = document.createElement("div");
            const ponto = document.createElement("i");
            const nome = document.createElement("span");
            const numero = document.createElement("strong");
            const percentual = total
                ? Math.round(quantidade / total * 100)
                : 0;

            ponto.className = "status-ponto";
            ponto.style.backgroundColor = cores[indice % cores.length];

            nome.textContent = status;
            numero.textContent = `${quantidade} ${percentual}%`;

            linha.append(ponto, nome, numero);
            legenda.appendChild(linha);
        });

        const titulo = cartao.querySelector(".cartao-cabecalho p");

        if (titulo) titulo.textContent = "Distribuição por status";
    }

    function atualizarNotificacoes(notificacoes) {
        const cartao = document.querySelector(".comunicacoes");

        if (!cartao) return;

        const itensAntigos = cartao.querySelectorAll(".notificacao-item");

        itensAntigos.forEach(item => item.remove());

        const cabecalho = cartao.querySelector(".cartao-cabecalho");

        if (!notificacoes.length) {
            const vazio = document.createElement("p");
            vazio.className = "notificacoes-vazias";
            vazio.textContent = "Você não possui notificações.";
            cartao.appendChild(vazio);
            return;
        }

        notificacoes.forEach(notificacao => {
            const item = document.createElement("div");
            item.className = "notificacao-item";

            const simbolo = document.createElement("span");
            simbolo.className = "notificacao-simbolo info";
            simbolo.textContent = notificacao.read_at ? "✓" : "i";

            const conteudo = document.createElement("div");

            const titulo = document.createElement("strong");
            titulo.textContent = notificacao.title || "Notificação";

            const mensagem = document.createElement("p");
            mensagem.textContent = notificacao.message || "";

            const data = document.createElement("time");
            data.textContent = formatarDataHora(notificacao.created_at);

            conteudo.append(titulo, mensagem);
            item.append(simbolo, conteudo, data);

            if (cabecalho) {
                cabecalho.insertAdjacentElement("afterend", item);
            } else {
                cartao.appendChild(item);
            }
        });

        const descricao = cartao.querySelector(".cartao-cabecalho p");

        if (descricao) descricao.textContent = "Notificações da sua conta";
    }

    async function carregarDashboard() {
        try {
            const [resultadoOcorrencias, resultadoNotificacoes] =
                await Promise.all([
                    cliente
                        .from("operational_occurrences")
                        .select(
                            "id, occurrence_code, title, description, category, severity, status, responsible_department_id, created_at, updated_at, resolved_at"
                        )
                        .order("created_at", { ascending: false })
                        .limit(500),

                    cliente
                        .from("notifications")
                        .select("id, title, message, read_at, created_at")
                        .eq("user_id", sessao.user.id)
                        .order("created_at", { ascending: false })
                        .limit(10)
                ]);

            if (resultadoOcorrencias.error) {
                throw new Error(
                    `Falha ao carregar ocorrências: ${resultadoOcorrencias.error.message}`
                );
            }

            if (resultadoNotificacoes.error) {
                console.error(
                    "Erro ao carregar notificações:",
                    resultadoNotificacoes.error
                );
            }

            const ocorrencias = resultadoOcorrencias.data || [];
            const notificacoes = resultadoNotificacoes.data || [];

            const abertas = ocorrencias.filter(
                ocorrencia => !estaFinalizada(ocorrencia)
            );

            const finalizadas = ocorrencias.filter(estaFinalizada);

            atualizarIndicador(indicadorTotal, ocorrencias.length);
            atualizarIndicador(indicadorPassageiros, abertas.length);
            atualizarIndicador(indicadorPontualidade, finalizadas.length);
            atualizarIndicador(indicadorAbertas, abertas.length);

            if (indicadorAbertas) {
                const nota = indicadorAbertas.querySelector(".indicador-nota");

                if (nota) {
                    nota.textContent = "Aguardando resolução";
                }
            }

            montarTabela(ocorrencias.slice(0, 10));
            atualizarGrafico(ocorrencias);
            atualizarDistribuicao(ocorrencias);
            atualizarNotificacoes(notificacoes);

            const atualizacao = document.querySelector(".ponto-atualizado");

            if (atualizacao) {
                atualizacao.textContent = `● Atualizado às ${new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })}`;
            }

            const descricaoTabela = document.querySelector(
                ".tabela-cartao .cartao-cabecalho p"
            );

            if (descricaoTabela) {
                descricaoTabela.textContent =
                    `${ocorrencias.length} ocorrência(s) carregada(s)`;
            }

            const aviso = document.getElementById("avisoDashboard");

            if (aviso) aviso.remove();

        } catch (erro) {
            console.error("Erro ao carregar dashboard:", erro);
            mostrarErro(
                "Não foi possível carregar os dados do painel. Verifique sua conexão e as permissões do Supabase."
            );
        }
    }

    document.querySelectorAll(".menu-link, .acao-link, .boas-acoes a, .marca")
        .forEach(link => {
            const destino = link.getAttribute("href");

            if (!destino || !destino.startsWith("#")) return;

            if (!document.querySelector(destino)) {
                link.addEventListener("click", evento => {
                    evento.preventDefault();
                    alert("Esta seção ainda não está disponível.");
                });
            }
        });

    if (window.lucide) {
        window.lucide.createIcons();
    }

    await carregarDashboard();

    window.setInterval(carregarDashboard, 60000);
})();