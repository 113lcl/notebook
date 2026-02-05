// Конфигурация категорий
const CATEGORIES_CONFIG = {
    habits: { name: 'Привычки', emoji: '⭐', format: 'priority', tags: [] },
    tasks: { name: 'Задачи', emoji: '✅', format: 'priority', tags: [] },
    tomorrow: { name: 'Задачи на завтра', emoji: '🚀', format: 'priority', tags: [] },
    notes: { name: 'Заметки', emoji: '📝', format: 'text', tags: [] },
    gratitude: { name: 'Дневник благодарности', emoji: '💝', format: 'text', tags: [] },
    triggers: { name: 'Триггеры неудач', emoji: '❌', format: 'list', tags: [] },
    shopping: { name: 'Список покупок', emoji: '🛒', format: 'list', tags: [] },
    cleaning: { name: 'Список уборки', emoji: '🧹', format: 'list', tags: [] }
};

// Состояние приложения
const app = {
    selectedDate: new Date(),
    currentMonth: new Date(),
    weekStartDate: new Date(),
    editingNoteId: null,
    editingNoteType: null,
    currentAddType: null,
    deleteConfirmType: null,
    deleteConfirmIndex: null,
    itemColor: '#34c759',
    itemPriority: 3,
    data: {},
    customCategories: {} // Пользовательские категории
};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Предотвращение двойного масштабирования на iOS
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, false);

    loadData();
    renderCalendar();
    renderMobileDatePicker();
    updateTime();
    setInterval(updateTime, 1000);
    renderContent();
    setupEventListeners();

    // Инициализация weekStartDate как начало текущей недели
    const today = new Date();
    const day = today.getDay();
    app.weekStartDate = new Date(today);
    app.weekStartDate.setDate(today.getDate() - day);
    
    // Обработка параметров URL (для быстрого добавления)
    const params = new URLSearchParams(window.location.search);
    if (params.has('type')) {
        const type = params.get('type');
        app.currentAddType = type;
        setTimeout(openAddModal, 500);
    }
});

// Обновление времени
function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('currentTime').textContent = `${hours}:${minutes}`;
}

// Установка обработчиков событий
function setupEventListeners() {
    // Календарь (десктопная версия)
    document.getElementById('prevMonth').addEventListener('click', () => {
        app.currentMonth.setMonth(app.currentMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        app.currentMonth.setMonth(app.currentMonth.getMonth() + 1);
        renderCalendar();
    });

    // Навигация по неделям (мобильная версия)
    document.getElementById('prevWeek').addEventListener('click', () => {
        const newDate = new Date(app.weekStartDate);
        newDate.setDate(newDate.getDate() - 7);
        app.weekStartDate = newDate;
        renderMobileDatePicker();
        scrollToCurrentDate();
    });

    document.getElementById('nextWeek').addEventListener('click', () => {
        const newDate = new Date(app.weekStartDate);
        newDate.setDate(newDate.getDate() + 7);
        app.weekStartDate = newDate;
        renderMobileDatePicker();
        scrollToCurrentDate();
    });

    // Кнопки добавления
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            app.currentAddType = btn.dataset.type;
            openAddModal();
        });
    });

    // Модальное окно добавления
    document.getElementById('saveBtn').addEventListener('click', saveItem);
    document.querySelector('#addModal .modal-close').addEventListener('click', closeAddModal);
    
    // Кнопка для добавления элемента в список
    const addListBtn = document.getElementById('addListItemBtn');
    if (addListBtn) {
        addListBtn.addEventListener('click', addListItem);
    }
    
    // Обработчик Enter для добавления элемента в список
    const listInput = document.getElementById('listInputText');
    if (listInput) {
        listInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addListItem();
            }
        });
        
        // Обработчик ввода для счётчика символов
        listInput.addEventListener('input', () => {
            updateListCharCount();
        });
    }

    // Модальное окно редактирования заметок
    const cancelNoteBtn = document.getElementById('cancelNoteBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    const editModalClose = document.querySelector('#editNoteModal .modal-close');
    
    if (cancelNoteBtn) cancelNoteBtn.addEventListener('click', closeEditNoteModal);
    if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
    if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', showDeleteConfirm);
    if (editModalClose) editModalClose.addEventListener('click', closeEditNoteModal);

    // Модальное окно редактирования списков
    const saveListBtn = document.getElementById('saveListBtn');
    const editListModalClose = document.querySelector('#editListModal .modal-close');
    
    if (saveListBtn) saveListBtn.addEventListener('click', saveList);
    if (editListModalClose) editListModalClose.addEventListener('click', closeEditListModal);

    // Модальное окно подтверждения удаления
    const confirmDeleteCancel = document.getElementById('confirmDeleteCancel');
    const confirmDeleteConfirm = document.getElementById('confirmDeleteConfirm');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    
    if (confirmDeleteCancel) confirmDeleteCancel.addEventListener('click', closeDeleteConfirm);
    if (confirmDeleteConfirm) confirmDeleteConfirm.addEventListener('click', confirmDelete);
    if (confirmDeleteModal) {
        confirmDeleteModal.addEventListener('click', (e) => {
            if (e.target.id === 'confirmDeleteModal') closeDeleteConfirm();
        });
    }

    // Закрытие модальных окон при клике вне
    document.getElementById('addModal').addEventListener('click', (e) => {
        if (e.target.id === 'addModal') closeAddModal();
    });

    document.getElementById('editNoteModal').addEventListener('click', (e) => {
        if (e.target.id === 'editNoteModal') closeEditNoteModal();
    });

    const editListModal = document.getElementById('editListModal');
    if (editListModal) {
        editListModal.addEventListener('click', (e) => {
            if (e.target.id === 'editListModal') closeEditListModal();
        });
    }

    // Обработка свайпа для навигации
    setupSwipeNavigation();
}

