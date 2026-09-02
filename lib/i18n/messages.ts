/** Typed interface-chrome translation layer (distinct from per-content uk/ru/en fields). */
export interface Messages {
  nav: {
    dashboard: string;
    calendar: string;
    icons: string;
    prayers: string;
    saints: string;
    gospel: string;
    articles: string;
    alphabet: string;
    churchInfo: string;
    catalog: string;
    categories: string;
    products: string;
    orders: string;
    media: string;
    telegram: string;
    settings: string;
    more: string;
  };
  actions: {
    save: string;
    publish: string;
    unpublish: string;
    preview: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filters: string;
    retry: string;
    login: string;
    logout: string;
    confirm: string;
    addTranslation: string;
    back: string;
    next: string;
    copy: string;
    call: string;
    email: string;
  };
  status: {
    draft: string;
    published: string;
    archived: string;
  };
  states: {
    loading: string;
    emptyTitle: string;
    emptyDescription: string;
    errorTitle: string;
    offlineTitle: string;
    offlineDescription: string;
    unauthorizedTitle: string;
    forbiddenTitle: string;
    forbiddenDescription: string;
    unsavedTitle: string;
    unsavedDescription: string;
    conflictTitle: string;
    validationTitle: string;
  };
}

export const uk: Messages = {
  nav: {
    dashboard: "Панель",
    calendar: "Церковний календар",
    icons: "Ікони",
    prayers: "Молитви",
    saints: "Святі",
    gospel: "Євангеліє",
    articles: "Статті",
    alphabet: "Азбука",
    churchInfo: "Про храм",
    catalog: "Каталог",
    categories: "Категорії",
    products: "Товари",
    orders: "Замовлення",
    media: "Медіа",
    telegram: "Telegram",
    settings: "Налаштування",
    more: "Ще",
  },
  actions: {
    save: "Зберегти",
    publish: "Опублікувати",
    unpublish: "Зняти з публікації",
    preview: "Попередній перегляд",
    cancel: "Скасувати",
    delete: "Видалити",
    edit: "Редагувати",
    create: "Додати",
    search: "Пошук",
    filters: "Фільтри",
    retry: "Спробувати ще раз",
    login: "Увійти",
    logout: "Вийти",
    confirm: "Підтвердити",
    addTranslation: "Додати переклад",
    back: "Назад",
    next: "Далі",
    copy: "Копіювати",
    call: "Подзвонити",
    email: "Написати email",
  },
  status: {
    draft: "Чернетка",
    published: "Опубліковано",
    archived: "Архів",
  },
  states: {
    loading: "Завантаження…",
    emptyTitle: "Тут поки нічого немає",
    emptyDescription: "Створіть перший запис, щоб почати роботу.",
    errorTitle: "Не вдалося завантажити дані",
    offlineTitle: "Немає з'єднання",
    offlineDescription: "Перевірте інтернет-з'єднання. Дані завантажаться, щойно з'явиться мережа.",
    unauthorizedTitle: "Сесія закінчилася",
    forbiddenTitle: "Немає доступу",
    forbiddenDescription: "У вас недостатньо прав для перегляду цього розділу.",
    unsavedTitle: "Є незбережені зміни",
    unsavedDescription: "Якщо піти зі сторінки зараз, зміни буде втрачено.",
    conflictTitle: "Конфлікт даних",
    validationTitle: "Перевірте поля форми",
  },
};
