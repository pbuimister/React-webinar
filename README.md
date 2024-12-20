# React-webinar


## Kanban App (app/javascript/apps/KanbanBoardApp)
 components:
- Card.jsx:
Реалізує компонент для відображення картки задачі. Кожна картка може містити:
Назву задачі, Статус, Дати, Елементи взаємодії, наприклад, кнопки.
- Column.jsx:
Відповідає за представлення колонок (списків задач), наприклад, "To Do", "In Progress", "Done". Використовується для структурування та групування карток.
- KanbanBoardAppContent.jsx:
Основний компонент-контейнер для логіки та макету Kanban-дошки. Відображає всі колонки та управляє синхронізацією станів між компонентами. Центральним місце для Drag&Drop-логіки.
context:
Контекст управління даними:
- BoardContext.jsx:
Постачає глобальний стан для всіх елементів Kanban-дошки. Включає інформацію про колонки, картки, їхній порядок.
- ColumnContext.jsx:
функціонал синзронізації і підвантаження данних в колонку ці дані потім зберігаються в boardContext.
- index.jsx:
Точка входу для Kanban-дошки, яка імпортується в загальний застосунок.
## Елементи інтерфейсу (app/javascript/elements)
- DatePickerElement:
CSS-модуль DatePickerElement.module.scss і відповідний компонент index.jsx створюють компонент для вибору дат (можливо, для дедлайнів задач).
- Loader.jsx : індикатор завантаження.
- Notice.jsx : випливаючі повідомлення.
- Multiselect.jsx : Компонент для вибору кількох опцій з випадаючого списку (можливо, для тегів або категорій задач).
## Допоміжні утиліти(helpers/hooks)
- app/javascript/helpers/index.js : Містить корисні функції, які використовуються в додатку не обовязково react.
- app/javascript/hooks/useWindowResize.jsx : Хук React, який слідкує за зміною розмірів вікна браузера та дозволяє адаптувати компоненти (наприклад, адаптація відображення Kanban-дошки на менших екранах).
## Послуги та API (app/javascript/services)
- AppService/Resource.js і Resources.js: Реалізують шар роботи з ресурсами. Тут знаходиться код для роботи з сервером (REST API) — наприклад, отримання, створення чи оновлення задач/колонок Kanban-дошки. Прописує routes як при resources.
## Стилі (app/javascript/stylesheets)
- _board.scss : Конкретні стилі для відображення Kanban-дошки.
## Налаштування Webpack (config/webpack/environment.js):
Має aliases для швидшого імпорту, наприклад:
@apps, @components, @elements, @helpers, @services — дають змогу уникати довгих абсолютних або відносних шляхів і структурувати код.
## Побудова:
Конфігурація збірки (webpacker.yml, package.json):