// Рендеринг календаря
function renderCalendar() {
    const year = app.currentMonth.getFullYear();
    const month = app.currentMonth.getMonth();

    // Обновление заголовка
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;

    // Получение дней месяца
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayOfWeek = firstDay.getDay() || 7;
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();

    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    // Дни из предыдущего месяца
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
        const day = daysInPrevMonth - i + 1;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarDays.appendChild(dayEl);
    }

    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        const currentDate = new Date(year, month, day);
        const today = new Date();

        // Проверка на сегодня
        if (currentDate.toDateString() === today.toDateString()) {
            dayEl.classList.add('today');
        }

        // Проверка на выбранный день
        if (currentDate.toDateString() === app.selectedDate.toDateString()) {
            dayEl.classList.add('selected');
        }

        // Обработчик клика
        dayEl.addEventListener('click', () => {
            app.selectedDate = new Date(year, month, day);
            renderCalendar();
            renderContent();
        });

        calendarDays.appendChild(dayEl);
    }

    // Дни из следующего месяца
    const totalCells = calendarDays.children.length;
    for (let day = 1; totalCells + day <= 42; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarDays.appendChild(dayEl);
    }
}

// Рендеринг мобильного меню дат
function renderMobileDatePicker() {
    const scroll = document.getElementById('datesScroll');
    scroll.innerHTML = '';

    const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    // Показываем 7 дней, начиная с weekStartDate
    for (let i = 0; i < 7; i++) {
        const date = new Date(app.weekStartDate);
        date.setDate(date.getDate() + i);
        
        const dateItem = document.createElement('div');
        dateItem.className = 'date-item';
        
        if (date.toDateString() === app.selectedDate.toDateString()) {
            dateItem.classList.add('selected');
        }
        
        dateItem.innerHTML = `
            <div class="date-day">${date.getDate()}</div>
            <div class="date-weekday">${weekDays[date.getDay()]}</div>
        `;
        
        dateItem.addEventListener('click', () => {
            app.selectedDate = new Date(date);
            renderMobileDatePicker();
            renderContent();
        });
        
        scroll.appendChild(dateItem);
    }
}

