const E = {
      dados: [],
      colunas: [],
      meta: {},
      busca: '',
      ordem: { col: -1, dir: 'asc' },
      pagina: 1,
      porPagina: 50,
      autoRefresh: true,
      refreshTimer: null,
      refreshInterval: 60000,
      carregando: false,
    };

    function $(id) { return document.getElementById(id); }

    function mostrarEstado(nome) {
      ['loading', 'error', 'empty', 'data'].forEach(s => {
        $(`state-${s}`).classList.toggle('hidden', s !== nome);
      });
    }

    function dataHora() {
      const d = new Date();
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function dataHoraArquivo() {
      const d = new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function numeroBR(n) {
      return Number(n).toLocaleString('pt-BR');
    }

    function toast(msg, tipo = 'info') {
      const container = $('toast-container');
      const cores = {
        info: 'border-accent/40 bg-surface',
        success: 'border-ok/40 bg-surface',
        error: 'border-err/40 bg-surface',
      };
      const icones = {
        info: 'fa-circle-info text-accent',
        success: 'fa-circle-check text-ok',
        error: 'fa-circle-xmark text-err',
      };
      const el = document.createElement('div');
      el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${cores[tipo]} shadow-2xl shadow-black/40 toast-enter text-sm max-w-sm`;
      el.innerHTML = `<i class="fa-solid ${icones[tipo]} shrink-0"></i><span class="text-txt text-[13px]">${msg}</span>`;
      container.appendChild(el);

      setTimeout(() => {
        el.classList.remove('toast-enter');
        el.classList.add('toast-exit');
        el.addEventListener('animationend', () => el.remove());
      }, 3000);
    }

    async function carregarDados(forcado = false) {
      if (E.carregando) return;
      E.carregando = true;

      const icon = $('refresh-icon');
      icon.classList.add('anim-spin');
      $('status-text').textContent = 'Atualizando...';

      if (!forcado) mostrarEstado('loading');

      try {
        const resp = await fetch(`dados.json?_t=${Date.now()}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const json = await resp.json();

        if (!json.colunas || !Array.isArray(json.dados)) {
          throw new Error('Formato de dados inválido');
        }

        const novosAnterior = E.meta.novos_produtos || 0;

        E.meta = {
          ultima_atualizacao: json.ultima_atualizacao || '',
          total_produtos: json.total_produtos || 0,
          novos_produtos: json.novos_produtos || 0,
        };
        E.colunas = json.colunas;
        E.dados = json.dados;

        if (E.dados.length === 0) {
          mostrarEstado('empty');
        } else {
          mostrarEstado('data');
          renderizarStats(novosAnterior);
          renderizarTabela();
          renderizarPaginacao();
        }

        $('status-text').textContent = `Atualizado: ${E.meta.ultima_atualizacao}`;
        $('footer-time').textContent = dataHora();

        if (forcado && E.dados.length > 0) {
          toast('Dados atualizados com sucesso', 'success');
        }

      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        if (forcado || E.dados.length === 0) {
          $('error-msg').textContent = err.message || 'Não foi possível ler o arquivo de dados.';
          mostrarEstado('error');
        }
        if (forcado) {
          toast('Falha ao atualizar dados', 'error');
        }
      } finally {
        E.carregando = false;
        icon.classList.remove('anim-spin');
        if (E.meta.ultima_atualizacao) {
          $('status-text').textContent = `Atualizado: ${E.meta.ultima_atualizacao}`;
        }
      }
    }

    function getDadosFiltrados() {
      let dados = [...E.dados];

      if (E.busca.trim()) {
        const termo = E.busca.toLowerCase().trim();
        dados = dados.filter(row =>
          E.colunas.some(col => {
            const val = row[col];
            return val !== null && val !== undefined && String(val).toLowerCase().includes(termo);
          })
        );
      }

      if (E.ordem.col >= 0 && E.ordem.col < E.colunas.length) {
        const colNome = E.colunas[E.ordem.col];
        const dir = E.ordem.dir === 'asc' ? 1 : -1;
        dados.sort((a, b) => {
          let va = a[colNome] ?? '';
          let vb = b[colNome] ?? '';
          const na = Number(va);
          const nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
            return (na - nb) * dir;
          }
          return String(va).localeCompare(String(vb), 'pt-BR') * dir;
        });
      }

      return dados;
    }

    function getDadosPagina() {
      const filtrados = getDadosFiltrados();
      const inicio = (E.pagina - 1) * E.porPagina;
      return {
        dados: filtrados.slice(inicio, inicio + E.porPagina),
        total: filtrados.length,
        totalPaginas: Math.max(1, Math.ceil(filtrados.length / E.porPagina)),
      };
    }

    function renderizarStats(novosAnterior) {
      const cards = [
        {
          icone: 'fa-boxes-stacked',
          cor: 'text-accent',
          bg: 'bg-accent-subtle',
          label: 'Total de Produtos',
          valor: numeroBR(E.meta.total_produtos),
        },
        {
          icone: 'fa-sparkles',
          cor: 'text-ok',
          bg: 'bg-ok-subtle',
          label: 'Novos Produtos',
          valor: numeroBR(E.meta.novos_produtos),
          pulse: E.meta.novos_produtos > 0 && E.meta.novos_produtos !== novosAnterior,
        },
        {
          icone: 'fa-clock',
          cor: 'text-txt-secondary',
          bg: 'bg-surface',
          label: 'Última Atualização',
          valor: E.meta.ultima_atualizacao || '—',
          small: true,
        },
      ];

      $('stats-grid').innerHTML = cards.map((c, i) => `
            <div class="rounded-xl border border-border-subtle bg-surface p-4 anim-fade-up ${c.pulse ? 'anim-pulse' : ''}"
                 style="animation-delay: ${i * 80}ms">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0">
                        <i class="fa-solid ${c.icone} ${c.cor} text-sm"></i>
                    </div>
                    <span class="text-[11px] text-txt-muted leading-tight">${c.label}</span>
                </div>
                <div class="${c.small ? 'text-sm' : 'text-2xl'} font-display font-bold text-txt leading-none truncate" title="${c.valor}">
                    ${c.valor}
                </div>
            </div>
        `).join('');
    }

    function renderizarTabela() {
      const { dados, total } = getDadosPagina();
      const filtrados = getDadosFiltrados();

      const inicio = Math.min((E.pagina - 1) * E.porPagina + 1, total);
      const fim = Math.min(E.pagina * E.porPagina, filtrados.length);
      if (filtrados.length === 0) {
        $('info-count').textContent = 'Nenhum resultado encontrado';
      } else {
        $('info-count').textContent = `Mostrando ${numeroBR(inicio)}–${numeroBR(fim)} de ${numeroBR(filtrados.length)} produtos`;
      }

      const ordemCol = E.ordem.col;
      const ordemDir = E.ordem.dir;

      $('table-head').innerHTML = `<tr class="border-b border-border">
            ${E.colunas.map((col, i) => {
        const isAtivo = ordemCol === i;
        const seta = isAtivo ? (ordemDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort';
        const ativoClass = isAtivo ? 'active' : '';
        return `<th class="th-sortable ${ativoClass} px-3 py-3 text-left text-[11px] font-semibold text-txt-muted uppercase tracking-wider whitespace-nowrap border-b border-border bg-base-light/95 backdrop-blur-sm select-none"
                    onclick="ordenar(${i})" title="Ordenar por ${col}">
                    <span class="inline-flex items-center gap-1.5">
                        ${col}
                        <i class="fa-solid ${seta} text-[9px] opacity-40 ${isAtivo ? '!opacity-100' : ''}"></i>
                    </span>
                </th>`;
      }).join('')}
        </tr>`;

      if (dados.length === 0) {
        $('table-body').innerHTML = `
                <tr>
                    <td colspan="${E.colunas.length}" class="px-4 py-16 text-center text-txt-muted text-sm">
                        <i class="fa-solid fa-magnifying-glass text-2xl mb-3 block opacity-30"></i>
                        Nenhum produto corresponde à pesquisa
                    </td>
                </tr>`;
        return;
      }

      $('table-body').innerHTML = dados.map((row, ri) => `
            <tr class="border-b border-border-subtle hover:bg-surface-hover/60 transition-colors anim-fade-in" style="animation-delay: ${Math.min(ri * 15, 300)}ms">
                ${E.colunas.map(col => {
        const val = row[col];
        const display = val === null || val === undefined ? '' : String(val);
        const isFirst = E.colunas.indexOf(col) === 0;
        return `<td class="px-3 py-2.5 text-[13px] whitespace-nowrap max-w-[280px] truncate ${isFirst ? 'font-semibold neon-id' : 'text-txt-secondary'}"
                        title="${display.replace(/"/g, '&quot;')}">${display || '<span class="text-txt-muted/40">—</span>'}</td>`;
      }).join('')}
            </tr>
        `).join('');
    }

    function renderizarPaginacao() {
      const { totalPaginas } = getDadosPagina();
      if (totalPaginas <= 1) {
        $('pagination').innerHTML = '';
        return;
      }

      let botoes = [];

      botoes.push(`<button onclick="mudarPagina(${E.pagina - 1})" ${E.pagina <= 1 ? 'disabled' : ''}
            class="h-8 px-3 rounded-lg text-xs font-medium border transition-colors
            ${E.pagina <= 1 ? 'border-border-subtle text-txt-muted/30 cursor-not-allowed' : 'border-border bg-surface hover:bg-surface-hover text-txt-secondary'}">
            <i class="fa-solid fa-chevron-left text-[10px] mr-1"></i>Anterior
        </button>`);

      const maxVisiveis = 7;
      let inicioP = Math.max(1, E.pagina - Math.floor(maxVisiveis / 2));
      let fimP = Math.min(totalPaginas, inicioP + maxVisiveis - 1);
      if (fimP - inicioP < maxVisiveis - 1) {
        inicioP = Math.max(1, fimP - maxVisiveis + 1);
      }

      if (inicioP > 1) {
        botoes.push(pageBtn(1));
        if (inicioP > 2) botoes.push('<span class="text-txt-muted text-xs px-1">...</span>');
      }

      for (let p = inicioP; p <= fimP; p++) {
        botoes.push(pageBtn(p));
      }

      if (fimP < totalPaginas) {
        if (fimP < totalPaginas - 1) botoes.push('<span class="text-txt-muted text-xs px-1">...</span>');
        botoes.push(pageBtn(totalPaginas));
      }

      botoes.push(`<button onclick="mudarPagina(${E.pagina + 1})" ${E.pagina >= totalPaginas ? 'disabled' : ''}
            class="h-8 px-3 rounded-lg text-xs font-medium border transition-colors
            ${E.pagina >= totalPaginas ? 'border-border-subtle text-txt-muted/30 cursor-not-allowed' : 'border-border bg-surface hover:bg-surface-hover text-txt-secondary'}">
            Próximo<i class="fa-solid fa-chevron-right text-[10px] ml-1"></i>
        </button>`);

      $('pagination').innerHTML = botoes.join('');
    }

    function pageBtn(p) {
      const ativo = p === E.pagina;
      return `<button onclick="mudarPagina(${p})"
            class="h-8 w-8 rounded-lg text-xs font-medium border transition-colors
            ${ativo ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border bg-surface hover:bg-surface-hover text-txt-secondary'}">
            ${p}
        </button>`;
    }

    function ordenar(colIdx) {
      if (E.ordem.col === colIdx) {
        E.ordem.dir = E.ordem.dir === 'asc' ? 'desc' : 'asc';
      } else {
        E.ordem.col = colIdx;
        E.ordem.dir = 'asc';
      }
      E.pagina = 1;
      renderizarTabela();
      renderizarPaginacao();
    }

    function mudarPagina(p) {
      const { totalPaginas } = getDadosPagina();
      if (p < 1 || p > totalPaginas) return;
      E.pagina = p;
      renderizarTabela();
      renderizarPaginacao();
      $('table-scroll').scrollTop = 0;
    }

    function baixarXLSX() {
      const dados = getDadosFiltrados();
      if (dados.length === 0) {
        toast('Nenhum dado para exportar', 'error');
        return;
      }

      toast('Gerando planilha XLSX...', 'info');

      try {
        const ws = XLSX.utils.json_to_sheet(dados, { header: E.colunas });

        ws['!cols'] = E.colunas.map(col => {
          const maxLen = Math.max(
            col.length,
            ...dados.slice(0, 200).map(r => String(r[col] || '').length)
          );
          return { wch: Math.min(maxLen + 3, 50) };
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
        XLSX.writeFile(wb, `produtos_k2t_${dataHoraArquivo()}.xlsx`);

        toast(`XLSX exportado: ${numeroBR(dados.length)} produtos`, 'success');
      } catch (err) {
        console.error('Erro ao gerar XLSX:', err);
        toast('Erro ao gerar planilha', 'error');
      }
    }

    function baixarCSV() {
      const dados = getDadosFiltrados();
      if (dados.length === 0) {
        toast('Nenhum dado para exportar', 'error');
        return;
      }

      toast('Gerando CSV...', 'info');

      try {
        const ws = XLSX.utils.json_to_sheet(dados, { header: E.colunas });
        const csv = XLSX.utils.sheet_to_csv(ws, { sep: ';', forceQuotes: true });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `produtos_k2t_${dataHoraArquivo()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast(`CSV exportado: ${numeroBR(dados.length)} produtos`, 'success');
      } catch (err) {
        console.error('Erro ao gerar CSV:', err);
        toast('Erro ao gerar CSV', 'error');
      }
    }

    async function copiarTabela() {
      const dados = getDadosFiltrados();
      if (dados.length === 0) {
        toast('Nenhum dado para copiar', 'error');
        return;
      }

      try {
        const header = E.colunas.join('\t');
        const rows = dados.map(row => E.colunas.map(c => row[c] ?? '').join('\t'));
        const tsv = [header, ...rows].join('\n');

        await navigator.clipboard.writeText(tsv);
        toast(`${numeroBR(dados.length)} linhas copiadas (cole no Excel)`, 'success');
      } catch (err) {
        console.error('Erro ao copiar:', err);
        toast('Não foi possível acessar a área de transferência', 'error');
      }
    }

    function iniciarAutoRefresh() {
      pararAutoRefresh();
      if (E.autoRefresh) {
        E.refreshTimer = setInterval(() => carregarDados(false), E.refreshInterval);
      }
    }

    function pararAutoRefresh() {
      if (E.refreshTimer) {
        clearInterval(E.refreshTimer);
        E.refreshTimer = null;
      }
    }

    function initEventListeners() {
      let debounceTimer = null;
      $('search-input').addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          E.busca = e.target.value;
          E.pagina = 1;
          renderizarTabela();
          renderizarPaginacao();
        }, 250);
      });

      $('page-size').addEventListener('change', (e) => {
        E.porPagina = parseInt(e.target.value, 10);
        E.pagina = 1;
        renderizarTabela();
        renderizarPaginacao();
      });

      const toggle = $('toggle-refresh');
      toggle.addEventListener('click', () => {
        E.autoRefresh = !E.autoRefresh;
        toggle.classList.toggle('on', E.autoRefresh);
        toggle.setAttribute('aria-checked', E.autoRefresh);
        if (E.autoRefresh) {
          iniciarAutoRefresh();
          toast('Auto-refresh ativado (60s)', 'info');
        } else {
          pararAutoRefresh();
          toast('Auto-refresh desativado', 'info');
        }
      });

      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          $('search-input').focus();
        }
      });
    }

    (async function init() {
      initEventListeners();
      await carregarDados(false);
      iniciarAutoRefresh();

      setInterval(() => {
        $('footer-time').textContent = dataHora();
      }, 1000);
    })();

