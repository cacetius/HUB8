(function () {
  var grid = document.getElementById('grid');
  var actions = document.getElementById('bot-actions');
  if (!grid || !actions) {
    throw new Error('Não foi possível iniciar a interface do HUB: elementos principais ausentes.');
  }

  var categories = [
    { id: 'qualidade', label: 'Qualidade' },
    { id: 'operacao', label: 'Operação' },
    { id: 'pessoas', label: 'Pessoas' },
    { id: 'gestao', label: 'Gestão' },
    { id: 'auditoria', label: 'Auditoria' }
  ];
  var selectedCategory = 'all';

  var overview = document.createElement('section');
  overview.className = 'hub-welcome';
  overview.setAttribute('aria-label', 'Resumo dos aplicativos');
  overview.innerHTML =
    '<div><div class="hub-eyebrow">Central de trabalho</div>' +
    '<h1 class="hub-title">Tudo o que você precisa, em um só lugar.</h1>' +
    '<p class="hub-description">Acesse os aplicativos e acompanhe as ferramentas do seu turno.</p></div>' +
    '<div class="hub-total" id="hub-total" aria-live="polite"></div>';
  grid.parentNode.insertBefore(overview, grid);

  var toolbar = document.createElement('section');
  toolbar.className = 'hub-toolbar';
  toolbar.setAttribute('aria-label', 'Busca e filtros de aplicativos');

  var toolbarTop = document.createElement('div');
  toolbarTop.className = 'hub-toolbar-top';
  var searchLabel = document.createElement('label');
  searchLabel.className = 'hub-search';
  searchLabel.innerHTML = '<span class="hub-search-icon" aria-hidden="true">⌕</span>';

  var search = document.createElement('input');
  search.type = 'search';
  search.id = 'hub-search';
  search.placeholder = 'Buscar aplicativo...';
  search.setAttribute('aria-label', 'Buscar aplicativo por nome ou descrição');
  search.autocomplete = 'off';
  searchLabel.appendChild(search);

  var results = document.createElement('div');
  results.className = 'hub-results';
  results.setAttribute('aria-live', 'polite');
  toolbarTop.appendChild(searchLabel);
  toolbarTop.appendChild(results);

  var filters = document.createElement('div');
  filters.className = 'hub-filters';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filtrar por categoria');
  toolbar.appendChild(toolbarTop);
  toolbar.appendChild(filters);
  grid.parentNode.insertBefore(toolbar, grid);

  var empty = document.createElement('div');
  empty.className = 'hub-empty';
  empty.hidden = true;
  empty.innerHTML =
    '<div class="hub-empty-title">Nenhum aplicativo encontrado</div>' +
    '<div>Tente mudar a busca ou selecionar outra categoria.</div>';
  actions.parentNode.insertBefore(empty, actions);

  function normalize(value) {
    return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function getCards() {
    return Array.prototype.slice.call(grid.querySelectorAll('.acard:not(.acard-new)'));
  }

  function buildFilters(cards) {
    var present = {};
    cards.forEach(function (card) {
      if (card.dataset.category) present[card.dataset.category] = true;
    });

    if (selectedCategory !== 'all' && !present[selectedCategory]) {
      selectedCategory = 'all';
    }

    filters.textContent = '';
    var available = [{ id: 'all', label: 'Todos' }].concat(
      categories.filter(function (category) { return present[category.id]; })
    );

    available.forEach(function (category) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'hub-filter';
      button.textContent = category.label;
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', String(selectedCategory === category.id));
      if (selectedCategory === category.id) button.classList.add('active');
      button.addEventListener('click', function () {
        selectedCategory = category.id;
        updateCards();
      });
      filters.appendChild(button);
    });
  }

  function updateCards() {
    var cards = getCards();
    buildFilters(cards);

    var query = normalize(search.value.trim());
    var visible = 0;
    cards.forEach(function (card) {
      var matchesText = !query || normalize(card.textContent).indexOf(query) !== -1;
      var matchesCategory = selectedCategory === 'all' || card.dataset.category === selectedCategory;
      var matches = matchesText && matchesCategory;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    var total = cards.length;
    document.getElementById('hub-total').textContent =
      total + (total === 1 ? ' aplicativo disponível' : ' aplicativos disponíveis');
    results.textContent = 'Mostrando ' + visible + ' de ' + total + ' aplicativos';
    empty.hidden = visible !== 0;

    Array.prototype.forEach.call(filters.querySelectorAll('.hub-filter'), function (button) {
      var active = button.dataset.category === selectedCategory;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  search.addEventListener('input', updateCards);
  search.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && search.value) {
      search.value = '';
      updateCards();
    }
  });

  new MutationObserver(updateCards).observe(grid, { childList: true });
  updateCards();
})();