// Скролл к текущей дате в мобильном меню
function scrollToCurrentDate() {
    const scroll = document.getElementById('datesScroll');
    const selected = scroll.querySelector('.date-item.selected');
    if (selected) {
        setTimeout(() => {
            const scrollWidth = scroll.offsetWidth;
            const selectedLeft = selected.offsetLeft;
            const selectedWidth = selected.offsetWidth;
            scroll.scrollLeft = selectedLeft + selectedWidth / 2 - scrollWidth / 2;
        }, 50);
    }
}

// Рендеринг контента
function renderContent() {
    updateDateHeader();
    renderHabits();
    renderTasks();
    renderTomorrow();
    renderNotes();
    renderGratitude();
    renderTriggers();
    renderShoppingList();
    renderCleaningList();
}

// Обновление заголовка даты
function updateDateHeader() {
    const date = app.selectedDate;
    const today = new Date();
    
    let text = '';
    if (date.toDateString() === today.toDateString()) {
        text = 'Сегодня';
    } else if (date.toDateString() === new Date(today.getTime() + 86400000).toDateString()) {
        text = 'Завтра';
    } else {
        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        text = `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
    }
    
    document.getElementById('selectedDate').textContent = text;
}

// Получение дневного ключа (в локальном времени)
function getDayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Получение элементов на день
function getItemsForDay(type) {
    const key = getDayKey(app.selectedDate);
    if (!app.data[type]) app.data[type] = {};
    if (!app.data[type][key]) app.data[type][key] = [];
    return app.data[type][key];
}

// Получение цвета приоритета
function getPriorityColor(priority) {
    switch(priority) {
        case 1: return '#FF3B30';  // Красный
        case 2: return '#FFD60A';  // Жёлтый
        case 3: return '#34c759';  // Зелёный
        default: return '#7c5cff'; // Фиолетовый
    }
}

// Рендеринг привычек
function renderHabits() {
    const list = document.getElementById('habitsList');
    const items = getItemsForDay('habits');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет привычек на этот день</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="item ${item.completed ? 'completed' : ''}" style="border-left: 4px solid ${item.color || '#7c5cff'};">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleHabit(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.priority ? `<div class="item-meta">Приоритет: ${item.priority}</div>` : ''}
                ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
            </div>
            <button class="item-delete" onclick="deleteItem('habits', ${index})">×</button>
        </div>
    `).join('');
}

// Рендеринг задач
function renderTasks() {
    const list = document.getElementById('tasksList');
    const items = getItemsForDay('tasks');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет задач на этот день</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="item ${item.completed ? 'completed' : ''}" style="border-left: 4px solid ${item.color || '#7c5cff'};">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleTask(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.priority ? `<div class="item-meta">Приоритет: ${item.priority}</div>` : ''}
                ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
            </div>
            <button class="item-delete" onclick="deleteItem('tasks', ${index})">×</button>
        </div>
    `).join('');
}

// Рендеринг задач на завтра
function renderTomorrow() {
    const list = document.getElementById('tomorrowList');
    const items = getItemsForDay('tomorrow');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет задач на завтра</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="item ${item.completed ? 'completed' : ''}" style="border-left: 4px solid ${item.color || '#7c5cff'};">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleTomorrow(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.priority ? `<div class="item-meta">Приоритет: ${item.priority}</div>` : ''}
                ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
            </div>
            <button class="item-delete" onclick="deleteItem('tomorrow', ${index})">×</button>
        </div>
    `).join('');
}

// Рендеринг заметок
function renderNotes() {
    const list = document.getElementById('notesList');
    const items = getItemsForDay('notes');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет заметок на этот день</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="note" onclick="editNote('notes', ${index})">
            <div class="note-text">${escapeHtml(item.text)}</div>
        </div>
    `).join('');
}

// Рендеринг дневника благодарности
function renderGratitude() {
    const list = document.getElementById('gratitudeList');
    const items = getItemsForDay('gratitude');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет записей благодарности на этот день</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="note" onclick="editNote('gratitude', ${index})">
            <div class="note-text">${escapeHtml(item.text)}</div>
        </div>
    `).join('');
}

