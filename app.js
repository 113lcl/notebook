// Состояние приложения
const app = {
    selectedDate: new Date(),
    currentMonth: new Date(),
    weekStartDate: new Date(),
    editingNoteId: null,
    editingNoteType: null,
    currentAddType: null,
    data: {}
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
    document.getElementById('cancelBtn').addEventListener('click', closeAddModal);
    document.getElementById('saveBtn').addEventListener('click', saveItem);
    document.querySelector('#addModal .modal-close').addEventListener('click', closeAddModal);

    // Модальное окно редактирования заметок
    document.getElementById('cancelNoteBtn').addEventListener('click', closeEditNoteModal);
    document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    document.getElementById('deleteNoteBtn').addEventListener('click', deleteNote);
    document.querySelector('#editNoteModal .modal-close').addEventListener('click', closeEditNoteModal);

    // Закрытие модальных окон при клике вне
    document.getElementById('addModal').addEventListener('click', (e) => {
        if (e.target.id === 'addModal') closeAddModal();
    });

    document.getElementById('editNoteModal').addEventListener('click', (e) => {
        if (e.target.id === 'editNoteModal') closeEditNoteModal();
    });

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

// Рендеринг привычек
function renderHabits() {
    const list = document.getElementById('habitsList');
    const items = getItemsForDay('habits');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="empty-message">Нет привычек на этот день</div>';
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleHabit(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.time ? `<div class="item-meta">${item.time}</div>` : ''}
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
        <div class="item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleTask(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.time ? `<div class="item-meta">${item.time}</div>` : ''}
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
        <div class="item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleTomorrow(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.time ? `<div class="item-meta">${item.time}</div>` : ''}
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

    list.innerHTML = items.map((item, index) => `
        <div class="item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleTrigger(${index})">
            <div class="item-content">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${item.time ? `<div class="item-meta">${item.time}</div>` : ''}
            </div>
            <button class="item-delete" onclick="deleteItem('triggers', ${index})">×</button>
        </div>
    `).join('');
}

// Открытие модального окна добавления
function openAddModal() {
    const modal = document.getElementById('addModal');
    const titleMap = {
        'habits': 'Добавить привычку',
        'tasks': 'Добавить задачу',
        'tomorrow': 'Добавить задачу на завтра',
        'notes': 'Добавить заметку',
        'gratitude': 'Добавить запись благодарности',
        'triggers': 'Добавить триггер'
    };
    
    document.getElementById('modalTitle').textContent = titleMap[app.currentAddType];
    document.getElementById('itemText').value = '';
    
    const today = getDayKey(new Date());
    document.getElementById('itemDate').value = getDayKey(app.selectedDate);
    document.getElementById('itemTime').value = '';
    
    modal.classList.remove('hidden');
    document.getElementById('itemText').focus();
}

// Закрытие модального окна добавления
function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}

// Сохранение элемента
function saveItem() {
    const text = document.getElementById('itemText').value.trim();
    const date = document.getElementById('itemDate').value;
    const time = document.getElementById('itemTime').value;

    if (!text) {
        alert('Пожалуйста, введите текст');
        return;
    }

    const type = app.currentAddType;
    
    // Парсим дату правильно в локальном времени
    const [year, month, day] = date.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const key = getDayKey(dateObj);

    if (!app.data[type]) app.data[type] = {};
    if (!app.data[type][key]) app.data[type][key] = [];

    app.data[type][key].push({
        text: text,
        time: time || null,
        completed: false,
        created: new Date().toISOString()
    });

    saveData();
    closeAddModal();

    // Если дата отличается от текущей, обновляем выбранную дату
    if (date !== getDayKey(app.selectedDate)) {
        app.selectedDate = dateObj;
        renderCalendar();
    }
    
    renderContent();
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

// Удаление элемента
function deleteItem(type, index) {
    if (confirm('Вы уверены?')) {
        const items = getItemsForDay(type);
        items.splice(index, 1);
        saveData();
        renderContent();
    }
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

// Удаление заметки
function deleteNote() {
    if (confirm('Удалить заметку?')) {
        const items = getItemsForDay(app.editingNoteType);
        items.splice(app.editingNoteId, 1);
        
        saveData();
        closeEditNoteModal();
        renderContent();
    }
}

// Сохранение данных в localStorage
function saveData() {
    localStorage.setItem('diaryData', JSON.stringify(app.data));
}

// Загрузка данных из localStorage
function loadData() {
    const saved = localStorage.getItem('diaryData');
    app.data = saved ? JSON.parse(saved) : {};
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