// Рендеринг триггеров
function renderTriggers() {
    const list = document.getElementById('triggersList');
    const items = getItemsForDay('triggers');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет триггеров на этот день</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => {
        // Если это список (новый формат)
        if (item.items) {
            const itemsHtml = item.items.map((subitem, subindex) => `
                <div class="list-item">
                    <input type="checkbox" ${subitem.completed ? 'checked' : ''} 
                           onchange="toggleListItem('triggers', ${index}, ${subindex})">
                    <span>${escapeHtml(subitem.text)}</span>
                </div>
            `).join('');
            return `<div class="list-container">${itemsHtml}<button class="item-delete" onclick="deleteItem('triggers', ${index})">×</button></div>`;
        }
        // Если это обычный элемент (старый формат)
        else {
            return `
                <div class="item ${item.completed ? 'completed' : ''}" style="border-left: 4px solid ${item.color || '#7c5cff'};">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} 
                           onchange="toggleTrigger(${index})">
                    <div class="item-content">
                        <div class="item-text">${escapeHtml(item.text)}</div>
                        ${item.priority ? `<div class="item-meta">Приоритет: ${item.priority}</div>` : ''}
                        ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
                    </div>
                    <button class="item-delete" onclick="deleteItem('triggers', ${index})">×</button>
                </div>
            `;
        }
    }).join('');
}

// Рендеринг списка покупок
function renderShoppingList() {
    const list = document.getElementById('shoppingList');
    const items = getItemsForDay('shopping');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет покупок на этот день</div>';
        return;
    }

    const content = items.map((item, index) => {
        if (item.items && item.items.length > 0) {
            const itemsHtml = item.items.map((subitem, subindex) => `
                <div class="list-item">
                    <button type="button" class="list-checkbox-btn" onclick="toggleListItem('shopping', ${index}, ${subindex}); event.stopPropagation();" style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center;">
                        <input type="checkbox" ${subitem.completed ? 'checked' : ''} style="pointer-events: none;">
                    </button>
                    <span onclick="editList('shopping', ${index}); event.stopPropagation();" style="cursor: pointer; flex: 1;">${escapeHtml(subitem.text)}</span>
                </div>
            `).join('');
            return itemsHtml ? `<div class="list-container">${itemsHtml}</div>` : '';
        }
        return '';
    }).join('');

    list.innerHTML = content || '<div class="empty-message">Нет покупок на этот день</div>';
}

// Рендеринг списка уборки
function renderCleaningList() {
    const list = document.getElementById('cleaningList');
    const items = getItemsForDay('cleaning');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет задач уборки на этот день</div>';
        return;
    }

    const content = items.map((item, index) => {
        if (item.items && item.items.length > 0) {
            const itemsHtml = item.items.map((subitem, subindex) => `
                <div class="list-item">
                    <button type="button" class="list-checkbox-btn" onclick="toggleListItem('cleaning', ${index}, ${subindex}); event.stopPropagation();" style="background: none; border: none; padding: 0; cursor: pointer; display: flex; align-items: center;">
                        <input type="checkbox" ${subitem.completed ? 'checked' : ''} style="pointer-events: none;">
                    </button>
                    <span onclick="editList('cleaning', ${index}); event.stopPropagation();" style="cursor: pointer; flex: 1;">${escapeHtml(subitem.text)}</span>
                </div>
            `).join('');
            return itemsHtml ? `<div class="list-container">${itemsHtml}</div>` : '';
        }
        return '';
    }).join('');

    list.innerHTML = content || '<div class="empty-message">Нет задач уборки на этот день</div>';
}

// Открытие модального окна добавления
function openAddModal() {
    const modal = document.getElementById('addModal');
    const config = CATEGORIES_CONFIG[app.currentAddType];
    
    if (!config) return;
    
    document.getElementById('modalTitle').textContent = `Добавить ${config.name.toLowerCase()}`;
    
    // Скрыть все форматы
    document.getElementById('format-priority').style.display = 'none';
    document.getElementById('format-text').style.display = 'none';
    document.getElementById('format-list').style.display = 'none';
    
    // Очистить поля
    document.getElementById('itemText').value = '';
    document.getElementById('itemNote').value = '';
    document.getElementById('itemText2').value = '';
    document.getElementById('listItems').innerHTML = '';
    
    const listInput = document.getElementById('listInputText');
    if (listInput) {
        listInput.value = '';
        updateListCharCount();
    }
    
    // Показать нужный формат
    if (config.format === 'priority') {
        document.getElementById('format-priority').style.display = 'block';
        
        document.getElementById('itemColor').value = '#34c759';
        document.getElementById('itemPriority').value = '1';
        
        document.querySelectorAll('.color-btn').forEach((btn, index) => {
            btn.classList.remove('selected');
            if (index === 0) btn.classList.add('selected');
        });
        
        document.querySelectorAll('.priority-btn').forEach((btn, index) => {
            btn.classList.remove('selected');
            if (index === 0) btn.classList.add('selected');
        });
    } else if (config.format === 'text') {
        document.getElementById('format-text').style.display = 'block';
    } else if (config.format === 'list') {
        document.getElementById('format-list').style.display = 'block';
        // Инициализировать кастомное поле ввода
        setTimeout(() => {
            const input = document.getElementById('listInputText');
            if (input) input.focus();
        }, 100);
    }
    
    modal.classList.remove('hidden');
    
    // Фокус на первое поле
    setTimeout(() => {
        const activeFormat = document.getElementById('format-priority').style.display !== 'none' 
            ? document.getElementById('itemText')
            : document.getElementById('itemText2');
        if (activeFormat) activeFormat.focus();
    }, 100);
}

// Добавить элемент в список
function addListItem() {
    const input = document.getElementById('listInputText');
    const listItems = document.getElementById('listItems');
    
    if (!input || !listItems) {
        return;
    }
    
    const text = input.value.trim();
    
    if (text === '') {
        input.focus();
        return;
    }
    
    // Создаем элемент списка
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
        <input type="checkbox">
        <span>${escapeHtml(text)}</span>
        <button type="button" onclick="this.parentElement.remove();">×</button>
    `;
    
    listItems.appendChild(item);
    
    // Очищаем поле ввода для следующего элемента
    input.value = '';
    updateListCharCount();
    
    // Возвращаем фокус на поле ввода для следующего элемента
    input.focus();
    
    // Прокручиваем список вниз
    listItems.scrollTop = listItems.scrollHeight;
}

// Обновить счётчик символов для списков
function updateListCharCount() {
    const input = document.getElementById('listInputText');
    const counter = document.getElementById('listCharCount');
    if (input && counter) {
        counter.textContent = input.value.length;
    }
}

// Выбор цвета
function selectColor(color, name) {
    document.getElementById('itemColor').value = color;
    
    // Обновить активный цвет
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.color === color) {
            btn.classList.add('selected');
        }
    });
}

// Выбор приоритета
function selectPriority(priority) {
    document.getElementById('itemPriority').value = priority;
    
    // Обновить активный приоритет
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.priority) === priority) {
            btn.classList.add('selected');
        }
    });
}

// Закрытие модального окна добавления
function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}

// Сохранение элемента
function saveItem() {
    const type = app.currentAddType;
    const config = CATEGORIES_CONFIG[type];
    
    if (!config) return;

    const key = getDayKey(app.selectedDate);
    if (!app.data[type]) app.data[type] = {};
    if (!app.data[type][key]) app.data[type][key] = [];

    let itemData = null;

    // ФОРМАТ 1: С приоритетом и цветом
    if (config.format === 'priority') {
        const text = document.getElementById('itemText').value.trim();
        const note = document.getElementById('itemNote').value.trim();
        const color = document.getElementById('itemColor').value;
        const priority = parseInt(document.getElementById('itemPriority').value);

        if (!text) {
            alert('Пожалуйста, введите название');
            return;
        }

        itemData = {
            text: text,
            note: note || null,
            color: color,
            priority: priority,
            completed: false,
            created: new Date().toISOString()
        };
    }
    // ФОРМАТ 2: Просто текст
    else if (config.format === 'text') {
        const text = document.getElementById('itemText2').value.trim();

        if (!text) {
            alert('Пожалуйста, введите текст');
            return;
        }

        itemData = {
            text: text,
            created: new Date().toISOString()
        };
    }
    // ФОРМАТ 3: Список с чекбоксами
    else if (config.format === 'list') {
        // Если в поле ввода ещё есть текст, добавляем его
        const listInput = document.getElementById('listInputText');
        if (listInput && listInput.value.trim() !== '') {
            addListItem();
        }
        
        const listItems = Array.from(document.querySelectorAll('#listItems .list-item')).map(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const span = item.querySelector('span');
            return {
                text: span.textContent.trim(),
                completed: checkbox.checked
            };
        }).filter(item => item.text);

        if (listItems.length === 0) {
            alert('Пожалуйста, добавьте хотя бы один элемент в список');
            return;
        }

        itemData = {
            items: listItems,
            created: new Date().toISOString()
        };
    }

    if (itemData) {
        app.data[type][key].push(itemData);
        saveData();
        closeAddModal();
        renderContent();
    }
}

// Переключение привычки
function toggleHabit(index) {
    const items = getItemsForDay('habits');
    items[index].completed = !items[index].completed;
    saveData();
    renderHabits();
}

// Переключение задачи
function toggleTask(index) {
    const items = getItemsForDay('tasks');
    items[index].completed = !items[index].completed;
    saveData();
    renderTasks();
}

// Переключение задачи на завтра
function toggleTomorrow(index) {
    const items = getItemsForDay('tomorrow');
    items[index].completed = !items[index].completed;
    saveData();
    renderTomorrow();
}

// Переключение триггера
function toggleTrigger(index) {
    const items = getItemsForDay('triggers');
    items[index].completed = !items[index].completed;
    saveData();
    renderTriggers();
}

// Переключение элемента в списке
function toggleListItem(type, index, subindex) {
    const items = getItemsForDay(type);
    if (items[index].items && items[index].items[subindex]) {
        items[index].items[subindex].completed = !items[index].items[subindex].completed;
        saveData();
        const renderFunc = type === 'triggers' ? renderTriggers : (type === 'shopping' ? renderShoppingList : renderCleaningList);
        renderFunc();
    }
}

// Удаление элемента
function deleteItem(type, index) {
    app.deleteConfirmType = type;
    app.deleteConfirmIndex = index;
    document.getElementById('confirmDeleteText').textContent = 'Вы уверены, что хотите удалить этот элемент?';
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

// Редактирование списка
function editList(type, index) {
    const items = getItemsForDay(type);
    const item = items[index];
    
    app.editingNoteId = index;
    app.editingNoteType = type;
    
    // Заполняем модальное окно списком элементов
    const listItems = document.getElementById('editListItems');
    listItems.innerHTML = '';
    
    if (item.items) {
        item.items.forEach((subitem, subindex) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            const span = document.createElement('span');
            span.textContent = subitem.text;
            span.style.cursor = 'pointer';
            span.onclick = () => editListItem(subindex);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'item-delete-button';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = () => deleteListItem(subindex);
            
            div.appendChild(span);
            div.appendChild(deleteBtn);
            listItems.appendChild(div);
        });
    }
    
    updateEditListCharCount();
    document.getElementById('editListModal').classList.remove('hidden');
}

function toggleListItemCheck(index) {
    const items = getItemsForDay(app.editingNoteType);
    const item = items[app.editingNoteId];
    if (item.items && item.items[index]) {
        item.items[index].completed = !item.items[index].completed;
    }
}

function editListItem(subindex) {
    const items = getItemsForDay(app.editingNoteType);
    const item = items[app.editingNoteId];
    if (item.items && item.items[subindex]) {
        const subitem = item.items[subindex];
        
        // Находим элемент в DOM
        const listItemsDiv = document.getElementById('editListItems');
        const listItemDivs = listItemsDiv.querySelectorAll('.list-item');
        const itemDiv = listItemDivs[subindex];
        
        if (itemDiv) {
            const span = itemDiv.querySelector('span');
            
            // Создаем инпут для редактирования
            const input = document.createElement('input');
            input.type = 'text';
            input.value = subitem.text;
            input.maxLength = 60;
            input.style.cssText = 'flex: 1; border: none; background: transparent; padding: 0; font-size: 16px; font-family: inherit;';
            
            // Заменяем span на input
            itemDiv.replaceChild(input, span);
            input.focus();
            input.select();
            
            // Обработчик сохранения при нажатии Enter или потере фокуса
            const save = () => {
                const newText = input.value.trim();
                if (newText) {
                    subitem.text = newText;
                    saveData();
                }
                editList(app.editingNoteType, app.editingNoteId);
            };
            
            input.onblur = save;
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    save();
                }
            };
        }
    }
}

function deleteListItem(index) {
    const items = getItemsForDay(app.editingNoteType);
    const item = items[app.editingNoteId];
    if (item.items) {
        item.items.splice(index, 1);
        saveData();
        closeEditListModal();
        renderContent();
    }
}
function updateEditListCharCount() {
    // Пустая функция, оставлена для совместимости
}

function saveList() {
    saveData();
    closeEditListModal();
    renderContent();
}

function closeEditListModal() {
    const modal = document.getElementById('editListModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    app.editingNoteId = null;
    app.editingNoteType = null;
}

// Редактирование заметки
function editNote(type, index) {
    const items = getItemsForDay(type);
    const item = items[index];
    
    app.editingNoteId = index;
    app.editingNoteType = type;
    
    document.getElementById('noteText').value = item.text;
    document.getElementById('editNoteModal').classList.remove('hidden');
    document.getElementById('noteText').focus();
}

// Закрытие модального окна редактирования
function closeEditNoteModal() {
    document.getElementById('editNoteModal').classList.add('hidden');
    app.editingNoteId = null;
    app.editingNoteType = null;
}

// Сохранение заметки
function saveNote() {
    const text = document.getElementById('noteText').value.trim();
    
    if (!text) {
        alert('Пожалуйста, введите текст');
        return;
    }

    const items = getItemsForDay(app.editingNoteType);
    items[app.editingNoteId].text = text;
    
    saveData();
    closeEditNoteModal();
    renderContent();
}

// Показать окно подтверждения удаления
function showDeleteConfirm() {
    app.deleteConfirmType = app.editingNoteType;
    app.deleteConfirmIndex = app.editingNoteId;
    document.getElementById('confirmDeleteText').textContent = 'Вы уверены, что хотите удалить эту заметку?';
    document.getElementById('confirmDeleteModal').classList.remove('hidden');
}

// Закрытие окна подтверждения удаления
function closeDeleteConfirm() {
    document.getElementById('confirmDeleteModal').classList.add('hidden');
    app.deleteConfirmType = null;
    app.deleteConfirmIndex = null;
}

// Подтверждение удаления
function confirmDelete() {
    if (app.deleteConfirmType && app.deleteConfirmIndex !== null) {
        const items = getItemsForDay(app.deleteConfirmType);
        items.splice(app.deleteConfirmIndex, 1);
        
        saveData();
        closeDeleteConfirm();
        closeEditNoteModal();
        renderContent();
    }
}

// Удаление заметки (оставляю старую функцию на случай других вызовов)
function deleteNote() {
    showDeleteConfirm();
}

// Сохранение данных в localStorage
function saveData() {
    localStorage.setItem('diaryData', JSON.stringify(app.data));
    localStorage.setItem('customCategories', JSON.stringify(app.customCategories));
}

// Загрузка данных из localStorage
function loadData() {
    const saved = localStorage.getItem('diaryData');
    app.data = saved ? JSON.parse(saved) : {};
    const savedCategories = localStorage.getItem('customCategories');
    app.customCategories = savedCategories ? JSON.parse(savedCategories) : {};
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Навигация по свайпам (для мобильных устройств)
function setupSwipeNavigation() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    function handleSwipe() {
        const diff = touchStartX - touchEndX;
        const threshold = 50;

        // Свайп влево - следующий месяц
        if (diff > threshold) {
            app.currentMonth.setMonth(app.currentMonth.getMonth() + 1);
            renderCalendar();
        }

        // Свайп вправо - предыдущий месяц
        if (diff < -threshold) {
            app.currentMonth.setMonth(app.currentMonth.getMonth() - 1);
            renderCalendar();
        }
    }
}
